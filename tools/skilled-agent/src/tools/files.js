import fs from 'node:fs';
import path from 'node:path';
import { registerTool, resolvePath, truncate } from './registry.js';
import { runCommand } from './shell.js';
import { config } from '../config.js';

registerTool({
  name: 'read_file',
  description: 'Read a text file. Returns content with line numbers. Supports offset/limit for large files.',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string' }, offset: { type: 'integer', description: '1-based first line' }, limit: { type: 'integer', description: 'Max lines (default 400)' } },
    required: ['path'],
  },
  async run({ path: p, offset = 1, limit = 400 }) {
    const file = resolvePath(p);
    if (!fs.existsSync(file)) return `File not found: ${file}`;
    const st = fs.statSync(file);
    if (st.isDirectory()) return `Is a directory: ${file}\n` + fs.readdirSync(file).join('\n');
    if (st.size > 5_000_000) return `File too large (${st.size} bytes). Use bash (head/sed) instead.`;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const slice = lines.slice(offset - 1, offset - 1 + limit);
    const width = String(offset + slice.length).length;
    const body = slice.map((l, i) => `${String(offset + i).padStart(width)}│${l}`).join('\n');
    const more = lines.length > offset - 1 + limit ? `\n... (${lines.length - (offset - 1 + limit)} more lines; total ${lines.length})` : '';
    return truncate(body + more);
  },
});

registerTool({
  name: 'write_file',
  description: 'Create or overwrite a file with the given content. Parent directories are created.',
  parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  async run({ path: p, content }) {
    const file = resolvePath(p);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existed = fs.existsSync(file);
    fs.writeFileSync(file, content);
    return `${existed ? 'Overwrote' : 'Created'} ${file} (${Buffer.byteLength(content)} bytes, ${content.split('\n').length} lines)`;
  },
});

registerTool({
  name: 'edit_file',
  description: 'Edit a file by replacing an exact text snippet with new text. old_text must match exactly once (whitespace-tolerant fallback). Use replace_all to replace every occurrence.',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string' }, old_text: { type: 'string' }, new_text: { type: 'string' }, replace_all: { type: 'boolean' } },
    required: ['path', 'old_text', 'new_text'],
  },
  async run({ path: p, old_text, new_text, replace_all = false }) {
    const file = resolvePath(p);
    if (!fs.existsSync(file)) return `File not found: ${file}`;
    let src = fs.readFileSync(file, 'utf8');
    const count = src.split(old_text).length - 1;
    if (count === 0) {
      const esc = old_text.trim().split(/\s+/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
      const re = new RegExp(esc, 'g');
      const matches = src.match(re) ?? [];
      if (matches.length === 0) return `old_text not found in ${p}. Read the file and copy the exact snippet.`;
      if (matches.length > 1 && !replace_all) return `old_text matched ${matches.length} times (fuzzy). Provide more context or set replace_all.`;
      src = replace_all ? src.replace(re, () => new_text) : src.replace(new RegExp(esc), () => new_text);
      fs.writeFileSync(file, src);
      return `Edited ${p} (fuzzy match, ${replace_all ? matches.length : 1} replacement)`;
    }
    if (count > 1 && !replace_all) return `old_text matched ${count} times. Provide more surrounding context or set replace_all=true.`;
    src = replace_all ? src.split(old_text).join(new_text) : src.replace(old_text, () => new_text);
    fs.writeFileSync(file, src);
    return `Edited ${p} (${replace_all ? count : 1} replacement)`;
  },
});

const IGN = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.venv', '__pycache__', '.cache', 'coverage']);

registerTool({
  name: 'list_dir',
  description: 'List a directory tree (depth-limited), ignoring node_modules/.git/build artifacts.',
  parameters: { type: 'object', properties: { path: { type: 'string' }, depth: { type: 'integer', description: 'default 2' } } },
  async run({ path: p = '.', depth = 2 }) {
    const root = resolvePath(p);
    if (!fs.existsSync(root)) return `Not found: ${root}`;
    const out = [root + '/'];
    const rec = (dir, d, prefix) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));
      for (const e of entries) {
        if (IGN.has(e.name)) { out.push(`${prefix}${e.name}/ (ignored)`); continue; }
        out.push(`${prefix}${e.name}${e.isDirectory() ? '/' : ''}`);
        if (e.isDirectory() && d < depth) rec(path.join(dir, e.name), d + 1, prefix + '  ');
        if (out.length > 2000) return;
      }
    };
    rec(root, 1, '  ');
    return truncate(out.join('\n'));
  },
});

registerTool({
  name: 'glob',
  description: 'Find files matching a glob pattern (e.g. "src/**/*.js"). Returns paths relative to the working directory.',
  parameters: { type: 'object', properties: { pattern: { type: 'string' }, cwd: { type: 'string' } }, required: ['pattern'] },
  async run({ pattern, cwd }) {
    const root = resolvePath(cwd ?? '.');
    const ign = /(^|\/)(node_modules|\.git|dist|build|\.venv|__pycache__)(\/|$)/;
    const results = fs.globSync(pattern, { cwd: root }).filter(f => !ign.test(f)).sort();
    return results.length ? truncate(results.slice(0, 1000).join('\n') + (results.length > 1000 ? `\n... ${results.length - 1000} more` : '')) : 'No matches';
  },
});

registerTool({
  name: 'grep',
  description: 'Search file contents with a regex (uses ripgrep if available, else grep -rn). Returns file:line:match.',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string' }, path: { type: 'string' }, glob: { type: 'string', description: 'e.g. "*.ts"' },
      case_insensitive: { type: 'boolean' }, max_results: { type: 'integer', description: 'default 200' },
    },
    required: ['pattern'],
  },
  async run({ pattern, path: p = '.', glob, case_insensitive = false, max_results = 200 }) {
    const root = resolvePath(p);
    const hasRg = (await runCommand('command -v rg', {})).code === 0;
    const q = JSON.stringify(pattern);
    const cmd = hasRg
      ? `rg -n --no-heading --color never ${case_insensitive ? '-i' : ''} ${glob ? `-g ${JSON.stringify(glob)}` : ''} -e ${q} ${JSON.stringify(root)} | head -n ${max_results}`
      : `grep -rnE ${case_insensitive ? '-i' : ''} ${glob ? `--include=${JSON.stringify(glob)}` : ''} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist -e ${q} ${JSON.stringify(root)} | head -n ${max_results}`;
    const r = await runCommand(cmd, { cwd: config.agent.workdir });
    const out = r.stdout.split('\n').map(l => l.startsWith(root) ? path.relative(config.agent.workdir, l.split(':')[0]) + l.slice(l.indexOf(':', root.length)) : l).join('\n').trim();
    return out || 'No matches';
  },
});
