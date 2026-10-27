"""Section-aware chunking and BM25 retrieval (no external embedding service needed)."""
import math
import re
from collections import Counter
from dataclasses import dataclass

STOP = set("a an the and or but of to in on for with at by from is are was were be been it its this that these those i you we my your our do does did can could will would should how what when where which who whom why if as not no yes any about into than then so there their them they me us have has had get got just also".split())

# Lightweight synonym / alias map: maps a conversational word to one or more
# terms that actually appear in the knowledge-base text.  Only domain-relevant
# entries are needed — this keeps retrieval working when users phrase questions
# naturally without adding an embedding model.
_SYNONYMS: dict[str, list[str]] = {
    "pro": ["professional"],
    "biz": ["business"],
    "pricing": ["price", "cost"],
    "cost": ["price", "pricing"],
    "price": ["pricing", "cost"],
    "fee": ["price", "cost"],
    "subscription": ["plan", "billing"],
    "tier": ["plan"],
    "money": ["refund", "charge", "payment"],
    "reimburse": ["refund"],
    "reimbursement": ["refund"],
    "boss": ["ceo", "executive"],
    "leader": ["ceo", "executive"],
    "head": ["lead", "manager"],
    "locked": ["sign", "access", "recovery"],
    "login": ["sign", "access", "account"],
    "signin": ["sign", "access", "account"],
    "signup": ["account", "creation"],
    "register": ["account", "creation"],
    "help": ["support", "contact"],
    "feature": ["capability", "include"],
    "integrate": ["integration"],
    "automation": ["automate"],
    "report": ["reporting", "insight"],
    "insight": ["reporting", "report"],
    "employ": ["employee", "directory", "staff"],
    "staff": ["employee", "directory"],
    "team": ["employee", "workspace"],
    "secure": ["security", "privacy"],
    "safe": ["security", "privacy"],
    "data": ["privacy", "retention", "storage"],
    "compliant": ["compliance", "certification"],
    "gdpr": ["compliance", "privacy"],
    "sso": ["authentication", "sign"],
    "api": ["integration"],
    "export": ["import", "format"],
    "member": ["user", "seat", "workspace"],
    "seat": ["user", "member"],
    "upgrade": ["plan", "change"],
    "downgrade": ["plan", "change"],
    "charge": ["billing", "payment", "invoice"],
    "invoice": ["billing", "payment", "charge"],
    "receipt": ["invoice", "billing"],
    "cancel": ["cancellation"],
    "cancellation": ["cancel"],
}

_H_NUM = re.compile(r"^(\d{1,2})\.\s+([A-Z].{2,90})$")
_H_MD = re.compile(r"^#{1,6}\s+(.+)$")


@dataclass
class Chunk:
    id: str
    doc_id: str
    doc_title: str
    doc_type: str
    section: str
    text: str
    last_updated: str


def tokenize(text: str) -> list[str]:
    out = []
    for w in re.findall(r"[a-z0-9$%@.]+", text.lower()):
        w = w.strip(".")
        if not w or w in STOP:
            continue
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        out.append(w)
    return out


def expand_query_tokens(tokens: list[str]) -> list[str]:
    """Expand query tokens with synonyms for better BM25 recall."""
    expanded = list(tokens)
    for t in tokens:
        for syn in _SYNONYMS.get(t, ()):
            if syn not in expanded:
                expanded.append(syn)
    return expanded


def _is_subheading(line: str) -> bool:
    s = line.strip()
    return (
        0 < len(s) <= 40 and len(s.split()) <= 5 and s[0].isupper()
        and s[-1] not in ".,;:!?\"')" and not s.startswith("-") and ":" not in s and "," not in s
    )


def _split_long(text: str, size: int) -> list[str]:
    if len(text) <= size:
        return [text]
    parts, cur = [], ""
    for sent in re.split(r"(?<=[.!?])\s+", text):
        if cur and len(cur) + len(sent) + 1 > size:
            parts.append(cur)
            cur = cur[-150:].split(" ", 1)[-1] + " " + sent  # modest overlap
        else:
            cur = f"{cur} {sent}".strip()
    if cur:
        parts.append(cur)
    return parts


