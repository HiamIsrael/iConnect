# Go-Live Guide — Getting the credentials CreatorDesk needs

> This is the step-by-step guide for the two things CreatorDesk asked of you:
> **(1) an AI provider API key** and **(2) YouTube OAuth credentials** (client
> ID, client secret, and a refresh token). Each part is independent — do them in
> either order, or do just one and keep the other in demo mode.
> Time budget: ~10 minutes for an AI key, ~25–40 minutes for YouTube (mostly
> Google Cloud Console clicking).

---

## TL;DR checklist

- [ ] **AI key** (any one of): `OPENAI_API_KEY` *or* `ANTHROPIC_API_KEY` *or* `GEMINI_API_KEY`
- [ ] **Google Cloud project** with *YouTube Data API v3* enabled
- [ ] **OAuth consent screen** configured (and *published* — see the 7-day gotcha below!)
- [ ] **OAuth client ID + secret** (type: **Desktop app**)
- [ ] **Refresh token** via `npm run youtube-token` (helper included) or OAuth Playground
- [ ] Export the env vars and run `npm run dev` → **Settings** tab shows `live`

---

## Part 1 — Get an AI provider API key

CreatorDesk talks to one of three providers. All three plug into the same
interface, so pick based on budget/quality preference. (Staying in `mock` mode
is always an option — it's deterministic, free, and good enough for trying the
workflow, but the copy is templated, not model-written.)

### Option A — Gemini (has a real free tier) — cheapest way in

