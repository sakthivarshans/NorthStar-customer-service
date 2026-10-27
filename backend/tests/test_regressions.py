"""Regression tests for the bugs reported from real use:
  1. every recording returned 422 (faster-whisper's own decoder crashes with some PyAV versions)
  2. TTS 'rejected the server credentials' (an OpenRouter key was used against Fish's native API)
"""
import io
from pathlib import Path
from types import SimpleNamespace

import httpx
import numpy as np
import pytest

from app.config import Settings
from app.errors import AppError
from app.services.audio_validation import load_audio
from app.services.stt_provider import FasterWhisperSTT
from app.services.tts_provider import FishAudioTTS, OpenRouterTTS, make_tts
from tests.conftest import FakeWhisper, make_wav

MP3 = b"ID3" + b"\x00" * 64
URL = "/api/v1/speech/transcribe"


def _webm(path: Path, seconds=2.0):
    """MediaRecorder-like WebM/Opus written to a non-seekable stream (no duration header)."""
    av = pytest.importorskip("av")

    class NoSeek(io.RawIOBase):
        def __init__(self): self.f = open(path, "wb")
        def writable(self): return True
        def write(self, b): return self.f.write(b)
        def seekable(self): return False
        def close(self): self.f.close(); super().close()

    try:
        c = av.open(NoSeek(), "w", format="webm")
        st = c.add_stream("libopus", rate=48000); st.layout = "mono"
    except Exception:
        pytest.skip("this PyAV build cannot encode opus")
    x = (0.3 * np.sin(2 * np.pi * 440 * np.arange(int(48000 * seconds)) / 48000) * 32767).astype(np.int16).reshape(1, -1)
    for i in range(0, x.shape[1], 960):
        f = av.AudioFrame.from_ndarray(x[:, i:i + 960], format="s16", layout="mono"); f.sample_rate = 48000; f.pts = i
        for p in st.encode(f): c.mux(p)
    for p in st.encode(None): c.mux(p)
    c.close()


# ---------- STT ----------
def test_load_audio_wav_and_browser_webm(tmp_path):
    (tmp_path / "a.wav").write_bytes(make_wav(2))
    a, d = load_audio(tmp_path / "a.wav", 120, 0.3)
    assert a.dtype == np.float32 and abs(d - 2.0) < 0.05 and abs(a).max() > 0.1 and len(a) == int(d * 16000)
    _webm(tmp_path / "b.webm")
    a, d = load_audio(tmp_path / "b.webm", 120, 0.3)
    assert abs(d - 2.0) < 0.15 and abs(a).max() > 0.1


def test_model_receives_decoded_array_not_a_path(make_client, settings):
    """Passing an array means faster-whisper never calls its own (version-fragile) decode_audio."""
    seen = {}

    class Spy(FakeWhisper):
        def transcribe(self, audio, **kw):
            seen["type"], seen["dtype"], seen["n"] = type(audio), audio.dtype, len(audio)
            return super().transcribe(audio, **kw)

    c, _ = make_client(stt=FasterWhisperSTT(settings, Spy))
    r = c.post(URL, files={"file": ("a.wav", make_wav(2))})
    assert r.status_code == 200
    assert seen["type"] is np.ndarray and seen["dtype"] == np.float32 and abs(seen["n"] - 32000) < 800
    assert abs(r.json()["duration"] - 2.0) < 0.05


def test_inference_crash_is_not_reported_as_bad_audio(make_client, settings):
    class Boom(FakeWhisper):
        def transcribe(self, *a, **k):
            raise TypeError("open() got an unexpected keyword argument 'metadata_errors'")

    c, _ = make_client(stt=FasterWhisperSTT(settings, Boom))
    r = c.post(URL, files={"file": ("a.wav", make_wav(2))})
    assert r.status_code == 500 and r.json()["code"] == "stt_inference_failed"  # was misreported as 422 invalid_audio
    assert "TypeError" in r.json()["detail"]


def test_vad_empty_result_retries_without_vad(make_client, settings):
    calls = []

    class QuietSpeech(FakeWhisper):
        def transcribe(self, audio, **kw):
            calls.append(kw["vad_filter"])
            if kw["vad_filter"]:
                return iter([]), SimpleNamespace(language="en", duration=2.0)
            return super().transcribe(audio, **kw)

    c, _ = make_client(stt=FasterWhisperSTT(settings, QuietSpeech))
    r = c.post(URL, files={"file": ("a.wav", make_wav(2))})
    assert r.status_code == 200 and r.json()["text"] and calls == [True, False]


