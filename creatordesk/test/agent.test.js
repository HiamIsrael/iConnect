import { it, expect, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
process.env.CREATORDESK_DATA_DIR = dir;
process.env.NODE_ENV = 'test';
const { createApp } = await import('../server/app.js');
const { createMockProvider } = await import('../server/providers/youtube/mock.js');
const app = createApp();
const videoId = 'demo-home-studio-101';
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
it('rejects empty and oversized conversation inputs', async () => {
  await request(app).post('/api/agent/chat').send({ message: '' }).expect(400);
  await request(app)
    .post('/api/agent/chat')
    .send({ message: 'x'.repeat(4001) })
    .expect(400);
});
it('runs channel review without channel writes', async () => {
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Review my channel' })
    .expect(200);
  expect(r.body.result).toBeTruthy();
  expect(r.body.proposal).toBeUndefined();
});
it('prepares immutable metadata, requires confirmation and disallows repeat execution', async () => {
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Improve the title', videoId })
    .expect(200);
  const id = r.body.proposal.id;
  expect(r.body.proposal.preview.title).toBeTruthy();
  await request(app).post(`/api/agent/approve/${id}`).send({}).expect(400);
  const done = await request(app)
    .post(`/api/agent/approve/${id}`)
    .send({ confirm: true, title: 'injected' })
    .expect(200);
  expect(done.body.receipt.status).toBe('completed');
  const video = await request(app).get(`/api/videos/${videoId}`);
  expect(video.body.video.title).toBe(r.body.proposal.preview.title);
  await request(app).post(`/api/agent/approve/${id}`).send({ confirm: true }).expect(400);
});
it('asks for a timestamp rather than guessing a schedule', async () => {
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Schedule this', videoId })
    .expect(200);
  expect(r.body.proposal).toBeUndefined();
  expect(r.body.reply).toMatch(/date|time/i);
});
it('rejects past or ambiguous schedule dates', async () => {
  for (const publishAt of ['2020-01-01T10:00:00Z', 'tomorrow', '2099-01-01T10:00']) {
    await request(app)
      .post('/api/agent/chat')
      .send({ message: 'Schedule', videoId, publishAt })
      .expect(400);
  }
});
it('schedules only after explicit approval and records the receipt', async () => {
  const publishAt = '2099-01-01T10:00:00Z';
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Schedule', videoId, publishAt })
    .expect(200);
  expect(r.body.proposal.preview.publishAt).toBe(new Date(publishAt).toISOString());
  await request(app)
    .post(`/api/agent/approve/${r.body.proposal.id}`)
    .send({ confirm: true })
    .expect(200);
  const activity = await request(app).get('/api/agent/activity').expect(200);
  expect(activity.body.receipts.some((r) => r.action === 'schedule')).toBe(true);
});
it('rejects unknown model tools without executing', async () => {
  const app = createApp({
    ai: { id: 'test', complete: async () => ({ kind: 'deleteEverything' }) },
    accessToken: 'operator-test-token',
  });
  await request(app)
    .post('/api/agent/chat')
    .set('Authorization', 'Bearer operator-test-token')
    .send({ message: 'anything' })
    .expect(400);
});
it('protects live API access with an operator token', async () => {
  const yt = createMockProvider();
  yt.id = 'live';
  const app = createApp({ youtube: yt, accessToken: 'operator-test-token' });
  await request(app).get('/api/channel').expect(401);
  await request(app)
    .get('/api/channel')
    .set('Authorization', 'Bearer operator-test-token')
    .expect(200);
});
it('never retries a mutation with an uncertain outcome', async () => {
  const yt = createMockProvider();
  let attempts = 0;
  yt.scheduleVideo = async () => {
    attempts++;
    throw new Error('Network disconnected after submission');
  };
  const app = createApp({ youtube: yt });
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Schedule', videoId, publishAt: '2099-01-01T10:00:00Z' })
    .expect(200);
  await request(app)
    .post(`/api/agent/approve/${r.body.proposal.id}`)
    .send({ confirm: true })
    .expect(500);
  await request(app)
    .post(`/api/agent/approve/${r.body.proposal.id}`)
    .send({ confirm: true })
    .expect(400);
  expect(attempts).toBe(1);
});
it('prevents simultaneous approvals executing a proposal twice', async () => {
  const yt = createMockProvider();
  let attempts = 0;
  yt.scheduleVideo = async () => {
    attempts++;
    await new Promise((r) => setTimeout(r, 30));
  };
  const app = createApp({ youtube: yt });
  const r = await request(app)
    .post('/api/agent/chat')
    .send({ message: 'Schedule', videoId, publishAt: '2099-01-01T10:00:00Z' })
    .expect(200);
  const approve = () =>
    request(app).post(`/api/agent/approve/${r.body.proposal.id}`).send({ confirm: true });
  const results = await Promise.all([approve(), approve()]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  expect(attempts).toBe(1);
});
it('refuses live provider startup without an operator access token', () => {
  const yt = createMockProvider();
  yt.id = 'live';
  expect(() => createApp({ youtube: yt, accessToken: '' })).toThrow(/ACCESS_TOKEN/);
});
it('binds proposals to the channel that was reviewed', async () => {
  const yt = createMockProvider();
  const app = createApp({ youtube: yt });
  const r = await request(app).post('/api/agent/chat').send({ message: 'Improve title', videoId }).expect(200);
  yt.getChannel = async () => ({ id: 'different-channel' });
  const denied = await request(app).post(`/api/agent/approve/${r.body.proposal.id}`).send({ confirm: true }).expect(400);
  expect(denied.body.error.message).toMatch(/channel changed/);
});
