# Capability Map: CreatorDesk (YouTube Studio AI Workbench)

> Approved 2026-09-28 by the user. Produced by `spec-driven-development`
> (Phase 0: scope check). Module ids are stable — never renamed mid-initiative.
> Implementation lives in `creatordesk/` (standalone app inside this repo).

## What it is

CreatorDesk is an AI workbench for a YouTube creator's **backend workflow**:
titles, chapter timestamps, descriptions, thumbnails, plus per-video analysis
(summary + improvements) and channel-level insights. It integrates with
YouTube Studio through the official **YouTube Data API v3** (there is no
third-party plugin surface inside Studio itself): it reads channel data, and
can push title / description / tags / thumbnails back per video.

## Modules

| Module id | Responsibility | Depends on |
|---|---|---|
| `studio-core` | App shell (Express API + no-build web UI), env-driven provider registry (AI + YouTube adapters), local JSON store, export bundles (JSON/Markdown) | — |
| `yt-connect` | Channel/video access: live YouTube Data/Analytics API via OAuth, plus a built-in mock demo channel so everything runs with zero credentials | `studio-core` |
| `gen-assets` | Title options, chapter timestamps, description (chapters + tags + hashtags), thumbnail concept briefs + image-model prompts, and actual images when a provider supports image generation | `studio-core`, `yt-connect` |
| `analyze-content` | Per-video summary, content analysis, improvement suggestions, SEO checks; channel-level insights + prioritized improvement roadmap | `studio-core`, `yt-connect` |
| `studio-ui` | Web workbench: connect status, video list, per-video tabs (Metadata / Thumbnails / Analysis / Export), channel insights, copy actions and one-click push-to-YouTube | all above |

## Dependency direction

```
studio-core ──▶ yt-connect ──▶ gen-assets ──▶ analyze-content ──▶ studio-ui
      │              │               │                │
      └──────────────┴───────────────┴────────────────┘
        (all depend only downward; no cycles)
```

## Build order

1. `studio-core`
2. `yt-connect`
3. `gen-assets`
4. `analyze-content`
5. `studio-ui`

Each module is specified in `SPEC.md` under a heading carrying its module id.
Vertical slices in `tasks/todo.md` are ordered along the build order; UI slices
come last but the API stays runnable and testable at every slice.
