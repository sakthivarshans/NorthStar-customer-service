import {
  AdminDocument,
  ChatRequest,
  ChatResponse,
  Conversation,
  IngestionLog,
  KnowledgeStats,
  SourceCitation,
  SpeechServiceStatus,
  SpeechSynthesisRequest,
  TranscriptionResponse,
  VoicePreferences
} from '../types';
import {
  KNOWLEDGE_BASE_CHUNKS,
  NORTHSTAR_PLANS,
  NORTHSTAR_POLICIES,
  NORTHSTAR_PRODUCTS
} from '../data/northstarKnowledge';

// Configurable API Base URL. Default as required by specifications.
export const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiServiceError extends Error {
  statusCode?: number;
  isNetworkError: boolean;
  endpoint: string;

  constructor(message: string, endpoint: string, statusCode?: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiServiceError';
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
  }
}

// Default voice preferences
export const DEFAULT_VOICE_PREFERENCES: VoicePreferences = {
  voiceResponsesEnabled: true,
  autoPlayResponses: false,
  autoSubmitTranscript: false,
  preferredVoiceId: 'fish-audio-s2-claire',
  maxRecordingSeconds: 60
};

// Storage keys for demo data persistence
const STORAGE_KEYS = {
  CONVERSATIONS: 'northstar_demo_conversations_v1',
  ADMIN_DOCS: 'northstar_demo_admin_docs_v1',
  ADMIN_LOGS: 'northstar_demo_admin_logs_v1',
  API_BASE_OVERRIDE: 'northstar_api_base_override',
  VOICE_PREFERENCES: 'northstar_voice_preferences_v1'
};

// Initial default admin documents in demo mode
const INITIAL_DEMO_DOCS: AdminDocument[] = [
  {
    id: 'doc-101',
    fileName: 'Northstar_Product_Architecture_v2.4.pdf',
    fileType: 'pdf',
    fileSize: 4194304, // 4 MB
    uploadedAt: '2026-09-15T14:30:00Z',
    status: 'indexed',
    chunkCount: 148,
    lastIndexedAt: '2026-09-15T14:32:45Z',
    processingProgress: 100
  },
  {
    id: 'doc-102',
    fileName: 'Commercial_Pricing_and_SLA_Matrix_2026.md',
    fileType: 'md',
    fileSize: 245760, // 240 KB
    uploadedAt: '2026-10-10T09:12:00Z',
    status: 'indexed',
    chunkCount: 42,
    lastIndexedAt: '2026-10-10T09:12:40Z',
    processingProgress: 100
  },
  {
    id: 'doc-103',
    fileName: 'Enterprise_Security_SOC2_HIPAA_Compliance.pdf',
    fileType: 'pdf',
    fileSize: 6291456, // 6 MB
    uploadedAt: '2026-10-01T16:20:00Z',
    status: 'indexed',
    chunkCount: 215,
    lastIndexedAt: '2026-10-01T16:24:10Z',
    processingProgress: 100
  },
  {
    id: 'doc-104',
    fileName: 'Master_Service_Agreement_and_Refund_Terms.docx',
    fileType: 'docx',
    fileSize: 524288, // 512 KB
    uploadedAt: '2026-08-20T11:05:00Z',
    status: 'indexed',
    chunkCount: 68,
    lastIndexedAt: '2026-08-20T11:06:15Z',
    processingProgress: 100
  }
];

const INITIAL_DEMO_LOGS: IngestionLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-10T09:12:40Z',
    documentId: 'doc-102',
    fileName: 'Commercial_Pricing_and_SLA_Matrix_2026.md',
    level: 'info',
    message: 'Ingestion and indexing complete. 42 chunks vectorised with embedding model.'
  },
  {
    id: 'log-2',
    timestamp: '2026-10-01T16:24:10Z',
    documentId: 'doc-103',
    fileName: 'Enterprise_Security_SOC2_HIPAA_Compliance.pdf',
    level: 'info',
    message: 'PDF OCR and structural table extraction completed successfully. 215 chunks indexed.'
  }
];

