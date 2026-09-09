import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function Bands() {
  const { user } = useAuth();
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', genre: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (genre) params.set('genre', genre);
    if (location) params.set('location', location);
    setLoading(true);
    api.get(`/bands${params.size ? `?${params}` : ''}`)
      .then((d) => setBands(d.bands))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [q, genre, location]);

  async function create(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/bands', form);
      setForm({ name: '', description: '', genre: '', location: '' });
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
          <h1 className="page-title">Bands & collectives</h1>
          <p className="page-subtitle">Find your band, grow your collective, and recruit musicians.</p>
        </div>
        {user && <button className="btn primary" onClick={() => setCreateOpen(true)}>+ Create a band</button>}
      </div>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bands…" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (e.g. Afrobeat)" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Lagos)" />
      </div>

      {loading ? (
        <div className="loader">Loading bands…</div>
      ) : bands.length === 0 ? (
        <div className="empty">No bands found. Create the first one!</div>
      ) : (
        <div className="grid grid-3">
          {bands.map((band) => (
            <Link key={band.id} to={`/bands/${band.id}`}>
              <div className="card pointer">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {band.photoUrl
                    ? <img src={band.photoUrl} alt="" className="avatar" style={{ width: 52, height: 52, objectFit: 'cover' }} />
                    : <Avatar name={band.name} size={52} />}
                  <div>
                    <h3 style={{ margin: 0 }}>{band.name}</h3>
                    <div className="muted" style={{ fontSize: 13 }}>{band.genre || 'Genre'} · {band.location || '—'}</div>
                  </div>
                </div>
                <p className="bio" style={{ color: 'var(--text-muted)', fontSize: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {band.description || 'No description yet.'}
                </p>
                <div className="muted" style={{ fontSize: 13 }}>👥 {band.memberCount} member{band.memberCount === 1 ? '' : 's'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a band">
        <form className="form-stack" onSubmit={create}>
          <label>Band name <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></label>
          <label>Genre <input value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} /></label>
          <label>Location <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></label>
          <label>Description <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          {error && <div className="alert error">{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create band'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
