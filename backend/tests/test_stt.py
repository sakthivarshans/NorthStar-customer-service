import asyncio
import time

import pytest

from app.config import Settings
from app.errors import AppError
from app.services.stt_provider import FasterWhisperSTT
from tests.conftest import FakeWhisper, make_wav

URL = "/api/v1/speech/transcribe"


def post(c, data, name="a.wav"):
    return c.post(URL, files={"file": (name, data, "application/octet-stream")})


def test_success_schema_and_singleton_model(make_client):
    c, svc = make_client()
    r1, r2 = post(c, make_wav()), post(c, make_wav())
    assert r1.status_code == 200
    body = r1.json()
    assert set(body) == {"text", "language", "duration", "model", "inference_time_ms", "segments"}
    assert body["text"] == "How much is the Professional plan" and body["model"] == "small.en"
    assert isinstance(body["inference_time_ms"], int) and r2.status_code == 200
    assert svc.stt.ready and svc.stt._model is svc.stt._model  # loaded once, reused
    assert svc.stt._model.last_kwargs["language"] == "en" and svc.stt._model.last_kwargs["vad_filter"] is True


def test_empty_upload(make_client):
    c, _ = make_client()
    r = post(c, b"")
    assert r.status_code == 400 and r.json()["code"] == "empty_audio"


def test_unsupported_media(make_client):
    c, _ = make_client()
    r = post(c, b"\x89PNG\r\n\x1a\n" + b"0" * 500, "x.wav")  # extension lies; content is PNG
    assert r.status_code == 415 and r.json()["code"] == "unsupported_media"


def test_corrupted_audio(make_client):
    c, _ = make_client()
    r = post(c, b"RIFF\x00\x10\x00\x00WAVE" + b"\xff" * 800)
    assert r.status_code == 422 and r.json()["code"] == "invalid_audio"


def test_oversized_upload(make_client):
    c, _ = make_client(stt_max_upload_bytes=50_000)
    r = post(c, make_wav(seconds=5))  # ~160 KB
    assert r.status_code == 413


def test_too_long_recording(make_client):
    c, _ = make_client(stt_max_duration_seconds=0.5)
    r = post(c, make_wav(seconds=2))
    assert r.status_code == 413 and r.json()["code"] == "audio_too_long"


def test_too_short_recording(make_client):
    c, _ = make_client()
    r = post(c, make_wav(seconds=0.05))
    assert r.status_code == 422 and r.json()["code"] == "empty_audio"


def test_no_speech(make_client, settings):
    class Silent(FakeWhisper):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            self.text = ""
    c, _ = make_client(stt=FasterWhisperSTT(settings, Silent))
    r = post(c, make_wav())
    assert r.status_code == 422 and r.json()["code"] == "no_speech_detected"


@pytest.mark.parametrize("exc,code", [
    (OSError("Connection error while fetching model"), "stt_model_download_failed"),
    (ImportError("no module"), "stt_dependency_missing"),
    (MemoryError(), "stt_out_of_memory"),
    (RuntimeError("boom"), "stt_init_failed"),
])
def test_model_init_failures(make_client, settings, exc, code):
    def bad(*a, **k):
        raise exc
    stt = FasterWhisperSTT(settings, bad)
    c, _ = make_client(stt=stt)
    r = post(c, make_wav())
    assert r.status_code == 503 and r.json()["code"] == code
    assert stt.state == "failed"
    assert c.get("/api/v1/speech/status").json()["stt_state"] == "failed"
    assert post(c, make_wav()).status_code == 503  # cooldown: no hot retry loop


def test_status_reports_model_readiness(make_client):
    c, svc = make_client()
    assert c.get("/api/v1/speech/status").json()["stt_state"] == "not_loaded"
    svc.stt.load()
    s = c.get("/api/v1/speech/status").json()
    assert s["stt_state"] == "ready" and s["stt_available"] is True and s["stt_model"] == "small.en"
    assert c.get("/api/v1/health").json()["stt_ready"] is True


async def test_bounded_concurrency_and_queue(tmp_path):
    active = peak = 0

    class Slow(FakeWhisper):
        def transcribe(self, path, **kw):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            time.sleep(0.15)
            active -= 1
            return super().transcribe(path, **kw)

    s = Settings(data_dir=tmp_path, stt_max_concurrency=1, stt_max_queue=2)
    stt = FasterWhisperSTT(s, Slow)
    stt.load()
    p = tmp_path / "x.wav"
    p.write_bytes(make_wav())
    res = await asyncio.gather(*[stt.transcribe(p) for _ in range(5)], return_exceptions=True)
    assert peak == 1
    busy = [r for r in res if isinstance(r, AppError) and r.code == "stt_busy"]
    ok = [r for r in res if not isinstance(r, Exception)]
    assert busy and ok and busy[0].status_code == 429


def test_auth_required_when_configured(make_client):
    c, _ = make_client(api_access_key="secret")
    assert post(c, make_wav()).status_code == 401
    assert c.post(URL, files={"file": ("a.wav", make_wav())}, headers={"X-API-Key": "secret"}).status_code == 200
