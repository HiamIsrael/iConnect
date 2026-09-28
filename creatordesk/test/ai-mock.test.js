import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-ai-'));
process.env.CREATORDESK_DATA_DIR = path.join(testDir, 'data');
process.env.NODE_ENV = 'test';

const { getAiProvider } = await import('../server/providers/ai/index.js');
const mock = await import('../server/providers/ai/mock.js');

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

const TRANSCRIPT = [
  { start: 0, text: 'Welcome back! Today we are talking about home coffee roasting and why most people burn their first batch.' },
  { start: 42, text: 'First, green beans. Where to buy them, how to store them, and the three origin types worth knowing.' },
  { start: 130, text: 'Next, the roasting process itself: the first crack, the second crack, and how to stop at the right moment.' },
  { start: 260, text: 'Then we cover cooling, degassing, and why freshness changes everything about flavor.' },
  { start: 380, text: 'Finally, five common mistakes and my simple checklist for your first roast at home.' },
  { start: 470, text: 'If you follow this, your first cup will taste like a specialty cafe. Thanks for watching!' },
];

const CONTEXT = {
  video: {
    id: 'demo-1',
    title: 'Home Coffee Roasting for Beginners',
    description: 'Learn to roast coffee at home.',
    duration: 520,
    tags: ['coffee'],
    stats: { viewCount: 1200, likeCount: 90, commentCount: 12 },
  },
  transcript: TRANSCRIPT,
  tone: 'clear, energetic, specific',
  keywords: ['home coffee roasting'],
};

describe('ai provider registry', () => {
  it('selects mock by default and exposes the documented surface', () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    expect(provider.id).toBe('mock');
    expect(provider.supportsImages).toBe(true);
    expect(typeof provider.complete).toBe('function');
    expect(typeof provider.generateImage).toBe('function');
  });

  it('throws a helpful error for unknown providers', () => {
    expect(() => getAiProvider({ ai: { provider: 'nope' } })).toThrow(/unknown ai provider/i);
  });
});

describe('mock provider determinism', () => {
  it('produces byte-identical output for identical input', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    const a = await provider.complete('metadata', CONTEXT);
    const b = await provider.complete('metadata', CONTEXT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const ta = await provider.complete('thumbnails', CONTEXT);
    const tb = await provider.complete('thumbnails', CONTEXT);
    expect(JSON.stringify(ta)).toBe(JSON.stringify(tb));
    const aa = await provider.complete('analysis', CONTEXT);
    const ab = await provider.complete('analysis', CONTEXT);
    expect(JSON.stringify(aa)).toBe(JSON.stringify(ab));
  });

  it('rejects unknown tasks', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    await expect(provider.complete('fortune-telling', CONTEXT)).rejects.toThrow(/unknown task/i);
  });
});

describe('keyword extraction', () => {
  it('ranks by frequency with stopword filtering and first-mention tiebreak', () => {
    const kws = mock.extractKeywords(
      'Roasting coffee at home. Coffee roasting beats buying roasted coffee. Home roasting with fresh coffee is fun.',
      { limit: 5 }
    );
    expect(kws[0]).toBe('coffee'); // 4 mentions vs roasting 3
    expect(kws).toContain('roasting');
    expect(kws).not.toContain('the');
    expect(kws).not.toContain('is');
    // Equal counts → first mention wins
    const tied = mock.extractKeywords('zeta alpha zeta alpha', { limit: 2 });
    expect(tied).toEqual(['zeta', 'alpha']);
  });
});

describe('chapters', () => {
  it('builds 3-8 chapters, first at 0:00, formatted times', () => {
    const chapters = mock.buildChapters(TRANSCRIPT, { duration: 520 });
    expect(chapters.length).toBeGreaterThanOrEqual(3);
    expect(chapters.length).toBeLessThanOrEqual(8);
    expect(chapters[0].seconds).toBe(0);
    expect(chapters[0].time).toBe('0:00');
    for (const ch of chapters) {
      expect(ch.time).toMatch(/^\d+:\d{2}(:\d{2})?$/);
      expect(ch.label.length).toBeGreaterThan(0);
      expect(ch.label.length).toBeLessThanOrEqual(60);
    }
    const desc = mock.formatChapterBlock(chapters);
    expect(desc).toContain('0:00');
    for (const ch of chapters) expect(desc).toContain(ch.time);
  });

  it('returns empty for empty transcript', () => {
    expect(mock.buildChapters([], { duration: 100 })).toEqual([]);
    expect(mock.buildChapters(null)).toEqual([]);
  });
});

