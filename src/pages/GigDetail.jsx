import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatDate, formatMoney, timeAgo } from '../lib';
import { EmptyState, LoadError, Loader } from '../components/LoadState';

export default function GigDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/gigs/${id}`)
      .then((data) => {
        if (active) setGig(data.gig);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleApply(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/gigs/${id}/apply`, { note, phone });
      setApplyOpen(false);
      setMessage({ type: 'success', text: 'Application sent! The organizer will be able to see it in their dashboard.' });
      setNote('');
      setPhone('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function googleCalendarUrl() {
    const date = new Date(gig.date);
    const pad = (n) => String(n).padStart(2, '0');
    const start = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(Number(gig.startTime?.slice(0, 2)))}${pad(Number(gig.startTime?.slice(3, 5)))}00`;
    const end = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(Number(gig.endTime?.slice(0, 2)))}${pad(Number(gig.endTime?.slice(3, 5)))}00`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: gig.title,
      dates: `${start}/${end}`,
      details: gig.description || '',
      location: `${gig.venue || ''}, ${gig.location || ''}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  if (loading) return <div className="page container detail-page gig-detail-page"><Loader>Loading gig…</Loader></div>;
  if (error) return <div className="page container detail-page gig-detail-page"><LoadError what="this gig" error={error} onRetry={() => window.location.reload()} /></div>;
  if (!gig) {
    return (
      <div className="page container detail-page gig-detail-page">
        <EmptyState
          title="Gig not found"
          message="This opportunity may have been filled or unpublished."
          action={<Link to="/gigs" className="btn">Back to gigs</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page container detail-page gig-detail-page">
      <Link to="/gigs" className="muted" style={{ fontSize: 14 }}>← All gigs</Link>

      <div className="detail-grid" style={{ marginTop: 16 }}>
        <div>
          <div className="detail-banner">
            <span className="detail-banner-mark" aria-hidden="true">{(gig.genre || gig.type || 'Live').slice(0, 1)}</span>
            <span className="badge brand">{gig.type}</span>
          </div>

          <div className="detail-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 className="page-title" style={{ marginBottom: 4 }}>{gig.title}</h1>
                <div className="muted">Posted {timeAgo(gig.createdAt)} · {gig.applicationCount} application{gig.applicationCount === 1 ? '' : 's'}</div>
              </div>
              <StatusBadge status={gig.status} />
            </div>

            <h3 className="section-title" style={{ marginTop: 26 }}>About this gig</h3>
            <p style={{ color: 'var(--text-muted)' }}>{gig.description || 'No description provided.'}</p>

            {gig.requirements && (
              <>
                <h3 className="section-title" style={{ marginTop: 22 }}>Requirements</h3>
                <p style={{ color: 'var(--text-muted)' }}>{gig.requirements}</p>
              </>
            )}

            {(gig.contractTerms || gig.cancellationPolicy || gig.depositPercent > 0) && (
              <div style={{ marginTop: 22 }}>
                <h3 className="section-title">Booking terms</h3>
                {gig.depositPercent > 0 && (
                  <div className="alert" style={{ marginBottom: 12 }}>
                    💳 {gig.depositPercent}% deposit of {formatMoney(gig.fee?.amount, gig.fee?.currency)} = {formatMoney(Math.round((gig.fee.amount * gig.depositPercent) / 100), gig.fee?.currency)} required to lock the booking.
                  </div>
                )}
                {gig.contractTerms && <p style={{ color: 'var(--text-muted)' }}><strong>Contract terms:</strong> {gig.contractTerms}</p>}
                {gig.cancellationPolicy && <p style={{ color: 'var(--text-muted)' }}><strong>Cancellation:</strong> {gig.cancellationPolicy}</p>}
              </div>
            )}

            {(gig.tags || []).length > 0 && (
              <div style={{ marginTop: 22 }}>
                {(gig.tags || []).map((t) => <span key={t} className="badge" style={{ margin: '2px 6px 2px 0' }}>{t}</span>)}
              </div>
            )}
          </div>
        </div>

        <div className="detail-card">
          <h3 className="section-title">Gig details</h3>
          <ul className="detail-list">
            <li><span className="k">Date</span><span>{formatDate(gig.date)}</span></li>
            <li><span className="k">Time</span><span>{gig.startTime} – {gig.endTime}</span></li>
            <li><span className="k">Venue</span><span>{gig.venue}</span></li>
            <li><span className="k">Location</span><span>{gig.location}</span></li>
            <li><span className="k">Genre</span><span>{gig.genre || '—'}</span></li>
            <li><span className="k">Fee</span><span className="fee">{formatMoney(gig.fee?.amount, gig.fee?.currency)}</span></li>
            <li><span className="k">Open spots</span><span>{gig.capacity}</span></li>
            <li><span className="k">Host</span><span>{gig.hostName}</span></li>
          </ul>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            <a className="btn small" href={googleCalendarUrl()} target="_blank" rel="noreferrer">📅 Google Calendar</a>
            <a className="btn small" href={`/api/gigs/${gig.id}/calendar.ics`}>⬇ Download .ics</a>
          </div>

          {message && <div className={`alert ${message.type}`}>{message.text}</div>}

          {user?.role === 'musician' ? (
            gig.status === 'open'
              ? <button className="btn primary block" onClick={() => setApplyOpen(true)}>Apply to this gig</button>
              : <button className="btn block" disabled>Applications closed</button>
          ) : user?.role === 'organizer' ? (
            <Link to="/dashboard" className="btn block">Manage your gigs</Link>
          ) : (
            <>
              <button className="btn primary block" onClick={() => navigate(`/signup?next=${encodeURIComponent(location.pathname)}&role=musician`)}>Join as a musician to apply</button>
              <div className="muted" style={{ fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                Organizers manage gigs from their dashboard.
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply to this gig">
        <p className="muted">Tell the organizer a little about what you can bring to {gig.title}.</p>
        <form className="form-stack" onSubmit={handleApply}>
          <label>Phone (optional)
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +234 800 000 0000" />
          </label>
          <label>Your pitch
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Experience, repertoire, availability, links…" required />
          </label>
          {message && <div className={`alert ${message.type}`}>{message.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn" onClick={() => setApplyOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send application'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
