# iConnect

> The marketplace connecting musicians with gigs.

iConnect is a full-stack web app where musicians create profiles, discover and
apply to gigs, and event organizers post and manage bookings.

## Features

- Musician profiles with bio, genre, instruments, rate and availability
- Browse & search musicians and gigs
- Organizer dashboard: post gigs, review and respond to applications
- Musician dashboard: track applications and statuses
- JWT authentication, role-based access (musician / organizer)
- JSON file-backed storage (no external DB needed for the demo)

## Stack

- **Frontend:** React 18 + Vite, React Router, plain CSS (no UI kit)
- **Backend:** Node.js + Express
- **Storage:** `data/db.json` (seed data auto-created on first run)
- **Auth:** JWT + bcrypt

## Getting started

```bash
npm install
npm run dev
```

The app runs at:

- Frontend (Vite dev server): http://localhost:5173
- API (Express): http://localhost:3000/api
- Vite proxies `/api` to the Express server, so the frontend uses
  **relative `/api` paths only** (no localhost in browser code).

For a production-style single server:

```bash
npm run build
npm start   # serves both the built UI and the API on port 3000
```

## Demo accounts / seed data

| Role              | Email                   | Password      |
| ----------------- | ----------------------- | ------------- |
| Musician (Ayo)    | ayo@example.com         | password123   |
| Musician (Grace)  | grace@example.com       | password123   |
| Musician (Tunde)  | tunde@example.com       | password123   |
| Musician (Nia)    | nia@example.com         | password123   |
| Organizer (Jazz House) | chidi@example.com  | password123   |
| Organizer (Festival)   | amara@example.com | password123   |
| Organizer (Civic Hall) | femi@example.com  | password123   |

## Project structure

```
.
├── package.json
├── vite.config.js
├── index.html
├── src/                  # React frontend
│   ├── api.js           # fetch wrapper (relative /api calls)
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   └── pages/
└── server/               # Express backend
    ├── index.js
    ├── auth.js
    ├── db.js
    └── seed.js
```

## API summary

| Method | Endpoint            | Auth                    | Description                 |
| ------ | ------------------- | ----------------------- | --------------------------- |
| POST   | /api/auth/signup    | —                       | Create account              |
| POST   | /api/auth/login     | —                       | Log in                      |
| GET    | /api/auth/me        | JWT                     | Current user                |
| GET    | /api/musicians      | —                       | Search musicians            |
| GET    | /api/musicians/:id  | —                       | Musician profile            |
| PUT    | /api/musicians/:id  | musician (owner)        | Update profile              |
| GET    | /api/gigs           | —                       | Search gigs                 |
| GET    | /api/gigs/:id       | —                       | Gig details                 |
| POST   | /api/gigs           | organizer               | Post a gig                  |
| PUT    | /api/gigs/:id       | organizer (owner)       | Update gig                  |
| DELETE | /api/gigs/:id       | organizer (owner)       | Delete gig                  |
| POST   | /api/gigs/:id/apply | musician                | Apply to gig                |
| GET    | /api/applications/my| JWT                     | My applications             |
| PUT    | /api/applications/:id | organizer (gig owner) | Accept / decline application |
