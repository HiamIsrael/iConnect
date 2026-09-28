import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMockLLM } from './mock_llm.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));
process.env.AGENT_WORKDIR = tmp;
process.env.AGENT_DATA_DIR = path.join(tmp, 'data');
process.env.LLM_API_KEY = 'test';

const { config } = await import('../src/config.js');
const { Agent } = await import('../src/agent.js');
const { loadSkillIndex, readSkill } = await import('../src/skills/loader.js');
const { getTool } = await import('../src/tools/index.js');
const { nextCron, addJob, listJobs } = await import('../src/scheduler.js');
const { htmlToText } = await import('../src/tools/web.js');
const { chunk, handleCommand, isAllowed, runForChat } = await import('../src/channels/base.js');
const { handleWhatsAppRequest } = await import('../src/channels/whatsapp.js');
const { transcribeAudio } = await import('../src/voice.js');

let mock;
before(async () => { mock = await startMockLLM([]); config.llm.baseUrl = mock.url; });
after(() => { mock.server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('skills index loads all 25 skills with descriptions', () => {
  const idx = loadSkillIndex();
  assert.equal(idx.size, 25);
  for (const [, s] of idx) assert.ok(s.description.length > 20);
  assert.match(readSkill('using-agent-skills'), /Skill Discovery/);
  assert.ok(readSkill('idea-refine', 'examples.md').length > 0);
});

test('file tools: write → read → edit → grep → glob', async () => {
  assert.match(await getTool('write_file').run({ path: 'a.txt', content: 'hello\nworld\n' }), /Created/);
  assert.match(await getTool('read_file').run({ path: 'a.txt' }), /1│hello/);
  assert.match(await getTool('edit_file').run({ path: 'a.txt', old_text: 'world', new_text: 'agent' }), /Edited/);
  assert.equal(fs.readFileSync(path.join(tmp, 'a.txt'), 'utf8'), 'hello\nagent\n');
  assert.match(await getTool('grep').run({ pattern: 'agent', path: '.' }), /a\.txt:2:agent/);
  assert.match(await getTool('glob').run({ pattern: '*.txt' }), /a\.txt/);
});

test('bash + python tools', async () => {
  assert.match(await getTool('bash').run({ command: 'echo hi && exit 3' }), /hi[\s\S]*exit code: 3/);
  assert.match(await getTool('run_python').run({ code: 'print(sum(range(5)))' }), /10/);
});

test('dangerous detection', () => {
  assert.equal(getTool('bash').dangerous({ command: 'rm -rf /' }), true);
  assert.equal(getTool('bash').dangerous({ command: 'ls -la' }), false);
  assert.equal(getTool('git').dangerous({ args: 'push --force' }), true);
});

test('agent loop executes tool calls then answers (mock LLM)', async () => {
  const m2 = await startMockLLM([
    { toolCalls: [{ name: 'write_file', args: { path: 'loop.txt', content: 'ok' } }, { name: 'bash', args: { command: 'cat loop.txt' } }] },
    { content: 'Done: file written and verified.' },
  ]);
  config.llm.baseUrl = m2.url;
  const events = [];
  const out = await new Agent({ sessionId: 'test-session' }).run('write loop.txt', { onEvent: e => events.push(e) });
  m2.server.close(); config.llm.baseUrl = mock.url;
  assert.equal(out, 'Done: file written and verified.');
  assert.equal(events.filter(e => e.type === 'tool_call').length, 2);
  assert.ok(fs.existsSync(path.join(tmp, 'loop.txt')));
  const second = m2.seen[1];
  assert.equal(second.messages.filter(m => m.role === 'tool').length, 2);
  assert.match(second.messages[0].content, /Agent Skills catalog/);
  assert.ok(second.tools.some(t => t.function.name === 'load_skill'));
});

test('memory round-trip', async () => {
  await getTool('save_memory').run({ key: 'user.name', value: 'Israel', tags: ['profile'] });
  assert.match(await getTool('search_memory').run({ query: 'israel' }), /user\.name/);
  assert.match(await getTool('forget_memory').run({ key: 'user.name' }), /Forgot/);
});

test('cron + scheduling with channel notify', () => {
  const from = new Date('2026-09-28T10:15:00');
  assert.equal(nextCron('0 9 * * 1-5', from).getTime(), new Date('2026-09-29T09:00:00').getTime());
  assert.equal(nextCron('*/15 * * * *', from).getMinutes(), 30);
  const job = addJob({ payload: 'check repo', cron: '0 9 * * *', notify: 'telegram:42' });
  assert.ok(listJobs().find(j => j.id === job.id && j.notify === 'telegram:42' && j.nextRunAt));
});

test('html → text', () => {
  const t = htmlToText('<html><head><title>T</title><script>x()</script></head><body><h1>Hi</h1><p>A <a href="https://x.y">link</a> &amp; more</p></body></html>');
  assert.match(t, /# Hi/); assert.match(t, /\[link\]\(https:\/\/x\.y\)/); assert.match(t, /& more/); assert.doesNotMatch(t, /x\(\)/);
});

test('channel helpers: chunking, commands, allowlist, run', async () => {
  assert.deepEqual(chunk('a'.repeat(10), 4).map(s => s.length), [4, 4, 2]);
  assert.match(handleCommand('/help', 'x'), /Skilled Agent/);
  assert.equal(handleCommand('do stuff', 'x'), null);
  assert.equal(isAllowed([], 1), true); assert.equal(isAllowed(['5'], 5), true); assert.equal(isAllowed(['5'], 6), false);
  const m3 = await startMockLLM([{ content: 'chat reply' }]);
  config.llm.baseUrl = m3.url;
  assert.equal(await runForChat('tg-1', 'hello'), 'chat reply');
  m3.server.close(); config.llm.baseUrl = mock.url;
});

test('whatsapp webhook verification + signature check', async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = 'v'; process.env.WHATSAPP_APP_SECRET = 's';
  const fakeRes = () => { const r = { code: null, body: '' }; r.writeHead = c => { r.code = c; }; r.end = b => { r.body = b ?? ''; }; return r; };
  let res = fakeRes();
  await handleWhatsAppRequest({ method: 'GET', headers: {} }, res, new URL('http://x/?hub.mode=subscribe&hub.verify_token=v&hub.challenge=123'), Buffer.alloc(0));
  assert.equal(res.code, 200); assert.equal(res.body, '123');
  res = fakeRes();
  await handleWhatsAppRequest({ method: 'POST', headers: { 'x-hub-signature-256': 'sha256=bad' } }, res, new URL('http://x/'), Buffer.from('{}'));
  assert.equal(res.code, 401);
});

test('voice: transcription via OpenAI-compatible endpoint', async () => {
  assert.equal(await transcribeAudio(Buffer.from('xx'), 'a.webm'), 'transcribed words');
});
