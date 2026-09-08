import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { getDb, saveDb } from './db.js';
import { signToken, requireAuth, requireRole, publicUser } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, '..', 'dist');

const app = express();
app.use(cors());
app.use(express.json());

const uid = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function publicGig(gig, db) {
  const apps = db.applications.filter((a) => a.gigId === gig.id);
  return { ...gig, applicationCount: apps.length };
}

function safeMusician(user) {
  const { passwordHash, email, ...rest } = user;
  return rest;
}

function slugify(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'iConnect', version: '0.1.0' });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/signup', (req, res) => {
  const db = getDb();
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (role && !['musician', 'organizer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be musician or organizer.' });
  }

  const normalizedEmail = normalizeText(email);
  if (db.users.some((u) => normalizeText(u.email) === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const user = {
    id: uid('u'),
    role: role || 'musician',
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    title: '',
    bio: '',
    location: '',
    genre: '',
    instruments: role === 'musician' ? [] : undefined,
    yearsExperience: role === 'musician' ? 0 : undefined,
    rate: role === 'musician' ? { currency: 'NGN', amount: 0, unit: 'per gig' } : undefined,
    availability: role === 'musician' ? 'open' : undefined,
    tags: [],
    roleLabel: role === 'organizer' ? 'Organizer' : undefined,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  saveDb();
  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const db = getDb();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.users.find((u) => normalizeText(u.email) === normalizeText(email));
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ---------------------------------------------------------------------------
// Musicians
// ---------------------------------------------------------------------------
app.get('/api/musicians', (req, res) => {
  const db = getDb();
  const { q, genre, location, instrument, availability } = req.query;
  const query = normalizeText(q);
  const genreQuery = normalizeText(genre);
  const locationQuery = normalizeText(location);
  const instrumentQuery = normalizeText(instrument);
  const availabilityQuery = normalizeText(availability);

  let musicians = db.users.filter((u) => u.role === 'musician');

  if (query) {
    musicians = musicians.filter((m) =>
      `${m.name} ${m.title} ${m.genre} ${m.location} ${(m.tags || []).join(' ')} ${(m.instruments || []).join(' ')}`
        .toLowerCase()
        .includes(query),
    );
  }
  if (genreQuery) {
    musicians = musicians.filter((m) => normalizeText(m.genre).includes(genreQuery));
  }
  if (locationQuery) {
    musicians = musicians.filter((m) => normalizeText(m.location).includes(locationQuery));
  }
  if (instrumentQuery) {
    musicians = musicians.filter((m) => (m.instruments || []).some((i) => normalizeText(i).includes(instrumentQuery)));
  }
  if (availabilityQuery) {
    musicians = musicians.filter((m) => normalizeText(m.availability) === availabilityQuery);
  }

  musicians.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json({ musicians: musicians.map(safeMusician) });
});

app.get('/api/musicians/:id', (req, res) => {
  const db = getDb();
  const musician = db.users.find((u) => u.id === req.params.id && u.role === 'musician');
  if (!musician) return res.status(404).json({ error: 'Musician not found.' });
  res.json({ musician: safeMusician(musician) });
});

app.put('/api/musicians/:id', requireAuth, requireRole('musician'), (req, res) => {
  const db = getDb();
  const musician = db.users.find((u) => u.id === req.params.id);
  if (!musician || musician.id !== req.user.id || musician.role !== 'musician') {
    return res.status(404).json({ error: 'Musician profile not found.' });
  }

  const allowed = ['name', 'title', 'bio', 'location', 'genre', 'yearsExperience', 'availability'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) musician[field] = req.body[field];
  }
  musician.instruments = toArray(req.body.instruments ?? musician.instruments ?? []);
  musician.tags = toArray(req.body.tags ?? musician.tags ?? []);

  if (req.body.rate) {
    musician.rate = {
      currency: req.body.rate.currency || 'NGN',
      amount: Number(req.body.rate.amount) || 0,
      unit: req.body.rate.unit || 'per gig',
    };
  }

  musician.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ musician: safeMusician(musician) });
});

// ---------------------------------------------------------------------------
// Gigs
// ---------------------------------------------------------------------------
app.get('/api/gigs', (req, res) => {
  const db = getDb();
  const { q, type, genre, location, status, date } = req.query;
  const query = normalizeText(q);
  const typeQuery = normalizeText(type);
  const genreQuery = normalizeText(genre);
  const locationQuery = normalizeText(location);
  const statusQuery = normalizeText(status);
  const dateQuery = normalizeText(date);

  let gigs = [...db.gigs];

  if (query) {
    gigs = gigs.filter((g) =>
      `${g.title} ${g.description} ${g.type} ${g.venue} ${g.location} ${g.genre} ${(g.tags || []).join(' ')}`
        .toLowerCase()
        .includes(query),
    );
  }
  if (typeQuery) gigs = gigs.filter((g) => normalizeText(g.type).includes(typeQuery));
  if (genreQuery) gigs = gigs.filter((g) => normalizeText(g.genre).includes(genreQuery));
  if (locationQuery) gigs = gigs.filter((g) => normalizeText(g.location).includes(locationQuery));
  if (statusQuery) gigs = gigs.filter((g) => normalizeText(g.status) === statusQuery);
  if (dateQuery) gigs = gigs.filter((g) => {
    const d = new Date(g.date).toISOString().slice(0, 10);
    return d === dateQuery;
  });

  gigs.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  res.json({ gigs: gigs.map((g) => publicGig(g, db)) });
});

