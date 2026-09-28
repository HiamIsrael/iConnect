// Shared plumbing for messaging channels (Telegram, WhatsApp, ...).
// A channel receives text from a chat, runs the agent on a per-chat session, and streams progress back.
import { Agent } from '../agent.js';
import { config } from '../config.js';

const agents = new Map();
const busy = new Set();

export function isAllowed(list, id) {
  if (!list || !list.length) return true; // empty allowlist = open (warned at startup)
  return list.map(String).includes(String(id));
}

export function parseAllowlist(s) { return (s ?? '').split(/[,\s]+/).filter(Boolean); }

/** Slash-style commands common to all channels. Returns a reply string or null if not a command. */
export function handleCommand(text, sessionKey) {
  const t = text.trim();
  if (t === '/start' || t === '/help') {
    return `⚡ Skilled Agent\nSend me any task — I can run code, edit files, research the web, schedule jobs and more.\n\nCommands:\n/reset – clear conversation\n/status – model & workdir\n/skills – list skills\n/jobs – scheduled tasks`;
  }
  if (t === '/reset') { getAgent(sessionKey).reset(); return 'Conversation cleared.'; }
  if (t === '/status') return `model: ${config.llm.model}\nworkdir: ${config.agent.workdir}\napproval: ${config.agent.approval}`;
  return null;
}

export function getAgent(sessionKey) {
  if (!agents.has(sessionKey)) agents.set(sessionKey, new Agent({ sessionId: sessionKey, approve: async () => config.agent.approval === 'auto' }));
  return agents.get(sessionKey);
}

/**
 * Run the agent for a chat message.
 * @param {{onProgress?:(s:string)=>void}} hooks  onProgress receives a compact running status (tool names + partial text)
 */
export async function runForChat(sessionKey, text, { onProgress } = {}) {
  const cmd = handleCommand(text, sessionKey);
  if (cmd) return cmd;
  if (busy.has(sessionKey)) return '⏳ Still working on your previous message — wait a moment.';
  busy.add(sessionKey);
  let partial = '', tools = [], last = 0;
  const tick = () => {
    if (!onProgress || Date.now() - last < 1500) return;
    last = Date.now();
    const status = [tools.length ? `⚙ ${tools.slice(-4).join(' → ')}` : '', partial.slice(-800)].filter(Boolean).join('\n\n');
    if (status) onProgress(status);
  };
  try {
    return await getAgent(sessionKey).run(text, {
      onEvent: e => {
        if (e.type === 'text') { partial += e.delta; tick(); }
        if (e.type === 'tool_call' && !e.sub) { tools.push(e.name); tick(); }
      },
    });
  } finally { busy.delete(sessionKey); }
}

/** Split long replies for platforms with message-size limits. */
export function chunk(text, size) {
  const out = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = size;
    out.push(rest.slice(0, cut)); rest = rest.slice(cut);
  }
  out.push(rest);
  return out;
}
