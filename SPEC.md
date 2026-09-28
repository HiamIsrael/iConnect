# Spec: CreatorDesk — YouTube Studio AI Workbench

> Produced by `spec-driven-development`. Module headings trace to
> `CAPABILITY-MAP.md` ids. Approved scope decisions (2026-09-28):
> standalone app in this repo · real YouTube API + demo mode · pluggable AI with
> deterministic mock default · thumbnail briefs/prompts always + images when the
> provider supports them.
> **Status (2026-09-28): implemented.** Success criteria 1–5 verified (55/55
> tests green with zero env vars; live-preview workflow checked against the demo
> channel). Criterion 6 (live providers) is implemented and covered by
> stubbed-fetch tests; end-to-end verification awaits real user credentials.

## Objective

CreatorDesk automates the **backend work of running a YouTube channel**: for
each video it produces title options, chapter timestamps, a full description,
tags/hashtags, thumbnail concept briefs and images; and it analyzes content —
per-video summary, strengths/weaknesses, improvement suggestions — plus
channel-level insights and a prioritized improvement roadmap. Output is
copy-paste ready for YouTube Studio, and (in live mode) pushable to the channel
via the YouTube Data API.

**User:** a solo YouTube creator (one channel) who wants the metadata +
analysis grind handled, with human review before anything is published.

**Success looks like:** with zero credentials, the creator connects the demo
channel, picks a video, and gets coherent titles/chapters/description/thumbnail
briefs/analysis in one click each; with YouTube OAuth + an AI key configured,
the same flow uses real channel data and real model output, and one click pushes
approved metadata back to YouTube.

### Assumptions (confirmed)

1. "Integrate into YouTube Studio" = YouTube Data API v3 + OAuth. Timestamps
   become **chapter markers in the description** (YouTube convention: first
   chapter at 0:00, ≥3 chapters, ≥10s apart) — there is no chapters API.
2. Standalone app in `creatordesk/` — not part of the iConnect marketplace.
3. AI is pluggable: `mock` (default, deterministic, no keys) | `openai` |
   `anthropic` | `gemini`. Everything works and tests pass with no keys.
4. YouTube access: `mock` demo channel (default) | `live` with
   `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN`.
   Push-to-channel always requires explicit `confirm: true` from the UI.
5. Persistence: local JSON file store (`creatordesk/.data/`) for generated
   assets + publish audit log. No database.
6. Node ≥ 20 (repo runs 22), fetch-based adapters (no vendor SDKs), English
   content in v1, one channel per connect, no auto-scheduling/auto-publish.

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node 20+ ESM, Express 4, `createApp()` factory (matches repo convention) |
| AI | Provider registry: deterministic mock / OpenAI / Anthropic / Gemini via plain `fetch` |
| YouTube | Provider registry: mock demo channel / live Data API v3 via plain `fetch` + OAuth refresh-token exchange |
| Storage | JSON files under `CREATORDESK_DATA_DIR` (default `creatordesk/.data/`) |
| Web UI | Static, no-build vanilla JS + CSS served by the same Express app |
| Tests | Vitest 2 + Supertest 7 (dev deps of `creatordesk/`); outbound HTTP stubbed via injected `fetch` |

## Commands

```bash
cd creatordesk
npm install          # deps (express; vitest + supertest as devDeps)
npm run dev          # API + web UI on http://localhost:4180 (auto-reload via node --watch)
npm start            # same, without watch
npm test             # vitest run (full suite)
npx vitest run -t "<name>"   # focused test during red-green-refactor
curl -s localhost:4180/api/health
```

Preview note: in Arena/e2b the public URL is sandbox-scoped — bind `0.0.0.0`,
use relative `/api` paths in the UI, never hardcode localhost in web assets.

## Project Structure

```
creatordesk/
  package.json          # standalone npm package ("creatordesk", type: module)
  README.md             # usage, env vars, YouTube OAuth setup
  server/
    index.js            # entry: starts app on PORT (default 4180)
    app.js              # createApp() → express app (routes + static web/)
    config.js           # env parsing (provider selection, keys, ports)
    store.js            # JSON file store: generated assets + publish log
    routes.js           # /api/* route table
    providers/
      ai/index.js       # getAiProvider(config) → { id, generate, supportsImages, generateImage }
      ai/mock.js        # deterministic template/heuristic generator + SVG thumbnails
      ai/openai.js      # chat completions + images (fetch)
      ai/anthropic.js   # messages API (fetch; text only)
      ai/gemini.js      # generateContent + image (fetch)
      youtube/index.js  # getYoutubeProvider(config) → { id, getChannel, listVideos, getVideo, updateVideo, setThumbnail }
      youtube/mock.js   # demo channel + 5 videos with transcript segments
      youtube/live.js   # Data API v3 + OAuth refresh (fetch)
    services/
      metadata.js       # gen-assets: titles/chapters/description/tags
      thumbnails.js     # gen-assets: briefs, prompts, optional images
      analysis.js       # analyze-content: summary, checks, improvements
      channel.js        # analyze-content: insights + roadmap
      publish.js        # publish orchestration + audit log + export bundles
  web/
    index.html          # workbench shell
    styles.css
    app.js              # views: channel, video workspace, insights, settings
  test/
    *.test.js           # one file per slice; supertest against createApp()
```

