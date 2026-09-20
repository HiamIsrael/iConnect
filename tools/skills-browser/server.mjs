#!/usr/bin/env node
/**
 * Skills Browser — a zero-dependency local UI for the Agent Skills wired into
 * this repository.
 *
 *   node tools/skills-browser/server.mjs          # http://localhost:4173
 *   PORT=8080 node tools/skills-browser/server.mjs
 *
 * It reads the real files under .agents/, .claude/, .gemini/ plus AGENTS.md and
 * CLAUDE.md, so what you see is exactly what the agents see. Read-only.
 */

import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';

/** Lifecycle phases in pipeline order (mirrors upstream README). */
const PHASES = [
  { id: 'define', label: 'Define', blurb: 'Clarify what to build', skills: ['interview-me', 'idea-refine', 'spec-driven-development', 'constraint-driven-development'] },
  { id: 'plan', label: 'Plan', blurb: 'Break it down', skills: ['planning-and-task-breakdown'] },
  { id: 'build', label: 'Build', blurb: 'Write the code', skills: ['incremental-implementation', 'test-driven-development', 'context-engineering', 'source-driven-development', 'doubt-driven-development', 'frontend-ui-engineering', 'api-and-interface-design'] },
  { id: 'verify', label: 'Verify', blurb: 'Prove it works', skills: ['browser-testing-with-devtools', 'debugging-and-error-recovery'] },
  { id: 'review', label: 'Review', blurb: 'Quality gates before merge', skills: ['code-review-and-quality', 'code-simplification', 'security-and-hardening', 'performance-optimization'] },
  { id: 'ship', label: 'Ship', blurb: 'Deploy with confidence', skills: ['git-workflow-and-versioning', 'ci-cd-and-automation', 'deprecation-and-migration', 'documentation-and-adrs', 'observability-and-instrumentation', 'shipping-and-launch'] },
  { id: 'meta', label: 'Meta', blurb: 'Discover which skill applies', skills: ['using-agent-skills'] },
];

/** Which agent reads which path. Existence is checked at request time. */
const AGENTS = [
  { name: 'Claude Code', skills: '.claude/skills/', commands: '.claude/commands/', personas: '.claude/agents/', instructions: 'CLAUDE.md', invoke: '/spec, /plan, … or the Skill tool' },
  { name: 'Codex', skills: '.agents/skills/', instructions: 'AGENTS.md', invoke: '@skill-name' },
  { name: 'Cursor', skills: '.agents/skills/', instructions: 'AGENTS.md', invoke: 'auto from description' },
  { name: 'Gemini CLI', skills: '.agents/skills/', commands: '.gemini/commands/', instructions: 'AGENTS.md', invoke: '/spec, /plan, …' },
  { name: 'OpenCode', skills: '.agents/skills/', instructions: 'AGENTS.md', invoke: 'skill tool' },
  { name: 'GitHub Copilot', skills: '.agents/skills/', instructions: 'AGENTS.md', invoke: '/skill-name' },
  { name: 'Zed · Cline · Warp · Kilo · Droid · Amp', skills: '.agents/skills/', instructions: 'AGENTS.md', invoke: 'auto from description' },
];

/** Files the /api/file endpoint may serve (relative to ROOT). */
const READABLE_ROOTS = ['.agents', '.claude', '.gemini'];
const READABLE_FILES = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md', 'skills-lock.json']);
const READABLE_EXT = new Set(['.md', '.toml', '.json']);

// ---------------------------------------------------------------------------
// helpers

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readText(p) {
  return fs.readFile(p, 'utf8');
}

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { data, body: text.slice(m[0].length) };
}

function firstHeading(text) {
  const m = /^#\s+(.+)$/m.exec(text);
  return m ? m[1].trim() : null;
}

function wordCount(text) {
  return (text.match(/\S+/g) || []).length;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Which of the known names (skills or personas) a document mentions, as whole tokens. */
function mentioned(text, names) {
  return names.filter((n) => new RegExp(`(^|[^a-z0-9-])${escapeRe(n)}(?![a-z0-9-])`, 'i').test(text));
}

function parseToml(text) {
  const desc = /^description\s*=\s*"((?:[^"\\]|\\.)*)"/m.exec(text);
  const prompt = /^prompt\s*=\s*"""\r?\n?([\s\S]*?)"""/m.exec(text);
  return { description: desc ? desc[1] : '', prompt: prompt ? prompt[1] : '' };
}

