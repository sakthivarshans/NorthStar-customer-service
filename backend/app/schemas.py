"""Typed models. Field casing mirrors the frontend contract (src/types)."""
from typing import Literal

from pydantic import BaseModel, Field

EvidenceStatus = Literal["grounded", "partial", "uncertain"]


class SourceCitation(BaseModel):
    id: str
    documentTitle: str
    documentType: Literal["pdf", "txt", "md", "docx"]
    section: str
    excerpt: str
    relevanceScore: float
    lastUpdated: str
    chunkId: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    conversation_id: str | None = Field(default=None, max_length=100)
    user_message_id: str | None = Field(default=None, max_length=100)


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    message_id: str
    sources: list[SourceCitation]
    grounded: bool
    needs_human: bool
    evidence_status: EvidenceStatus


class ChatMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: str
    sources: list[SourceCitation] | None = None
    grounded: bool | None = None
    groundingStatus: EvidenceStatus | None = None
    needsHuman: bool | None = None
    feedback: Literal["helpful", "unhelpful"] | None = None


class ConversationOut(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str
    messageCount: int
    messages: list[ChatMessageOut]


class FeedbackRequest(BaseModel):
    messageId: str
    conversationId: str
    feedback: Literal["helpful", "unhelpful"]
    comment: str | None = Field(default=None, max_length=1000)


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration: float
    model: str
    inference_time_ms: int
    segments: list[TranscriptSegment] = []


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1)
    conversation_id: str | None = Field(default=None, max_length=100)
    voice_id: str | None = Field(default=None, max_length=100)


class ApprovedVoice(BaseModel):
    id: str
    label: str


class SpeechStatus(BaseModel):
    stt_available: bool
    tts_available: bool
    stt_provider: str
    tts_provider: str
    status: Literal["healthy", "degraded", "offline"]
    stt_model: str
    stt_state: Literal["not_loaded", "loading", "ready", "failed"]
    stt_error: str | None = None
    stt_warmup_ms: int | None = None  # one-pass model speed measured at startup (large values = model too heavy)
    tts_model: str
    tts_configured: bool
    approved_voices: list[ApprovedVoice] = []


class AdminDocument(BaseModel):
    id: str
    fileName: str
    fileType: Literal["pdf", "txt", "md", "docx"]
    fileSize: int
    uploadedAt: str
    status: Literal["queued", "processing", "indexed", "failed", "deleted"]
    chunkCount: int
    lastIndexedAt: str | None = None
    errorMessage: str | None = None
    builtin: bool = False


class KnowledgeStats(BaseModel):
    totalDocuments: int
    indexedChunks: int
    lastIndexedTime: str
    systemStatus: Literal["healthy", "degraded", "syncing", "offline"]
    vectorIndexSizeMb: float
    averageRetrievalLatencyMs: int


class IngestionLog(BaseModel):
    id: str
    timestamp: str
    documentId: str
    fileName: str
    level: Literal["info", "warning", "error"]
    message: str
    details: str | None = None
