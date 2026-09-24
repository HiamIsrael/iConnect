# iConnect Public Website Rebuild — Task List

Source: `SPEC.md` and `tasks/plan.md`  
Current phase: Public website implementation complete; final browser/accessibility/performance review pending

## Verification notes

- Dependencies installed with `npm install --nodedir=/usr/local` because the sandbox already provides Node headers locally and external header download was unavailable.
- `npm test`: 43 tests passed.
- `npm run build`: passed.
- API health and public gig responses verified through the running local server.
- Live preview is running on the sandbox website preview; screenshot, accessibility-tree, and responsive review remain the next gate.
- Musician and gig discovery lists persist filters through `useSearchParams`; profile/EPK and gig detail presentation are implemented.
- Venue and band listings now use the same network discovery pattern with shareable filters and designed states.
- Venue, band, and community detail/feed states now handle loading, errors, and empty results intentionally.
- Login and signup preserve a safe internal `next` destination and role intent for discovery-to-conversion handoff.
- The assistant bot is intentionally deferred until the website scope is complete and the final public experience has passed review.

## Phase 1: Design Foundation

- [x] **Task 1 — Establish the public design foundation**
  - Acceptance: new tokens, type hierarchy, surface rules, responsive container, focus states, and reduced-motion behavior are documented in code; existing routes still build.
  - Verify: `npm run build`; inspect `/` and one existing detail route at mobile and desktop widths; no console errors.
  - Dependencies: none.
  - Files likely touched: `src/index.css`, `src/components/Navbar.jsx`, `src/components/Footer.jsx`.

- [x] **Task 2 — Add public content and state primitives**
  - Acceptance: reusable section heading, status/empty treatment, media fallback, and action-group patterns exist without a UI dependency; primitives support accessible names and focus.
  - Verify: focused component tests where behavior exists, `npm test`, `npm run build`, browser inspection.
  - Dependencies: Task 1.
  - Files likely touched: `src/components/LoadState.jsx`, `src/components/Avatar.jsx`, `src/components/PublicSection.jsx`, `test/public-components.test.js`.

## Checkpoint: Foundation

- [ ] Tokens and primitives are reviewed against the reference direction.
- [ ] Tests pass and the production build succeeds.
- [ ] Existing public routes remain reachable.
- [ ] Homepage visual baseline screenshot is captured before replacement.
- [ ] Human review before proceeding.

## Phase 2: Homepage Vertical Slice

- [x] **Task 3 — Replace the homepage opening and primary paths**
  - Acceptance: homepage explains the marketplace, presents musician and organizer paths, uses real API data where available, and has designed loading/error/empty states.
  - Verify: focused route tests, `npm test`, `npm run build`, browser screenshot and network/console check.
  - Dependencies: Tasks 1–2.

- [x] **Task 4 — Add homepage discovery and trust sections**
  - Acceptance: featured gigs and musicians feel editorial rather than a generic grid; proof is data-backed; the layout has a clear closing conversion action.
  - Verify: focused tests, full test/build, browser responsive and accessibility check.
  - Dependencies: Task 3.

## Checkpoint: Homepage

- [ ] A first-time visitor can identify both primary user paths.
- [ ] A musician and organizer can each reach a relevant discovery page within two clear actions.
- [ ] Screenshots at 320px and 1440px are reviewed.
- [ ] Console and network are clean for the public homepage.
- [ ] Human review before proceeding.

## Phase 3: Discovery Journeys

- [x] **Task 5 — Rebuild musician discovery**
  - Acceptance: useful filters, URL state where practical, realistic long/empty/error states, and links to profile/EPK.
  - Verify: query/filter tests, full test/build, browser keyboard and responsive check.
  - Dependencies: Task 4.

- [x] **Task 6 — Rebuild musician profile and EPK presentation**
  - Acceptance: identity, fit, availability, work, and next action are prioritized; missing media uses an intentional fallback.
  - Verify: route tests, full test/build, browser DOM/accessibility/network verification.
  - Dependencies: Task 5.

- [x] **Task 7 — Rebuild gig discovery and detail**
  - Acceptance: date, location, format, fee, and fit signals are clear; detail page has a clear application/signup path without API changes.
  - Verify: filter/action tests, full test/build, browser responsive/network check.
  - Dependencies: Task 4.

## Checkpoint: Discovery

- [ ] Musician and gig journeys are independently usable from homepage to detail.
- [ ] URL state survives refresh and can be shared where filters are supported.
- [ ] Empty, loading, error, and missing-media cases are intentional.
- [ ] No newly introduced API failures or accessibility issues.

## Phase 4: Network Context and Conversion

- [x] **Task 8 — Rebuild venue, band, and community public context**
  - Acceptance: public routes reinforce the network and do not feel like disconnected directories.
  - Verify: route tests, full test/build, browser screenshots at target widths.
  - Dependencies: Tasks 5–7.

- [x] **Task 9 — Improve conversion entry and context handoff**
  - Acceptance: login/signup preserves discovery context and role intent without blocking public browsing.
  - Verify: auth-entry tests, full test/build, browser keyboard/error verification.
  - Dependencies: Tasks 3, 5, and 7.

## Phase 5: Review and Ship

- [ ] **Task 10 — Run accessibility and performance review**
  - Acceptance: no critical public-route accessibility issues; media is dimensioned and loaded appropriately; performance baseline and measured fixes are documented.
  - Verify: full tests/build, browser accessibility tree, console/network, performance trace, responsive screenshots.
  - Dependencies: Tasks 1–9.

- [ ] **Task 11 — Simplify, document, and prepare delivery**
  - Acceptance: safe dead/duplicate public UI is removed, decisions are documented, and the branch has reviewable atomic commits.
  - Verify: full tests/build, quality/security review, `git diff --check`.
  - Dependencies: Task 10.

## Final Checkpoint

- [ ] All `SPEC.md` success criteria are met.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] Browser verification is documented.
- [ ] Quality, security, accessibility, and performance reviews are complete.
- [ ] Human approves the final public experience before shipping.
