# Spec: iConnect Public Website Rebuild

## Objective

Rebuild the public iConnect web experience so a first-time visitor quickly understands the network, sees credible live-music opportunities, and can enter the right path as a musician or organizer without being forced into signup before seeing value.

The product should feel like a modern live-music network: expressive and human like a music/culture publication, clear and trustworthy like a professional booking tool, and warm like a real community. The reference direction is used for composition, confidence, imagery, and editorial rhythm—not copied branding or layout.

### Primary users

- **Musicians:** Need to discover relevant gigs, present themselves credibly, and understand how iConnect can lead to real opportunities.
- **Organizers:** Need to find suitable musicians, assess fit quickly, and understand how to start a booking or post an opportunity.
- **Visitors and community members:** Need to understand the network and browse enough real content to trust it before registering.

### Core public journeys

1. A visitor lands on the homepage, understands iConnect, chooses a musician or organizer path, and reaches relevant discovery content.
2. A musician browses gigs using useful signals such as location, date, genre, budget, and availability, then reaches a clear application or signup entry point.
3. An organizer browses musician profiles/EPKs, evaluates fit from real information, and reaches a clear contact, signup, or posting entry point.
4. A visitor browses venues, bands, or community context where the existing data makes that experience useful rather than decorative.

## Tech Stack

- React 18.3.1
- Vite 5.4.8
- React Router 6.26.2
- Plain CSS with project-owned design tokens; no UI kit
- Node >= 20
- Existing Express API and relative `/api/...` client requests
- Vitest 2.1.9 and Supertest 7.2.2 for tests

No dependency additions are part of this spec. A dependency change requires explicit review first.

## Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run test:coverage
npm start
```

`npm run dev` starts the API and Vite client. Browser-facing code must use relative API paths; Vite proxies API calls in development and Express serves the built application in production-style mode.

## Project Structure

```text
src/
  App.jsx                 # route composition
  api.js                  # API client
  components/             # focused reusable UI components
  context/                # auth and other cross-cutting React context
  pages/                  # route-level containers
  index.css               # design tokens and global styles
  motion.js               # motion behavior and reduced-motion handling
