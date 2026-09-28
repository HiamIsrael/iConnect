import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-yt-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { getYoutubeProvider } = await import('../server/providers/youtube/index.js');

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

function freshMock() {
  return getYoutubeProvider({ youtube: { provider: 'mock' } });
}

describe('youtube provider registry', () => {
  it('selects mock by default and exposes the documented surface', () => {
    const p = freshMock();
    expect(p.id).toBe('mock');
    for (const fn of ['getChannel', 'listVideos', 'getVideo', 'updateVideo', 'setThumbnail']) {
      expect(typeof p[fn]).toBe('function');
    }
  });

  it('throws a helpful error for unknown providers', () => {
    expect(() => getYoutubeProvider({ youtube: { provider: 'myspace' } })).toThrow(/unknown youtube provider/i);
  });
});

describe('youtube mock provider', () => {
  it('returns a demo channel and 5 deterministic videos with stats', async () => {
    const p = freshMock();
    const channel = await p.getChannel();
    expect(channel.id).toBeTruthy();
    expect(channel.title).toBeTruthy();
    expect(channel.stats.subscriberCount).toBeGreaterThan(0);

    const videos = await p.listVideos();
    expect(videos).toHaveLength(5);
    for (const v of videos) {
      expect(v.id).toBeTruthy();
      expect(v.title).toBeTruthy();
      expect(v.duration).toBeGreaterThan(0);
      expect(typeof v.stats.viewCount).toBe('number');
      expect(Array.isArray(v.tags)).toBe(true);
    }
    // newest first
    const dates = videos.map((v) => new Date(v.publishedAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('returns transcript segments on video detail', async () => {
    const p = freshMock();
    const videos = await p.listVideos();
    const detail = await p.getVideo(videos[0].id);
    expect(detail.transcript.segments.length).toBeGreaterThanOrEqual(5);
    for (const seg of detail.transcript.segments) {
      expect(typeof seg.start).toBe('number');
      expect(seg.text).toBeTruthy();
    }
  });

  it('throws a NotFound error for unknown video ids', async () => {
    const p = freshMock();
    await expect(p.getVideo('does-not-exist')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('records updateVideo mutations and reads them back', async () => {
    const p = freshMock();
    const videos = await p.listVideos();
    const id = videos[0].id;
    await p.updateVideo(id, { title: 'New Title', tags: ['a', 'b'] });
    const updated = await p.getVideo(id);
    expect(updated.title).toBe('New Title');
    expect(updated.tags).toEqual(['a', 'b']);
  });

  it('records setThumbnail mutations and refuses unknown ids', async () => {
    const p = freshMock();
    const videos = await p.listVideos();
    await p.setThumbnail(videos[1].id, 'data:image/png;base64,xyz');
    const updated = await p.getVideo(videos[1].id);
    expect(updated.thumbnailUrl).toContain('data:image/png');
    await expect(p.setThumbnail('nope', 'x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
