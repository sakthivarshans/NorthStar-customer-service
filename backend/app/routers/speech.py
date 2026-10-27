import asyncio
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import Response

from app.deps import require_access, svc
from app.errors import AppError
from app.schemas import SpeechStatus, SynthesizeRequest, TranscriptionResponse, TranscriptSegment
from app.services.audio_validation import ALLOWED_AUDIO_TYPES, load_audio, sniff_audio_type
from app.services.speech_text import clean_text_for_speech

log = logging.getLogger("northstar.speech")
router = APIRouter(prefix="/speech", dependencies=[Depends(require_access)])


def speech_status(s) -> SpeechStatus:
    stt_ok, tts_ok = s.stt.state != "failed", s.tts.configured
    return SpeechStatus(
        stt_available=s.stt.ready, tts_available=tts_ok,
        stt_provider=f"Faster-Whisper ({s.settings.stt_model}, local {s.settings.stt_device}/{s.settings.stt_compute_type})",
        tts_provider=s.tts.label,
        status="healthy" if (s.stt.ready and tts_ok) else ("offline" if not stt_ok and not tts_ok else "degraded"),
        stt_model=s.settings.stt_model, stt_state=s.stt.state, stt_error=s.stt.error_message,
        tts_model=s.tts.model, tts_configured=tts_ok, approved_voices=s.settings.approved_voices)


@router.get("/status", response_model=SpeechStatus)
async def status(request: Request):
    return speech_status(svc(request))


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(request: Request, file: UploadFile = File(...)):
    s = svc(request)
    limit = s.settings.stt_max_upload_bytes
    tmp_path: Path | None = None
    try:
        head = await file.read(64)
        if not head:
            raise AppError(400, "empty_audio", "The uploaded recording is empty.")
        kind = sniff_audio_type(head)
        if kind not in ALLOWED_AUDIO_TYPES:
            raise AppError(415, "unsupported_media", "Unsupported media. Upload webm, ogg, wav, mp3, m4a or flac audio.")
        size = len(head)
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{kind}") as tmp:
            tmp_path = Path(tmp.name)
            tmp.write(head)
            while chunk := await file.read(1024 * 256):
                size += len(chunk)
                if size > limit:
                    raise AppError(413, "audio_too_large", f"Recording exceeds the {limit // 1048576} MB limit.")
                tmp.write(chunk)
        audio, duration = await asyncio.to_thread(
            load_audio, tmp_path, s.settings.stt_max_duration_seconds, s.settings.stt_min_duration_seconds)
        result = await s.stt.transcribe(audio)
        if not result.text:
            raise AppError(422, "no_speech_detected", "No speech was detected in the recording.")
        log.info("transcribed %.1fs audio in %d ms (%d chars)", duration, result.inference_time_ms, len(result.text))
        return TranscriptionResponse(
            text=result.text, language=result.language, duration=result.duration or round(duration, 2), model=result.model,
            inference_time_ms=result.inference_time_ms,
            segments=[TranscriptSegment(start=g.start, end=g.end, text=g.text) for g in result.segments])
    except AppError as exc:
        log.warning("transcribe rejected: %s (%s)", exc.code, kind if 'kind' in locals() else "?")
        raise
    finally:
        await file.close()
        if tmp_path:
            tmp_path.unlink(missing_ok=True)


@router.post("/synthesize")
async def synthesize(req: SynthesizeRequest, request: Request):
    s = svc(request)
    text = clean_text_for_speech(req.text)
    if not text:
        raise AppError(422, "empty_text", "There is no speakable text.")
    if len(text) > s.settings.tts_max_chars:
        raise AppError(413, "text_too_long", f"Text exceeds the {s.settings.tts_max_chars} character speech limit.")
    if s.settings.tts_require_grounded_text and not s.store.is_assistant_text(req.text, req.conversation_id):
        raise AppError(422, "text_not_from_answer", "Only answers produced by the support assistant can be spoken.")
    audio = await s.tts.synthesize(text, req.voice_id)
    return Response(audio.content, media_type=audio.content_type, headers={"Cache-Control": "no-store", "X-TTS-Model": audio.model})
