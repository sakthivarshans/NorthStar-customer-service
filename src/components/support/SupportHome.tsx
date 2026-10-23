import React from 'react';
import { ChatMessage, SourceCitation, VoicePreferences } from '../../types';
import { SuggestedQuestions } from '../chat/SuggestedQuestions';
import { MessageComposer } from '../chat/MessageComposer';
import { ChatWindow } from '../chat/ChatWindow';

interface SupportHomeProps {
  messages: ChatMessage[];
  isLoading: boolean;
  inputText: string;
  onInputChange: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onSelectSource: (source: SourceCitation) => void;
  onFeedback: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
  onEscalate: (query: string) => void;
  onRetry: (failedMessage: ChatMessage) => void;
  onNewConversation: () => void;
  conversationTitle?: string;
  conversationId?: string;
  isBackendAvailable: boolean;
  onNavigateToProducts: () => void;
  onNavigateToHelp: () => void;
  onStartVoiceRecording: () => void;
  isVoiceTranscribed: boolean;
  onClearVoiceFlag: () => void;
  voicePreferences: VoicePreferences;
  onOpenVoicePreferences: () => void;
}

export const SupportHome: React.FC<SupportHomeProps> = ({
  messages,
  isLoading,
  inputText,
  onInputChange,
  onSendMessage,
  onSelectSource,
  onFeedback,
  onEscalate,
  onRetry,
  onNewConversation,
  conversationTitle,
  conversationId,
  isBackendAvailable,
  onNavigateToProducts,
  onNavigateToHelp,
  onStartVoiceRecording,
  isVoiceTranscribed,
  onClearVoiceFlag,
  voicePreferences
}) => {
  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner / Hero Header */}
      {!hasMessages ? (
        <div className="my-auto py-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            {/* Service Availability Indicator */}
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full mb-4 shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                aria-hidden="true"
              />
              <span className="font-medium text-slate-700">
                {isBackendAvailable ? 'Support Service Active' : 'Support Service Reconnecting'}
              </span>
              <span aria-hidden="true">·</span>
              <span>STT & TTS Enabled</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3 font-display">
              How can we help?
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
              Ask questions by typing or speaking. Northstar retrieves grounded documentation to answer questions about products, plans, billing, and policies.
            </p>
          </div>

          {/* Centered Spacious Composer with Voice Input */}
          <div className="max-w-3xl mx-auto mb-8">
            <MessageComposer
              variant="hero"
              input={inputText}
              onChange={onInputChange}
              onSend={handleSend}
              isLoading={isLoading}
              onStartVoiceRecording={onStartVoiceRecording}
              isVoiceTranscribed={isVoiceTranscribed}
              onClearVoiceFlag={onClearVoiceFlag}
              placeholder="Type or click 'Voice' to speak your inquiry (e.g. How much does the Professional plan cost with annual billing?)..."
            />
          </div>

          {/* Suggested Questions */}
          <div className="max-w-3xl mx-auto mb-10">
            <SuggestedQuestions
              onSelectQuestion={(q) => handleSend(q)}
              disabled={isLoading}
            />
          </div>

          {/* Quick links to Products & Help */}
          <div className="max-w-3xl mx-auto pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onNavigateToProducts}
              className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-left transition-colors group"
            >
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                Explore Catalog
              </div>
              <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                Products & Pricing Comparison &rarr;
              </div>
              <p className="text-xs text-slate-500 mt-1">
                View Starter, Professional, and Enterprise tiers with full feature matrices.
              </p>
            </button>

            <button
              onClick={onNavigateToHelp}
              className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-left transition-colors group"
            >
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Knowledge Base
              </div>
              <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                Help Center & FAQs &rarr;
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Browse official policies, refund rules, and SLA incident response commitments.
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* Conversation Mode */
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSelectSource={onSelectSource}
            onFeedback={onFeedback}
            onEscalate={onEscalate}
            onRetry={onRetry}
            onNewConversation={onNewConversation}
            conversationTitle={conversationTitle}
            conversationId={conversationId}
            voicePreferences={voicePreferences}
          />

          {/* Bottom Sticky Composer with Voice Input */}
          <div className="pt-2">
            <MessageComposer
              variant="standard"
              input={inputText}
              onChange={onInputChange}
              onSend={handleSend}
              isLoading={isLoading}
              onStartVoiceRecording={onStartVoiceRecording}
              isVoiceTranscribed={isVoiceTranscribed}
              onClearVoiceFlag={onClearVoiceFlag}
              placeholder="Ask a follow-up question, or click Voice to speak..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
