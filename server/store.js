import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import knex from 'knex';
import { seedData } from './seed.js';
import { config } from './config.js';

const MIGRATIONS_DIR = path.join(config.root, 'server', 'migrations');
const DATA_DIR = config.dataDir;
const MAX_FILE_SIZE_MB = 20;

export const uid = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export const db = knex(
  config.databaseUrl
    ? { client: 'pg', connection: config.databaseUrl }
    : {
        client: 'better-sqlite3',
        connection: { filename: config.sqliteFile },
        useNullAsDefault: true,
        pool: { min: 1, max: 1 },
      },
);

export function iso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseSocials(row) {
  if (!row.socials) return null;
  try {
    return JSON.parse(row.socials);
  } catch {
    return null;
  }
}

export async function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  if (db.client.config.client === 'better-sqlite3') {
    try {
      await db.raw('PRAGMA foreign_keys = ON');
    } catch {
      // ignore
    }
  }
  await db.migrate.latest({ directory: MIGRATIONS_DIR });
  await seedIfEmpty();
}

export async function resetDbForTests() {
  if (db.client.config.client !== 'better-sqlite3') {
    throw new Error('resetDbForTests only supports SQLite.');
  }
  await db.raw('PRAGMA foreign_keys = OFF');
  for (const table of [
    'notifications', 'payments', 'messages', 'reviews', 'password_reset_tokens',
    'reports', 'media_demos', 'availability_blocks', 'applications', 'gig_tags',
    'gigs', 'user_tags', 'user_instruments', 'users', 'post_comments', 'post_likes',
    'community_posts', 'follows', 'band_members', 'bands', 'venues',
  ]) {
    await db(table).del();
  }
  await db.raw('PRAGMA foreign_keys = ON');
  await seedIfEmpty();
}

export async function seedIfEmpty() {
  const row = await db('users').count({ count: '*' }).first();
  if (Number(row?.count) > 0) return;

  const data = seedData();
  const now = new Date().toISOString();

  for (const user of data.users) {
    await db('users').insert({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      password_hash: user.passwordHash,
      title: user.title || '',
      bio: user.bio || '',
      location: user.location || '',
      genre: user.genre || '',
      years_experience: user.yearsExperience || 0,
      availability: user.availability || 'open',
      rate_currency: user.rate?.currency || 'NGN',
      rate_amount: user.rate?.amount || 0,
      rate_unit: user.rate?.unit || 'per gig',
      role_label: user.roleLabel || '',
      created_at: iso(user.createdAt) || now,
      updated_at: now,
    });
    const instruments = (user.instruments || []).map((instrument) => ({ user_id: user.id, instrument }));
    const tags = (user.tags || []).map((tag) => ({ user_id: user.id, tag }));
    if (instruments.length) await db('user_instruments').insert(instruments);
    if (tags.length) await db('user_tags').insert(tags);
  }

  for (const venue of data.venues || []) {
    await db('venues').insert({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      type: venue.type || '',
      description: venue.description || '',
      location: venue.location,
      capacity: venue.capacity || 0,
      amenities: venue.amenities || '',
      photo_url: venue.photoUrl || null,
      website: venue.website || '',
      phone: venue.phone || '',
      contact_email: venue.contactEmail || '',
      owner_id: venue.ownerId,
      created_at: iso(venue.createdAt) || now,
      updated_at: iso(venue.updatedAt) || now,
    });
  }

  for (const gig of data.gigs) {
    await db('gigs').insert({
      id: gig.id,
      title: gig.title,
      description: gig.description || '',
      type: gig.type || 'Event',
      venue: gig.venue,
      venue_id: gig.venueId || null,
      location: gig.location,
      date: iso(gig.date),
      start_time: gig.startTime,
      end_time: gig.endTime,
      fee_currency: gig.fee?.currency || 'NGN',
      fee_amount: gig.fee?.amount || 0,
      capacity: gig.capacity || 1,
      status: gig.status || 'open',
      genre: gig.genre || '',
      requirements: gig.requirements || '',
      host_id: gig.hostId,
      host_name: gig.hostName,
      created_at: iso(gig.createdAt) || now,
      updated_at: iso(gig.updatedAt) || now,
    });
    const tags = (gig.tags || []).map((tag) => ({ gig_id: gig.id, tag }));
    if (tags.length) await db('gig_tags').insert(tags);
  }

  for (const app of data.applications) {
    await db('applications').insert({
      id: app.id,
      gig_id: app.gigId,
      musician_id: app.musicianId,
      musician_name: app.musicianName,
      email: app.email,
      phone: app.phone || '',
      note: app.note || '',
      status: app.status || 'pending',
      created_at: iso(app.createdAt) || now,
      updated_at: iso(app.updatedAt) || now,
    });
  }

  for (const band of data.bands || []) {
    await db('bands').insert({
      id: band.id,
      name: band.name,
      slug: band.slug,
      description: band.description || '',
      genre: band.genre || '',
      location: band.location || '',
      photo_url: band.photoUrl || null,
      owner_id: band.ownerId,
      created_at: iso(band.createdAt) || now,
      updated_at: iso(band.updatedAt) || now,
    });
  }
  for (const member of data.bandMembers || []) {
    await db('band_members').insert({
      id: member.id,
      band_id: member.bandId,
      user_id: member.userId,
      role: member.role || 'member',
      status: member.status || 'active',
      joined_at: iso(member.joinedAt) || now,
    });
  }
  for (const follow of data.follows || []) {
    await db('follows').insert({
      id: follow.id,
      follower_id: follow.followerId,
      target_type: follow.targetType,
      target_id: follow.targetId,
      created_at: iso(follow.createdAt) || now,
    });
  }
  for (const post of data.communityPosts || []) {
    await db('community_posts').insert({
      id: post.id,
      author_id: post.authorId,
      band_id: post.bandId || null,
      type: post.type || 'post',
      title: post.title || '',
      body: post.body,
      link: post.link || '',
      topic: post.topic || '',
      genre: post.genre || '',
      location: post.location || '',
      instrument: post.instrument || '',
      created_at: iso(post.createdAt) || now,
      updated_at: iso(post.updatedAt) || now,
    });
  }
  for (const like of data.postLikes || []) {
    await db('post_likes').insert({ id: like.id, post_id: like.postId, user_id: like.userId, created_at: iso(like.createdAt) || now });
  }
  for (const comment of data.postComments || []) {
    await db('post_comments').insert({
      id: comment.id,
      post_id: comment.postId,
      author_id: comment.authorId,
      body: comment.body,
      created_at: iso(comment.createdAt) || now,
    });
  }

}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------
export async function getUserById(id) {
  const row = await db('users').where({ id }).first();
  if (!row) return null;
  const [instruments, tags] = await Promise.all([
    db('user_instruments').where({ user_id: id }).pluck('instrument'),
    db('user_tags').where({ user_id: id }).pluck('tag'),
  ]);
  return mapUser(row, instruments, tags);
}