def chunk_document(text: str, doc_id: str, title: str, doc_type: str, updated: str, size: int = 1800) -> list[Chunk]:
    """Headings stay with their text; FAQ question+answer paragraphs and policy conditions stay together."""
    sections: list[tuple[str, list[str]]] = [("Overview", [])]
    top = "Overview"
    for raw in text.replace("\r\n", "\n").split("\n"):
        line = raw.rstrip()
        m = _H_NUM.match(line.strip()) or None
        md = _H_MD.match(line.strip())
        if m:
            top = f"{m.group(1)}. {m.group(2).strip()}"
            sections.append((top, []))
        elif md:
            top = md.group(1).strip()
            sections.append((top, []))
        elif _is_subheading(line) and sections[-1][1] and line.strip() != top:
            sections.append((f"{top} › {line.strip()}", []))
        else:
            sections[-1][1].append(line)
    chunks: list[Chunk] = []
    for sec, lines in sections:
        body = "\n".join(lines).strip()
        if not body:
            continue
        paras = [re.sub(r"[ \t]*\n[ \t]*", " ", p).strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        buf = ""
        pieces: list[str] = []
        for p in paras:
            for part in _split_long(p, size):
                if buf and len(buf) + len(part) + 1 > size:
                    pieces.append(buf)
                    buf = part
                else:
                    buf = f"{buf}\n{part}".strip()
        if buf:
            pieces.append(buf)
        for piece in pieces:
            chunks.append(Chunk(f"{doc_id}-c{len(chunks)+1}", doc_id, title, doc_type, sec, f"{sec}\n{piece}", updated))
    return chunks


@dataclass
class Hit:
    chunk: Chunk
    score: float
    coverage: float
    relevance: float


class BM25Index:
    def __init__(self, chunks: list[Chunk] | None = None, k1: float = 1.4, b: float = 0.75):
        self.k1, self.b = k1, b
        self.chunks = chunks or []
        self._tf = [Counter(tokenize(c.section + " " + c.section + " " + c.text)) for c in self.chunks]
        self._len = [sum(t.values()) for t in self._tf]
        self._avg = (sum(self._len) / len(self._len)) if self._len else 1.0
        df: Counter = Counter()
        for t in self._tf:
            df.update(t.keys())
        n = len(self.chunks)
        self._idf = {w: math.log(1 + (n - d + 0.5) / (d + 0.5)) for w, d in df.items()}

    def search(self, query: str, top_k: int = 4) -> list[Hit]:
        raw = list(dict.fromkeys(tokenize(query)))
        if not raw or not self.chunks:
            return []
        q = list(dict.fromkeys(expand_query_tokens(raw)))
        n_original = len(raw)
        hits = []
        for i, tf in enumerate(self._tf):
            s = 0.0
            matched_original = 0
            matched_expanded = 0
            for j, w in enumerate(q):
                f = tf.get(w, 0)
                if f:
                    if j < n_original:
                        matched_original += 1
                    else:
                        matched_expanded += 1
                    s += self._idf.get(w, 0) * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self._len[i] / self._avg))
            if s > 0:
                # Coverage is based on original query terms (with a small
                # bonus for synonym hits to keep ranking sensible).
                cov = (matched_original + 0.3 * matched_expanded) / n_original
                cov = min(cov, 1.0)
                hits.append(Hit(self.chunks[i], s, cov, round(min(1.0, 0.6 * cov + 0.4 * s / (s + 3)), 2)))
        hits.sort(key=lambda h: (h.score, h.coverage), reverse=True)
        return hits[:top_k]


def evidence_status(hits: list[Hit]) -> str:
    if not hits:
        return "uncertain"
    top = hits[0]
    if top.coverage >= 0.5 and top.score >= 3:
        return "grounded"
    if top.coverage >= 0.25 and top.score >= 1.0:
        return "partial"
    return "uncertain"
