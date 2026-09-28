import { describe, expect, it, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-oauth-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { buildConsentUrl, parseRedirect, exchangeCode } = await import(
  '../scripts/youtube-refresh-token.mjs'
);

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('youtube refresh token helper', () => {
  const redirectUri = 'http://127.0.0.1:53682/oauth2callback';

  it('builds a consent URL with both scopes, offline access, forced consent, and state', () => {
    const url = buildConsentUrl({ clientId: 'cid-123', redirectUri, state: 'st-9' });
    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=cid-123');
    expect(url).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`);
    expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly'));
    expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/youtube.upload'));
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('state=st-9');
    expect(url).toContain('response_type=code');
  });

  it('parses a successful redirect and an error redirect', () => {
    expect(parseRedirect(`${redirectUri}?code=abc&state=st-9`)).toEqual({ code: 'abc', state: 'st-9' });
    const denied = parseRedirect(`${redirectUri}?error=access_denied&state=st-9`);
    expect(denied.error).toBe('access_denied');
  });

  it('exchanges the code and returns the refresh token', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'at', refresh_token: 'rt-42', expires_in: 3600 }),
      };
    };
    const out = await exchangeCode({
      clientId: 'cid', clientSecret: 'sec', redirectUri, code: 'the-code', fetchImpl,
    });
    expect(out.refreshToken).toBe('rt-42');
    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token');
    const params = new URLSearchParams(calls[0].init.body);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code')).toBe('the-code');
    expect(params.get('client_id')).toBe('cid');
    expect(params.get('client_secret')).toBe('sec');
    expect(params.get('redirect_uri')).toBe(redirectUri);
  });

  it('fails helpfully when Google omits a refresh token', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'at', expires_in: 3600 }),
    });
    await expect(
      exchangeCode({ clientId: 'c', clientSecret: 's', redirectUri, code: 'x', fetchImpl })
    ).rejects.toThrow(/refresh token/i);
  });

  it('fails helpfully on a rejected token exchange', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant', error_description: 'Bad code' }),
      text: async () => '{"error":"invalid_grant"}',
    });
    await expect(
      exchangeCode({ clientId: 'c', clientSecret: 's', redirectUri, code: 'x', fetchImpl })
    ).rejects.toThrow(/invalid_grant|token exchange failed/i);
  });
});
