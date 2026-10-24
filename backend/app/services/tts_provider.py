"""Fish Audio TTS client. Verified against docs.fish.audio (Oct 2026):
POST {base}/v1/tts, `Authorization: Bearer <key>`, `model` header (s2.1-pro / s2.1-pro-free),
JSON body {text, format, reference_id?}; response is raw audio bytes."""
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


@dataclass
class AudioResult:
    content: bytes
    content_type: str
    model: str


class FishAudioTTS:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.s = settings
        self._client = client

    @property
    def configured(self) -> bool:
        return bool(self.s.fish_api_key.strip())

    def build_request(self, text: str, voice_id: str | None) -> tuple[str, dict[str, str], dict]:
        body: dict = {"text": text, "format": self.s.fish_tts_format}
        if voice_id:
            body["reference_id"] = voice_id
        headers = {
            "Authorization": f"Bearer {self.s.fish_api_key}",
            "model": self.s.fish_tts_model,
            "Content-Type": "application/json",
        }
        return f"{self.s.fish_api_base.rstrip('/')}/v1/tts", headers, body

    def resolve_voice(self, voice_id: str | None) -> str | None:
        if not voice_id:
            return None
        if voice_id not in {v["id"] for v in self.s.approved_voices}:
            raise AppError(422, "voice_not_approved", "That voice is not in the approved voice list.")
        return voice_id

    async def synthesize(self, text: str, voice_id: str | None = None) -> AudioResult:
        if not self.configured:
            raise AppError(503, "tts_not_configured", "Text-to-speech is not configured (FISH_API_KEY is missing).")
        fmt = self.s.fish_tts_format
        if fmt not in _MIME:
            raise AppError(500, "tts_bad_config", f"Unsupported FISH_TTS_FORMAT '{fmt}'. Use mp3, wav or opus.")
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
        if sc in (401, 403):
            raise AppError(502, "tts_auth_failed", "The speech provider rejected the server credentials.")
        if sc == 402:
            raise AppError(503, "tts_quota_exceeded", "The speech provider account has no remaining credit or quota.")
        if sc == 429:
            retry = resp.headers.get("retry-after", "10")
            raise AppError(429, "tts_rate_limited", "The speech provider is rate limiting requests.", {"Retry-After": retry})
        if sc in (400, 422):
            raise AppError(502, "tts_invalid_request", "The speech provider rejected the request.")
        if sc >= 500:
            raise AppError(503, "tts_unavailable", "The speech provider is temporarily unavailable.")
        if sc != 200:
            raise AppError(502, "tts_unexpected_status", f"Unexpected speech provider status {sc}.")

        ctype = resp.headers.get("content-type", "").split(";")[0].strip().lower()
        if ctype and not (ctype.startswith("audio/") or ctype == "application/octet-stream"):
            raise AppError(502, "tts_unexpected_content_type", "The speech provider returned a non-audio response.")
        data = resp.content
        if not data:
            raise AppError(502, "tts_empty_audio", "The speech provider returned empty audio.")
        if not _looks_like_audio(fmt, data):
            raise AppError(502, "tts_invalid_audio", "The speech provider returned invalid audio data.")
        return AudioResult(data, _MIME[fmt], self.s.fish_tts_model)
