# Plan: CreatorDesk — YouTube Studio AI Workbench

> Produced by `planning-and-task-breakdown` from `SPEC.md` +
> `CAPABILITY-MAP.md`. Vertical slices: each task ships one working,
> testable path. Task details and live status live in `tasks/todo.md`.

## Dependency graph

```
config + createApp shell + /api/health        (studio-core)
    │
    ├── provider registry (ai + youtube, mock default)   (studio-core)
    │       │
    │       ├── yt-connect: channel + videos endpoints   (yt-connect)
    │       │       │
    │       │       ├── metadata generation endpoint     (gen-assets)
    │       │       ├── thumbnails endpoint              (gen-assets)
    │       │       │       │
    │       │       │       └── analyze video endpoint   (analyze-content)
    │       │       └── channel insights endpoint        (analyze-content)
    │       │               │
    │       │               └── export + publish         (studio-core tail + yt-connect)
    │       └── live adapters (openai/anthropic/gemini + youtube live)
    │
    └── web UI slices (studio-ui, after API slices)
```

## Implementation order (vertical slices)

1. **Slice 1 — Shell:** `creatordesk/` package, config, `createApp()`,
   `/api/health`, static UI placeholder. (T1)
2. **Slice 2 — Providers + mock data:** AI + YouTube registries, mock
   providers, demo channel dataset with transcripts. (T2–T3)
3. **Slice 3 — Video access API:** `/api/channel`, `/api/videos`,
   `/api/videos/:id`. (T4)
4. **Slice 4 — Generation:** metadata (titles/chapters/description/tags) and
   thumbnails (briefs/prompts/SVG images). (T5–T6)
5. **Slice 5 — Analysis:** video analysis + channel insights + roadmap. (T7–T8)
6. **Slice 6 — Workflow tail:** export bundles + publish (confirm gate, audit
   log, live adapter behind flag). (T9–T10)
7. **Slice 7 — Live adapters:** OpenAI/Anthropic/Gemini + YouTube live, tested
   with injected fetch stubs. (T11)
8. **Slice 8 — UI:** workbench views (channel/video workspace/insights/
   settings). (T12–T14)
9. **Slice 9 — Ship:** README + ADR + security/code-review pass. (T15)

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scope creep in mock generators | Keep mock heuristics small; quality bar is "coherent + deterministic", not perfect copy |
| Live adapters untestable offline | Inject `fetch`; unit-test request shape + response mapping only |
| YouTube API writes are irreversible-ish | `confirm: true` gate, audit log, mock default; publish is per-click only |
| UI sprawl | No-build vanilla JS, one file per view-ish; UI slices come after API is stable |
| Secrets leakage | Keys only in `config.js`; `/api/health` + settings expose provider ids, never keys |

## Verification checkpoints

- **After T4:** health/channel/videos all green; `npm test` passes.
- **After T8:** all generation + analysis endpoints green; chapter round-trip
  check passes (Success Criteria #3).
- **After T10:** export + publish gates green (Success Criteria #5).
- **After T14:** UI works against demo channel end-to-end (manual check via
  preview).
- **After T15:** review gates run (`code-review-and-quality`,
  `security-and-hardening`), full suite green, README accurate.

## Parallelization notes

T5/T6 and T7/T8 are parallelizable once T2–T4 land (independent services over
the same provider interfaces). T12–T14 are sequential UI polish but can start
after T4 against a mock API.
