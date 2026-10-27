"""TTS clients. Two interchangeable routes to the same Fish Audio S2.1 Pro (Free) voice model:

* OpenRouterTTS  (default, TTS_PROVIDER=openrouter) — POST {OPENROUTER_BASE_URL}/audio/speech
    Bearer OPENROUTER_API_KEY, body {model:"fish-audio/s2.1-pro-free", input, voice?, response_format:"mp3"}
* FishAudioTTS   (TTS_PROVIDER=fish_audio) — POST https://api.fish.audio/v1/tts
    Bearer FISH_API_KEY (a *Fish Audio* key, not an OpenRouter key), `model` header, body {text, format, reference_id?}

Both return raw audio bytes. Verified against the OpenRouter model guide and docs.fish.audio (Oct 2026)."""
import logging
from dataclasses import dataclass

import httpx

from app.config import Settings
from app.errors import AppError

log = logging.getLogger("northstar.tts")

_MIME = {"mp3": "audio/mpeg", "wav": "audio/wav", "opus": "audio/ogg"}


def _looks_like_audio(fmt: str, data: bytes) -> bool:
    if fmt == "mp3":
        return data[:3] == b"ID3" or (len(data) > 1 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0)
    if fmt == "wav":
        return data[:4] == b"RIFF"
    if fmt == "opus":
        return data[:4] == b"OggS"
    return True


def _provider_message(resp: httpx.Response, secrets: list[str]) -> str:
    """Extract the provider's own explanation ({"error":{"message"}} or {"message"}), scrubbed and short."""
    try:
        body = resp.json()
        err = body.get("error") if isinstance(body, dict) else None
        msg = (err.get("message") if isinstance(err, dict) else err) or (body.get("message") if isinstance(body, dict) else "")
    except ValueError:
        msg = ""
    msg = str(msg or "").replace("\n", " ")[:160]
    for sec in secrets:
        if sec:
            msg = msg.replace(sec, "***")
    return msg


@dataclass
class AudioResult:
    content: bytes
    content_type: str
    model: str


class _BaseTTS:
    label = "TTS"
    key_env = "API_KEY"
    fmt = "mp3"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.s = settings
        self._client = client

    # subclasses provide these
    api_key = property(lambda self: "")
    model = property(lambda self: "")

    def build_request(self, text: str, voice_id: str | None) -> tuple[str, dict[str, str], dict]:
        raise NotImplementedError

    @property
    def configured(self) -> bool:
        return bool(self.api_key.strip())

    def resolve_voice(self, voice_id: str | None) -> str | None:
        if not voice_id:
            return getattr(self.s, "tts_default_voice_id", "") or None
        if voice_id not in {v["id"] for v in self.s.approved_voices}:
            raise AppError(422, "voice_not_approved", "That voice is not in the approved voice list.")
        return voice_id

    async def synthesize(self, text: str, voice_id: str | None = None) -> AudioResult:
        if not self.configured:
            raise AppError(503, "tts_not_configured", f"Text-to-speech is not configured ({self.key_env} is missing).")
        if self.fmt not in _MIME:
            raise AppError(500, "tts_bad_config", f"Unsupported audio format '{self.fmt}'. Use mp3, wav or opus.")
        url, headers, body = self.build_request(text, self.resolve_voice(voice_id))
        client = self._client or httpx.AsyncClient()
        try:
            resp = await client.post(url, headers=headers, json=body, timeout=self.s.fish_tts_timeout_seconds)
        except httpx.TimeoutException as exc:
            raise AppError(504, "tts_timeout", "The speech provider timed out.") from exc
        except httpx.HTTPError as exc:
            raise AppError(503, "tts_unavailable", "The speech provider is unreachable.") from exc
        finally:
            if self._client is None:
                await client.aclose()

        sc = resp.status_code
        detail = _provider_message(resp, [self.api_key])
        why = f" Provider said: {detail}" if detail else ""
        if sc != 200:
            log.warning("TTS provider returned %s %s", sc, detail)
        if sc == 401:
            raise AppError(502, "tts_auth_failed", f"The speech provider rejected the API key. Check {self.key_env} in backend/.env.{why}")
        if sc == 402:
            raise AppError(503, "tts_quota_exceeded", f"The speech provider account has no remaining credit.{why}")
        if sc == 403:
            raise AppError(502, "tts_forbidden", f"The speech provider refused access (spend limit, disabled key, or blocked).{why}")
        if sc == 404:
            raise AppError(502, "tts_model_not_found", f"The TTS model or voice was not found. Check the model/voice settings.{why}")
        if sc == 429:
            raise AppError(429, "tts_rate_limited", "The speech provider is rate limiting requests.", {"Retry-After": resp.headers.get("retry-after", "10")})
        if sc in (400, 422):
            raise AppError(502, "tts_invalid_request", f"The speech provider rejected the request.{why}")
        if sc >= 500:
            raise AppError(503, "tts_unavailable", f"The speech provider is temporarily unavailable.{why}")
        if sc != 200:
            raise AppError(502, "tts_unexpected_status", f"Unexpected speech provider status {sc}.{why}")

        ctype = resp.headers.get("content-type", "").split(";")[0].strip().lower()
        if ctype and not (ctype.startswith("audio/") or ctype == "application/octet-stream"):
            raise AppError(502, "tts_unexpected_content_type", "The speech provider returned a non-audio response.")
        data = resp.content
        if not data:
            raise AppError(502, "tts_empty_audio", "The speech provider returned empty audio.")
        if not _looks_like_audio(self.fmt, data):
            raise AppError(502, "tts_invalid_audio", "The speech provider returned invalid audio data.")
        return AudioResult(data, _MIME[self.fmt], self.model)


class OpenRouterTTS(_BaseTTS):
    key_env = "OPENROUTER_API_KEY"
    fmt = "mp3"  # OpenRouter speech supports mp3 | pcm

    api_key = property(lambda self: self.s.openrouter_api_key)
    model = property(lambda self: self.s.tts_model)
    label = property(lambda self: f"OpenRouter / {self.s.tts_model}")

    def build_request(self, text, voice_id):
        body: dict = {"model": self.s.tts_model, "input": text, "response_format": "mp3"}
        if voice_id:
            body["voice"] = voice_id
        headers = {
            "Authorization": f"Bearer {self.s.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.s.llm_http_referer,
            "X-Title": self.s.llm_app_title,
        }
        return f"{self.s.openrouter_base_url.rstrip('/')}/audio/speech", headers, body


class FishAudioTTS(_BaseTTS):
    key_env = "FISH_API_KEY"

    api_key = property(lambda self: self.s.fish_api_key)
    model = property(lambda self: self.s.fish_tts_model)
    label = property(lambda self: f"Fish Audio / {self.s.fish_tts_model}")
    fmt = property(lambda self: self.s.fish_tts_format)

    def build_request(self, text, voice_id):
        body: dict = {"text": text, "format": self.s.fish_tts_format}
        if voice_id:
            body["reference_id"] = voice_id
        headers = {
            "Authorization": f"Bearer {self.s.fish_api_key}",
            "model": self.s.fish_tts_model,
            "Content-Type": "application/json",
        }
        return f"{self.s.fish_api_base.rstrip('/')}/v1/tts", headers, body


def make_tts(settings: Settings, client: httpx.AsyncClient | None = None):
    return (FishAudioTTS if settings.tts_provider == "fish_audio" else OpenRouterTTS)(settings, client)
