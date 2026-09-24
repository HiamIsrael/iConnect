# iConnect Guide Assistant — Task List

Source: `SPEC-ASSISTANT.md` and `tasks/assistant-plan.md`

## Phase 1: Knowledge and matcher

- [ ] A1 — Define approved intents and destinations
- [ ] A2 — Implement normalization and deterministic scoring
- [ ] A3 — Add matcher and knowledge tests

## Matcher checkpoint

- [ ] Known prompts match correctly
- [ ] Unknown prompts fall back safely
- [ ] Destinations are allowlisted
- [ ] `npm test` passes

## Phase 2: Widget

- [ ] A4 — Build accessible launcher and panel shell
- [ ] A5 — Add conversation history, quick prompts, and navigation actions
- [ ] A6 — Add current-route context and responsive behavior

## Widget checkpoint

- [ ] Keyboard, Escape, and focus return work
- [ ] Core site works with widget closed
- [ ] `npm run build` passes

## Phase 3: Verification

- [ ] A7 — Browser/accessibility/performance verification
- [ ] A8 — Code-quality and security review
- [ ] A9 — Documentation and delivery preparation

The assistant remains navigation-only until a separate approved spec authorizes any external AI provider or data mutation.
