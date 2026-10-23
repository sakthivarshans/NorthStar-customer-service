import React from 'react';
import { SourceCitation } from '../../types';
import { X, FileText, CheckCircle, ExternalLink, Calendar, Hash } from 'lucide-react';

interface SourceDetailModalProps {
  source: SourceCitation | null;
  onClose: () => void;
}

export const SourceDetailModal: React.FC<SourceDetailModalProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-modal-title"
    >
      <div
        className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full p-6 text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 id="source-modal-title" className="text-base font-semibold text-slate-900 leading-snug">
                {source.documentTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{source.section}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close source view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source metadata unboxed text with separators */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 py-3 border-b border-slate-100">
          <span className="font-mono uppercase">{source.documentType}</span>
          <span aria-hidden="true">·</span>
          <span>Relevance: {(source.relevanceScore * 100).toFixed(0)}% match</span>
          <span aria-hidden="true">·</span>
          <span>Updated: {source.lastUpdated}</span>
          {source.chunkId && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-400">Chunk {source.chunkId}</span>
            </>
          )}
        </div>

        {/* Retrieved Excerpt */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Retrieved Text Excerpt
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm text-slate-800 leading-relaxed font-sans select-text">
            {source.excerpt}
          </div>
        </div>

        {/* Grounding note */}
        <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded text-xs text-blue-900 flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Verified Grounded Source:</span> This passage was indexed from Northstar's authoritative company documentation repository and used by the RAG pipeline to ground the assistant's answer.
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