describe('mock metadata generation', () => {
  it('returns 5 titles ≤70 chars with rationale and score, plus description/tags/hashtags', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    const meta = await provider.complete('metadata', CONTEXT);
    expect(meta.titles).toHaveLength(5);
    for (const t of meta.titles) {
      expect(t.text.length).toBeLessThanOrEqual(70);
      expect(t.text.length).toBeGreaterThan(0);
      expect(typeof t.rationale).toBe('string');
      expect(t.score).toBeGreaterThan(0);
      expect(t.score).toBeLessThanOrEqual(1);
    }
    expect(meta.chapters.length).toBeGreaterThanOrEqual(3);
    expect(meta.description).toContain('0:00');
    expect(meta.tags.length).toBeGreaterThanOrEqual(10);
    expect(meta.tags.length).toBeLessThanOrEqual(20);
    expect(meta.hashtags.length).toBeGreaterThanOrEqual(3);
    expect(meta.hashtags.length).toBeLessThanOrEqual(5);
    expect(meta.hashtags.every((h) => h.startsWith('#'))).toBe(true);
  });
});

describe('mock thumbnails', () => {
  it('returns 3 briefs, 3 prompts, and deterministic SVG images', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    const out = await provider.complete('thumbnails', CONTEXT);
    expect(out.briefs).toHaveLength(3);
    for (const b of out.briefs) {
      for (const key of ['concept', 'hookText', 'layout', 'colors', 'composition', 'mood']) {
        expect(b[key]).toBeTruthy();
      }
    }
    expect(out.prompts).toHaveLength(3);
    expect(out.prompts[0].prompt.length).toBeGreaterThan(40);
    expect(out.images).toHaveLength(3);
    expect(out.images[0].dataUrl.startsWith('data:image/svg+xml')).toBe(true);
    const again = await provider.complete('thumbnails', CONTEXT);
    expect(again.images[0].dataUrl).toBe(out.images[0].dataUrl);
  });
});

describe('mock analysis', () => {
  it('returns summary, strengths, weaknesses, improvements, seo checks, retention notes', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    const out = await provider.complete('analysis', CONTEXT);
    expect(out.summary.split('.').length).toBeGreaterThanOrEqual(3); // 2+ sentences
    expect(out.strengths.length).toBeGreaterThanOrEqual(3);
    expect(out.weaknesses.length).toBeGreaterThanOrEqual(1);
    expect(out.improvements.length).toBeGreaterThanOrEqual(3);
    for (const imp of out.improvements) {
      expect(imp.area).toBeTruthy();
      expect(imp.suggestion).toBeTruthy();
      expect(['high', 'medium', 'low']).toContain(imp.impact);
      expect(['small', 'medium', 'large']).toContain(imp.effort);
    }
    expect(out.seo.score).toBeGreaterThanOrEqual(0);
    expect(out.seo.score).toBeLessThanOrEqual(100);
    expect(out.seo.checks.length).toBeGreaterThanOrEqual(5);
    for (const c of out.seo.checks) {
      expect(c.name).toBeTruthy();
      expect(typeof c.passed).toBe('boolean');
      expect(c.detail).toBeTruthy();
    }
    expect(out.retention.hook).toBeTruthy();
    expect(out.retention.structure).toBeTruthy();
    expect(out.retention.pacing).toBeTruthy();
  });
});

describe('mock channel insights', () => {
  it('returns overview, performance, whatWorks, opportunities, and a prioritized roadmap', async () => {
    const provider = getAiProvider({ ai: { provider: 'mock' } });
    const out = await provider.complete('insights', {
      channel: { id: 'demo', title: 'CreatorDesk Demo', stats: { subscriberCount: 5200, viewCount: 120000 } },
      videos: [
        { id: 'v1', title: 'Home Coffee Roasting for Beginners', publishedAt: '2026-09-01T10:00:00Z', duration: 520, stats: { viewCount: 5200, likeCount: 400, commentCount: 40 } },
        { id: 'v2', title: 'Espresso Dialing Guide', publishedAt: '2026-09-15T10:00:00Z', duration: 730, stats: { viewCount: 7300, likeCount: 610, commentCount: 61 } },
        { id: 'v3', title: 'Pour Over Mistakes', publishedAt: '2026-09-25T10:00:00Z', duration: 310, stats: { viewCount: 4100, likeCount: 300, commentCount: 22 } },
      ],
    });
    expect(out.overview).toBeTruthy();
    expect(out.performance.length).toBeGreaterThanOrEqual(3);
    expect(out.whatWorks.length).toBeGreaterThanOrEqual(2);
    expect(out.opportunities.length).toBeGreaterThanOrEqual(2);
    expect(out.roadmap.length).toBeGreaterThanOrEqual(3);
    const priorities = out.roadmap.map((r) => r.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    for (const r of out.roadmap) {
      expect(r.action).toBeTruthy();
      expect(r.why).toBeTruthy();
      expect(['small', 'medium', 'large']).toContain(r.effort);
    }
  });
});
