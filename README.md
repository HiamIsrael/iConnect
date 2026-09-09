# iConnect

> The marketplace connecting musicians with gigs.

iConnect is a full-stack web app where musicians create profiles, discover and
apply to gigs, and event organizers post and manage bookings — with photo/EPK
uploads, a real database, direct messaging, reviews, notifications, and booking
payments.

## Features

- Musician profiles with bio, genre, instruments, rate, availability, photo and EPK
- Browse & search musicians and gigs
- Organizer dashboard: post gigs, review and respond to applications
- Musician dashboard: track applications, pay the booking fee
- Direct messaging between musicians and organizers
- Reviews & ratings after an accepted booking
- Availability scheduling (musicians publish free/busy time blocks)
- Audio & video demos on musician profiles
- Booking terms on gigs (contract terms, cancellation policy, deposit %)
- Networking section: community feed (posts, likes, comments, recruit posts, "Following" feed)
- Band profiles: create bands, join/accept members, follow bands, post as a band
- Venue / event pages: create venue profiles, attach gigs, view upcoming gigs at a venue
- EPK templates: generate a shareable EPK view + downloadable .txt from profile data
- Calendar sync: ICS export per gig + all open gigs, Google Calendar links
- PWA: installable app shell, service worker, mobile nav (OK as a web app)
- Native mobile app: Expo / React Native client for iOS, Android and web, sharing the same API
- Pluggable payments: mock (default), Paystack, Flutterwave, Stripe (set keys via env)
- Pluggable email: console (default) or Resend (set `RESEND_API_KEY`)
- Admin console with reports, resolve/dismiss and account block/unblock
- In-app notifications for applications, messages, reviews and payments
- Password reset / forgot-password flow (console email in dev; pluggable providers)
- Auth (JWT + bcrypt), role-based access (musician / organizer / admin)
- Security hardening: Helmet, rate limiting, configurable env
- Database-backed with migrations and a seed script (SQLite default / Postgres via `DATABASE_URL`)
- Automated integration tests (Vitest + Supertest)
- Docker + GitHub Actions CI

## Stack

- **Frontend:** React 18 + Vite, React Router, plain CSS (no UI kit)
- **Mobile:** Expo SDK 57 / React Native + React Navigation (under `mobile/`)
- **Backend:** Node.js + Express, Multer for uploads, Helmet + express-rate-limit
- **Database:** Knex + SQLite (`better-sqlite3`) by default; set `DATABASE_URL` (PostgreSQL) to use Postgres
- **Payments:** pluggable `mock` provider (records checkout + confirmation events)
- **Auth:** JWT + bcrypt
- **Email:** console provider by default; configure `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` to send real email
- **Tests:** Vitest + Supertest

## Getting started

```bash
npm install
npm run dev
```

- Frontend (Vite dev server): http://localhost:5173
- API (Express): http://localhost:3000/api
- Vite proxies `/api` to Express, so browser code uses **relative `/api` paths only**.

Production-style single server:

```bash
npm run build
npm start   # serves built UI + API on port 3000
```

For Docker:

```bash
docker compose up --build
```

## Mobile app

The `mobile/` directory contains an Expo / React Native client for the same API.

```bash
cd mobile
npm install
npm start        # Expo dev server (scan QR in Expo Go on a device)
npm run android  # open on Android
npm run ios      # open on iOS simulator
npm run web      # open in a browser
```

The app reads the API base URL from `EXPO_PUBLIC_API_URL` (default
`http://localhost:3000`).

- On a simulator, `http://localhost:3000` works when the API is running on your machine.
- On a physical device, set the public URL of the API, e.g.:

```bash
EXPO_PUBLIC_API_URL=https://iconnect.example.com npm start
```

Demo accounts are the same as the web app (see below). The app currently ships
with the placeholder dark branding (`iConnect`) and must be re-branded and given
store-specific icons/identifiers before any store submission.

### Mobile web build

A production (minified) web build is the fastest way to try the UI in a browser:

```bash
cd mobile
npm run build:web   # outputs mobile/dist
npm run serve:web   # serves mobile/dist on port 8081
```

