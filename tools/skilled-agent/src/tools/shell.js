import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerTool, resolvePath, truncate } from './registry.js';
import { config } from '../config.js';

export function runCommand(cmd, { cwd, timeoutMs = config.agent.shellTimeoutMs, env = {}, shell = 'bash', input } = {}) {
  return new Promise(resolve => {
    const child = spawn(shell, ['-lc', cmd], {
      cwd, env: { ...process.env, ...env, TERM: 'dumb', CI: process.env.CI ?? '1' },
      stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], detached: true,
    });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    const timer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }, timeoutMs);
    if (input) { child.stdin.write(input); child.stdin.end(); }
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout: out, stderr: err, timedOut: signal === 'SIGKILL' }); });
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, stdout: out, stderr: String(e), timedOut: false }); });
  });
}

const DANGEROUS = /\brm\s+-rf\s+[\/~]|\bmkfs\b|\bdd\s+if=|:\(\)\s*\{|\bshutdown\b|\breboot\b|git\s+push\s+.*--force|\bDROP\s+(TABLE|DATABASE)\b/i;

registerTool({
  name: 'bash',
  description: 'Run a bash command in the working directory (or a given cwd). Returns stdout, stderr and exit code. Use for builds, tests, git, package managers, system inspection, etc. Do not start long-running servers here; use start_background_process.',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The bash command to run' },
      cwd: { type: 'string', description: 'Working directory (relative to agent workdir or absolute)' },
      timeout_seconds: { type: 'number', description: 'Max seconds before the command is killed (default 120)' },
    },
    required: ['command'],
  },
  dangerous: args => DANGEROUS.test(args.command ?? ''),
  async run({ command, cwd, timeout_seconds }) {
    const r = await runCommand(command, { cwd: resolvePath(cwd ?? '.'), timeoutMs: (timeout_seconds ?? 120) * 1000 });
    const parts = [];
    if (r.stdout) parts.push(`stdout:\n${r.stdout}`);
    if (r.stderr) parts.push(`stderr:\n${r.stderr}`);
    parts.push(`exit code: ${r.code}${r.timedOut ? ' (timed out)' : ''}`);
    return truncate(parts.join('\n'));
  },
});

registerTool({
  name: 'run_python',
  description: 'Execute a Python 3 script (given as source code) and return its output. Good for data processing, math, parsing, quick scripts. Files can be read/written relative to the working directory.',
  parameters: { type: 'object', properties: { code: { type: 'string' }, timeout_seconds: { type: 'number' } }, required: ['code'] },
  async run({ code, timeout_seconds }) {
    const file = path.join(os.tmpdir(), `agent_py_${process.pid}_${Date.now()}.py`);
    fs.writeFileSync(file, code);
    try {
      const r = await runCommand(`python3 ${JSON.stringify(file)}`, { cwd: config.agent.workdir, timeoutMs: (timeout_seconds ?? 120) * 1000 });
      return truncate(`${r.stdout}${r.stderr ? `\nstderr:\n${r.stderr}` : ''}\nexit code: ${r.code}`);
    } finally { fs.rmSync(file, { force: true }); }
  },
});

const procs = new Map();
let seq = 0;

registerTool({
  name: 'start_background_process',
  description: 'Start a long-running process (dev server, watcher) in the background. Returns an id and initial logs. Use get_process_logs / stop_process to manage it.',
  parameters: {
    type: 'object',
    properties: { command: { type: 'string' }, cwd: { type: 'string' }, name: { type: 'string' }, wait_seconds: { type: 'number', description: 'default 3' } },
    required: ['command'],
  },
  async run({ command, cwd, name, wait_seconds = 3 }) {
    const id = `proc_${++seq}`;
    const child = spawn('bash', ['-lc', command], { cwd: resolvePath(cwd ?? '.'), env: { ...process.env, TERM: 'dumb' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const entry = { id, name: name ?? command, command, child, log: '', alive: true, exitCode: null };
    const push = d => { entry.log = (entry.log + d).slice(-200000); };
    child.stdout.on('data', push); child.stderr.on('data', push);
    child.on('close', code => { entry.alive = false; entry.exitCode = code; });
    procs.set(id, entry);
    await new Promise(r => setTimeout(r, wait_seconds * 1000));
    return `process ${id} (${entry.name}) pid=${child.pid} alive=${entry.alive}\n${truncate(entry.log, 4000)}`;
  },
});

registerTool({
  name: 'get_process_logs',
  description: 'Get the latest logs and status of a background process started with start_background_process.',
  parameters: { type: 'object', properties: { id: { type: 'string' }, tail_chars: { type: 'number' } }, required: ['id'] },
  async run({ id, tail_chars = 6000 }) {
    const e = procs.get(id);
    if (!e) return `No such process. Running: ${[...procs.keys()].join(', ') || 'none'}`;
    return `process ${id} (${e.name}) alive=${e.alive} exit=${e.exitCode}\n${e.log.slice(-tail_chars)}`;
  },
});

registerTool({
  name: 'stop_process',
  description: 'Stop a background process by id.',
  parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  async run({ id }) {
    const e = procs.get(id);
    if (!e) return 'No such process';
    try { process.kill(-e.child.pid, 'SIGTERM'); } catch { e.child.kill('SIGTERM'); }
    await new Promise(r => setTimeout(r, 1000));
    if (e.alive) { try { process.kill(-e.child.pid, 'SIGKILL'); } catch {} }
    return `stopped ${id}; last logs:\n${e.log.slice(-2000)}`;
  },
});

export function listProcesses() { return [...procs.values()].map(({ id, name, alive, exitCode }) => ({ id, name, alive, exitCode })); }