export async function getUserByEmail(email) {
  const row = await db('users').where({ email }).first();
  if (!row) return null;
  const [instruments, tags] = await Promise.all([
    db('user_instruments').where({ user_id: row.id }).pluck('instrument'),
    db('user_tags').where({ user_id: row.id }).pluck('tag'),
  ]);
  return mapUser(row, instruments, tags);
}

export function mapUser(row, instruments = [], tags = []) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    title: row.title || '',
    bio: row.bio || '',
    location: row.location || '',
    genre: row.genre || '',
    yearsExperience: row.years_experience || 0,
    availability: row.availability || 'open',
    rate: {
      currency: row.rate_currency || 'NGN',
      amount: row.rate_amount || 0,
      unit: row.rate_unit || 'per gig',
    },
    roleLabel: row.role_label || '',
    photoUrl: row.photo_url || null,
    epkUrl: row.epk_url || null,
    socials: parseSocials(row),
    blocked: Boolean(row.is_blocked),
    instruments,
    tags,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function createUser(data) {
  const id = data.id || uid('u');
  await db('users').insert({
    id,
    role: data.role || 'musician',
    name: data.name,
    email: data.email,
    password_hash: data.passwordHash,
    title: data.title || '',
    bio: data.bio || '',
    location: data.location || '',
    genre: data.genre || '',
    years_experience: data.yearsExperience || 0,
    availability: data.availability || 'open',
    rate_currency: data.rate?.currency || 'NGN',
    rate_amount: data.rate?.amount || 0,
    rate_unit: data.rate?.unit || 'per gig',
    role_label: data.roleLabel || '',
    photo_url: data.photoUrl || null,
    epk_url: data.epkUrl || null,
    socials: data.socials ? JSON.stringify(data.socials) : null,
    is_blocked: data.isBlocked ? true : false,
  });
  const instruments = (data.instruments || []).map((instrument) => ({ user_id: id, instrument }));
  const tags = (data.tags || []).map((tag) => ({ user_id: id, tag }));
  if (instruments.length) await db('user_instruments').insert(instruments);
  if (tags.length) await db('user_tags').insert(tags);
  return getUserById(id);
}

export async function updateUser(id, patch) {
  const row = await db('users').where({ id }).first();
  if (!row) return null;

  const base = {};
  if (patch.name !== undefined) base.name = patch.name;
  if (patch.title !== undefined) base.title = patch.title;
  if (patch.bio !== undefined) base.bio = patch.bio;
  if (patch.location !== undefined) base.location = patch.location;
  if (patch.genre !== undefined) base.genre = patch.genre;
  if (patch.yearsExperience !== undefined) base.years_experience = patch.yearsExperience;
  if (patch.availability !== undefined) base.availability = patch.availability;
  if (patch.roleLabel !== undefined) base.role_label = patch.roleLabel;
  if (patch.photoUrl !== undefined) base.photo_url = patch.photoUrl;
  if (patch.epkUrl !== undefined) base.epk_url = patch.epkUrl;
  if (patch.socials !== undefined) base.socials = patch.socials ? JSON.stringify(patch.socials) : null;
  if (patch.isBlocked !== undefined) base.is_blocked = patch.isBlocked ? true : false;
  if (patch.passwordHash !== undefined) base.password_hash = patch.passwordHash;
  if (patch.rate) {
    base.rate_currency = patch.rate.currency || 'NGN';
    base.rate_amount = Number(patch.rate.amount) || 0;
    base.rate_unit = patch.rate.unit || 'per gig';
  }
  base.updated_at = new Date().toISOString();
  if (Object.keys(base).length) await db('users').where({ id }).update(base);

  if (patch.instruments !== undefined) {
    await db('user_instruments').where({ user_id: id }).del();
    const rows = patch.instruments.map((instrument) => ({ user_id: id, instrument }));
    if (rows.length) await db('user_instruments').insert(rows);
  }
  if (patch.tags !== undefined) {
    await db('user_tags').where({ user_id: id }).del();
    const rows = patch.tags.map((tag) => ({ user_id: id, tag }));
    if (rows.length) await db('user_tags').insert(rows);
  }
  return getUserById(id);
}

export async function updatePassword(id, passwordHash) {
  await db('users').where({ id }).update({ password_hash: passwordHash, updated_at: new Date().toISOString() });
}

