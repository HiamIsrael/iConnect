// `agent setup` — interactive first-run wizard. Writes .env (mode 600) and runs the doctor checks.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ROOT } from './config.js';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter (recommended — one key, many models, free tier)', baseUrl: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/keys', keyPrefix: 'sk-or-',
    models: [
      ['qwen/qwen3-coder:free', 'FREE · best free coding + tool-use model (start here)'],
      ['openai/gpt-oss-120b:free', 'FREE · reliable general reasoning + tools'],
      ['nvidia/nemotron-3-super-120b-a12b:free', 'FREE · strict structured output'],
      ['anthropic/claude-sonnet-4', 'PAID · best quality for autonomous coding'],
      ['google/gemini-2.5-flash', 'PAID · cheap & fast daily driver'],
    ] },
  { id: 'groq', name: 'Groq (fast, generous free tier)', baseUrl: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys', keyPrefix: 'gsk_',
    models: [['llama-3.3-70b-versatile', 'FREE tier · solid tool use'], ['openai/gpt-oss-120b', 'FREE tier · strong reasoning']] },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys', keyPrefix: 'sk-',
    models: [['gpt-4o-mini', 'cheap & capable'], ['gpt-4.1', 'stronger']] },
  { id: 'ollama', name: 'Ollama (local, offline, no key)', baseUrl: 'http://localhost:11434/v1', keyUrl: 'https://ollama.com/download', keyPrefix: '',
    models: [['qwen2.5-coder:14b', 'run: ollama pull qwen2.5-coder:14b'], ['llama3.1:8b', 'lighter']] },
  { id: 'custom', name: 'Other OpenAI-compatible endpoint', baseUrl: '', keyUrl: '', keyPrefix: '', models: [] },
];

export async function runSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // Queue lines so piped/pasted input isn't lost between questions.
  const queue = [], waiters = [];
  rl.on('line', l => { const w = waiters.shift(); w ? w(l) : queue.push(l); });
  rl.on('close', () => { while (waiters.length) waiters.shift()(''); });
  const ask = (q, d = '') => { process.stdout.write(`${q}${d ? ` [${d}]` : ''}: `); return new Promise(r => { const l = queue.shift(); l !== undefined ? r(l.trim() || d) : waiters.push(v => r(v.trim() || d)); }); };
  const envFile = path.join(ROOT, '.env');
  console.log('\n⚡ Skilled Agent setup\n');
  if (fs.existsSync(envFile)) console.log(`(an .env already exists at ${envFile}; values you enter will replace it)\n`);

  console.log('1) Choose an LLM provider:');
  PROVIDERS.forEach((p, i) => console.log(`   ${i + 1}. ${p.name}`));
  const pi = Number(await ask('   Provider number', '1')) - 1;
  const p = PROVIDERS[pi] ?? PROVIDERS[0];

  const baseUrl = p.baseUrl || await ask('   Base URL (e.g. https://host/v1)');
  let apiKey = '';
  if (p.id !== 'ollama') {
    console.log(`\n2) Get a key at ${p.keyUrl || 'your provider'} then paste it here (input is shown; nobody else sees it).`);
    apiKey = await ask('   API key');
    if (p.keyPrefix && apiKey && !apiKey.startsWith(p.keyPrefix)) console.log(`   ⚠ keys for this provider usually start with "${p.keyPrefix}" — double-check.`);
  }

  console.log('\n3) Choose a model:');
  p.models.forEach(([id, note], i) => console.log(`   ${i + 1}. ${id}  — ${note}`));
  const mAns = await ask(p.models.length ? '   Model number or custom id' : '   Model id', p.models.length ? '1' : '');
  const model = /^\d+$/.test(mAns) && p.models[+mAns - 1] ? p.models[+mAns - 1][0] : mAns;

  const workdir = await ask('\n4) Default working directory for the agent', process.cwd());
  const approval = await ask('5) Approval mode for dangerous commands (auto/ask/deny)', 'ask');
  const tg = await ask('6) Telegram bot token (optional, Enter to skip)');
  const tgIds = tg ? await ask('   Allowed Telegram chat ids (comma-separated; Enter to fill in later)') : '';

  const lines = [
    `LLM_BASE_URL=${baseUrl}`, `LLM_API_KEY=${apiKey}`, `LLM_MODEL=${model}`,
    `AGENT_WORKDIR=${workdir}`, `AGENT_APPROVAL=${approval}`, 'PORT=8787', 'HOST=0.0.0.0',
    ...(tg ? [`TELEGRAM_BOT_TOKEN=${tg}`, `TELEGRAM_ALLOWED_CHAT_IDS=${tgIds}`] : []),
  ];
  fs.writeFileSync(envFile, lines.join('\n') + '\n', { mode: 0o600 });
  rl.close();
  console.log(`\n✔ wrote ${envFile} (permissions 600)\n`);

  // Apply to the running process and run the doctor checks.
  for (const l of lines) { const [k, ...v] = l.split('='); process.env[k] = v.join('='); }
  const { config } = await import('./config.js');
  Object.assign(config.llm, { baseUrl, apiKey, model });
  const { listModels } = await import('./llm/openai.js');
  process.stdout.write('Checking endpoint… ');
  try {
    const ms = await listModels();
    console.log(`OK (${ms.length} models${ms.includes(model) ? ', your model is available' : ` — note: "${model}" not in list; it may still work`})`);
  } catch (e) { console.log(`FAILED: ${e.message}\n   Check the key/URL and re-run: node bin/agent.js setup`); return; }
  console.log(`\nNext:\n  node bin/agent.js "list the files here and explain what this project is"\n  node bin/agent.js serve      → http://localhost:8787\n`);
}
