import { describe, expect, it, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-adapters-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { getAiProvider } = await import('../server/providers/ai/index.js');
const { getYoutubeProvider } = await import('../server/providers/youtube/index.js');
const { parseModelJson } = await import('../server/providers/ai/prompts.js');
const { parseIsoDuration } = await import('../server/providers/youtube/live.js');

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

// ---- fetch stubbing (zero network in CI) ----
function stubFetch(handlers) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const [match, handler] of handlers) {
      if (String(url).includes(match)) {
        const r = handler(init, calls) || {};
        return {
          ok: (r.status ?? 200) < 400,
          status: r.status ?? 200,
          json: async () => r.body || {},
          text: async () => JSON.stringify(r.body || {}),
        };
      }
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '{}' };
  };
  fn.calls = calls;
  return fn;
}

const JSON_RESULT = { titles: [{ text: 'T', rationale: 'R', score: 0.9 }] };

describe('prompt parsing', () => {
  it('parses plain JSON and fenced JSON, rejects garbage', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('Here you go: {"a":1} hope that helps')).toEqual({ a: 1 });
    expect(() => parseModelJson('not json')).toThrow(/malformed json/i);
  });
});

describe('openai adapter', () => {
  const cfg = { ai: { provider: 'openai', openaiKey: 'sk-test', openaiModel: 'gpt-test', openaiImageModel: 'img-test' } };

  it('requires an API key', () => {
    expect(() => getAiProvider({ ai: { provider: 'openai' } })).toThrow(/OPENAI_API_KEY/);
  });

  it('sends chat completions with auth and parses the JSON reply', async () => {
    const fetchImpl = stubFetch([
      ['/v1/chat/completions', () => ({ body: { choices: [{ message: { content: JSON.stringify(JSON_RESULT) } }] } })],
    ]);
    const p = getAiProvider(cfg, { fetchImpl });
    const out = await p.complete('metadata', { video: { id: 'v' } });
    expect(out).toEqual(JSON_RESULT);
    const call = fetchImpl.calls[0];
    expect(call.url).toContain('api.openai.com/v1/chat/completions');
    expect(call.init.headers.authorization).toBe('Bearer sk-test');
    const body = JSON.parse(call.init.body);
    expect(body.model).toBe('gpt-test');
    expect(body.messages[0].role).toBe('system');
  });

  it('maps API failures to PROVIDER_ERROR', async () => {
    const fetchImpl = stubFetch([['/v1/chat/completions', () => ({ status: 429, body: {} })]]);
    const p = getAiProvider(cfg, { fetchImpl });
    await expect(p.complete('metadata', {})).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
  });

  it('generates images as base64 data URLs', async () => {
    const fetchImpl = stubFetch([
      ['/v1/images/generations', () => ({ body: { data: [{ b64_json: 'aGVsbG8=' }] } })],
    ]);
    const p = getAiProvider(cfg, { fetchImpl });
    const img = await p.generateImage({ prompt: 'a thumbnail' });
    expect(img.dataUrl).toBe('data:image/png;base64,aGVsbG8=');
  });
});

describe('anthropic adapter', () => {
  const cfg = { ai: { provider: 'anthropic', anthropicKey: 'ant-test', anthropicModel: 'claude-test' } };

  it('sends messages with x-api-key and parses the reply', async () => {
    const fetchImpl = stubFetch([
      ['/v1/messages', () => ({ body: { content: [{ type: 'text', text: JSON.stringify(JSON_RESULT) }] } })],
    ]);
    const p = getAiProvider(cfg, { fetchImpl });
    expect(p.supportsImages).toBe(false);
    const out = await p.complete('analysis', {});
    expect(out).toEqual(JSON_RESULT);
    const call = fetchImpl.calls[0];
    expect(call.init.headers['x-api-key']).toBe('ant-test');
    expect(call.init.headers['anthropic-version']).toBeTruthy();
    expect(JSON.parse(call.init.body).model).toBe('claude-test');
  });

  it('refuses image generation with UNSUPPORTED', async () => {
    const p = getAiProvider(cfg, { fetchImpl: stubFetch([]) });
    await expect(p.generateImage({ prompt: 'x' })).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
});

describe('gemini adapter', () => {
  const cfg = { ai: { provider: 'gemini', geminiKey: 'g-test', geminiModel: 'gemini-test' } };

  it('sends generateContent and parses the reply', async () => {
    const fetchImpl = stubFetch([
      [':generateContent', () => ({ body: { candidates: [{ content: { parts: [{ text: JSON.stringify(JSON_RESULT) }] } }] } })],
    ]);
    const p = getAiProvider(cfg, { fetchImpl });
    const out = await p.complete('insights', {});
    expect(out).toEqual(JSON_RESULT);
    expect(fetchImpl.calls[0].url).toContain('gemini-test:generateContent?key=g-test');
  });

  it('extracts inline image data', async () => {
    const fetchImpl = stubFetch([
      ['image-generation', () => ({ body: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'YWJj' } }] } }] } })],
    ]);
    const p = getAiProvider(cfg, { fetchImpl });
    const img = await p.generateImage({ prompt: 'x' });
    expect(img.dataUrl).toBe('data:image/png;base64,YWJj');
  });
});

