import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import { formatMoney } from '../lib';

export default function Epk() {
  const { id } = useParams();
  const [epk, setEpk] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/musicians/${id}/epk`)
      .then((d) => { setEpk(d.epk); setText(d.text); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function copyEpk() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadEpk() {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(epk?.name || 'musician').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-epk.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  }

  if (loading) return <div className="page container"><div className="loader">Loading EPK…</div></div>;
  if (!epk) {
    return (
      <div className="page container">
        <div className="empty">EPK not found.</div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/musicians" className="btn">Back to musicians</Link></div>
      </div>
    );
  }

  return (
    <div className="page container">
      <Link to={`/musicians/${id}`} className="muted" style={{ fontSize: 14 }}>← Back to profile</Link>

      <div className="detail-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {epk.photoUrl ? <img src={epk.photoUrl} alt="" className="avatar" style={{ width: 76, height: 76, objectFit: 'cover' }} /> : <Avatar name={epk.name} size={76} />}
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{epk.name}</h1>
            <div className="muted">{epk.headline || 'Musician'} {epk.location && `· ${epk.location}`}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <button className="btn primary" onClick={copyEpk}>{copied ? 'Copied ✓' : 'Copy EPK text'}</button>
          <button className="btn" onClick={downloadEpk}>{downloaded ? 'Downloaded ✓' : 'Download .txt'}</button>
          <a className="btn" href={`/api/musicians/${id}/epk.txt`} target="_blank" rel="noreferrer">Open raw file ↗</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 22 }}>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <h3 className="section-title">Snapshot</h3>
            <ul className="detail-list">
              <li><span className="k">Genre</span><span>{epk.genre || '—'}</span></li>
              <li><span className="k">Instruments</span><span>{(epk.instruments || []).join(', ') || '—'}</span></li>
              {epk.rate && epk.rate.amount > 0 && <li><span className="k">Rate</span><span>{formatMoney(epk.rate.amount, epk.rate.currency)} {epk.rate.unit}</span></li>}
              {epk.averageRating && <li><span className="k">Rating</span><span>⭐ {epk.averageRating}/5 ({epk.reviewCount} reviews)</span></li>}
            </ul>
          </div>
          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <h3 className="section-title">Demos & links</h3>
            {(epk.demos || []).map((d) => (
              <a key={d.title} href={d.url} target="_blank" rel="noreferrer" className="btn small block" style={{ marginBottom: 8 }}>{d.type === 'audio' ? '🎧' : '▶'} {d.title}</a>
            ))}
            {epk.socials && (
              <div style={{ marginTop: 10 }}>
                {epk.socials.instagram && <a className="badge" href={epk.socials.instagram} target="_blank" rel="noreferrer">Instagram ↗</a>}
                {epk.socials.youtube && <a className="badge" href={epk.socials.youtube} target="_blank" rel="noreferrer">YouTube ↗</a>}
                {epk.socials.website && <a className="badge" href={epk.socials.website} target="_blank" rel="noreferrer">Website ↗</a>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
