#!/usr/bin/env node
// CLI: agent "task" | agent (REPL) | agent serve | agent telegram | agent skills|tools|jobs|models|doctor
import readline from 'node:readline';
import { config } from '../src/config.js';
import { Agent } from '../src/agent.js';
import { loadSkillIndex } from '../src/skills/loader.js';
import { listJobs, startScheduler } from '../src/scheduler.js';
import { connectMcpServers, closeMcp } from '../src/mcp/client.js';
import { listModels } from '../src/llm/openai.js';
import { runCommand } from '../src/tools/shell.js';
import { allTools } from '../src/tools/index.js';

const c = { dim: s => `\x1b[2m${s}\x1b[0m`, bold: s => `\x1b[1m${s}\x1b[0m`, cyan: s => `\x1b[36m${s}\x1b[0m`, yellow: s => `\x1b[33m${s}\x1b[0m`, green: s => `\x1b[32m${s}\x1b[0m`, red: s => `\x1b[31m${s}\x1b[0m`, mag: s => `\x1b[35m${s}\x1b[0m` };

const argv = process.argv.slice(2), flags = {}, positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); }
  else positional.push(a);
}
if (flags.model) config.llm.model = flags.model;
if (flags.workdir) config.agent.workdir = flags.workdir;
if (flags.approval) config.agent.approval = flags.approval;
const cmd = positional[0];

function printEvent(e) {
  if (e.type === 'text') process.stdout.write(e.delta);
  else if (e.type === 'text_end') process.stdout.write('\n');
  else if (e.type === 'tool_call') {
    const a = JSON.stringify(e.args); const pre = e.sub ? c.mag(`  ${'·'.repeat(e.depth)}sub `) : '';
    process.stdout.write(`\n${pre}${c.yellow('⚙ ' + e.name)} ${c.dim(a.length > 200 ? a.slice(0, 200) + '…' : a)}\n`);
  } else if (e.type === 'tool_result') {
    const lines = e.output.split('\n'); const n = flags.verbose ? 400 : 12;
    process.stdout.write(c.dim(lines.slice(0, n).join('\n').replace(/^/gm, '  │ ') + (lines.length > n ? `\n  │ … (${lines.length - n} more lines)` : '') + `\n  └ ${e.ms}ms\n`));
  } else if (e.type === 'error') process.stdout.write(c.red(`\n✖ ${e.message}\n`));
  else if (e.type === 'done') process.stdout.write(c.dim(`\n[tokens in=${e.usage.prompt_tokens} out=${e.usage.completion_tokens}]\n`));
}

const makeApprover = rl => (name, args) => new Promise(resolve => {
  (rl ?? readline.createInterface({ input: process.stdin, output: process.stdout })).question(`${c.red('⚠ Dangerous action:')} ${name} ${JSON.stringify(args).slice(0, 300)}\nAllow? [y/N] `, ans => resolve(/^y(es)?$/i.test(ans.trim())));
});

async function jobRunner(job) {
  if (job.kind === 'shell') { const r = await runCommand(job.payload, { cwd: config.agent.workdir }); return `${r.stdout}${r.stderr}exit ${r.code}`; }
  return new Agent({ sessionId: `job-${job.id}` }).run(job.payload, { onEvent: printEvent });
}

