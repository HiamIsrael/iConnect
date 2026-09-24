# Implementation Plan: iConnect Guide Assistant

## Overview

Add a deterministic, navigation-only assistant to the public website. The guide uses project-owned intent data and never calls an external AI service in the first release.

## Architecture Decisions

1. Keep intent knowledge and matching as pure modules so most behavior is tested without a browser.
2. Keep the widget local to the frontend; do not add API routes, transcript storage, or new dependencies.
3. Generate navigation from a static allowlist, never from user text.
4. Use the existing design tokens and accessibility conventions.
5. Make the widget additive and dismissible; it cannot replace normal navigation.

## Tasks

### Phase 1: Knowledge and matcher

- [ ] Task A1: Define approved guide intents and destination allowlist.
- [ ] Task A2: Implement normalization and deterministic intent scoring.
- [ ] Task A3: Add matcher and knowledge tests.

### Checkpoint: Matcher

- [ ] Known prompts match the expected intent.
- [ ] Unknown prompts use fallback.
- [ ] Returned destinations are allowlisted.
- [ ] `npm test` passes.

### Phase 2: Widget

- [ ] Task A4: Build the accessible launcher and panel shell.
- [ ] Task A5: Add message history, quick prompts, form states, and navigation actions.
- [ ] Task A6: Add current-route context and responsive/reduced-motion behavior.

### Checkpoint: Widget

- [ ] Keyboard and Escape behavior works.
- [ ] Focus enters and returns correctly.
- [ ] Core website navigation works with the widget closed.
- [ ] `npm run build` passes.

### Phase 3: Verification

- [ ] Task A7: Run browser, accessibility, console, network, and responsive checks.
- [ ] Task A8: Code-quality, security, and simplification review.
- [ ] Task A9: Document the assistant and prepare delivery.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Guide becomes generic or inaccurate | High | Curated intents, approval gate, tests for every answer. |
| User text becomes an open redirect | High | Static route allowlist and tests. |
| Widget obscures mobile content | Medium | Responsive panel, viewport review, dismissible launcher. |
| Users assume actions were completed | Medium | Navigation-only copy and explicit boundaries. |
| Future AI integration leaks private data | High | Keep external provider out of v1 and require a separate security review. |

## Completion Gate

Do not add a provider-backed model until A1–A9 are complete and the public website QA gate has passed.
