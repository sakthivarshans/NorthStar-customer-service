"""Pre-download and cache the Faster-Whisper model:  python scripts/download_model.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings  # noqa: E402


def main() -> int:
    s = get_settings()
    from faster_whisper.utils import download_model

    kwargs = {"cache_dir": s.stt_download_root} if s.stt_download_root else {}
    try:
        path = download_model(s.stt_model, **kwargs)
    except Exception as exc:  # noqa: BLE001
        print(f"Download failed ({type(exc).__name__}): check your internet connection and retry.", file=sys.stderr)
        return 1
    print(f"Model '{s.stt_model}' cached at: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
