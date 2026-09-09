import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage({ type: 'success', text: 'Password updated. You can now log in.' });
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="page container">
        <div className="form-wrap">
          <div className="form-card">
            <h2>Invalid link</h2>
            <p className="muted">This reset link is missing its token.</p>
            <Link to="/forgot-password" className="btn primary block">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <div className="form-wrap">
        <div className="form-card">
          <h2>Choose a new password</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Make it at least 8 characters long.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>New password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
            </label>
            <label>Confirm password
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </label>
            {message && <div className={`alert ${message.type}`}>{message.text}</div>}
            <button className="btn primary block" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
          </form>

          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
            <Link to="/login" style={{ color: 'var(--accent)' }}>Back to log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