def test_default_beam_is_fast_greedy():
    assert Settings().stt_beam_size == 1


# ---------- TTS via OpenRouter (default) ----------
def or_tts(handler, **kw):
    s = Settings(openrouter_api_key="or-key", **kw)
    return OpenRouterTTS(s, httpx.AsyncClient(transport=httpx.MockTransport(handler)))


def test_default_tts_provider_is_openrouter_free_fish_model():
    s = Settings()
    assert s.tts_provider == "openrouter" and s.tts_model == "fish-audio/s2.1-pro-free:free"
    assert isinstance(make_tts(s), OpenRouterTTS)
    assert isinstance(make_tts(Settings(tts_provider="fish_audio", fish_api_key="k", openrouter_api_key="")), FishAudioTTS)


async def test_openrouter_tts_request_shape():
    import json
    seen = {}

    def h(req):
        seen.update(url=str(req.url), auth=req.headers["authorization"], body=json.loads(req.read()))
        return httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3)

    out = await or_tts(h).synthesize("Hello there")
    assert seen["url"] == "https://openrouter.ai/api/v1/audio/speech" and seen["auth"] == "Bearer or-key"
    assert seen["body"] == {"model": "fish-audio/s2.1-pro-free:free", "input": "Hello there", "response_format": "mp3"}
    assert out.content_type == "audio/mpeg" and out.model == "fish-audio/s2.1-pro-free:free"


async def test_openrouter_tts_voice_must_be_approved_then_is_sent():
    import json
    bodies = []

    def h(req):
        bodies.append(json.loads(req.read()))
        return httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3)

    with pytest.raises(AppError) as e:
        await or_tts(h).synthesize("hi", "nope")
    assert e.value.code == "voice_not_approved"
    await or_tts(h, fish_allowed_voice_ids="abc123:Calm").synthesize("hi", "abc123")
    assert bodies[0]["voice"] == "abc123"


@pytest.mark.parametrize("status,payload,code", [
    (401, {"error": {"code": 401, "message": "No auth credentials found"}}, "tts_auth_failed"),
    (402, {"error": {"code": 402, "message": "Insufficient credits"}}, "tts_quota_exceeded"),
    (403, {"error": {"code": 403, "message": "Key disabled"}}, "tts_forbidden"),
    (404, {"error": {"code": 404, "message": "No endpoints found"}}, "tts_model_not_found"),
    (502, {"error": {"code": 502, "message": "upstream failed"}}, "tts_unavailable"),
])
async def test_openrouter_tts_errors_include_the_providers_reason(status, payload, code):
    with pytest.raises(AppError) as e:
        await or_tts(lambda r: httpx.Response(status, json=payload)).synthesize("hi")
    assert e.value.code == code
    assert payload["error"]["message"] in e.value.message  # the user can see *why*
    if code == "tts_auth_failed":
        assert "OPENROUTER_API_KEY" in e.value.message


async def test_provider_message_never_leaks_the_key():
    with pytest.raises(AppError) as e:
        await or_tts(lambda r: httpx.Response(401, json={"error": {"message": "bad key or-key"}})).synthesize("hi")
    assert "or-key" not in e.value.message


async def test_missing_openrouter_key_for_tts():
    t = OpenRouterTTS(Settings(openrouter_api_key=""))
    with pytest.raises(AppError) as e:
        await t.synthesize("hi")
    assert e.value.code == "tts_not_configured" and "OPENROUTER_API_KEY" in e.value.message


def test_keys_are_cleaned_of_quotes_and_whitespace():
    s = Settings(openrouter_api_key='  "sk-or-v1-abc"\n', fish_api_key="'k' ")
    assert s.openrouter_api_key == "sk-or-v1-abc" and s.fish_api_key == "k"


