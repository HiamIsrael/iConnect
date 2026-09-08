import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatDate, formatMoney, timeAgo } from '../lib';

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    const tasks = [api.get('/applications/my')];
    if (user?.role === 'organizer') tasks.push(api.get('/gigs'));
    Promise.all(tasks)
      .then(([apps, g]) => {
        setApplications(apps.applications);
        if (g) setGigs(g.gigs.filter((gig) => gig.hostId === user.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, refreshKey]);

  async function changeStatus(appId, status) {
    try {
      await api.put(`/applications/${appId}`, { status });
      setRefreshKey((k) => k + 1);
    } catch {
      // no-op
    }
  }

  if (loading) return <div className="page container"><div className="loader">Loading dashboard…</div></div>;

  const pending = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="page container">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div>
          <h1 className="page-title">{user.role === 'organizer' ? 'Organizer dashboard' : 'Musician dashboard'}</h1>
          <p className="page-subtitle">Welcome back, {user.name}.</p>
        </div>
        {user.role === 'organizer' && (
          <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Post a gig</button>
        )}
      </div>

      <div className="stats" style={{ marginTop: 8 }}>
        <div className="stat"><div className="num">{applications.length}</div><div className="label">{user.role === 'organizer' ? 'Total applications' : 'Applications sent'}</div></div>
        <div className="stat"><div className="num">{pending}</div><div className="label">Pending</div></div>
        <div className="stat"><div className="num">{user.role === 'organizer' ? gigs.length : applications.filter((a) => a.status === 'accepted').length}</div><div className="label">{user.role === 'organizer' ? 'Your gigs' : 'Accepted'}</div></div>
      </div>

      {user.role === 'organizer' && (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title">Your gigs</h2>
          {gigs.length === 0 ? (
            <div className="empty">You have not posted any gigs yet.</div>
          ) : (
            <div className="grid grid-2">
              {gigs.map((gig) => {
                const gigApps = applications.filter((a) => a.gigId === gig.id);
                return (
                  <div key={gig.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <Link to={`/gigs/${gig.id}`}><h3 style={{ margin: 0 }}>{gig.title}</h3></Link>
                      <StatusBadge status={gig.status} />
                    </div>
                    <div className="meta muted" style={{ marginTop: 6, fontSize: 14 }}>
                      {formatDate(gig.date)} · {gig.location}
                    </div>
                    <div className="muted" style={{ fontSize: 14 }}>{formatMoney(gig.fee?.amount, gig.fee?.currency)} · {gigApps.length} application{gigApps.length === 1 ? '' : 's'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section style={{ marginTop: 40 }}>
        <h2 className="section-title">{user.role === 'organizer' ? 'Applications' : 'My applications'}</h2>
        {applications.length === 0 ? (
          <div className="empty">
            {user.role === 'musician'
              ? <>You have not applied to any gigs yet. <Link to="/gigs" style={{ color: 'var(--accent)' }}>Browse gigs</Link></>
              : 'No applications yet.'}
          </div>
        ) : (
          <div className="grid">
            {applications.map((app) => (
              <div key={app.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {app.musician && <Avatar name={app.musician.name} size={44} />}
                    <div>
                      <div style={{ fontWeight: 700 }}>{user.role === 'musician' ? app.gig?.title : app.musician?.name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {user.role === 'musician' ? `${formatDate(app.gig?.date)} · ${app.gig?.location}` : `Applied to ${app.gig?.title}`}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                {app.note && !user_role_musician(user) && (
                  <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>“{app.note}”</p>
                )}
                {user.role === 'musician' && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Sent {timeAgo(app.createdAt)}</p>}

                {user.role === 'organizer' && app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button className="btn small" style={{ color: 'var(--success)' }} onClick={() => changeStatus(app.id, 'accepted')}>Accept</button>
                    <button className="btn small" style={{ color: 'var(--danger)' }} onClick={() => changeStatus(app.id, 'declined')}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {user.role === 'organizer' && (
        <CreateGigModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

function user_role_musician(user) {
  return user.role === 'musician';
}

function CreateGigModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Club / Pub',
    venue: '',
    location: '',
    date: '',
    startTime: '18:00',
    endTime: '22:00',
    feeAmount: 0,
    feeCurrency: 'NGN',
    capacity: 1,
    genre: '',
    tags: '',
    requirements: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/gigs', {
        title: form.title,
        description: form.description,
        type: form.type,
        venue: form.venue,
        location: form.location,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        fee: { amount: Number(form.feeAmount) || 0, currency: form.feeCurrency },
        capacity: Number(form.capacity) || 1,
        genre: form.genre,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        requirements: form.requirements,
      });
      setForm({
        title: '', description: '', type: 'Club / Pub', venue: '', location: '', date: '',
        startTime: '18:00', endTime: '22:00', feeAmount: 0, feeCurrency: 'NGN', capacity: 1,
        genre: '', tags: '', requirements: '',
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Post a new gig">
      <p className="muted">Share the details musicians need to decide whether to apply.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>Gig title <input value={form.title} onChange={update('title')} required /></label>
        <label>Description <textarea value={form.description} onChange={update('description')} /></label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Type
            <select value={form.type} onChange={update('type')}>
              <option>Club / Pub</option>
              <option>Festival</option>
              <option>Corporate</option>
              <option>Restaurant / Cafe</option>
              <option>Wedding</option>
              <option>Recording</option>
              <option>Church / Gospel</option>
            </select>
          </label>
          <label>Genre <input value={form.genre} onChange={update('genre')} /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Venue <input value={form.venue} onChange={update('venue')} required /></label>
          <label>Location <input value={form.location} onChange={update('location')} required /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <label>Date <input type="date" value={form.date} onChange={update('date')} required /></label>
          <label>Start <input type="time" value={form.startTime} onChange={update('startTime')} /></label>
          <label>End <input type="time" value={form.endTime} onChange={update('endTime')} /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Fee amount <input type="number" min="0" value={form.feeAmount} onChange={update('feeAmount')} /></label>
          <label>Currency
            <select value={form.feeCurrency} onChange={update('feeCurrency')}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Open spots <input type="number" min="1" value={form.capacity} onChange={update('capacity')} /></label>
          <label>Tags <input value={form.tags} onChange={update('tags')} placeholder="Jazz, Festival" /></label>
        </div>

        <label>Requirements <textarea value={form.requirements} onChange={update('requirements')} /></label>

        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving}>{saving ? 'Posting…' : 'Post gig'}</button>
        </div>
      </form>
    </Modal>
  );
}
