import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import {
  initDb,
  uid,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  listMusicians,
  getGigById,
  listGigs,
  createGig,
  updateGig,
  deleteGig,
  createApplication,
  getApplicationById,
  updateApplicationStatus,
  listApplicationsForUser,
  createNotification,
  listNotifications,
  markNotificationsRead,
  createPayment,
  markPaymentPaid,
  listPaymentsForUser,
  MAX_FILE_SIZE_MB,
} from './store.js';
import { signToken, requireAuth, requireRole, publicUser } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

const app = express();
app.use(cors());
app.use(express.json());

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function safeMusician(user) {
  const { passwordHash, email, ...rest } = user;
  return rest;
}

// Multer for photo/EPK uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    cb(null, `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(png|jpe?g|webp|gif)$|pdf|zip|audio\/(mpeg|wav|mp4)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Unsupported file type. Use images, PDF, ZIP or audio.'));
  },
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'iConnect', version: '0.2.0', storage: process.env.DATABASE_URL ? 'postgres' : 'sqlite' });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
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
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const user = await createUser({
    role: role || 'musician',
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    title: '',
    bio: '',
    location: '',
    genre: '',
    instruments: role === 'musician' ? [] : [],
    tags: [],
    yearsExperience: 0,
    availability: 'open',
    rate: { currency: 'NGN', amount: 0, unit: 'per gig' },
    roleLabel: role === 'organizer' ? 'Organizer' : undefined,
  });

  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = await getUserByEmail(normalizeText(email));
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------------------------------------------------------------------------
// Musicians
// ---------------------------------------------------------------------------
app.get('/api/musicians', async (req, res) => {
  const musicians = await listMusicians({
    q: req.query.q,
    genre: req.query.genre,
    location: req.query.location,
    instrument: req.query.instrument,
    availability: req.query.availability,
  });
  res.json({ musicians: musicians.map(safeMusician) });
});

app.get('/api/musicians/:id', async (req, res) => {
  const musician = await getUserById(req.params.id);
  if (!musician || musician.role !== 'musician') return res.status(404).json({ error: 'Musician not found.' });
  res.json({ musician: safeMusician(musician) });
});

app.put('/api/musicians/:id', requireAuth, requireRole('musician'), async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(404).json({ error: 'Musician profile not found.' });

  const patch = {
    name: req.body.name,
    title: req.body.title,
    bio: req.body.bio,
    location: req.body.location,
    genre: req.body.genre,
    yearsExperience: req.body.yearsExperience,
    availability: req.body.availability,
    instruments: req.body.instruments !== undefined ? toArray(req.body.instruments) : undefined,
    tags: req.body.tags !== undefined ? toArray(req.body.tags) : undefined,
    rate: req.body.rate,
    photoUrl: req.body.photoUrl,
    epkUrl: req.body.epkUrl,
    socials: req.body.socials,
  };
  for (const key of Object.keys(patch)) if (patch[key] === undefined) delete patch[key];

  const musician = await updateUser(req.user.id, patch);
  res.json({ musician: safeMusician(musician) });
});

// ---------------------------------------------------------------------------
// Uploads (photo / EPK)
// ---------------------------------------------------------------------------
app.post('/api/uploads', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const kind = req.body.kind === 'epk' ? 'epk' : 'photo';
  res.status(201).json({ url: `/uploads/${req.file.filename}`, kind });
});

// Serve uploaded files.
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));

// ---------------------------------------------------------------------------
// Gigs
// ---------------------------------------------------------------------------
app.get('/api/gigs', async (req, res) => {
  const gigs = await listGigs({
    q: req.query.q,
    type: req.query.type,
    genre: req.query.genre,
    location: req.query.location,
    status: req.query.status,
    date: req.query.date,
    hostId: req.query.hostId,
  });
  res.json({ gigs });
});

