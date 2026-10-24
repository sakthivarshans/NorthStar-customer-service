from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.deps import require_admin, svc
from app.errors import AppError
from app.schemas import AdminDocument, IngestionLog, KnowledgeStats
from app.services.documents import MAX_DOC_BYTES
from app.services.store import now

router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


def _visible(kb):
    return sorted((d for d in kb.docs.values() if d["status"] != "deleted"), key=lambda d: d["uploadedAt"], reverse=True)


@router.get("/documents", response_model=list[AdminDocument])
async def documents(request: Request):
    return _visible(svc(request).kb)


@router.get("/documents/{doc_id}", response_model=AdminDocument)
async def document(doc_id: str, request: Request):
    d = svc(request).kb.docs.get(doc_id)
    if not d:
        raise AppError(404, "not_found", "Document not found.")
    return d


@router.post("/documents", response_model=list[AdminDocument])
async def upload(request: Request, files: list[UploadFile] = File(...)):
    kb, out = svc(request).kb, []
    for f in files:
        data = await f.read(MAX_DOC_BYTES + 1)
        out.append(kb.add_upload(f.filename or "upload", data))
    return out


@router.post("/documents/{doc_id}/reindex", response_model=AdminDocument)
async def reindex(doc_id: str, request: Request):
    return svc(request).kb.reindex(doc_id)


@router.delete("/documents/{doc_id}")
async def delete(doc_id: str, request: Request):
    svc(request).kb.delete(doc_id)
    return {"success": True}


@router.get("/stats", response_model=KnowledgeStats)
async def stats(request: Request):
    kb = svc(request).kb
    docs = _visible(kb)
    chunks = sum(d["chunkCount"] for d in docs if d["status"] == "indexed")
    failed = any(d["status"] == "failed" for d in docs)
    return KnowledgeStats(totalDocuments=len(docs), indexedChunks=chunks,
                          lastIndexedTime=max((d.get("lastIndexedAt") or d["uploadedAt"] for d in docs), default=now()),
                          systemStatus="degraded" if failed else "healthy",
                          vectorIndexSizeMb=round(sum(len(c.text) for cs in kb.chunks.values() for c in cs) / 1048576, 3),
                          averageRetrievalLatencyMs=kb.last_latency_ms)


@router.get("/logs", response_model=list[IngestionLog])
async def logs(request: Request):
    return svc(request).kb.logs
