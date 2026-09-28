// HTTP API + Web UI + webhooks. Zero dependencies. Streams agent events over SSE.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { Agent } from '../agent.js';
import { loadSkillIndex, readSkill } from '../skills/loader.js';
import { listJobs, removeJob, startScheduler } from '../scheduler.js';
import { connectMcpServers, mcpStatus } from '../mcp/client.js';
import { allTools } from '../tools/index.js';
import { runCommand, listProcesses } from '../tools/shell.js';
import { recallAll, forget } from '../memory.js';
import { handleWhatsAppRequest, whatsappEnabled, sendWhatsApp } from '../channels/whatsapp.js';
import { transcribeAudio, synthesizeSpeech, sttConfigured } from '../voice.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const agents = new Map(), running = new Map(), pendingApprovals = new Map(), subscribers = new Map();
let telegram = null;

function getAgent(id) {
  if (!agents.has(id)) agents.set(id, new Agent({ sessionId: id, approve: (name, args) => requestApproval(id, name, args) }));
  return agents.get(id);
}
function broadcast(sessionId, event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subscribers.get(sessionId) ?? []) res.write(data);
}
function requestApproval(sessionId, name, args) {
  if (config.agent.approval === 'auto') return Promise.resolve(true);
  const id = `apr_${Date.now()}`;
  return new Promise(resolve => {
    pendingApprovals.set(id, resolve);
    broadcast(sessionId, { type: 'approval_request', id, name, args });
    setTimeout(() => { if (pendingApprovals.delete(id)) resolve(false); }, 10 * 60 * 1000);
  });
}

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
const readRaw = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const readBody = async req => { try { return JSON.parse((await readRaw(req)).toString() || '{}'); } catch { return {}; } };

/** Deliver a scheduled-job result to the channel it was requested from. */
export async function notify(target, text) {
  if (!target) return;
  const [kind, id] = target.split(':');
  if (kind === 'telegram' && telegram) return telegram.send(id, text);
  if (kind === 'whatsapp' && whatsappEnabled()) return sendWhatsApp(id, text);
}

async function jobRunner(job) {
  let result;
  if (job.kind === 'shell') { const r = await runCommand(job.payload, { cwd: config.agent.workdir }); result = `${r.stdout}${r.stderr}exit ${r.code}`; }
  else { const sid = `job-${job.id}`; result = await getAgent(sid).run(job.payload, { onEvent: e => broadcast(sid, e) }); }
  await notify(job.notify, `⏰ ${job.name}\n\n${result}`).catch(e => console.error(`notify failed: ${e.message}`));
  return result;
}

