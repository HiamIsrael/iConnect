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

  it('lets musicians manage availability and demos', async () => {
    const musician = tokenOf(await login('ayo@example.com'));

    const start = new Date(Date.now() + 3 * 86400000).toISOString();
    const end = new Date(Date.now() + 3 * 86400000 + 4 * 3600000).toISOString();
    const avail = await request(app)
      .post('/api/musicians/u_ayo/availability')
      .set('Authorization', `Bearer ${musician}`)
      .send({ title: 'Festival slots', startAt: start, endAt: end, status: 'available' });
    expect(avail.status).toBe(201);

    const list = await request(app).get('/api/musicians/u_ayo/availability');
    expect(list.body.availability.length).toBe(1);

    const demo = await request(app)
      .post('/api/musicians/u_ayo/demos')
      .set('Authorization', `Bearer ${musician}`)
      .send({ type: 'audio', title: 'Live solo', url: '/uploads/demo.mp3' });
    expect(demo.status).toBe(201);

    const demos = await request(app).get('/api/musicians/u_ayo/demos');
    expect(demos.body.demos.length).toBe(1);
  });

  it('allows reports and admin moderation including blocking users', async () => {
    const reporter = tokenOf(await login('grace@example.com'));
    const admin = tokenOf(await login('admin@example.com'));

    const report = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporter}`)
      .send({ targetType: 'user', targetId: 'u_tunde', reason: 'Fake profile', details: 'Test report' });
    expect(report.status).toBe(201);

    const reports = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${admin}`);
    expect(reports.body.reports.length).toBe(1);

    const resolve = await request(app)
      .put(`/api/admin/reports/${report.body.report.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'resolved' });
    expect(resolve.body.report.status).toBe('resolved');

    const block = await request(app).post('/api/admin/users/u_tunde/block').set('Authorization', `Bearer ${admin}`);
    expect(block.body.user.blocked).toBe(true);

    const blockedLogin = await login('tunde@example.com');
    expect(blockedLogin.status).toBe(403);

    const unblock = await request(app).post('/api/admin/users/u_tunde/unblock').set('Authorization', `Bearer ${admin}`);
    expect(unblock.body.user.blocked).toBe(false);
  });

  it('captures booking terms and deposit on a new gig', async () => {
    const organizer = tokenOf(await login('chidi@example.com'));
    const created = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${organizer}`)
      .send({
        title: 'Deposit Gig',
        venue: 'Test Hall',
        location: 'Lagos',
        date: '2026-12-20',
        fee: { amount: 100000, currency: 'NGN' },
        contractTerms: '4-hour set',
        cancellationPolicy: '50% refund within 7 days',
        depositPercent: 25,
      });
    expect(created.status).toBe(201);
    expect(created.body.gig.contractTerms).toBe('4-hour set');
    expect(created.body.gig.depositPercent).toBe(25);
  });

  it('lets musicians and members interact through the community feed', async () => {
    const ayo = tokenOf(await login('ayo@example.com'));
    const grace = tokenOf(await login('grace@example.com'));

    // Seeded feed is populated.
    const feed = await request(app).get('/api/community/posts');
    expect(feed.body.posts.length).toBeGreaterThanOrEqual(3);

    // Create a recruit post and like/comment on it.
    const recruit = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${ayo}`)
      .send({ type: 'recruit', title: 'Need a drummer', body: 'Lagos jazz trios seeks a drummer for March dates.', topic: 'Band members', genre: 'Jazz', instrument: 'Drums' });
    expect(recruit.status).toBe(201);

    const postId = recruit.body.post.id;
    const like = await request(app).post(`/api/community/posts/${postId}/like`).set('Authorization', `Bearer ${grace}`);
    expect(like.body.liked).toBe(true);

    const comment = await request(app).post(`/api/community/posts/${postId}/comments`).set('Authorization', `Bearer ${grace}`).send({ body: 'I know a great drummer!' });
    expect(comment.status).toBe(201);

    const detail = await request(app).get(`/api/community/posts/${postId}`);
    expect(detail.body.post.likeCount).toBe(1);
    expect(detail.body.comments.length).toBe(1);
  });

  it('lets users create bands, join, follow, and verify follow feed', async () => {
    const ayo = tokenOf(await login('ayo@example.com'));
    const grace = tokenOf(await login('grace@example.com'));
    const admin = tokenOf(await login('admin@example.com'));

    const created = await request(app)
      .post('/api/bands')
      .set('Authorization', `Bearer ${ayo}`)
      .send({ name: 'Ayo Trio', genre: 'Jazz', location: 'Lagos', description: 'A new project.' });
    expect(created.status).toBe(201);
    const bandId = created.body.band.id;

    const join = await request(app).post(`/api/bands/${bandId}/join`).set('Authorization', `Bearer ${grace}`);
    expect(join.status).toBe(201);

    // Owner accepts Grace.
    const accept = await request(app).post(`/api/bands/${bandId}/members/u_grace/accept`).set('Authorization', `Bearer ${ayo}`);
    expect(accept.status).toBe(200);

    const detail = await request(app).get(`/api/bands/${bandId}`);
    expect(detail.body.band.memberCount).toBe(2);

    // Follow the band, then post as the band and check follow feed only includes band post.
    const follow = await request(app).post(`/api/follows/band/${bandId}`).set('Authorization', `Bearer ${admin}`);
    expect(follow.body.following).toBe(true);

    const bandPost = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${ayo}`)
      .send({ bandId, body: 'First band update!' });
    expect(bandPost.status).toBe(201);

    const feed = await request(app).get('/api/community/posts?following=true').set('Authorization', `Bearer ${admin}`);
    expect(feed.body.posts.some((p) => p.bandId === bandId)).toBe(true);
  });

  it('exposes venues, EPK and calendar endpoints', async () => {
    const venues = await request(app).get('/api/venues');
    expect(venues.body.venues.length).toBeGreaterThanOrEqual(3);

    const venueDetail = await request(app).get('/api/venues/v_jazz_house');
    expect(venueDetail.body.venue.name).toBe('The Jazz House');
    expect(venueDetail.body.gigs.length).toBeGreaterThanOrEqual(1);

    const epk = await request(app).get('/api/musicians/u_ayo/epk');
    expect(epk.status).toBe(200);
    expect(epk.body.epk.name).toBe('Ayo Adeyemi');
    expect(epk.body.text).toContain('ELECTRONIC PRESS KIT');

    const ics = await request(app).get('/api/gigs/g_sunset_jazz/calendar.ics');
    expect(ics.status).toBe(200);
    expect(ics.headers['content-type']).toContain('text/calendar');
    expect(ics.text).toContain('BEGIN:VCALENDAR');
    expect(ics.text).toContain('Sunset Jazz Night');
  });

  it('lets organizers create venues and attach gigs', async () => {
    const organizer = tokenOf(await login('chidi@example.com'));

    const venue = await request(app)
      .post('/api/venues')
      .set('Authorization', `Bearer ${organizer}`)
      .send({ name: 'Rooftop Stage', location: 'Lagos, Nigeria', type: 'Rooftop', capacity: 120 });
    expect(venue.status).toBe(201);
    const venueId = venue.body.venue.id;

    const gig = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${organizer}`)
      .send({ title: 'Rooftop Jazz Night', venueId, location: 'Lagos, Nigeria', date: '2026-11-01', fee: { amount: 50000, currency: 'NGN' } });
    expect(gig.status).toBe(201);
    expect(gig.body.gig.venueId).toBe(venueId);
    expect(gig.body.gig.venue).toBe('Rooftop Stage');

    const detail = await request(app).get(`/api/venues/${venueId}`);
    expect(detail.body.gigs.some((g) => g.title === 'Rooftop Jazz Night')).toBe(true);
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
