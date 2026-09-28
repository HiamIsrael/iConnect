// Configuration: env vars > config.json > defaults.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const fileCfg = readJson(path.join(ROOT, 'config.json'));

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const num = (k, d) => Number(env(k, d));
const bool = (k, d) => String(env(k, d)).toLowerCase() === 'true';

export const config = {
  llm: {
    baseUrl: env('LLM_BASE_URL', fileCfg.llm?.baseUrl ?? 'https://api.openai.com/v1'),
    apiKey: env('LLM_API_KEY', env('OPENAI_API_KEY', fileCfg.llm?.apiKey ?? '')),
    model: env('LLM_MODEL', fileCfg.llm?.model ?? 'gpt-4o-mini'),
    temperature: num('LLM_TEMPERATURE', fileCfg.llm?.temperature ?? 0.2),
    maxTokens: num('LLM_MAX_TOKENS', fileCfg.llm?.maxTokens ?? 4096),
    timeoutMs: num('LLM_TIMEOUT_MS', fileCfg.llm?.timeoutMs ?? 120000),
  },
  agent: {
    maxIterations: num('AGENT_MAX_ITERATIONS', fileCfg.agent?.maxIterations ?? 40),
    maxContextChars: num('AGENT_MAX_CONTEXT_CHARS', fileCfg.agent?.maxContextChars ?? 240000),
    toolOutputLimit: num('AGENT_TOOL_OUTPUT_LIMIT', fileCfg.agent?.toolOutputLimit ?? 16000),
    workdir: path.resolve(env('AGENT_WORKDIR', fileCfg.agent?.workdir ?? process.cwd())),
    // "auto" | "ask" | "deny"
    approval: env('AGENT_APPROVAL', fileCfg.agent?.approval ?? 'auto'),
    shellTimeoutMs: num('AGENT_SHELL_TIMEOUT_MS', fileCfg.agent?.shellTimeoutMs ?? 120000),
  },
  server: {
    host: env('HOST', fileCfg.server?.host ?? '0.0.0.0'),
    port: num('PORT', fileCfg.server?.port ?? 8787),
    token: env('AGENT_WEB_TOKEN', fileCfg.server?.token ?? ''),
  },
  paths: {
    skills: path.join(ROOT, 'skills'),
    references: path.join(ROOT, 'references'),
    data: path.resolve(env('AGENT_DATA_DIR', path.join(ROOT, 'data'))),
  },
  mcp: { servers: fileCfg.mcp?.servers ?? {} },
  debug: bool('AGENT_DEBUG', fileCfg.debug ?? false),
};
config.paths.sessions = path.join(config.paths.data, 'sessions');
config.paths.memory = path.join(config.paths.data, 'memory.json');
config.paths.jobs = path.join(config.paths.data, 'jobs.json');

for (const p of [config.paths.data, config.paths.sessions]) fs.mkdirSync(p, { recursive: true });
