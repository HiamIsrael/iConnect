import { providerError, unsupported } from '../../errors.js';
import { buildPrompt, parseModelJson } from './prompts.js';

const TIMEOUT_MS = Number(process.env.CREATORDESK_HTTP_TIMEOUT_MS) || 15000;
const signal = () => AbortSignal.timeout(TIMEOUT_MS);

/**
 * OpenAI adapter (chat completions + images) over plain fetch.
 * `fetchImpl` is injectable for tests — no network in CI.
 */
export function createOpenAIProvider(cfg, { fetchImpl = fetch } = {}) {
  const key = cfg?.ai?.openaiKey;
  if (!key) throw new Error('OPENAI_API_KEY is required for the openai provider');
  const model = cfg.ai.openaiModel || 'gpt-4o-mini';
  const imageModel = cfg.ai.openaiImageModel || 'gpt-image-1';

  async function chat(task, context) {
    const { system, user } = buildPrompt(task, context);
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      signal: signal(),
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) throw providerError(`OpenAI request failed (HTTP ${res.status})`);
    const data = await res.json();
    return parseModelJson(data?.choices?.[0]?.message?.content);
  }

  return {
    id: 'openai',
    supportsImages: true,
    complete: chat,
    async generateImage({ prompt }) {
      const res = await fetchImpl('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        signal: signal(),
        body: JSON.stringify({ model: imageModel, prompt, n: 1, size: '1024x1024', response_format: 'b64_json' }),
      });
      if (!res.ok) throw providerError(`OpenAI image request failed (HTTP ${res.status})`);
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw providerError('OpenAI image response missing b64_json');
      return { dataUrl: `data:image/png;base64,${b64}`, mime: 'image/png' };
    },
  };
}

/** Anthropic adapter (messages API, text only). */
export function createAnthropicProvider(cfg, { fetchImpl = fetch } = {}) {
  const key = cfg?.ai?.anthropicKey;
  if (!key) throw new Error('ANTHROPIC_API_KEY is required for the anthropic provider');
  const model = cfg.ai.anthropicModel || 'claude-sonnet-4-5';

  return {
    id: 'anthropic',
    supportsImages: false,
    async complete(task, context) {
      const { system, user } = buildPrompt(task, context);
      const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        signal: signal(),
        body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }),
      });
      if (!res.ok) throw providerError(`Anthropic request failed (HTTP ${res.status})`);
      const data = await res.json();
      return parseModelJson(data?.content?.[0]?.text);
    },
    async generateImage() {
      throw unsupported('The anthropic provider has no image generation model — use openai or gemini for thumbnails');
    },
  };
}

/** Gemini adapter (generateContent + inline image generation). */
export function createGeminiProvider(cfg, { fetchImpl = fetch } = {}) {
  const key = cfg?.ai?.geminiKey;
  if (!key) throw new Error('GEMINI_API_KEY is required for the gemini provider');
  const model = cfg.ai.geminiModel || 'gemini-2.0-flash';
  const base = 'https://generativelanguage.googleapis.com/v1beta/models';

  return {
    id: 'gemini',
    supportsImages: true,
    async complete(task, context) {
      const { system, user } = buildPrompt(task, context);
      const res = await fetchImpl(`${base}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: signal(),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      });
      if (!res.ok) throw providerError(`Gemini request failed (HTTP ${res.status})`);
      const data = await res.json();
      return parseModelJson(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    },
    async generateImage({ prompt }) {
      const res = await fetchImpl(`${base}/gemini-2.0-flash-preview-image-generation:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: signal(),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      });
      if (!res.ok) throw providerError(`Gemini image request failed (HTTP ${res.status})`);
      const data = await res.json();
      const part = (data?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!part) throw providerError('Gemini image response missing inlineData');
      return { dataUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`, mime: part.inlineData.mimeType || 'image/png' };
    },
  };
}
