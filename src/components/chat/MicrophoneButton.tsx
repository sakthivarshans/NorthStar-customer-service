import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicrophoneButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  onClick,
  disabled = false,
  isRecording = false,
  size = 'md',
  className = '',
  label = 'Voice'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-2.5 py-1.5 text-xs gap-1.5',
    lg: 'px-3.5 py-2 text-sm gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-lg border font-medium transition-all select-none ${
        sizeClasses[size]
      } ${
        isRecording
          ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Speak your inquiry using Local Faster-Whisper (base.en)"
      aria-label="Activate voice input"
    >
      <Mic className={`${iconSizes[size]} text-slate-600 ${isRecording ? 'text-rose-600' : ''}`} />
      {label && <span>{isRecording ? 'Recording...' : label}</span>}
    </button>
  );
};
