import React, { useState, useEffect, useRef } from 'react';
import { AdminDocument, IngestionLog, KnowledgeStats } from '../../types';
import { apiService } from '../../services/api';
import { formatDate, formatBytes } from '../../utils/text';
import {
  UploadCloud,
  FileText,
  RefreshCw,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Lock,
  Layers,
  Database,
  Terminal,
  Info
} from 'lucide-react';

export const KnowledgeAdmin: React.FC = () => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [docToDelete, setDocToDelete] = useState<AdminDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docsData, statsData, logsData] = await Promise.all([
        apiService.getAdminDocuments(),
        apiService.getAdminStats(),
        apiService.getAdminLogs()
      ]);
      setDocuments(docsData);
      setStats(statsData);
      setLogs(logsData);
    } catch (err: unknown) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const validExtensions = ['pdf', 'txt', 'md', 'docx'];
    const maxSizeBytes = 15 * 1024 * 1024; // 15 MB

    const fileList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !validExtensions.includes(ext)) {
        setUploadError(`Unsupported file format "${file.name}". Supported: PDF, TXT, MD, DOCX.`);
        return;
      }
      if (file.size > maxSizeBytes) {
        setUploadError(`File "${file.name}" exceeds maximum allowed size of 15 MB.`);
        return;
      }
      fileList.push(file);
    }

    setIsUploading(true);
    try {
      await apiService.uploadDocuments(fileList);
      await loadData();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReindex = async (docId: string) => {
    try {
      await apiService.reindexDocument(docId);
      await loadData();
    } catch (err) {
      console.error('Reindex error:', err);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await apiService.deleteDocument(docToDelete.id);
      setDocToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.fileType.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AdminDocument['status']) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Indexed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-blue-700 text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 text-xs font-medium">
            <XCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium line-through">
            Deleted
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dev/Security Notice Banner */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold text-amber-950">Development & Administration Console:</strong>{' '}
          This interface controls RAG vector ingestion, embedding pipelines, and semantic chunk indexing. Backend authentication & role-based permissions must be enforced in production deployments.
        </div>
      </div>

      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Knowledge Base Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage grounding documents, chunk ingestion, vector indices, and error logs.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Knowledge Base Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Total Documents
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.totalDocuments}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Active company files</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Indexed Chunks
            </div>
            <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
              {stats.indexedChunks}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Vectorized passages</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Index Size & Latency
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.vectorIndexSizeMb} <span className="text-sm font-normal text-slate-500">MB</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Avg retrieval ~{stats.averageRetrievalLatencyMs}ms
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Pipeline Status
            </div>
            <div className="text-lg font-bold text-emerald-700 capitalize flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{stats.systemStatus}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Last synced: {formatDate(stats.lastIndexedTime)}
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`bg-white border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-600 bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-600 rounded-full flex items-center justify-center mx-auto">
            {isUploading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            ) : (
              <UploadCloud className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
            >
              Click to upload
            </button>
            <span className="text-sm text-slate-600"> or drag and drop files here</span>
          </div>
          <p className="text-xs text-slate-500">
            Supported formats: <strong className="text-slate-700">PDF, TXT, Markdown (.md), DOCX</strong> up to 15 MB each.
          </p>

          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 rounded p-2.5 text-xs text-rose-800 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Document List Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by file name or type..."
              className="w-full bg-white border border-slate-300 rounded px-2.5 pl-9 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            <span className="text-xs text-slate-500 mr-1">Status:</span>
            {(['all', 'indexed', 'processing', 'queued', 'failed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-700">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Uploaded / Indexed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No documents match the current filter.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate max-w-xs">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-slate-500">
                      {doc.fileType}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 tabular-nums">
                      {doc.chunkCount}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                      {formatDate(doc.lastIndexedAt || doc.uploadedAt)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(doc.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReindex(doc.id)}
                          title="Reindex document"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDocToDelete(doc)}
                          title="Delete document"
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion & Error Logs Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">Ingestion & Indexing Logs</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Live processing stream</span>
        </div>

        <div className="bg-slate-950 text-slate-200 rounded-lg p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500 select-none">
                [{formatDate(log.timestamp)}]
              </span>
              <span
                className={`uppercase font-bold text-[10px] px-1 rounded ${
                  log.level === 'error'
                    ? 'bg-rose-900 text-rose-300'
                    : log.level === 'warning'
                    ? 'bg-amber-900 text-amber-300'
                    : 'bg-emerald-950 text-emerald-400'
                }`}
              >
                {log.level}
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 text-left">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Delete Document</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{docToDelete.fileName}</strong>? This will remove all{' '}
              <span className="font-mono">{docToDelete.chunkCount}</span> indexed vector chunks from the RAG knowledge store.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
