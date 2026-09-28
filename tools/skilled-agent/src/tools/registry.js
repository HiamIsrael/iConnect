// Tool registry: each tool = { name, description, parameters (JSON schema), dangerous?, run(args, ctx) }
import path from 'node:path';
import { config } from '../config.js';

const tools = new Map();

export function registerTool(tool) {
  if (!tool.name || typeof tool.run !== 'function') throw new Error('Invalid tool');
  tools.set(tool.name, tool);
}
export function getTool(name) { return tools.get(name); }
export function allTools() { return [...tools.values()]; }

export function toolDefinitions(filter) {
  return allTools().filter(t => !filter || filter(t)).map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters ?? { type: 'object', properties: {} } },
  }));
}

export function resolvePath(p = '.') {
  if (p.startsWith('~/')) p = path.join(process.env.HOME ?? '', p.slice(2));
  return path.resolve(config.agent.workdir, p);
}

export function truncate(text, limit = config.agent.toolOutputLimit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.floor(limit * 0.7))}\n\n... [truncated ${text.length - limit} chars] ...\n\n${text.slice(-Math.floor(limit * 0.25))}`;
}
