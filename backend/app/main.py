import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.deps import Services
from app.errors import install_error_handlers
from app.middleware import BodySizeLimitMiddleware
from app.routers import admin, chat, speech
from app.services.documents import KnowledgeBase
from app.services.llm_provider import OpenRouterLLM
from app.services.store import ConversationStore
from app.services.stt_provider import FasterWhisperSTT
from app.services.tts_provider import FishAudioTTS

VERSION = "1.0.0"


def build_services(settings: Settings, **overrides) -> Services:
    client = httpx.AsyncClient()
    return Services(
        settings=settings,
        kb=overrides.get("kb") or KnowledgeBase(settings.data_dir, settings.rag_chunk_chars),
        store=overrides.get("store") or ConversationStore(settings.data_dir / "conversations.db"),
        llm=overrides.get("llm") or OpenRouterLLM(settings, client),
        stt=overrides.get("stt") or FasterWhisperSTT(settings),
        tts=overrides.get("tts") or FishAudioTTS(settings, client),
    )


def create_app(settings: Settings | None = None, services: Services | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if not hasattr(app.state, "services"):
            app.state.services = build_services(settings)
        if settings.stt_preload:
            app.state.preload = asyncio.create_task(app.state.services.stt.preload())  # never blocks startup
        yield

    app = FastAPI(title="Northstar Support API", version=VERSION, lifespan=lifespan)
    if services is not None:
        app.state.services = services
    stt_limit = settings.stt_max_upload_bytes + 128 * 1024
    app.add_middleware(BodySizeLimitMiddleware, limit_for=lambda p: stt_limit if p.endswith("/speech/transcribe") else (20 * 1024 * 1024 if "/admin/documents" in p else 256 * 1024))
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_methods=["*"],
                       allow_headers=["*"], expose_headers=["Retry-After", "X-TTS-Model"])
    install_error_handlers(app)

    @app.get("/api/v1/health")
    async def health():
        s = app.state.services
        llm_ok = s.llm.configured
        return {"status": "healthy" if llm_ok else "degraded", "version": VERSION, "llm_model": settings.llm_model,
                "llm_configured": llm_ok, "stt_state": s.stt.state, "stt_model": settings.stt_model,
                "stt_ready": s.stt.ready, "tts_configured": s.tts.configured, "tts_model": settings.fish_tts_model,
                "documents_indexed": len([d for d in s.kb.docs.values() if d["status"] == "indexed"])}

    for r in (chat.router, speech.router, admin.router):
        app.include_router(r, prefix="/api/v1")
    return app


app = create_app()
