# iConnect

## AI agent skills

This repo ships [Addy Osmani's Agent Skills](https://github.com/addyosmani/agent-skills)
(v0.6.10) so that AI coding agents follow the same engineering workflow —
spec → plan → build → test → review → ship.

- `AGENTS.md` / `CLAUDE.md` — instructions every agent reads first
- `.agents/skills/` — 25 skills, auto-discovered by Codex, Cursor, Gemini CLI,
  OpenCode, GitHub Copilot and others
- `.claude/` — Claude Code skills (symlinked), 9 slash commands, 4 subagents
- `.gemini/commands/` — the same slash commands for Gemini CLI

Browse what's installed:

```bash
node tools/skills-browser/server.mjs   # → http://localhost:4173
```

Update to the latest upstream skills:

```bash
npx skills update
```
