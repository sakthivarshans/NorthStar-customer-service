export type ActiveTab = 'support' | 'products' | 'help' | 'conversations' | 'admin';

export type GroundingStatus = 
  | 'grounded' // "Based on company documentation"
  | 'partial'  // "Some details could not be verified"
  | 'uncertain'; // "Human support recommended"

export interface SourceCitation {
  id: string;
  documentTitle: string;
  documentType: 'pdf' | 'txt' | 'md' | 'docx';
  section: string;
  excerpt: string;
  relevanceScore: number; // 0.0 to 1.0
  lastUpdated: string;
  chunkId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SourceCitation[];
  grounded?: boolean;
  groundingStatus?: GroundingStatus;
  needsHuman?: boolean;
  feedback?: 'helpful' | 'unhelpful' | null;
  error?: boolean;
  audioUrl?: string;
  audioLoading?: boolean;
  audioError?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ChatMessage[];
  isDemo?: boolean;
}

export interface ProductPlan {
  id: string;
  name: string;
  targetAudience: string;
  monthlyPrice: number | null; // null if contact support
  annualPricePerMonth: number | null;
  billingPeriod: string;
  description: string;
  features: string[];
  limits: {
    seats: string;
    storage: string;
    supportSla: string;
    apiRateLimit: string;
  };
  highlighted?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'core' | 'intelligence' | 'collaboration' | 'security';
  features: string[];
  includedInPlans: string[];
  pricingNote?: string;
}

export type DocumentProcessingStatus = 'queued' | 'processing' | 'indexed' | 'failed' | 'deleted';

export interface AdminDocument {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'txt' | 'md' | 'docx';
  fileSize: number; // in bytes
  uploadedAt: string;
  status: DocumentProcessingStatus;
  chunkCount: number;
  lastIndexedAt?: string;
  errorMessage?: string;
  processingProgress?: number; // 0 to 100
}

export interface IngestionLog {
  id: string;
  timestamp: string;
  documentId: string;
  fileName: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface KnowledgeStats {
  totalDocuments: number;
  indexedChunks: number;
  lastIndexedTime: string;
  systemStatus: 'healthy' | 'degraded' | 'syncing' | 'offline';
  vectorIndexSizeMb: number;
  averageRetrievalLatencyMs: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'products' | 'billing' | 'account' | 'policies';
  relatedSourceId?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  answer: string;
  conversation_id: string;
  sources: SourceCitation[];
  grounded: boolean;
  needs_human: boolean;
  evidence_status?: GroundingStatus;
}

// ==========================================
// Voice & Speech Integration Types
// ==========================================

export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'transcribing'
  | 'ready'
  | 'failed'
  | 'cancelled';

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

export interface SpeechSynthesisRequest {
  text: string;
  conversation_id?: string;
  voice_id?: string;
}

export interface SpeechServiceStatus {
  stt_available: boolean;
  tts_available: boolean;
  stt_provider: string; // e.g. "Faster-Whisper Large-v3 (Colab GPU via Backend)"
  tts_provider: string; // e.g. "Fish Audio S2.1 Pro"
  status: 'healthy' | 'degraded' | 'offline';
}

export interface VoicePreferences {
  voiceResponsesEnabled: boolean;
  autoPlayResponses: boolean;
  autoSubmitTranscript: boolean;
  preferredVoiceId: string;
  maxRecordingSeconds: number;
}
