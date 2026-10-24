import React, { useState, useEffect } from 'react';
import { VoicePreferences } from '../../types';
import { apiService } from '../../services/api';
import { SpeechStatus } from './SpeechStatus';
import { X, Sliders, Volume2, Mic, Clock, Save } from 'lucide-react';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: VoicePreferences;
  onSavePreferences: (updated: VoicePreferences) => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences
}) => {
  const [formData, setFormData] = useState<VoicePreferences>(preferences);
  const [voices, setVoices] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    apiService.getSpeechServiceStatus().then((st) => setVoices(st.approved_voices ?? []));
  }, [isOpen]);

  useEffect(() => {
    setFormData(preferences);
  }, [preferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
    >
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="voice-settings-title" className="text-sm font-bold text-slate-900">
                Voice Settings
              </h3>
              <p className="text-[11px] text-slate-500">
                Local Faster-Whisper (base.en) & Fish Audio S2.1 Pro TTS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close voice settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Speech Service Status Widget */}
        <div className="my-4">
          <SpeechStatus variant="full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Voice Responses Toggle */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <div>
              <label htmlFor="settings-voice-responses" className="font-semibold text-slate-900 block cursor-pointer">
                Enable Voice Responses (TTS)
              </label>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Displays the audio playback bar on grounded assistant responses.
              </p>
            </div>
            <input
              id="settings-voice-responses"
              type="checkbox"
              checked={formData.voiceResponsesEnabled}
              onChange={(e) =>
                setFormData({ ...formData, voiceResponsesEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-1 cursor-pointer"
            />
          </div>

          {/* Auto-play Responses Toggle */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <div>
              <label htmlFor="settings-auto-play" className="font-semibold text-slate-900 block cursor-pointer">
                Automatically Play Spoken Responses
              </label>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Automatically plays synthesized audio when a new assistant message arrives (defaults to off).
              </p>
            </div>
            <input
              id="settings-auto-play"
              type="checkbox"
              checked={formData.autoPlayResponses}
              onChange={(e) =>
                setFormData({ ...formData, autoPlayResponses: e.target.checked })
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-1 cursor-pointer"
            />
          </div>

          {/* Preferred Voice Selection */}
          <div>
            <label htmlFor="settings-preferred-voice" className="block font-semibold text-slate-800 mb-1">
              Preferred Voice (Fish Audio)
            </label>
            <select
              id="settings-preferred-voice"
              value={formData.preferredVoiceId}
              onChange={(e) =>
                setFormData({ ...formData, preferredVoiceId: e.target.value })
              }
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="default">Provider default voice</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Max Recording Duration */}
          <div>
            <label htmlFor="settings-max-duration" className="block font-semibold text-slate-800 mb-1">
              Maximum Recording Duration (Local STT)
            </label>
            <select
              id="settings-max-duration"
              value={formData.maxRecordingSeconds}
              onChange={(e) =>
                setFormData({ ...formData, maxRecordingSeconds: Number(e.target.value) })
              }
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value={30}>30 Seconds (Quick Question)</option>
              <option value={60}>60 Seconds (Standard - Recommended)</option>
              <option value={120}>120 Seconds (Extended Inquiry)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Voice Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
