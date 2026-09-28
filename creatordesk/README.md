# CreatorDesk — YouTube Studio AI Workbench

> Part of this repo's workspace. Spec: [`../SPEC.md`](../SPEC.md) ·
> Capability map: [`../CAPABILITY-MAP.md`](../CAPABILITY-MAP.md) ·
> Tasks: [`../tasks/`](../tasks/)

CreatorDesk automates the **backend work of running a YouTube channel**:
titles, chapter timestamps, descriptions, tags/hashtags, thumbnail concept
briefs + images, per-video analysis (summary, strengths/weaknesses,
improvements, SEO checks, retention notes), and channel-level insights with a
prioritized improvement roadmap. Output is copy-paste ready for YouTube Studio,
and can be **pushed to your channel** via the YouTube Data API v3.

It runs fully offline in **demo mode** (simulated channel + deterministic AI)
with zero credentials; plug in real keys to go live.

## Quick start

```bash
cd creatordesk
npm install
npm run dev          # http://localhost:4180
```

- **Channel** tab: pick a video, open its workspace.
- **Workspace tabs**: Metadata / Thumbnails / Analysis / Export — each with a
  Generate button and Copy buttons on every field.
- **Publish to YouTube…**: review the pre-filled fields in the confirm dialog;
  nothing is sent until you press Publish (every write is audit-logged).
- **Insights** tab: channel overview, performance, what works, opportunities,
  and the improvement roadmap.
- **Settings**: provider status and env var reference (keys are never shown).

```bash
npm test             # full suite — works with zero env vars (mock everything)
```

## Going live

### AI providers (optional)

| Provider | Env |
|---|---|
| `mock` (default, deterministic) | none |
| `openai` | `CREATORDESK_AI_PROVIDER=openai` + `OPENAI_API_KEY` (`OPENAI_MODEL`, `OPENAI_IMAGE_MODEL` optional) |
| `anthropic` (text only) | `CREATORDESK_AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL` optional) |
| `gemini` | `CREATORDESK_AI_PROVIDER=gemini` + `GEMINI_API_KEY` (`GEMINI_MODEL` optional) |

Every provider returns the same validated JSON shapes (`server/services/validate.js`);
a malformed model reply surfaces as a structured `PROVIDER_ERROR`, never as
half-applied output. Thumbnails produce briefs + image-model prompts in every
mode; actual images are generated when the provider supports them
(openai, gemini — and mock, which renders deterministic SVG previews).

### YouTube (optional)

1. Create an OAuth client (type: Desktop/Web app) in Google Cloud Console and
   enable **YouTube Data API v3**.
2. Get a refresh token with scopes `youtube.readonly` + `youtube.upload`
   (one-time consent flow, e.g. via OAuth Playground or a small script).
3. Run with:

```bash
CREATORDESK_YOUTUBE=live \
YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... YOUTUBE_REFRESH_TOKEN=... \
npm run dev
```

In live mode the tool reads your real channel/videos and can push
title / description / tags (`videos.update`) and thumbnails (`thumbnails.set`).
Chapter timestamps are written into the description (YouTube's chapter
convention: first at `0:00`, ≥3 chapters) — there is no chapters API.

### Other env

| Var | Default | Purpose |
|---|---|---|
| `CREATORDESK_PORT` | `4180` | HTTP port (binds `0.0.0.0`) |
| `CREATORDESK_DATA_DIR` | `creatordesk/.data` | JSON store: publish audit log |
| `CREATORDESK_HTTP_TIMEOUT_MS` | `15000` | Outbound API call timeout |

## API (all JSON under `/api`)

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | status + active providers (never leaks keys) |
| `GET /api/channel` · `GET /api/videos` · `GET /api/videos/:id` | channel/video access (+ transcript segments) |
| `POST /api/videos/:id/metadata` | titles, chapters, description, tags, hashtags |
| `POST /api/videos/:id/thumbnails` | briefs, prompts, images (`variants` 1–4) |
| `POST /api/videos/:id/analyze` | summary, strengths/weaknesses, improvements, SEO, retention |
| `GET /api/channel/insights` | overview, performance, whatWorks, opportunities, roadmap |
| `GET /api/videos/:id/export` | `{ markdown, json }` copy-paste bundle |
| `POST /api/videos/:id/publish` | push to YouTube — requires `confirm: true` |

Errors are always `{ "error": { "code", "message", "details?" } }` with codes
`VALIDATION_ERROR` (400), `NOT_CONFIRMED` (400), `NOT_FOUND` (404),
`PROVIDER_ERROR` (502), `UNSUPPORTED` (501).

## Architecture

```
web/  (no-build vanilla SPA)  ──/api──▶  server/routes.js
                                            │
                server/services/  (orchestration + result validation)
                    metadata · thumbnails · analysis · channel · publish
                                            │
                server/providers/  (pluggable, injected fetch)
                    ai:      mock · openai · anthropic · gemini
                    youtube: mock (demo channel) · live (Data API v3 + OAuth)
                                            │
                                   server/store.js  (JSON audit log)
```

Design notes: providers are resolved from env config and injected into the
router (tests pass stubs); all outbound HTTP uses injectable `fetch` with
timeouts; nothing writes to a real channel without an explicit user
confirmation. See `docs/adr/0001-pluggable-provider-registry.md`.