The app reads the API endpoint at build time through `EXPO_PUBLIC_API_URL`, so
set it before building, e.g.:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com npm run build:web
```

### Hosting the mobile web app on a domain

The `mobile/` build is static and can be deployed to any static host. It must be
pointed at a publicly reachable API via `EXPO_PUBLIC_API_URL` at build time.

- **Vercel** — set the project Root Directory to `mobile`, then use the
  included `mobile/vercel.json` (build `npm run build:web`, output `dist`,
  SPA rewrite). Deploy with the Vercel CLI (`vercel deploy`) or Git import.
- **Netlify** — use the included `mobile/netlify.toml` (base directory
  `mobile`, build `npm run build:web`, publish `dist`, SPA redirect). Deploy
  with `netlify deploy --prod` or Git import.
- **Cloudflare Pages** — set build command `npm run build:web`, build output
  `dist`, root directory `mobile`. Add a `/* -> /index.html` SPA redirect.
- **Docker / self-host** — run `npm run build:web` in `mobile/`, then serve
  the resulting `dist/` directory with any static server (the repo includes a
  tiny `serve-static.cjs` fallback).

Then add your custom domain in the hosting dashboard. Deploy the API separately
(see the web app deployment notes / Docker setup) and set the API's public root
in `EXPO_PUBLIC_API_URL` before each web build. Native iOS/Android builds use
[EAS Build](https://docs.expo.dev/build/introduction/) for store submission.

## Tests

```bash
npm test          # runs integration tests against an isolated SQLite DB
npm run build     # production build
```

## Database

Migrations and seed data run automatically on first start.

- Default: `data/iconnect.sqlite` (zero config)
- Postgres: set `DATABASE_URL=postgres://user:pass@host/db` before starting

Migrations: `server/migrations/*.js`

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `3000`) |
| `EXPO_PUBLIC_API_URL` | Mobile app API base URL (`mobile/` only) |
| `HOST` | Bind address (default `0.0.0.0`) |
| `JWT_SECRET` | JWT signing secret (change in production) |
| `APP_URL` | Public base URL used in emails |
| `ICONNECT_DB_FILE` | SQLite file path |
| `DATABASE_URL` | Optional Postgres connection string |
| `EMAIL_PROVIDER` | `console` (default) or `resend` |
| `RESEND_API_KEY` | Resend API key for real email |
| `PAYMENT_PROVIDER` | `mock` (default), `paystack`, `flutterwave`, or `stripe` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (for Paystack) |
| `FLW_SECRET_KEY` | Flutterwave secret key (for Flutterwave) |
| `STRIPE_SECRET_KEY` | Stripe secret key (for Stripe) |
| `STRIPE_WEBHOOK_SECRET` | Stripe signing secret for webhook verification |
| `PAYMENT_CALLBACK_URL` | Public callback URL used by payment providers |

## Demo accounts / seed data

| Role | Email | Password |
| --- | --- | --- |
| Musician | ayo@example.com | password123 |
| Organizer | chidi@example.com | password123 |
| Admin | admin@example.com | password123 |

## Project structure

```
.
├── package.json
├── vite.config.js
├── vitest.config.js
├── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
├── index.html
├── src/                    # React frontend
│   ├── api.js             # fetch wrapper + upload helper
│   ├── App.jsx
│   ├── pages/
│   └── components/
├── server/                 # Express backend
│   ├── app.js             # app factory (also used by tests)
│   ├── index.js           # server entrypoint
│   ├── auth.js
│   ├── config.js
│   ├── notify.js          # pluggable email sender
│   ├── store.js           # Knex data layer
│   ├── seed.js
│   └── migrations/
├── mobile/                # Expo / React Native app
└── test/                  # integration tests
```

## API summary

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/auth/signup | — | Create account |
| POST | /api/auth/login | — | Log in |
| GET | /api/auth/me | JWT | Current user |
| POST | /api/auth/forgot-password | — | Send reset link |
| POST | /api/auth/reset-password | — | Reset password |
| GET | /api/musicians | — | Search musicians |
| GET | /api/musicians/:id | — | Musician profile |
| PUT | /api/musicians/:id | musician | Update profile |
| POST | /api/uploads | JWT | Upload photo / EPK |
| GET | /api/gigs | — | Search gigs |
| POST | /api/gigs | organizer | Post a gig |
| PUT | /api/gigs/:id | organizer | Update gig |
| DELETE | /api/gigs/:id | organizer | Delete gig |
| POST | /api/gigs/:id/apply | musician | Apply to gig |
| GET | /api/applications/my | JWT | My applications |
| PUT | /api/applications/:id | organizer | Accept / decline |
| POST | /api/applications/:id/checkout | musician | Create booking payment |
| POST | /api/payments/:id/confirm | JWT | Confirm payment |
| GET | /api/payments/my | JWT | My payments |
| GET | /api/payments/callback | — | Provider redirect landing (verify payment) |
| GET | /api/gigs/:id/calendar.ics | — | Download gig as ICS |
| GET | /api/calendar/gigs.ics | — | Download all open gigs as ICS |
| GET | /api/musicians/:id/epk | — | EPK JSON + text template |
| GET | /api/musicians/:id/epk.txt | — | Download EPK as .txt |
| GET | /api/venues | — | List venues |
| GET | /api/venues/:id | — | Venue detail + upcoming gigs |
| POST | /api/venues | organizer | Create a venue |
| GET | /api/venues/mine | organizer | My venues |
| PUT | /api/venues/:id | organizer | Edit venue |
| DELETE | /api/venues/:id | organizer | Delete venue |
| GET | /api/reviews/user/:id | — | Reviews for a user |
| POST | /api/applications/:id/review | JWT | Review an accepted booking |
| GET | /api/messages/threads | JWT | List conversations |
| GET | /api/messages/with/:userId | JWT | Read a conversation |
| POST | /api/messages/with/:userId | JWT | Send a message |
| GET | /api/musicians/:id/availability | — | Musician availability |
| POST | /api/musicians/:id/availability | musician | Add availability block |
| DELETE | /api/availability/:id | musician | Remove availability block |
| GET | /api/musicians/:id/demos | — | List audio/video demos |
| POST | /api/musicians/:id/demos | musician | Add a demo |
| DELETE | /api/musicians/:id/demos/:demoId | musician | Remove a demo |
| POST | /api/reports | JWT | Report a user/gig/review/message |
| GET | /api/admin/reports | admin | List reports |
| PUT | /api/admin/reports/:id | admin | Resolve/dismiss report |
| GET | /api/admin/users | admin | List all users |
| POST | /api/admin/users/:id/block | admin | Block a user |
| POST | /api/admin/users/:id/unblock | admin | Unblock a user |
| GET | /api/community/posts | — | Community feed (use `?following=true` + JWT) |
| POST | /api/community/posts | JWT | Create a post / recruit post |
| GET | /api/community/posts/:id | — | Post detail + comments |
| DELETE | /api/community/posts/:id | JWT | Delete own post (or admin) |
| POST | /api/community/posts/:id/like | JWT | Like / unlike a post |
| POST | /api/community/posts/:id/comments | JWT | Comment on a post |
| GET | /api/bands | — | List bands |
| GET | /api/bands/mine | JWT | My band memberships |
| POST | /api/bands | JWT | Create a band |
| GET | /api/bands/:id | — | Band detail + members |
| PUT | /api/bands/:id | JWT | Edit band (owner) |
| DELETE | /api/bands/:id | JWT | Delete band (owner) |
| POST | /api/bands/:id/join | JWT | Request to join |
| POST | /api/bands/:id/members/:userId/accept | owner/admin | Accept member |
| POST | /api/bands/:id/members/:userId/remove | owner/admin | Remove member |
| GET | /api/follows/status/:targetType/:targetId | JWT | Follow status/count |
| POST | /api/follows/:targetType/:targetId | JWT | Follow / unfollow |
| GET | /api/notifications | JWT | List notifications |
| POST | /api/notifications/read | JWT | Mark read |
