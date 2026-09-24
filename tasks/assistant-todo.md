# iConnect Guide Assistant — Task List

Source: `SPEC-ASSISTANT.md` and `tasks/assistant-plan.md`

## Phase 1: Knowledge and matcher

- [x] A1 — Define approved intents and destinations
- [x] A2 — Implement normalization and deterministic scoring
- [x] A3 — Add matcher and knowledge tests

## Matcher checkpoint

- [x] Known prompts match correctly
- [x] Unknown prompts fall back safely
- [x] Destinations are allowlisted
- [x] `npm test` passes

## Phase 2: Widget

- [x] A4 — Build accessible launcher and panel shell
- [x] A5 — Add conversation history, quick prompts, and navigation actions
- [x] A6 — Add current-route context and responsive behavior

## Widget checkpoint

- [ ] Keyboard, Escape, and focus return work
- [x] Core site works with widget closed
- [x] `npm run build` passes

## Phase 3: Verification

- [ ] A7 — Browser/accessibility/performance verification
- [ ] A8 — Code-quality and security review
- [ ] A9 — Documentation and delivery preparation

The assistant remains navigation-only until a separate approved spec authorizes any external AI provider or data mutation.