export async function listMusicians(filters = {}) {
  const { q, genre, location, instrument, availability } = filters;
  const query = String(q || '').trim().toLowerCase();
  const genreQuery = String(genre || '').trim().toLowerCase();
  const locationQuery = String(location || '').trim().toLowerCase();
  const instrumentQuery = String(instrument || '').trim().toLowerCase();
  const availabilityQuery = String(availability || '').trim().toLowerCase();

  let rows = await db('users')
    .where({ role: 'musician' })
    .orderBy('created_at', 'desc');

  if (genreQuery) rows = rows.filter((r) => String(r.genre || '').toLowerCase().includes(genreQuery));
  if (locationQuery) rows = rows.filter((r) => String(r.location || '').toLowerCase().includes(locationQuery));
  if (availabilityQuery) rows = rows.filter((r) => String(r.availability || '') === availabilityQuery);

  const musicians = [];
  for (const row of rows) {
    const [instruments, tags] = await Promise.all([
      db('user_instruments').where({ user_id: row.id }).pluck('instrument'),
      db('user_tags').where({ user_id: row.id }).pluck('tag'),
    ]);
    musicians.push(mapUser(row, instruments, tags));
  }
  if (instrumentQuery) {
    return musicians.filter((m) => m.instruments.some((i) => i.toLowerCase().includes(instrumentQuery)));
  }
  if (query) {
    return musicians.filter((m) =>
      `${m.name} ${m.title} ${m.genre} ${m.location} ${m.tags.join(' ')} ${m.instruments.join(' ')}`
        .toLowerCase()
        .includes(query),
    );
  }
  return musicians;
}

// ---------------------------------------------------------------------------
// Gig helpers
// ---------------------------------------------------------------------------
export function mapGig(row, tags = [], applicationCount = 0) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    type: row.type || 'Event',
    venue: row.venue,
    venueId: row.venue_id || null,
    location: row.location,
    date: iso(row.date),
    startTime: row.start_time,
    endTime: row.end_time,
    fee: {
      currency: row.fee_currency || 'NGN',
      amount: row.fee_amount || 0,
    },
    capacity: row.capacity || 1,
    status: row.status || 'open',
    genre: row.genre || '',
    tags,
    requirements: row.requirements || '',
    contractTerms: row.contract_terms || '',
    cancellationPolicy: row.cancellation_policy || '',
    depositPercent: Number(row.deposit_percent) || 0,
    hostId: row.host_id,
    hostName: row.host_name,
    applicationCount,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function gigFromRow(row) {
  const [tags, count] = await Promise.all([
    db('gig_tags').where({ gig_id: row.id }).pluck('tag'),
    db('applications').where({ gig_id: row.id }).count({ c: '*' }).first(),
  ]);
  return mapGig(row, tags, Number(count.c) || 0);
}

export async function getGigById(id) {
  const row = await db('gigs').where({ id }).first();
  if (!row) return null;
  return gigFromRow(row);
}

export async function listGigs(filters = {}) {
  const { q, type, genre, location, status, date, hostId } = filters;
  const query = String(q || '').trim().toLowerCase();
  const typeQuery = String(type || '').toLowerCase();
  const genreQuery = String(genre || '').toLowerCase();
  const locationQuery = String(location || '').toLowerCase();
  const statusQuery = String(status || '').toLowerCase();
  const dateQuery = String(date || '');

  let rows = db('gigs').orderBy('date', 'asc');
  if (typeQuery) rows = rows.whereLike('type', `%${typeQuery}%`);
  if (genreQuery) rows = rows.whereLike('genre', `%${genreQuery}%`);
  if (locationQuery) rows = rows.whereLike('location', `%${locationQuery}%`);
  if (statusQuery) rows = rows.where({ status: statusQuery });
  if (dateQuery) rows = rows.whereRaw('date(date) = date(?)', [dateQuery]);
  if (hostId) rows = rows.where({ host_id: hostId });

  let result = await rows;
  if (query) {
    result = result.filter((r) => `${r.title} ${r.description} ${r.venue} ${r.location}`.toLowerCase().includes(query));
  }
  const gigs = [];
  for (const row of result) gigs.push(await gigFromRow(row));
  return gigs;
}

export async function createGig(data) {
  const id = data.id || uid('g');
  await db('gigs').insert({
    id,
    title: data.title,
    description: data.description || '',
    type: data.type || 'Event',
    venue: data.venue,
    venue_id: data.venueId || null,
    location: data.location,
    date: data.date,
    start_time: data.startTime || '12:00',
    end_time: data.endTime || '18:00',
    fee_currency: data.fee?.currency || 'NGN',
    fee_amount: Number(data.fee?.amount) || 0,
    capacity: Number(data.capacity) || 1,
    status: data.status || 'open',
    genre: data.genre || '',
    requirements: data.requirements || '',
    contract_terms: data.contractTerms || '',
    cancellation_policy: data.cancellationPolicy || '',
    deposit_percent: Math.max(0, Math.min(100, Number(data.depositPercent) || 0)),
    host_id: data.hostId,
    host_name: data.hostName,
  });
  const tags = (data.tags || []).map((tag) => ({ gig_id: id, tag }));
  if (tags.length) await db('gig_tags').insert(tags);
  return getGigById(id);
}

