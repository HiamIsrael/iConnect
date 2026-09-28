import { registerTool, resolvePath, truncate } from './registry.js';
import { runCommand } from './shell.js';

registerTool({
  name: 'git',
  description: 'Run a git subcommand in a repository (status, diff, log, add, commit, branch, checkout, stash...). Force-push and history rewrites are flagged as dangerous.',
  parameters: {
    type: 'object',
    properties: { args: { type: 'string', description: 'Arguments after "git", e.g. "status --short"' }, repo: { type: 'string', description: 'Repository path (default: working directory)' } },
    required: ['args'],
  },
  dangerous: a => /--force|-f\b|reset\s+--hard|clean\s+-[a-z]*f|push\s+.*(--delete|:)/i.test(a.args ?? ''),
  async run({ args, repo }) {
    const r = await runCommand(`git ${args}`, { cwd: resolvePath(repo ?? '.'), env: { GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat', PAGER: 'cat' } });
    return truncate(`${r.stdout}${r.stderr ? `\n${r.stderr}` : ''}\nexit code: ${r.code}`.trim());
  },
});
