import React, { useState } from 'react';
import { apiService, DEFAULT_API_BASE_URL } from '../../services/api';
import { AlertCircle, CheckCircle2, RefreshCw, Settings, Info } from 'lucide-react';

interface BackendStatusBannerProps {
  mode: 'demo' | 'live';
  onSwitchMode: (mode: 'demo' | 'live') => void;
  backendHealthy: boolean | null;
  onRefreshHealth: () => void;
  checkingHealth: boolean;
  onUrlUpdated: (url: string) => void;
}

export const BackendStatusBanner: React.FC<BackendStatusBannerProps> = ({
  mode,
  onSwitchMode,
  backendHealthy,
  onRefreshHealth,
  checkingHealth,
  onUrlUpdated
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(apiService.getApiBaseUrl());

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.setApiBaseUrl(customUrl);
    onUrlUpdated(customUrl);
    setShowConfig(false);
    onRefreshHealth();
  };

  const handleResetUrl = () => {
    setCustomUrl(DEFAULT_API_BASE_URL);
    apiService.setApiBaseUrl(DEFAULT_API_BASE_URL);
    onUrlUpdated(DEFAULT_API_BASE_URL);
    setShowConfig(false);
    onRefreshHealth();
  };

  return (
    <div className="bg-slate-100/90 border-b border-slate-200 text-xs text-slate-600 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mode === 'demo' ? (
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-semibold text-slate-900">Demo Mode Active:</span>
              <span>
                Simulated RAG engine using authentic Northstar company documentation. Citations and grounding are fully functional.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-semibold text-slate-900">Live Backend API:</span>
              <span className="font-mono text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                {apiService.getApiBaseUrl()}
              </span>
              <span aria-hidden="true">·</span>
              {checkingHealth ? (
                <span className="text-slate-500">Pinging /health...</span>
              ) : backendHealthy ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="text-amber-700 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Backend unreachable (run local server or switch to Demo)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'live' && (
            <>
              <button
                onClick={onRefreshHealth}
                disabled={checkingHealth}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                title="Test /health endpoint"
              >
                <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>Configure URL</span>
              </button>
            </>
          )}

          {mode === 'live' && !backendHealthy && !checkingHealth && (
            <button
              onClick={() => onSwitchMode('demo')}
              className="text-xs text-blue-700 font-semibold underline underline-offset-2 hover:text-blue-900"
            >
              Switch to Demo Mode
            </button>
          )}

          {mode === 'demo' && (
            <button
              onClick={() => onSwitchMode('live')}
              className="text-xs text-blue-700 font-semibold underline underline-offset-2 hover:text-blue-900"
            >
              Connect to Live API
            </button>
          )}
        </div>
      </div>

      {showConfig && mode === 'live' && (
        <div className="mt-3 pt-3 border-t border-slate-200 max-w-xl">
          <form onSubmit={handleSaveUrl} className="flex items-center gap-2">
            <label htmlFor="backend-url" className="text-slate-700 font-medium shrink-0">
              Backend Base URL:
            </label>
            <input
              id="backend-url"
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="http://localhost:8000/api/v1"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleResetUrl}
              className="px-2 py-1 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition-colors"
            >
              Reset
            </button>
          </form>
          <p className="mt-1 text-[11px] text-slate-500">
            Expects endpoints: <code>/health</code>, <code>/chat</code>, <code>/speech/transcribe</code> (Faster-Whisper base.en), <code>/speech/synthesize</code> (Fish Audio S2.1), <code>/admin/documents</code>.
          </p>
        </div>
      )}
    </div>
  );
};
