# Northstar Customer Support Agent

Grounded customer-support assistant for **Northstar Workspace** (fictional demo company) with voice input and voice output.

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind (`/src`) |
| Backend | FastAPI (`/backend`) |
| LLM | **NVIDIA Nemotron 3.5 Super VL (free)** via OpenRouter, model `nvidia/nemotron-3.5-super-vl:free` |
| RAG | Section-aware chunking + BM25 over `backend/data/knowledge/` (no embedding service) |
| STT | **Faster-Whisper `base.en`**, running locally inside the backend (no API key) |
| TTS | **Fish Audio** `s2.1-pro-free` via the hosted API (server-side key only) |

Voice flow: record → `POST /speech/transcribe` (local Whisper) → transcript shown for **review/edit** → customer submits through the normal `POST /chat` → retrieval + Nemotron produce a cited answer → optional `POST /speech/synthesize` speaks *that same answer*. There is one chat pipeline; voice never bypasses it. See [docs/SPEECH_ARCHITECTURE.md](docs/SPEECH_ARCHITECTURE.md).

## Quick start

Requirements: Python 3.10+, Node 20+, an [OpenRouter key](https://openrouter.ai/settings/keys), optionally a [Fish Audio key](https://fish.audio/app/api-keys).

```bash
# 1) Backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # then set OPENROUTER_API_KEY (and FISH_API_KEY for voice replies)
python scripts/download_model.py                       # optional: pre-download Whisper base.en (see "Model cache")
uvicorn app.main:app --port 8000

# 2) Frontend (new terminal, repo root)
npm install
cp .env.example .env                                   # VITE_API_BASE_URL defaults to http://localhost:8000/api/v1
npm run dev                                            # http://localhost:3000
```

The app opens in **Live** mode. The top-bar switch offers an offline "Demo" mode (keyword lookup over the approved FAQ only; no voice, no admin).

### Verify each piece

```bash
curl localhost:8000/api/v1/health              # llm_configured, stt_state, tts_configured, documents_indexed
curl localhost:8000/api/v1/speech/status       # stt_state: not_loaded | loading | ready | failed (+ stt_error)

# transcription (any short speech recording: webm, ogg, wav, mp3, m4a, flac)
curl -F "file=@question.wav" localhost:8000/api/v1/speech/transcribe

# chat
curl -H 'content-type: application/json' -d '{"message":"How much is the Professional plan?"}' localhost:8000/api/v1/chat

# TTS speaks only answers the assistant produced; pass an answer from /chat:
curl -H 'content-type: application/json' -d '{"text":"<answer text>","conversation_id":"<id>"}' \
     localhost:8000/api/v1/speech/synthesize --output reply.mp3
```

## API (all under `/api/v1`)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Service + model readiness |
| POST | `/chat` | `{message, conversation_id?, user_message_id?}` → `{answer, conversation_id, message_id, sources[], grounded, needs_human, evidence_status}` |
| GET/DELETE | `/conversations`, `/conversations/{id}` | SQLite-persisted history |
| POST | `/feedback` | helpful / unhelpful |
| GET | `/speech/status` | STT model state, TTS config, approved voices |
| POST | `/speech/transcribe` | multipart field `file` → `{text, language, duration, model, inference_time_ms, segments[]}` |
| POST | `/speech/synthesize` | `{text, conversation_id?, voice_id?}` → audio bytes (`audio/mpeg`) |
| GET/POST/DELETE | `/admin/documents[...]`, `/admin/stats`, `/admin/logs` | Upload txt/md/pdf/docx; protected in production |

Errors are always `{"detail": "...", "code": "..."}` (e.g. `stt_model_download_failed`, `tts_rate_limited`, `llm_rate_limited`).

## Configuration

All settings are in `backend/.env.example`. Key ones:

```
STT_PROVIDER=faster_whisper_local   STT_MODEL=base.en   STT_DEVICE=cpu   STT_COMPUTE_TYPE=int8   STT_LANGUAGE=en
TTS_PROVIDER=fish_audio   FISH_API_KEY=   FISH_TTS_MODEL=s2.1-pro-free   FISH_TTS_FORMAT=mp3   FISH_TTS_TIMEOUT_SECONDS=60
OPENROUTER_API_KEY=       LLM_MODEL=nvidia/nemotron-3.5-super-vl:free
```

GPU later: `STT_DEVICE=cuda STT_COMPUTE_TYPE=float16`. Multilingual later: `STT_MODEL=base` (or `small`) and `STT_LANGUAGE=` (empty = auto-detect). `base.en` is **English-only**; it is not suitable for other languages. No API change is needed to switch.

### Model cache (Faster-Whisper)

* First use downloads `base.en` (roughly 150 MB) from Hugging Face and caches it. Default cache: `~/.cache/huggingface/hub` (Windows: `%USERPROFILE%\.cache\huggingface\hub`). Override with `STT_DOWNLOAD_ROOT=/path`.
* The model loads **once** at startup in a background task (`STT_PRELOAD=true`); the server accepts requests immediately and `/speech/status` shows `loading` → `ready`. If preload is off it loads lazily on the first request.
* Pre-download: `python scripts/download_model.py`. Fully offline afterwards: set `STT_LOCAL_FILES_ONLY=true`.

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && pytest          # 47 unit tests, no network or keys needed
RUN_STT_INTEGRATION=1 pytest -m integration_stt                      # needs the real Whisper model files
RUN_TTS_INTEGRATION=1 pytest -m integration_tts                      # needs FISH_API_KEY
RUN_LLM_INTEGRATION=1 pytest -m integration_llm                      # needs OPENROUTER_API_KEY
npm run lint && npm test && npm run build                            # frontend typecheck, 10 tests, build
```

## Security notes

* Provider keys exist only in `backend/.env`; the frontend never sees them. `.env` is git-ignored.
* Audio is validated by **content** (magic bytes + decode probe), not filename/MIME; size, duration, queue depth and inference time are all bounded; temp files are always deleted. Audio and transcripts are never logged.
* `/speech/synthesize` only speaks text that matches an assistant answer stored by `/chat` (`TTS_REQUIRE_GROUNDED_TEXT=true`), so the Fish Audio key cannot be used as a free general TTS proxy and TTS can never introduce new facts.
* Set `API_ACCESS_KEY` (clients send `X-API-Key`) and `ADMIN_API_KEY` for deployments. With `APP_ENV=production`, admin routes stay disabled until `ADMIN_API_KEY` is set. A key embedded in a browser bundle is not a secret; for public deployments put the API behind real authentication (SSO / reverse proxy).
* The free Fish model (`s2.1-pro-free`) has no TTFA or DPA guarantees per Fish Audio's docs; use `s2.1-pro` before sending real customer content to it.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `stt_model_download_failed` | No internet on first run and no cache. Run `scripts/download_model.py` on a connected machine, or copy the cache folder; set `STT_LOCAL_FILES_ONLY=true` offline. |
| `stt_out_of_memory` | Use `STT_MODEL=tiny.en`, keep `STT_MAX_CONCURRENCY=1`, close other apps. |
| `stt_dependency_missing` | `pip install -r requirements.txt` in the active venv. |
| Slow transcription | CPU `int8` is the default. Lower `STT_BEAM_SIZE` to 1–3, use `tiny.en`, or move to a GPU (`cuda`/`float16`). Expect the first request after startup to be slowest. |
| `stt_busy` (429) | More than `STT_MAX_QUEUE` requests waiting; retry after the `Retry-After` seconds. |
| `no_speech_detected` | Silence or VAD filtered everything; speak closer to the mic or set `STT_VAD_FILTER=false`. |
| `llm_rate_limited` (429) | Free OpenRouter models have daily/per-minute caps; retry later or add credits. |
| `llm_empty_answer` | A reasoning model used its token budget thinking; raise `LLM_MAX_TOKENS` or set `LLM_REASONING_EFFORT=low`. |
| `tts_not_configured` | Set `FISH_API_KEY`. |
| `tts_auth_failed` / `tts_quota_exceeded` / `tts_rate_limited` | Check the key, account credit, or slow down; text answers are unaffected. |
| Browser can't reach API | Add your frontend origin to `CORS_ORIGINS`; check `VITE_API_BASE_URL`. |
| Mic blocked | Browsers allow microphone access only on `localhost` or HTTPS. |

## Knowledge base

The source of truth is `backend/data/knowledge/northstar_master_knowledge_base.md` (fictional demo data, version 1.0). The assistant answers only from retrieved excerpts, says so when the KB doesn't specify something, never claims to perform account actions, and escalates refunds/cancellations/compromise to `support@example.com`. Replace the file (and the frontend copy in `src/data/northstarKnowledge.ts`) with approved real information before production use, as the KB itself requires. Extra documents can be uploaded in the Admin tab.
