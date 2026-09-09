import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function Venues() {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', description: '', location: '', capacity: '', amenities: '', website: '', phone: '', contactEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (location) params.set('location', location);
    setLoading(true);
    api.get(`/venues${params.size ? `?${params}` : ''}`)
      .then((d) => setVenues(d.venues))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [q, location]);

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/venues', form);
      setForm({ name: '', type: '', description: '', location: '', capacity: '', amenities: '', website: '', phone: '', contactEmail: '' });
      setCreateOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page container">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Venues & events</h1>
          <p className="page-subtitle">Discover the spaces where live music happens across our community.</p>
        </div>
        {user?.role === 'organizer' && <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Add a venue</button>}
      </div>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search venues…" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Lagos)" />
      </div>

      {loading ? (
        <div className="loader">Loading venues…</div>
      ) : venues.length === 0 ? (
        <div className="empty">No venues found yet.</div>
      ) : (
        <div className="grid grid-3">
          {venues.map((venue) => (
            <Link key={venue.id} to={`/venues/${venue.id}`}>
              <div className="card pointer">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {venue.photoUrl
                    ? <img src={venue.photoUrl} alt="" className="avatar" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                    : <Avatar name={venue.name} size={50} />}
                  <div>
                    <h3 style={{ margin: 0 }}>{venue.name}</h3>
                    <div className="muted" style={{ fontSize: 13 }}>{venue.type || 'Venue'} · {venue.location}</div>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 14 }}>{venue.description || 'No description yet.'}</p>
                <div className="muted" style={{ fontSize: 13 }}>🎤 {venue.gigCount} gig{venue.gigCount === 1 ? '' : 's'} {venue.capacity ? `· capacity ${venue.capacity}` : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a venue">
        <form className="form-stack" onSubmit={create}>
          <label>Name <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>Type <input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Live music venue" /></label>
            <label>Location <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} required /></label>
          </div>
          <label>Description <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>Capacity <input type="number" min="0" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} /></label>
            <label>Amenities <input value={form.amenities} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} placeholder="Sound, stage, bar" /></label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>Website <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></label>
            <label>Phone <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
          </div>
          <label>Contact email <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} /></label>
          {error && <div className="alert error">{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={saving}>{saving ? 'Adding…' : 'Add venue'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
