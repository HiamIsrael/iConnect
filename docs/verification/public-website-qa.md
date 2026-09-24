# Public Website QA Report

**Date:** 2026-09-24  
**Branch:** `arena/01a0cf8a-iconnect`

## Automated verification

- `npm test` — 43 tests passed across 4 test files.
- `npm run build` — passed with Vite production output.
- `git diff --check` — passed.
- API health — HTTP 200.
- Public route smoke checks — HTTP 200 for `/`, `/musicians`, `/gigs`, `/venues`, `/bands`, `/community`, `/login`, and `/signup`.
- Public data smoke checks — seeded musician, gig, musician EPK, and gig detail endpoints returned HTTP 200.

## Preview verification

The production-style preview command is:

```bash
npm run preview:app
```

It binds to `0.0.0.0`, enables framing for the hosted preview, and serves both the built frontend and API from one process. Local verification returned HTTP 200 for the website and `/api/health`.

The Arena external preview proxy currently reports `Sandbox not found` in the user's browser even though the sandbox process is listening and the local checks pass. This is an infrastructure/proxy lifecycle issue and cannot be corrected by application code. The app-side requirements are in place: host binding, frame allowance, same-origin API serving, and no host allowlist blocking.

## Dependency review

`npm audit --omit=dev` reports two moderate `qs` advisories through Express. A safe patch is available, but it should be handled as an isolated dependency change with its own test/build verification rather than bundled into the website redesign.

The full development dependency audit also reports issues in the current Vite/Vitest/React Router major-version line. Upgrading those packages is intentionally deferred until a dedicated dependency-migration task because the available fixes include major-version changes.

## Remaining gate

- Browser screenshot and accessibility-tree review when the Arena preview proxy is available.
- Performance trace and responsive inspection at 320px, 768px, 1024px, and 1440px.
- Isolated production `qs` patch review.
- Final code-quality and simplification review before starting the assistant bot capability.
