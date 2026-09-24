# iConnect Public Website Rebuild

## Problem Statement

How might we make iConnect feel like the natural home for live music—helping musicians find relevant opportunities and helping organizers find the right people—while making the first visit clear, human, credible, and worth returning to?

## Recommended Direction

Build a public-facing iConnect experience around **connection-first editorial design**: the energy and personality of a music/culture publication, the clarity of a professional booking tool, and the warmth of a real community.

The visual direction is reference-led rather than template-led. It favors a confident light canvas, near-black typography, one or two purposeful accent colors, expressive type, human imagery, varied composition, and strong editorial rhythm. Sections should earn their space through a user decision or a story about the network; repeated card grids, decorative gradients, and generic SaaS copy should not be the default.

The first visit should make the two-sided value obvious without forcing visitors through a role-selection wall. Musicians should be able to see a credible path to opportunities and presentation; organizers should be able to see a credible path to finding talent. Real musicians, gigs, venues, locations, dates, availability, and outcomes should carry the story wherever the API provides them.

The first implementation will rebuild the public web experience while preserving the existing API contract and authenticated product. The foundation will be designed so authenticated workflows can adopt the same system later instead of creating a separate visual language.

## Key Assumptions to Validate

- [ ] **A two-sided opening can remain clear without splitting the homepage into two unrelated experiences.**
  - Validate with a five-second comprehension check and two task paths: find an opportunity and find talent.
- [ ] **Real profiles and opportunities create more trust than invented scale metrics.**
  - Validate by comparing a data-led homepage section with the current stat-led treatment in qualitative review.
- [ ] **An editorial, image-led visual system will feel more distinctive and relevant to musicians than the current dark glass/gradient system.**
  - Validate with a visual direction checkpoint before implementation and screenshot review after the first slice.
- [ ] **The existing public API can provide enough realistic content for a strong first impression.**
  - Validate by auditing the response shapes, empty states, media availability, and seeded data before finalizing layouts.
- [ ] **Visitors will understand iConnect's value before account creation if discovery is visible first.**
  - Validate by measuring click-through from the homepage to musicians, gigs, venues, and signup entry points.

## MVP Scope

### In

- A rebuilt public homepage with a deliberate design system.
- Responsive navigation and footer that make the marketplace legible without overcrowding the first visit.
- Public musician discovery and profile/EPK presentation.
- Public gig discovery and gig detail presentation.
- Public venue and community context where existing data supports it.
- Clear musician and organizer conversion paths.
- Real API-backed loading, empty, error, and media fallback states.
- Mobile-first responsive behavior at 320px, 768px, 1024px, and 1440px.
- Keyboard navigation, visible focus, semantic headings, accessible names, readable contrast, and reduced-motion handling.
- Browser-based screenshot, console, network, accessibility, and performance verification.

### Out

- A new backend or database model in the first public-site pass.
- A mobile-app redesign in the first pass.
- A complete redesign of every authenticated workflow before the public foundation is proven.
- Payments, messaging, notifications, admin, and booking logic changes unless the public experience exposes a verified issue that blocks the core journey.
- Artificial testimonials, fake user counts, fabricated outcomes, or stock content presented as real.

## Not Doing (and Why)

- **Not reproducing the reference literally** — use its confidence, composition, and editorial rhythm without copying its brand or layout.
- **Not starting with a component library of generic cards** — define information hierarchy and content needs first so components serve the product.
- **Not forcing every existing route into the first homepage release** — focus is needed to make the public entry experience coherent.
- **Not replacing the API just to enable visual work** — the current product data is a useful reality check and keeps the first slice shippable.
- **Not hiding unresolved product decisions in CSS** — ambiguous audience, content, and conversion choices will be recorded in the spec and reviewed first.

## Open Questions

- Which locations should be represented first: Lagos only, Nigeria broadly, or an international-ready model with Lagos as the initial content focus?
- Which media can be used legally and reliably for musicians, venues, and gigs in the current data model?
- What is the primary conversion event for the public site: profile creation, gig application, posting a gig, or qualified contact?
- Should the homepage show live API data immediately, or combine a curated editorial layer with live discovery modules?
- What evidence should qualify a musician, organizer, venue, or gig as trustworthy?
- Which public routes must remain backwards-compatible for search engines and existing links during the rebuild?

## First Success Criteria

- A first-time visitor can explain what iConnect does after viewing the homepage without reading every section.
- A musician can reach relevant public gigs or a profile-building entry point in one or two clear actions.
- An organizer can reach relevant musicians or a posting/contact entry point in one or two clear actions.
- The homepage and discovery pages render well at the four target viewport widths.
- Browser verification shows no console errors or warnings, broken critical network requests, or keyboard traps.
- The design feels specific to iConnect and live music rather than interchangeable with a generic AI-generated marketplace.
