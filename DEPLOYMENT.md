# Deploying iConnect to a public domain

> **Choosing Render (Option A)?** There's a focused click-by-click guide at
> [`DEPLOYMENT_RENDER.md`](./DEPLOYMENT_RENDER.md) with the repo's `render.yaml`
> blueprint. This file is the broader reference for all host options.

iConnect has two runtime parts that must both be reachable on the internet:

1. **The API/server** — Express + SQLite (or Postgres) under `server/`. This is what
   the mobile app calls. It needs a **public URL** that ends in `/api`.
2. **The client** — the mobile Expo web build (`mobile/dist`, static). It can go
   on GitHub Pages, Vercel, Netlify, or any static host.

The client does **not** discover the API automatically. The API URL is baked into
the build at build time through `EXPO_PUBLIC_API_URL`, and the mobile app appends
`/api` to it. So the order is:

> **1) Host the API → 2) get its public URL → 3) build/deploy the client with
> that URL → 4) (optional) point a custom domain at either.**

---

## Step 1 — Host the API and get a public URL

Pick one option. The result of this step is a URL like
`https://your-app.onrender.com` or `https://your-app.railway.app`.

### Option A: Render (free tier, fastest for a demo)

1. Push this repo to GitHub (already done — `HiamIsrael/iConnect`).
2. Go to https://render.com → New → **Web Service**.
3. Connect the GitHub repo.
4. Set:
   - **Name:** `iconnect-api`
   - **Region:** closest to you
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (runs `node server/index.js`)
5. Add environment variables:
   - `JWT_SECRET` — a long random string (use a password manager / `openssl rand -hex 32`)
   - `APP_URL` — the same public URL Render gives you after first deploy
   - `EMAIL_PROVIDER` — `console` (default) unless you have a real email provider
   - `PAYMENT_PROVIDER` — `mock` (default) unless you have real payment keys
6. **Create Web Service.** After ~1–2 minutes Render gives you a URL like:
   - `https://iconnect-api.onrender.com`

> Render's free tier is fine for a demo but sleeps after inactivity. For always-on
> use, use the paid instance or Railway/Fly.

### Option B: Railway (quick, has a real always-on plan)

1. https://railway.com → New Project → **Deploy from GitHub repo**.
2. Railway runs `npm start` automatically; set `JWT_SECRET` and `APP_URL`.
3. Railway gives you a public URL like:
   - `https://<project>.up.railway.app`

### Option C: Fly.io (Docker-based, more control)

1. Install `flyctl` and run `fly launch`.
2. It detects the `Dockerfile` and builds/deploys it.
3. `APP_URL` should be set to the generated Fly URL.
4. Attach a volume for SQLite persistence, or set `DATABASE_URL` to a Postgres
   service.

### Option D: Any VPS / server with Docker

If you have your own server:

```bash
git clone https://github.com/HiamIsrael/iConnect.git
cd iConnect
docker compose up -d --build
```

The API is then at `http://<server-ip>:3000`. Add a reverse proxy (Caddy/NGINX)
and TLS to get `https://api.yourdomain.com`.

### Option E: Tunnel your local API (quick demo only, not permanent)

While developing, expose the local API through a tunnel, then point the app at
the tunnel URL:

```bash
# install cloudflared, or ngrok
cloudflared tunnel --url http://localhost:3000
# or
ngrok http 3000
```

Use the resulting `https://<host>.trycloudflare.com` as `EXPO_PUBLIC_API_URL`.
This is **only good for a quick demo** — the URL dies when the tunnel closes.
For a hosted app, use A–D.

---

## Step 2 — Verify the public API URL

After deploying the API, confirm it works with a real public request from outside
the sandbox:

The app builds `EXPO_PUBLIC_API_URL` + `/api`. So if the platform gives you:

```
https://iconnect-api.onrender.com
```

then construct `EXPO_PUBLIC_API_URL` as:

```
https://iconnect-api.onrender.com
```

and verify with:

```bash
curl https://iconnect-api.onrender.com/api/health
# expected: {"ok":true,"name":"iConnect","version":"0.3.0","storage":"sqlite"}
```

> The URL must **not** include `/api` and must **not** end in a trailing slash.
> The app adds `/api` itself.

Environment vars to set on the API host (at minimum):

| Variable | Value |
| --- | --- |
| `PORT` | `3000` (or the platform's assigned port) |
| `JWT_SECRET` | long random string |
| `APP_URL` | your public API root (no `/api`) |
| `DATABASE_URL` | optional: Postgres URL if you want Postgres |
| `EMAIL_PROVIDER` | `console` (default) unless you have a sender |
| `PAYMENT_PROVIDER` | `mock` (default) unless you have keys |

---

## Step 3 — Build/deploy the client with the API URL

Set `EXPO_PUBLIC_API_URL` to the URL from Step 2 before each build.

### GitHub Pages (included workflow)

1. **Add a repo secret** (Settings → Secrets and variables → Actions → New
   repository secret):
   - Name: `EXPO_PUBLIC_API_URL`
   - Value: `https://iconnect-api.onrender.com`
2. **Enable Pages**: Settings → Pages → Build and deployment → Source:
   **GitHub Actions**.
3. Push/merge to `main` (the included `.github/workflows/deploy-mobile.yml`
   builds `mobile/dist` and publishes it), or run it manually on the Actions tab.
4. Pages URL appears under Settings → Pages, e.g.
   `https://<username>.github.io/iConnect/`.

### Vercel, Netlify, Cloudflare, or self-host

See the "Hosting the mobile web app on a domain" section in `README.md`.
In all cases, point the host at `mobile/`, build with `npm run build:web`, and
set `EXPO_PUBLIC_API_URL=<your public API root>` in the host's environment
variables during the build.

---

## Step 4 — Add a custom domain

| Part | Where to add the domain |
| --- | --- |
| API | Render/Railway/Fly dashboard ("Custom Domains") or your DNS server |
| Client | GitHub Pages: Settings → Pages → Custom domain |

Then update the environment variables if the host changes:

- API host: set `APP_URL` to the new public root (used in emails/payment links).
- Client: set `EXPO_PUBLIC_API_URL` to the new public API root and rebuild.

---

## Quick end-to-end example

1. Deploy API on Render → get `https://iconnect-api.onrender.com`.
2. Verify: `curl https://iconnect-api.onrender.com/api/health` returns `ok`.
3. GitHub repo secret `EXPO_PUBLIC_API_URL=https://iconnect-api.onrender.com`.
4. Enable GitHub Pages (source: GitHub Actions) and merge to `main`.
5. Open the Pages URL → log in with `ayo@example.com` / `password123`.
6. Optionally point a custom domain at the Pages URL and the API URL.
