# Tasks: CreatorDesk

> Produced by `planning-and-task-breakdown`. Status markers are updated as
> work lands. Each task: one focused session, ≤5 files, explicit verification.

## Task 1: App shell — package, config, createApp, health

**Description:** Standalone `creatordesk/` npm package (ESM). Env-driven
`config.js` (repo style), `createApp()` factory serving `/api/health` and the
static `web/` placeholder, `server/index.js` entry on `0.0.0.0:4180`.

**Acceptance criteria:**
- [ ] `GET /api/health` returns `{ ok, name: 'creatordesk', version, youtube, ai }`
- [ ] `createApp()` does not listen; `server/index.js` does
- [ ] Error responses use the structured `{ error: { code, message } }` shape

**Verification:** `npx vitest run -t "health"`; `npm test`; `curl localhost:4180/api/health`

**Dependencies:** None · **Files:** `creatordesk/package.json`, `server/config.js`, `server/app.js`, `server/index.js`, `test/health.test.js` · **Size:** M

## Task 2: AI provider registry + mock generator

**Description:** `providers/ai/` with `getAiProvider(config)` and a
deterministic mock: keyword extraction, title generation, chapter grouping,
description composition, tags/hashtags, thumbnail briefs + prompts, SVG
thumbnail images, analysis heuristics.

**Acceptance criteria:**
- [ ] Registry selects `mock` by default; shape documented in one place
- [ ] Same input → byte-identical output (determinism test)
- [ ] Pure helpers unit-tested (keywords, chapters, title shaping)

**Verification:** `npx vitest run -t "mock provider"` + unit tests green

**Dependencies:** T1 · **Files:** `providers/ai/index.js`, `providers/ai/mock.js`, `test/ai-mock.test.js` · **Size:** M

## Task 3: YouTube mock provider + demo dataset

**Description:** `providers/youtube/` registry + mock provider with demo
channel and 5 videos (stats, tags, timestamped transcripts).

**Acceptance criteria:**
- [ ] `getChannel/listVideos/getVideo` return deterministic demo data
- [ ] `updateVideo/setThumbnail` record mutations in-memory and are visible via getters
- [ ] Unknown video id → provider throws NotFound error mapped to 404

**Verification:** `npx vitest run -t "youtube mock"` green

**Dependencies:** T1 · **Files:** `providers/youtube/index.js`, `providers/youtube/mock.js`, `providers/youtube/demo-data.js`, `test/youtube-mock.test.js` · **Size:** M

## Task 4: Video access API — channel, videos, video detail

**Description:** `/api/channel`, `/api/videos`, `/api/videos/:id` wired to the
YouTube provider registry with structured errors.

**Acceptance criteria:**
- [ ] Endpoints return documented shapes; 404 for unknown ids
- [ ] Transcript segments included on detail
- [ ] No secrets anywhere in responses

**Verification:** `npx vitest run -t "channel"` / `-t "videos"` green

**Dependencies:** T3 · **Files:** `server/routes.js`, `server/app.js`, `test/videos.test.js` · **Size:** M

**=== CHECKPOINT: T1–T4 — health/channel/videos green; suite passes ===**

## Task 5: Metadata generation endpoint

**Description:** `services/metadata.js` + `POST /api/videos/:id/metadata`
producing titles/chapters/description/tags/hashtags via the AI provider.

**Acceptance criteria:**
- [ ] 5 titles with rationale + score; ≤70 chars
- [ ] Chapters: first `0:00`, 3–8 chapters, formatted block matches structured output
- [ ] Validation errors → 400 `VALIDATION_ERROR`

**Verification:** `npx vitest run -t "metadata"` green (incl. round-trip test)

**Dependencies:** T2, T4 · **Files:** `services/metadata.js`, `server/routes.js`, `test/metadata.test.js` · **Size:** M

## Task 6: Thumbnails endpoint

**Description:** `services/thumbnails.js` + `POST /api/videos/:id/thumbnails`:
3 briefs, 3 prompts, images when provider supports them (mock → SVG data URLs).

**Acceptance criteria:**
- [ ] Briefs contain concept/hookText/layout/colors/composition/mood
- [ ] Prompts are copy-paste ready for image models
- [ ] Mock images are deterministic SVG data URLs

**Verification:** `npx vitest run -t "thumbnail"` green

**Dependencies:** T2, T4 · **Files:** `services/thumbnails.js`, `server/routes.js`, `test/thumbnails.test.js` · **Size:** M

## Task 7: Video analysis endpoint

**Description:** `services/analysis.js` + `POST /api/videos/:id/analyze`:
summary, strengths/weaknesses, improvements, SEO checks, retention notes.

**Acceptance criteria:**
- [ ] Output matches SPEC `analyze-content` shape exactly
- [ ] SEO checks include named checks with passed flags
- [ ] Improvements carry area/suggestion/impact/effort

**Verification:** `npx vitest run -t "analyze"` green

**Dependencies:** T2, T4 · **Files:** `services/analysis.js`, `server/routes.js`, `test/analysis.test.js` · **Size:** M

## Task 8: Channel insights endpoint

**Description:** `services/channel.js` + `GET /api/channel/insights`:
overview, performance metrics, whatWorks, opportunities, prioritized roadmap.

