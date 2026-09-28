// Telegram channel via Bot API long polling (no public URL needed). Zero deps.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_CHAT_IDS (comma list; empty = anyone — not recommended)
import { isAllowed, parseAllowlist, runForChat, chunk } from './base.js';
import { transcribeAudio } from '../voice.js';

const API = token => `https://api.telegram.org/bot${token}`;

async function tg(token, method, body) {
  const res = await fetch(`${API(token)}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

// Telegram MarkdownV2 is fussy; send plain text so code stays readable.
const send = (token, chat_id, text, extra = {}) => tg(token, 'sendMessage', { chat_id, text, disable_web_page_preview: true, ...extra });

export async function startTelegram({ token = process.env.TELEGRAM_BOT_TOKEN, allow = parseAllowlist(process.env.TELEGRAM_ALLOWED_CHAT_IDS), log = console.log } = {}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const me = await tg(token, 'getMe', {});
  log(`Telegram: connected as @${me.username}${allow.length ? ` (allowed chats: ${allow.join(', ')})` : ' ⚠ no TELEGRAM_ALLOWED_CHAT_IDS — anyone can use this bot'}`);
  await tg(token, 'setMyCommands', { commands: [
    { command: 'help', description: 'What can you do?' }, { command: 'reset', description: 'Clear conversation' },
    { command: 'status', description: 'Model & working directory' }, { command: 'jobs', description: 'Scheduled tasks' },
  ] }).catch(() => {});

  let offset = 0, stopped = false;
  const loop = async () => {
    while (!stopped) {
      try {
        const updates = await tg(token, 'getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
        for (const u of updates) { offset = u.update_id + 1; handle(u.message).catch(e => log(`telegram handler error: ${e.message}`)); }
      } catch (e) { log(`telegram poll error: ${e.message}`); await new Promise(r => setTimeout(r, 3000)); }
    }
  };

  async function handle(msg) {
    if (!msg) return;
    const chatId = msg.chat.id;
    if (!isAllowed(allow, chatId) && !isAllowed(allow, msg.from?.id)) {
      return send(token, chatId, `Not authorized. Your chat id is ${chatId} — add it to TELEGRAM_ALLOWED_CHAT_IDS.`);
    }
    let text = msg.text ?? msg.caption ?? '';
    if (msg.voice || msg.audio) {
      const f = await tg(token, 'getFile', { file_id: (msg.voice ?? msg.audio).file_id });
      const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${token}/${f.file_path}`)).arrayBuffer());
      try { text = await transcribeAudio(buf, 'voice.ogg', 'audio/ogg'); await send(token, chatId, `🎙 "${text}"`); }
      catch (e) { return send(token, chatId, `Could not transcribe voice note: ${e.message}`); }
    }
    if (!text) return;
    if (text === '/jobs') text = 'List my scheduled tasks briefly.';
    if (text === '/skills') text = 'List the available skills as a compact list (names only, grouped by phase).';

    const status = await send(token, chatId, '🤔 Working…');
    const typing = setInterval(() => tg(token, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {}), 4500);
    let lastStatus = '';
    const onProgress = s => {
      const t = s.slice(0, 3900);
      if (t === lastStatus) return; lastStatus = t;
      tg(token, 'editMessageText', { chat_id: chatId, message_id: status.message_id, text: t }).catch(() => {});
    };
    try {
      const reply = await runForChat(`tg-${chatId}`, text, { onProgress });
      clearInterval(typing);
      const parts = chunk(reply || '(no output)', 3900);
      await tg(token, 'editMessageText', { chat_id: chatId, message_id: status.message_id, text: parts[0] }).catch(() => send(token, chatId, parts[0]));
      for (const p of parts.slice(1)) await send(token, chatId, p);
    } catch (e) { clearInterval(typing); await send(token, chatId, `✖ ${e.message}`); }
  }

  loop();
  return { stop: () => { stopped = true; }, send: (chatId, text) => Promise.all(chunk(text, 3900).map(t => send(token, chatId, t))) };
}