export async function updateGig(id, patch) {
  const row = await db('gigs').where({ id }).first();
  if (!row) return null;
  const base = {};
  if (patch.title !== undefined) base.title = patch.title;
  if (patch.description !== undefined) base.description = patch.description;
  if (patch.type !== undefined) base.type = patch.type;
  if (patch.venue !== undefined) base.venue = patch.venue;
  if (patch.venueId !== undefined) base.venue_id = patch.venueId;
  if (patch.location !== undefined) base.location = patch.location;
  if (patch.date !== undefined) base.date = patch.date;
  if (patch.startTime !== undefined) base.start_time = patch.startTime;
  if (patch.endTime !== undefined) base.end_time = patch.endTime;
  if (patch.genre !== undefined) base.genre = patch.genre;
  if (patch.requirements !== undefined) base.requirements = patch.requirements;
  if (patch.contractTerms !== undefined) base.contract_terms = patch.contractTerms;
  if (patch.cancellationPolicy !== undefined) base.cancellation_policy = patch.cancellationPolicy;
  if (patch.depositPercent !== undefined) base.deposit_percent = Math.max(0, Math.min(100, Number(patch.depositPercent) || 0));
  if (patch.status !== undefined) base.status = patch.status;
  if (patch.fee) {
    base.fee_currency = patch.fee.currency || 'NGN';
    base.fee_amount = Number(patch.fee.amount) || 0;
  }
  if (patch.capacity !== undefined) base.capacity = Number(patch.capacity) || 1;
  base.updated_at = new Date().toISOString();
  await db('gigs').where({ id }).update(base);

  if (patch.tags !== undefined) {
    await db('gig_tags').where({ gig_id: id }).del();
    const rows = patch.tags.map((tag) => ({ gig_id: id, tag }));
    if (rows.length) await db('gig_tags').insert(rows);
  }
  return getGigById(id);
}

export async function deleteGig(id) {
  await db('gigs').where({ id }).del();
}

// ---------------------------------------------------------------------------
// Application helpers
// ---------------------------------------------------------------------------
export function mapApplication(row, gig = null, musician = null) {
  return {
    id: row.id,
    gigId: row.gig_id,
    musicianId: row.musician_id,
    musicianName: row.musician_name,
    email: row.email,
    phone: row.phone || '',
    note: row.note || '',
    status: row.status || 'pending',
    gig,
    musician,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function hydrateApplication(row) {
  const [gig, musician] = await Promise.all([
    getGigById(row.gig_id),
    getUserById(row.musician_id),
  ]);
  return mapApplication(row, gig, musician);
}

export async function getApplicationById(id) {
  const row = await db('applications').where({ id }).first();
  if (!row) return null;
  return hydrateApplication(row);
}

export async function createApplication(data) {
  const id = data.id || uid('a');
  await db('applications').insert({
    id,
    gig_id: data.gigId,
    musician_id: data.musicianId,
    musician_name: data.musicianName,
    email: data.email,
    phone: data.phone || '',
    note: data.note || '',
    status: data.status || 'pending',
  });
  return getApplicationById(id);
}

export async function updateApplicationStatus(id, status) {
  const row = await db('applications').where({ id }).first();
  if (!row) return null;
  const base = { status, updated_at: new Date().toISOString() };
  if (status === 'accepted') base.accepted_at = new Date().toISOString();
  if (status === 'declined') base.declined_at = new Date().toISOString();
  await db('applications').where({ id }).update(base);
  return getApplicationById(id);
}

export async function listApplicationsForUser(user) {
  let rows;
  if (user.role === 'musician') {
    rows = await db('applications').where({ musician_id: user.id }).orderBy('created_at', 'desc');
  } else {
    const gigIds = db('gigs').where({ host_id: user.id }).select('id');
    rows = await db('applications').whereIn('gig_id', gigIds).orderBy('created_at', 'desc');
  }
  const apps = [];
  for (const row of rows) apps.push(await hydrateApplication(row));
  return apps;
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------
export async function createNotification({ userId, type, title, body, link }) {
  const id = uid('n');
  await db('notifications').insert({
    id,
    user_id: userId,
    type: type || 'info',
    title,
    body: body || '',
    link: link || null,
  });
  return id;
}

export async function listNotifications(userId) {
  const rows = await db('notifications').where({ user_id: userId }).orderBy('created_at', 'desc');
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body || '',
    link: r.link || null,
    read: Boolean(r.read_at),
    createdAt: iso(r.created_at),
  }));
}

