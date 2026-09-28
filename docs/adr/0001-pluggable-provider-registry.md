# ADR 0001: Pluggable provider registry with mock default

- Status: accepted
- Date: 2026-09-28
- Module: `studio-core` (CreatorDesk)

## Context

CreatorDesk generates metadata/analysis via LLMs and reads/writes YouTube
channels via the Data API. Credentials may or may not exist (local dev, CI,
demo), and the user wants provider choice (OpenAI / Anthropic / Gemini) without
code changes. Tests must run with zero secrets and zero network.

## Decision

Two small registries (`server/providers/ai/index.js`,
`server/providers/youtube/index.js`) resolve a provider implementation from
env config (`CREATORDESK_AI_PROVIDER`, `CREATORDESK_YOUTUBE`). Every provider
implements one narrow interface; the API layer never sees provider details.
`mock` is the default for both: deterministic, offline, and good enough for a
full product demo. Live adapters take an injectable `fetch` and enforce
timeouts. Service-layer validators enforce canonical result shapes, so a
malformed model reply becomes a structured `PROVIDER_ERROR` instead of broken
output. This mirrors iConnect's existing pluggable payments/email pattern.

## Consequences

- Zero-config onboarding: `npm run dev` and everything works (demo channel +
  deterministic generations).
- Swapping AI vendors is a one-line env change; output shape is guaranteed by
  validation, not trust.
- Mock quality is heuristic by design; production copy quality depends on the
  configured live provider and prompt templates in `providers/ai/prompts.js`.
- New providers (e.g. a future local model server) plug in without touching
  routes or services.
