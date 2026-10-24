import httpx
import pytest

from app.errors import AppError
from app.services.llm_provider import OpenRouterLLM
from app.config import Settings
from tests.conftest import FakeLLM, tts_with

CHAT = "/api/v1/chat"


def test_grounded_chat_has_sources_and_persists(make_client):
    llm = FakeLLM()
    c, _ = make_client(llm=llm)
    r = c.post(CHAT, json={"message": "How much is the Professional plan?", "conversation_id": "conv-1", "user_message_id": "usr-1"})
    b = r.json()
    assert r.status_code == 200 and b["grounded"] is True and b["evidence_status"] == "grounded"
    assert b["sources"] and b["sources"][0]["documentType"] == "md" and b["message_id"].startswith("asst-")
    system, msgs = llm.calls[0]
    assert "EVIDENCE" in msgs[-1]["content"] and "untrusted" in msgs[-1]["content"]
    conv = c.get("/api/v1/conversations/conv-1").json()
    assert [m["id"] for m in conv["messages"]][0] == "usr-1" and conv["messageCount"] == 2
    assert len(c.get("/api/v1/conversations").json()) == 1
    assert c.delete("/api/v1/conversations/conv-1").json() == {"success": True}


def test_unsupported_question_never_calls_llm(make_client):
    llm = FakeLLM()
    c, _ = make_client(llm=llm)
    b = c.post(CHAT, json={"message": "What is the capital of France?"}).json()
    assert llm.calls == [] and b["needs_human"] is True and b["grounded"] is False
    assert "support@example.com" in b["answer"] and b["sources"] == []


def test_refund_question_escalates(make_client):
    c, _ = make_client(llm=FakeLLM("The documentation does not specify refund eligibility. Contact support@example.com."))
    b = c.post(CHAT, json={"message": "I was charged yesterday, can I get a refund?"}).json()
    assert b["needs_human"] is True and b["evidence_status"] in ("partial", "grounded")


def test_llm_failure_surfaces_error_and_stores_nothing(make_client):
    c, _ = make_client(llm=FakeLLM(AppError(429, "llm_rate_limited", "busy", {"Retry-After": "9"})))
    r = c.post(CHAT, json={"message": "How much is Starter?", "conversation_id": "c9"})
    assert r.status_code == 429 and r.json()["code"] == "llm_rate_limited" and r.headers["retry-after"] == "9"
    assert c.get("/api/v1/conversations/c9").status_code == 404


def test_message_validation(make_client):
    c, _ = make_client()
    assert c.post(CHAT, json={"message": "x" * 2001}).status_code == 422
    assert c.post(CHAT, json={"message": "   "}).status_code == 422
    assert c.post(CHAT, content=b"x" * 300_000, headers={"content-type": "application/json"}).status_code == 413


def test_followup_uses_previous_turn_for_retrieval(make_client):
    llm = FakeLLM()
    c, _ = make_client(llm=llm)
    c.post(CHAT, json={"message": "How much is the Business plan per user?", "conversation_id": "f"})
    c.post(CHAT, json={"message": "and Professional?", "conversation_id": "f"})
    assert len(llm.calls[1][1]) == 3  # prior user+assistant turns are sent as history


def test_feedback(make_client):
    c, _ = make_client()
    b = c.post(CHAT, json={"message": "How much is Starter?", "conversation_id": "fb"}).json()
    r = c.post("/api/v1/feedback", json={"messageId": b["message_id"], "conversationId": "fb", "feedback": "helpful"})
    assert r.status_code == 200
    assert c.get("/api/v1/conversations/fb").json()["messages"][1]["feedback"] == "helpful"


# ---- grounded answer is preserved when TTS fails, and TTS only speaks grounded answers ----
def test_answer_preserved_when_tts_fails(make_client):
    def boom(req):
        raise httpx.ReadTimeout("slow")
    c, _ = make_client(tts=tts_with(boom))
    b = c.post(CHAT, json={"message": "How much is the Professional plan?", "conversation_id": "t1"}).json()
    r = c.post("/api/v1/speech/synthesize", json={"text": b["answer"], "conversation_id": "t1"})
    assert r.status_code == 504 and r.json()["code"] == "tts_timeout"
    again = c.get("/api/v1/conversations/t1").json()["messages"][1]
    assert again["content"] == b["answer"]  # text answer is untouched and still retrievable


