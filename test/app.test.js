import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

// Use an isolated temporary SQLite database for the test run.
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iconnect-test-'));
process.env.ICONNECT_DB_FILE = path.join(testDir, 'test.sqlite');
process.env.NODE_ENV = 'test';

const { initDb, resetDbForTests } = await import('../server/store.js');
const { createApp } = await import('../server/app.js');

let app;
let axios = request;

function tokenOf(res) {
  return res.body?.token;
}

async function login(email, password = 'password123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

beforeAll(async () => {
  await initDb();
  app = createApp();
});

beforeEach(async () => {
  await resetDbForTests();
});

afterAll(async () => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('iConnect API', () => {
  it('reports health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.storage).toBe('sqlite');
  });

  it('seeds musicians and gigs', async () => {
    const musicians = await request(app).get('/api/musicians');
    expect(musicians.body.musicians.length).toBeGreaterThanOrEqual(4);
    const gigs = await request(app).get('/api/gigs');
    expect(gigs.body.gigs.length).toBeGreaterThanOrEqual(7);
  });

  it('logs in seeded users and rejects bad credentials', async () => {
    const ok = await login('ayo@example.com');
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe('Ayo Adeyemi');
    expect(ok.body.token).toBeTruthy();

    const bad = await login('ayo@example.com', 'wrong');
    expect(bad.status).toBe(401);
  });

  it('signs up and prevents duplicate emails', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test Artist', email: 'new@example.com', password: 'password123', role: 'musician',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();

    const dup = await request(app).post('/api/auth/signup').send({
      name: 'Test Artist', email: 'new@example.com', password: 'password123', role: 'musician',
    });
    expect(dup.status).toBe(409);
  });

  it('enforces role-based access (organizer cannot apply)', async () => {
    const org = tokenOf(await login('chidi@example.com'));
    const gig = (await request(app).get('/api/gigs')).body.gigs[0];
    const res = await request(app)
      .post(`/api/gigs/${gig.id}/apply`)
      .set('Authorization', `Bearer ${org}`)
      .send({ note: 'nope' });
    expect(res.status).toBe(403);
  });

  it('runs a full booking, review and payment flow', async () => {
    const musician = tokenOf(await login('grace@example.com'));
    const organizer = tokenOf(await login('chidi@example.com'));

    // Look for an existing open gig that Grace has not applied to.
    const gigs = (await request(app).get('/api/gigs')).body.gigs;
    // Use a gig hosted by Chidi (the organizer under test) that Grace hasn't applied to.
    const gig = gigs.find((g) => g.status === 'open' && g.hostId === 'u_chidi');

    const apply = await request(app)
      .post(`/api/gigs/${gig.id}/apply`)
      .set('Authorization', `Bearer ${musician}`)
      .send({ note: 'Excited to perform!', phone: '+234 800 000 0000' });
    expect(apply.status).toBe(201);

    // Organizer lists applications and accepts the one they manage.
    const apps = await request(app).get('/api/applications/my').set('Authorization', `Bearer ${organizer}`);
    expect(apps.status).toBe(200);

    const application = apps.body.applications.find((a) => a.musicianId === 'u_grace' && a.gigId === gig.id);
    expect(application).toBeTruthy();

    const accept = await request(app)
      .put(`/api/applications/${application.id}`)
      .set('Authorization', `Bearer ${organizer}`)
      .send({ status: 'accepted' });
    expect(accept.status).toBe(200);
    expect(accept.body.application.status).toBe('accepted');

    // Musician reviews the organizer.
    const review = await request(app)
      .post(`/api/applications/${application.id}/review`)
      .set('Authorization', `Bearer ${musician}`)
      .send({ rating: 5, comment: 'Great communication and a well-run gig.' });
    expect(review.status).toBe(201);

    // Duplicate review blocked.
    const dupReview = await request(app)
      .post(`/api/applications/${application.id}/review`)
      .set('Authorization', `Bearer ${musician}`)
      .send({ rating: 4 });
    expect(dupReview.status).toBe(409);

    // Review shows on organizer's profile (they are a user, though not musician).
    const publicReviews = await request(app).get(`/api/reviews/user/${gig.hostId}`);
    expect(publicReviews.body.count).toBe(1);

    // Checkout + confirm payment.
    const checkout = await request(app)
      .post(`/api/applications/${application.id}/checkout`)
      .set('Authorization', `Bearer ${musician}`);
    expect(checkout.status).toBe(201);
    const paymentId = checkout.body.payment.id;

    const confirm = await request(app)
      .post(`/api/payments/${paymentId}/confirm`)
      .set('Authorization', `Bearer ${musician}`);
    expect(confirm.status).toBe(200);
    expect(confirm.body.payment.status).toBe('paid');
  });

  it('lets users message each other', async () => {
    const musician = tokenOf(await login('ayo@example.com'));
    const organizer = tokenOf(await login('chidi@example.com'));

    const sent = await request(app)
      .post('/api/messages/with/u_chidi')
      .set('Authorization', `Bearer ${musician}`)
      .send({ body: 'Hi Chidi, excited about the Sunset Jazz Night!' });
    expect(sent.status).toBe(201);

    const threads = await request(app).get('/api/messages/threads').set('Authorization', `Bearer ${organizer}`);
    expect(threads.status).toBe(200);
    expect(threads.body.threads.length).toBe(1);
    expect(threads.body.threads[0].user.id).toBe('u_ayo');

    const thread = await request(app).get('/api/messages/with/u_ayo').set('Authorization', `Bearer ${organizer}`);
    expect(thread.body.messages.length).toBe(1);

    // Sender's unread count clears when the recipient opens the thread.
    const senderThreads = await request(app).get('/api/messages/threads').set('Authorization', `Bearer ${musician}`);
    expect(senderThreads.body.threads[0].unread).toBe(0);
  });

  it('supports password reset', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'ayo@example.com' });
    expect(forgot.status).toBe(200);
    expect(forgot.body.ok).toBe(true);
    expect(forgot.body.debugToken).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: forgot.body.debugToken,
      password: 'newpassword123',
    });
    expect(reset.status).toBe(200);

    const relogin = await request(app).post('/api/auth/login').send({ email: 'ayo@example.com', password: 'newpassword123' });
    expect(relogin.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'ayo@example.com', password: 'password123' });
    expect(oldLogin.status).toBe(401);
  });
});
