import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib';

function localDateTimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Availability() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', startAt: '', endAt: '', status: 'available', note: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function load() {
    return api.get(`/musicians/${user.id}/availability`).then((d) => setBlocks(d.availability));
  }

  useEffect(() => {
    setLoading(true);
    load().catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.startAt || !form.endAt) {
      setMessage({ type: 'error', text: 'Choose a start and end time.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/musicians/${user.id}/availability`, form);
      setForm({ title: '', startAt: '', endAt: '', status: 'available', note: '' });
      await load();
      setMessage({ type: 'success', text: 'Availability added.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.del(`/availability/${id}`);
      setBlocks((b) => b.filter((x) => x.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="page container">
      <h1 className="page-title">Availability</h1>
      <p className="page-subtitle">Let organizers know when you are free to perform.</p>

      <div className="detail-grid" style={{ gridTemplateColumns: '1fr 380px' }}>
        <div>
          <div className="detail-card">
            <h3 className="section-title">Upcoming availability</h3>
            {loading ? (
              <div className="loader">Loading…</div>
            ) : blocks.length === 0 ? (
              <div className="empty">No availability published yet. Add a block on the right.</div>
            ) : (
              <div className="grid">
                {blocks.map((b) => (
                  <div key={b.id} className="card" style={{ background: 'var(--bg-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{b.title || (b.status === 'available' ? 'Available' : 'Unavailable')}</div>
                        <div className="muted" style={{ fontSize: 14 }}>
                          {formatDate(b.startAt)} · {new Date(b.startAt).toTimeString().slice(0, 5)} → {new Date(b.endAt).toTimeString().slice(0, 5)}
                        </div>
                        {b.note && <div className="muted" style={{ fontSize: 13 }}>{b.note}</div>}
                      </div>
                      <span className={`badge ${b.status === 'unavailable' ? 'brand' : 'success'}`}>
                        {b.status === 'unavailable' ? 'Unavailable' : 'Available'}
                      </span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button className="btn small" onClick={() => handleDelete(b.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="detail-card">
          <h3 className="section-title">Add a block</h3>
          {message && <div className={`alert ${message.type}`}>{message.text}</div>}
          <form className="form-stack" onSubmit={handleAdd}>
            <label>Label (optional) <input value={form.title} onChange={update('title')} placeholder="e.g. Festival slots, Weekend free" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>Starts <input type="datetime-local" value={form.startAt} onChange={update('startAt')} /></label>
              <label>Ends <input type="datetime-local" value={form.endAt} onChange={update('endAt')} /></label>
            </div>
            <label>Status
              <select value={form.status} onChange={update('status')}>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
            <label>Note (optional) <textarea value={form.note} onChange={update('note')} /></label>
            <button className="btn primary" disabled={saving}>{saving ? 'Adding…' : 'Add block'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