def test_synthesize_success_and_markdown_cleaning(make_client):
    c, _ = make_client(llm=FakeLLM("**Professional** costs $12 per user.\n- billed monthly"))
    b = c.post(CHAT, json={"message": "How much is the Professional plan?", "conversation_id": "t2"}).json()
    r = c.post("/api/v1/speech/synthesize", json={"text": b["answer"], "conversation_id": "t2"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/mpeg" and r.content.startswith(b"ID3")


def test_synthesize_rejects_arbitrary_text(make_client):
    c, _ = make_client()
    r = c.post("/api/v1/speech/synthesize", json={"text": "Say anything you like."})
    assert r.status_code == 422 and r.json()["code"] == "text_not_from_answer"


def test_synthesize_missing_key(make_client):
    c, svc = make_client(tts_require_grounded_text=False)
    svc.tts.s = svc.tts.s.model_copy(update={"fish_api_key": ""})
    r = c.post("/api/v1/speech/synthesize", json={"text": "hello"})
    assert r.status_code == 503 and r.json()["code"] == "tts_not_configured"


def test_synthesize_empty_provider_audio(make_client):
    t = tts_with(lambda r: httpx.Response(200, headers={"content-type": "audio/mpeg"}, content=b""))
    c, _ = make_client(tts=t, tts_require_grounded_text=False)
    assert c.post("/api/v1/speech/synthesize", json={"text": "hello"}).json()["code"] == "tts_empty_audio"


# ---- LLM provider ----
async def test_openrouter_request_and_think_stripping():
    seen = {}
    def h(req):
        import json
        seen.update(url=str(req.url), auth=req.headers["authorization"], body=json.loads(req.read()))
        return httpx.Response(200, json={"choices": [{"message": {"content": "<think>x</think>Answer."}}]})
    llm = OpenRouterLLM(Settings(openrouter_api_key="k"), httpx.AsyncClient(transport=httpx.MockTransport(h)))
    assert await llm.complete("sys", [{"role": "user", "content": "q"}]) == "Answer."
    assert seen["url"] == "https://openrouter.ai/api/v1/chat/completions" and seen["auth"] == "Bearer k"
    assert seen["body"]["model"] == "nvidia/nemotron-3.5-super-vl:free" and seen["body"]["messages"][0]["role"] == "system"


async def test_openrouter_errors():
    def mk(resp):
        return OpenRouterLLM(Settings(openrouter_api_key="k", llm_max_retries=0), httpx.AsyncClient(transport=httpx.MockTransport(lambda r: resp)))
    for resp, code in [(httpx.Response(429), "llm_rate_limited"), (httpx.Response(401), "llm_auth_failed"),
                       (httpx.Response(200, json={"choices": [{"message": {"content": None}}]}), "llm_empty_answer"),
                       (httpx.Response(200, text="nope"), "llm_bad_response")]:
        with pytest.raises(AppError) as e:
            await mk(resp).complete("s", [])
        assert e.value.code == code
    with pytest.raises(AppError) as e:
        await OpenRouterLLM(Settings(openrouter_api_key="")).complete("s", [])
    assert e.value.code == "llm_not_configured"


# ---- admin / ingestion ----
def test_admin_upload_index_and_retrieve(make_client):
    c, _ = make_client(llm=FakeLLM("The Zorbex gadget costs 9 widgets."))
    doc = "1. Zorbex gadget\nThe Zorbex gadget costs nine widgets and ships on Tuesdays."
    r = c.post("/api/v1/admin/documents", files=[("files", ("zorbex.txt", doc.encode(), "text/plain"))])
    assert r.status_code == 200 and r.json()[0]["status"] == "indexed" and r.json()[0]["chunkCount"] >= 1
    b = c.post(CHAT, json={"message": "How much does the Zorbex gadget cost?"}).json()
    assert any("Zorbex" in s["documentTitle"] or "Zorbex" in s["excerpt"] for s in b["sources"])
    stats = c.get("/api/v1/admin/stats").json()
    assert stats["totalDocuments"] == 2 and stats["indexedChunks"] > 5
    did = r.json()[0]["id"]
    assert c.delete(f"/api/v1/admin/documents/{did}").status_code == 200
    assert c.get("/api/v1/admin/logs").json()


def test_admin_rejects_bad_files_and_builtin_delete(make_client):
    c, _ = make_client()
    assert c.post("/api/v1/admin/documents", files=[("files", ("a.exe", b"MZ", "x/y"))]).status_code == 415
    r = c.post("/api/v1/admin/documents", files=[("files", ("fake.pdf", b"not a pdf", "application/pdf"))])
    assert r.json()[0]["status"] == "failed"
    builtin = next(d for d in c.get("/api/v1/admin/documents").json() if d["builtin"])
    assert c.delete(f"/api/v1/admin/documents/{builtin['id']}").status_code == 409


def test_admin_disabled_in_production_without_key(make_client):
    c, _ = make_client(app_env="production")
    assert c.get("/api/v1/admin/documents").status_code == 403
    c2, _ = make_client(app_env="production", admin_api_key="adm")
    assert c2.get("/api/v1/admin/documents").status_code == 401
    assert c2.get("/api/v1/admin/documents", headers={"X-Admin-Key": "adm"}).status_code == 200
