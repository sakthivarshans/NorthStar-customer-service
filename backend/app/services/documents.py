"""Knowledge-base documents: ingestion, persistence of metadata, index rebuild, ingestion logs."""
import io
import json
import threading
import time
import uuid
from pathlib import Path

from app.errors import AppError
from app.services.rag import BM25Index, Chunk, chunk_document
from app.services.store import now

ALLOWED = {"txt", "md", "pdf", "docx"}
MAX_DOC_BYTES = 15 * 1024 * 1024


def extract_text(data: bytes, ftype: str) -> str:
    if ftype in ("txt", "md"):
        try:
            return data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("File is not valid UTF-8 text.") from exc
    if ftype == "pdf":
        if data[:5] != b"%PDF-":
            raise ValueError("File content is not a PDF.")
        from pypdf import PdfReader

        return "\n\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages)
    if ftype == "docx":
        if data[:2] != b"PK":
            raise ValueError("File content is not a DOCX.")
        import docx

        return "\n\n".join(p.text for p in docx.Document(io.BytesIO(data)).paragraphs)
    raise ValueError("Unsupported file type.")


class KnowledgeBase:
    def __init__(self, data_dir: Path, chunk_chars: int = 1800):
        self.dir, self.chunk_chars = Path(data_dir), chunk_chars
        (self.dir / "uploads").mkdir(parents=True, exist_ok=True)
        (self.dir / "knowledge").mkdir(parents=True, exist_ok=True)
        self.meta_path = self.dir / "documents.json"
        self.docs: dict[str, dict] = {}
        self.chunks: dict[str, list[Chunk]] = {}
        self.logs: list[dict] = []
        self.index = BM25Index([])
        self.last_latency_ms = 0
        self._lock = threading.RLock()
        if self.meta_path.exists():
            try:
                self.docs = {d["id"]: d for d in json.loads(self.meta_path.read_text())}
            except (ValueError, KeyError):
                self.docs = {}
        self._sync_builtin()
        for d in list(self.docs.values()):
            if d["status"] != "deleted":
                self._index_doc(d["id"])
        self._rebuild()

    # -- helpers
    def _log(self, doc: dict, level: str, msg: str, details: str | None = None) -> None:
        self.logs.insert(0, {"id": f"log-{uuid.uuid4().hex[:8]}", "timestamp": now(), "documentId": doc["id"],
                             "fileName": doc["fileName"], "level": level, "message": msg, "details": details})
        del self.logs[300:]

    def _save(self) -> None:
        self.meta_path.write_text(json.dumps(list(self.docs.values()), indent=1))

    def _path(self, d: dict) -> Path:
        return (self.dir / "knowledge" / d["fileName"]) if d.get("builtin") else (self.dir / "uploads" / d["storedName"])

    def _rebuild(self) -> None:
        with self._lock:
            self.index = BM25Index([c for cs in self.chunks.values() for c in cs])

    def _sync_builtin(self) -> None:
        for f in sorted((self.dir / "knowledge").glob("*")):
            ext = f.suffix.lstrip(".").lower()
            if ext not in ALLOWED:
                continue
            doc = next((d for d in self.docs.values() if d.get("builtin") and d["fileName"] == f.name), None)
            if doc is None:
                doc = {"id": f"doc-{f.stem[:40]}", "fileName": f.name, "fileType": ext, "uploadedAt": now(), "status": "queued",
                       "chunkCount": 0, "builtin": True}
                self.docs[doc["id"]] = doc
            doc["fileSize"] = f.stat().st_size

    def _index_doc(self, doc_id: str) -> None:
        d = self.docs[doc_id]
        d["status"], d["errorMessage"] = "processing", None
        try:
            data = self._path(d).read_bytes()
            text = extract_text(data, d["fileType"])
            if not text.strip():
                raise ValueError("No extractable text found in the document.")
            title = Path(d["fileName"]).stem.replace("_", " ").replace("-", " ").title()
            chunks = chunk_document(text, d["id"], title, d["fileType"], time.strftime("%Y-%m-%d", time.gmtime(self._path(d).stat().st_mtime)), self.chunk_chars)
            self.chunks[doc_id] = chunks
            d.update(status="indexed", chunkCount=len(chunks), lastIndexedAt=now())
            self._log(d, "info", f"Indexed {len(chunks)} chunks.")
        except Exception as exc:  # noqa: BLE001 - recorded per document
            self.chunks.pop(doc_id, None)
            d.update(status="failed", chunkCount=0, errorMessage=str(exc)[:300])
            self._log(d, "error", "Indexing failed.", str(exc)[:300])
        self._save()

    # -- public API
    def add_upload(self, name: str, data: bytes) -> dict:
        ext = Path(name).suffix.lstrip(".").lower()
        if ext not in ALLOWED:
            raise AppError(415, "unsupported_document", f"'{name}': only {', '.join(sorted(ALLOWED))} files are supported.")
        if len(data) > MAX_DOC_BYTES:
            raise AppError(413, "document_too_large", f"'{name}' exceeds the {MAX_DOC_BYTES // 1048576} MB limit.")
        if not data:
            raise AppError(400, "empty_document", f"'{name}' is empty.")
        did = f"doc-{uuid.uuid4().hex[:10]}"
        stored = f"{did}.{ext}"
        (self.dir / "uploads" / stored).write_bytes(data)
        safe = Path(name).name[:120]
        doc = {"id": did, "fileName": safe, "storedName": stored, "fileType": ext, "fileSize": len(data),
               "uploadedAt": now(), "status": "queued", "chunkCount": 0, "builtin": False}
        with self._lock:
            self.docs[did] = doc
            self._index_doc(did)
            self._rebuild()
        return doc

    def reindex(self, doc_id: str) -> dict:
        with self._lock:
            d = self.docs.get(doc_id)
            if not d or d["status"] == "deleted":
                raise AppError(404, "not_found", "Document not found.")
            self._index_doc(doc_id)
            self._rebuild()
            return d

    def delete(self, doc_id: str) -> None:
        with self._lock:
            d = self.docs.get(doc_id)
            if not d:
                raise AppError(404, "not_found", "Document not found.")
            if d.get("builtin"):
                raise AppError(409, "builtin_document", "Built-in knowledge documents cannot be deleted from the UI.")
            self._path(d).unlink(missing_ok=True)
            self._log(d, "warning", "Document and its chunks were removed from the index.")
            self.docs.pop(doc_id)
            self.chunks.pop(doc_id, None)
            self._rebuild()
            self._save()

    def search(self, query: str, top_k: int):
        t0 = time.perf_counter()
        hits = self.index.search(query, top_k)
        self.last_latency_ms = int((time.perf_counter() - t0) * 1000)
        return hits

    @property
    def documents(self):
        return self.docs
