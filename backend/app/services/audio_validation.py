"""Content-based audio validation. Filename and MIME type are never trusted."""
from pathlib import Path

from app.errors import AppError

# (label, test) over the first bytes of the file
_SIGNATURES = [
    ("webm", lambda h: h[:4] == b"\x1a\x45\xdf\xa3"),
    ("ogg", lambda h: h[:4] == b"OggS"),
    ("wav", lambda h: h[:4] == b"RIFF" and h[8:12] == b"WAVE"),
    ("mp3", lambda h: h[:3] == b"ID3" or (len(h) > 1 and h[0] == 0xFF and (h[1] & 0xE0) == 0xE0)),
    ("m4a", lambda h: h[4:8] == b"ftyp"),
    ("flac", lambda h: h[:4] == b"fLaC"),
]
ALLOWED_AUDIO_TYPES = {"webm", "ogg", "wav", "mp3", "m4a", "flac"}


def sniff_audio_type(header: bytes) -> str | None:
    for label, test in _SIGNATURES:
        if test(header):
            return label
    return None


def probe_audio(path: Path, max_seconds: float, min_seconds: float) -> float:
    """Decode-probe the file; return duration in seconds. Raises AppError on bad audio.

    MediaRecorder WebM often has no duration header, so we count decoded samples and
    abort as soon as the limit is exceeded (bounds CPU/memory before Whisper runs).
    """
    try:
        import av
    except ImportError as exc:  # faster-whisper depends on PyAV, so this is unexpected
        raise AppError(503, "stt_dependency_missing", "Audio decoding library (PyAV) is not installed.") from exc

    try:
        with av.open(str(path)) as container:
            stream = next((s for s in container.streams if s.type == "audio"), None)
            if stream is None:
                raise AppError(422, "unsupported_media", "The file contains no audio track.")
            duration = float(container.duration) / 1_000_000 if container.duration else None
            if duration is not None and duration > max_seconds:
                raise AppError(413, "audio_too_long", f"Recording exceeds the {int(max_seconds)}s limit.")
            if duration is None or duration <= 0:
                total = 0.0
                for frame in container.decode(stream):
                    total += frame.samples / float(frame.sample_rate or 16000)
                    if total > max_seconds:
                        raise AppError(413, "audio_too_long", f"Recording exceeds the {int(max_seconds)}s limit.")
                duration = total
    except AppError:
        raise
    except Exception as exc:  # corrupted / truncated / undecodable
        raise AppError(422, "invalid_audio", "The audio could not be decoded. It may be corrupted.") from exc

    if duration < min_seconds:
        raise AppError(422, "empty_audio", "The recording is empty or too short.")
    return duration