**Acceptance criteria:**
- [ ] Roadmap items carry priority/action/why/effort
- [ ] Output derived from the channel's videos (content-dependent, stable)

**Verification:** `npx vitest run -t "insights"` green

**Dependencies:** T7 · **Files:** `services/channel.js`, `server/routes.js`, `test/insights.test.js` · **Size:** M

**=== CHECKPOINT: T5–T8 — generation + analysis green; chapter round-trip verified ===**

## Task 9: Export bundles

**Description:** `services/publish.js` export part + `GET /api/videos/:id/export`
returning `{ markdown, json }` of all generated assets for a video.

**Acceptance criteria:**
- [ ] Markdown includes title options, chapters, description, tags, thumbnail briefs, analysis
- [ ] Works with zero YouTube write access

**Verification:** `npx vitest run -t "export"` green

**Dependencies:** T5–T8 · **Files:** `services/publish.js`, `server/routes.js`, `test/export.test.js` · **Size:** S

## Task 10: Publish endpoint with confirm gate

**Description:** `POST /api/videos/:id/publish` — `confirm: true` required;
mock mode records audit log entry via `store.js`; live mode delegates to
YouTube provider `updateVideo`/`setThumbnail` (adapter in T11).

**Acceptance criteria:**
- [ ] Missing `confirm` → 400 `NOT_CONFIRMED`; nothing written
- [ ] Mock publish updates the demo video + audit log entry
- [ ] Audit entries readable via store (test)

**Verification:** `npx vitest run -t "publish"` green

**Dependencies:** T9 · **Files:** `server/store.js`, `services/publish.js`, `server/routes.js`, `test/publish.test.js` · **Size:** M

**=== CHECKPOINT: T9–T10 — export + publish gates green (Success Criteria #5) ===**

## Task 11: Live adapters (AI + YouTube) behind flags

**Description:** `ai/openai.js`, `ai/anthropic.js`, `ai/gemini.js`,
`youtube/live.js` using injected `fetch`; same output shapes as mock;
OAuth refresh-token flow for YouTube writes.

**Acceptance criteria:**
- [ ] Each adapter maps provider responses to the canonical shapes
- [ ] Malformed model output → `PROVIDER_ERROR`
- [ ] Unit tests use a stub `fetch`; zero network in CI

**Verification:** `npx vitest run -t "adapters"` green

**Dependencies:** T2, T3 · **Files:** `providers/ai/openai.js`, `providers/ai/anthropic.js`, `providers/ai/gemini.js`, `providers/youtube/live.js`, `test/adapters.test.js` · **Size:** M

## Task 12: UI shell — channel + video list

**Description:** No-build workbench: layout, provider status bar, demo-mode
banner, channel card, video list with stats.

**Acceptance criteria:**
- [ ] Relative `/api` calls only; works behind sandbox preview hosts
- [ ] Video list renders from `/api/videos`; click opens workspace
- [ ] Responsive ≥380px

**Verification:** manual check in preview + `npm test` still green

**Dependencies:** T4 · **Files:** `web/index.html`, `web/styles.css`, `web/app.js` · **Size:** M

## Task 13: UI video workspace (Metadata / Thumbnails / Analysis / Export)

**Description:** Per-video tabs rendering generated assets with Copy buttons;
generate buttons call the POST endpoints; Export tab shows the Markdown bundle.

**Acceptance criteria:**
- [ ] All 4 actions usable end-to-end against demo channel
- [ ] Copy buttons work (clipboard API with fallback)
- [ ] Loading + error states render the structured error message

**Verification:** manual check in preview

**Dependencies:** T12, T5–T9 · **Files:** `web/app.js`, `web/index.html`, `web/styles.css` · **Size:** M

## Task 14: UI insights + settings + publish flow

**Description:** Insights view (roadmap), Settings view (provider status —
no keys), Publish button with confirm dialog + result feedback.

**Acceptance criteria:**
- [ ] Publish requires explicit confirm in UI; result + mode shown
- [ ] Insights renders roadmap sorted by priority
- [ ] Keyboard-accessible dialogs

**Verification:** manual check in preview

**Dependencies:** T13, T8, T10 · **Files:** `web/app.js`, `web/styles.css` · **Size:** M

**=== CHECKPOINT: UI end-to-end against demo channel ===**

## Task 15: Docs + review gates

**Description:** `creatordesk/README.md` (run, env vars, OAuth setup,
architecture), ADR for provider-registry decision, then
`code-review-and-quality` + `security-and-hardening` passes.

**Acceptance criteria:**
- [ ] README accurate (commands verified)
- [ ] ADR committed under `docs/adr/`
- [ ] Review checklists run; findings fixed or recorded
- [ ] Full `npm test` green at final commit

**Verification:** `npm test`; review checklists in `.agents/references/`

**Dependencies:** T14 · **Files:** `creatordesk/README.md`, `docs/adr/*`, fixes as needed · **Size:** M

## Checkpoint: Final
- [ ] All tests pass (`cd creatordesk && npm test`)
- [ ] App runs via `npm run dev` and the full workflow works on the demo channel
- [ ] Spec + map + tasks reflect reality