def test_synthesize_endpoint_via_openrouter_and_status_labels(make_client):
    from app.deps import Services  # noqa: F401
    tts = or_tts(lambda r: httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3))
    c, svc = make_client(tts=tts)
    b = c.post("/api/v1/chat", json={"message": "How much is the Professional plan?", "conversation_id": "z"}).json()
    r = c.post("/api/v1/speech/synthesize", json={"text": b["answer"], "conversation_id": "z"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/mpeg"
    st = c.get("/api/v1/speech/status").json()
    assert st["tts_model"] == "fish-audio/s2.1-pro-free:free" and "OpenRouter" in st["tts_provider"] and st["tts_available"]
    assert c.get("/api/v1/health").json()["tts_provider"] == "openrouter"


# ---------- misconfigured legacy .env (the "Invalid Token" report) ----------
def test_legacy_fish_setting_with_openrouter_key_is_rerouted_to_openrouter():
    s = Settings(tts_provider="fish_audio", fish_api_key="sk-or-v1-abc", openrouter_api_key="sk-or-v1-abc")
    assert isinstance(make_tts(s), OpenRouterTTS)


def test_legacy_fish_setting_with_no_fish_key_but_openrouter_key_is_rerouted():
    assert isinstance(make_tts(Settings(tts_provider="fish_audio", fish_api_key="", openrouter_api_key="sk-or-v1-abc")), OpenRouterTTS)


def test_real_fish_key_still_uses_native_fish_route():
    s = Settings(tts_provider="fish_audio", fish_api_key="a1b2c3realfishkey", openrouter_api_key="sk-or-v1-abc")
    assert isinstance(make_tts(s), FishAudioTTS)


async def test_auth_hint_when_an_openrouter_key_hits_fish_directly():
    s = Settings(fish_api_key="sk-or-v1-abc")
    t = FishAudioTTS(s, httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(401, json={"message": "Invalid Token", "status": 401}))))
    with pytest.raises(AppError) as e:
        await t.synthesize("hi")
    assert "TTS_PROVIDER=openrouter" in e.value.message and "Invalid Token" in e.value.message


# ---------- "No endpoints found for fish-audio/s2.1-pro-free" (free variant slug) ----------
def _slug_handler(working, calls):
    import json

    def h(req):
        m = json.loads(req.read())["model"]
        calls.append(m)
        if m == working:
            return httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3)
        return httpx.Response(404, json={"error": {"code": 404, "message": f"No endpoints found for {m}."}})
    return h


@pytest.mark.parametrize("configured,working", [
    ("fish-audio/s2.1-pro-free", "fish-audio/s2.1-pro-free:free"),   # user's old .env value, real slug has :free
    ("fish-audio/s2.1-pro-free:free", "fish-audio/s2.1-pro-free"),   # and the reverse
])
async def test_tts_tries_the_free_and_non_free_slug(configured, working):
    calls = []
    t = or_tts(_slug_handler(working, calls), tts_model=configured)
    out = await t.synthesize("hello")
    assert out.model == working and calls[0] == configured and working in calls
    await t.synthesize("again")
    assert calls[-1] == working and len(calls) == 3  # remembered; no more 404 round-trips


async def test_tts_all_slugs_404_gives_actionable_message():
    t = or_tts(_slug_handler("nothing-works", []), tts_model="fish-audio/s2.1-pro-free")
    with pytest.raises(AppError) as e:
        await t.synthesize("hello")
    assert e.value.code == "tts_model_not_found"
    m = e.value.message
    assert "fish-audio/s2.1-pro-free:free" in m and "fish-audio/s2.1-pro-free" in m and "TTS_MODEL=fish-audio/s2.1-pro" in m


async def test_tts_paid_fallback_is_opt_in_only():
    calls = []
    h = _slug_handler("fish-audio/s2.1-pro", calls)
    with pytest.raises(AppError):
        await or_tts(h).synthesize("hi")
    assert "fish-audio/s2.1-pro" not in calls  # never silently spends credits
    out = await or_tts(h, tts_model_fallbacks="fish-audio/s2.1-pro").synthesize("hi")
    assert out.model == "fish-audio/s2.1-pro"


async def test_non_404_errors_do_not_trigger_model_switching():
    calls = []
    def h(req):
        calls.append(1)
        return httpx.Response(402, json={"error": {"message": "Insufficient credits"}})
    with pytest.raises(AppError) as e:
        await or_tts(h).synthesize("hi")
    assert e.value.code == "tts_quota_exceeded" and len(calls) == 1
