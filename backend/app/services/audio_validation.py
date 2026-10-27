"""Content-based audio validation. Filename and MIME type are never trusted."""
import logging
from pathlib import Path

from app.errors import AppError

log = logging.getLogger("northstar.audio")

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


def _frames(resampler, frame):
    out = resampler.resample(frame)
    return out if isinstance(out, (list, tuple)) else ([] if out is None else [out])


def load_audio(path: Path, max_seconds: float, min_seconds: float):
    """Decode any supported file to 16 kHz mono float32 using PyAV directly.

    We do this ourselves (instead of letting faster-whisper open the file) because some
    faster-whisper / PyAV version combinations crash inside faster_whisper.audio.decode_audio.
    One pass validates the file, bounds duration/memory, and produces the model input.
    Returns (audio, duration_seconds). Raises AppError for bad input.
    """
    try:
        import av
        import numpy as np
        from av.audio.resampler import AudioResampler
    except ImportError as exc:
        raise AppError(503, "stt_dependency_missing", "Audio libraries (av, numpy) are not installed.") from exc

    limit = int(max_seconds * 16000)
    chunks, total = [], 0
    try:
        resampler = AudioResampler(format="s16", layout="mono", rate=16000)
        with av.open(str(path)) as container:
            stream = next((st for st in container.streams if st.type == "audio"), None)
            if stream is None:
                raise AppError(422, "unsupported_media", "The file contains no audio track.")
            if container.duration and container.duration / 1_000_000 > max_seconds * 1.05:
                raise AppError(413, "audio_too_long", f"Recording exceeds the {int(max_seconds)}s limit.")
            for frame in container.decode(stream):
                for rf in _frames(resampler, frame):
                    arr = rf.to_ndarray().reshape(-1)
                    total += arr.size
                    if total > limit:
                        raise AppError(413, "audio_too_long", f"Recording exceeds the {int(max_seconds)}s limit.")
                    chunks.append(arr)
            for rf in _frames(resampler, None):
                chunks.append(rf.to_ndarray().reshape(-1))
                total += chunks[-1].size
    except AppError:
        raise
    except Exception as exc:  # corrupted / truncated / undecodable
        log.warning("audio decode failed: %s", type(exc).__name__)
        raise AppError(422, "invalid_audio", "The audio could not be decoded. It may be corrupted.") from exc

    if not chunks or total == 0:
        raise AppError(422, "empty_audio", "The recording is empty or too short.")
    audio = np.concatenate(chunks).astype(np.float32) / 32768.0
    duration = len(audio) / 16000
    if duration < min_seconds:
        raise AppError(422, "empty_audio", "The recording is empty or too short.")
    return audio, duration
