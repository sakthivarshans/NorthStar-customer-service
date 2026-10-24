import secrets
from dataclasses import dataclass

from fastapi import Request

from app.config import Settings
from app.errors import AppError
from app.services.documents import KnowledgeBase
from app.services.store import ConversationStore


@dataclass
class Services:
    settings: Settings
    kb: KnowledgeBase
    store: ConversationStore
    llm: object
    stt: object
    tts: object


def svc(request: Request) -> Services:
    return request.app.state.services


def _eq(a: str, b: str) -> bool:
    return secrets.compare_digest(a.encode(), b.encode())


async def require_access(request: Request) -> None:
    key = svc(request).settings.api_access_key
    if key and not _eq(request.headers.get("x-api-key", ""), key):
        raise AppError(401, "unauthorized", "Missing or invalid API key.")


async def require_admin(request: Request) -> None:
    s = svc(request).settings
    if s.admin_api_key:
        if not _eq(request.headers.get("x-admin-key", request.headers.get("x-api-key", "")), s.admin_api_key):
            raise AppError(401, "unauthorized", "Admin access requires a valid admin key.")
    elif s.is_production:
        raise AppError(403, "admin_disabled", "Admin routes are disabled: set ADMIN_API_KEY.")
    await require_access(request)
