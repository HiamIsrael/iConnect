// Voice: speech-to-text via any OpenAI-compatible /audio/transcriptions endpoint (OpenAI Whisper, Groq whisper-large-v3,
// local faster-whisper-server, etc.). Text-to-speech via /audio/speech when available.
// Env: STT_BASE_URL / STT_API_KEY / STT_MODEL (default: reuse LLM_* with model "whisper-1"); TTS_BASE_URL / TTS_API_KEY / TTS_MODEL / TTS_VOICE
import { config } from './config.js';

const stt = () => ({
  baseUrl: (process.env.STT_BASE_URL ?? config.llm.baseUrl).replace(/\/$/, ''),
  apiKey: process.env.STT_API_KEY ?? config.llm.apiKey,
  model: process.env.STT_MODEL ?? 'whisper-1',
});

export const sttConfigured = () => !!(process.env.STT_BASE_URL || config.llm.apiKey);

export async function transcribeAudio(buffer, filename = 'audio.webm', mime = 'application/octet-stream') {
  const { baseUrl, apiKey, model } = stt();
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), filename);
  form.append('model', model);
  const res = await fetch(`${baseUrl}/audio/transcriptions`, { method: 'POST', headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {}, body: form });
  if (!res.ok) throw new Error(`STT HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return ((await res.json()).text ?? '').trim();
}

export async function synthesizeSpeech(text) {
  const baseUrl = (process.env.TTS_BASE_URL ?? config.llm.baseUrl).replace(/\/$/, '');
  const apiKey = process.env.TTS_API_KEY ?? config.llm.apiKey;
  const res = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model: process.env.TTS_MODEL ?? 'tts-1', voice: process.env.TTS_VOICE ?? 'alloy', input: text.slice(0, 4000), response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
