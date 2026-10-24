import io
import math
import struct
import wave
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.deps import Services
from app.main import create_app
from app.services.documents import KnowledgeBase
from app.services.store import ConversationStore
from app.services.stt_provider import FasterWhisperSTT
from app.services.tts_provider import FishAudioTTS
from app.errors import AppError

KB_SRC = "data/knowledge/northstar_master_knowledge_base.md"


def make_wav(seconds=1.0, rate=16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(rate)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / rate))) for i in range(int(rate * seconds))))
    return buf.getvalue()


class FakeWhisper:
    """Stands in for faster_whisper.WhisperModel; returns a lazy generator like the real one."""
    calls = 0

    def __init__(self, name, **kw):
        self.name, self.kw = name, kw
        self.text = "How much is the Professional plan"

    def transcribe(self, path, **kw):
        FakeWhisper.calls += 1
        self.last_kwargs = kw
        seg = SimpleNamespace(start=0.0, end=1.0, text=f" {self.text} ") if self.text else None
        return (iter([seg] if seg else []), SimpleNamespace(language="en", duration=1.0))


class FakeLLM:
    configured = True

    def __init__(self, answer="Professional is $12 per user per month, billed monthly."):
        self.answer, self.calls = answer, []

    async def complete(self, system, messages):
        self.calls.append((system, messages))
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


def tts_with(handler, **settings_kw):
    s = Settings(fish_api_key="test-key", **settings_kw)
    return FishAudioTTS(s, httpx.AsyncClient(transport=httpx.MockTransport(handler)))


@pytest.fixture
def settings(tmp_path):
    return Settings(data_dir=tmp_path, stt_preload=False, fish_api_key="test-key", openrouter_api_key="x")


@pytest.fixture
def make_client(settings, tmp_path):
    import shutil
    (tmp_path / "knowledge").mkdir(exist_ok=True)
    shutil.copy(KB_SRC, tmp_path / "knowledge")

    def _make(llm=None, tts=None, stt=None, **overrides):
        st = settings.model_copy(update=overrides)
        svc = Services(settings=st, kb=KnowledgeBase(tmp_path, st.rag_chunk_chars), store=ConversationStore(":memory:"),
                       llm=llm or FakeLLM(), stt=stt or FasterWhisperSTT(st, FakeWhisper),
                       tts=tts or tts_with(lambda r: httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=b"ID3" + b"\x00" * 64)))
        return TestClient(create_app(st, svc)), svc
    return _make
