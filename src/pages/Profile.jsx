import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, uploadFile } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

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
    instagram: '',
    youtube: '',
    website: '',
  });
  const [rate, setRate] = useState({ amount: 0, currency: 'NGN', unit: 'per gig' });
  const [photoUrl, setPhotoUrl] = useState('');
  const [epkUrl, setEpkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user) return;
    const socials = user.socials || {};
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
      instagram: socials.instagram || '',
      youtube: socials.youtube || '',
      website: socials.website || '',
    });
    setRate({
      currency: user.rate?.currency || 'NGN',
      amount: user.rate?.amount || 0,
      unit: user.rate?.unit || 'per gig',
    });
    setPhotoUrl(user.photoUrl || '');
    setEpkUrl(user.epkUrl || '');
  }, [user]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleUpload(e, kind) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind);
    setMessage(null);
    try {
      const data = await uploadFile(file, kind);
      if (kind === 'photo') setPhotoUrl(data.url);
      else setEpkUrl(data.url);
      setMessage({ type: 'success', text: `${kind === 'photo' ? 'Photo' : 'EPK'} uploaded. Click Save profile to publish.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading('');
      e.target.value = '';
    }
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
      photoUrl,
      epkUrl,
      socials: {
        instagram: form.instagram,
        youtube: form.youtube,
        website: form.website,
      },
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
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          {photoUrl ? <img src={photoUrl} alt="" className="avatar" style={{ width: 76, height: 76, objectFit: 'cover' }} /> : <Avatar name={form.name || '?'} size={76} />}
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{form.name || 'Your profile'}</h1>
            <div className="muted">Make it easy for organizers to discover and book you.</div>
          </div>
        </div>

        <form className="form-card form-stack" onSubmit={handleSubmit}>
          {message && <div className={`alert ${message.type}`}>{message.text}</div>}

          <label>Name <input value={form.name} onChange={update('name')} required /></label>
          <label>Headline / title <input value={form.title} onChange={update('title')} placeholder="e.g. Saxophonist · Session & Live" /></label>
          <label>Bio <textarea value={form.bio} onChange={update('bio')} placeholder="Tell us about your sound, experience and style." /></label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label>Location <input value={form.location} onChange={update('location')} placeholder="e.g. Lagos, Nigeria" /></label>
            <label>Genre <input value={form.genre} onChange={update('genre')} placeholder="e.g. Jazz / Afrobeat" /></label>
            <label>Years of experience <input type="number" min="0" value={form.yearsExperience} onChange={update('yearsExperience')} /></label>
          </div>

          <label>Instruments (comma separated) <input value={form.instruments} onChange={update('instruments')} placeholder="Saxophone, Flute" /></label>
          <label>Tags (comma separated) <input value={form.tags} onChange={update('tags')} placeholder="Jazz, Studio sessions, Festival" /></label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <label className="upload-box">
              Profile photo
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'photo')} disabled={!!uploading} />
              <span className="muted" style={{ fontSize: 13 }}>
                {uploading === 'photo' ? 'Uploading…' : photoUrl ? <a href={photoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>View current photo ↗</a> : 'Upload an image'}
              </span>
            </label>
            <label className="upload-box">
              EPK / media kit
              <input type="file" accept="application/pdf,image/*,application/zip,audio/*" onChange={(e) => handleUpload(e, 'epk')} disabled={!!uploading} />
              <span className="muted" style={{ fontSize: 13 }}>
                {uploading === 'epk' ? 'Uploading…' : epkUrl ? <a href={epkUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>View uploaded EPK ↗</a> : 'Upload PDF / ZIP / audio'}
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <label>Instagram <input value={form.instagram} onChange={update('instagram')} placeholder="https://instagram.com/…" /></label>
            <label>YouTube <input value={form.youtube} onChange={update('youtube')} placeholder="https://youtube.com/…" /></label>
            <label>Website <input value={form.website} onChange={update('website')} placeholder="https://…" /></label>
          </div>

          {user?.role === 'musician' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <label>Rate (amount) <input type="number" min="0" value={rate.amount} onChange={(e) => setRate((r) => ({ ...r, amount: Number(e.target.value) }))} /></label>
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

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" disabled={saving || !!uploading}>{saving ? 'Saving…' : 'Save profile'}</button>
            <Link to="/dashboard" className="btn">Go to dashboard</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
