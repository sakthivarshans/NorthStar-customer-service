import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Search, X, CornerDownLeft } from 'lucide-react';
import { MicrophoneButton } from './MicrophoneButton';
import { TranscriptReview } from './TranscriptReview';

interface MessageComposerProps {
  input: string;
  onChange: (val: string) => void;
  onSend: (messageText?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  variant?: 'hero' | 'standard';
  onStartVoiceRecording?: () => void;
  isVoiceTranscribed?: boolean;
  onClearVoiceFlag?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  input,
  onChange,
  onSend,
  isLoading,
  disabled = false,
  placeholder = 'Ask a question about Northstar products, pricing, policies, or billing...',
  variant = 'standard',
  onStartVoiceRecording,
  isVoiceTranscribed = false,
  onClearVoiceFlag
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = variant === 'hero' ? 240 : 180;
      const minHeight = variant === 'hero' ? 84 : 52;
      const newHeight = Math.max(minHeight, Math.min(textareaRef.current.scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input, variant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled && input.trim()) {
        onSend();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && !disabled && input.trim()) {
      onSend();
    }
  };

  const handleClear = () => {
    onChange('');
    if (onClearVoiceFlag) onClearVoiceFlag();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const isHero = variant === 'hero';

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative bg-white rounded-xl border transition-all ${
        isHero
          ? 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 shadow-md p-3 sm:p-4'
          : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs p-2.5 sm:p-3'
      }`}
    >
      {/* Transcript Review Banner if recognized via Faster-Whisper base.en */}
      {isVoiceTranscribed && input.trim() && (
        <TranscriptReview
          transcript={input}
          onRecordAgain={() => {
            if (onStartVoiceRecording) onStartVoiceRecording();
          }}
          onCancel={handleClear}
          onSubmit={() => onSend()}
        />
      )}

      {/* Top Search & Query Area */}
      <div className="flex items-start gap-3">
        {isHero && (
          <div className="pt-1.5 pl-1 text-slate-400 shrink-0">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={isHero ? 3 : 2}
            value={input}
            disabled={isLoading || disabled}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed font-sans ${
              isHero ? 'text-base min-h-[80px]' : 'text-sm sm:text-base min-h-[48px]'
            }`}
          />
        </div>

        {/* Clear Button if input has text */}
        {input.trim() && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            title="Clear text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div
        className={`flex items-center justify-between gap-3 pt-2 ${
          isHero ? 'mt-2 border-t border-slate-100' : 'mt-1'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-400 select-none">
          <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          <span className="hidden sm:inline">Press Enter to send</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>Shift+Enter for newline</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Reusable Microphone Button */}
          {onStartVoiceRecording && (
            <MicrophoneButton
              onClick={onStartVoiceRecording}
              disabled={isLoading || disabled}
              size={isHero ? 'lg' : 'md'}
            />
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || disabled || !input.trim()}
            className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all ${
              isHero ? 'px-4 py-2 text-xs sm:text-sm' : 'px-3.5 py-1.5 text-xs'
            } ${
              !input.trim() || isLoading || disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
            aria-label="Send message"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching knowledge...</span>
              </>
            ) : (
              <>
                <span>{isHero ? 'Ask Question' : 'Send'}</span>
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
