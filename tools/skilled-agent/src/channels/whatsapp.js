// WhatsApp via Meta Cloud API (webhook). Mounted in the HTTP server at /webhooks/whatsapp.
// Env: WHATSAPP_TOKEN (permanent access token), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN (any string you choose),
//      WHATSAPP_APP_SECRET (optional; enables signature verification), WHATSAPP_ALLOWED_NUMBERS (E.164 without "+", empty = anyone)
// Setup: Meta for Developers → WhatsApp → Configuration → Callback URL = https://<host>/webhooks/whatsapp, Verify token = WHATSAPP_VERIFY_TOKEN, subscribe to "messages".
import crypto from 'node:crypto';
import { isAllowed, parseAllowlist, runForChat, chunk } from './base.js';
import { transcribeAudio } from '../voice.js';

const cfg = () => ({
  token: process.env.WHATSAPP_TOKEN, phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verify: process.env.WHATSAPP_VERIFY_TOKEN ?? 'skilled-agent', appSecret: process.env.WHATSAPP_APP_SECRET,
  allow: parseAllowlist(process.env.WHATSAPP_ALLOWED_NUMBERS),
});

export const whatsappEnabled = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

export async function sendWhatsApp(to, body) {
  const { token, phoneId } = cfg();
  for (const part of chunk(body, 4000)) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: part, preview_url: false } }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed ${res.status}: ${await res.text()}`);
  }
}

async function downloadMedia(id) {
  const { token } = cfg();
  const meta = await (await fetch(`https://graph.facebook.com/v20.0/${id}`, { headers: { authorization: `Bearer ${token}` } })).json();
  const bin = await fetch(meta.url, { headers: { authorization: `Bearer ${token}` } });
  return Buffer.from(await bin.arrayBuffer());
}

const seen = new Set(); // dedupe redelivered webhook events

/** Framework-less handler. Returns true if the request was handled. */
export async function handleWhatsAppRequest(req, res, url, rawBody, log = console.log) {
  const { verify, appSecret, allow } = cfg();
  if (req.method === 'GET') {
    if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === verify) {
      res.writeHead(200); res.end(url.searchParams.get('hub.challenge')); return true;
    }
    res.writeHead(403); res.end('bad verify token'); return true;
  }
  if (req.method !== 'POST') return false;

  if (appSecret) {
    const sig = req.headers['x-hub-signature-256'] ?? '';
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) { res.writeHead(401); res.end(); return true; }
  }
  res.writeHead(200); res.end('ok'); // ack fast; Meta retries otherwise

  let body; try { body = JSON.parse(rawBody); } catch { return true; }
  for (const entry of body.entry ?? []) for (const ch of entry.changes ?? []) for (const m of ch.value?.messages ?? []) {
    if (seen.has(m.id)) continue; seen.add(m.id); if (seen.size > 5000) seen.clear();
    const from = m.from;
    (async () => {
      if (!isAllowed(allow, from)) return sendWhatsApp(from, 'Not authorized for this agent.');
      let text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '';
      if (m.type === 'audio') {
        try { text = await transcribeAudio(await downloadMedia(m.audio.id), 'voice.ogg', 'audio/ogg'); await sendWhatsApp(from, `🎙 "${text}"`); }
        catch (e) { return sendWhatsApp(from, `Could not transcribe: ${e.message}`); }
      }
      if (!text) return;
      const reply = await runForChat(`wa-${from}`, text);
      await sendWhatsApp(from, reply || '(no output)');
    })().catch(e => log(`whatsapp error: ${e.message}`));
  }
  return true;
}
