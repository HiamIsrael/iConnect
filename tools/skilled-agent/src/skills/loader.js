// Loads Agent Skills (SKILL.md with YAML frontmatter) and shared references.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  let key = null;
  for (const raw of m[1].split('\n')) {
    const kv = raw.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; meta[key] = kv[2].replace(/^["']|["']$/g, ''); }
    else if (key && /^\s+/.test(raw)) meta[key] = (meta[key] + ' ' + raw.trim()).trim();
  }
  return { meta, body: m[2] };
}

const PHASES = {
  define: ['interview-me', 'idea-refine', 'spec-driven-development', 'constraint-driven-development'],
  plan: ['planning-and-task-breakdown'],
  build: ['incremental-implementation', 'test-driven-development', 'context-engineering', 'source-driven-development', 'doubt-driven-development', 'frontend-ui-engineering', 'api-and-interface-design'],
  verify: ['browser-testing-with-devtools', 'debugging-and-error-recovery'],
  review: ['code-review-and-quality', 'code-simplification', 'security-and-hardening', 'performance-optimization'],
  ship: ['git-workflow-and-versioning', 'ci-cd-and-automation', 'deprecation-and-migration', 'documentation-and-adrs', 'observability-and-instrumentation', 'shipping-and-launch'],
  meta: ['using-agent-skills'],
};
const phaseOf = name => Object.entries(PHASES).find(([, l]) => l.includes(name))?.[0] ?? 'other';

function walk(dir) {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

let cache = null;
export function loadSkillIndex(force = false) {
  if (cache && !force) return cache;
  const idx = new Map();
  const root = config.paths.skills;
  if (fs.existsSync(root)) {
    for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const dir = path.join(root, dirent.name);
      const file = path.join(dir, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      const { meta } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      idx.set(dirent.name, {
        name: meta.name || dirent.name, description: meta.description || '', dir,
        files: walk(dir).map(f => path.relative(dir, f)).filter(f => f !== 'SKILL.md'), phase: phaseOf(dirent.name),
      });
    }
  }
  cache = idx;
  return idx;
}

export function readSkill(name, file = 'SKILL.md') {
  const idx = loadSkillIndex();
  const skill = idx.get(name);
  if (!skill) throw new Error(`Unknown skill "${name}". Available: ${[...idx.keys()].join(', ')}`);
  const target = path.resolve(skill.dir, file);
  if (!target.startsWith(skill.dir)) throw new Error('Invalid file path');
  if (!fs.existsSync(target)) throw new Error(`File ${file} not found in skill ${name}. Files: ${skill.files.join(', ') || '(none)'}`);
  const raw = fs.readFileSync(target, 'utf8');
  return file === 'SKILL.md' ? parseFrontmatter(raw).body.trim() : raw;
}

export function listReferences() {
  const dir = config.paths.references;
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')) : [];
}

export function readReference(name) {
  const file = path.resolve(config.paths.references, `${name.replace(/\.md$/, '')}.md`);
  if (!file.startsWith(config.paths.references) || !fs.existsSync(file)) throw new Error(`Unknown reference "${name}". Available: ${listReferences().join(', ')}`);
  return fs.readFileSync(file, 'utf8');
}

export function skillCatalog() {
  const byPhase = {};
  for (const [key, s] of loadSkillIndex()) (byPhase[s.phase] ??= []).push(`- **${key}**: ${s.description}`);
  return ['meta', 'define', 'plan', 'build', 'verify', 'review', 'ship', 'other'].filter(p => byPhase[p]).map(p => `### ${p.toUpperCase()}\n${byPhase[p].join('\n')}`).join('\n\n');
}
