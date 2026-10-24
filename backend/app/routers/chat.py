from fastapi import APIRouter, Depends, Request

from app.deps import require_access, svc
from app.errors import AppError
from app.schemas import ChatRequest, ChatResponse, ConversationOut, FeedbackRequest
from app.services.chat_service import answer_question
from app.services.store import new_id, now

router = APIRouter(dependencies=[Depends(require_access)])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    s = svc(request)
    message = req.message.strip()
    if not message:
        raise AppError(422, "empty_message", "Message cannot be empty.")
    if len(message) > s.settings.max_message_chars:
        raise AppError(422, "message_too_long", f"Message exceeds {s.settings.max_message_chars} characters.")
    conv_id = req.conversation_id or new_id("conv")
    history = s.store.recent(conv_id, s.settings.rag_history_turns)

    result = await answer_question(s.settings, s.kb, s.llm, message, history)

    mid = new_id("asst")
    user = {"id": req.user_message_id or new_id("usr"), "role": "user", "content": message, "timestamp": now()}
    assistant = {"id": mid, "role": "assistant", "content": result["answer"], "timestamp": now(),
                 "sources": [c.model_dump() for c in result["sources"]], "grounded": result["grounded"],
                 "groundingStatus": result["evidence_status"], "needsHuman": result["needs_human"]}
    s.store.append_exchange(conv_id, message[:40] + ("..." if len(message) > 40 else ""), user, assistant)
    return ChatResponse(answer=result["answer"], conversation_id=conv_id, message_id=mid, sources=result["sources"],
                        grounded=result["grounded"], needs_human=result["needs_human"], evidence_status=result["evidence_status"])


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(request: Request):
    return svc(request).store.list()


@router.get("/conversations/{conv_id}", response_model=ConversationOut)
async def get_conversation(conv_id: str, request: Request):
    conv = svc(request).store.get(conv_id)
    if not conv:
        raise AppError(404, "not_found", "Conversation not found.")
    return conv


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, request: Request):
    return {"success": svc(request).store.delete(conv_id)}


@router.post("/feedback")
async def feedback(req: FeedbackRequest, request: Request):
    ok = svc(request).store.set_feedback(req.conversationId, req.messageId, req.feedback)
    if not ok:
        raise AppError(404, "not_found", "Message not found.")
    return {"success": True}