class NorthstarApiClient {
  private mode: 'demo' | 'live' = 'demo';
  private apiBaseUrl: string = DEFAULT_API_BASE_URL;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedOverride = localStorage.getItem(STORAGE_KEYS.API_BASE_OVERRIDE);
      if (storedOverride) {
        this.apiBaseUrl = storedOverride;
      }
      const storedMode = localStorage.getItem('northstar_app_mode');
      if (storedMode === 'live' || storedMode === 'demo') {
        this.mode = storedMode;
      }
    }
  }

  public getMode(): 'demo' | 'live' {
    return this.mode;
  }

  public setMode(mode: 'demo' | 'live') {
    this.mode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('northstar_app_mode', mode);
    }
  }

  public getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  public setApiBaseUrl(url: string) {
    this.apiBaseUrl = url.replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.API_BASE_OVERRIDE, this.apiBaseUrl);
    }
  }

  // --- Common HTTP Dispatcher for Live Mode ---
  private async liveFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown server response');
        throw new ApiServiceError(
          `Backend error (${response.status}): ${errorText}`,
          endpoint,
          response.status,
          false
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof ApiServiceError) throw err;

      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? `Connection to backend at ${this.apiBaseUrl} timed out after 12s.`
            : `Failed to connect to backend at ${this.apiBaseUrl}. Ensure the API server is running.`
          : 'Network connection failure.';

      throw new ApiServiceError(message, endpoint, undefined, true);
    }
  }

  // ==========================================
  // 1. GET /health
  // ==========================================
  public async getHealth(): Promise<{ status: string; version?: string; live: boolean }> {
    if (this.mode === 'demo') {
      return { status: 'healthy', version: 'demo-local-rag-v1', live: false };
    }
    const res = await this.liveFetch<{ status: string; version?: string }>('/health');
    return { ...res, live: true };
  }

  // ==========================================
  // 2. POST /chat
  // ==========================================
  public async sendChat(req: ChatRequest): Promise<ChatResponse> {
    if (this.mode === 'live') {
      return await this.liveFetch<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    }

    // --- DEMO MODE RAG SIMULATION ---
    // Grounded retrieval over the authentic Northstar company document
    await new Promise((resolve) => setTimeout(resolve, 850)); // realistic network/retrieval simulation

    const query = req.message.toLowerCase().trim();
    return this.demoRagRetrieval(req.message, req.conversation_id || `conv-${Date.now()}`);
  }

  private demoRagRetrieval(rawQuery: string, conversationId: string): ChatResponse {
    const q = rawQuery.toLowerCase();

    // Check specific knowledge domains:
    // 1. Pricing / Cost questions
    if (q.includes('price') || q.includes('cost') || q.includes('how much') || q.includes('pricing') || q.includes('rate')) {
      if (q.includes('pro') || q.includes('professional')) {
        return {
          answer: `**Northstar Professional Plan Pricing:**\n\n- **Monthly Billing:** $79 per user / month\n- **Annual Billing:** $65 per user / month ($780 billed annually), saving approximately 18%\n- **Seat Capacity:** Up to 100 team members\n- **Included Modules:** Northstar Cloud Suite, Northstar Team Sync, and Northstar Analytics Pro\n- **Support SLA:** Priority support with a 4-hour response SLA (Monday–Friday, 8:00 AM – 8:00 PM EST)\n- **Storage:** 1 TB pooled cloud storage`,
          conversation_id: conversationId,
          grounded: true,
          evidence_status: 'grounded',
          needs_human: false,
          sources: [
            KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-pro')!,
            KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-analytics')!
          ]
        };
      }

      if (q.includes('starter')) {
        return {
          answer: `**Northstar Starter Plan Pricing:**\n\n- **Monthly Billing:** $29 per user / month\n- **Annual Billing:** $24 per user / month ($288 billed annually)\n- **Seat Limit:** Up to 15 team members\n- **Included Modules:** Cloud Suite and Team Sync\n- **Storage:** 50 GB pooled cloud storage\n- **Support:** Standard email support within 24 hours`,
          conversation_id: conversationId,
          grounded: true,
          evidence_status: 'grounded',
          needs_human: false,
          sources: [KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-starter')!]
        };
      }

      if (q.includes('enterprise')) {
        return {
          answer: `**Northstar Enterprise Plan Pricing:**\n\n- **Base Price:** $199 per user / month, or custom negotiated annual agreement with volume discounting starting at 250+ seats.\n- **Included:** All products including Northstar Enterprise Shield (CMEK KMS, SOC 2 Type II, HIPAA BAA).\n- **Support SLA:** 24/7 dedicated account manager with a guaranteed 1-hour critical response SLA.\n- **Storage:** Unlimited dedicated cloud storage.`,
          conversation_id: conversationId,
          grounded: true,
          evidence_status: 'grounded',
          needs_human: false,
          sources: [
            KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-enterprise')!,
            KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-security')!
          ]
        };
      }

      // General pricing overview
      return {
        answer: `Northstar offers three transparent subscription tiers:\n\n1. **Starter Plan:** $29/user/month ($24/mo on annual billing). For teams up to 15 users. Includes Cloud Suite, Team Sync, and 50 GB pooled storage.\n2. **Professional Plan:** $79/user/month ($65/mo on annual billing). For scaling teams up to 100 users. Includes Cloud Suite, Team Sync, Analytics Pro, 1 TB storage, and 4-hour support SLA.\n3. **Enterprise Plan:** $199/user/month (or custom annual terms). Unlimited seats, dedicated storage, Enterprise Shield (SOC 2, HIPAA, KMS), and 24/7 dedicated support with 1-hour SLA.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-pro')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-starter')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-enterprise')!
        ]
      };
    }

    // 2. Cancellation
    if (q.includes('cancel') || q.includes('cancellation') || q.includes('terminate') || q.includes('stop subscription')) {
      return {
        answer: `**How to cancel your Northstar subscription:**\n\n1. Sign in as an **Organization Administrator**.\n2. Navigate to **Settings > Organization > Billing & Subscriptions**.\n3. Click **"Manage Subscription"** and select **"Cancel Plan"**.\n4. Confirm your selection.\n\n**Key terms:**\n- Your account remains fully active until the conclusion of your current paid billing cycle.\n- No early termination fees or unexpected penalties are charged.\n- Following cycle conclusion, your workspace enters a 30-day read-only grace period to allow full data export before permanent deletion.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-policy-cancel')!]
      };
    }

    // 3. Refund Policy
    if (q.includes('refund') || q.includes('money back') || q.includes('guarantee')) {
      return {
        answer: `**Northstar Refund Policy:**\n\n- **Annual Subscriptions:** Protected by a **14-day 100% money-back guarantee** from the date of initial purchase or annual renewal.\n- **Monthly Subscriptions:** Once billed, monthly payments are non-refundable. However, if a cancellation was intended before renewal, requests submitted within **48 hours of billing** are eligible for discretionary review and service credit.\n- **Add-ons & Storage Blocks:** Non-refundable once provisioned.\n\nTo request a refund review under the 14-day window, submit a ticket through the Support Center or email billing support.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-policy-refund')!]
      };
    }

    // 4. Products overview / "What products do you offer"
    if (q.includes('product') || q.includes('offer') || q.includes('what do you sell') || q.includes('modules')) {
      return {
        answer: `Northstar provides four modular, interconnected enterprise products:\n\n1. **Northstar Cloud Suite:** Real-time document co-authoring, multi-stage approval workflows, and immutable compliance audit trails with 99.95% SLA.\n2. **Northstar Analytics Pro:** Operational telemetry, custom KPI dashboards, scheduled Slack/PDF reports, and automated anomaly alerts.\n3. **Northstar Team Sync:** Threaded messaging, presence indicators, smart timezone coordination, and integrations with Zoom, Google Meet, and Teams.\n4. **Northstar Enterprise Shield:** Dedicated single-tenant isolation, customer-managed KMS encryption, SOC 2 Type II attestation, and signed HIPAA BAAs.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-suite')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-analytics')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-security')!
        ]
      };
    }

    // 5. Which plan is right for me / comparison
    if (q.includes('which plan') || q.includes('right plan') || q.includes('compare plans') || q.includes('recommend')) {
      return {
        answer: `**Plan Recommendation Guide:**\n\n- **Starter ($29/user/mo):** Best for teams of up to 15 who need core document collaboration and messaging without advanced reporting.\n- **Professional ($79/user/mo):** Ideal for growing companies (up to 100 users) that rely on live analytics dashboards, automated alerts, and 4-hour business-hours support SLAs.\n- **Enterprise ($199/user/mo or custom):** Essential for regulated organizations requiring SOC 2 / HIPAA compliance, customer-managed encryption keys, SAML 2.0 SSO, and 24/7 dedicated support with a 1-hour critical response guarantee.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-starter')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-pro')!,
          KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-enterprise')!
        ]
      };
    }

    // 6. Human Support / Escalation
    if (q.includes('human') || q.includes('representative') || q.includes('person') || q.includes('agent') || q.includes('talk to someone') || q.includes('contact support')) {
      return {
        answer: `**Contacting Northstar Human Support:**\n\nYou can connect directly with our human support team through the following channels based on your plan:\n\n- **Enterprise Accounts:** 24/7/365 direct emergency hotline and dedicated Slack/Teams connect channel (1-hour response SLA for critical incidents).\n- **Professional Accounts:** Monday–Friday, 8:00 AM – 8:00 PM EST via \`priority-support@northstar.example.com\` (4-hour response SLA).\n- **Starter Accounts:** Monday–Friday, 9:00 AM – 5:00 PM EST via \`support@northstar.example.com\` (24-hour response SLA).\n\nYou can also click the **"Escalate to Human Support"** button right here to immediately submit a priority ticket.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: true,
        sources: [KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-support-sla')!]
      };
    }

    // 7. Security / SOC 2 / HIPAA
    if (q.includes('soc') || q.includes('hipaa') || q.includes('security') || q.includes('gdpr') || q.includes('encryption') || q.includes('kms')) {
      return {
        answer: `**Northstar Security & Compliance:**\n\n- **Certifications:** SOC 2 Type II certified and ISO 27001 accredited.\n- **Healthcare / HIPAA:** We execute signed Business Associate Agreements (BAAs) under the Enterprise tier.\n- **Encryption:** All customer data is encrypted in transit using TLS 1.3 and at rest with AES-256. Enterprise customers can provision Customer-Managed Encryption Keys (CMEK) via AWS KMS or Google Cloud KMS.\n- **Isolation:** Enterprise Shield provisions dedicated single-tenant infrastructure with strict role-based access control and automated DLP filters.`,
        conversation_id: conversationId,
        grounded: true,
        evidence_status: 'grounded',
        needs_human: false,
        sources: [KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-prod-security')!]
      };
    }

    // 8. UNCERTAIN / OUT-OF-SCOPE INQUIRY
    // When the query asks about something not in company documentation, explicitly declare uncertainty and offer human escalation!
    return {
      answer: `I could not locate specific verified information regarding "${rawQuery}" in the authoritative Northstar documentation.\n\nTo ensure you receive accurate and up-to-date guidance without assumptions, I recommend connecting directly with a Northstar support specialist who can look into your specific account details.`,
      conversation_id: conversationId,
      grounded: false,
      evidence_status: 'uncertain',
      needs_human: true,
      sources: []
    };
  }

  // ==========================================
  // 3. GET /conversations
  // ==========================================
  public async getConversations(): Promise<Conversation[]> {
    if (this.mode === 'live') {
      return await this.liveFetch<Conversation[]>('/conversations');
    }

    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallback
      }
    }

    // Default seeded conversation
    const defaultConvs: Conversation[] = [
      {
        id: 'conv-demo-01',
        title: 'Professional Plan Pricing & SLA Inquiry',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        messageCount: 2,
        isDemo: true,
        messages: [
          {
            id: 'm-1',
            role: 'user',
            content: 'How much does the Professional plan cost and what support SLA is included?',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'm-2',
            role: 'assistant',
            content: `**Northstar Professional Plan Pricing:**\n\n- **Monthly Billing:** $79 per user / month\n- **Annual Billing:** $65 per user / month ($780 billed annually), saving ~18%\n- **Seat Capacity:** Up to 100 team members\n- **Support SLA:** Priority support with a guaranteed 4-hour response SLA (Monday–Friday, 8:00 AM – 8:00 PM EST)\n- **Storage:** 1 TB pooled cloud storage`,
            timestamp: new Date(Date.now() - 3600000 * 2 + 1500).toISOString(),
            grounded: true,
            groundingStatus: 'grounded',
            sources: [
              KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-pricing-pro')!,
              KNOWLEDGE_BASE_CHUNKS.find((c) => c.id === 'src-support-sla')!
            ]
          }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(defaultConvs));
    return defaultConvs;
  }

  // ==========================================
  // 4. GET /conversations/{id}
  // ==========================================
  public async getConversation(id: string): Promise<Conversation> {
    if (this.mode === 'live') {
      return await this.liveFetch<Conversation>(`/conversations/${id}`);
    }

    const convs = await this.getConversations();
    const found = convs.find((c) => c.id === id);
    if (!found) {
      throw new ApiServiceError(`Conversation ${id} not found`, `/conversations/${id}`, 404);
    }
    return found;
  }

  // Save/update conversation in demo mode
  public async saveDemoConversation(conv: Conversation): Promise<void> {
    if (this.mode !== 'demo' || typeof window === 'undefined') return;
    const convs = await this.getConversations();
    const index = convs.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      convs[index] = conv;
    } else {
      convs.unshift(conv);
    }
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  }

  // ==========================================
  // 5. DELETE /conversations/{id}
  // ==========================================
  public async deleteConversation(id: string): Promise<{ success: boolean }> {
    if (this.mode === 'live') {
      return await this.liveFetch<{ success: boolean }>(`/conversations/${id}`, {
        method: 'DELETE'
      });
    }

    if (typeof window !== 'undefined') {
      const convs = await this.getConversations();
      const filtered = convs.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filtered));
    }
    return { success: true };
  }

  // ==========================================
  // 6. POST /admin/documents
  // ==========================================
  public async uploadDocuments(files: File[]): Promise<AdminDocument[]> {
    if (this.mode === 'live') {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));

      const url = `${this.apiBaseUrl}/admin/documents`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          throw new ApiServiceError(
            `Upload failed (${response.status})`,
            '/admin/documents',
            response.status
          );
        }
        return (await response.json()) as AdminDocument[];
      } catch (err: unknown) {
        if (err instanceof ApiServiceError) throw err;
        throw new ApiServiceError(
          `Failed to upload documents to ${url}. Verify backend connectivity.`,
          '/admin/documents',
          undefined,
          true
        );
      }
    }

    // Demo Mode file handling
    const newDocs: AdminDocument[] = files.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const validTypes: Array<AdminDocument['fileType']> = ['pdf', 'txt', 'md', 'docx'];
      const fileType = validTypes.includes(ext as AdminDocument['fileType'])
        ? (ext as AdminDocument['fileType'])
        : 'txt';

      const estimatedChunks = Math.max(8, Math.round(file.size / (1024 * 18)));

      return {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'indexed',
        chunkCount: estimatedChunks,
        lastIndexedAt: new Date().toISOString(),
        processingProgress: 100
      };
    });

    const existing = await this.getAdminDocuments();
    const updated = [...newDocs, ...existing];
    localStorage.setItem(STORAGE_KEYS.ADMIN_DOCS, JSON.stringify(updated));

    // Append log
    const existingLogs = await this.getAdminLogs();
    const newLogs: IngestionLog[] = newDocs.map((d) => ({
      id: `log-${Date.now()}-${d.id}`,
      timestamp: new Date().toISOString(),
      documentId: d.id,
      fileName: d.fileName,
      level: 'info',
      message: `Successfully processed and indexed ${d.chunkCount} semantic chunks into vector store.`
    }));
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify([...newLogs, ...existingLogs]));

    return newDocs;
  }

  // ==========================================
  // 7. GET /admin/documents
  // ==========================================
  public async getAdminDocuments(): Promise<AdminDocument[]> {
    if (this.mode === 'live') {
      return await this.liveFetch<AdminDocument[]>('/admin/documents');
    }

    if (typeof window === 'undefined') return INITIAL_DEMO_DOCS;
    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_DOCS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallback
      }
    }
    localStorage.setItem(STORAGE_KEYS.ADMIN_DOCS, JSON.stringify(INITIAL_DEMO_DOCS));
    return INITIAL_DEMO_DOCS;
  }

  // ==========================================
  // 8. GET /admin/documents/{id}
  // ==========================================
  public async getAdminDocument(id: string): Promise<AdminDocument> {
    if (this.mode === 'live') {
      return await this.liveFetch<AdminDocument>(`/admin/documents/${id}`);
    }

    const docs = await this.getAdminDocuments();
    const found = docs.find((d) => d.id === id);
    if (!found) {
      throw new ApiServiceError(`Document ${id} not found`, `/admin/documents/${id}`, 404);
    }
    return found;
  }

  // ==========================================
  // 9. POST /admin/documents/{id}/reindex
  // ==========================================
  public async reindexDocument(id: string): Promise<AdminDocument> {
    if (this.mode === 'live') {
      return await this.liveFetch<AdminDocument>(`/admin/documents/${id}/reindex`, {
        method: 'POST'
      });
    }

    const docs = await this.getAdminDocuments();
    const doc = docs.find((d) => d.id === id);
    if (!doc) {
      throw new ApiServiceError(`Document ${id} not found`, `/admin/documents/${id}/reindex`, 404);
    }

    doc.status = 'indexed';
    doc.lastIndexedAt = new Date().toISOString();
    doc.processingProgress = 100;
    localStorage.setItem(STORAGE_KEYS.ADMIN_DOCS, JSON.stringify(docs));

    // Append log
    const logs = await this.getAdminLogs();
    logs.unshift({
      id: `log-reindex-${Date.now()}`,
      timestamp: new Date().toISOString(),
      documentId: doc.id,
      fileName: doc.fileName,
      level: 'info',
      message: `Document re-indexed manually. Cleaned embedding cache and updated vector index.`
    });
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(logs));

    return doc;
  }

  // ==========================================
  // 10. DELETE /admin/documents/{id}
  // ==========================================
  public async deleteDocument(id: string): Promise<{ success: boolean }> {
    if (this.mode === 'live') {
      return await this.liveFetch<{ success: boolean }>(`/admin/documents/${id}`, {
        method: 'DELETE'
      });
    }

    const docs = await this.getAdminDocuments();
    const target = docs.find((d) => d.id === id);
    const updated = docs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.ADMIN_DOCS, JSON.stringify(updated));

    if (target) {
      const logs = await this.getAdminLogs();
      logs.unshift({
        id: `log-del-${Date.now()}`,
        timestamp: new Date().toISOString(),
        documentId: id,
        fileName: target.fileName,
        level: 'warning',
        message: `Document and all associated vector chunks purged from index.`
      });
      localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(logs));
    }

    return { success: true };
  }

  // ==========================================
  // 11. POST /feedback
  // ==========================================
  public async submitFeedback(payload: {
    messageId: string;
    conversationId: string;
    feedback: 'helpful' | 'unhelpful';
    comment?: string;
  }): Promise<{ success: boolean }> {
    if (this.mode === 'live') {
      return await this.liveFetch<{ success: boolean }>('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    // Demo mode: local acknowledge
    return { success: true };
  }

  // ==========================================
  // 12. GET /admin/stats
  // ==========================================
  public async getAdminStats(): Promise<KnowledgeStats> {
    if (this.mode === 'live') {
      return await this.liveFetch<KnowledgeStats>('/admin/stats');
    }

    const docs = await this.getAdminDocuments();
    const totalChunks = docs.reduce((acc, d) => acc + (d.status === 'indexed' ? d.chunkCount : 0), 0);

    return {
      totalDocuments: docs.length,
      indexedChunks: totalChunks,
      lastIndexedTime: docs[0]?.lastIndexedAt || new Date().toISOString(),
      systemStatus: 'healthy',
      vectorIndexSizeMb: Number((totalChunks * 0.045).toFixed(2)),
      averageRetrievalLatencyMs: 82
    };
  }

  // Admin Ingestion Logs
  public async getAdminLogs(): Promise<IngestionLog[]> {
    if (typeof window === 'undefined') return INITIAL_DEMO_LOGS;
    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallback
      }
    }
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(INITIAL_DEMO_LOGS));
    return INITIAL_DEMO_LOGS;
  }

  // ==========================================
  // 13. Voice & Speech Methods (STT & TTS)
  // ==========================================

  /**
   * Cleans formatted markdown text for natural speech synthesis.
   * Strips asterisks, backticks, table dividers, raw markdown links, etc.
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      // Replace markdown links [label](url) with just label
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold and italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove header markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet list markers
      .replace(/^\s*[-*]\s+/gm, '')
      // Remove table vertical bars and dashes
      .replace(/\|/g, ', ')
      .replace(/^[-\s:|]+$/gm, '')
      // Collapse multiple whitespace/newlines
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Transcribe recorded audio file using backend STT endpoint:
   * POST /api/v1/speech/transcribe
   * The backend executes Faster-Whisper locally with the English-only `base.en` model,
   * downloaded and cached locally on first load (no Colab or remote STT services).
   */
  public async transcribeAudio(file: Blob | File): Promise<TranscriptionResponse> {
    if (this.mode === 'live') {
      const formData = new FormData();
      formData.append('file', file, 'recording.webm');

      const url = `${this.apiBaseUrl}/speech/transcribe`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout for local inference

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'STT service error');
          throw new ApiServiceError(
            `Transcription error (${response.status}): ${errorText}. Verify local Faster-Whisper (base.en) is running on the backend.`,
            '/speech/transcribe',
            response.status
          );
        }

        const data = await response.json();
        return {
          text: data.text || '',
          language: data.language || 'en',
          duration: data.duration || 0
        };
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof ApiServiceError) throw err;

        const message =
          err instanceof Error && err.name === 'AbortError'
            ? 'Speech transcription timed out. The local Faster-Whisper base.en model may be initializing or host CPU/GPU is busy.'
            : `Failed to connect to local STT service at ${url}. Ensure the backend speech route is reachable.`;

        throw new ApiServiceError(message, '/speech/transcribe', undefined, true);
      }
    }

    // --- DEMO MODE SPEECH-TO-TEXT SIMULATION ---
    await new Promise((resolve) => setTimeout(resolve, 1400)); // realistic whisper inference time

    // Realistic transcribed customer questions in demo mode
    const demoTranscripts = [
      'How much does the Professional plan cost with annual billing?',
      'Can I cancel my subscription and what is your refund policy?',
      'What products do you offer and which plan is right for my business?',
      'Is Northstar SOC 2 and HIPAA compliant?',
      'How do I contact human support for an urgent escalation?'
    ];
    // Deterministic selection based on timestamp
    const selected = demoTranscripts[Math.floor(Date.now() / 2000) % demoTranscripts.length];

    return {
      text: selected,
      language: 'en',
      duration: Math.max(2.5, Number((file.size / (1024 * 16)).toFixed(1)))
    };
  }

  /**
   * Synthesize grounded assistant answer into audio using backend TTS endpoint:
   * POST /speech/synthesize (or /api/v1/speech/synthesize)
   * The backend proxies to Fish Audio S2.1 Pro using server-side credentials.
   */
  public async synthesizeSpeech(
    text: string,
    conversationId?: string,
    voiceId?: string
  ): Promise<{ audioUrl: string }> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      throw new ApiServiceError('Cannot synthesize audio for empty text.', '/speech/synthesize');
    }

    if (this.mode === 'live') {
      const url = `${this.apiBaseUrl}/speech/synthesize`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: cleanText,
            conversation_id: conversationId,
            voice_id: voiceId
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'TTS synthesis error');
          throw new ApiServiceError(
            `Speech synthesis failed (${response.status}): ${errorText}. Verify Fish Audio backend service.`,
            '/speech/synthesize',
            response.status
          );
        }

        const contentType = response.headers.get('content-type') || '';

        // If backend returned raw audio bytes (audio/mpeg, audio/wav, audio/ogg)
        if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          return { audioUrl };
        }

        // If backend returned JSON with audio_url or base64 audio
        const data = await response.json();
        if (data.audio_url) {
          return { audioUrl: data.audio_url };
        } else if (data.audio_base64) {
          return { audioUrl: `data:audio/mp3;base64,${data.audio_base64}` };
        }

        throw new ApiServiceError(
          'Backend speech synthesis did not return a valid audio stream or URL.',
          '/speech/synthesize'
        );
      } catch (err: unknown) {
        clearTimeout(timeout);
        if (err instanceof ApiServiceError) throw err;

        const message =
          err instanceof Error && err.name === 'AbortError'
            ? 'Speech synthesis timed out. The backend or Fish Audio API took longer than 20s.'
            : `Failed to connect to TTS service at ${url}. Ensure the backend speech route is reachable.`;

        throw new ApiServiceError(message, '/speech/synthesize', undefined, true);
      }
    }

    // --- DEMO MODE SPEECH SYNTHESIS SIMULATION ---
    // In demo mode, we provide a clean, playable audio representation.
    // If browser supports SpeechSynthesis, we can synthesize client-side or produce an audio data URL.
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate an audible demo tone/speech buffer using Web Audio API so it plays directly in any browser
    return {
      audioUrl: this.generateDemoAudioBlobUrl()
    };
  }

  /**
   * Helper to generate a lightweight, audible notification beep tone for Demo Mode playback
   */
  private generateDemoAudioBlobUrl(): string {
    try {
      // Create a minimal 1.5s warm synthesized tone buffer encoded as WAV
      const sampleRate = 22050;
      const duration = 1.6;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      // RIFF identifier
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + numSamples * 2, true);
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, numSamples * 2, true);

      // Write soft musical chime (440Hz fading to 554Hz)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const freq = t < 0.8 ? 440 : 554.37;
        const envelope = Math.max(0, 1 - (t % 0.8) / 0.8) * Math.min(1, t * 20);
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.3 * envelope;
        const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        view.setInt16(44 + i * 2, intSample, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch {
      return '';
    }
  }

  /**
   * Retrieve speech service health and inference backend availability:
   * GET /speech/status
   */
  public async getSpeechServiceStatus(): Promise<SpeechServiceStatus> {
    if (this.mode === 'live') {
      try {
        return await this.liveFetch<SpeechServiceStatus>('/speech/status');
      } catch {
        return {
          stt_available: false,
          tts_available: false,
          stt_provider: 'Faster-Whisper (base.en local model)',
          tts_provider: 'Fish Audio S2.1 Pro',
          status: 'offline'
        };
      }
    }

    return {
      stt_available: true,
      tts_available: true,
      stt_provider: 'Faster-Whisper (base.en local model)',
      tts_provider: 'Fish Audio S2.1 Pro',
      status: 'healthy'
    };
  }

  /**
   * Voice Preferences management
   */
  public getVoicePreferences(): VoicePreferences {
    if (typeof window === 'undefined') return DEFAULT_VOICE_PREFERENCES;
    const stored = localStorage.getItem(STORAGE_KEYS.VOICE_PREFERENCES);
    if (stored) {
      try {
        return { ...DEFAULT_VOICE_PREFERENCES, ...JSON.parse(stored) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_VOICE_PREFERENCES;
  }

  public saveVoicePreferences(prefs: VoicePreferences): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.VOICE_PREFERENCES, JSON.stringify(prefs));
  }
}

export const apiService = new NorthstarApiClient();
