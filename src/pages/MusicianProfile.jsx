import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib';

export default function MusicianProfile() {
  const { id } = useParams();
  const [musician, setMusician] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/musicians/${id}`)
      .then((data) => setMusician(data.musician))
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
            <Avatar name={musician.name} size={76} />
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
          <h3 className="section-title">Contact</h3>
          <p className="muted">To book this musician, post a gig or send an application through iConnect.</p>
          <Link to="/gigs" className="btn primary block">Browse open gigs</Link>
          <div className="alert success" style={{ marginTop: 14 }}>
            💡 Pro tip: organizers reach musicians by posting a gig with clear details.
          </div>
        </div>
      </div>
    </div>
  );
}
