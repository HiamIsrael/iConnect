# Capability Map: iConnect Public Website Rebuild

**Status:** Approved for specification and planning  
**Date:** 2026-09-24  
**Scope:** Public website and public discovery experience only

## Initiative

Rebuild the public iConnect website as a connection-first music network: editorial enough to feel native to music culture, professional enough to support real booking decisions, and warm enough to feel like a community of people rather than a directory.

The first pass preserves the existing API contract, authenticated product, and mobile client. It changes the public web experience without pretending that backend or mobile redesign is part of this milestone.

## Capability Boundaries

| Module id | Responsibility | Depends on |
|---|---|---|
| `design-foundation` | Typography, color, spacing, imagery, layout primitives, responsive rules, accessibility conventions, and shared interaction states | — |
| `public-home` | Editorial homepage, role-aware entry points, trust, and previews of the live marketplace | `design-foundation` |
| `musician-discovery` | Public musician search, filters, profile pages, and EPK presentation | `design-foundation` |
| `gig-discovery` | Public gig search, filters, detail pages, and application entry points | `design-foundation` |
| `venue-community` | Venue, band, and community context where existing API data supports a coherent public experience | `design-foundation` |
| `conversion-entry` | Musician and organizer signup/login entry points that preserve discovery context | `public-home`, `musician-discovery`, `gig-discovery` |

## Build Order

```text
design-foundation
       │
       ▼
public-home
   ┌───┴───┐
   ▼       ▼
musician-discovery   gig-discovery
   └───┬───┘
       ▼
venue-community
       │
       ▼
conversion-entry
```

`musician-discovery` and `gig-discovery` can proceed in parallel after the homepage foundation is accepted, but each must remain independently usable and verifiable.

## Cross-Cutting Requirements

Every module must:

- Use realistic data from the existing API or clearly marked empty states.
- Preserve relative `/api/...` browser requests and existing route compatibility unless a route change is explicitly approved.
- Include loading, error, empty, and fallback-media states where data can be unavailable.
- Work at 320px, 768px, 1024px, and 1440px widths.
- Meet keyboard, focus, semantic heading, accessible-name, and contrast requirements.
- Avoid generic AI visual patterns: decorative gradients without purpose, repeated card grids, invented metrics, filler copy, and uniform layout rhythm.
- Be verified in the browser with a clean console and expected network requests before being considered complete.

## Explicitly Outside This Map

- API/database redesign
- Mobile app redesign
- Auth, payment, messaging, notification, or admin logic changes
- Destructive data migrations
- New dependency additions without approval
- Replacing existing authenticated product workflows before the public foundation is proven
