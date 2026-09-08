import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: '',
    title: '',
    bio: '',
    location: '',
    genre: '',
    instruments: '',
    tags: '',
    yearsExperience: 0,
    availability: 'open',
  });
  const [rate, setRate] = useState({ amount: 0, currency: 'NGN', unit: 'per gig' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      title: user.title || '',
      bio: user.bio || '',
      location: user.location || '',
      genre: user.genre || '',
      instruments: (user.instruments || []).join(', '),
      tags: (user.tags || []).join(', '),
      yearsExperience: user.yearsExperience || 0,
      availability: user.availability || 'open',
    });
    setRate({
      currency: user.rate?.currency || 'NGN',
      amount: user.rate?.amount || 0,
      unit: user.rate?.unit || 'per gig',
    });
  }, [user]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = {
      name: form.name,
      title: form.title,
      bio: form.bio,
      location: form.location,
      genre: form.genre,
      availability: form.availability,
      yearsExperience: Number(form.yearsExperience) || 0,
      instruments: form.instruments.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      rate,
    };
    try {
      await api.put(`/musicians/${user.id}`, payload);
      await refresh();
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page container">
      <div className="form-wrap" style={{ maxWidth: 720 }}>
        <h1 className="page-title">Your profile</h1>
        <p className="page-subtitle">Make it easy for organizers to discover and book you.</p>

        <form className="form-card form-stack" onSubmit={handleSubmit}>
          <label>Name
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label>Headline / title
            <input value={form.title} onChange={update('title')} placeholder="e.g. Saxophonist · Session & Live" />
          </label>
          <label>Bio
            <textarea value={form.bio} onChange={update('bio')} placeholder="Tell us about your sound, experience and style." />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label>Location
              <input value={form.location} onChange={update('location')} placeholder="e.g. Lagos, Nigeria" />
            </label>
            <label>Genre
              <input value={form.genre} onChange={update('genre')} placeholder="e.g. Jazz / Afrobeat" />
            </label>
            <label>Years of experience
              <input type="number" min="0" value={form.yearsExperience} onChange={update('yearsExperience')} />
            </label>
          </div>

          <label>Instruments (comma separated)
            <input value={form.instruments} onChange={update('instruments')} placeholder="Saxophone, Flute" />
          </label>
          <label>Tags (comma separated)
            <input value={form.tags} onChange={update('tags')} placeholder="Jazz, Studio sessions, Festival" />
          </label>

          {user?.role === 'musician' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <label>Rate (amount)
                <input type="number" min="0" value={rate.amount} onChange={(e) => setRate((r) => ({ ...r, amount: Number(e.target.value) }))} />
              </label>
              <label>Currency
                <select value={rate.currency} onChange={(e) => setRate((r) => ({ ...r, currency: e.target.value }))}>
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              <label>Unit
                <select value={rate.unit} onChange={(e) => setRate((r) => ({ ...r, unit: e.target.value }))}>
                  <option value="per gig">per gig</option>
                  <option value="per hour">per hour</option>
                  <option value="per day">per day</option>
                </select>
              </label>
            </div>
          )}

          <label>Availability
            <select value={form.availability} onChange={update('availability')}>
              <option value="open">Open to bookings</option>
              <option value="closed">Not available</option>
            </select>
          </label>

          {message && <div className={`alert ${message.type}`}>{message.text}</div>}
          <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  );
}
