import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { formatMoney, timeAgo } from '../lib';

export default function MusicianProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [musician, setMusician] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/musicians/${id}`), api.get(`/reviews/user/${id}`)])
      .then(([data, rev]) => {
        setMusician(data.musician);
        setReviews(rev.reviews || []);
        setAverage(rev.average);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
          <div className="alert success" style={{ marginTop: 14 }}>
            💡 Pro tip: organizers reach musicians by posting a gig with clear details.
          </div>
        </div>
      </div>

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
