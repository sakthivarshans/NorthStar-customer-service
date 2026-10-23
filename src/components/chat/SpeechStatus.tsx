import React, { useState, useEffect } from 'react';
import { SpeechServiceStatus } from '../../types';
import { apiService } from '../../services/api';
import { CheckCircle2, AlertCircle, RefreshCw, HardDrive, Volume2, Cpu } from 'lucide-react';

interface SpeechStatusProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const SpeechStatus: React.FC<SpeechStatusProps> = ({
  variant = 'compact',
  className = ''
}) => {
  const [status, setStatus] = useState<SpeechServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getSpeechServiceStatus();
      setStatus(res);
    } catch {
      setStatus({
        stt_available: false,
        tts_available: false,
        stt_provider: 'Faster-Whisper (base.en local model)',
        tts_provider: 'Fish Audio S2.1 Pro',
        status: 'offline'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-slate-600 ${className}`}>
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-800">STT: Faster-Whisper (base.en local)</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status?.stt_available ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
        </div>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium text-slate-800">TTS: Fish Audio S2.1 Pro</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status?.tts_available ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span>Speech Engine Status</span>
        </span>
        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px]"
          title="Refresh speech service status"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Check</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
          <div>
            <div className="font-medium text-slate-800">Local STT (Faster-Whisper)</div>
            <div className="text-slate-500 font-mono text-[10px]">base.en model (cached)</div>
          </div>
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              status?.stt_available ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {status?.stt_available ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{status?.stt_available ? 'Ready' : 'Offline'}</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
          <div>
            <div className="font-medium text-slate-800">Fish Audio S2.1 Pro</div>
            <div className="text-slate-500 font-mono text-[10px]">Hosted TTS via Backend</div>
          </div>
          <span
            className={`text-xs font-semibold flex items-center gap-1 ${
              status?.tts_available ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {status?.tts_available ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{status?.tts_available ? 'Ready' : 'Offline'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
