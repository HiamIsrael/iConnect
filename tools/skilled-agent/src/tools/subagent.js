// Delegation: spawn focused sub-agents (same core, isolated context), optionally in parallel.
import { registerTool, getTool } from './registry.js';

registerTool({
  name: 'delegate',
  description: 'Delegate a self-contained task to a sub-agent with a fresh context and the full tool belt. Use for parallelizable or context-heavy subtasks (e.g. "audit security of server/", "research X and summarize", "write tests for module Y"). Returns the sub-agent\'s final report. Provide all context it needs in the task text.',
  parameters: {
    type: 'object',
    properties: {
      task: { type: 'string' }, role: { type: 'string', description: 'e.g. "security auditor", "test engineer", "researcher"' },
      skills: { type: 'array', items: { type: 'string' } }, max_iterations: { type: 'integer', description: 'default 25' },
    },
    required: ['task'],
  },
  async run({ task, role, skills = [], max_iterations = 25 }, ctx) {
    if ((ctx?.depth ?? 0) >= 2) return 'Delegation depth limit reached; do the task yourself.';
    const { Agent } = await import('../agent.js');
    const extra = [role ? `You are acting as: ${role}.` : '', skills.length ? `Load these skills first: ${skills.join(', ')}.` : ''].filter(Boolean).join('\n');
    const sub = new Agent({ role: 'subagent', extra, maxIterations: max_iterations, depth: (ctx?.depth ?? 0) + 1 });
    let toolsUsed = 0;
    const result = await sub.run(task, { onEvent: e => { if (e.type === 'tool_call') toolsUsed++; ctx?.onEvent?.({ ...e, sub: true, depth: sub.depth }); } });
    return `[sub-agent${role ? ` (${role})` : ''} finished after ${toolsUsed} tool calls]\n\n${result}`;
  },
});

registerTool({
  name: 'delegate_parallel',
  description: 'Run several independent sub-agent tasks concurrently and return all reports. Each task should be self-contained.',
  parameters: {
    type: 'object',
    properties: { tasks: { type: 'array', items: { type: 'object', properties: { task: { type: 'string' }, role: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } } }, required: ['task'] } } },
    required: ['tasks'],
  },
  async run({ tasks }, ctx) {
    const delegate = getTool('delegate');
    const results = await Promise.all(tasks.slice(0, 6).map((t, i) => delegate.run(t, ctx).then(r => `## Task ${i + 1}: ${t.task.slice(0, 80)}\n${r}`).catch(e => `## Task ${i + 1} failed: ${e.message}`)));
    return results.join('\n\n');
  },
});
