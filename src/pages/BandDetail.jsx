import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { timeAgo } from '../lib';

export default function BandDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [band, setBand] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [follow, setFollow] = useState({ following: false, count: 0 });
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    const tasks = [api.get(`/bands/${id}`), api.get('/community/posts')];
    if (user) tasks.push(api.get(`/follows/status/band/${id}`));
    Promise.all(tasks)
      .then(([b, feed, f]) => {
        setBand(b.band);
        setMembers(b.members || []);
        setPosts((feed.posts || []).filter((p) => p.bandId === id));
        if (f) setFollow({ following: f.following, count: f.count });
        setMyMembership((b.members || []).find((m) => m.userId === user?.id) || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    try {
      const data = await api.post(`/follows/band/${id}`);
      setFollow({ following: data.following, count: data.count });
    } catch { /* ignore */ }
  }

  async function join() {
    try {
      await api.post(`/bands/${id}/join`);
      setMessage({ type: 'success', text: 'Join request sent to the band owner.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function manage(action, userId) {
    try {
      await api.post(`/bands/${id}/members/${userId}/${action}`);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  if (loading) return <div className="page container"><div className="loader">Loading band…</div></div>;
  if (!band) {
    return (
      <div className="page container">
        <div className="empty">Band not found.</div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/bands" className="btn">Back to bands</Link></div>
      </div>
    );
  }

  const isOwner = user?.id === band.ownerId;

  return (
    <div className="page container">
      <Link to="/bands" className="muted" style={{ fontSize: 14 }}>← All bands</Link>

      <div className="detail-grid" style={{ marginTop: 16 }}>
        <div className="detail-card">
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            {band.photoUrl
              ? <img src={band.photoUrl} alt="" className="avatar" style={{ width: 76, height: 76, objectFit: 'cover' }} />
              : <Avatar name={band.name} size={76} />}
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{band.name}</h1>
              <div className="muted">{band.genre || 'Musicians'} {band.location && `· ${band.location}`}</div>
            </div>
          </div>

          <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>{band.description || 'No description yet.'}</p>
          <div className="muted" style={{ fontSize: 14 }}>👥 {band.memberCount} members · {follow.count} followers</div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button className={`btn ${follow.following ? '' : 'primary'}`} onClick={toggleFollow}>{follow.following ? 'Following ✓' : '+ Follow'}</button>
            {user && !myMembership && !isOwner && <button className="btn" onClick={join}>Request to join</button>}
            {isOwner && <Link to="/community" className="btn primary">Post an update</Link>}
          </div>
          {message && <div className={`alert ${message.type}`} style={{ marginTop: 14 }}>{message.text}</div>}
        </div>

        <div className="detail-card">
          <h3 className="section-title">Members</h3>
          {members.length === 0 ? (
            <div className="muted">No members yet.</div>
          ) : (
            <div className="grid" style={{ gap: 8 }}>
              {members.map((m) => (
                <div key={m.userId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
                  <Avatar name={m.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <span className={`badge ${m.status === 'active' ? 'success' : 'warn'}`} style={{ fontSize: 11 }}>{m.status === 'active' ? m.role : 'pending'}</span>
                  </div>
                  {isOwner && m.userId !== band.ownerId && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {m.status === 'pending' && <button className="btn small" onClick={() => manage('accept', m.userId)}>Accept</button>}
                      <button className="btn small" style={{ color: 'var(--danger)' }} onClick={() => manage('remove', m.userId)}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="detail-card" style={{ marginTop: 24 }}>
        <h3 className="section-title">Band updates</h3>
        {posts.length === 0 ? (
          <div className="empty">No updates from this band yet.</div>
        ) : (
          <div className="grid">
            {posts.map((p) => (
              <div key={p.id} className="card" style={{ background: 'var(--bg-soft)' }}>
                {p.title && <strong>{p.title}</strong>}
                <p style={{ margin: '6px 0' }}>{p.body}</p>
                <div className="muted" style={{ fontSize: 13 }}>{p.type === 'recruit' ? 'Recruiting' : 'Update'} · {p.location || '—'} · {timeAgo(p.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
