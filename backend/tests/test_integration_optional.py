"""Optional live tests. Skipped unless the matching RUN_*_INTEGRATION env var is set."""
import os

import pytest

from app.config import Settings
from app.services.llm_provider import OpenRouterLLM
from app.services.stt_provider import FasterWhisperSTT
from app.services.tts_provider import FishAudioTTS
from tests.conftest import make_wav


@pytest.mark.integration_stt
@pytest.mark.skipif(not os.getenv("RUN_STT_INTEGRATION"), reason="needs real Whisper model files / download")
def test_real_whisper_loads_and_runs(tmp_path):
    stt = FasterWhisperSTT(Settings(stt_load_retry_cooldown_seconds=0))
    p = tmp_path / "t.wav"
    p.write_bytes(make_wav(2))
    import time
    res = stt.transcribe_file(p, time.monotonic() + 120)  # a tone has no speech; we only prove inference runs
    assert res.model == Settings().stt_model and res.inference_time_ms >= 0


@pytest.mark.integration_tts
@pytest.mark.skipif(not os.getenv("RUN_TTS_INTEGRATION"), reason="needs FISH_API_KEY")
async def test_real_fish_audio():
    audio = await FishAudioTTS(Settings()).synthesize("This is a Northstar test.")
    assert len(audio.content) > 1000 and audio.content_type == "audio/mpeg"


@pytest.mark.integration_llm
@pytest.mark.skipif(not os.getenv("RUN_LLM_INTEGRATION"), reason="needs OPENROUTER_API_KEY")
async def test_real_openrouter():
    out = await OpenRouterLLM(Settings()).complete("Reply with one word.", [{"role": "user", "content": "Say ok"}])
    assert out
