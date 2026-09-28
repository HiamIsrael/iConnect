// Scheduled tasks: run a prompt (agent job) or shell command once, every N minutes, or on a 5-field cron.
import fs from 'node:fs';
import { config } from './config.js';

function load() { try { return JSON.parse(fs.readFileSync(config.paths.jobs, 'utf8')); } catch { return { jobs: [] }; } }
function save(db) { fs.writeFileSync(config.paths.jobs, JSON.stringify(db, null, 2)); }

export function listJobs() { return load().jobs; }

export function addJob({ name, kind = 'prompt', payload, runAt, everyMinutes, cron, notify }) {
  const db = load();
  const id = `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const job = {
    id, name: name ?? payload.slice(0, 60), kind, payload, notify: notify ?? null,
    runAt: runAt ? new Date(runAt).toISOString() : null, everyMinutes: everyMinutes ?? null, cron: cron ?? null,
    createdAt: new Date().toISOString(), lastRunAt: null, lastResult: null, runs: 0, enabled: true,
  };
  job.nextRunAt = computeNext(job, new Date());
  db.jobs.push(job); save(db);
  return job;
}

export function removeJob(id) {
  const db = load(); const n = db.jobs.length;
  db.jobs = db.jobs.filter(j => j.id !== id); save(db);
  return n !== db.jobs.length;
}

function computeNext(job, from) {
  if (job.cron) return nextCron(job.cron, from)?.toISOString() ?? null;
  if (job.everyMinutes) return new Date(from.getTime() + job.everyMinutes * 60000).toISOString();
  if (job.runAt && job.runs === 0) return job.runAt;
  return null;
}

function matchField(expr, val, min) {
  return expr.split(',').some(part => {
    const [range, stepS] = part.split('/');
    const step = stepS ? +stepS : 1;
    let lo = min, hi = 59 + min;
    if (range !== '*') {
      if (range.includes('-')) [lo, hi] = range.split('-').map(Number);
      else { lo = hi = +range; if (!stepS) return val === lo; hi = 59; }
    }
    return val >= lo && val <= hi && (val - lo) % step === 0;
  });
}
export function nextCron(expr, from) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error('cron must have 5 fields: min hour dom mon dow');
  const d = new Date(from); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (matchField(f[0], d.getMinutes(), 0) && matchField(f[1], d.getHours(), 0) && matchField(f[2], d.getDate(), 1) && matchField(f[3], d.getMonth() + 1, 1) && matchField(f[4], d.getDay(), 0)) return d;
    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}

let timer = null;
export function startScheduler(runner, { intervalMs = 15000, log = () => {} } = {}) {
  if (timer) return;
  const tick = async () => {
    const db = load();
    const now = new Date();
    for (const job of db.jobs) {
      if (!job.enabled || !job.nextRunAt || new Date(job.nextRunAt) > now) continue;
      job.lastRunAt = now.toISOString(); job.runs++; job.nextRunAt = computeNext(job, now); save(db);
      log(`▶ job ${job.id} (${job.name})`);
      try { job.lastResult = String(await runner(job)).slice(0, 4000); } catch (e) { job.lastResult = `ERROR: ${e.message}`; }
      log(`■ job ${job.id} done`);
      const fresh = load(); const j = fresh.jobs.find(x => x.id === job.id);
      if (j) { Object.assign(j, { lastRunAt: job.lastRunAt, lastResult: job.lastResult, runs: job.runs, nextRunAt: job.nextRunAt }); save(fresh); }
    }
  };
  timer = setInterval(() => tick().catch(e => log(`scheduler error: ${e.message}`)), intervalMs);
  timer.unref?.();
  tick().catch(() => {});
}
export function stopScheduler() { if (timer) clearInterval(timer); timer = null; }
