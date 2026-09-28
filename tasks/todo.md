# Tasks: CreatorDesk

> Produced by `planning-and-task-breakdown`. Status: **all tasks complete** (2026-09-28).
> All acceptance criteria verified: `cd creatordesk && npm test` → 55/55 green. Each task: one focused session, ≤5 files, explicit verification.

## Task 1: App shell — package, config, createApp, health

**Description:** Standalone `creatordesk/` npm package (ESM). Env-driven
`config.js` (repo style), `createApp()` factory serving `/api/health` and the
static `web/` placeholder, `server/index.js` entry on `0.0.0.0:4180`.

**Acceptance criteria:**
- [x] `GET /api/health` returns `{ ok, name: 'creatordesk', version, youtube, ai }`
- [x] `createApp()` does not listen; `server/index.js` does
- [x] Error responses use the structured `{ error: { code, message } }` shape

**Verification:** `npx vitest run -t "health"`; `npm test`; `curl localhost:4180/api/health`

**Dependencies:** None · **Files:** `creatordesk/package.json`, `server/config.js`, `server/app.js`, `server/index.js`, `test/health.test.js` · **Size:** M

## Task 2: AI provider registry + mock generator

**Description:** `providers/ai/` with `getAiProvider(config)` and a
deterministic mock: keyword extraction, title generation, chapter grouping,
description composition, tags/hashtags, thumbnail briefs + prompts, SVG
thumbnail images, analysis heuristics.

**Acceptance criteria:**
- [x] Registry selects `mock` by default; shape documented in one place
- [x] Same input → byte-identical output (determinism test)
- [x] Pure helpers unit-tested (keywords, chapters, title shaping)

**Verification:** `npx vitest run -t "mock provider"` + unit tests green

**Dependencies:** T1 · **Files:** `providers/ai/index.js`, `providers/ai/mock.js`, `test/ai-mock.test.js` · **Size:** M

## Task 3: YouTube mock provider + demo dataset

**Description:** `providers/youtube/` registry + mock provider with demo
channel and 5 videos (stats, tags, timestamped transcripts).

**Acceptance criteria:**
- [x] `getChannel/listVideos/getVideo` return deterministic demo data
- [x] `updateVideo/setThumbnail` record mutations in-memory and are visible via getters
- [x] Unknown video id → provider throws NotFound error mapped to 404

**Verification:** `npx vitest run -t "youtube mock"` green

**Dependencies:** T1 · **Files:** `providers/youtube/index.js`, `providers/youtube/mock.js`, `providers/youtube/demo-data.js`, `test/youtube-mock.test.js` · **Size:** M

## Task 4: Video access API — channel, videos, video detail

**Description:** `/api/channel`, `/api/videos`, `/api/videos/:id` wired to the
YouTube provider registry with structured errors.

**Acceptance criteria:**
- [x] Endpoints return documented shapes; 404 for unknown ids
- [x] Transcript segments included on detail
- [x] No secrets anywhere in responses

**Verification:** `npx vitest run -t "channel"` / `-t "videos"` green

**Dependencies:** T3 · **Files:** `server/routes.js`, `server/app.js`, `test/videos.test.js` · **Size:** M

**=== CHECKPOINT: T1–T4 — health/channel/videos green; suite passes ===**

## Task 5: Metadata generation endpoint

**Description:** `services/metadata.js` + `POST /api/videos/:id/metadata`
producing titles/chapters/description/tags/hashtags via the AI provider.

**Acceptance criteria:**
- [x] 5 titles with rationale + score; ≤70 chars
- [x] Chapters: first `0:00`, 3–8 chapters, formatted block matches structured output
- [x] Validation errors → 400 `VALIDATION_ERROR`

**Verification:** `npx vitest run -t "metadata"` green (incl. round-trip test)

**Dependencies:** T2, T4 · **Files:** `services/metadata.js`, `server/routes.js`, `test/metadata.test.js` · **Size:** M

## Task 6: Thumbnails endpoint

**Description:** `services/thumbnails.js` + `POST /api/videos/:id/thumbnails`:
3 briefs, 3 prompts, images when provider supports them (mock → SVG data URLs).

**Acceptance criteria:**
- [x] Briefs contain concept/hookText/layout/colors/composition/mood
- [x] Prompts are copy-paste ready for image models
- [x] Mock images are deterministic SVG data URLs

**Verification:** `npx vitest run -t "thumbnail"` green

**Dependencies:** T2, T4 · **Files:** `services/thumbnails.js`, `server/routes.js`, `test/thumbnails.test.js` · **Size:** M

## Task 7: Video analysis endpoint

**Description:** `services/analysis.js` + `POST /api/videos/:id/analyze`:
summary, strengths/weaknesses, improvements, SEO checks, retention notes.

**Acceptance criteria:**
- [x] Output matches SPEC `analyze-content` shape exactly
- [x] SEO checks include named checks with passed flags
- [x] Improvements carry area/suggestion/impact/effort

**Verification:** `npx vitest run -t "analyze"` green

**Dependencies:** T2, T4 · **Files:** `services/analysis.js`, `server/routes.js`, `test/analysis.test.js` · **Size:** M

## Task 8: Channel insights endpoint

