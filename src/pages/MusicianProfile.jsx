import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney, timeAgo } from '../lib';

export default function MusicianProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [musician, setMusician] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/musicians/${id}`), api.get(`/reviews/user/${id}`), api.get(`/musicians/${id}/availability`), api.get(`/musicians/${id}/demos`)])
      .then(([data, rev, avail, dem]) => {
        setMusician(data.musician);
        setReviews(rev.reviews || []);
        setAverage(rev.average);
        setAvailability(avail.availability || []);
        setDemos(dem.demos || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function submitReport(e) {
    e.preventDefault();
    setSavingReport(true);
    setReportMsg(null);
    try {
      await api.post('/reports', { targetType: 'user', targetId: id, reason, details });
      setReportOpen(false);
      setReason('');
      setDetails('');
    } catch (err) {
      setReportMsg({ type: 'error', text: err.message });
    } finally {
      setSavingReport(false);
    }
  }

  if (loading) return <div className="page container"><div className="loader">Loading profile…</div></div>;
  if (!musician) {
    return (
      <div className="page container">
        <div className="empty">Musician not found.</div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/musicians" className="btn">Back to musicians</Link></div>
      </div>
    );
  }

  return (
    <div className="page container">
      <Link to="/musicians" className="muted" style={{ fontSize: 14 }}>← All musicians</Link>

      <div className="detail-grid" style={{ marginTop: 16 }}>
        <div className="detail-card">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            {musician.photoUrl
              ? <img src={musician.photoUrl} alt="" className="avatar" style={{ width: 76, height: 76, objectFit: 'cover' }} />
              : <Avatar name={musician.name} size={76} />}
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{musician.name}</h1>
              <div className="muted">{musician.title || 'Musician'} {musician.location && `· ${musician.location}`}</div>
            </div>
          </div>

          <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>{musician.bio || 'No bio yet.'}</p>

          <div style={{ marginTop: 20 }}>
            <h3 className="section-title">Details</h3>
            <ul className="detail-list">
              <li><span className="k">Genre</span><span>{musician.genre || '—'}</span></li>
              <li><span className="k">Location</span><span>{musician.location || '—'}</span></li>
              <li><span className="k">Experience</span><span>{musician.yearsExperience ? `${musician.yearsExperience} years` : '—'}</span></li>
              <li><span className="k">Availability</span><StatusBadge status={musician.availability === 'open' ? 'open' : 'closed'} /></li>
              {musician.rate?.amount > 0 && (
                <li><span className="k">Rate</span><span>{formatMoney(musician.rate.amount, musician.rate.currency)}</span></li>
              )}
            </ul>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 className="section-title">Instruments</h3>
            <div className="instrument-list">
              {(musician.instruments || []).map((i) => <span key={i} className="tag">{i}</span>)}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <h3 className="section-title">Tags</h3>
            <div>
              {(musician.tags || []).map((t) => <span key={t} className="badge" style={{ margin: '2px 6px 2px 0' }}>{t}</span>)}
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3 className="section-title">Contact & media</h3>
          <p className="muted">To book this musician, post a gig or send an application through iConnect.</p>

          {musician.epkUrl && (
            <a href={musician.epkUrl} target="_blank" rel="noreferrer" className="btn small block" style={{ marginBottom: 10 }}>View EPK / media kit ↗</a>
          )}
          {musician.socials && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {musician.socials.instagram && <a className="badge" href={musician.socials.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}
              {musician.socials.youtube && <a className="badge" href={musician.socials.youtube} target="_blank" rel="noreferrer">YouTube ↗</a>}
              {musician.socials.website && <a className="badge" href={musician.socials.website} target="_blank" rel="noreferrer">Website ↗</a>}
            </div>
          )}

          <Link to="/gigs" className="btn primary block" style={{ marginTop: 14 }}>Browse open gigs</Link>
          {user && user.id !== musician.id && (
            <Link to={`/messages?to=${musician.id}`} className="btn block" style={{ marginTop: 10 }}>💬 Message</Link>
          )}
          {user && user.id !== musician.id && (
            <button className="btn ghost block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={() => setReportOpen(true)}>Report profile</button>
          )}
          <div className="alert success" style={{ marginTop: 14 }}>
            💡 Pro tip: organizers reach musicians by posting a gig with clear details.
          </div>
        </div>
      </div>

      {demos.length > 0 && (
        <div className="detail-card" style={{ marginTop: 24 }}>
          <h3 className="section-title">Audio & video demos</h3>
          <div className="grid grid-2">
            {demos.map((d) => (
              <div key={d.id} className="card" style={{ background: 'var(--bg-soft)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{d.title || d.type}</div>
                {d.type === 'audio'
                  ? <audio controls src={d.url} style={{ width: '100%' }} />
                  : <a href={d.url} target="_blank" rel="noreferrer" className="btn small">▶ Play / open video</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {availability.length > 0 && (
        <div className="detail-card" style={{ marginTop: 24 }}>
          <h3 className="section-title">Upcoming availability</h3>
          <div className="grid">
            {availability.map((b) => (
              <div key={b.id} className="card" style={{ background: 'var(--bg-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <strong>{b.title || (b.status === 'available' ? 'Available' : 'Unavailable')}</strong>
                    <div className="muted">{formatDate(b.startAt)} · {new Date(b.startAt).toTimeString().slice(0, 5)} → {new Date(b.endAt).toTimeString().slice(0, 5)}</div>
                  </div>
                  <span className={`badge ${b.status === 'unavailable' ? 'brand' : 'success'}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this profile">
        <form className="form-stack" onSubmit={submitReport}>
          <label>Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="">Choose a reason…</option>
              <option value="Spam or scam">Spam or scam</option>
              <option value="Fake profile">Fake profile</option>
              <option value="Inappropriate content">Inappropriate content</option>
              <option value="Misrepresentation">Misrepresentation</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label>Details
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Explain what is wrong (optional)." />
          </label>
          {reportMsg && <div className={`alert ${reportMsg.type}`}>{reportMsg.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn" onClick={() => setReportOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={savingReport}>{savingReport ? 'Sending…' : 'Submit report'}</button>
          </div>
        </form>
      </Modal>

      {(reviews.length > 0 || average) && (
        <div className="detail-card" id="reviews" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Reviews</h3>
            {average && <span className="badge brand">⭐ {average} / 5</span>}
          </div>
          <div className="grid" style={{ marginTop: 18 }}>
            {reviews.map((r) => (
              <div key={r.id} className="card" style={{ background: 'var(--bg-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong>{'⭐'.repeat(r.rating)}</strong>
                  <span className="faint" style={{ fontSize: 13 }}>{timeAgo(r.createdAt)}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>by {r.reviewer?.name || 'Someone'}</div>
                {r.comment && <p style={{ marginBottom: 0 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
