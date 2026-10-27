"""Local Faster-Whisper speech-to-text (singleton model, bounded concurrency)."""
import asyncio
import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from app.config import Settings
from app.errors import AppError

log = logging.getLogger("northstar.stt")


@dataclass
class Segment:
    start: float
    end: float
    text: str


@dataclass
class TranscriptionResult:
    text: str
    language: str
    duration: float
    model: str
    inference_time_ms: int
    segments: list[Segment] = field(default_factory=list)


def _classify_load_error(exc: BaseException) -> tuple[str, str]:
    msg = str(exc).lower()
    if isinstance(exc, ImportError):
        return "stt_dependency_missing", "faster-whisper is not installed. Run: pip install -r requirements.txt"
    if isinstance(exc, MemoryError) or "out of memory" in msg or "bad_alloc" in msg:
        return "stt_out_of_memory", "Not enough memory to load the Whisper model. Try STT_MODEL=tiny.en or close other apps."
    if any(k in msg for k in ("connection", "network", "offline", "cannot find an appropriate cached", "resolve", "timed out", "huggingface")):
        return "stt_model_download_failed", (
            "The Whisper model is not cached and could not be downloaded. Check your internet connection "
            "or pre-download it with: python scripts/download_model.py"
        )
    return "stt_init_failed", "The local Whisper model failed to initialise. See server logs."


class FasterWhisperSTT:
    def __init__(self, settings: Settings, model_factory: Callable[..., Any] | None = None):
        self.s = settings
        self._factory = model_factory
        self._model: Any = None
        self._state = "not_loaded"
        self._error: tuple[str, str] | None = None
        self._failed_at = 0.0
        self._load_lock = threading.Lock()
        self._sem = asyncio.Semaphore(settings.stt_max_concurrency)
        self._waiting = 0
        self._executor = ThreadPoolExecutor(max_workers=settings.stt_max_concurrency, thread_name_prefix="stt")

    # ---- status -------------------------------------------------------
    @property
    def state(self) -> str:
        return self._state

    @property
    def error_message(self) -> str | None:
        return self._error[1] if self._error else None

    @property
    def ready(self) -> bool:
        return self._state == "ready"

    # ---- model lifecycle ---------------------------------------------
    def load(self) -> None:
        """Load once (thread-safe). Raises AppError on failure."""
        with self._load_lock:
            if self._model is not None:
                return
            if self._error and time.monotonic() - self._failed_at < self.s.stt_load_retry_cooldown_seconds:
                raise AppError(503, *self._error)
            self._state = "loading"
            try:
                factory = self._factory
                if factory is None:
                    from faster_whisper import WhisperModel as factory  # lazy: heavy import
                kwargs: dict[str, Any] = dict(
                    device=self.s.stt_device,
                    compute_type=self.s.stt_compute_type,
                    local_files_only=self.s.stt_local_files_only,
                )
                if self.s.stt_download_root:
                    kwargs["download_root"] = self.s.stt_download_root
                if self.s.stt_cpu_threads:
                    kwargs["cpu_threads"] = self.s.stt_cpu_threads
                t0 = time.monotonic()
                self._model = factory(self.s.stt_model, **kwargs)
                self._state, self._error = "ready", None
                log.info("Whisper model %s ready in %.1fs", self.s.stt_model, time.monotonic() - t0)
            except BaseException as exc:  # noqa: BLE001 - classify everything
                self._state, self._error, self._failed_at = "failed", _classify_load_error(exc), time.monotonic()
                log.error("Whisper load failed: %s", type(exc).__name__)
                raise AppError(503, *self._error) from exc

    async def preload(self) -> None:
        try:
            await asyncio.get_running_loop().run_in_executor(None, self.load)
        except AppError:
            pass  # state/error already recorded; /speech/status reports it

    # ---- inference ----------------------------------------------------
    def _language(self) -> str | None:
        lang = self.s.stt_language.strip() or None
        if self.s.stt_model.endswith(".en"):
            return "en"  # English-only checkpoints cannot do other languages
        return lang

    def _run(self, audio, vad: bool, deadline: float):
        try:
            segments_iter, info = self._model.transcribe(
                audio,
                language=self._language(),
                beam_size=self.s.stt_beam_size,
                vad_filter=vad,
                vad_parameters={"min_silence_duration_ms": 500},
                condition_on_previous_text=False,
            )
            segments: list[Segment] = []
            for seg in segments_iter:  # generator: inference happens while consuming
                if time.monotonic() > deadline:
                    raise AppError(504, "stt_timeout", "Transcription timed out.")
                segments.append(Segment(round(seg.start, 2), round(seg.end, 2), seg.text.strip()))
            return segments, info
        except AppError:
            raise
        except MemoryError as exc:
            raise AppError(503, "stt_out_of_memory", "Not enough memory to transcribe this recording.") from exc
        except Exception as exc:
            if "out of memory" in str(exc).lower():
                raise AppError(503, "stt_out_of_memory", "Not enough memory to transcribe this recording.") from exc
            # NOT the audio's fault (decoding already succeeded): report it honestly.
            log.error("Whisper inference failed: %s: %s", type(exc).__name__, str(exc)[:200])
            raise AppError(500, "stt_inference_failed", f"Speech recognition failed inside the model ({type(exc).__name__}). See server logs.") from exc

    def transcribe_file(self, audio, deadline: float) -> TranscriptionResult:
        """`audio` is a 16 kHz mono float32 array (or a file path, decoded here)."""
        if not hasattr(audio, "shape"):
            from app.services.audio_validation import load_audio

            audio, _ = load_audio(Path(audio), self.s.stt_max_duration_seconds, self.s.stt_min_duration_seconds)
        self.load()
        t0 = time.monotonic()
        segments, info = self._run(audio, self.s.stt_vad_filter, deadline)
        if not any(g.text for g in segments) and self.s.stt_vad_filter:
            # VAD can discard quiet/short speech entirely; retry once without it before giving up.
            segments, info = self._run(audio, False, deadline)
        text = " ".join(g.text for g in segments if g.text).strip()
        return TranscriptionResult(
            text=text,
            language=getattr(info, "language", None) or self._language() or "en",
            duration=round(len(audio) / 16000, 2),
            model=self.s.stt_model,
            inference_time_ms=int((time.monotonic() - t0) * 1000),
            segments=segments,
        )

    async def transcribe(self, audio) -> TranscriptionResult:
        if self._waiting >= self.s.stt_max_queue:
            raise AppError(429, "stt_busy", "Transcription is busy. Please retry shortly.", {"Retry-After": "5"})
        self._waiting += 1
        try:
            await self._sem.acquire()
        finally:
            self._waiting -= 1
        loop = asyncio.get_running_loop()
        deadline = time.monotonic() + self.s.stt_timeout_seconds
        fut = loop.run_in_executor(self._executor, self.transcribe_file, audio, deadline)
        # Release the slot only when the worker really finishes, so timeouts cannot pile up CPU work.
        fut.add_done_callback(lambda _f: self._sem.release())
        try:
            return await asyncio.wait_for(asyncio.shield(fut), self.s.stt_timeout_seconds + 5)
        except asyncio.TimeoutError as exc:
            raise AppError(504, "stt_timeout", "Transcription timed out.") from exc