export async function markNotificationsRead(userId) {
  await db('notifications').where({ user_id: userId }).whereNull('read_at').update({ read_at: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Payment helpers
// ---------------------------------------------------------------------------
export async function createPayment({ applicationId, gigId, payerId, amount, currency, provider, reference }) {
  const id = uid('pay');
  await db('payments').insert({
    id,
    application_id: applicationId || null,
    gig_id: gigId || null,
    payer_id: payerId || null,
    amount_currency: currency || 'NGN',
    amount: Number(amount) || 0,
    status: 'pending',
    provider: provider || 'mock',
    reference: reference || id,
  });
  return getPaymentById(id);
}

export async function markPaymentPaid(id) {
  const row = await db('payments').where({ id }).first();
  if (!row) return null;
  await db('payments').where({ id }).update({ status: 'paid', paid_at: new Date().toISOString() });
  return getPaymentById(id);
}

export async function getPaymentById(id) {
  const row = await db('payments').where({ id }).first();
  if (!row) return null;
  return mapPayment(row);
}

export async function getPaymentByReference(reference) {
  const row = await db('payments').where({ reference }).first();
  if (!row) return null;
  return mapPayment(row);
}

export async function listPaymentsForUser(user) {
  const rows = await db('payments').where({ payer_id: user.id }).orderBy('created_at', 'desc');
  return rows.map(mapPayment);
}

function mapPayment(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    gigId: row.gig_id,
    payerId: row.payer_id,
    amount: { currency: row.amount_currency, value: row.amount },
    status: row.status,
    provider: row.provider,
    reference: row.reference,
    createdAt: iso(row.created_at),
    paidAt: iso(row.paid_at),
  };
}

// ---------------------------------------------------------------------------
// Password reset helpers
// ---------------------------------------------------------------------------
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(userId, ttlMinutes = 60) {
  const token = crypto.randomBytes(32).toString('hex');
  const id = uid('rt');
  await db('password_reset_tokens').insert({
    id,
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + ttlMinutes * 60000).toISOString(),
  });
  return token;
}

export async function findUserByPasswordResetToken(token) {
  const row = await db('password_reset_tokens').where({ token_hash: hashToken(token) }).first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return getUserById(row.user_id);
}

export async function consumePasswordResetToken(token) {
  await db('password_reset_tokens').where({ token_hash: hashToken(token) }).del();
}

// ---------------------------------------------------------------------------
// Review helpers
// ---------------------------------------------------------------------------
export function mapReview(row, reviewer = null) {
  return {
    id: row.id,
    applicationId: row.application_id,
    gigId: row.gig_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment || '',
    reviewer,
    createdAt: iso(row.created_at),
  };
}

export async function createReview({ applicationId, gigId, reviewerId, revieweeId, rating, comment }) {
  const id = uid('rv');
  await db('reviews').insert({
    id,
    application_id: applicationId,
    gig_id: gigId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: String(comment || '').trim().slice(0, 2000),
  });
  return getReviewById(id);
}

export async function getReviewById(id) {
  const row = await db('reviews').where({ id }).first();
  if (!row) return null;
  const reviewer = await getUserById(row.reviewer_id);
  return mapReview(row, reviewer ? { id: reviewer.id, name: reviewer.name, role: reviewer.role } : null);
}

export async function getReviewsForUser(userId) {
  const rows = await db('reviews').where({ reviewee_id: userId }).orderBy('created_at', 'desc');
  const reviews = [];
  for (const row of rows) reviews.push(await getReviewById(row.id));
  const average = reviews.length
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : null;
  return { reviews, average, count: reviews.length };
}

export async function getReviewForApplication(applicationId, reviewerId) {
  const row = await db('reviews').where({ application_id: applicationId, reviewer_id: reviewerId }).first();
  if (!row) return null;
  return getReviewById(row.id);
}

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------
export function threadIdFor(a, b) {
  return [String(a), String(b)].sort().join('::');
}

export function mapMessage(row, user = null) {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    receiverId: row.sender_id === row.user_a_id ? row.user_b_id : row.user_a_id,
    body: row.body,
    read: Boolean(row.read_at),
    user,
    createdAt: iso(row.created_at),
  };
}

export async function listThreads(userId) {
  const rows = await db('messages')
    .where((builder) => builder.where('user_a_id', userId).orWhere('user_b_id', userId))
    .orderBy('created_at', 'desc');
  const byThread = new Map();
  for (const row of rows) {
    if (!byThread.has(row.thread_id)) byThread.set(row.thread_id, row);
  }
  const threads = [];
  for (const row of byThread.values()) {
    const otherId = row.user_a_id === userId ? row.user_b_id : row.user_a_id;
    const other = await getUserById(otherId);
    const unreadCount = await db('messages')
      .where({ thread_id: row.thread_id, sender_id: otherId })
      .whereNull('read_at')
      .count({ c: '*' })
      .first();
    threads.push({
      id: row.thread_id,
      user: other ? { id: other.id, name: other.name, role: other.role, photoUrl: other.photoUrl } : null,
      lastMessage: mapMessage(row),
      unread: Number(unreadCount.c) || 0,
    });
  }
  return threads;
}

export async function listMessagesWith(userId, otherId) {
  const thread = threadIdFor(userId, otherId);
  await db('messages')
    .where({ thread_id: thread, sender_id: otherId })
    .whereNull('read_at')
    .update({ read_at: new Date().toISOString() });
  const rows = await db('messages').where({ thread_id: thread }).orderBy('created_at', 'asc');
  const other = await getUserById(otherId);
  return rows.map((r) => mapMessage(r, other ? { id: other.id, name: other.name, role: other.role } : null));
}

export async function sendMessage({ senderId, receiverId, body }) {
  const id = uid('m');
  const thread = threadIdFor(senderId, receiverId);
  const [a, b] = [String(senderId), String(receiverId)].sort();
  await db('messages').insert({
    id,
    thread_id: thread,
    user_a_id: a,
    user_b_id: b,
    sender_id: senderId,
    body: String(body || '').trim().slice(0, 2000),
  });
  const row = await db('messages').where({ id }).first();
  return mapMessage(row);
}

// ---------------------------------------------------------------------------
// Availability scheduling
// ---------------------------------------------------------------------------
export function mapAvailability(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || '',
    startAt: iso(row.start_at),
    endAt: iso(row.end_at),
    status: row.status || 'available',
    note: row.note || '',
    createdAt: iso(row.created_at),
  };
}

export async function listAvailability(userId) {
  const rows = await db('availability_blocks')
    .where({ user_id: userId })
    .where('end_at', '>', new Date().toISOString())
    .orderBy('start_at', 'asc');
  return rows.map(mapAvailability);
}

export async function createAvailabilityBlock(data) {
  const id = uid('av');
  await db('availability_blocks').insert({
    id,
    user_id: data.userId,
    title: data.title || '',
    start_at: data.startAt,
    end_at: data.endAt,
    status: data.status || 'available',
    note: data.note || '',
  });
  const row = await db('availability_blocks').where({ id }).first();
  return mapAvailability(row);
}

export async function deleteAvailabilityBlock(userId, id) {
  const row = await db('availability_blocks').where({ id, user_id: userId }).first();
  if (!row) return null;
  await db('availability_blocks').where({ id }).del();
  return mapAvailability(row);
}

// ---------------------------------------------------------------------------
// Media demos
// ---------------------------------------------------------------------------
export function mapDemo(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title || '',
    url: row.url,
    createdAt: iso(row.created_at),
  };
}

