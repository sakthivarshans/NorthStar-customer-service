import React, { useState, useRef, useEffect } from 'react';
import { apiService, ApiServiceError } from '../../services/api';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AudioPlayerProps {
  text: string;
  conversationId?: string;
  autoPlay?: boolean;
  voiceResponsesEnabled?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  conversationId,
  autoPlay = false,
  voiceResponsesEnabled = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // If autoPlay is enabled and voice responses are enabled, synthesize and play
    if (autoPlay && voiceResponsesEnabled && !audioUrl && !isLoading && !errorMessage) {
      handlePlay();
    }
  }, [autoPlay, voiceResponsesEnabled]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlay = async () => {
    setErrorMessage(null);

    // If audio already loaded, toggle play/pause
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    // Synthesize audio from backend
    setIsLoading(true);
    try {
      const response = await apiService.synthesizeSpeech(text, conversationId);
      setAudioUrl(response.audioUrl);
      setIsLoading(false);

      // Give React a tick to mount audio element
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            setIsPlaying(false);
          });
        }
      }, 50);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg =
        err instanceof ApiServiceError
          ? err.message
          : 'Failed to synthesize speech. Ensure backend TTS endpoint is operational.';
      setErrorMessage(msg);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      });
    } else {
      handlePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!voiceResponsesEnabled) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => {
            setErrorMessage('Audio playback error occurred.');
            setIsPlaying(false);
          }}
          className="hidden"
        />
      )}

      {errorMessage ? (
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded p-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => handlePlay()}
            className="text-xs font-semibold text-rose-800 underline hover:text-rose-950 shrink-0"
          >
            Retry
          </button>
        </div>
      ) : !audioUrl && !isLoading ? (
        /* Initial Play Button State */
        <button
          onClick={handlePlay}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 transition-colors group"
          title="Listen to this grounded answer (Fish Audio S2.1 Pro)"
        >
          <Volume2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
          <span className="font-medium">Listen to Answer</span>
          <span className="text-[10px] text-slate-400 font-mono">(TTS)</span>
        </button>
      ) : isLoading ? (
        /* Loading Synthesis State */
        <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Generating voice audio with Fish Audio S2.1 Pro...</span>
        </div>
      ) : (
        /* Full Audio Controller Strip */
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-md">
          {/* Play / Pause Toggle */}
          <button
            onClick={handlePlay}
            className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-2xs"
            aria-label={isPlaying ? 'Pause speech audio' : 'Play speech audio'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Stop audio"
            aria-label="Stop audio"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Replay Button */}
          <button
            onClick={handleReplay}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Replay from start"
            aria-label="Replay audio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Progress / Seek bar */}
          <div className="flex-1 flex items-center gap-2 min-w-[100px]">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              aria-label="Audio progress slider"
            />
            <span className="text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Fish Audio S2.1
          </span>
        </div>
      )}
    </div>
  );
};
