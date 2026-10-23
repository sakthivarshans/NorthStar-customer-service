import React, { useState, useEffect, useRef } from 'react';
import { RecordingState, TranscriptionResponse, VoicePreferences } from '../../types';
import { apiService, ApiServiceError } from '../../services/api';
import {
  Mic,
  Square,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle,
  HardDrive
} from 'lucide-react';

interface AudioRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscribeComplete: (text: string, shouldAutoSubmit: boolean) => void;
  voicePreferences: VoicePreferences;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  isOpen,
  onClose,
  onTranscribeComplete,
  voicePreferences
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const maxSeconds = voicePreferences.maxRecordingSeconds || 60;

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  useEffect(() => {
    if (isOpen && state === 'idle') {
      startRecordingFlow();
    }
    if (!isOpen) {
      cleanupMedia();
      setState('idle');
      setErrorMessage(null);
      setElapsedSeconds(0);
    }
  }, [isOpen]);

  const cleanupMedia = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startRecordingFlow = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordedBlob(null);
    setElapsedSeconds(0);

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setState('failed');
      setErrorMessage(
        'Voice recording is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.'
      );
      return;
    }

    setState('requesting_permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Select supported audio mimeType
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: supportedMime || 'audio/webm'
        });
        setRecordedBlob(audioBlob);

        // If user cancelled, don't upload
        if (state !== 'cancelled') {
          handleUploadAndTranscribe(audioBlob);
        }
      };

      recorder.start(250); // timeslice 250ms
      setState('recording');

      // Start elapsed timer
      let seconds = 0;
      timerIntervalRef.current = window.setInterval(() => {
        seconds += 1;
        setElapsedSeconds(seconds);
        if (seconds >= maxSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (err: unknown) {
      setState('failed');
      const msg =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? 'Microphone access was denied. Please allow microphone permissions in your browser to speak your question.'
          : 'Unable to access microphone. Please check your system audio settings.';
      setErrorMessage(msg);
      cleanupMedia();
    }
  };

  const stopRecording = () => {
    if (state !== 'recording') return;
    setState('stopping');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleCancel = () => {
    setState('cancelled');
    cleanupMedia();
    onClose();
  };

  const handleUploadAndTranscribe = async (blob: Blob) => {
    if (blob.size < 100) {
      setState('failed');
      setErrorMessage('No audio captured. Please speak clearly into your microphone.');
      return;
    }

    // Check size limit: 10 MB
    if (blob.size > 10 * 1024 * 1024) {
      setState('failed');
      setErrorMessage('Recorded audio file is too large (max 10MB). Please record a shorter message.');
      return;
    }

    setState('uploading');
    setTimeout(() => {
      setState('transcribing');
    }, 400);

    try {
      const response: TranscriptionResponse = await apiService.transcribeAudio(blob);
      if (!response.text || !response.text.trim()) {
        setState('failed');
        setErrorMessage(
          'Could not recognise customer speech in recording. Please try speaking again closer to the microphone.'
        );
        return;
      }

      setState('ready');
      onTranscribeComplete(response.text.trim(), voicePreferences.autoSubmitTranscript);
      onClose();
    } catch (err: unknown) {
      setState('failed');
      const msg =
        err instanceof ApiServiceError
          ? err.message
          : 'Failed to transcribe audio. Ensure local Faster-Whisper backend service is running.';
      setErrorMessage(msg);
    }
  };

  const handleRetry = () => {
    if (recordedBlob && state === 'failed') {
      handleUploadAndTranscribe(recordedBlob);
    } else {
      startRecordingFlow();
    }
  };

  if (!isOpen) return null;

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-recorder-title"
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 id="audio-recorder-title" className="text-sm font-bold text-slate-900">
                Local Voice Input (STT)
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-400" />
                <span>Faster-Whisper (base.en cached on host)</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close audio recorder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content States */}
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
          {/* REQUESTING PERMISSION */}
          {state === 'requesting_permission' && (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Requesting Microphone Access</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Please click &ldquo;Allow&rdquo; on the browser microphone permission prompt.
                </p>
              </div>
            </div>
          )}

          {/* RECORDING ACTIVE */}
          {state === 'recording' && (
            <div className="space-y-4 w-full">
              {/* Pulsing Visualizer Indicator */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <Mic className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Sound Bars Simulation */}
              <div className="flex items-center justify-center gap-1.5 h-6">
                {[12, 24, 18, 32, 20, 28, 14, 26, 16].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${Math.max(6, (h * (elapsedSeconds % 3 + 1)) / 3)}px` }}
                    className="w-1 bg-blue-600 rounded-full transition-all duration-200"
                  />
                ))}
              </div>

              {/* Timer & Limits */}
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {formatTimer(elapsedSeconds)}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {formatTimer(maxSeconds)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Speak your question clearly. The English-only base.en model will transcribe it locally.
                </p>
              </div>
            </div>
          )}

          {/* UPLOADING / TRANSCRIBING */}
          {(state === 'stopping' || state === 'uploading' || state === 'transcribing') && (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  {state === 'uploading' ? 'Sending Audio to Backend' : 'Transcribing Speech'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Local Faster-Whisper (base.en) processing audio...
                </p>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {state === 'failed' && (
            <div className="space-y-3 w-full">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Voice Input Issue</h4>
                <p className="text-xs text-rose-700 mt-1 px-4 text-center leading-relaxed">
                  {errorMessage || 'Failed to capture or transcribe voice recording.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {state === 'recording' && (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-xs"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Done Recording</span>
              </button>
            )}

            {state === 'failed' && (
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
