import httpx
import pytest

from app.config import Settings
from app.errors import AppError
from tests.conftest import tts_with

MP3 = b"ID3" + b"\x00" * 64


async def run(handler, text="Hello", voice=None, **kw):
    return await tts_with(handler, **kw).synthesize(text, voice)


async def test_request_construction():
    seen = {}

    def h(req: httpx.Request):
        seen.update(url=str(req.url), headers=req.headers, body=req.read())
        return httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3)

    audio = await run(h, "Hello there", fish_allowed_voice_ids="abc123:Calm", ) if False else await tts_with(h, fish_allowed_voice_ids="abc123:Calm").synthesize("Hello there", "abc123")
    import json
    assert seen["url"] == "https://api.fish.audio/v1/tts"
    assert seen["headers"]["authorization"] == "Bearer test-key"
    assert seen["headers"]["model"] == "s2.1-pro-free"
    assert json.loads(seen["body"]) == {"text": "Hello there", "format": "mp3", "reference_id": "abc123"}
    assert audio.content_type == "audio/mpeg" and audio.content == MP3


async def test_default_voice_omits_reference_id():
    import json
    bodies = []
    def h(req):
        bodies.append(json.loads(req.read()))
        return httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=MP3)
    await run(h)
    assert "reference_id" not in bodies[0]


async def test_unapproved_voice_rejected():
    with pytest.raises(AppError) as e:
        await run(lambda r: httpx.Response(200), voice="evil")
    assert e.value.code == "voice_not_approved"


async def test_missing_key():
    t = tts_with(lambda r: httpx.Response(200))
    t.s = Settings(fish_api_key="")
    with pytest.raises(AppError) as e:
        await t.synthesize("hi")
    assert e.value.status_code == 503 and e.value.code == "tts_not_configured"


@pytest.mark.parametrize("resp,status,code", [
    (httpx.Response(429, headers={"retry-after": "7"}), 429, "tts_rate_limited"),
    (httpx.Response(401), 502, "tts_auth_failed"),
    (httpx.Response(402), 503, "tts_quota_exceeded"),
    (httpx.Response(422), 502, "tts_invalid_request"),
    (httpx.Response(503), 503, "tts_unavailable"),
    (httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=b""), 502, "tts_empty_audio"),
    (httpx.Response(200, headers={"content-type": "application/json"}, content=b"{}"), 502, "tts_unexpected_content_type"),
    (httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=b"<html>nope</html>"), 502, "tts_invalid_audio"),
])
async def test_provider_errors(resp, status, code):
    with pytest.raises(AppError) as e:
        await run(lambda r: resp)
    assert (e.value.status_code, e.value.code) == (status, code)


async def test_rate_limit_passes_retry_after():
    with pytest.raises(AppError) as e:
        await run(lambda r: httpx.Response(429, headers={"retry-after": "7"}))
    assert e.value.headers["Retry-After"] == "7"


async def test_timeout_and_connection_error():
    def timeout(req):
        raise httpx.ReadTimeout("slow")
    def down(req):
        raise httpx.ConnectError("down")
    with pytest.raises(AppError) as e:
        await run(timeout)
    assert e.value.status_code == 504 and e.value.code == "tts_timeout"
    with pytest.raises(AppError) as e:
        await run(down)
    assert e.value.code == "tts_unavailable"


async def test_api_key_never_in_error_messages():
    with pytest.raises(AppError) as e:
        await run(lambda r: httpx.Response(401, text="bad key test-key"))
    assert "test-key" not in e.value.message
