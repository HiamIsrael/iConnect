# Implementation Plan: iConnect Public Website Rebuild

## Overview

Replace the current public-facing visual system and entry experience with a connection-first editorial marketplace. Work stays frontend-first and preserves the existing API, authenticated flows, mobile app, and public route compatibility. Each phase ships as a small vertical slice, is tested, rendered in a browser, and reviewed before the next phase.

The source of truth is `SPEC.md`; capability boundaries and dependency order are in `CAPABILITY-MAP.md`.

## Baseline

- Stack: React 18.3.1, Vite 5.4.8, React Router 6.26.2, plain CSS, Express API.
- Existing verification: `npm test` passes 43 tests; `npm run build` succeeds.
- Existing public data: musician, gig, venue, band, community, and EPK endpoints exist; seeded photos are currently absent, so the initial design must handle avatar/fallback states without inventing imagery.
- Current visual system: dark background, gradient/glass surfaces, rounded cards, hero stats, and broad navigation. The rebuild will replace the public presentation incrementally rather than mixing two competing systems indefinitely.

## Architecture Decisions

1. **Frontend-first, API-preserving:** use the existing relative `/api/...` client and response shapes. A backend change is a separate task only if the public experience exposes a verified contract gap.
2. **Design tokens before page redesign:** establish a small CSS token system and layout primitives before composing the homepage so pages do not accumulate one-off values.
3. **Containers own data, presentational components own rendering:** keep fetching and retry state near route-level containers; keep reusable sections deterministic and testable.
4. **Real data over invented proof:** render seeded/live content where available, and design empty/fallback states where it is not.
5. **No new image or font dependency in the first slice:** use existing data, typographic CSS, and intentional media placeholders until asset sources and licensing are approved.
6. **URL-driven discovery state:** use the existing browser URL/query-string model for shareable public filters rather than introducing a global state library.
7. **Progressive replacement:** keep the application bootable after each slice. Do not delete old styles or routes until their replacement is active and verified.

## Dependency Graph

```text
Design tokens + primitives
          │
          ├── Homepage shell + content sections
          │        │
          │        ├── Musician discovery + profile/EPK
          │        └── Gig discovery + detail
          │
          ├── Venue/band/community presentation
          │
          └── Conversion entry and discovery-context handoff
```

## Task List

### Phase 1: Design Foundation

- [ ] **Task 1: Establish the public design foundation**
  - Acceptance: new tokens, type hierarchy, surface rules, responsive container, focus states, and reduced-motion behavior are documented in code; existing routes still build.
  - Verify: `npm run build`; inspect `/` and one existing detail route at mobile and desktop widths; no console errors.
  - Files likely touched: `src/index.css`, `src/components/Navbar.jsx`, `src/components/Footer.jsx`.
  - Scope: Medium

- [ ] **Task 2: Add public content and state primitives**
  - Acceptance: reusable section heading, status/empty treatment, media fallback, and action-group patterns exist without adding a UI dependency; primitives support accessible names and focus.
  - Verify: focused component tests where behavior exists, `npm test`, `npm run build`, browser inspection.
  - Files likely touched: `src/components/LoadState.jsx`, `src/components/Avatar.jsx`, `src/components/PublicSection.jsx`, `test/public-components.test.js`.
  - Scope: Medium

### Checkpoint: Foundation

- [ ] Tokens and primitives are reviewed against the reference direction.
- [ ] Tests pass and the production build succeeds.
- [ ] Existing public routes remain reachable.
- [ ] Homepage visual baseline screenshot is captured before replacement.
- [ ] Human review before moving to the homepage slice.

### Phase 2: Homepage Vertical Slice

- [ ] **Task 3: Replace the homepage opening and primary paths**
  - Acceptance: homepage explains the marketplace, presents musician and organizer paths, uses real API data where available, and has designed loading/error/empty states.
  - Verify: add/adjust route tests, `npm test`, `npm run build`, browser screenshot and network/console check.
  - Files likely touched: `src/pages/Home.jsx`, `src/components/Navbar.jsx`, `src/index.css`, `test/home.test.js`.
  - Scope: Medium

- [ ] **Task 4: Add homepage discovery and trust sections**
  - Acceptance: featured gigs and musicians feel editorial rather than a generic grid; proof is data-backed; the layout has a clear closing conversion action.
  - Verify: focused tests for content selection and states, full test/build, browser responsive and accessibility check.
  - Files likely touched: `src/pages/Home.jsx`, `src/components/GigCard.jsx`, `src/components/MusicianCard.jsx`, `src/index.css`, `test/home.test.js`.
  - Scope: Medium

### Checkpoint: Homepage

- [ ] A first-time visitor can identify both primary user paths.
- [ ] A musician and organizer can each reach a relevant discovery page within two clear actions.
- [ ] Screenshots at 320px and 1440px are reviewed.
- [ ] Console and network are clean for the public homepage.
- [ ] Human review before discovery-page work.

### Phase 3: Discovery Journeys

