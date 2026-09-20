@AGENTS.md

# Claude Code notes

Everything above applies. In addition, this project wires the Agent Skills pack
into Claude Code natively:

- **Skills** — `.claude/skills/<name>/` (symlinks to `.agents/skills/`). They
  activate from their descriptions; you can also invoke one explicitly with the
  Skill tool.
- **Slash commands** — `.claude/commands/`:
  `/spec` → `/plan` → `/build` (or `/build auto`) → `/test` → `/review` → `/ship`,
  plus `/constraints`, `/webperf`, `/code-simplify`.
- **Subagents** — `.claude/agents/`: `code-reviewer`, `security-auditor`,
  `test-engineer`, `web-performance-auditor`. Personas do not call other
  personas; `/ship` is the only fan-out orchestrator (it runs the first three in
  parallel and merges their reports into a go/no-go).
- **Shared checklists** — `.claude/references/` → `.agents/references/`.
