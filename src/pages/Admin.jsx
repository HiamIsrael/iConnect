import { useEffect, useState } from 'react';
import { api } from '../api';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import { timeAgo } from '../lib';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState('reports');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/admin/reports'), api.get('/admin/users')])
      .then(([r, u]) => {
        setReports(r.reports);
        setUsers(u.users);
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }, []);

  async function resolveReport(id, status) {
    try {
      await api.put(`/admin/reports/${id}`, { status });
      setReports((items) => items.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function toggleBlock(user) {
    try {
      await api.post(`/admin/users/${user.id}/${user.blocked ? 'unblock' : 'block'}`);
      setUsers((items) => items.map((u) => (u.id === user.id ? { ...u, blocked: !u.blocked } : u)));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="page container">
      <h1 className="page-title">Admin console</h1>
      <p className="page-subtitle">Moderate reports and manage accounts.</p>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button className={`btn ${tab === 'reports' ? 'primary' : ''}`} onClick={() => setTab('reports')}>
          Reports ({reports.length})
        </button>
        <button className={`btn ${tab === 'users' ? 'primary' : ''}`} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="loader">Loading…</div>
      ) : tab === 'reports' ? (
        reports.length === 0 ? (
          <div className="empty">No reports. All clear 🌿</div>
        ) : (
          <div className="grid">
            {reports.map((r) => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.reason}</div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {r.targetType} · {r.targetId} · by {r.reporter?.name || 'unknown'}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.details && <p className="muted" style={{ marginBottom: 10 }}>{r.details}</p>}
                <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{timeAgo(r.createdAt)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn small" style={{ color: 'var(--success)' }} onClick={() => resolveReport(r.id, 'resolved')}>Resolve</button>
                  <button className="btn small" style={{ color: 'var(--danger)' }} onClick={() => resolveReport(r.id, 'dismissed')}>Dismiss</button>
                  {r.status !== 'open' && <button className="btn small" onClick={() => resolveReport(r.id, 'open')}>Reopen</button>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid">
          {users.map((u) => (
            <div key={u.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={u.name} size={44} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700 }}>{u.name} {u.blocked && <span className="badge brand">blocked</span>}</div>
                <div className="muted" style={{ fontSize: 13 }}>{u.role} · {u.email} · {u.location || '—'}</div>
              </div>
              <button className={`btn small ${u.blocked ? '' : ''}`} style={u.blocked ? { color: 'var(--success)' } : { color: 'var(--danger)' }} onClick={() => toggleBlock(u)}>
                {u.blocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