export async function listDemos(userId) {
  const rows = await db('media_demos').where({ user_id: userId }).orderBy('created_at', 'desc');
  return rows.map(mapDemo);
}

export async function createDemo(data) {
  const id = uid('demo');
  await db('media_demos').insert({
    id,
    user_id: data.userId,
    type: data.type === 'video' ? 'video' : 'audio',
    title: data.title || '',
    url: data.url,
  });
  const row = await db('media_demos').where({ id }).first();
  return mapDemo(row);
}

export async function deleteDemo(userId, id) {
  const row = await db('media_demos').where({ id, user_id: userId }).first();
  if (!row) return null;
  await db('media_demos').where({ id }).del();
  return mapDemo(row);
}

// ---------------------------------------------------------------------------
// Reports & moderation
// ---------------------------------------------------------------------------
export function mapReport(row, reporter = null) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporter: reporter ? { id: reporter.id, name: reporter.name, role: reporter.role } : null,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details || '',
    status: row.status || 'open',
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function createReport({ reporterId, targetType, targetId, reason, details }) {
  const id = uid('rep');
  await db('reports').insert({
    id,
    reporter_id: reporterId,
    target_type: targetType,
    target_id: String(targetId),
    reason: String(reason).trim().slice(0, 120),
    details: String(details || '').trim().slice(0, 2000),
    status: 'open',
  });
  return getReportById(id);
}

export async function getReportById(id) {
  const row = await db('reports').where({ id }).first();
  if (!row) return null;
  const reporter = await getUserById(row.reporter_id);
  return mapReport(row, reporter);
}

export async function listReports(status = '') {
  let query = db('reports').orderBy('created_at', 'desc');
  if (status) query = query.where({ status });
  const rows = await query;
  const reports = [];
  for (const row of rows) {
    const reporter = await getUserById(row.reporter_id);
    reports.push(mapReport(row, reporter));
  }
  return reports;
}

export async function updateReportStatus(id, status) {
  const row = await db('reports').where({ id }).first();
  if (!row) return null;
  await db('reports').where({ id }).update({ status, updated_at: new Date().toISOString() });
  return getReportById(id);
}

export async function setUserBlocked(id, blocked) {
  const row = await db('users').where({ id }).first();
  if (!row) return null;
  await db('users').where({ id }).update({ is_blocked: blocked ? true : false, updated_at: new Date().toISOString() });
  return getUserById(id);
}

export async function listAllUsers() {
  const rows = await db('users').orderBy('created_at', 'desc');
  const users = [];
  for (const row of rows) {
    const [instruments, tags] = await Promise.all([
      db('user_instruments').where({ user_id: row.id }).pluck('instrument'),
      db('user_tags').where({ user_id: row.id }).pluck('tag'),
    ]);
    users.push(mapUser(row, instruments, tags));
  }
  return users;
}

// ---------------------------------------------------------------------------
// Community / bands
// ---------------------------------------------------------------------------
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `band-${uid('b').slice(3)}`;
}

export function mapBand(row, memberCount = 0, ownerName = '') {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    genre: row.genre || '',
    location: row.location || '',
    photoUrl: row.photo_url || null,
    ownerId: row.owner_id,
    ownerName,
    memberCount,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function bandFromRow(row) {
  const owner = await getUserById(row.owner_id);
  const count = await db('band_members').where({ band_id: row.id, status: 'active' }).count({ c: '*' }).first();
  return mapBand(row, Number(count.c) || 0, owner ? owner.name : '');
}

export async function listBands(filters = {}) {
  const { q, genre, location } = filters;
  const query = String(q || '').trim().toLowerCase();
  const genreQuery = String(genre || '').toLowerCase();
  const locationQuery = String(location || '').toLowerCase();

  let rows = db('bands').orderBy('created_at', 'desc');
  if (genreQuery) rows = rows.whereLike('genre', `%${genreQuery}%`);
  if (locationQuery) rows = rows.whereLike('location', `%${locationQuery}%`);
  let result = await rows;
  if (query) result = result.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(query));
  const bands = [];
  for (const row of result) bands.push(await bandFromRow(row));
  return bands;
}

export async function getBandById(id) {
  const row = await db('bands').where({ id }).first();
  if (!row) return null;
  return bandFromRow(row);
}

export async function getBandBySlug(slug) {
  const row = await db('bands').where({ slug }).first();
  if (!row) return null;
  return bandFromRow(row);
}

export async function createBand(data) {
  const id = data.id || uid('b');
  const slug = data.slug || slugify(data.name);
  await db('bands').insert({
    id,
    name: data.name,
    slug,
    description: data.description || '',
    genre: data.genre || '',
    location: data.location || '',
    photo_url: data.photoUrl || null,
    owner_id: data.ownerId,
  });
  await db('band_members').insert({
    id: uid('bm'),
    band_id: id,
    user_id: data.ownerId,
    role: 'owner',
    status: 'active',
  });
  return getBandById(id);
}

export async function updateBand(id, patch) {
  const row = await db('bands').where({ id }).first();
  if (!row) return null;
  const base = {};
  if (patch.name !== undefined) base.name = patch.name;
  if (patch.description !== undefined) base.description = patch.description;
  if (patch.genre !== undefined) base.genre = patch.genre;
  if (patch.location !== undefined) base.location = patch.location;
  if (patch.photoUrl !== undefined) base.photo_url = patch.photoUrl;
  base.updated_at = new Date().toISOString();
  if (Object.keys(base).length) await db('bands').where({ id }).update(base);
  return getBandById(id);
}

export async function deleteBand(id) {
  await db('bands').where({ id }).del();
}

