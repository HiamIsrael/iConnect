// Minimal OpenAI-compatible chat-completions client with streaming + tool calls.
// Works with OpenAI, OpenRouter, Groq, Together, Ollama (/v1), LM Studio, vLLM, etc.
import { config } from '../config.js';

export class LLMError extends Error {}

function headers() {
  const { llm } = config;
  return {
    'content-type': 'application/json',
    ...(llm.apiKey ? { authorization: `Bearer ${llm.apiKey}` } : {}),
    'HTTP-Referer': 'https://local.skilled-agent',
    'X-Title': 'skilled-agent',
  };
}

/**
 * Stream a chat completion.
 * @returns {Promise<{content:string, toolCalls:Array<{id,name,arguments}>, finishReason:string, usage?:object}>}
 */
export async function chat({ messages, tools = [], onText, signal, model, temperature, maxTokens }) {
  const { llm } = config;
  if (!llm.apiKey && /api\.openai\.com|openrouter|groq|together/.test(llm.baseUrl)) {
    throw new LLMError('No API key configured. Set LLM_API_KEY (or OPENAI_API_KEY) in .env');
  }
  const body = {
    model: model ?? llm.model,
    messages,
    temperature: temperature ?? llm.temperature,
    max_tokens: maxTokens ?? llm.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (tools.length) { body.tools = tools; body.tool_choice = 'auto'; }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('LLM request timed out')), llm.timeoutMs);
  signal?.addEventListener('abort', () => controller.abort(signal.reason));
  const url = `${llm.baseUrl.replace(/\/$/, '')}/chat/completions`;

  try {
    let res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: controller.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 400 && /stream_options/i.test(text)) {
        delete body.stream_options;
        res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: controller.signal });
        if (!res.ok) throw new LLMError(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 2000)}`);
      } else throw new LLMError(`LLM HTTP ${res.status}: ${text.slice(0, 2000)}`);
    }
    return await consumeStream(res, onText);
  } catch (e) {
    if (e instanceof LLMError) throw e;
    throw new LLMError(`LLM request failed: ${e.message}`);
  } finally { clearTimeout(timer); }
}

async function consumeStream(res, onText) {
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('text/event-stream')) {
    const json = await res.json();
    const msg = json.choices?.[0]?.message ?? {};
    return {
      content: msg.content ?? '',
      toolCalls: (msg.tool_calls ?? []).map(tc => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments ?? '' })),
      finishReason: json.choices?.[0]?.finish_reason ?? 'stop',
      usage: json.usage,
    };
  }
  const decoder = new TextDecoder();
  let buffer = '', content = '', finishReason = 'stop', usage;
  const toolCalls = [];
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      let json; try { json = JSON.parse(data); } catch { continue; }
      if (json.usage) usage = json.usage;
      const choice = json.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      if (delta.content) { content += delta.content; onText?.(delta.content); }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0;
          toolCalls[i] ??= { id: '', name: '', arguments: '' };
          if (tc.id) toolCalls[i].id = tc.id;
          if (tc.function?.name) toolCalls[i].name += tc.function.name;
          if (tc.function?.arguments) toolCalls[i].arguments += tc.function.arguments;
        }
      }
      if (choice.finish_reason) finishReason = choice.finish_reason;
    }
  }
  const calls = toolCalls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${Date.now()}_${i}` }));
  return { content, toolCalls: calls, finishReason: calls.length ? 'tool_calls' : finishReason, usage };
}

export async function listModels() {
  const { llm } = config;
  const res = await fetch(`${llm.baseUrl.replace(/\/$/, '')}/models`, { headers: llm.apiKey ? { authorization: `Bearer ${llm.apiKey}` } : {} });
  if (!res.ok) throw new LLMError(`HTTP ${res.status}`);
  return ((await res.json()).data ?? []).map(m => m.id);
}
