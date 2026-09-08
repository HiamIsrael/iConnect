import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page container">
      <div className="form-wrap">
        <div className="form-card">
          <h2>Welcome back</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Log in to iConnect to continue.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="btn primary block" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
          </form>

          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
            New here? <Link to="/signup" style={{ color: 'var(--accent)' }}>Create an account</Link>
          </p>

          <div className="alert" style={{ marginTop: 12, marginBottom: 0 }}>
            <strong>Demo accounts</strong><br />
            Musician: ayo@example.com · password123<br />
            Organizer: chidi@example.com · password123
          </div>
        </div>
      </div>
    </div>
  );
}
