"""OpenRouter chat-completions client for NVIDIA Nemotron 3.5 Super VL (free)."""
import asyncio
import logging
import re

import httpx

from app.config import Settings
from app.errors import AppError

log = logging.getLogger("northstar.llm")


class OpenRouterLLM:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self.s = settings
        self._client = client

    @property
    def configured(self) -> bool:
        return bool(self.s.openrouter_api_key.strip())

    async def complete(self, system: str, messages: list[dict[str, str]]) -> str:
        if not self.configured:
            raise AppError(503, "llm_not_configured", "The language model is not configured (OPENROUTER_API_KEY is missing).")
        payload: dict = {
            "model": self.s.llm_model,
            "messages": [{"role": "system", "content": system}, *messages],
            "max_tokens": self.s.llm_max_tokens,
            "temperature": self.s.llm_temperature,
        }
        if self.s.llm_reasoning_effort:
            payload["reasoning"] = {"effort": self.s.llm_reasoning_effort}
        headers = {
            "Authorization": f"Bearer {self.s.openrouter_api_key}",
            "HTTP-Referer": self.s.llm_http_referer,
            "X-Title": self.s.llm_app_title,
        }
        url = f"{self.s.openrouter_base_url.rstrip('/')}/chat/completions"
        client = self._client or httpx.AsyncClient()
        try:
            for attempt in range(self.s.llm_max_retries + 1):
                try:
                    r = await client.post(url, json=payload, headers=headers, timeout=self.s.llm_timeout_seconds)
                except httpx.TimeoutException as exc:
                    raise AppError(504, "llm_timeout", "The language model timed out. Please retry.") from exc
                except httpx.HTTPError as exc:
                    raise AppError(503, "llm_unavailable", "The language model service is unreachable.") from exc
                if r.status_code in (429, 502, 503) and attempt < self.s.llm_max_retries:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                break
        finally:
            if self._client is None:
                await client.aclose()
        if r.status_code in (401, 403):
            raise AppError(502, "llm_auth_failed", "The language model rejected the server credentials.")
        if r.status_code == 429:
            raise AppError(429, "llm_rate_limited", "The free model is rate limited right now. Please retry in a moment.", {"Retry-After": r.headers.get("retry-after", "20")})
        if r.status_code >= 400:
            raise AppError(502, "llm_error", f"The language model returned an error ({r.status_code}).")
        try:
            data = r.json()
            text = data["choices"][0]["message"].get("content") or ""
        except (ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
            raise AppError(502, "llm_bad_response", "The language model returned an unreadable response.") from exc
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
        if not text:
            raise AppError(502, "llm_empty_answer", "The language model returned no answer (it may have run out of tokens while reasoning). Please retry.")
        return text