/** Resolve a user-supplied relative path safely inside ROOT, or return null. */
async function safeResolve(rel) {
  if (typeof rel !== 'string' || !rel || rel.length > 512) return null;
  if (rel.includes('\0') || path.isAbsolute(rel)) return null;
  const norm = path.posix.normalize(rel.replace(/\\/g, '/'));
  if (norm.startsWith('..') || norm.split('/').includes('..')) return null;
  const top = norm.split('/')[0];
  const allowed = READABLE_FILES.has(norm) || READABLE_ROOTS.includes(top);
  if (!allowed) return null;
  if (!READABLE_EXT.has(path.posix.extname(norm))) return null;
  const abs = path.join(ROOT, norm);
  let real;
  try { real = await fs.realpath(abs); } catch { return null; }
  const rootReal = await fs.realpath(ROOT);
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) return null;
  const st = await fs.stat(real);
  if (!st.isFile()) return null;
  return { abs: real, rel: norm };
}

// ---------------------------------------------------------------------------
// manifest

async function listDir(rel, filter) {
  const abs = path.join(ROOT, rel);
  if (!(await exists(abs))) return [];
  const entries = await fs.readdir(abs, { withFileTypes: true });
  return entries.filter(filter).map((e) => e.name).sort();
}

async function buildManifest() {
  const problems = [];

  // Skills ------------------------------------------------------------------
  const skillNames = await listDir('.agents/skills', (e) => e.isDirectory() || e.isSymbolicLink());
  const referenceFiles = new Set(await listDir('.agents/references', (e) => e.isFile() && e.name.endsWith('.md')));
  const phaseOf = new Map();
  for (const ph of PHASES) for (const s of ph.skills) phaseOf.set(s, ph.id);

  const skills = [];
  for (const name of skillNames) {
    const rel = path.posix.join('.agents/skills', name, 'SKILL.md');
    const abs = path.join(ROOT, rel);
    if (!(await exists(abs))) { problems.push(`${rel} is missing`); continue; }
    const text = await readText(abs);
    const { data, body } = parseFrontmatter(text);

    // Shared reference links used by this skill and whether they resolve.
    const refs = [];
    const refRe = /\.\.\/\.\.\/references\/([a-z0-9-]+\.md)/g;
    let m;
    while ((m = refRe.exec(text))) {
      if (!refs.includes(m[1])) refs.push(m[1]);
      if (!referenceFiles.has(m[1])) problems.push(`${rel} links ../../references/${m[1]} which does not exist`);
    }

    // Claude Code symlink health.
    const claudeLink = path.join(ROOT, '.claude/skills', name);
    let claude = 'missing';
    try {
      const lst = await fs.lstat(claudeLink);
      if (lst.isSymbolicLink()) {
        const target = await fs.realpath(claudeLink).catch(() => null);
        claude = target && target === (await fs.realpath(path.dirname(abs))) ? 'symlink' : 'broken';
      } else if (lst.isDirectory()) claude = 'copy';
    } catch { /* missing */ }
    if (claude !== 'symlink' && claude !== 'copy') problems.push(`.claude/skills/${name} is ${claude}`);

    const extra = (await fs.readdir(path.dirname(abs))).filter((f) => f !== 'SKILL.md');

    skills.push({
      name: data.name || name,
      dir: name,
      description: data.description || '',
      phase: phaseOf.get(name) || 'other',
      path: rel,
      words: wordCount(body),
      references: refs,
      extraFiles: extra,
      claude,
      title: firstHeading(body) || name,
    });
  }

  // Personas ----------------------------------------------------------------
  const personas = [];
  for (const f of await listDir('.claude/agents', (e) => e.isFile() && e.name.endsWith('.md'))) {
    const rel = path.posix.join('.claude/agents', f);
    const text = await readText(path.join(ROOT, rel));
    const { data, body } = parseFrontmatter(text);
    personas.push({ name: data.name || f.replace(/\.md$/, ''), description: data.description || '', path: rel, title: firstHeading(body), skills: mentioned(body, skillNames) });
  }
  const personaNames = personas.map((p) => p.name);

  // Commands ----------------------------------------------------------------
  const commands = [];
  for (const f of await listDir('.claude/commands', (e) => e.isFile() && e.name.endsWith('.md'))) {
    const rel = path.posix.join('.claude/commands', f);
    const text = await readText(path.join(ROOT, rel));
    const { data, body } = parseFrontmatter(text);
    commands.push({ name: '/' + f.replace(/\.md$/, ''), host: 'Claude Code', description: data.description || '', path: rel, skills: mentioned(body, skillNames), personas: mentioned(body, personaNames) });
    if (/agent-skills:/.test(text)) problems.push(`${rel} still contains the plugin namespace "agent-skills:"`);
  }
  for (const f of await listDir('.gemini/commands', (e) => e.isFile() && e.name.endsWith('.toml'))) {
    const rel = path.posix.join('.gemini/commands', f);
    const text = await readText(path.join(ROOT, rel));
    const { description, prompt } = parseToml(text);
    commands.push({ name: '/' + f.replace(/\.toml$/, ''), host: 'Gemini CLI', description, path: rel, skills: mentioned(prompt, skillNames), personas: [] });
  }

  // References --------------------------------------------------------------
  const references = [];
  for (const f of referenceFiles) {
    const rel = path.posix.join('.agents/references', f);
    const text = await readText(path.join(ROOT, rel));
    const usedBy = skills.filter((s) => s.references.includes(f)).map((s) => s.name);
    references.push({ name: f.replace(/\.md$/, ''), title: firstHeading(text) || f, path: rel, usedBy, words: wordCount(text) });
  }
  const claudeRefs = path.join(ROOT, '.claude/references');
  if (!(await exists(claudeRefs))) problems.push('.claude/references symlink is missing (relative links from .claude/skills/* will not resolve)');

  // Project files -----------------------------------------------------------
  const projectFiles = [];
  for (const f of ['AGENTS.md', 'CLAUDE.md', 'README.md', 'skills-lock.json']) {
    if (await exists(path.join(ROOT, f))) projectFiles.push({ name: f, path: f });
    else if (f !== 'README.md') problems.push(`${f} is missing`);
  }

  // Lock --------------------------------------------------------------------
  let lock = null;
  try {
    const raw = JSON.parse(await readText(path.join(ROOT, 'skills-lock.json')));
    const entries = Object.values(raw.skills || {});
    const sources = [...new Set(entries.map((e) => e.source))];
    lock = { version: raw.version, count: entries.length, sources };
    for (const n of Object.keys(raw.skills || {})) if (!skillNames.includes(n)) problems.push(`skills-lock.json lists ${n} but .agents/skills/${n} is missing`);
  } catch { /* handled by projectFiles check */ }

  // Agents matrix -----------------------------------------------------------
  const agents = [];
  for (const a of AGENTS) {
    const check = async (p) => (p ? await exists(path.join(ROOT, p)) : null);
    agents.push({
      ...a,
      ok: {
        skills: await check(a.skills),
        commands: await check(a.commands),
        personas: await check(a.personas),
        instructions: await check(a.instructions),
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    repo: path.basename(ROOT),
    pack: { name: 'addyosmani/agent-skills', version: '0.6.10', license: 'MIT', url: 'https://github.com/addyosmani/agent-skills' },
    phases: PHASES.map((p) => ({ id: p.id, label: p.label, blurb: p.blurb })),
    skills,
    commands,
    personas,
    references,
    projectFiles,
    lock,
    agents,
    problems,
    stats: {
      skills: skills.length,
      commands: commands.filter((c) => c.host === 'Claude Code').length,
      geminiCommands: commands.filter((c) => c.host === 'Gemini CLI').length,
      personas: personas.length,
      references: references.length,
      words: skills.reduce((n, s) => n + s.words, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// http

const STATIC = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/vendor/marked.esm.js': { file: 'vendor/marked.esm.js', type: 'text/javascript; charset=utf-8' },
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extra,
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
    const url = new URL(req.url, 'http://localhost');

    if (STATIC[url.pathname]) {
      const { file, type } = STATIC[url.pathname];
      const body = await readText(path.join(HERE, file));
      return send(res, 200, body, type, { 'Content-Security-Policy': CSP });
    }

    if (url.pathname === '/api/manifest') {
      const manifest = await buildManifest();
      return send(res, 200, JSON.stringify(manifest), 'application/json; charset=utf-8');
    }

    if (url.pathname === '/api/file') {
      const target = await safeResolve(url.searchParams.get('p'));
      if (!target) return send(res, 404, 'Not found');
      const text = await readText(target.abs);
      return send(res, 200, JSON.stringify({ path: target.rel, text }), 'application/json; charset=utf-8');
    }

    if (url.pathname === '/healthz') return send(res, 200, 'ok');

    return send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    return send(res, 500, 'Internal error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Skills Browser for ${path.basename(ROOT)} → http://localhost:${PORT}  (bound to ${HOST})`);
});
