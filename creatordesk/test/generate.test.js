import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-meta-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../server/app.js');

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

describe('metadata generation', () => {
  it('generates titles, chapters, description, tags, hashtags for a video', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/metadata`)
      .send({ tone: 'clear, energetic', keywords: ['home studio'] })
      .expect(200);
    const meta = res.body;
    expect(meta.titles).toHaveLength(5);
    for (const t of meta.titles) {
      expect(t.text.length).toBeLessThanOrEqual(70);
      expect(t.rationale).toBeTruthy();
      expect(t.score).toBeGreaterThan(0);
    }
    expect(meta.chapters.length).toBeGreaterThanOrEqual(3);
    expect(meta.chapters[0]).toMatchObject({ time: '0:00', seconds: 0 });
    expect(meta.tags.length).toBeGreaterThanOrEqual(10);
    expect(meta.hashtags.every((h) => h.startsWith('#'))).toBe(true);
  });

  it('chapter times in the description match the structured chapters[]', async () => {
    const res = await request(app).post(`/api/videos/${videoId}/metadata`).send({}).expect(200);
    expect(res.body.description).toContain('0:00');
    for (const ch of res.body.chapters) {
      expect(res.body.description).toContain(`${ch.time} ${ch.label}`);
    }
  });

  it('rejects invalid body with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/metadata`)
      .send({ tone: 42, keywords: 'not-an-array' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('404s unknown video ids', async () => {
    const res = await request(app).post('/api/videos/nope/metadata').send({}).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('thumbnail generation', () => {
  it('generates 3 briefs, 3 prompts and SVG images in mock mode', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/thumbnails`)
      .send({ notes: 'bold and punchy' })
      .expect(200);
    expect(res.body.briefs).toHaveLength(3);
    expect(res.body.prompts).toHaveLength(3);
    expect(res.body.images).toHaveLength(3);
    expect(res.body.images[0].dataUrl.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('caps variants when requested', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/thumbnails`)
      .send({ variants: 1 })
      .expect(200);
    expect(res.body.briefs).toHaveLength(1);
    expect(res.body.prompts).toHaveLength(1);
    expect(res.body.images).toHaveLength(1);
  });

  it('rejects invalid variants with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(`/api/videos/${videoId}/thumbnails`)
      .send({ variants: 99 })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('video analysis', () => {
  it('generates summary, strengths, weaknesses, improvements, seo, retention', async () => {
    const res = await request(app).post(`/api/videos/${videoId}/analyze`).send({}).expect(200);
    expect(res.body.summary).toBeTruthy();
    expect(res.body.strengths.length).toBeGreaterThanOrEqual(3);
    expect(res.body.improvements.length).toBeGreaterThanOrEqual(3);
    expect(res.body.seo.score).toBeGreaterThanOrEqual(0);
    expect(res.body.seo.checks.length).toBeGreaterThanOrEqual(5);
    expect(res.body.retention.hook).toBeTruthy();
  });
});

describe('channel insights', () => {
  it('generates overview, performance, whatWorks, opportunities, roadmap', async () => {
    const res = await request(app).get('/api/channel/insights').expect(200);
    expect(res.body.overview.channel).toBeTruthy();
    expect(res.body.performance.length).toBeGreaterThanOrEqual(3);
    expect(res.body.whatWorks.length).toBeGreaterThanOrEqual(2);
    expect(res.body.opportunities.length).toBeGreaterThanOrEqual(2);
    expect(res.body.roadmap.length).toBeGreaterThanOrEqual(3);
    const priorities = res.body.roadmap.map((r) => r.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });
});
