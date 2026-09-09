import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [debugToken, setDebugToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setDebugToken('');
    try {
      const data = await api.post('/auth/forgot-password', { email });
      setMessage({ type: 'success', text: 'If an account exists for that email, a reset link has been sent.' });
      if (data.debugToken) setDebugToken(data.debugToken);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page container">
      <div className="form-wrap">
        <div className="form-card">
          <h2>Reset your password</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Enter your account email and we'll send you a reset link.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </label>
            {message && <div className={`alert ${message.type}`}>{message.text}</div>}
            <button className="btn primary block" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>

          {debugToken && (
            <div className="alert" style={{ marginTop: 14 }}>
              <strong>Dev mode (no email configured):</strong> use this code to continue.
              <div style={{ wordBreak: 'break-all', marginTop: 6 }}>
                <Link to={`/reset-password?token=${debugToken}`} style={{ color: 'var(--accent)' }}>Open reset link →</Link>
              </div>
            </div>
          )}

          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
            Remembered it? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
