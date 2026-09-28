import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-export-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { createApp } = await import('../server/app.js');

let app;
let videoId;
let videoTitle;
beforeAll(async () => {
  app = createApp();
  const res = await request(app).get('/api/videos');
  videoId = res.body.videos[0].id;
  videoTitle = res.body.videos[0].title;
});
afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('export', () => {
  it('returns a markdown + json bundle with all generated assets', async () => {
    const res = await request(app).get(`/api/videos/${videoId}/export`).expect(200);
    const { markdown, json } = res.body;
    expect(markdown).toContain(videoTitle);
    for (const section of ['Title options', 'Description', 'Chapters', 'Tags', 'Hashtags', 'Thumbnail briefs', 'Analysis']) {
      expect(markdown).toContain(section);
    }
    expect(markdown).toContain('0:00');
    expect(json.metadata.titles.length).toBe(5);
    expect(json.thumbnails.briefs.length).toBe(3);
    expect(json.analysis.seo.score).toBeGreaterThanOrEqual(0);
  });

  it('404s unknown ids', async () => {
    const res = await request(app).get('/api/videos/nope/export').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
