"""SQLite conversation persistence (stdlib only)."""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.services.speech_text import speech_hash


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConversationStore:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._db.executescript(
                """CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,title TEXT,created_at TEXT,updated_at TEXT);
                CREATE TABLE IF NOT EXISTS messages(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,conversation_id TEXT,
                  role TEXT,content TEXT,timestamp TEXT,payload TEXT,speech_hash TEXT);
                CREATE INDEX IF NOT EXISTS ix_msg_conv ON messages(conversation_id);
                CREATE INDEX IF NOT EXISTS ix_msg_hash ON messages(speech_hash);"""
            )

    def recent(self, conv_id: str, limit: int) -> list[dict]:
        with self._lock:
            rows = self._db.execute(
                "SELECT role,content FROM messages WHERE conversation_id=? ORDER BY seq DESC LIMIT ?", (conv_id, limit)
            ).fetchall()
        return [dict(r) for r in reversed(rows)]

    def append_exchange(self, conv_id: str, title: str, user: dict, assistant: dict) -> None:
        ts = now()
        with self._lock, self._db:
            if not self._db.execute("SELECT 1 FROM conversations WHERE id=?", (conv_id,)).fetchone():
                self._db.execute("INSERT INTO conversations VALUES(?,?,?,?)", (conv_id, title, ts, ts))
            self._db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (ts, conv_id))
            for m in (user, assistant):
                payload = {k: v for k, v in m.items() if k not in ("id", "role", "content", "timestamp")}
                self._db.execute(
                    "INSERT INTO messages(id,conversation_id,role,content,timestamp,payload,speech_hash) VALUES(?,?,?,?,?,?,?)",
                    (m["id"], conv_id, m["role"], m["content"], m["timestamp"], json.dumps(payload),
                     speech_hash(m["content"]) if m["role"] == "assistant" else None),
                )

    def _conv(self, row: sqlite3.Row) -> dict:
        msgs = self._db.execute("SELECT * FROM messages WHERE conversation_id=? ORDER BY seq", (row["id"],)).fetchall()
        out = []
        for m in msgs:
            d = {"id": m["id"], "role": m["role"], "content": m["content"], "timestamp": m["timestamp"]}
            d.update(json.loads(m["payload"] or "{}"))
            out.append(d)
        return {"id": row["id"], "title": row["title"], "createdAt": row["created_at"],
                "updatedAt": row["updated_at"], "messageCount": len(out), "messages": out}

    def list(self) -> list[dict]:
        with self._lock:
            rows = self._db.execute("SELECT * FROM conversations ORDER BY updated_at DESC").fetchall()
            return [self._conv(r) for r in rows]

    def get(self, conv_id: str) -> dict | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
            return self._conv(row) if row else None

    def delete(self, conv_id: str) -> bool:
        with self._lock, self._db:
            self._db.execute("DELETE FROM messages WHERE conversation_id=?", (conv_id,))
            return self._db.execute("DELETE FROM conversations WHERE id=?", (conv_id,)).rowcount > 0

    def set_feedback(self, conv_id: str, message_id: str, feedback: str) -> bool:
        with self._lock, self._db:
            row = self._db.execute("SELECT payload FROM messages WHERE id=? AND conversation_id=?", (message_id, conv_id)).fetchone()
            if not row:
                return False
            p = json.loads(row["payload"] or "{}")
            p["feedback"] = feedback
            self._db.execute("UPDATE messages SET payload=? WHERE id=?", (json.dumps(p), message_id))
            return True

    def is_assistant_text(self, text: str, conv_id: str | None) -> bool:
        h = speech_hash(text)
        q, args = "SELECT 1 FROM messages WHERE role='assistant' AND speech_hash=?", [h]
        if conv_id:
            q, args = q + " AND conversation_id=?", args + [conv_id]
        with self._lock:
            return self._db.execute(q + " LIMIT 1", args).fetchone() is not None


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"
