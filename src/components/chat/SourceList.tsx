import React from 'react';
import { SourceCitation } from '../../types';
import { FileText, ChevronRight } from 'lucide-react';

interface SourceListProps {
  sources: SourceCitation[];
  onSelectSource: (source: SourceCitation) => void;
}

export const SourceList: React.FC<SourceListProps> = ({ sources, onSelectSource }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Sources Consulted ({sources.length})
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => onSelectSource(source)}
            className="flex items-start justify-between gap-2 p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors group"
          >
            <div className="flex items-start gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium text-slate-800 truncate group-hover:text-blue-700">
                  {source.documentTitle}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {source.section}
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
};
