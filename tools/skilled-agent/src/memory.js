// Simple persistent key/value memory stored as JSON.
import fs from 'node:fs';
import { config } from './config.js';

function load() { try { return JSON.parse(fs.readFileSync(config.paths.memory, 'utf8')); } catch { return { items: [] }; } }
function save(db) { fs.writeFileSync(config.paths.memory, JSON.stringify(db, null, 2)); }

export function remember(key, value, tags = []) {
  const db = load();
  const now = new Date().toISOString();
  const existing = db.items.find(i => i.key === key);
  if (existing) Object.assign(existing, { value, tags, updatedAt: now });
  else db.items.push({ key, value, tags, createdAt: now, updatedAt: now });
  save(db);
  return existing ? 'updated' : 'created';
}

export function forget(key) {
  const db = load();
  const before = db.items.length;
  db.items = db.items.filter(i => i.key !== key);
  save(db);
  return before !== db.items.length;
}

export function recall(query) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  return load().items
    .map(i => ({ i, score: q.reduce((s, w) => s + (i.key.toLowerCase().includes(w) ? 2 : 0) + (String(i.value).toLowerCase().includes(w) ? 1 : 0) + (i.tags?.some(t => t.toLowerCase().includes(w)) ? 1 : 0), 0) }))
    .filter(x => x.score > 0 || q.length === 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.i);
}

export function recallAll() { return load().items; }