export async function listBandMembers(bandId) {
  const rows = await db('band_members').where({ band_id: bandId }).orderBy('joined_at', 'asc');
  const members = [];
  for (const row of rows) {
    const user = await getUserById(row.user_id);
    members.push({
      userId: row.user_id,
      name: user?.name || 'Unknown',
      photoUrl: user?.photoUrl || null,
      role: row.role,
      status: row.status,
      joinedAt: iso(row.joined_at),
    });
  }
  return members;
}

export async function addBandMember(bandId, userId, role = 'member', status = 'pending') {
  const existing = await db('band_members').where({ band_id: bandId, user_id: userId }).first();
  if (existing) return existing;
  await db('band_members').insert({ id: uid('bm'), band_id: bandId, user_id: userId, role, status });
  return db('band_members').where({ band_id: bandId, user_id: userId }).first();
}

export async function updateBandMemberStatus(bandId, userId, status) {
  const row = await db('band_members').where({ band_id: bandId, user_id: userId }).first();
  if (!row) return null;
  await db('band_members').where({ band_id: bandId, user_id: userId }).update({ status });
  return db('band_members').where({ band_id: bandId, user_id: userId }).first();
}

export async function removeBandMember(bandId, userId) {
  await db('band_members').where({ band_id: bandId, user_id: userId }).del();
}

export async function userBandMemberships(userId) {
  const rows = await db('band_members').where({ user_id: userId }).orderBy('joined_at', 'desc');
  const memberships = [];
  for (const row of rows) {
    const band = await getBandById(row.band_id);
    if (band) memberships.push({ ...band, membershipRole: row.role, membershipStatus: row.status });
  }
  return memberships;
}

// --- Follows ---
export async function toggleFollow(followerId, targetType, targetId) {
  const existing = await db('follows').where({ follower_id: followerId, target_type: targetType, target_id: targetId }).first();
  if (existing) {
    await db('follows').where({ id: existing.id }).del();
    return { following: false };
  }
  await db('follows').insert({ id: uid('f'), follower_id: followerId, target_type: targetType, target_id: targetId });
  return { following: true };
}

export async function isFollowing(followerId, targetType, targetId) {
  const row = await db('follows').where({ follower_id: followerId, target_type: targetType, target_id: targetId }).first();
  return Boolean(row);
}

export async function listFollowCounts(targetType, targetId) {
  const follower = await db('follows').where({ target_type: targetType, target_id: targetId }).count({ c: '*' }).first();
  return Number(follower.c) || 0;
}

export async function listFollowingUsers(userId) {
  const rows = await db('follows').where({ follower_id: userId, target_type: 'user' }).pluck('target_id');
  return rows;
}

export async function listFollowingBands(userId) {
  const rows = await db('follows').where({ follower_id: userId, target_type: 'band' }).pluck('target_id');
  return rows;
}