app.get('/api/gigs/:id', (req, res) => {
  const db = getDb();
  const gig = db.gigs.find((g) => g.id === req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found.' });
  res.json({ gig: publicGig(gig, db) });
});

app.post('/api/gigs', requireAuth, requireRole('organizer'), (req, res) => {
  const db = getDb();
  const {
    title, description, type, venue, location, date, startTime, endTime,
    fee, capacity, genre, requirements, status,
  } = req.body || {};

  if (!title || !venue || !location || !date) {
    return res.status(400).json({ error: 'Title, venue, location and date are required.' });
  }

  const gig = {
    id: uid('g'),
    title: String(title).trim(),
    description: String(description || '').trim(),
    type: String(type || 'Event'),
    venue: String(venue).trim(),
    location: String(location).trim(),
    date: new Date(date).toISOString(),
    startTime: startTime || '12:00',
    endTime: endTime || '18:00',
    fee: {
      currency: fee?.currency || 'NGN',
      amount: Number(fee?.amount) || 0,
    },
    capacity: Number(capacity) || 1,
    status: status || 'open',
    genre: String(genre || '').trim(),
    tags: toArray(req.body.tags),
    requirements: String(requirements || '').trim(),
    hostId: req.user.id,
    hostName: `${req.user.name}${req.user.title ? ` · ${req.user.title}` : ''}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.gigs.push(gig);
  saveDb();
  res.status(201).json({ gig: publicGig(gig, db) });
});

app.put('/api/gigs/:id', requireAuth, requireRole('organizer'), (req, res) => {
  const db = getDb();
  const gig = db.gigs.find((g) => g.id === req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found.' });
  if (gig.hostId !== req.user.id) return res.status(403).json({ error: 'You can only edit your own gigs.' });

  const allowed = ['title', 'description', 'type', 'venue', 'location', 'date', 'startTime', 'endTime',
    'genre', 'requirements', 'status'];
  for (const field of allowed) {
    if (req.body[field] !== undefined) gig[field] = req.body[field];
  }
  if (req.body.fee) {
    gig.fee = { currency: req.body.fee.currency || 'NGN', amount: Number(req.body.fee.amount) || 0 };
  }
  if (req.body.capacity !== undefined) gig.capacity = Number(req.body.capacity) || 1;
  if (req.body.tags !== undefined) gig.tags = toArray(req.body.tags);

  gig.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ gig: publicGig(gig, db) });
});

app.delete('/api/gigs/:id', requireAuth, requireRole('organizer'), (req, res) => {
  const db = getDb();
  const gigIdx = db.gigs.findIndex((g) => g.id === req.params.id);
  if (gigIdx === -1) return res.status(404).json({ error: 'Gig not found.' });
  if (db.gigs[gigIdx].hostId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own gigs.' });
  }

  db.gigs.splice(gigIdx, 1);
  db.applications = db.applications.filter((a) => a.gigId !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
app.post('/api/gigs/:id/apply', requireAuth, requireRole('musician'), (req, res) => {
  const db = getDb();
  const gig = db.gigs.find((g) => g.id === req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found.' });
  if (gig.status !== 'open') return res.status(400).json({ error: 'This gig is no longer accepting applications.' });

  const already = db.applications.find((a) => a.gigId === gig.id && a.musicianId === req.user.id);
  if (already) return res.status(409).json({ error: 'You have already applied to this gig.' });

  const { note, phone } = req.body || {};
  const application = {
    id: uid('a'),
    gigId: gig.id,
    musicianId: req.user.id,
    musicianName: req.user.name,
    email: req.user.email,
    phone: String(phone || '').trim(),
    note: String(note || '').trim().slice(0, 1200),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.applications.push(application);
  saveDb();
  res.status(201).json({ application });
});

app.get('/api/applications/my', requireAuth, (req, res) => {
  const db = getDb();
  const role = req.user.role;

  let applications = db.applications;
  if (role === 'musician') {
    applications = applications.filter((a) => a.musicianId === req.user.id);
  } else {
    const gigIds = db.gigs.filter((g) => g.hostId === req.user.id).map((g) => g.id);
    applications = applications.filter((a) => gigIds.includes(a.gigId));
  }

  const enriched = applications.map((a) => {
    const gig = db.gigs.find((g) => g.id === a.gigId);
    const musician = db.users.find((u) => u.id === a.musicianId);
    return { ...a, gig: gig ? publicGig(gig, db) : null, musician: musician ? safeMusician(musician) : null };
  });

  enriched.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json({ applications: enriched });
});

app.put('/api/applications/:id', requireAuth, requireRole('organizer'), (req, res) => {
  const db = getDb();
  const application = db.applications.find((a) => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });

  const gig = db.gigs.find((g) => g.id === application.gigId);
  if (!gig || gig.hostId !== req.user.id) {
    return res.status(403).json({ error: 'You can only manage applications for your own gigs.' });
  }

  const { status } = req.body || {};
  if (!['pending', 'accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending, accepted or declined.' });
  }

  application.status = status;
  application.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ application });
});

// ---------------------------------------------------------------------------
// Static frontend (production build)
// ---------------------------------------------------------------------------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, HOST, () => {
  console.log(`\niConnect server running at http://${HOST}:${PORT}`);
  console.log(`  API:        http://localhost:${PORT}/api`);
  console.log(`  Preview UI: http://localhost:${PORT}${fs.existsSync(DIST_DIR) ? '' : '  (build the frontend with npm run build)'}`);
  console.log('  Demo login: ayo@example.com / password123  (musician)');
  console.log('              chidi@example.com / password123  (organizer)\n');
});