export async function startServer() {
  await connectMcpServers(m => console.log(m));
  startScheduler(jobRunner, { log: m => console.log(m) });
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const { startTelegram } = await import('../channels/telegram.js');
    telegram = await startTelegram({ log: m => console.log(m) }).catch(e => { console.error(`Telegram failed: ${e.message}`); return null; });
  }
  if (whatsappEnabled()) console.log('WhatsApp webhook enabled at /webhooks/whatsapp');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }

    if (config.server.token && p.startsWith('/api/')) {
      const tok = req.headers.authorization?.replace(/^Bearer /, '') || url.searchParams.get('token');
      if (tok !== config.server.token) return json(res, 401, { error: 'unauthorized' });
    }

    try {
      if (p === '/webhooks/whatsapp') {
        if (!whatsappEnabled()) return json(res, 404, { error: 'whatsapp not configured' });
        const raw = req.method === 'POST' ? await readRaw(req) : Buffer.alloc(0);
        if (await handleWhatsAppRequest(req, res, url, raw)) return;
      }
      if (p === '/healthz') return json(res, 200, { ok: true });
      if (p === '/api/transcribe' && req.method === 'POST') {
        const buf = await readRaw(req);
        const mime = req.headers['content-type'] || 'audio/webm';
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : mime.includes('wav') ? 'wav' : 'webm';
        return json(res, 200, { text: await transcribeAudio(buf, `speech.${ext}`, mime) });
      }
      if (p === '/api/speak' && req.method === 'POST') {
        const { text } = await readBody(req);
        const audio = await synthesizeSpeech(text ?? '');
        res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(audio);
      }
      if (p === '/api/status') {
        return json(res, 200, {
          model: config.llm.model, baseUrl: config.llm.baseUrl, apiKeySet: !!config.llm.apiKey, workdir: config.agent.workdir, approval: config.agent.approval,
          skills: loadSkillIndex().size, tools: allTools().length, mcp: mcpStatus(), processes: listProcesses(),
          voice: { stt: sttConfigured() }, channels: { telegram: !!telegram, whatsapp: whatsappEnabled() },
        });
      }
      if (p === '/api/skills') {
        const name = url.searchParams.get('name');
        if (name) { res.writeHead(200, { 'content-type': 'text/markdown' }); return res.end(readSkill(name, url.searchParams.get('file') ?? 'SKILL.md')); }
        return json(res, 200, [...loadSkillIndex().entries()].map(([k, s]) => ({ id: k, ...s, dir: undefined })));
      }
      if (p === '/api/tools') return json(res, 200, allTools().map(t => ({ name: t.name, description: t.description })));
      if (p === '/api/memory' && req.method === 'GET') return json(res, 200, recallAll());
      if (p === '/api/memory' && req.method === 'DELETE') { forget(url.searchParams.get('key')); return json(res, 200, { ok: true }); }
      if (p === '/api/jobs' && req.method === 'GET') return json(res, 200, listJobs());
      if (p === '/api/jobs' && req.method === 'DELETE') { removeJob(url.searchParams.get('id')); return json(res, 200, { ok: true }); }
      if (p === '/api/sessions') {
        const files = fs.readdirSync(config.paths.sessions).filter(f => f.endsWith('.json'));
        return json(res, 200, files.map(f => { const d = JSON.parse(fs.readFileSync(path.join(config.paths.sessions, f), 'utf8')); return { id: d.id, updatedAt: d.updatedAt, turns: d.history.filter(m => m.role === 'user').length, title: d.history.find(m => m.role === 'user')?.content.slice(0, 60) ?? '' }; }).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')));
      }
      if (p === '/api/history') {
        const a = getAgent(url.searchParams.get('session') ?? 'web-default');
        return json(res, 200, a.history.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content && !m.tool_calls)).map(m => ({ role: m.role, content: m.content })));
      }
      if (p === '/api/reset' && req.method === 'POST') { const { session = 'web-default' } = await readBody(req); getAgent(session).reset(); return json(res, 200, { ok: true }); }
      if (p === '/api/stop' && req.method === 'POST') { const { session = 'web-default' } = await readBody(req); running.get(session)?.abort(new Error('stopped by user')); return json(res, 200, { ok: true }); }
      if (p === '/api/approve' && req.method === 'POST') { const { id, allow } = await readBody(req); const r = pendingApprovals.get(id); if (r) { pendingApprovals.delete(id); r(!!allow); } return json(res, 200, { ok: !!r }); }
      if (p === '/api/config' && req.method === 'POST') {
        const b = await readBody(req);
        if (b.model) config.llm.model = b.model;
        if (b.workdir) config.agent.workdir = path.resolve(b.workdir);
        if (b.approval) config.agent.approval = b.approval;
        return json(res, 200, { ok: true });
      }
      if (p === '/api/events') {
        const sid = url.searchParams.get('session') ?? 'web-default';
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': '*', 'x-accel-buffering': 'no' });
        res.write(': connected\n\n');
        (subscribers.get(sid) ?? subscribers.set(sid, new Set()).get(sid)).add(res);
        const ping = setInterval(() => res.write(': ping\n\n'), 20000);
        req.on('close', () => { clearInterval(ping); subscribers.get(sid)?.delete(res); });
        return;
      }
      if (p === '/api/chat' && req.method === 'POST') {
        const { message, session = 'web-default' } = await readBody(req);
        if (!message) return json(res, 400, { error: 'message required' });
        if (running.has(session)) return json(res, 409, { error: 'session busy' });
        const agent = getAgent(session);
        const ctrl = new AbortController(); running.set(session, ctrl);
        broadcast(session, { type: 'user', content: message });
        agent.run(message, { onEvent: e => broadcast(session, e), signal: ctrl.signal })
          .catch(e => broadcast(session, { type: 'error', message: e.message }))
          .finally(() => running.delete(session));
        return json(res, 202, { ok: true, session });
      }

      const file = path.join(PUBLIC, path.normalize(p === '/' ? '/index.html' : p));
      if (file.startsWith(PUBLIC) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] ?? 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
      json(res, 404, { error: 'not found' });
    } catch (e) { json(res, 500, { error: e.message }); }
  });

  server.listen(config.server.port, config.server.host, () => {
    console.log(`Skilled Agent web UI → http://${config.server.host}:${config.server.port}  (model: ${config.llm.model}, workdir: ${config.agent.workdir})`);
  });
  return server;
}
