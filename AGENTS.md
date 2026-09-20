# iConnect — Agent Instructions

This file is read by AI coding agents (Codex, Cursor, Gemini CLI, OpenCode,
GitHub Copilot, Zed, and others). Claude Code reads `CLAUDE.md`, which imports
this file.

## Engineering skills

This repository vendors the **[Agent Skills](https://github.com/addyosmani/agent-skills)**
pack by Addy Osmani (v0.6.10, MIT) — 25 workflow skills covering the full
development lifecycle. They live in `.agents/skills/<skill-name>/SKILL.md` and
are discovered automatically: each skill's frontmatter `description` tells the
agent when it applies. Apply the matching skill without being asked; when a
task is ambiguous, read `.agents/skills/using-agent-skills/SKILL.md` for the
routing flowchart.

Shared checklists referenced by the skills (`../../references/*.md`) are in
`.agents/references/`.

### Workflow

```
 DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 Idea/Spec  ───▶ Tasks    ───▶  Code     ───▶  Test/Debug ──▶ QA gate  ───▶  Go live
```

| Phase  | Skills |
|--------|--------|
| Define | `interview-me`, `idea-refine`, `spec-driven-development`, `constraint-driven-development` |
| Plan   | `planning-and-task-breakdown` |
| Build  | `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `doubt-driven-development`, `frontend-ui-engineering`, `api-and-interface-design` |
| Verify | `browser-testing-with-devtools`, `debugging-and-error-recovery` |
| Review | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` |
| Ship   | `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `observability-and-instrumentation`, `shipping-and-launch` |
| Meta   | `using-agent-skills` |

### Non-negotiables

- **Spec before code.** New features or significant changes start with
  `spec-driven-development` (output: `SPEC.md`), then
  `planning-and-task-breakdown` (output: `tasks/plan.md`, `tasks/todo.md`).
- **Tests are proof.** Follow `test-driven-development` for any logic change or
  bug fix: failing test first, then the fix. "Seems right" is not done.
- **Small, atomic changes.** Follow `incremental-implementation` and
  `git-workflow-and-versioning`: one vertical slice at a time, commits of
  roughly 100 lines, always leave the tree green.
- **Review before merge.** Run `code-review-and-quality` (and
  `security-and-hardening` for anything touching input, auth, data, or
  external integrations) before declaring work complete.
- **Ask before irreversible actions** — destructive migrations, deletions,
  deploys, secrets, payments, auth/permission changes.

### Artifacts the skills produce

| File | Produced by |
|------|-------------|
| `SPEC.md` | `spec-driven-development` |
| `CONSTRAINTS.md` | `constraint-driven-development` |
| `tasks/plan.md`, `tasks/todo.md` | `planning-and-task-breakdown` |
| `docs/adr/*.md` | `documentation-and-adrs` |

Commit these alongside the code they describe.

## Where things live

| Path | Read by | Contents |
|------|---------|----------|
| `.agents/skills/` | Codex, Cursor, Gemini CLI, OpenCode, Copilot, Zed, Cline… | 25 skills (canonical copy) |
| `.agents/references/` | linked from skills | 7 shared checklists |
| `.claude/skills/` | Claude Code | symlinks → `.agents/skills/` |
| `.claude/commands/` | Claude Code | `/spec` `/plan` `/build` `/test` `/constraints` `/review` `/webperf` `/code-simplify` `/ship` |
| `.claude/agents/` | Claude Code | `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` |
| `.gemini/commands/` | Gemini CLI | the same nine lifecycle commands as TOML |
| `skills-lock.json` | `npx skills` | pinned source + content hashes |
| `tools/skills-browser/` | humans | local UI to browse everything above |

Agents without slash commands invoke skills by name (e.g. Codex:
`@spec-driven-development`; Copilot: `/spec-driven-development`).

## Maintaining the skills

```bash
npx skills update                 # pull the latest upstream skills (uses skills-lock.json)
node tools/skills-browser/server.mjs   # browse skills, commands, personas at http://localhost:4173
```

After an update, re-copy `references/` from upstream into `.agents/references/`
if the checklists changed — the CLI only syncs `skills/`.

Do not edit vendored skills in place; add project-specific workflow as a new
skill directory under `.agents/skills/<your-skill>/SKILL.md` or as rules in this
file.

## About iConnect

<!-- Fill in: what the product does, the tech stack, how to run/test/lint. Skills
     like spec-driven-development and test-driven-development read this section
     to discover the project's own commands rather than assuming defaults. -->
