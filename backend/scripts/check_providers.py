"""Check every external dependency with real requests and print the provider's exact answer.

    python scripts/check_providers.py            # LLM + TTS + local STT
    python scripts/check_providers.py llm tts    # only some checks
"""
import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings  # noqa: E402
from app.errors import AppError  # noqa: E402


async def check_llm(s):
    from app.services.llm_provider import OpenRouterLLM

    t = time.time()
    out = await OpenRouterLLM(s).complete("Reply with exactly one short sentence.", [{"role": "user", "content": "Say hello."}])
    return f"model={s.llm_model} replied in {time.time()-t:.1f}s: {out[:80]!r}"


async def check_tts(s):
    from app.services.tts_provider import make_tts

    tts = make_tts(s)
    t = time.time()
    audio = await tts.synthesize("This is a Northstar voice test.")
    Path("tts_test.mp3").write_bytes(audio.content)
    return f"{tts.label}: {len(audio.content)} bytes in {time.time()-t:.1f}s -> saved tts_test.mp3 (play it!)"


async def check_stt(s):
    import numpy as np

    from app.services.stt_provider import FasterWhisperSTT

    stt = FasterWhisperSTT(s)
    t = time.time()
    await asyncio.get_running_loop().run_in_executor(None, stt.load)
    load = time.time() - t
    audio = (0.1 * np.sin(2 * np.pi * 440 * np.arange(32000) / 16000)).astype("float32")
    res = await stt.transcribe(audio)
    return f"model {s.stt_model} loaded in {load:.1f}s; 2s of audio took {res.inference_time_ms} ms (tone has no speech, so empty text is expected)"


async def main():
    s = get_settings()
    wanted = sys.argv[1:] or ["llm", "tts", "stt"]
    checks = {"llm": check_llm, "tts": check_tts, "stt": check_stt}
    bad = 0
    for name in wanted:
        try:
            print(f"[ OK ] {name}: {await checks[name](s)}")
        except AppError as e:
            bad += 1
            print(f"[FAIL] {name}: {e.code} - {e.message}")
        except Exception as e:  # noqa: BLE001
            bad += 1
            print(f"[FAIL] {name}: {type(e).__name__}: {str(e)[:200]}")
    sys.exit(1 if bad else 0)


asyncio.run(main())
