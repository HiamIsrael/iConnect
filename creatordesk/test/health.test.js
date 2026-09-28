import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Isolated temp data dir for the test run (repo convention).
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordesk-test-'));
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

describe('health', () => {
  it('reports status without leaking secrets', async () => {
    process.env.OPENAI_API_KEY = 'sk-should-not-appear';
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.name).toBe('creatordesk');
    expect(typeof res.body.version).toBe('string');
    expect(res.body.youtube).toBe('mock');
    expect(res.body.ai.provider).toBe('mock');
    expect(res.body.ai.supportsImages).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('sk-should-not-appear');
    delete process.env.OPENAI_API_KEY;
  });

  it('returns structured errors for unknown API routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(typeof res.body.error.message).toBe('string');
  });
});