**Description:** `services/channel.js` + `GET /api/channel/insights`:
overview, performance metrics, whatWorks, opportunities, prioritized roadmap.

**Acceptance criteria:**
- [x] Roadmap items carry priority/action/why/effort
- [x] Output derived from the channel's videos (content-dependent, stable)

**Verification:** `npx vitest run -t "insights"` green

**Dependencies:** T7 · **Files:** `services/channel.js`, `server/routes.js`, `test/insights.test.js` · **Size:** M

**=== CHECKPOINT: T5–T8 — generation + analysis green; chapter round-trip verified ===**

## Task 9: Export bundles

**Description:** `services/publish.js` export part + `GET /api/videos/:id/export`
returning `{ markdown, json }` of all generated assets for a video.

**Acceptance criteria:**
- [x] Markdown includes title options, chapters, description, tags, thumbnail briefs, analysis
- [x] Works with zero YouTube write access

**Verification:** `npx vitest run -t "export"` green

**Dependencies:** T5–T8 · **Files:** `services/publish.js`, `server/routes.js`, `test/export.test.js` · **Size:** S

## Task 10: Publish endpoint with confirm gate

**Description:** `POST /api/videos/:id/publish` — `confirm: true` required;
mock mode records audit log entry via `store.js`; live mode delegates to
YouTube provider `updateVideo`/`setThumbnail` (adapter in T11).

**Acceptance criteria:**
- [x] Missing `confirm` → 400 `NOT_CONFIRMED`; nothing written
- [x] Mock publish updates the demo video + audit log entry
- [x] Audit entries readable via store (test)

**Verification:** `npx vitest run -t "publish"` green

**Dependencies:** T9 · **Files:** `server/store.js`, `services/publish.js`, `server/routes.js`, `test/publish.test.js` · **Size:** M

**=== CHECKPOINT: T9–T10 — export + publish gates green (Success Criteria #5) ===**

## Task 11: Live adapters (AI + YouTube) behind flags

**Description:** `ai/openai.js`, `ai/anthropic.js`, `ai/gemini.js`,
`youtube/live.js` using injected `fetch`; same output shapes as mock;
OAuth refresh-token flow for YouTube writes.

**Acceptance criteria:**
- [x] Each adapter maps provider responses to the canonical shapes
- [x] Malformed model output → `PROVIDER_ERROR`
- [x] Unit tests use a stub `fetch`; zero network in CI

**Verification:** `npx vitest run -t "adapters"` green

**Dependencies:** T2, T3 · **Files:** `providers/ai/openai.js`, `providers/ai/anthropic.js`, `providers/ai/gemini.js`, `providers/youtube/live.js`, `test/adapters.test.js` · **Size:** M

## Task 12: UI shell — channel + video list

**Description:** No-build workbench: layout, provider status bar, demo-mode
banner, channel card, video list with stats.

**Acceptance criteria:**
- [x] Relative `/api` calls only; works behind sandbox preview hosts
- [x] Video list renders from `/api/videos`; click opens workspace
- [x] Responsive ≥380px

**Verification:** manual check in preview + `npm test` still green

**Dependencies:** T4 · **Files:** `web/index.html`, `web/styles.css`, `web/app.js` · **Size:** M

## Task 13: UI video workspace (Metadata / Thumbnails / Analysis / Export)

**Description:** Per-video tabs rendering generated assets with Copy buttons;
generate buttons call the POST endpoints; Export tab shows the Markdown bundle.

**Acceptance criteria:**
- [x] All 4 actions usable end-to-end against demo channel
- [x] Copy buttons work (clipboard API with fallback)
- [x] Loading + error states render the structured error message

**Verification:** manual check in preview

**Dependencies:** T12, T5–T9 · **Files:** `web/app.js`, `web/index.html`, `web/styles.css` · **Size:** M

## Task 14: UI insights + settings + publish flow

**Description:** Insights view (roadmap), Settings view (provider status —
no keys), Publish button with confirm dialog + result feedback.

**Acceptance criteria:**
- [x] Publish requires explicit confirm in UI; result + mode shown
- [x] Insights renders roadmap sorted by priority
- [x] Keyboard-accessible dialogs

**Verification:** manual check in preview

**Dependencies:** T13, T8, T10 · **Files:** `web/app.js`, `web/styles.css` · **Size:** M

**=== CHECKPOINT: UI end-to-end against demo channel ===**

## Task 15: Docs + review gates

**Description:** `creatordesk/README.md` (run, env vars, OAuth setup,
architecture), ADR for provider-registry decision, then
`code-review-and-quality` + `security-and-hardening` passes.

**Acceptance criteria:**
- [x] README accurate (commands verified)
- [x] ADR committed under `docs/adr/`
- [x] Review checklists run; findings fixed or recorded
- [x] Full `npm test` green at final commit

**Verification:** `npm test`; review checklists in `.agents/references/`

**Dependencies:** T14 · **Files:** `creatordesk/README.md`, `docs/adr/*`, fixes as needed · **Size:** M

## Checkpoint: Final
- [x] All tests pass (`cd creatordesk && npm test`)
- [x] App runs via `npm run dev` and the full workflow works on the demo channel
- [x] Spec + map + tasks reflect reality
