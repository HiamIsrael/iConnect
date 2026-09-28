#!/usr/bin/env node
/**
 * CreatorDesk helper: obtain a YouTube OAuth refresh token.
 *
 * Usage:
 *   YOUTUBE_CLIENT_ID=....apps.googleusercontent.com \
 *   YOUTUBE_CLIENT_SECRET=.... \
 *   npm run youtube-token
 *
 * Flow (Google "installed app" loopback redirect):
 *   1. starts a tiny local server on 127.0.0.1:53682,
 *   2. prints the Google consent URL (open it, pick your channel's account),
 *   3. captures the authorization code from the redirect,
 *   4. exchanges it for tokens and prints YOUTUBE_REFRESH_TOKEN=... ready to export.
 */
import http from 'node:http';

export const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
];

export const DEFAULT_PORT = 53682;

export function buildConsentUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // force Google to issue a refresh_token
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Parse `?code=...&state=...` (or `?error=...`) from a redirect URL. */
export function parseRedirect(url) {
  const q = new URL(url, 'http://127.0.0.1').searchParams;
  const out = {};
  if (q.get('code')) out.code = q.get('code');
  if (q.get('state')) out.state = q.get('state');
  if (q.get('error')) out.error = q.get('error');
  return out;
}

/** Exchange an authorization code for tokens. Returns { refreshToken, accessToken, expiresIn }. */
export async function exchangeCode({ clientId, clientSecret, redirectUri, code, fetchImpl = fetch }) {
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${data.error || res.status} ${data.error_description || ''}`.trim());
  }
  if (!data.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Re-run with prompt=consent (already set) and make sure you completed the consent screen fully.'
    );
  }
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

function respond(res, status, html) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const port = Number(process.env.YOUTUBE_OAUTH_PORT) || DEFAULT_PORT;
  if (!clientId || !clientSecret) {
    console.error('Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET first (see creatordesk/GO-LIVE.md).');
    process.exit(1);
  }

  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const state = Math.random().toString(36).slice(2);
  const consentUrl = buildConsentUrl({ clientId, redirectUri, state });

  const server = http.createServer(async (req, res) => {
    const parsed = parseRedirect(req.url || '/');
    if (!parsed.code && !parsed.error) {
      return respond(res, 200, '<h3>CreatorDesk OAuth helper</h3><p>Waiting for Google… use the consent link from the terminal.</p>');
    }
    if (parsed.error) {
      respond(res, 400, `<h3>Authorization failed</h3><p>${parsed.error}</p>`);
      console.error(`Authorization failed: ${parsed.error}`);
      return server.close(() => process.exit(1));
    }
    if (parsed.state !== state) {
      respond(res, 400, '<h3>State mismatch</h3><p>Please re-run the command.</p>');
      console.error('State mismatch — possible CSRF, aborting.');
      return server.close(() => process.exit(1));
    }
    try {
      const { refreshToken } = await exchangeCode({ clientId, clientSecret, redirectUri, code: parsed.code });
      respond(res, 200, '<h3>Success ✓</h3><p>Refresh token issued. You can close this tab and return to the terminal.</p>');
      console.log('\nSuccess! Add this to your environment:\n');
      console.log(`YOUTUBE_REFRESH_TOKEN=${refreshToken}\n`);
      console.log('Then run CreatorDesk with CREATORDESK_YOUTUBE=live (see GO-LIVE.md).');
      server.close(() => process.exit(0));
    } catch (err) {
      respond(res, 500, `<h3>Token exchange failed</h3><p>${err.message}</p>`);
      console.error(err.message);
      server.close(() => process.exit(1));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\n1) Open this URL in your browser and approve access:\n\n${consentUrl}\n`);
    console.log(`2) After approving you will be redirected to http://127.0.0.1:${port}/oauth2callback\n`);
    console.log('   (Sign in with the Google account that owns your YouTube channel — pick the brand\n');
    console.log('    account too if your channel lives under one.)\n');
  });
}

// Run only when invoked directly (tests import the exports above).
if (process.argv[1] && process.argv[1].endsWith('youtube-refresh-token.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
