import React from 'react';
import { ActiveTab } from '../../types';
import { ShieldAlert, Activity, Wifi, HelpCircle, Volume2 } from 'lucide-react';

interface TopNavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  mode: 'demo' | 'live';
  onToggleMode: (newMode: 'demo' | 'live') => void;
  onOpenEscalation: () => void;
  backendHealthy: boolean | null;
  onOpenVoicePreferences: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onSelectTab,
  mode,
  onToggleMode,
  onOpenEscalation,
  backendHealthy,
  onOpenVoicePreferences
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('support')}
            className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <span className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              N
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Northstar Support
            </span>
          </button>
        </div>

        {/* Zone 2: Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('support')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'support'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Customer Support
          </button>
          <button
            onClick={() => onSelectTab('products')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'products'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Products & Pricing
          </button>
          <button
            onClick={() => onSelectTab('help')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'help'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Help Center
          </button>
          <button
            onClick={() => onSelectTab('conversations')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'conversations'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => onSelectTab('admin')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'admin'
                ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                : 'hover:text-slate-900'
            }`}
          >
            Knowledge Admin
          </button>
        </nav>

        {/* Zone 3: Primary Action & Mode Controller */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200">
            <button
              onClick={() => onToggleMode('demo')}
              title="Demo Mode: Uses authentic sample knowledge document with local retrieval"
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                mode === 'demo'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demo Mode
            </button>
            <button
              onClick={() => onToggleMode('live')}
              title="Live Mode: Dispatches HTTP requests to configured RAG backend"
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                mode === 'live'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Live API</span>
              {mode === 'live' && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendHealthy ? 'bg-emerald-300' : 'bg-amber-300'
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* Voice Settings button */}
          <button
            onClick={onOpenVoicePreferences}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            title="Configure Speech-to-Text & Text-to-Speech settings"
          >
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Escalate CTA button */}
          <button
            onClick={onOpenEscalation}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Human Support</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <div className="md:hidden flex items-center justify-between overflow-x-auto px-4 py-2 border-t border-slate-100 text-xs gap-3">
        <button
          onClick={() => onSelectTab('support')}
          className={`whitespace-nowrap px-2 py-1 rounded ${
            activeTab === 'support' ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600'
          }`}
        >
          Support
        </button>
        <button
          onClick={() => onSelectTab('products')}
          className={`whitespace-nowrap px-2 py-1 rounded ${
            activeTab === 'products' ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600'
          }`}
        >
          Pricing
        </button>
        <button
          onClick={() => onSelectTab('help')}
          className={`whitespace-nowrap px-2 py-1 rounded ${
            activeTab === 'help' ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600'
          }`}
        >
          Help
        </button>
        <button
          onClick={() => onSelectTab('conversations')}
          className={`whitespace-nowrap px-2 py-1 rounded ${
            activeTab === 'conversations' ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600'
          }`}
        >
          History
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`whitespace-nowrap px-2 py-1 rounded ${
            activeTab === 'admin' ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-600'
          }`}
        >
          Admin
        </button>
      </div>
    </header>
  );
};
