import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType, SourceCitation, VoicePreferences } from '../../types';
import { ChatMessage } from './ChatMessage';
import { Loader2, Plus, MessageSquare, ArrowDown } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSelectSource: (source: SourceCitation) => void;
  onFeedback: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
  onEscalate: (query: string) => void;
  onRetry: (failedMessage: ChatMessageType) => void;
  onNewConversation: () => void;
  conversationTitle?: string;
  conversationId?: string;
  voicePreferences?: VoicePreferences;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSelectSource,
  onFeedback,
  onEscalate,
  onRetry,
  onNewConversation,
  conversationTitle,
  conversationId,
  voicePreferences
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setUserHasScrolledUp(distanceToBottom > 80);
  };

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setUserHasScrolledUp(false);
    }
  };

  useEffect(() => {
    if (!userHasScrolledUp) {
      scrollToBottom(true);
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header of Chat Window */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
          <h2 className="text-xs font-semibold text-slate-800 truncate">
            {conversationTitle || 'Current Support Session'}
          </h2>
          <span className="text-slate-400 text-xs">·</span>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <button
          onClick={onNewConversation}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>New Session</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto divide-y divide-slate-100"
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onSelectSource={onSelectSource}
            onFeedback={onFeedback}
            onEscalate={onEscalate}
            onRetry={onRetry}
            voicePreferences={voicePreferences}
            conversationId={conversationId}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-5 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  N
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Retrieving company knowledge and generating grounded response...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom button if user scrolled up */}
      {userHasScrolledUp && (
        <div className="relative">
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-full shadow-md hover:bg-slate-800 transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Scroll to latest</span>
          </button>
        </div>
      )}
    </div>
  );
};
