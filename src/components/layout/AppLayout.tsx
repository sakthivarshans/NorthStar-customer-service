import React from 'react';
import { ActiveTab } from '../../types';
import { TopNavigation } from './TopNavigation';
import { BackendStatusBanner } from '../common/BackendStatusBanner';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  mode: 'demo' | 'live';
  onToggleMode: (newMode: 'demo' | 'live') => void;
  onOpenEscalation: () => void;
  backendHealthy: boolean | null;
  onRefreshHealth: () => void;
  checkingHealth: boolean;
  onUrlUpdated: (url: string) => void;
  onOpenVoicePreferences: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onSelectTab,
  mode,
  onToggleMode,
  onOpenEscalation,
  backendHealthy,
  onRefreshHealth,
  checkingHealth,
  onUrlUpdated,
  onOpenVoicePreferences
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC] text-slate-900 font-sans">
      {/* Top Navigation */}
      <TopNavigation
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        mode={mode}
        onToggleMode={onToggleMode}
        onOpenEscalation={onOpenEscalation}
        backendHealthy={backendHealthy}
        onOpenVoicePreferences={onOpenVoicePreferences}
      />

      {/* Backend & Mode Diagnostic Banner */}
      <BackendStatusBanner
        mode={mode}
        onSwitchMode={onToggleMode}
        backendHealthy={backendHealthy}
        onRefreshHealth={onRefreshHealth}
        checkingHealth={checkingHealth}
        onUrlUpdated={onUrlUpdated}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Clean Restrained Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Northstar Technologies Inc.</span>
            <span aria-hidden="true">·</span>
            <span>Customer Support Portal</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">SLA: 99.95%</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onSelectTab('products')}
              className="hover:text-slate-800 transition-colors"
            >
              Pricing & Tiers
            </button>
            <button
              onClick={() => onSelectTab('help')}
              className="hover:text-slate-800 transition-colors"
            >
              Policies & Refund Terms
            </button>
            <button
              onClick={onOpenEscalation}
              className="hover:text-blue-600 transition-colors font-medium"
            >
              Escalate to Human
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
