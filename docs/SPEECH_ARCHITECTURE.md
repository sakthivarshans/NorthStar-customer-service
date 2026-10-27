# Speech architecture

```
Browser ──record──▶ POST /speech/transcribe ──▶ validate ─▶ Faster-Whisper base.en (local, in-process)
   ▲                                                              │ transcript
   │  review / edit / retry  ◀─────────────────────────────────────┘
   │
   ├─ user approves ─▶ POST /chat ─▶ BM25 retrieval ─▶ Nemotron 3.5 Super VL (OpenRouter) ─▶ answer + citations (stored)
   │
   └─ voice on ─▶ POST /speech/synthesize ─▶ text must equal a stored assistant answer ─▶ OpenRouter /audio/speech (Fish Audio S2.1 Pro Free) ─▶ audio/mpeg
```

## Components

| File | Responsibility |
|---|---|
| `services/stt_provider.py` | Singleton `WhisperModel`, thread-safe lazy/preloaded load, failure classification + retry cooldown, `asyncio.Semaphore` + bounded queue, dedicated executor, cooperative deadline while consuming the segment generator |
| `services/audio_validation.py` | Magic-byte sniffing, then `load_audio`: one PyAV pass that validates, bounds duration/memory and returns 16 kHz mono float32. The model receives this array, so faster-whisper's own `decode_audio` (which crashes with some PyAV versions) is never used |
| `routers/speech.py` | Streaming size-capped upload to a temp file, always cleaned up; `/status`; `/transcribe`; `/synthesize` |
| `services/tts_provider.py` | Default `OpenRouterTTS`: `POST {OPENROUTER_BASE_URL}/audio/speech` with `{model:"fish-audio/s2.1-pro-free", input, voice?, response_format:"mp3"}`. Alternative `FishAudioTTS`: `POST api.fish.audio/v1/tts` (needs a Fish key). Both map 401/402/403/404/429/5xx/timeouts/empty/non-audio to typed errors that include the provider's own reason |
| `services/speech_text.py` | Deterministic markdown → speakable text; hash used to match spoken text to stored answers |
| `services/rag.py`, `chat_service.py` | Section-aware chunks, BM25, evidence status (`grounded/partial/uncertain`); unsupported questions return the KB no-answer text **without calling the LLM** |
| `middleware.py` | Pure-ASGI body-size limit per route (counts bytes even without Content-Length) |

## Design decisions

* **One chat pipeline.** Voice only produces text for the composer. Transcripts are untrusted input and are never auto-submitted unless the user enables `autoSubmitTranscript`.
* **Bounded resources.** Upload ≤ `STT_MAX_UPLOAD_BYTES`, duration ≤ `STT_MAX_DURATION_SECONDS`, one inference at a time, queue ≤ `STT_MAX_QUEUE` (else 429 + `Retry-After`), inference deadline `STT_TIMEOUT_SECONDS`. The concurrency slot is released only when the worker thread actually finishes, so timeouts cannot stack CPU work.
* **TTS never invents content.** Text must match a persisted assistant answer; TTS failure returns a typed error and the text answer remains intact (the frontend shows the audio error beside the message).
* **Multilingual path.** `.en` checkpoints force English. Setting `STT_MODEL=base|small|…` and empty `STT_LANGUAGE` enables auto-detect; the response already carries `language` and `model`.
* **Provider facts verified (Oct 2026)** against docs.fish.audio: endpoint `https://api.fish.audio/v1/tts`; Bearer auth; `model` header accepts `s2.1-pro`, `s2.1-pro-free`, `s2-pro`, `s1`; response is raw audio. Fish Audio rate limits and valid voice IDs vary by account and were **not** verified; configure approved voices with `FISH_ALLOWED_VOICE_IDS`. Nemotron: OpenRouter `nvidia/nemotron-3.5-super-vl:free` (free tier has request caps).

## Limitations

* BM25 retrieval is lexical; paraphrases with no word overlap may be missed (the assistant then says the KB doesn't specify it). Swap in embeddings behind `KnowledgeBase.search` if needed.
* Evidence status and `needs_human` are heuristic (coverage thresholds, escalation keywords, hedging phrases).
* A running inference thread cannot be force-killed; the deadline is checked between segments, so a single very long segment can overrun slightly.
* Admin uploads are indexed synchronously; very large PDFs will block that request.
