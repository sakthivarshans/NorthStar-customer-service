import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiService, ApiServiceError, parseErrorResponse } from './api';

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const audio = new Blob([new Uint8Array(2000)], { type: 'audio/webm' });

describe('speech API client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    apiService.setMode('live');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('parses {detail, code} error bodies', async () => {
    const r = json({ detail: 'No speech was detected in the recording.', code: 'no_speech_detected' }, 422);
    expect(await parseErrorResponse(r)).toEqual({ message: 'No speech was detected in the recording.', code: 'no_speech_detected' });
  });

  it('returns trimmed transcript and metadata on success', async () => {
    fetchMock.mockResolvedValue(json({ text: '  How much is Professional?  ', language: 'en', duration: 2.1, model: 'base.en', inference_time_ms: 420 }));
    const res = await apiService.transcribeAudio(audio);
    expect(res.text).toBe('How much is Professional?');
    expect(res.model).toBe('base.en');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/speech\/transcribe$/);
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob);
  });

  it('surfaces backend transcription errors with their code (no raw JSON in the message)', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'The audio could not be decoded. It may be corrupted.', code: 'invalid_audio' }, 422));
    const err = await apiService.transcribeAudio(audio).catch((e) => e);
    expect(err).toBeInstanceOf(ApiServiceError);
    expect(err.code).toBe('invalid_audio');
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe('The audio could not be decoded. It may be corrupted.');
  });

  it('reports model-not-ready (503) clearly', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'The Whisper model is not cached and could not be downloaded.', code: 'stt_model_download_failed' }, 503));
    const err = await apiService.transcribeAudio(audio).catch((e) => e);
    expect(err.code).toBe('stt_model_download_failed');
  });

  it('flags network failure as isNetworkError', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const err = await apiService.transcribeAudio(audio).catch((e) => e);
    expect(err.isNetworkError).toBe(true);
    expect(err.message).toMatch(/Could not reach the backend/);
  });

  it('carries Retry-After on rate limits', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'Transcription is busy.', code: 'stt_busy' }, 429, { 'retry-after': '5' }));
    const err = await apiService.transcribeAudio(audio).catch((e) => e);
    expect(err.retryAfterSeconds).toBe(5);
  });

  it('never fabricates a transcript in demo mode', async () => {
    apiService.setMode('demo');
    const err = await apiService.transcribeAudio(audio).catch((e) => e);
    expect(err.code).toBe('demo_mode');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('synthesize sends raw answer text and omits the default voice', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([73, 68, 51, 0, 0]), { headers: { 'content-type': 'audio/mpeg' } }));
    const out = await apiService.synthesizeSpeech('**Professional** is $12.', 'conv-1', 'default');
    expect(out.audioUrl).toMatch(/^blob:/);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ text: '**Professional** is $12.', conversation_id: 'conv-1' });
  });

  it('synthesize rejects non-audio and keeps the error separate from the answer', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const err = await apiService.synthesizeSpeech('hello', 'c').catch((e) => e);
    expect(err.code).toBe('bad_content_type');
    fetchMock.mockResolvedValue(json({ detail: 'The speech provider timed out.', code: 'tts_timeout' }, 504));
    expect((await apiService.synthesizeSpeech('hello', 'c').catch((e) => e)).code).toBe('tts_timeout');
  });

  it('speech status falls back to offline when the backend is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('down'));
    const st = await apiService.getSpeechServiceStatus();
    expect(st.status).toBe('offline');
    expect(st.stt_available).toBe(false);
  });
});

import { consumeAutoSpeak, markAutoSpeak } from './autoSpeak';
import { DEFAULT_VOICE_PREFERENCES } from './api';

describe('auto-speak', () => {
  it('is on by default for voice replies', () => {
    expect(DEFAULT_VOICE_PREFERENCES.autoPlayResponses).toBe(true);
    expect(DEFAULT_VOICE_PREFERENCES.voiceResponsesEnabled).toBe(true);
  });

  it('speaks only the freshly arrived message, and only once', () => {
    markAutoSpeak('asst-new');
    expect(consumeAutoSpeak('asst-old')).toBe(false); // history never auto-plays
    expect(consumeAutoSpeak('asst-new')).toBe(true);
    expect(consumeAutoSpeak('asst-new')).toBe(false); // not again on re-render
    expect(consumeAutoSpeak(undefined)).toBe(false);
  });
});


describe('cancellation', () => {
  it('aborting the signal cancels the request and reports code "aborted" (not a network error)', async () => {
    apiService.setMode('live');
    const ctrl = new AbortController();
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const p = apiService.transcribeAudio(new Blob([new Uint8Array(500)], { type: 'audio/webm' }), ctrl.signal).catch((e) => e);
    ctrl.abort();
    const err = await p;
    expect(err.code).toBe('aborted');
    expect(err.isNetworkError).toBe(false);
    vi.unstubAllGlobals();
  });
});
