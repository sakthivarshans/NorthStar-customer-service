import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, ChatMessage, Conversation, SourceCitation, VoicePreferences } from './types';
import { apiService, ApiServiceError } from './services/api';
import { AppLayout } from './components/layout/AppLayout';
import { SupportHome } from './components/support/SupportHome';
import { ProductCatalogue } from './components/products/ProductCatalogue';
import { HelpCenter } from './components/help/HelpCenter';
import { KnowledgeAdmin } from './components/admin/KnowledgeAdmin';
import { ConversationHistory } from './components/conversations/ConversationHistory';
import { SourceDetailModal } from './components/chat/SourceDetailModal';
import { EscalationModal } from './components/chat/EscalationModal';
import { AudioRecorder } from './components/chat/AudioRecorder';
import { VoiceSettings } from './components/chat/VoiceSettings';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('support');
  const [mode, setMode] = useState<'demo' | 'live'>(apiService.getMode());
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Voice Preferences and Modals
  const [voicePreferences, setVoicePreferences] = useState<VoicePreferences>(
    apiService.getVoicePreferences()
  );
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isVoicePreferencesOpen, setIsVoicePreferencesOpen] = useState(false);
  const [isVoiceTranscribed, setIsVoiceTranscribed] = useState(false);

  // Composer text state (lifted for voice input and external suggestions)
  const [inputText, setInputText] = useState('');

  // Active conversation state
  const [currentConversation, setCurrentConversation] = useState<Conversation>({
    id: `conv-${Date.now()}`,
    title: 'New Support Session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
    messages: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceCitation | null>(null);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationQuery, setEscalationQuery] = useState('');

  // Check health of backend
  const checkHealth = useCallback(async () => {
    if (mode !== 'live') {
      setBackendHealthy(true);
      return;
    }
    setCheckingHealth(true);
    try {
      const res = await apiService.getHealth();
      setBackendHealthy(res.status === 'healthy' || !!res.version);
    } catch {
      setBackendHealthy(false);
    } finally {
      setCheckingHealth(false);
    }
  }, [mode]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleToggleMode = (newMode: 'demo' | 'live') => {
    apiService.setMode(newMode);
    setMode(newMode);
    if (newMode === 'live') {
      checkHealth();
    }
  };

  const handleSaveVoicePreferences = (updated: VoicePreferences) => {
    apiService.saveVoicePreferences(updated);
    setVoicePreferences(updated);
  };

  const handleSendMessage = async (textToSend?: string, opts?: { retryBase?: ChatMessage[] }) => {
    const rawText = textToSend !== undefined ? textToSend : inputText;
    const text = rawText.trim();
    if (!text || isLoading) return;

    // Clear input and voice flag
    setInputText('');
    setIsVoiceTranscribed(false);

    // On retry the user's message is already in the base list: never append it twice.
    const baseMessages = opts?.retryBase ?? currentConversation.messages;
    const userMessage: ChatMessage = opts?.retryBase
      ? baseMessages[baseMessages.length - 1]
      : {
          id: `usr-${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: new Date().toISOString()
        };

    // Determine conversation title if this is first message
    const updatedTitle =
      baseMessages.length <= 1
        ? text.length > 40
          ? `${text.slice(0, 40)}...`
          : text
        : currentConversation.title;

    const updatedMessages = opts?.retryBase ? baseMessages : [...baseMessages, userMessage];

    const updatedConv: Conversation = {
      ...currentConversation,
      title: updatedTitle,
      updatedAt: new Date().toISOString(),
      messageCount: updatedMessages.length,
      messages: updatedMessages
    };

    setCurrentConversation(updatedConv);
    await apiService.saveDemoConversation(updatedConv);
    setIsLoading(true);

    try {
      const response = await apiService.sendChat({
        message: text,
        conversation_id: currentConversation.id,
        user_message_id: userMessage.id
      });

      const assistantMessage: ChatMessage = {
        id: response.message_id || `asst-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources || [],
        grounded: response.grounded,
        groundingStatus:
          response.evidence_status ||
          (response.grounded ? 'grounded' : response.needs_human ? 'uncertain' : 'partial'),
        needsHuman: response.needs_human
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      const finalConv: Conversation = {
        ...updatedConv,
        updatedAt: new Date().toISOString(),
        messageCount: finalMessages.length,
        messages: finalMessages
      };

      setCurrentConversation(finalConv);
      await apiService.saveDemoConversation(finalConv);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiServiceError
          ? err.message
          : 'Failed to process inquiry. Please check connection and retry.';

      const failedAssistantMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        error: true
      };

      const finalMessages = [...updatedMessages, failedAssistantMessage];
      const finalConv: Conversation = {
        ...updatedConv,
        updatedAt: new Date().toISOString(),
        messageCount: finalMessages.length,
        messages: finalMessages
      };

      setCurrentConversation(finalConv);
      await apiService.saveDemoConversation(finalConv);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscribeComplete = (transcript: string, shouldAutoSubmit: boolean) => {
    if (shouldAutoSubmit) {
      handleSendMessage(transcript);
    } else {
      setInputText(transcript);
      setIsVoiceTranscribed(true);
      setActiveTab('support');
    }
  };

  const handleRetry = (failedMessage: ChatMessage) => {
    const msgs = currentConversation.messages;
    const idx = msgs.findIndex((m) => m.id === failedMessage.id);
    if (idx <= 0 || msgs[idx - 1].role !== 'user') return;
    // Drop the failed reply (and anything after it), keep the original user message, ask again.
    handleSendMessage(msgs[idx - 1].content, { retryBase: msgs.slice(0, idx) });
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'unhelpful') => {
    try {
      await apiService.submitFeedback({
        messageId,
        conversationId: currentConversation.id,
        feedback
      });

      const updated = currentConversation.messages.map((m) =>
        m.id === messageId ? { ...m, feedback } : m
      );
      const conv = { ...currentConversation, messages: updated };
      setCurrentConversation(conv);
      await apiService.saveDemoConversation(conv);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Support Session',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
      messages: []
    };
    setCurrentConversation(newConv);
    setInputText('');
    setIsVoiceTranscribed(false);
    setActiveTab('support');
  };

  const handleOpenConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setActiveTab('support');
  };

  const handleAskSupportFromOutside = (question: string) => {
    setActiveTab('support');
    handleSendMessage(question);
  };

  const handleOpenEscalation = (initialQuery?: string) => {
    setEscalationQuery(initialQuery || '');
    setEscalationOpen(true);
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      mode={mode}
      onToggleMode={handleToggleMode}
      onOpenEscalation={() => handleOpenEscalation()}
      backendHealthy={backendHealthy}
      onRefreshHealth={checkHealth}
      checkingHealth={checkingHealth}
      onUrlUpdated={() => checkHealth()}
      onOpenVoicePreferences={() => setIsVoicePreferencesOpen(true)}
    >
      {/* Route Views */}
      {activeTab === 'support' && (
        <SupportHome
          messages={currentConversation.messages}
          isLoading={isLoading}
          inputText={inputText}
          onInputChange={setInputText}
          onSendMessage={handleSendMessage}
          onSelectSource={(src) => setActiveSource(src)}
          onFeedback={handleFeedback}
          onEscalate={(query) => handleOpenEscalation(query)}
          onRetry={handleRetry}
          onNewConversation={handleNewConversation}
          conversationTitle={currentConversation.title}
          conversationId={currentConversation.id}
          isBackendAvailable={mode === 'demo' || !!backendHealthy}
          onNavigateToProducts={() => setActiveTab('products')}
          onNavigateToHelp={() => setActiveTab('help')}
          onStartVoiceRecording={() => setIsVoiceRecorderOpen(true)}
          isVoiceTranscribed={isVoiceTranscribed}
          onClearVoiceFlag={() => setIsVoiceTranscribed(false)}
          voicePreferences={voicePreferences}
          onOpenVoicePreferences={() => setIsVoicePreferencesOpen(true)}
        />
      )}

      {activeTab === 'products' && (
        <ProductCatalogue onAskSupport={handleAskSupportFromOutside} />
      )}

      {activeTab === 'help' && (
        <HelpCenter
          onAskSupport={handleAskSupportFromOutside}
          onOpenEscalation={() => handleOpenEscalation()}
        />
      )}

      {activeTab === 'conversations' && (
        <ConversationHistory
          onOpenConversation={handleOpenConversation}
          onStartNewConversation={handleNewConversation}
          currentConversationId={currentConversation.id}
          mode={mode}
        />
      )}

      {activeTab === 'admin' && <KnowledgeAdmin />}

      {/* Source Citation Excerpt Detail Modal */}
      <SourceDetailModal
        source={activeSource}
        onClose={() => setActiveSource(null)}
      />

      {/* Escalation to Human Support Modal */}
      <EscalationModal
        isOpen={escalationOpen}
        onClose={() => setEscalationOpen(false)}
        initialQuery={escalationQuery}
      />

      {/* Audio Recorder Modal (Local Faster-Whisper base.en) */}
      <AudioRecorder
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onTranscribeComplete={handleVoiceTranscribeComplete}
        voicePreferences={voicePreferences}
      />

      {/* Voice Settings Modal */}
      <VoiceSettings
        isOpen={isVoicePreferencesOpen}
        onClose={() => setIsVoicePreferencesOpen(false)}
        preferences={voicePreferences}
        onSavePreferences={handleSaveVoicePreferences}
      />
    </AppLayout>
  );
}
