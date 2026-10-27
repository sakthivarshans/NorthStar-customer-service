"""Measure speed AND accuracy of local Whisper models on THIS computer, then pick one.

    python scripts/benchmark_stt.py                       # uses tts_test.mp3 (made by check_providers.py)
    python scripts/benchmark_stt.py my_question.wav       # or any recording of your voice
    python scripts/benchmark_stt.py my.wav --models small.en distil-small.en medium.en

Each model downloads once (sizes: tiny.en 75MB, base.en 150MB, small.en 500MB, distil-small.en 330MB,
distil-medium.en 790MB, medium.en 1.5GB, distil-large-v3 1.5GB). The first row for a model includes its download.
Pick the most accurate model whose "speed" column is under ~10 s for comfortable use.
"""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import Settings, get_settings  # noqa: E402
from app.services.audio_validation import load_audio  # noqa: E402
from app.services.stt_provider import FasterWhisperSTT  # noqa: E402

DEFAULT_MODELS = ["base.en", "small.en", "distil-small.en", "distil-medium.en"]


def bench(models, audio_path, base: Settings, factory=None, out=print):
    audio, dur = load_audio(Path(audio_path), 120, 0.3)
    out(f"audio: {audio_path} ({dur:.1f}s)\n")
    out(f"{'model':18} {'load':>8} {'speed':>8}  transcript")
    rows = []
    for name in models:
        st = FasterWhisperSTT(base.model_copy(update={"stt_model": name}), factory)
        try:
            t = time.monotonic()
            st.load()
            load = time.monotonic() - t
            st.warmup()
            t = time.monotonic()
            res = st.transcribe_file(audio, time.monotonic() + 600)
            speed = time.monotonic() - t
            rows.append((name, load, speed, res.text))
            out(f"{name:18} {load:7.1f}s {speed:7.1f}s  {res.text!r}")
        except Exception as exc:  # noqa: BLE001
            out(f"{name:18} {'-':>8} {'-':>8}  FAILED: {type(exc).__name__}: {str(exc)[:80]}")
    ok = [r for r in rows if r[2] <= 10]
    if ok:
        out("\nFastest-acceptable (<=10s) models, largest last -> usually the best choice: " + ", ".join(r[0] for r in ok))
    return rows


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", nargs="?", default="tts_test.mp3")
    ap.add_argument("--models", nargs="+", default=DEFAULT_MODELS)
    a = ap.parse_args()
    if not Path(a.audio).exists():
        sys.exit(f"{a.audio} not found. Run check_providers.py first (it saves tts_test.mp3) or pass your own recording.")
    bench(a.models, a.audio, get_settings())
