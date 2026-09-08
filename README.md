# iConnect

> The marketplace connecting musicians with gigs.

iConnect is a full-stack web app where musicians create profiles, discover and
apply to gigs, and event organizers post and manage bookings — with photo/EPK
uploads, a real database, notifications and booking payments.

## Features

- Musician profiles with bio, genre, instruments, rate, availability, photo and EPK
- Browse & search musicians and gigs
- Organizer dashboard: post gigs, review and respond to applications
- Musician dashboard: track applications, pay the booking fee
- In-app notifications for applications and payments
- Photo / EPK file uploads (stored locally under `data/uploads`)
- Auth (JWT + bcrypt), role-based access (musician / organizer)
- Database-backed with migrations and a seed script

## Stack

- **Frontend:** React 18 + Vite, React Router, plain CSS (no UI kit)
- **Backend:** Node.js + Express, Multer for uploads
- **Database:** Knex + SQLite (`better-sqlite3`) by default; set `DATABASE_URL` (PostgreSQL) to use Postgres
- **Payments:** pluggable `mock` provider (records checkout + confirmation events)
- **Auth:** JWT + bcrypt

## Getting started

```bash
npm install
npm run dev
```

The app runs at:

- Frontend (Vite dev server): http://localhost:5173
- API (Express): http://localhost:3000/api
- Vite proxies `/api` to the Express server, so the frontend uses **relative `/api` paths only**.

For a production-style single server:

```bash
npm run build
npm start   # serves built UI + API on port 3000
```

## Database

On first start, migrations run and seed data is created automatically.

- Default: `data/iconnect.sqlite` (SQLite, zero config)
- Postgres: set `DATABASE_URL=postgres://user:pass@host/db` before starting

Schema: `server/migrations/*.js`

## Demo accounts / seed data

| Role | Email | Password |
| --- | --- | --- |
| Musician | ayo@example.com | password123 |
| Organizer | chidi@example.com | password123 |

## Project structure

```
.
├── package.json
├── vite.config.js
├── index.html
├── src/                    # React frontend
│   ├── api.js             # fetch wrapper + upload helper
│   ├── App.jsx
│   ├── pages/
│   └── components/
└── server/                 # Express backend
    ├── index.js
    ├── auth.js
    ├── store.js            # Knex data layer
    ├── seed.js
    └── migrations/
```

## API summary

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/auth/signup | — | Create account |
| POST | /api/auth/login | — | Log in |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/musicians | — | Search musicians |
| GET | /api/musicians/:id | — | Musician profile |
| PUT | /api/musicians/:id | musician | Update profile |
| POST | /api/uploads | JWT | Upload photo / EPK |
| GET | /api/gigs | — | Search gigs |
| GET | /api/gigs/:id | — | Gig details |
| POST | /api/gigs | organizer | Post a gig |
| PUT | /api/gigs/:id | organizer | Update gig |
| DELETE | /api/gigs/:id | organizer | Delete gig |
| POST | /api/gigs/:id/apply | musician | Apply to gig |
| GET | /api/applications/my | JWT | My applications |
| PUT | /api/applications/:id | organizer | Accept / decline |
| POST | /api/applications/:id/checkout | musician | Create booking payment |
| POST | /api/payments/:id/confirm | JWT | Confirm mock payment |
| GET | /api/payments/my | JWT | My payments |
| GET | /api/notifications | JWT | List notifications |
| POST | /api/notifications/read | JWT | Mark read |
```
