import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, SourceCitation, VoicePreferences } from '../../types';
import { SourceList } from './SourceList';
import { AudioPlayer } from './AudioPlayer';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Headphones,
  User,
  RotateCcw
} from 'lucide-react';
import { formatDate } from '../../utils/text';

interface ChatMessageProps {
  message: ChatMessageType;
  onSelectSource: (source: SourceCitation) => void;
  onFeedback: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
  onEscalate: (query: string) => void;
  onRetry?: (failedMessage: ChatMessageType) => void;
  voicePreferences?: VoicePreferences;
  conversationId?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onSelectSource,
  onFeedback,
  onEscalate,
  onRetry,
  voicePreferences,
  conversationId
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isUser = message.role === 'user';

  // Render formatted markdown-like text safely without dangerouslySetInnerHTML
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // List items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().slice(2);
        return (
          <li key={i} className="ml-4 list-disc text-slate-800 my-1 leading-relaxed">
            {renderInlineMarkdown(itemText)}
          </li>
        );
      }

      // Numbered lists
      const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        return (
          <li key={i} className="ml-4 list-decimal text-slate-800 my-1 leading-relaxed">
            {renderInlineMarkdown(numberedMatch[2])}
          </li>
        );
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }

      // Normal paragraph line
      return (
        <p key={i} className="my-1 text-slate-800 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Helper for inline bold, inline code
  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="font-mono text-xs bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`py-4 ${isUser ? 'bg-slate-50/50' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-start gap-3">
          {/* Avatar Icon */}
          <div
            className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-semibold select-none ${
              isUser
                ? 'bg-slate-200 text-slate-700'
                : 'bg-slate-900 text-white shadow-xs'
            }`}
          >
            {isUser ? <User className="w-4 h-4" /> : 'N'}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header: Sender & unboxed metadata */}
            <div className="flex items-center justify-between gap-2 mb-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {isUser ? 'You' : 'Northstar Assistant'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {formatDate(message.timestamp)}
                </span>
              </div>

              {/* Error badge or copy action */}
              {!isUser && !message.error && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                    title="Copy response"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Error state */}
            {message.error ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unable to receive answer from support service.</span>
                </div>
                <p className="text-amber-800">{message.content}</p>
                {onRetry && (
                  <button
                    onClick={() => onRetry(message)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Request</span>
                  </button>
                )}
              </div>
            ) : (
              /* Message Content */
              <div className="text-sm text-slate-800 font-sans">
                {renderFormattedContent(message.content)}
              </div>
            )}

            {/* Grounding & Evidence Status (assistant only) */}
            {!isUser && !message.error && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {message.groundingStatus === 'grounded' && (
                  <div className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Based on company documentation</span>
                  </div>
                )}
                {message.groundingStatus === 'partial' && (
                  <div className="inline-flex items-center gap-1 text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Some details could not be verified</span>
                  </div>
                )}
                {message.groundingStatus === 'uncertain' && (
                  <div className="inline-flex items-center gap-1 text-slate-600 font-medium">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Human support recommended</span>
                  </div>
                )}

                {/* Offer human escalation button if recommended */}
                {message.needsHuman && (
                  <button
                    onClick={() => onEscalate(message.content)}
                    className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium underline underline-offset-2 ml-1"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Escalate to Human Agent</span>
                  </button>
                )}
              </div>
            )}

            {/* Source Citations */}
            {!isUser && !message.error && message.sources && message.sources.length > 0 && (
              <SourceList sources={message.sources} onSelectSource={onSelectSource} />
            )}

            {/* Audio Speech Playback (Fish Audio S2.1 Pro Free TTS) */}
            {!isUser && !message.error && (
              <AudioPlayer
                text={message.content}
                conversationId={conversationId}
                messageId={message.id}
                autoPlay={voicePreferences?.autoPlayResponses}
                voiceResponsesEnabled={voicePreferences?.voiceResponsesEnabled}
              />
            )}

            {/* Feedback controls (Helpful / Not Helpful) */}
            {!isUser && !message.error && (
              <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Was this helpful?</span>
                  <button
                    onClick={() => onFeedback(message.id, 'helpful')}
                    className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                      message.feedback === 'helpful' ? 'text-blue-600 font-medium' : 'hover:text-slate-700'
                    }`}
                    title="Mark helpful"
                    aria-label="Helpful"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, 'unhelpful')}
                    className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                      message.feedback === 'unhelpful' ? 'text-amber-600 font-medium' : 'hover:text-slate-700'
                    }`}
                    title="Mark unhelpful"
                    aria-label="Not helpful"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  {message.feedback && (
                    <span className="text-[11px] text-slate-500 italic ml-1">
                      Thanks for your feedback
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
