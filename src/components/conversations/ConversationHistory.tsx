import React, { useState, useEffect } from 'react';
import { Conversation } from '../../types';
import { apiService } from '../../services/api';
import { formatDate } from '../../utils/text';
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ArrowRight,
  Database,
  AlertCircle
} from 'lucide-react';

interface ConversationHistoryProps {
  onOpenConversation: (conversation: Conversation) => void;
  onStartNewConversation: () => void;
  currentConversationId?: string;
  mode: 'demo' | 'live';
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onOpenConversation,
  onStartNewConversation,
  currentConversationId,
  mode
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [convToDelete, setConvToDelete] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [mode]);

  const handleDelete = async () => {
    if (!convToDelete) return;
    try {
      await apiService.deleteConversation(convToDelete.id);
      setConvToDelete(null);
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            Support Conversation History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse previous support sessions, audit RAG answers, and resume discussions.
          </p>
        </div>

        <button
          onClick={onStartNewConversation}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Start New Conversation</span>
        </button>
      </div>

      {/* Mode Persistence Notice */}
      <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          <span>
            {mode === 'demo'
              ? 'Stored locally in demo session cache. Permanent server persistence activates in Live API mode.'
              : 'Synced with configured backend database at /conversations.'}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by topic, question, or keyword in past sessions..."
          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
        />
      </div>

      {/* Conversation List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No conversations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No sessions matched "${searchQuery}". Try a different keyword.`
                : 'Start a new support session to ask questions about Northstar products.'}
            </p>
            <button
              onClick={onStartNewConversation}
              className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Start First Conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isCurrent = conv.id === currentConversationId;
            const firstUserMessage = conv.messages.find((m) => m.role === 'user');

            return (
              <div
                key={conv.id}
                className={`bg-white border rounded-xl p-4 transition-all hover:border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  isCurrent ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/20' : 'border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {conv.title}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        Active
                      </span>
                    )}
                  </div>

                  {firstUserMessage && (
                    <p className="text-xs text-slate-500 truncate mb-2">
                      &ldquo;{firstUserMessage.content}&rdquo;
                    </p>
                  )}

                  {/* Metadata unboxed text */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums">
                      {conv.messages.length} messages
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatDate(conv.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onOpenConversation(conv)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
                  >
                    <span>Resume</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConvToDelete(conv)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {convToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6 text-left">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Delete Conversation</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to permanently delete &ldquo;{convToDelete.title}&rdquo;?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConvToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