async function main() {
  if (cmd === 'setup') { const { runSetup } = await import('../src/setup.js'); return runSetup(); }
  if (cmd === 'serve') { const { startServer } = await import('../src/server/index.js'); return startServer(); }
  if (cmd === 'telegram') {
    const { startTelegram } = await import('../src/channels/telegram.js');
    await connectMcpServers(m => console.log(c.dim(m)));
    startScheduler(jobRunner, { log: m => console.log(c.dim(m)) });
    return startTelegram({ log: console.log });
  }
  if (cmd === 'skills') { for (const [k, s] of loadSkillIndex()) console.log(`${c.bold(k)} ${c.dim('[' + s.phase + ']')}\n  ${s.description}\n`); return; }
  if (cmd === 'tools') { for (const t of allTools()) console.log(`${c.bold(t.name)}\n  ${t.description}\n`); return; }
  if (cmd === 'jobs') { console.table(listJobs().map(({ id, name, kind, nextRunAt, lastRunAt, runs, notify }) => ({ id, name, kind, nextRunAt, lastRunAt, runs, notify }))); return; }
  if (cmd === 'models') { try { console.log((await listModels()).join('\n')); } catch (e) { console.error(c.red(e.message)); } return; }
  if (cmd === 'doctor') {
    console.log(c.bold('Skilled Agent — doctor'));
    console.log(`LLM endpoint : ${config.llm.baseUrl}\nModel        : ${config.llm.model}\nAPI key      : ${config.llm.apiKey ? 'set (' + config.llm.apiKey.slice(0, 6) + '…)' : c.red('NOT SET')}`);
    console.log(`Workdir      : ${config.agent.workdir}\nData dir     : ${config.paths.data}\nApproval     : ${config.agent.approval}\nSkills       : ${loadSkillIndex().size}\nTools        : ${allTools().length}`);
    console.log(`Telegram     : ${process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'off'}   WhatsApp: ${process.env.WHATSAPP_TOKEN ? 'configured' : 'off'}   STT: ${process.env.STT_BASE_URL ?? 'via LLM endpoint'}`);
    try { const ms = await listModels(); console.log(c.green(`Endpoint OK  : ${ms.length} models (${ms.includes(config.llm.model) ? 'configured model available' : 'configured model NOT in list — check LLM_MODEL'})`)); }
    catch (e) { console.log(c.red(`Endpoint     : ${e.message}`)); }
    return;
  }
  if (cmd === 'help' || flags.help) {
    console.log(`Usage:
  agent "task description"     one-shot run in the current directory
  agent                        interactive REPL (scheduler runs in background)
  agent serve                  web UI + HTTP API + WhatsApp webhook (+ Telegram if TELEGRAM_BOT_TOKEN set)
  agent telegram               Telegram bot only (long polling, no public URL needed)
  agent setup                  guided first-run wizard (writes .env)
  agent skills | tools | jobs | models | doctor

Flags: --model <id> --workdir <path> --approval auto|ask|deny --session <id> --verbose --continue`);
    return;
  }

  await connectMcpServers(m => console.error(c.dim(m)));
  const sessionId = flags.session ?? (flags.continue ? 'cli-default' : undefined);

  if (cmd) {
    const agent = new Agent({ sessionId, approve: config.agent.approval === 'ask' ? makeApprover() : undefined });
    const text = await agent.run(positional.join(' '), { onEvent: printEvent });
    if (!process.stdout.isTTY) console.log(text);
    closeMcp(); return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const agent = new Agent({ sessionId: sessionId ?? 'cli-default', approve: config.agent.approval === 'ask' ? makeApprover(rl) : undefined });
  startScheduler(jobRunner, { log: m => console.log(c.dim(m)) });
  console.log(c.bold('Skilled Agent') + c.dim(` · ${config.llm.model} · ${config.agent.workdir}\nCommands: /reset /skills /tools /jobs /model <id> /exit`));
  const ask = () => rl.question(c.cyan('\n❯ '), async line => {
    const input = line.trim();
    if (!input) return ask();
    if (input === '/exit' || input === '/quit') { closeMcp(); rl.close(); return; }
    if (input === '/reset') { agent.reset(); console.log('context cleared'); return ask(); }
    if (input === '/skills') { for (const [k, s] of loadSkillIndex()) console.log(`${c.bold(k)} — ${s.description.slice(0, 100)}…`); return ask(); }
    if (input === '/tools') { console.log(allTools().map(t => t.name).join(', ')); return ask(); }
    if (input === '/jobs') { console.table(listJobs().map(({ id, name, nextRunAt, runs }) => ({ id, name, nextRunAt, runs }))); return ask(); }
    if (input.startsWith('/model ')) { config.llm.model = input.slice(7).trim(); console.log(`model → ${config.llm.model}`); return ask(); }
    const ctrl = new AbortController();
    const onSig = () => { ctrl.abort(new Error('interrupted')); console.log(c.red('\n(interrupted)')); };
    process.once('SIGINT', onSig);
    await agent.run(input, { onEvent: printEvent, signal: ctrl.signal });
    process.off('SIGINT', onSig);
    ask();
  });
  ask();
  rl.on('close', () => { closeMcp(); process.exit(0); });
}

main().catch(e => { console.error(c.red(e.stack ?? e.message)); process.exit(1); });
