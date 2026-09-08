import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../lib';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then((data) => {
        setItems(data.notifications);
        if (data.unread > 0) api.post('/notifications/read').catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="page container">
      <h1 className="page-title">Notifications</h1>
      <p className="page-subtitle">Updates about your applications, gigs and payments.</p>

      {loading ? (
        <div className="loader">Loading…</div>
      ) : items.length === 0 ? (
        <div className="empty">No notifications yet.</div>
      ) : (
        <div className="grid">
          {items.map((n) => (
            <div key={n.id} className="card" style={n.read ? { opacity: 0.72 } : undefined}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {n.title} {!n.read && <span className="badge brand">new</span>}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>{n.body}</div>
                </div>
                <span className="faint" style={{ fontSize: 13 }}>{timeAgo(n.createdAt)}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <Link to={n.link || '/dashboard'} className="btn small">Open →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