## API Contract (contract-first; all JSON under `/api`)

Every error response is `{ "error": { "code", "message", "details?" } }`.
Codes: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PROVIDER_ERROR` (502),
`NOT_CONFIRMED` (400), `UNSUPPORTED` (501).

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /api/health` | `{ ok, name, version, youtube, ai: { provider, supportsImages } }` | never leaks secrets |
| `GET /api/channel` | channel card + `mode: "mock" \| "live"` | |
| `GET /api/videos` | video list w/ stats, newest first | |
| `GET /api/videos/:id` | detail + `transcript.segments[{start,text}]` | 404 unknown id |
| `POST /api/videos/:id/metadata` | body `{ notes?, tone?, keywords? }` → `{ titles[{text,rationale,score}], description, chapters[{time,seconds,label}], tags[], hashtags[] }` | chapters usable verbatim in description |
| `POST /api/videos/:id/thumbnails` | body `{ notes?, variants? }` → `{ briefs[{concept,hookText,layout,colors,composition,mood}], prompts[{prompt,for}], images[{dataUrl,prompt}]? }` | `images` present only when provider supports images (mock → SVG data URLs) |
| `POST /api/videos/:id/analyze` | body `{ notes? }` → `{ summary, strengths[], weaknesses[], improvements[{area,suggestion,impact,effort}], seo{score,checks[{name,passed,detail}]}, retention{hook,structure,pacing} }` | |
| `GET /api/channel/insights` | `{ overview, performance[{metric,value,trend,note}], whatWorks[], opportunities[], roadmap[{priority,action,why,effort}] }` | aggregates videos |
| `GET /api/videos/:id/export` | `{ markdown, json }` copy-paste bundle of all generated assets | works offline of YouTube |
| `POST /api/videos/:id/publish` | body `{ confirm: true, title?, description?, tags?, thumbnail? }` → `{ published, mode, updated[] }` | 400 `NOT_CONFIRMED` without `confirm:true`; live mode calls YouTube API; mock mode records audit entry |

### Provider env vars

```
CREATORDESK_AI_PROVIDER = mock | openai | anthropic | gemini   (default mock)
OPENAI_API_KEY, OPENAI_MODEL, OPENAI_IMAGE_MODEL
ANTHROPIC_API_KEY, ANTHROPIC_MODEL
GEMINI_API_KEY, GEMINI_MODEL
CREATORDESK_YOUTUBE = mock | live                              (default mock)
YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
CREATORDESK_PORT = 4180        CREATORDESK_DATA_DIR = creatordesk/.data
```

## Module Specs

### `studio-core` — shell, config, providers, store, export
- `createApp()` returns an Express app without listening (tests import it);
  `server/index.js` listens on `0.0.0.0:CREATORDESK_PORT`.
- `config.js` follows the repo's `server/config.js` style (env parse helpers,
  no secrets in responses). Provider registry resolves once at startup; the
  selected AI/YouTube provider is injected into services (functions, not
  singletons) so tests can stub `fetch` or swap providers.
- Store: `read(key) / write(key, value) / appendLog(entry)` over JSON files,
  tolerant of missing files, `CREATORDESK_DATA_DIR` isolated in tests via
  temp dirs (repo test convention).

### `yt-connect` — channel/video access
- Provider interface: `getChannel()`, `listVideos()`, `getVideo(id)`,
  `updateVideo(id, { title?, description?, tags? })`, `setThumbnail(id, bytes)`.
- Mock: demo channel "CreatorDesk Demo" + 5 videos across topics, each with
  duration, stats, tags, and timestamped transcript segments (deterministic).
- Live: OAuth refresh-token client credentials grant, `videos.list` (snippet +
  statistics + contentDetails), `videos.update`, `thumbnails.set`; Analytics
  API is optional enhancement (v1 uses Data API stats only). Timeouts on all
  fetches; errors map to `PROVIDER_ERROR` with the upstream message sanitized.

