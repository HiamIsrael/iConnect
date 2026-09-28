import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-videos-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../server/app.js');

let app;
beforeAll(() => {
  app = createApp();
});
afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('channel', () => {
  it('returns the channel card with mode', async () => {
    const res = await request(app).get('/api/channel').expect(200);
    expect(res.body.channel.id).toBeTruthy();
    expect(res.body.channel.title).toBeTruthy();
    expect(res.body.channel.stats.subscriberCount).toBeGreaterThan(0);
    expect(res.body.mode).toBe('mock');
    expect(JSON.stringify(res.body)).not.toMatch(/clientSecret|refreshToken|apiKey/);
  });
});

describe('videos', () => {
  it('lists 5 videos newest first with stats and no transcripts', async () => {
    const res = await request(app).get('/api/videos').expect(200);
    expect(res.body.videos).toHaveLength(5);
    expect(res.body.videos[0].transcript).toBeUndefined();
    const dates = res.body.videos.map((v) => new Date(v.publishedAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('returns video detail with transcript segments', async () => {
    const list = await request(app).get('/api/videos').expect(200);
    const id = list.body.videos[0].id;
    const res = await request(app).get(`/api/videos/${id}`).expect(200);
    expect(res.body.video.id).toBe(id);
    expect(res.body.video.transcript.segments.length).toBeGreaterThanOrEqual(5);
  });

  it('404s unknown ids with the structured error shape', async () => {
    const res = await request(app).get('/api/videos/no-such-video').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('no-such-video');
  });
});