// --- Community posts ---
export function mapPost(row, author = null, band = null, likeCount = 0, commentCount = 0, likedByMe = false) {
  return {
    id: row.id,
    authorId: row.author_id,
    author: author ? { id: author.id, name: author.name, role: author.role, photoUrl: author.photoUrl } : null,
    bandId: row.band_id,
    band: band ? { id: band.id, name: band.name, slug: band.slug } : null,
    type: row.type || 'post',
    title: row.title || '',
    body: row.body,
    link: row.link || '',
    topic: row.topic || '',
    genre: row.genre || '',
    location: row.location || '',
    instrument: row.instrument || '',
    likeCount,
    commentCount,
    likedByMe,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function postFromRow(row, currentUserId) {
  const [author, band, likeCount, commentCount] = await Promise.all([
    row.band_id ? null : getUserById(row.author_id),
    row.band_id ? getBandById(row.band_id) : null,
    db('post_likes').where({ post_id: row.id }).count({ c: '*' }).first(),
    db('post_comments').where({ post_id: row.id }).count({ c: '*' }).first(),
  ]);
  const likedByMe = currentUserId ? await isPostLiked(row.id, currentUserId) : false;
  return mapPost(row, author, band, Number(likeCount.c) || 0, Number(commentCount.c) || 0, likedByMe);
}

export async function isPostLiked(postId, userId) {
  const row = await db('post_likes').where({ post_id: postId, user_id: userId }).first();
  return Boolean(row);
}

export async function listCommunityPosts(filters = {}, currentUserId = null) {
  const { q, type, topic, genre, location, following } = filters;
  const query = String(q || '').trim().toLowerCase();
  const typeQuery = String(type || '').toLowerCase();
  const topicQuery = String(topic || '').toLowerCase();
  const genreQuery = String(genre || '').toLowerCase();
  const locationQuery = String(location || '').toLowerCase();

  let result;
  if (following && currentUserId) {
    const userFollows = await listFollowingUsers(currentUserId);
    const bandFollows = await listFollowingBands(currentUserId);
    if (!userFollows.length && !bandFollows.length) return [];
    result = await db('community_posts')
      .where((b) => b.whereIn('author_id', userFollows).orWhereIn('band_id', bandFollows))
      .orderBy('created_at', 'desc');
  } else {
    let rows = db('community_posts').orderBy('created_at', 'desc');
    if (typeQuery) rows = rows.where({ type: typeQuery });
    if (topicQuery) rows = rows.whereLike('topic', `%${topicQuery}%`);
    if (genreQuery) rows = rows.whereLike('genre', `%${genreQuery}%`);
    if (locationQuery) rows = rows.whereLike('location', `%${locationQuery}%`);
    result = await rows;
  }

  if (query) result = result.filter((r) => `${r.title || ''} ${r.body} ${r.topic} ${r.genre}`.toLowerCase().includes(query));
  const posts = [];
  for (const row of result) posts.push(await postFromRow(row, currentUserId));
  return posts;
}

export async function getCommunityPost(id, currentUserId = null) {
  const row = await db('community_posts').where({ id }).first();
  if (!row) return null;
  return postFromRow(row, currentUserId);
}

export async function createCommunityPost(data) {
  const id = data.id || uid('p');
  await db('community_posts').insert({
    id,
    author_id: data.authorId,
    band_id: data.bandId || null,
    type: data.type || 'post',
    title: data.title || '',
    body: data.body,
    link: data.link || '',
    topic: data.topic || '',
    genre: data.genre || '',
    location: data.location || '',
    instrument: data.instrument || '',
  });
  return getCommunityPost(id, data.authorId);
}

export async function deleteCommunityPost(id) {
  await db('community_posts').where({ id }).del();
}

export async function togglePostLike(postId, userId) {
  const existing = await db('post_likes').where({ post_id: postId, user_id: userId }).first();
  if (existing) {
    await db('post_likes').where({ id: existing.id }).del();
    return { liked: false };
  }
  await db('post_likes').insert({ id: uid('pl'), post_id: postId, user_id: userId });
  return { liked: true };
}

export async function listPostComments(postId) {
  const rows = await db('post_comments').where({ post_id: postId }).orderBy('created_at', 'asc');
  const comments = [];
  for (const row of rows) {
    const author = await getUserById(row.author_id);
    comments.push({
      id: row.id,
      postId: row.post_id,
      author: author ? { id: author.id, name: author.name, photoUrl: author.photoUrl, role: author.role } : null,
      body: row.body,
      createdAt: iso(row.created_at),
    });
  }
  return comments;
}

export async function addPostComment(postId, authorId, body) {
  const id = uid('pc');
  await db('post_comments').insert({ id, post_id: postId, author_id: authorId, body: String(body).trim() });
  const row = await db('post_comments').where({ id }).first();
  const author = await getUserById(authorId);
  return { id: row.id, postId, author: { id: author.id, name: author.name, photoUrl: author.photoUrl, role: author.role }, body: row.body, createdAt: iso(row.created_at) };
}

export function mapVenue(row, gigCount = 0) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type || '',
    description: row.description || '',
    location: row.location,
    capacity: row.capacity || 0,
    amenities: row.amenities || '',
    photoUrl: row.photo_url || null,
    website: row.website || '',
    phone: row.phone || '',
    contactEmail: row.contact_email || '',
    ownerId: row.owner_id,
    gigCount,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function venueFromRow(row) {
  const gigCount = await db('gigs').where({ venue_id: row.id }).count({ c: '*' }).first();
  return mapVenue(row, Number(gigCount.c) || 0);
}

export async function listVenues(filters = {}) {
  const { q, location, type } = filters;
  const query = String(q || '').trim().toLowerCase();
  const locationQuery = String(location || '').toLowerCase();
  const typeQuery = String(type || '').toLowerCase();

  let rows = db('venues').orderBy('created_at', 'desc');
  if (locationQuery) rows = rows.whereLike('location', `%${locationQuery}%`);
  if (typeQuery) rows = rows.whereLike('type', `%${typeQuery}%`);
  let result = await rows;
  if (query) result = result.filter((r) => `${r.name} ${r.description} ${r.location}`.toLowerCase().includes(query));
  const venues = [];
  for (const row of result) venues.push(await venueFromRow(row));
  return venues;
}

export async function getVenueById(id) {
  const row = await db('venues').where({ id }).first();
  if (!row) return null;
  return venueFromRow(row);
}

export async function getVenueBySlug(slug) {
  const row = await db('venues').where({ slug }).first();
  if (!row) return null;
  return venueFromRow(row);
}

function slugifyVenue(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function createVenue(data) {
  const id = data.id || uid('v');
  const slug = data.slug || slugifyVenue(data.name) || id;
  await db('venues').insert({
    id,
    name: data.name,
    slug,
    type: data.type || '',
    description: data.description || '',
    location: data.location,
    capacity: Number(data.capacity) || 0,
    amenities: data.amenities || '',
    photo_url: data.photoUrl || null,
    website: data.website || '',
    phone: data.phone || '',
    contact_email: data.contactEmail || '',
    owner_id: data.ownerId,
  });
  return getVenueById(id);
}

export async function updateVenue(id, patch) {
  const row = await db('venues').where({ id }).first();
  if (!row) return null;
  const base = {};
  if (patch.name !== undefined) base.name = patch.name;
  if (patch.type !== undefined) base.type = patch.type;
  if (patch.description !== undefined) base.description = patch.description;
  if (patch.location !== undefined) base.location = patch.location;
  if (patch.capacity !== undefined) base.capacity = Number(patch.capacity) || 0;
  if (patch.amenities !== undefined) base.amenities = patch.amenities;
  if (patch.photoUrl !== undefined) base.photo_url = patch.photoUrl;
  if (patch.website !== undefined) base.website = patch.website;
  if (patch.phone !== undefined) base.phone = patch.phone;
  if (patch.contactEmail !== undefined) base.contact_email = patch.contactEmail;
  base.updated_at = new Date().toISOString();
  if (Object.keys(base).length) await db('venues').where({ id }).update(base);
  return getVenueById(id);
}

export async function deleteVenue(id) {
  await db('venues').where({ id }).del();
}

export async function listVenueGigs(venueId) {
  const result = await db('gigs').where({ venue_id: venueId }).orderBy('date', 'asc');
  const rows = [];
  for (const row of result) rows.push(await gigFromRow(row));
  return rows;
}

export async function listVenuesByOwner(ownerId) {
  const rows = await db('venues').where({ owner_id: ownerId }).orderBy('created_at', 'desc');
  const venues = [];
  for (const row of rows) venues.push(await venueFromRow(row));
  return venues;
}

export { MAX_FILE_SIZE_MB };