server/                   # existing API and data access; out of first-pass scope
mobile/                   # existing Expo client; out of first-pass scope
test/                     # Vitest and Supertest tests
docs/ideas/               # approved product direction and discovery artifacts
CAPABILITY-MAP.md         # approved module boundaries and build order
SPEC.md                   # this specification
tasks/                    # implementation plan and task list, created after spec approval
```

Initial public routes are based on the existing application and must be audited before implementation:

- `/`
- `/musicians` and `/musicians/:id`
- `/epk/:id`
- `/gigs` and `/gigs/:id`
- `/venues` and `/venues/:id`
- `/bands` and `/bands/:id`
- `/community`
- `/login` and `/signup` as existing conversion entry points

## Design and Interaction Principles

### Visual direction

- Use a confident, light-first editorial canvas with near-black ink and a restrained accent system unless the design-foundation checkpoint proves a better contrast-safe alternative.
- Use expressive display typography paired with a highly readable body/UI face. Exact fonts are a design-foundation decision and must be checked for loading, licensing, fallbacks, and performance.
- Use real imagery, avatars, and data-backed content as primary storytelling elements.
- Prefer varied composition, strong typographic hierarchy, and intentional whitespace over repeated equal cards.
- Use color for action, status, and emphasis—not as decoration on every surface.
- Motion should support hierarchy and feedback, respect `prefers-reduced-motion`, and never hide essential content.

### Product behavior

- The homepage must offer clear musician and organizer entry points without becoming a role-selection gate.
- Discovery controls should reflect decisions users actually make. Filters must be shareable where practical through URL state.
- Detail pages must expose the most decision-relevant information before secondary metadata.
- Signup should preserve the visitor's discovery context and should not interrupt public browsing unnecessarily.
- Loading, empty, error, and media fallback states must be designed rather than left as blank space.

### Accessibility and responsiveness

- One meaningful `h1` per route, with sequential heading hierarchy.
- Native buttons, links, labels, and form controls for interaction.
- Visible `:focus-visible` treatment and logical keyboard order.
- Accessible names for icon-only controls; status changes announced where appropriate.
- Do not rely on color alone for state or meaning.
- Verify at 320px, 768px, 1024px, and 1440px.
- Support reduced motion and avoid layout shifts from late-loading media or fonts.

## Code Style

Follow the existing JavaScript/JSX style: functional components, named route-level responsibilities, plain class names tied to project tokens, and API work separated from presentation where possible.

```jsx
export default function DiscoverySection({ items, isLoading, error, onRetry }) {
  if (isLoading) return <DiscoverySkeleton />;
  if (error) return <LoadError what="musicians" error={error} onRetry={onRetry} />;
  if (items.length === 0) return <EmptyState />;

  return (
    <ul className="discovery-list" aria-label="Featured musicians">
      {items.map((item) => (
        <li key={item.id}>
          <MusicianSummary musician={item} />
        </li>
      ))}
    </ul>
  );
}
```

Implementation should favor composition over over-configured components, keep components focused, avoid inline style sprawl, and keep data fetching out of presentational components when a clean container/presentation split is practical.

## Testing Strategy

### Automated

- Add or update Vitest tests for route-level behavior, pure data transformations, filter/query behavior, and important interaction state.
- Preserve and extend existing Supertest API tests only when the public experience exposes a real contract issue.
- Run `npm test` after each vertical slice and `npm run build` before review.
- Do not remove or weaken tests to make a slice pass.

### Browser verification

For every browser-facing slice:

- Load the route in a real browser.
- Capture a screenshot at mobile and desktop widths.
- Check the DOM and heading hierarchy.
- Check console output for errors and warnings.
- Check network requests and API response status.
- Check keyboard traversal, focus visibility, and accessible names.
- Check responsive behavior and layout stability.
- Record any remaining issue in the task list instead of silently accepting it.

### Performance targets for the public first pass

- No avoidable console errors or warnings.
- No critical request failures during normal public browsing.
- No visible layout shift caused by the design system or media placeholders.
- The initial page should remain usable on a slow mobile connection and low-end device; exact Core Web Vitals budgets will be set after the first browser baseline.

## Boundaries

### Always do

- Keep public browser API calls relative (`/api/...`).
- Use real content shapes and honest states.
- Preserve existing route compatibility unless an approved decision changes it.
- Test the behavior and render output, not only the source code.
- Verify accessibility and responsive behavior before calling a UI slice complete.
- Keep changes small and reviewable; update this spec when a product decision changes.

### Ask first

- Database schema or migration changes.
- Auth, role, payment, messaging, notification, or permission changes.
- New runtime or build dependencies.
- Changing the public API contract.
- Removing or permanently renaming public routes.
- Replacing or deleting existing authenticated or mobile functionality.
- Using externally sourced images, fonts, analytics, or third-party services that introduce licensing, privacy, or security implications.

### Never do

- Commit credentials, secrets, or private user data.
- Hardcode an external API host in browser code.
- Invent testimonials, user counts, booking outcomes, or other trust claims.
- Copy the supplied design reference or its brand assets.
- Treat passing unit tests as proof that the UI is visually or accessibly correct.
- Skip the browser verification gate for public UI work.

## Success Criteria

- A first-time visitor can describe what iConnect does and identify the musician and organizer paths after viewing the homepage.
- A musician can reach relevant public gigs or a profile/EPK entry point in no more than two clear primary actions from the homepage.
- An organizer can reach relevant public musicians or a posting/contact entry point in no more than two clear primary actions from the homepage.
- Public discovery pages handle useful filters, realistic content lengths, loading, empty, error, and media fallback states.
- The public routes work at 320px, 768px, 1024px, and 1440px without horizontal overflow or broken interaction.
- Automated tests and production build pass.
- Browser verification finds no unresolved console errors, critical network failures, keyboard traps, missing accessible names, or broken heading hierarchy.
- The result is recognizably specific to iConnect and live music rather than an interchangeable AI-generated marketplace.

## Open Questions

- Should the initial public content focus on Lagos, Nigeria broadly, or an international-ready model with Lagos as the first content focus?
- Which media sources are approved and available for musicians, venues, and gigs?
- What is the primary measurable conversion event for the first release: profile creation, gig application, posting a gig, or qualified contact?
- Should the homepage combine editorially curated content with live API modules, and if so which sections use each?
- What evidence qualifies an account, venue, musician, or gig as trustworthy?
- Which public route URLs must remain stable for search engines and existing links?

## Deferred Work

An in-product assistant that answers questions, proposes solutions, and helps users navigate the website is explicitly deferred until this public website scope is complete and has passed automated, browser, accessibility, and performance verification. It will receive its own capability map and spec. No assistant UI, external AI provider, conversation storage, or bot API belongs in this milestone.

## Approval Gate

This spec must be reviewed before creating `tasks/plan.md`, `tasks/todo.md`, or changing application code. Any change to scope, module boundaries, API contracts, or success criteria must be reflected here first.
