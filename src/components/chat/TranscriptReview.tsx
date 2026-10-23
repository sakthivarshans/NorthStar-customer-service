import React from 'react';
import { Mic, RotateCcw, X, Check, ArrowRight } from 'lucide-react';

interface TranscriptReviewProps {
  transcript: string;
  onRecordAgain: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const TranscriptReview: React.FC<TranscriptReviewProps> = ({
  transcript,
  onRecordAgain,
  onCancel,
  onSubmit
}) => {
  if (!transcript) return null;

  return (
    <div className="mb-3 p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-950 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-blue-900">
          <Mic className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Local Speech Recognition Complete</span>
          <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
            Faster-Whisper base.en
          </span>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-blue-500 hover:text-blue-900 p-0.5 rounded transition-colors"
          title="Dismiss voice review"
          aria-label="Dismiss transcript"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-blue-800 text-[11px] leading-relaxed">
        Review or edit your question in the composer below before submitting to the RAG support agent.
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-blue-100/70 text-[11px]">
        <button
          type="button"
          onClick={onRecordAgain}
          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium underline underline-offset-2"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Record Again</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 text-slate-600 hover:text-slate-800 rounded hover:bg-blue-100/50 transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-2xs"
          >
            <span>Submit Inquiry</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
