"""Central, environment-driven configuration (see .env.example)."""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    api_access_key: str = ""
    admin_api_key: str = ""
    data_dir: Path = BACKEND_DIR / "data"
    support_email: str = "support@example.com"
    max_message_chars: int = 2000

    # LLM: OpenRouter -> NVIDIA Nemotron 3.5 Super VL (free)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "nvidia/nemotron-3.5-super-vl:free"
    llm_timeout_seconds: float = 90.0
    llm_max_tokens: int = 1500
    llm_temperature: float = 0.2
    llm_reasoning_effort: str = ""
    llm_max_retries: int = 1
    llm_http_referer: str = "http://localhost:3000"
    llm_app_title: str = "Northstar Customer Support"

    # RAG
    rag_top_k: int = 4
    rag_chunk_chars: int = 1800
    rag_history_turns: int = 6

    # STT: local Faster-Whisper
    stt_provider: str = "faster_whisper_local"
    stt_model: str = "base.en"
    stt_device: str = "cpu"
    stt_compute_type: str = "int8"
    stt_language: str = "en"
    # Vocabulary hint: helps Whisper spell product words correctly. Empty string disables it.
    stt_initial_prompt: str = (
        "Northstar Workspace customer support. Plans: Starter, Professional, Business. "
        "Add-ons: Automate, Advanced Insights. Billing, refund, cancellation, invoice, SSO."
    )
    stt_beam_size: int = 1  # greedy decoding: much faster on CPU; raise to 5 for slightly better accuracy
    stt_vad_filter: bool = True
    stt_cpu_threads: int = 0
    stt_download_root: str = ""
    stt_local_files_only: bool = False
    stt_preload: bool = True
    stt_max_upload_bytes: int = 10 * 1024 * 1024
    stt_max_duration_seconds: float = 120.0
    stt_min_duration_seconds: float = 0.3
    stt_max_concurrency: int = 1
    stt_max_queue: int = 4
    stt_timeout_seconds: float = 90.0
    stt_load_retry_cooldown_seconds: float = 30.0

    # TTS: "openrouter" (default; uses OPENROUTER_API_KEY) or "fish_audio" (native Fish API + FISH_API_KEY)
    tts_provider: str = "openrouter"
    tts_model: str = "fish-audio/s2.1-pro-free:free"  # OpenRouter slug of the free variant
    tts_model_fallbacks: str = ""  # extra slugs to try on "No endpoints found", e.g. paid "fish-audio/s2.1-pro"
    tts_default_voice_id: str = ""
    fish_api_key: str = ""
    fish_api_base: str = "https://api.fish.audio"
    fish_tts_model: str = "s2.1-pro-free"
    fish_tts_format: str = "mp3"
    fish_tts_timeout_seconds: float = 60.0
    fish_allowed_voice_ids: str = ""
    tts_max_chars: int = 4000
    tts_require_grounded_text: bool = True

    @field_validator("openrouter_api_key", "fish_api_key", "api_access_key", "admin_api_key", mode="before")
    @classmethod
    def _clean_secret(cls, v):
        # tolerate stray spaces/newlines/quotes copied along with a key
        return v.strip().strip("\"'").strip() if isinstance(v, str) else v

    @property
    def tts_model_name(self) -> str:
        return self.fish_tts_model if self.tts_provider == "fish_audio" else self.tts_model

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def approved_voices(self) -> list[dict[str, str]]:
        out = []
        for item in self.fish_allowed_voice_ids.split(","):
            vid, _, label = item.strip().partition(":")
            if vid.strip():
                out.append({"id": vid.strip(), "label": (label or vid).strip()})
        return out

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
