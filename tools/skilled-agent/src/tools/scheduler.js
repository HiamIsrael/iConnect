import { registerTool } from './registry.js';
import { addJob, listJobs, removeJob } from '../scheduler.js';

registerTool({
  name: 'schedule_task',
  description: 'Schedule work for later: an agent prompt (kind="prompt") executed autonomously, or a shell command (kind="shell"). Specify exactly one of run_at (ISO datetime), every_minutes, or cron ("min hour dom mon dow"). Set notify to "telegram:<chat_id>" or "whatsapp:<number>" to deliver the result to a chat. Jobs run while the agent server/REPL is running.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string' }, kind: { type: 'string', enum: ['prompt', 'shell'] }, payload: { type: 'string' },
      run_at: { type: 'string' }, every_minutes: { type: 'number' }, cron: { type: 'string', description: 'e.g. "0 9 * * 1-5"' },
      notify: { type: 'string', description: 'telegram:<chat_id> | whatsapp:<number>' },
    },
    required: ['payload'],
  },
  async run({ name, kind = 'prompt', payload, run_at, every_minutes, cron, notify }, ctx) {
    if (!run_at && !every_minutes && !cron) return 'Provide run_at, every_minutes or cron.';
    const sid = ctx?.agent?.sessionId ?? '';
    notify ??= sid.startsWith('tg-') ? `telegram:${sid.slice(3)}` : sid.startsWith('wa-') ? `whatsapp:${sid.slice(3)}` : undefined;
    const job = addJob({ name, kind, payload, runAt: run_at, everyMinutes: every_minutes, cron, notify });
    return `Scheduled ${job.id} "${job.name}" — next run: ${job.nextRunAt}${job.notify ? ` (results → ${job.notify})` : ''}`;
  },
});

registerTool({
  name: 'list_scheduled_tasks',
  description: 'List scheduled tasks with their next/last run and last result.',
  parameters: { type: 'object', properties: {} },
  async run() {
    const jobs = listJobs();
    if (!jobs.length) return 'No scheduled tasks';
    return jobs.map(j => `${j.id} | ${j.name} | ${j.kind} | next=${j.nextRunAt ?? '-'} | last=${j.lastRunAt ?? '-'} runs=${j.runs}${j.notify ? ` → ${j.notify}` : ''}${j.lastResult ? `\n    last result: ${j.lastResult.slice(0, 300).replace(/\n/g, ' ')}` : ''}`).join('\n');
  },
});

registerTool({
  name: 'cancel_scheduled_task',
  description: 'Cancel/remove a scheduled task by id.',
  parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  async run({ id }) { return removeJob(id) ? `Removed ${id}` : `No job ${id}`; },
});
