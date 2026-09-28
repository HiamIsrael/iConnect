import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-publish-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../server/app.js');
const { createStore } = await import('../server/store.js');

let app;
let videoId;
beforeAll(async () => {
  app = createApp();
  const res = await request(app).get('/api/videos');
  videoId = res.body.videos[0].id;
});
afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('publish', () => {
  it('refuses without explicit confirm and writes nothing', async () => {
    const before = await request(app).get(`/api/videos/${videoId}`).expect(200);
    const res = await request(app)
      .post(`/api/videos/${videoId}/publish`)
      .send({ title: 'Should Not Apply' })
      .expect(400);
    expect(res.body.error.code).toBe('NOT_CONFIRMED');
    const after = await request(app).get(`/api/videos/${videoId}`).expect(200);
    expect(after.body.video.title).toBe(before.body.video.title);
  });

  it('rejects an empty patch with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/publish`)
      .send({ confirm: true })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('publishes title/description/tags in mock mode and audits the write', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/publish`)
      .send({
        confirm: true,
        title: 'Published Title From CreatorDesk',
        description: 'A published description with chapters.',
        tags: ['tag-one', 'tag-two'],
      })
      .expect(200);
    expect(res.body.published).toBe(true);
    expect(res.body.mode).toBe('mock');
    expect(res.body.updated.sort()).toEqual(['description', 'tags', 'title']);

    const after = await request(app).get(`/api/videos/${videoId}`).expect(200);
    expect(after.body.video.title).toBe('Published Title From CreatorDesk');
    expect(after.body.video.tags).toEqual(['tag-one', 'tag-two']);

    const store = createStore(process.env.CREATORDESK_DATA_DIR);
    const log = await store.readPublishLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[log.length - 1].videoId).toBe(videoId);
    expect(log[log.length - 1].updated.sort()).toEqual(['description', 'tags', 'title']);
  });

  it('publishes a thumbnail image and records it', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/publish`)
      .send({ confirm: true, thumbnail: 'data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E' })
      .expect(200);
    expect(res.body.updated).toEqual(['thumbnail']);
    const after = await request(app).get(`/api/videos/${videoId}`).expect(200);
    expect(after.body.video.thumbnailUrl).toContain('data:image/svg+xml');
  });

  it('validates YouTube field limits', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/publish`)
      .send({ confirm: true, title: 'x'.repeat(101) })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404s unknown ids', async () => {
    const res = await request(app)
      .post('/api/videos/nope/publish')
      .send({ confirm: true, title: 'x' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
