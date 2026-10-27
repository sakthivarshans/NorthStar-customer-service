import {
  AdminDocument,
  ChatRequest,
  ChatResponse,
  Conversation,
  IngestionLog,
  KnowledgeStats,
  SourceCitation,
  SpeechServiceStatus,
  TranscriptionResponse,
  VoicePreferences
} from '../types';
import { KNOWLEDGE_BASE_CHUNKS, SUPPORT_EMAIL } from '../data/northstarKnowledge';

export const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const STORAGE_KEYS = {
  CONVERSATIONS: 'northstar_conversations',
  VOICE_PREFERENCES: 'northstar_voice_preferences_v2', // v2: auto-speak answers is now on by default
  API_BASE_OVERRIDE: 'northstar_api_base_override',
  MODE: 'northstar_app_mode',
  ACCESS_KEY: 'northstar_api_key'
};

export const TIMEOUTS = { short: 15000, health: 8000, chat: 120000, transcribe: 120000, synthesize: 90000, upload: 120000 };

export class ApiServiceError extends Error {
  statusCode?: number;
  isNetworkError: boolean;
  endpoint: string;
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, endpoint: string, statusCode?: number, isNetworkError = false, code?: string) {
    super(message);
    this.name = 'ApiServiceError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.code = code;
  }
}

export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voiceResponsesEnabled: true,
  autoPlayResponses: true, // speak each new answer automatically (needs a Fish Audio key / OpenRouter TTS)
  autoSubmitTranscript: false,
  preferredVoiceId: 'default', // 'default' = provider default voice; approved voices come from /speech/status
  maxRecordingSeconds: 60
};

/** Pull a human-readable message out of a FastAPI/AppError JSON body ({detail, code}). */
export async function parseErrorResponse(response: Response): Promise<{ message: string; code?: string }> {
  const text = await response.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    if (typeof body?.detail === 'string') return { message: body.detail, code: body.code };
    if (Array.isArray(body?.detail)) return { message: 'The request was not valid.', code: 'validation_error' };
  } catch {
    /* not JSON */
  }
  return { message: text.slice(0, 200) || `Server returned status ${response.status}.` };
}

const STOP = new Set('a an the and or of to in on for with is are was can could do does how what i you my your we our it its this that be at by'.split(' '));
const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9$]+/g)?.filter((w) => !STOP.has(w)) ?? [];

class NorthstarApiClient {
  private mode: 'demo' | 'live' = 'live';
  private apiBaseUrl: string = DEFAULT_API_BASE_URL;

  constructor() {
    if (typeof window !== 'undefined') {
      const override = localStorage.getItem(STORAGE_KEYS.API_BASE_OVERRIDE);
      if (override) this.apiBaseUrl = override;
      const stored = localStorage.getItem(STORAGE_KEYS.MODE);
      if (stored === 'live' || stored === 'demo') this.mode = stored;
    }
  }

