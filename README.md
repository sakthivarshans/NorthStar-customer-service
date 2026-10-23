# Northstar Customer Support with RAG & Voice

A production-grade customer support web application for **Northstar Technologies Inc.**, featuring Retrieval-Augmented Generation (RAG) grounding, verifiable source citations, full product catalog & pricing comparison, self-service help center, knowledge-base administration, and **Voice Input (Local Faster-Whisper base.en STT) & Spoken Audio Output (Fish Audio S2.1 Pro TTS)**.

---

## 1. Key Features

- **Customer Support Agent**:
  - Grounded answering based on official Northstar company documentation.
  - Transparent evidence statuses:
    - *Based on company documentation* (verified RAG retrieval).
    - *Some details could not be verified* (partial match).
    - *Human support recommended* (out-of-scope, policy ambiguity, or explicit user request).
  - Source citation drawers showing exact document titles, sections, relevance scores, and retrieved text excerpts.
  - Suggested questions covering products, pricing, cancellations, refunds, and support escalation.
  - Enter to send, Shift+Enter for newlines, loading states, duplicate submission prevention, and user scroll lock preservation.
  - Answer copying and helpful/not-helpful feedback controls.

- **Local Speech-to-Text (STT) via Faster-Whisper `base.en`**:
  - **Local Host Execution**: Speech recognition executes locally on the developer's computer using Faster-Whisper with the English-only `base.en` model (downloaded and cached on first load). **No Colab, OpenRouter, or remote STT dependencies**.
  - **MediaRecorder Flow**: Reusable `MicrophoneButton` and `AudioRecorder` with explicit state machine (`idle`, `requesting_permission`, `recording`, `stopping`, `uploading`, `transcribing`, `ready`, `failed`, `cancelled`).
  - **Transcript Review**: Speech recognised by `POST /api/v1/speech/transcribe` is displayed in `TranscriptReview` inside the message composer. The customer can edit the text, record again, cancel, or submit to support.
  - **Guardrails**: Configurable recording duration limits (30s, 60s, 120s), 10 MB audio file limit, and full microphone track cleanup.

- **Text-to-Speech (TTS) via Fish Audio S2.1 Pro**:
  - **Grounded Speech Playback**: Assistant answers feature an accessible `AudioPlayer` powered by Fish Audio S2.1 Pro via backend `POST /api/v1/speech/synthesize`.
  - **Formatting Sanitization**: Markdown tables, asterisks, bullet points, and code backticks are converted into natural spoken prose while strictly preserving all underlying numbers, pricing, and factual details.
  - **Audio Controls**: Generate audio, Play, Pause, Resume, Stop, Replay, seekable progress slider, duration display, loading states, and error recovery with retry.
  - **Voice Preferences**: Configurable through `VoiceSettings` (enable/disable voice responses, auto-play responses toggle with default: off, preferred voice identifier, and recording duration).

- **Dual Mode Architecture**:
  - **Demo Mode**: Built-in deterministic RAG retrieval engine over the authoritative Northstar knowledge document. Allows full testing of citations, confidence statuses, conversation management, document uploads, and realistic voice STT/TTS simulation without requiring an external server.
  - **Live Mode**: Dispatches real HTTP requests to the configured RAG backend API (`VITE_API_BASE_URL`). Handles network latency, connection diagnostics, and retry controls gracefully.

- **Products & Pricing Catalog**:
  - Full catalog of Northstar products: *Northstar Cloud Suite*, *Northstar Analytics Pro*, *Northstar Team Sync*, and *Northstar Enterprise Shield*.
  - Tier schedule for *Starter* ($29/mo), *Professional* ($79/mo), and *Enterprise* ($199/mo).
  - Monthly vs Annual billing switch (~18% annual discount).
  - Detailed plan feature comparison matrix.
  - One-click "Ask Support" buttons that route to the agent.

- **Help Center & FAQs**:
  - Searchable knowledge base categorised by Products, Billing, Account/Security, and Policies.
  - Strict separation between static approved FAQs and live RAG retrieval.
  - Direct human support escalation cards with SLA commitments.

- **Knowledge Base Administration (`/admin/knowledge`)**:
  - Drag-and-drop document upload (PDF, TXT, Markdown, DOCX) with 15 MB file size validation.
  - Document management table: status badges (`indexed`, `processing`, `queued`, `failed`), chunk counts, file sizes, and timestamps.
  - Actions: Manual reindexing and delete with confirmation dialog.
  - Real-time indexing logs panel with level filtering (`info`, `warning`, `error`).
  - System statistics: Document count, chunk count, vector index size, and retrieval latency.

- **Conversation History**:
  - Session list with title, message count, and last updated timestamps.
  - Client-side search and keyword filtering.
  - Resume session or delete session with confirmation.

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
# Base URL for RAG & Speech backend API (defaults to http://localhost:8000/api/v1)
VITE_API_BASE_URL="http://localhost:8000/api/v1"
```

You can also dynamically override the backend base URL at runtime through the **Configure URL** button on the top diagnostics banner.

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Run Vite development server on port 3000
npm run dev

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build
```

---

## 4. Reusable Voice Components

The frontend provides clean, modular components designed for reuse:

- **`MicrophoneButton`** (`src/components/chat/MicrophoneButton.tsx`):
  Accessible button triggering the recording workflow, with hover, focus, disabled, and active pulsing states.