app.get('/api/gigs/:id', async (req, res) => {
  const gig = await getGigById(req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found.' });
  res.json({ gig });
});

app.post('/api/gigs', requireAuth, requireRole('organizer'), async (req, res) => {
  const { title, venue, location, date } = req.body || {};
  if (!title || !venue || !location || !date) {
    return res.status(400).json({ error: 'Title, venue, location and date are required.' });
  }

  const gig = await createGig({
    title: String(title).trim(),
    description: String(req.body.description || '').trim(),
    type: String(req.body.type || 'Event'),
    venue: String(venue).trim(),
    location: String(location).trim(),
    date: new Date(date).toISOString(),
    startTime: req.body.startTime || '12:00',
    endTime: req.body.endTime || '18:00',
    fee: { currency: req.body.fee?.currency || 'NGN', amount: Number(req.body.fee?.amount) || 0 },
    capacity: Number(req.body.capacity) || 1,
    status: req.body.status || 'open',
    genre: String(req.body.genre || '').trim(),
    tags: toArray(req.body.tags),
    requirements: String(req.body.requirements || '').trim(),
    hostId: req.user.id,
    hostName: `${req.user.name}${req.user.title ? ` · ${req.user.title}` : ''}`,
  });
  res.status(201).json({ gig });
});

app.put('/api/gigs/:id', requireAuth, requireRole('organizer'), async (req, res) => {
  const existing = await getGigById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Gig not found.' });
  if (existing.hostId !== req.user.id) return res.status(403).json({ error: 'You can only edit your own gigs.' });

  const gig = await updateGig(req.params.id, req.body);
  res.json({ gig });
});

app.delete('/api/gigs/:id', requireAuth, requireRole('organizer'), async (req, res) => {
  const existing = await getGigById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Gig not found.' });
  if (existing.hostId !== req.user.id) return res.status(403).json({ error: 'You can only delete your own gigs.' });

  await deleteGig(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
app.post('/api/gigs/:id/apply', requireAuth, requireRole('musician'), async (req, res) => {
  const gig = await getGigById(req.params.id);
  if (!gig) return res.status(404).json({ error: 'Gig not found.' });
  if (gig.status !== 'open') return res.status(400).json({ error: 'This gig is no longer accepting applications.' });

  const apps = await listApplicationsForUser({ role: 'musician', id: req.user.id });
  const already = apps.find((a) => a.gigId === gig.id);
  if (already) return res.status(409).json({ error: 'You have already applied to this gig.' });

  const application = await createApplication({
    gigId: gig.id,
    musicianId: req.user.id,
    musicianName: req.user.name,
    email: req.user.email,
    phone: String(req.body?.phone || '').trim(),
    note: String(req.body?.note || '').trim().slice(0, 1200),
  });

  await createNotification({
    userId: gig.hostId,
    type: 'application',
    title: 'New application',
    body: `${req.user.name} applied to ${gig.title}.`,
    link: '/dashboard',
  });

  res.status(201).json({ application });
});

app.get('/api/applications/my', requireAuth, async (req, res) => {
  const applications = await listApplicationsForUser(req.user);
  res.json({ applications });
});

app.put('/api/applications/:id', requireAuth, requireRole('organizer'), async (req, res) => {
  const application = await getApplicationById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const gig = await getGigById(application.gigId);
  if (!gig || gig.hostId !== req.user.id) {
    return res.status(403).json({ error: 'You can only manage applications for your own gigs.' });
  }

  const { status } = req.body || {};
  if (!['pending', 'accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending, accepted or declined.' });
  }

  const updated = await updateApplicationStatus(req.params.id, status);
  const label = status === 'accepted' ? 'accepted your application' : status === 'declined' ? 'declined your application' : 'updated your application';
  await createNotification({
    userId: application.musicianId,
    type: 'application',
    title: 'Application update',
    body: `${req.user.name} ${label} for ${gig.title}.`,
    link: '/dashboard',
  });

  res.json({ application: updated });
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
app.post('/api/applications/:id/checkout', requireAuth, requireRole('musician'), async (req, res) => {
  const application = await getApplicationById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  if (application.musicianId !== req.user.id) return res.status(403).json({ error: 'You can only pay for your own applications.' });
  if (application.status !== 'accepted') return res.status(400).json({ error: 'This application must be accepted before payment.' });
  if (!application.gig) return res.status(404).json({ error: 'The gig is no longer available.' });

  const amount = application.gig.fee.amount;
  const currency = application.gig.fee.currency;

  const payment = await createPayment({
    applicationId: application.id,
    gigId: application.gig.id,
    payerId: req.user.id,
    amount,
    currency,
    provider: 'mock',
  });

  res.status(201).json({ payment, amount, currency });
});

app.post('/api/payments/:id/confirm', requireAuth, async (req, res) => {
  const payments = await listPaymentsForUser(req.user);
  const payment = payments.find((p) => p.id === req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  if (payment.payerId !== req.user.id) return res.status(403).json({ error: 'You can only confirm your own payments.' });

  const paid = await markPaymentPaid(payment.id);
  const application = await getApplicationById(payment.applicationId);
  if (application?.gig?.hostId) {
    await createNotification({
      userId: application.gig.hostId,
      type: 'payment',
      title: 'Payment received',
      body: `${req.user.name} completed the booking fee for ${application.gig.title}.`,
      link: '/dashboard',
    });
  }
  await createNotification({
    userId: req.user.id,
    type: 'payment',
    title: 'Payment confirmed',
    body: `Your booking fee for ${application?.gig?.title || 'the gig'} was confirmed.`,
    link: '/dashboard',
  });
  res.json({ payment: paid });
});

app.get('/api/payments/my', requireAuth, async (req, res) => {
  const payments = await listPaymentsForUser(req.user);
  res.json({ payments });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
app.get('/api/notifications', requireAuth, async (req, res) => {
  const notifications = await listNotifications(req.user.id);
  res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
});

app.post('/api/notifications/read', requireAuth, async (req, res) => {
  await markNotificationsRead(req.user.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Static frontend (production build)
// ---------------------------------------------------------------------------
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
initDb()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`\niConnect server running at http://${HOST}:${PORT}`);
      console.log(`  API:         http://localhost:${PORT}/api`);
      console.log(`  Database:    ${process.env.DATABASE_URL ? 'PostgreSQL (DATABASE_URL)' : 'SQLite (data/iconnect.sqlite)'}`);
      console.log(`  Uploads:     /uploads`);
      console.log('  Demo login:  ayo@example.com / password123  (musician)');
      console.log('               chidi@example.com / password123  (organizer)\n');
    });
  })
  .catch((error) => {
    console.error('Could not initialize database:', error);
    process.exit(1);
  });