  public getMode() { return this.mode; }
  public setMode(mode: 'demo' | 'live') {
    this.mode = mode;
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }
  public getApiBaseUrl() { return this.apiBaseUrl; }
  public setApiBaseUrl(url: string) {
    this.apiBaseUrl = url.replace(/\/+$/, '');
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.API_BASE_OVERRIDE, this.apiBaseUrl);
  }

  private authHeaders(): Record<string, string> {
    const key = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCESS_KEY) : null;
    return key ? { 'X-API-Key': key } : {};
  }

  /** Single HTTP dispatcher: timeout, JSON/multipart bodies, structured errors. */
  private async http(endpoint: string, init: RequestInit & { timeoutMs?: number; json?: unknown } = {}): Promise<Response> {
    const { timeoutMs = TIMEOUTS.short, json, headers, signal: external, ...rest } = init;
    const controller = new AbortController();
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const finalHeaders: Record<string, string> = { ...this.authHeaders(), ...(headers as Record<string, string>) };
    if (json !== undefined) finalHeaders['Content-Type'] = 'application/json';
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        ...rest,
        headers: finalHeaders,
        body: json !== undefined ? JSON.stringify(json) : rest.body,
        signal: controller.signal
      });
      if (!response.ok) {
        const { message, code } = await parseErrorResponse(response);
        const err = new ApiServiceError(message, endpoint, response.status, false, code);
        const ra = Number(response.headers.get('retry-after'));
        if (ra > 0) err.retryAfterSeconds = ra;
        throw err;
      }
      return response;
    } catch (err: unknown) {
      if (err instanceof ApiServiceError) throw err;
      const aborted = err instanceof Error && err.name === 'AbortError';
      if (aborted && external?.aborted) {
        throw new ApiServiceError('Request cancelled.', endpoint, undefined, false, 'aborted');
      }
      throw new ApiServiceError(
        aborted
          ? `The request to ${endpoint} timed out after ${Math.round(timeoutMs / 1000)}s.`
          : `Could not reach the backend at ${this.apiBaseUrl}. Make sure the API server is running.`,
        endpoint,
        undefined,
        true,
        aborted ? 'timeout' : 'network'
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async getJson<T>(endpoint: string, init: Parameters<NorthstarApiClient['http']>[1] = {}): Promise<T> {
    return (await this.http(endpoint, init)).json() as Promise<T>;
  }

  private requireLive(endpoint: string, feature: string): never {
    throw new ApiServiceError(`${feature} requires live mode with the backend running. Switch to Live mode.`, endpoint, undefined, false, 'demo_mode');
  }

  // ---- Health ---------------------------------------------------------
  public async getHealth(): Promise<{ status: string; version?: string; live: boolean }> {
    if (this.mode === 'demo') return { status: 'healthy', version: 'offline-demo', live: false };
    const res = await this.getJson<{ status: string; version?: string }>('/health', { timeoutMs: TIMEOUTS.health });
    return { ...res, live: true };
  }

  // ---- Chat -----------------------------------------------------------
  public async sendChat(req: ChatRequest): Promise<ChatResponse> {
    if (this.mode === 'live') {
      return this.getJson<ChatResponse>('/chat', { method: 'POST', json: req, timeoutMs: TIMEOUTS.chat });
    }
    return this.demoAnswer(req);
  }

  /** Offline demo: keyword match over the approved FAQ entries only. No model, no invented facts. */
  private async demoAnswer(req: ChatRequest): Promise<ChatResponse> {
    await new Promise((r) => setTimeout(r, 400));
    const q = new Set(tokens(req.message));
    const scored = KNOWLEDGE_BASE_CHUNKS.map((c) => {
      const hit = tokens(c.excerpt).filter((w) => q.has(w));
      return { c, score: new Set(hit).size / Math.max(q.size, 1) };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    const conversation_id = req.conversation_id || `conv-${Date.now()}`;
    if (!best || best.score < 0.4) {
      return {
        answer: `The current Northstar knowledge base does not specify that detail, so I do not want to guess. Please contact ${SUPPORT_EMAIL} to confirm the current policy.`,
        conversation_id, sources: [], grounded: false, needs_human: true, evidence_status: 'uncertain'
      };
    }
    const src: SourceCitation = { ...best.c, relevanceScore: Number(best.score.toFixed(2)) };
    const answer = src.excerpt.slice(src.excerpt.indexOf('?') + 1).trim();
    return { answer, conversation_id, sources: [src], grounded: true, needs_human: false, evidence_status: 'grounded' };
  }

  // ---- Conversations ---------------------------------------------------
  private readLocal(): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONVERSATIONS) || '[]');
    } catch {
      return [];
    }
  }

  public async getConversations(): Promise<Conversation[]> {
    return this.mode === 'live' ? this.getJson<Conversation[]>('/conversations') : this.readLocal();
  }

  public async getConversation(id: string): Promise<Conversation> {
    if (this.mode === 'live') return this.getJson<Conversation>(`/conversations/${encodeURIComponent(id)}`);
    const found = this.readLocal().find((c) => c.id === id);
    if (!found) throw new ApiServiceError(`Conversation ${id} not found`, `/conversations/${id}`, 404);
    return found;
  }

  /** Live mode persists server-side inside POST /chat; only demo mode stores locally. */
  public async saveDemoConversation(conv: Conversation): Promise<void> {
    if (this.mode !== 'demo' || typeof window === 'undefined') return;
    const convs = this.readLocal();
    const i = convs.findIndex((c) => c.id === conv.id);
    if (i >= 0) convs[i] = conv; else convs.unshift(conv);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  }

  public async deleteConversation(id: string): Promise<{ success: boolean }> {
    if (this.mode === 'live') return this.getJson(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(this.readLocal().filter((c) => c.id !== id)));
    return { success: true };
  }

  public async submitFeedback(payload: {
    messageId: string; conversationId: string; feedback: 'helpful' | 'unhelpful'; comment?: string;
  }): Promise<{ success: boolean }> {
    if (this.mode === 'live') return this.getJson('/feedback', { method: 'POST', json: payload });
    return { success: true };
  }

  // ---- Admin / knowledge base -------------------------------------------
  public async uploadDocuments(files: File[]): Promise<AdminDocument[]> {
    if (this.mode !== 'live') this.requireLive('/admin/documents', 'Uploading documents');
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return this.getJson<AdminDocument[]>('/admin/documents', { method: 'POST', body: form, timeoutMs: TIMEOUTS.upload });
  }
  public async getAdminDocuments(): Promise<AdminDocument[]> {
    return this.mode === 'live' ? this.getJson('/admin/documents') : [];
  }
  public async getAdminDocument(id: string): Promise<AdminDocument> {
    if (this.mode !== 'live') this.requireLive(`/admin/documents/${id}`, 'Document details');
    return this.getJson(`/admin/documents/${encodeURIComponent(id)}`);
  }
  public async reindexDocument(id: string): Promise<AdminDocument> {
    if (this.mode !== 'live') this.requireLive(`/admin/documents/${id}/reindex`, 'Re-indexing');
    return this.getJson(`/admin/documents/${encodeURIComponent(id)}/reindex`, { method: 'POST', timeoutMs: TIMEOUTS.upload });
  }
  public async deleteDocument(id: string): Promise<{ success: boolean }> {
    if (this.mode !== 'live') this.requireLive(`/admin/documents/${id}`, 'Deleting documents');
    return this.getJson(`/admin/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  public async getAdminStats(): Promise<KnowledgeStats> {
    if (this.mode === 'live') return this.getJson('/admin/stats');
    return { totalDocuments: 0, indexedChunks: 0, lastIndexedTime: new Date().toISOString(), systemStatus: 'offline', vectorIndexSizeMb: 0, averageRetrievalLatencyMs: 0 };
  }
  public async getAdminLogs(): Promise<IngestionLog[]> {
    return this.mode === 'live' ? this.getJson('/admin/logs') : [];
  }

  // ---- Speech ----------------------------------------------------------
  /** POST /speech/transcribe — local Faster-Whisper (base.en) on the backend. */
  public async transcribeAudio(file: Blob | File, signal?: AbortSignal): Promise<TranscriptionResponse> {
    if (this.mode !== 'live') this.requireLive('/speech/transcribe', 'Voice input (local Faster-Whisper)');
    const ext = file.type.includes('ogg') ? 'ogg' : file.type.includes('mp4') ? 'm4a' : file.type.includes('wav') ? 'wav' : 'webm';
    const form = new FormData();
    form.append('file', file, `recording.${ext}`);
    const data = await this.getJson<TranscriptionResponse>('/speech/transcribe', { method: 'POST', body: form, timeoutMs: TIMEOUTS.transcribe, signal });
    return { ...data, text: (data.text || '').trim() };
  }

  /** POST /speech/synthesize — Fish Audio via the backend. Sends the raw answer; the server cleans it for speech. */
  public async synthesizeSpeech(text: string, conversationId?: string, voiceId?: string): Promise<{ audioUrl: string }> {
    if (!text.trim()) throw new ApiServiceError('Cannot synthesize audio for empty text.', '/speech/synthesize');
    if (this.mode !== 'live') this.requireLive('/speech/synthesize', 'Voice responses (Fish Audio)');
    const pref = voiceId ?? this.getVoicePreferences().preferredVoiceId;
    const response = await this.http('/speech/synthesize', {
      method: 'POST',
      json: { text, conversation_id: conversationId, voice_id: pref && pref !== 'default' ? pref : undefined },
      timeoutMs: TIMEOUTS.synthesize
    });
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('audio/')) {
      throw new ApiServiceError('The backend did not return audio.', '/speech/synthesize', response.status, false, 'bad_content_type');
    }
    const blob = await response.blob();
    if (blob.size === 0) throw new ApiServiceError('The backend returned empty audio.', '/speech/synthesize', response.status, false, 'empty_audio');
    return { audioUrl: URL.createObjectURL(blob) };
  }

  /** GET /speech/status — model readiness for the local STT and TTS configuration. */
  public async getSpeechServiceStatus(): Promise<SpeechServiceStatus> {
    const offline: SpeechServiceStatus = {
      stt_available: false, tts_available: false,
      stt_provider: 'Faster-Whisper (base.en, local)', tts_provider: 'Fish Audio', status: 'offline'
    };
    if (this.mode !== 'live') return offline;
    try {
      return await this.getJson<SpeechServiceStatus>('/speech/status', { timeoutMs: TIMEOUTS.health });
    } catch {
      return offline;
    }
  }

  // ---- Voice preferences ---------------------------------------------------
  public getVoicePreferences(): VoicePreferences {
    if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES;
    try {
      return { ...DEFAULT_VOICE_PREFERENCES, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.VOICE_PREFERENCES) || '{}') };
    } catch {
      return DEFAULT_VOICE_PREFERENCES;
    }
  }
  public saveVoicePreferences(prefs: VoicePreferences): void {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.VOICE_PREFERENCES, JSON.stringify(prefs));
  }
}

export const apiService = new NorthstarApiClient();
