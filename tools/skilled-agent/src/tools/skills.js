import { registerTool } from './registry.js';
import { loadSkillIndex, readSkill, readReference, listReferences } from '../skills/loader.js';
import { remember, forget, recall } from '../memory.js';

registerTool({
  name: 'list_skills',
  description: 'List all available Agent Skills with descriptions and supporting files, grouped by lifecycle phase.',
  parameters: { type: 'object', properties: { phase: { type: 'string', description: 'define|plan|build|verify|review|ship|meta' } } },
  async run({ phase }) {
    return [...loadSkillIndex().entries()].filter(([, s]) => !phase || s.phase === phase)
      .map(([k, s]) => `- ${k} [${s.phase}]${s.files.length ? ` (files: ${s.files.join(', ')})` : ''}\n    ${s.description}`).join('\n');
  },
});

registerTool({
  name: 'load_skill',
  description: 'Load the full instructions of an Agent Skill (SKILL.md) or one of its supporting files. Call this before doing work the skill covers, and follow its process.',
  parameters: { type: 'object', properties: { name: { type: 'string' }, file: { type: 'string', description: 'e.g. examples.md or references/floor-guard.md' } }, required: ['name'] },
  async run({ name, file }) { return readSkill(name, file ?? 'SKILL.md'); },
});

registerTool({
  name: 'load_reference',
  description: `Load a shared reference checklist. Available: ${listReferences().join(', ')}`,
  parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  async run({ name }) { return readReference(name); },
});

registerTool({
  name: 'save_memory',
  description: 'Persist a durable fact across sessions (user preferences, project conventions, decisions—never secrets). Shown in future system prompts.',
  parameters: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['key', 'value'] },
  async run({ key, value, tags = [] }) { return `memory ${remember(key, value, tags)}: ${key}`; },
});

registerTool({
  name: 'search_memory',
  description: 'Search persistent memory by keywords (empty query returns everything).',
  parameters: { type: 'object', properties: { query: { type: 'string' } } },
  async run({ query = '' }) {
    const r = recall(query);
    return r.length ? r.map(i => `[${i.key}] ${i.value}${i.tags?.length ? `  #${i.tags.join(' #')}` : ''}`).join('\n') : 'No memories found';
  },
});

registerTool({
  name: 'forget_memory',
  description: 'Delete a memory by key.',
  parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
  async run({ key }) { return forget(key) ? `Forgot ${key}` : `No memory with key ${key}`; },
});