describe('youtube live adapter', () => {
  const cfg = {
    youtube: {
      provider: 'live',
      clientId: 'cid',
      clientSecret: 'sec',
      refreshToken: 'rt',
    },
  };

  it('requires OAuth credentials', () => {
    expect(() => getYoutubeProvider({ youtube: { provider: 'live' } })).toThrow(/YOUTUBE_CLIENT_ID/);
  });

  it('refreshes the token, lists channel + videos, and parses durations', async () => {
    const fetchImpl = stubFetch([
      ['oauth2.googleapis.com/token', () => ({ body: { access_token: 'at-1', expires_in: 3600 } })],
      ['/channels?', () => ({ body: { items: [{
        id: 'UC1', snippet: { title: 'My Chan', description: 'd', thumbnails: { medium: { url: 'http://x/t.png' } } },
        statistics: { subscriberCount: '10', viewCount: '20', videoCount: '2' },
        contentDetails: { relatedPlaylists: { uploads: 'UU1' } },
      }] } })],
      ['/playlistItems?', () => ({ body: { items: [
        { contentDetails: { videoId: 'v2' } }, { contentDetails: { videoId: 'v1' } },
      ] } })],
      ['/videos?', (init) => {
        if (init.method === 'PUT') return { body: { id: 'v1' } };
        return { body: { items: [
          { id: 'v2', snippet: { title: 'Newer', description: '', publishedAt: '2026-09-20T00:00:00Z', tags: ['t'] }, statistics: { viewCount: '5' }, contentDetails: { duration: 'PT12M32S' } },
          { id: 'v1', snippet: { title: 'Older', description: '', publishedAt: '2026-09-01T00:00:00Z', tags: [] }, statistics: { viewCount: '1' }, contentDetails: { duration: 'PT1H2M3S' } },
        ] } };
      }],
    ]);
    const p = getYoutubeProvider(cfg, { fetchImpl });

    const channel = await p.getChannel();
    expect(channel.title).toBe('My Chan');
    expect(channel.stats.subscriberCount).toBe(10);

    const videos = await p.listVideos();
    expect(videos.map((v) => v.id)).toEqual(['v2', 'v1']);
    expect(videos[0].duration).toBe(752); // PT12M32S
    expect(videos[1].duration).toBe(3723); // PT1H2M3S

    // auth header on every API call after token refresh
    const apiCalls = fetchImpl.calls.filter((c) => c.url.includes('googleapis.com/youtube'));
    expect(apiCalls.every((c) => c.init.headers.authorization === 'Bearer at-1')).toBe(true);
  });

  it('merges snippet updates in updateVideo PUT', async () => {
    const fetchImpl = stubFetch([
      ['oauth2.googleapis.com/token', () => ({ body: { access_token: 'at-1', expires_in: 3600 } })],
      ['/videos?', (init) => {
        if (init.method === 'PUT') return { body: { id: 'v1' } };
        return { body: { items: [{ id: 'v1', snippet: { title: 'Old', description: 'D', publishedAt: 'p', tags: ['a'] }, statistics: {}, contentDetails: {} }] } };
      }],
    ]);
    const p = getYoutubeProvider(cfg, { fetchImpl });
    await p.updateVideo('v1', { title: 'New' });
    const put = fetchImpl.calls.find((c) => c.init.method === 'PUT');
    expect(put).toBeTruthy();
    const body = JSON.parse(put.init.body);
    expect(body.snippet.title).toBe('New');
    expect(body.snippet.description).toBe('D'); // untouched fields preserved
  });

  it('maps empty video lookups to NOT_FOUND and uploads thumbnails as multipart', async () => {
    const fetchImpl = stubFetch([
      ['oauth2.googleapis.com/token', () => ({ body: { access_token: 'at-1', expires_in: 3600 } })],
      ['/videos?', () => ({ body: { items: [] } })],
      ['/upload/youtube/v3/thumbnails/set', () => ({ body: {} })],
    ]);
    const p = getYoutubeProvider(cfg, { fetchImpl });
    await expect(p.getVideo('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // setThumbnail: stub getVideo after upload returns empty → returns { id }
    const res = await p.setThumbnail('v9', 'data:image/png;base64,aGVsbG8=');
    expect(res.id).toBe('v9');
    const upload = fetchImpl.calls.find((c) => c.url.includes('/upload/youtube/v3/thumbnails/set'));
    expect(upload.init.method).toBe('POST');
    expect(upload.init.headers['content-type']).toContain('multipart/form-data');
    expect(Buffer.isBuffer(upload.init.body) || upload.init.body.length > 0).toBe(true);
  });
});

describe('duration parsing', () => {
  it('parses ISO-8601 durations', () => {
    expect(parseIsoDuration('PT30S')).toBe(30);
    expect(parseIsoDuration('PT5M')).toBe(300);
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('garbage')).toBe(0);
  });
});