1. Go to **[aistudio.google.com](https://aistudio.google.com)** and sign in with
   any Google account (ideally the one that owns your channel).
2. Click **Get API key** → **Create API key** → pick or create a project.
3. Copy the key (starts with `AIza…`).

- Free tier exists and covers light usage; paid usage is pay-as-you-go with a
  generous free monthly allowance ([strolling.dev](https://strolling.dev/blog/gemini-api-pricing?utm_source=openai)).
- CreatorDesk's default model is `gemini-2.0-flash` — fast and cheap.
- Export: `CREATORDESK_AI_PROVIDER=gemini` + `GEMINI_API_KEY=AIza…`

### Option B — OpenAI (best model quality, pay-as-you-go)

1. Go to **[platform.openai.com](https://platform.openai.com)** → sign up / sign in.
2. **Settings → Billing** → add a small credit balance (e.g. $5–10) or a payment
   method. *API billing is separate from ChatGPT Plus — a ChatGPT subscription
   does not cover API usage.*
3. **API keys → Create new secret key** → copy it immediately (shown once).
   Optionally restrict the key to specific models/IPs in the key settings.

- API is token-based pay-as-you-go; good models are roughly **$0.25–$2 per 1M
  input tokens** for the workhorse tiers (see
  [openai.com/api/pricing](https://openai.com/api/pricing/)).
  CreatorDesk's default is `gpt-4o-mini` (a few $/month of typical usage; set
  `OPENAI_MODEL=gpt-5.2` if you want frontier quality).
- For AI-generated thumbnail images CreatorDesk uses the image model
  (`OPENAI_IMAGE_MODEL`, default `gpt-image-1`) — image generations cost a few
  cents each.
- Export: `CREATORDESK_AI_PROVIDER=openai` + `OPENAI_API_KEY=sk-…`

### Option C — Anthropic (Claude, text only)

1. Go to **[console.anthropic.com](https://console.anthropic.com)** → sign in.
2. **Billing** → add credits (prepaid, pay-as-you-go; *Claude Pro/Max subscriptions
   cover claude.ai, not the API* — [support.claude.com](https://support.claude.com/en/articles/8325606-billing-faq)).
3. **API Keys → Create Key**. Export: `CREATORDESK_AI_PROVIDER=anthropic` +
   `ANTHROPIC_API_KEY=sk-ant-…`
- Note: Anthropic has no image model — thumbnail **briefs and prompts** still
  work; actual image generation needs OpenAI or Gemini (or mock).

### Realistic monthly cost estimate

| Usage | Gemini | OpenAI (mini tier) | OpenAI (frontier) |
|---|---|---|---|
| ~20 videos × 4 generations each (metadata/thumbs/analysis/insights) | free tier likely covers it | ~$1–5 | ~$10–30 |

---

## Part 2 — YouTube OAuth (client ID, secret, refresh token)

YouTube Studio has no plugin API, so CreatorDesk uses the official
**YouTube Data API v3**. Reading your channel *and* writing title/description/
tags/thumbnails back requires OAuth with your channel's permission. This is the
longest part; follow it in order.

### Step 2.1 — Google Cloud project + enable the API

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**.
2. Project dropdown (top bar) → **New Project** → name it e.g. `creatordesk` → **Create**.
3. Ensure the new project is selected (check the project dropdown).
4. **APIs & Services → Library** → search **"YouTube Data API v3"** → **Enable**.

### Step 2.2 — OAuth consent screen (read this carefully, it's where most people get stuck)

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** (even for a personal channel — unless you're on
   Google Workspace and the channel is org-owned, then Internal works and is
   simpler).
3. Fill in the required branding: app name (`CreatorDesk`), your email.
4. **Scopes:** you can skip adding scopes here for now (CreatorDesk requests
   them explicitly), or add these two if prompted later:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.upload`
5. **Test users:** add the Google account(s) that own the channel.

> ### ⚠ The 7-day expiry gotcha — do this before you rely on the tool
> While the consent screen's publishing status is **"Testing"**, Google expires
> every refresh token after **7 days** — documented behavior, not a bug
> ([dev.to](https://dev.to/ko-hi/googles-oauth-testing-mode-expires-refresh-tokens-in-7-days-publish-the-consent-screen-before-24hm), [unified.to](https://unified.to/blog/why_google_oauth_returns)).
> Your workflow: use Testing mode while trying things out, then click
> **"Publish app"** to move to **In production** before doing real work.
> Publishing requires an app homepage URL, a privacy policy URL, and (for
> domains) a verified authorized domain. **Tip from experience:** publishing
> just for your own channel? The "homepage" and "privacy policy" can be as
> simple as two public pages (even a GitHub Pages or Notion page) — and then
> **re-run the token flow once** so your refresh token is issued under
> production status.

### Step 2.3 — Create the OAuth client (ID + secret)

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Desktop app** (loopback redirect like CreatorDesk's
   helper uses is built into Desktop clients — no redirect URI registration
   needed).
3. Name it `CreatorDesk desktop` → **Create** → copy the **Client ID** and
   **Client secret**.

### Step 2.4 — Get the refresh token

#### Method A — CreatorDesk helper (recommended, ~2 minutes)

```bash
cd creatordesk
YOUTUBE_CLIENT_ID=xxxx.apps.googleusercontent.com \
YOUTUBE_CLIENT_SECRET=GOCSPX-xxxx \
npm run youtube-token
```

1. It prints a Google consent URL — open it.
2. **Important:** sign in with the Google account that owns the channel. If the
   channel lives under a **Brand Account**, pick the *brand* on the account
   chooser screen (click your avatar → the channel's brand) — otherwise you'll
   grant access to your personal channel instead.
3. Approve both permissions (read + upload).
4. Google redirects to `127.0.0.1:53682` and the terminal prints:

```
YOUTUBE_REFRESH_TOKEN=1//xxxxx...
```

The script uses Google's installed-app loopback flow with `access_type=offline`
and `prompt=consent` — the two settings that make Google issue a refresh token.

#### Method B — Google OAuth Playground (no terminal needed)

1. Open **[developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)**.
2. ⚙ (gear icon) → check **"Use your own OAuth credentials"** → paste your
   Client ID + secret.
3. In the left list select the two `youtube.readonly` and `youtube.upload`
   scopes → **Authorize APIs** → sign in with the channel account → allow.
4. **Exchange authorization code for tokens** → copy the **refresh_token**.

> Playground caveat: if the consent screen is in Testing, the token still
> expires in 7 days; the same "Publish app" fix applies. Some users also report
> Playground occasionally omitting the refresh token — ticking
> `prompt=consent` (Method A does this automatically) fixes it.

#### Method C — Already have credentials?

Any standard Google OAuth 2.0 refresh token with those two scopes works. Set
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

### Step 2.5 — One channel per connect

CreatorDesk v1 manages **one channel per token**. If you run multiple channels,
use separate Google accounts/consents and separate env sets (or just re-run the
token helper with the other account and swap `YOUTUBE_REFRESH_TOKEN`).

---

## Part 3 — Wire it into CreatorDesk

CreatorDesk reads plain environment variables (nothing is stored in files, and
keys are never exposed to the browser). Either export them inline:

```bash
cd creatordesk

export CREATORDESK_AI_PROVIDER=openai
export OPENAI_API_KEY=sk-...

export CREATORDESK_YOUTUBE=live
export YOUTUBE_CLIENT_ID=xxxx.apps.googleusercontent.com
export YOUTUBE_CLIENT_SECRET=GOCSPX-xxxx
export YOUTUBE_REFRESH_TOKEN=1//xxxxx...

npm run dev
```

…or keep them in a local `.env`-style file that is **git-ignored** (create
`creatordesk/secrets.env`, chmod 600) and load it per session:

```bash
set -a; . ./secrets.env; set +a
npm run dev
```

> Do both parts independently: with only the AI key, generation is real but
> the channel stays in demo mode; with only YouTube, reads/publishes are real
> but generations stay templated.

### Verify it worked

1. `curl -s localhost:4180/api/health` → `"youtube":"live"` and your AI provider.
2. Open the app → **Settings** tab shows the same; the **demo banner disappears**.
3. **Channel** tab now lists your real videos.

### First live run — be careful

1. Start with **Analysis** and **Export** on an *old* video — reads only.
2. Try **Metadata** generation, then copy into Studio manually if you want a
   no-risk test.
3. **Publish** on a throwaway/private video first: the confirm dialog applies
   title/description/tags via `videos.update` and thumbnails via
   `thumbnails.set` for real. There is no undo — YouTube's API replaces the
   fields you send (CreatorDesk only sends the fields you filled in the dialog).
4. Every publish is recorded in the audit log
   (`CREATORDESK_DATA_DIR/publish-log.json`).

---

## Part 4 — Costs & quotas (the real limits)

**AI providers:** see Part 1 — pay-as-you-go or free tier.

**YouTube Data API v3: free, but quota-capped.** No paid tier exists; every
Google Cloud project gets **10,000 quota units/day** (resets midnight Pacific),
requestable increases only via Google's audit form
([outlierkit.com](https://outlierkit.com/resources/youtube-api-pricing/)). Typical
CreatorDesk costs per video:

| Operation | Quota cost | When |
|---|---|---|
| `channels.list`, `playlistItems.list`, `videos.list` | ~1 unit each | opening the app / a video |
| `videos.update` (publish title/desc/tags) | ~50 units | per publish |
| `thumbnails.set` (publish thumbnail) | ~50 units | per publish |

That's ~200 publishes/day of headroom — plenty for a solo creator. Reads are
effectively unlimited at this scale.

---

## Part 5 — Security checklist

- **Never commit keys.** Keep them in env vars or a git-ignored file. (The repo
  already ignores nothing yet for `secrets.env` — name it `secrets.env` and
  don't `git add` it, or add it to `.gitignore`.)
- **Least privilege:** CreatorDesk only requests `youtube.readonly` +
  `youtube.upload` — don't add broader scopes (e.g. `youtube` full) to your
  consent screen.
- **Restrict the AI key** in the provider console (model allow-list / IP
  restriction) and set a low monthly billing cap or budget alert.
- **Rotate** by creating a new key/token and revoking the old one if anything
  leaks; re-running `npm run youtube-token` issues a fresh refresh token
  (Google allows ~100 live refresh tokens per account per client).
- **Publishing writes to your real channel.** The confirm dialog is the only
  gate — read it before clicking.

---

## Part 6 — Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `invalid_grant` when starting in live mode | Refresh token expired/revoked. Most common: consent screen still in **Testing** (7-day expiry) → **Publish app**, re-run `npm run youtube-token`. Also caused by password changes/revocations. |
| `Google did not return a refresh token` | Consent already given earlier without `prompt=consent` → use `npm run youtube-token` (forces consent), or revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and retry. |
| Live mode shows my **personal** channel, not the brand channel | Wrong account picked at consent → revoke at myaccount.google.com/permissions, re-run the helper, pick the brand account on the chooser. |
| `PROVIDER_ERROR` from AI endpoints | Bad/missing key, no credit balance, or the model name is wrong — check `OPENAI_MODEL` / `ANTHROPIC_MODEL` / `GEMINI_MODEL`; CreatorDesk surfaces the upstream message. |
| 403 `quotaExceeded` from YouTube | 10,000-unit daily quota spent (rare at solo scale) — wait for midnight Pacific or request an increase. |
| 403 on thumbnail upload | Custom thumbnails require the channel to be **phone-verified** (YouTube Studio → Settings → Channel → Feature eligibility) — that's a YouTube rule, not CreatorDesk. |
| `youtubeSignupRequired` | The Google account never had a YouTube channel — create one (or pick the right account). |
| Publish dialog works but fields "didn't change" | CreatorDesk only sends fields you filled in; empty fields are left untouched by design. |
| `npm test` suddenly can't find vitest | `node_modules` isn't persisted in this sandbox — re-run `npm install` in `creatordesk/`. |

---

## References

- [Google OAuth 2.0 for installed/loopback apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [YouTube Data API v3 docs](https://developers.google.com/youtube/v3/docs) · [thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set)
- [Refreshing access tokens](https://developers.google.com/identity/protocols/oauth2/native-app#refresh) (incl. Testing-mode expiry)
- [OpenAI API pricing](https://openai.com/api/pricing/) · [Anthropic billing FAQ](https://support.claude.com/en/articles/8325606-billing-faq) · [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [YouTube API quota/costs 2026](https://outlierkit.com/resources/youtube-api-pricing/) · [Testing-mode token expiry write-up](https://dev.to/ko-hi/googles-oauth-testing-mode-expires-refresh-tokens-in-7-days-publish-the-consent-screen-before-24hm)
