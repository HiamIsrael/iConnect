// The agent loop: system prompt + history → LLM → tool calls → repeat until a final answer.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { chat } from './llm/openai.js';
import { buildSystemPrompt } from './prompt.js';
import { toolDefinitions, getTool } from './tools/index.js';

export class Agent {
  constructor({ role = 'primary', extra = '', maxIterations, sessionId, approve, depth = 0, toolFilter } = {}) {
    this.role = role; this.extra = extra; this.depth = depth;
    this.maxIterations = maxIterations ?? config.agent.maxIterations;
    this.sessionId = sessionId ?? null;
    this.approve = approve; this.toolFilter = toolFilter;
    this.history = [];
    this.usage = { prompt_tokens: 0, completion_tokens: 0 };
    if (this.sessionId) this.loadSession();
  }

  get sessionFile() { return path.join(config.paths.sessions, `${this.sessionId}.json`); }
  loadSession() { try { this.history = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8')).history ?? []; } catch { this.history = []; } }
  saveSession() {
    if (!this.sessionId) return;
    fs.writeFileSync(this.sessionFile, JSON.stringify({ id: this.sessionId, updatedAt: new Date().toISOString(), history: this.history }, null, 1));
  }
  reset() { this.history = []; this.saveSession(); }

  trimHistory() {
    const size = m => JSON.stringify(m).length;
    let total = this.history.reduce((s, m) => s + size(m), 0);
    while (total > config.agent.maxContextChars && this.history.length > 4) {
      const removed = this.history.shift();
      total -= size(removed);
      if (removed.role === 'assistant' && removed.tool_calls) while (this.history[0]?.role === 'tool') total -= size(this.history.shift());
    }
    for (let i = 0; i < this.history.length - 6; i++) {
      const m = this.history[i];
      if (m.role === 'tool' && m.content.length > 3000) m.content = m.content.slice(0, 1500) + '\n...[older tool output trimmed]';
    }
  }

  async run(userInput, { onEvent = () => {}, signal } = {}) {
    this.history.push({ role: 'user', content: userInput });
    const tools = toolDefinitions(this.toolFilter);
    let finalText = '';

    for (let iter = 0; iter < this.maxIterations; iter++) {
      if (signal?.aborted) break;
      this.trimHistory();
      const messages = [{ role: 'system', content: buildSystemPrompt({ role: this.role, extra: this.extra }) }, ...this.history];

      let res;
      try {
        res = await chat({ messages, tools, signal, onText: delta => onEvent({ type: 'text', delta }) });
      } catch (e) {
        onEvent({ type: 'error', message: e.message });
        this.history.push({ role: 'assistant', content: `(error: ${e.message})` });
        this.saveSession();
        return `Error: ${e.message}`;
      }
      if (res.usage) { this.usage.prompt_tokens += res.usage.prompt_tokens ?? 0; this.usage.completion_tokens += res.usage.completion_tokens ?? 0; }

      const assistantMsg = { role: 'assistant', content: res.content || null };
      if (res.toolCalls.length) assistantMsg.tool_calls = res.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } }));
      this.history.push(assistantMsg);

      if (!res.toolCalls.length) { finalText = res.content; break; }
      if (res.content) onEvent({ type: 'text_end' });

      for (const tc of res.toolCalls) {
        if (signal?.aborted) break;
        let args = {};
        try { args = tc.arguments ? JSON.parse(tc.arguments) : {}; } catch (e) {
          this.history.push({ role: 'tool', tool_call_id: tc.id, content: `Invalid JSON arguments: ${e.message}. Raw: ${tc.arguments.slice(0, 500)}` });
          continue;
        }
        onEvent({ type: 'tool_call', id: tc.id, name: tc.name, args });
        const started = Date.now();
        const output = await this.executeTool(tc.name, args, onEvent);
        onEvent({ type: 'tool_result', id: tc.id, name: tc.name, output, ms: Date.now() - started });
        this.history.push({ role: 'tool', tool_call_id: tc.id, content: output });
      }
      this.saveSession();
    }

    if (!finalText) {
      const last = this.history.at(-1);
      finalText = last?.role === 'assistant' && last.content ? last.content : '(Stopped: reached the tool-call budget without a final answer. Ask me to continue.)';
    }
    this.saveSession();
    onEvent({ type: 'done', text: finalText, usage: this.usage });
    return finalText;
  }

  async executeTool(name, args, onEvent) {
    const tool = getTool(name);
    if (!tool) return `Unknown tool "${name}". Available: ${toolDefinitions(this.toolFilter).map(t => t.function.name).join(', ')}`;
    const isDangerous = typeof tool.dangerous === 'function' ? tool.dangerous(args) : !!tool.dangerous;
    if (isDangerous) {
      if (config.agent.approval === 'deny') return 'Blocked: this action is flagged dangerous and approval mode is "deny".';
      if (config.agent.approval === 'ask') {
        const ok = this.approve ? await this.approve(name, args) : false;
        if (!ok) return 'The user declined this dangerous action. Choose a safer approach or ask the user.';
      }
    }
    try {
      const out = await tool.run(args, { depth: this.depth, onEvent, agent: this });
      return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
    } catch (e) { return `Tool error (${name}): ${e.message}`; }
  }
}

export async function runOnce(prompt, opts) { return new Agent(opts).run(prompt, opts); }
