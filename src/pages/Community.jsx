import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { timeAgo } from '../lib';

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('all'); // all | recruit | following
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [composer, setComposer] = useState({
    type: 'post', title: '', body: '', link: '', topic: '', genre: '', location: '', instrument: '', bandId: '',
  });
  const [myBands, setMyBands] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingComment, setPendingComment] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (mode !== 'all') params.set('type', mode);
    if (mode === 'following') params.set('following', 'true');
    if (q) params.set('q', q);
    if (genre) params.set('genre', genre);
    setLoading(true);
    api.get(`/community/posts${params.size ? `?${params}` : ''}`)
      .then((d) => setPosts(d.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode, q, genre]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (user) api.get('/bands/mine').then((d) => setMyBands(d.bands)).catch(() => {});
  }, [user]);

  async function toggleLike(post) {
    try {
      await api.post(`/community/posts/${post.id}/like`);
      load();
    } catch { /* ignore */ }
  }

  async function openThread(post) {
    if (openComments[post.id]) {
      setOpenComments((o) => ({ ...o, [post.id]: false }));
      return;
    }
    try {
      const data = await api.get(`/community/posts/${post.id}`);
      setComments((c) => ({ ...c, [post.id]: data.comments }));
      setOpenComments((o) => ({ ...o, [post.id]: true }));
    } catch { /* ignore */ }
  }

  async function submitComment(post, e) {
    e.preventDefault();
    const body = pendingComment.trim();
    if (!body) return;
    try {
      await api.post(`/community/posts/${post.id}/comments`, { body });
      setPendingComment('');
      const data = await api.get(`/community/posts/${post.id}`);
      setComments((c) => ({ ...c, [post.id]: data.comments }));
      load();
    } catch { /* ignore */ }
  }

  async function createPost(e) {
    e.preventDefault();
    if (!composer.body.trim()) { setError('Write something first.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/community/posts', { ...composer, type: composer.type === 'recruit' ? 'recruit' : 'post' });
      setComposer({ type: 'post', title: '', body: '', link: '', topic: '', genre: '', location: '', instrument: '', bandId: '' });
      setComposerOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page container">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Community</h1>
          <p className="page-subtitle">Connect, collaborate and find your people — musicians and bands, together.</p>
        </div>
        {user && <button className="btn primary" onClick={() => setComposerOpen(true)}>+ Create post</button>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <button className={`btn ${mode === 'all' ? 'primary' : ''}`} onClick={() => setMode('all')}>All</button>
        <button className={`btn ${mode === 'recruit' ? 'primary' : ''}`} onClick={() => setMode('recruit')}>🔍 Recruiting</button>
        {user && <button className={`btn ${mode === 'following' ? 'primary' : ''}`} onClick={() => setMode('following')}>Following</button>}
      </div>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (e.g. Jazz)" />
      </div>

      {loading ? (
        <div className="loader">Loading feed…</div>
      ) : posts.length === 0 ? (
        <div className="empty">
          {mode === 'following' ? 'You are not following anyone yet. Follow musicians or bands to fill this feed.' : 'No posts yet. Be the first to share something.'}
        </div>
      ) : (
        <div className="grid" style={{ gap: 16 }}>
          {posts.map((post) => (
            <div key={post.id} className="card">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Avatar name={post.author?.name || post.band?.name || '?'} size={44} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>
                    {post.band
                      ? <Link to={`/bands/${post.band.id}`}>{post.band.name}</Link>
                      : <Link to={`/musicians/${post.author?.id}`}>{post.author?.name}</Link>}
                    <span className="badge brand" style={{ marginLeft: 8 }}>{post.type === 'recruit' ? 'Recruiting' : 'Update'}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {post.topic && <span>{post.topic} · </span>}
                    {post.genre && <span>{post.genre} · </span>}
                    {post.location && <span>{post.location} · </span>}
                    {timeAgo(post.createdAt)}
                  </div>
                </div>
              </div>

              {post.title && <h3 style={{ margin: '16px 0 6px' }}>{post.title}</h3>}
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{post.body}</p>
              {post.link && <a href={post.link} target="_blank" rel="noreferrer" className="btn small" style={{ marginTop: 10 }}>Open link ↗</a>}
              {post.type === 'recruit' && post.instrument && (
                <div className="badge warn" style={{ marginTop: 12 }}>🎸 Looking for: {post.instrument}</div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn small" onClick={() => toggleLike(post)}>
                  {post.likedByMe ? '❤️ Liked' : '🤍 Like'} ({post.likeCount})
                </button>
                <button className="btn small" onClick={() => openThread(post)}>💬 Comment ({post.commentCount})</button>
                {user && post.authorId !== user.id && (
                  <Link to={`/messages?to=${post.authorId}`} className="btn small">✉️ Message</Link>
                )}
                {user && (post.authorId === user.id || user.role === 'admin') && (
                  <button className="btn small" style={{ color: 'var(--danger)' }} onClick={async () => { await api.del(`/community/posts/${post.id}`); load(); }}>Delete</button>
                )}
              </div>

              {openComments[post.id] && (
                <div style={{ marginTop: 16, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
                  {(comments[post.id] || []).length === 0 ? (
                    <div className="muted" style={{ fontSize: 14 }}>No comments yet.</div>
                  ) : (
                    (comments[post.id] || []).map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <Avatar name={c.author?.name || '?'} size={30} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.author?.name}</div>
                          <div className="muted" style={{ fontSize: 14 }}>{c.body}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {user && (
                    <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={(e) => submitComment(post, e)}>
                      <input value={pendingComment} onChange={(e) => setPendingComment(e.target.value)} placeholder="Add a comment…" style={{ flex: 1 }} />
                      <button className="btn small primary">Post</button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="modal-backdrop" style={{ display: composerOpen ? 'flex' : 'none' }} onMouseDown={() => setComposerOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onMouseDown={(e) => e.stopPropagation()}>
            <h3>{composer.type === 'recruit' ? 'Post a recruitment' : 'Create a post'}</h3>
            <form className="form-stack" onSubmit={createPost}>
              <label>Type
                <select value={composer.type} onChange={(e) => setComposer((c) => ({ ...c, type: e.target.value }))}>
                  <option value="post">General update</option>
                  <option value="recruit">Recruit / looking for someone</option>
                </select>
              </label>
              {composer.type === 'post' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label>Title (optional) <input value={composer.title} onChange={(e) => setComposer((c) => ({ ...c, title: e.target.value }))} /></label>
                  <label>Post as band <select value={composer.bandId} onChange={(e) => setComposer((c) => ({ ...c, bandId: e.target.value }))}>
                    <option value="">Your profile</option>
                    {myBands.filter((b) => b.membershipStatus === 'active').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select></label>
                </div>
              )}
              {composer.type === 'recruit' && (
                <label>What are you looking for? <input value={composer.title} onChange={(e) => setComposer((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. Looking for a keyboardist" /></label>
              )}
              <label>{composer.type === 'recruit' ? 'Instrument / role needed' : ''}
                {composer.type === 'recruit'
                  ? <input value={composer.instrument} onChange={(e) => setComposer((c) => ({ ...c, instrument: e.target.value }))} placeholder="e.g. Keyboard / Piano" />
                  : null}
              </label>
              <label>Message <textarea value={composer.body} onChange={(e) => setComposer((c) => ({ ...c, body: e.target.value }))} required /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <label>Topic <input value={composer.topic} onChange={(e) => setComposer((c) => ({ ...c, topic: e.target.value }))} placeholder="Collaboration" /></label>
                <label>Genre <input value={composer.genre} onChange={(e) => setComposer((c) => ({ ...c, genre: e.target.value }))} /></label>
                <label>Location <input value={composer.location} onChange={(e) => setComposer((c) => ({ ...c, location: e.target.value }))} /></label>
              </div>
              <label>Link (optional) <input value={composer.link} onChange={(e) => setComposer((c) => ({ ...c, link: e.target.value }))} placeholder="https://…" /></label>
              {error && <div className="alert error">{error}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn" onClick={() => setComposerOpen(false)}>Cancel</button>
                <button className="btn primary" disabled={saving}>{saving ? 'Posting…' : 'Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