- [ ] **Task 5: Rebuild musician discovery**
  - Acceptance: musician listing has useful filters, URL state where practical, realistic long/empty/error states, and links to profile/EPK.
  - Verify: tests for query/filter behavior, full test/build, browser keyboard and responsive check.
  - Files likely touched: `src/pages/Musicians.jsx`, `src/components/MusicianCard.jsx`, `src/api.js`, `test/musician-discovery.test.js`.
  - Scope: Medium

- [ ] **Task 6: Rebuild musician profile and EPK presentation**
  - Acceptance: profile and EPK prioritize identity, fit, availability, work, and next action; missing media uses an intentional fallback.
  - Verify: route tests, full test/build, browser DOM/accessibility/network verification.
  - Files likely touched: `src/pages/MusicianProfile.jsx`, `src/pages/Epk.jsx`, `src/components/Avatar.jsx`, `test/musician-profile.test.js`.
  - Scope: Medium

- [ ] **Task 7: Rebuild gig discovery and detail**
  - Acceptance: gig browsing exposes date, location, format, fee, and fit signals; detail page presents a clear application/signup path without changing API behavior.
  - Verify: tests for filters and action states, full test/build, browser responsive/network check.
  - Files likely touched: `src/pages/Gigs.jsx`, `src/pages/GigDetail.jsx`, `src/components/GigCard.jsx`, `test/gig-discovery.test.js`.
  - Scope: Medium

### Checkpoint: Discovery

- [ ] Musician and gig journeys are independently usable from homepage to detail.
- [ ] URL state survives refresh and can be shared where filters are supported.
- [ ] Empty, loading, error, and missing-media cases are not blank or misleading.
- [ ] No newly introduced API failures or accessibility issues.

### Phase 4: Network Context and Conversion

- [ ] **Task 8: Rebuild venue, band, and community public context**
  - Acceptance: venue/band/community routes reinforce the network and do not feel like disconnected directories; only supported data is shown.
  - Verify: route tests, full test/build, browser screenshots at target widths.
  - Files likely touched: `src/pages/Venues.jsx`, `src/pages/VenueDetail.jsx`, `src/pages/Bands.jsx`, `src/pages/BandDetail.jsx`, `src/pages/Community.jsx`.
  - Scope: Large; split further if implementation exceeds one focused slice.

- [ ] **Task 9: Improve conversion entry and context handoff**
  - Acceptance: login/signup entry preserves where the visitor came from, role intent is clear, and public discovery is not blocked unnecessarily.
  - Verify: focused auth-entry tests, full test/build, browser keyboard/error verification.
  - Files likely touched: `src/pages/Login.jsx`, `src/pages/Signup.jsx`, `src/context/AuthContext.jsx`, `test/auth-entry.test.js`.
  - Scope: Medium

### Phase 5: Review and Ship

- [ ] **Task 10: Run cross-cutting accessibility and performance review**
  - Acceptance: no critical WCAG issues found in the public routes; images/media have dimensions and appropriate loading behavior; performance baseline is recorded and any optimization is measured before keeping it.
  - Verify: full tests/build, browser accessibility tree, console/network, performance trace, responsive screenshots.
  - Files likely touched: only files justified by findings plus `docs/` review notes.
  - Scope: Medium

- [ ] **Task 11: Simplify, document, and prepare delivery**
  - Acceptance: dead/duplicated public UI code is identified and removed only when safe, docs reflect final decisions, and the branch has reviewable atomic commits.
  - Verify: full tests/build, code-quality/security review, `git diff --check`.
  - Files likely touched: targeted files based on review.
  - Scope: Medium

### Checkpoint: Complete

- [ ] All in-scope success criteria in `SPEC.md` are met.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] Browser verification is documented.
- [ ] Code-quality, security, accessibility, and performance reviews are complete.
- [ ] Human approves the final public experience before shipping.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing API content is sparse or lacks approved media | High | Audit response shapes early; design meaningful fallbacks; ask before adding external assets. |
| Rebuilding `index.css` breaks authenticated routes | High | Replace tokens and shared primitives incrementally; test protected and public routes after each slice. |
| Homepage becomes visually attractive but unclear | High | Keep task-based success criteria; test musician and organizer paths explicitly. |
| Two-sided marketplace creates competing calls to action | Medium | Use one shared narrative with two clear role paths and measure clicks during browser review. |
| Overly large page components accumulate | Medium | Separate orchestration from presentation; split files before they become difficult to review. |
| Dependency install/audit issues obscure product work | Medium | Keep current dependency versions initially; isolate any upgrade and document security findings. |
| Reference imagery is not licensed for production | Medium | Do not copy or ship reference assets; wait for approved media sources or use product data/fallbacks. |

## Verification Protocol

For every implementation task:

1. Write or update the focused test for new behavior before implementation where behavior changes.
2. Implement the smallest complete slice.
3. Run the focused test, then `npm test` and `npm run build` after the slice.
4. Run the application in a browser and inspect screenshot, DOM, console, network, accessibility, and responsive behavior.
5. Review the diff for scope, security, simplicity, and dead code.
6. Commit only the verified slice with an imperative message.

## Open Questions Deferred to Review

The questions in `SPEC.md` about initial geography, approved media, primary conversion event, curated versus live homepage content, trust evidence, and public URL compatibility must be resolved before the relevant task is implemented. The first foundation slice does not require choosing external media or changing the API.