- **`AudioRecorder`** (`src/components/chat/AudioRecorder.tsx`):
  Modal/drawer managing the MediaRecorder state machine, elapsed timer, sound wave animation, stop and cancel actions, and local Faster-Whisper base.en upload.
- **`TranscriptReview`** (`src/components/chat/TranscriptReview.tsx`):
  Review banner rendered above the message composer with "Record Again", "Discard", and "Submit Inquiry" actions.
- **`AudioPlayer`** (`src/components/chat/AudioPlayer.tsx`):
  Accessible audio player for assistant responses with Play, Pause, Resume, Stop, Replay, slider seeking, and Fish Audio S2.1 Pro error handling.
- **`VoiceSettings`** (`src/components/chat/VoiceSettings.tsx`):
  Compact modal for configuring voice responses, auto-play (default: off), preferred voice ID, and max duration limits.
- **`SpeechStatus`** (`src/components/chat/SpeechStatus.tsx`):
  Diagnostic badge showing real-time health of local Faster-Whisper and Fish Audio TTS.

---

## 5. Backend API Contract Specifications

The frontend connects through a dedicated typed client layer (`src/services/api.ts`) implementing these endpoint contracts:

### Core RAG & Support Endpoints

1. **`GET /health`**
   - Response: `{ "status": "healthy", "version": "1.0.0" }`

2. **`POST /chat`**
   - Request: `{ "message": "string", "conversation_id": "optional-id" }`
   - Response:
     ```json
     {
       "answer": "string",
       "conversation_id": "string",
       "sources": [
         {
           "id": "src-1",
           "documentTitle": "string",
           "documentType": "pdf | txt | md | docx",
           "section": "string",
           "excerpt": "string",
           "relevanceScore": 0.95,
           "lastUpdated": "2026-10-10"
         }
       ],
       "grounded": true,
       "needs_human": false,
       "evidence_status": "grounded | partial | uncertain"
     }
     ```

3. **`GET /conversations`**
   - Response: `Conversation[]`

4. **`GET /conversations/{id}`**
   - Response: `Conversation`

5. **`DELETE /conversations/{id}`**
   - Response: `{ "success": true }`

6. **`POST /admin/documents`**
   - Request: Multipart `FormData` with `files` field.
   - Response: `AdminDocument[]`

7. **`GET /admin/documents`**
   - Response: `AdminDocument[]`

8. **`GET /admin/documents/{id}`**
   - Response: `AdminDocument`

9. **`POST /admin/documents/{id}/reindex`**
   - Response: `AdminDocument`

10. **`DELETE /admin/documents/{id}`**
    - Response: `{ "success": true }`

11. **`POST /feedback`**
    - Request: `{ "messageId": "string", "conversationId": "string", "feedback": "helpful" | "unhelpful", "comment": "optional" }`
    - Response: `{ "success": true }`

12. **`GET /admin/stats`**
    - Response:
      ```json
      {
        "totalDocuments": 4,
        "indexedChunks": 473,
        "lastIndexedTime": "2026-10-10T09:12:40Z",
        "systemStatus": "healthy",
        "vectorIndexSizeMb": 21.28,
        "averageRetrievalLatencyMs": 82
      }
      ```

### Speech (STT & TTS) Endpoints

13. **`POST /api/v1/speech/transcribe`** (or `/speech/transcribe`)
    - Request: Multipart `FormData` with `file: Blob | File` (WebM / Ogg / WAV audio).
    - Response:
      ```json
      {
        "text": "Recognised speech",
        "language": "en",
        "duration": 4.2
      }
      ```
    - Executed locally on the developer's computer using Faster-Whisper with the `base.en` English model (cached on host).

14. **`POST /api/v1/speech/synthesize`** (or `/speech/synthesize`)
    - Request:
      ```json
      {
        "text": "Clean natural speech text",
        "conversation_id": "optional-id",
        "voice_id": "optional-voice-id"
      }
      ```
    - Response: Raw audio bytes (`Content-Type: audio/mpeg` or `audio/wav`) OR JSON `{ "audio_url": "https://..." }`.
    - Handled by the backend proxying to Fish Audio S2.1 Pro using a server-side API key.

15. **`GET /api/v1/speech/status`** (or `/speech/status`)
    - Response:
      ```json
      {
        "stt_available": true,
        "tts_available": true,
        "stt_provider": "Faster-Whisper (base.en local model)",
        "tts_provider": "Fish Audio S2.1 Pro",
        "status": "healthy"
      }
      ```

---

## 6. Backend Integration Checklist & Missing Endpoints

If you are developing the backend server, implement the following endpoints to enable full live mode functionality:

| Endpoint | Method | Backend Responsibility | Frontend Fallback Behavior |
| :--- | :--- | :--- | :--- |
| `/api/v1/speech/transcribe` | `POST` | Receive audio file, run local Faster-Whisper (`base.en`), return JSON `{ text, language, duration }`. | In Live Mode, surfaces clear error with retry option. In Demo Mode, provides grounded local simulation. |
| `/api/v1/speech/synthesize` | `POST` | Receive `{ text, conversation_id }`, call Fish Audio S2.1 Pro with server-side key, stream audio bytes or return URL. | In Live Mode, shows retry button without breaking text response. In Demo Mode, plays local synthesized tone. |
| `/api/v1/speech/status` | `GET` | Return health of local Faster-Whisper worker and Fish Audio API quota. | Returns offline status indicator with manual refresh button. |