### `gen-assets` — titles, chapters, description, thumbnails
- Input context: video metadata + transcript + optional `notes/tone/keywords`.
- Titles: 5 options, each `{ text, rationale, score }`; ≤70 chars, no clickbait
  lies — derived from actual content keywords (mock: deterministic templates +
  keyword extraction: stopword filter + frequency + first-mention tiebreak).
- Chapters: segments grouped into 3–8 chapters, first at `0:00`, labels
  ≤ 60 chars; returned both structured and as a formatted description block.
- Description: hook paragraph + chapters + keyword-rich body + 3–5 hashtags.
- Tags: 10–20 tags ordered by relevance; hashtags separate.
- Thumbnails: always 3 briefs + 3 copy-paste image-model prompts; images when
  `supportsImages` (mock: SVG data URL with hook text + layout from brief).

### `analyze-content` — video + channel analysis
- Video: 2–4 sentence summary; 3–5 strengths; 3–5 weaknesses;
  3–6 improvements `{area, suggestion, impact: high|medium|low, effort: ...}`;
  SEO score 0–100 with named checks (title length, keyword presence, chapter
  coverage, description depth, tag count, hook quality); retention notes
  `{hook, structure, pacing}`.
- Channel: overview (cadence, avg performance, top topics), performance
  metrics with trend notes, `whatWorks`, `opportunities`, and a
  `roadmap` of prioritized actions (priority 1 = do first).
- Mock analysis uses heuristics over transcript + stats so output is
  content-dependent and stable; real providers receive a structured prompt and
  must return the same JSON shape (validated; `PROVIDER_ERROR` on parse fail).

### `studio-ui` — web workbench
- Single page, no build step, relative `/api` calls only. Views:
  **Channel** (card + video list), **Video workspace** (tabs: Metadata,
  Thumbnails, Analysis, Export), **Insights** (channel insights + roadmap),
  **Settings** (provider status — never raw keys).
- Every generated field has a Copy button; Export tab shows the Markdown
  bundle; Publish button is styled as destructive-ish and requires a confirm
  dialog; visible "Demo mode" banner when YouTube mode is `mock`.
- Responsive down to ~380px; accessible basics (labels, focus, contrast).

## Code Style

ESM, 2-space indent, single quotes, semicolons — matching the repo's server
code. Named exports; small pure functions at the service layer (easy to test):

```js
export function buildChapters(segments, { minChapters = 3, maxChapters = 8 } = {}) {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  // group transcript segments into evenly-paced chapters, first at 0:00
  ...
}
```

## Testing Strategy

- Vitest + Supertest integration tests against `createApp()` per the repo's
  `test/app.test.js` pattern (temp data dir, `NODE_ENV=test`, no network).
- Unit tests for pure service logic (chapter grouping, keyword extraction,
  SVG thumbnail determinism).
- Live adapters tested by injecting a stub `fetch` (no real HTTP).
- Gate: `npm test` green before every commit; focused run during red-green.

## Boundaries

- **Always:** test-first for logic; structured error shape; validate inputs;
  never leak keys in API responses; keep mock outputs deterministic.
- **Ask first:** new npm dependencies; changing the public API contract;
  anything that writes to a real YouTube channel beyond the confirmed publish
  flow; OAuth scopes beyond `youtube.upload` / `youtube.readonly`.
- **Never:** commit secrets or tokens; auto-publish without an explicit user
  click; vendor the skills; break `npm test` at a commit boundary.

## Success Criteria

1. `cd creatordesk && npm install && npm test` — full suite green with **no
   env vars set** (mock everything).
2. `npm run dev` serves the workbench at `:4180`; demo channel shows 5 videos;
   each of the 4 generate/analyze actions returns the documented JSON shape.
3. Chapters round-trip: generated description contains `0:00` first chapter
   and every chapter time matches the structured `chapters[]` output.
4. Export bundle renders the full metadata set in Markdown.
5. Publish refuses without `confirm: true` (400 `NOT_CONFIRMED`) and records
   an audit entry in mock mode.
6. With `CREATORDESK_AI_PROVIDER` + keys set, the same endpoints return the
   same shapes (validated) from the real provider; same for `live` YouTube.

## Open Questions

- Which AI provider does the user actually have keys for? (Mock default means
  this doesn't block anything.)
- Exact YouTube OAuth scope preference (`youtube.readonly` + `youtube.upload`
  vs `youtube.force-ssl`) — v1 uses `youtube.readonly` + `youtube.upload`.
- Desired brand voice for titles/descriptions — surfaced as an optional `tone`
  input in v1 (default: "clear, energetic, specific").
