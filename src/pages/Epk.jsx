import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import { EmptyState, LoadError, Loader } from '../components/LoadState';
import { formatMoney } from '../lib';

export default function Epk() {
  const { id } = useParams();
  const [epk, setEpk] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/musicians/${id}/epk`)
      .then((data) => {
        if (!active) return;
        setEpk(data.epk);
        setText(data.text || '');
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

  async function copyEpk() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadEpk() {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(epk?.name || 'musician').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-epk.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  }

  if (loading) return <div className="page container epk-page"><Loader>Loading EPK…</Loader></div>;
  if (error) return <div className="page container epk-page"><LoadError what="this EPK" error={error} onRetry={() => window.location.reload()} /></div>;
  if (!epk) {
    return (
      <div className="page container epk-page">
        <EmptyState
          title="EPK not found"
          message="This musician may not have published an EPK yet."
          action={<Link to="/musicians" className="btn">Back to musicians</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page container detail-page epk-page">
      <Link to={`/musicians/${id}`} className="detail-back-link">← Back to profile</Link>

      <article className="epk-sheet">
        <header className="epk-header">
          <div className="epk-identity">
            {epk.photoUrl
              ? <img src={epk.photoUrl} alt="" className="avatar epk-avatar" />
              : <Avatar name={epk.name} size={88} />}
            <div>
              <p className="section-eyebrow">Electronic press kit</p>
              <h1 className="page-title">{epk.name}</h1>
              <p className="epk-headline">{epk.headline || 'Musician'} {epk.location && `· ${epk.location}`}</p>
            </div>
          </div>
          <div className="epk-actions" aria-live="polite">
            <button className="btn primary" onClick={copyEpk}>{copied ? 'Copied ✓' : 'Copy EPK text'}</button>
            <button className="btn" onClick={downloadEpk}>{downloaded ? 'Downloaded ✓' : 'Download .txt'}</button>
            <a className="btn" href={`/api/musicians/${id}/epk.txt`} target="_blank" rel="noreferrer">Open raw file ↗</a>
          </div>
        </header>

        <div className="epk-grid">
          <section className="card epk-panel" aria-labelledby="epk-snapshot-title">
            <p className="section-eyebrow">At a glance</p>
            <h2 id="epk-snapshot-title" className="section-title">Snapshot</h2>
            <ul className="detail-list">
              <li><span className="k">Genre</span><span>{epk.genre || '—'}</span></li>
              <li><span className="k">Instruments</span><span>{(epk.instruments || []).join(', ') || '—'}</span></li>
              {epk.rate && epk.rate.amount > 0 && <li><span className="k">Rate</span><span>{formatMoney(epk.rate.amount, epk.rate.currency)} {epk.rate.unit}</span></li>}
              {epk.averageRating && <li><span className="k">Rating</span><span>⭐ {epk.averageRating}/5 ({epk.reviewCount} reviews)</span></li>}
            </ul>
          </section>

          <section className="card epk-panel" aria-labelledby="epk-links-title">
            <p className="section-eyebrow">Listen and learn more</p>
            <h2 id="epk-links-title" className="section-title">Demos &amp; links</h2>
            {(epk.demos || []).length ? (
              <div className="epk-links">
                {epk.demos.map((demo) => (
                  <a key={demo.title} href={demo.url} target="_blank" rel="noreferrer" className="btn small block">
                    {demo.type === 'audio' ? '🎧' : '▶'} {demo.title}
                  </a>
                ))}
              </div>
            ) : <p className="muted">No demos have been added yet.</p>}
            {epk.socials && (
              <div className="epk-socials">
                {epk.socials.instagram && <a className="badge" href={epk.socials.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}
                {epk.socials.youtube && <a className="badge" href={epk.socials.youtube} target="_blank" rel="noreferrer">YouTube ↗</a>}
                {epk.socials.website && <a className="badge" href={epk.socials.website} target="_blank" rel="noreferrer">Website ↗</a>}
              </div>
            )}
          </section>
        </div>
      </article>
    </div>
  );
}
