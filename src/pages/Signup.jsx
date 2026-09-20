import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('musician');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({ name, email, password, role });
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
          <h2>Join iConnect</h2>
          <p className="muted" style={{ marginBottom: 20 }}>Create a free account to connect with musicians and gigs.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>I am a…
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ padding: '12px 14px', border: `2px solid ${role === 'musician' ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input type="radio" value="musician" checked={role === 'musician'} onChange={(e) => setRole(e.target.value)} style={{ width: 'auto', accentColor: 'var(--brand)' }} />
                  <span>Musician</span>
                </label>
                <label style={{ padding: '12px 14px', border: `2px solid ${role === 'organizer' ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 'var(--radius-sm)', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input type="radio" value="organizer" checked={role === 'organizer'} onChange={(e) => setRole(e.target.value)} style={{ width: 'auto', accentColor: 'var(--brand)' }} />
                  <span>Organizer</span>
                </label>
              </div>
            </label>

            <label>{role === 'musician' ? 'Full name' : 'Organization name'}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'musician' ? 'Your name' : 'e.g. The Jazz House'} required />
            </label>
            <label>Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button className="btn primary block" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
          </form>

          <p className="muted" style={{ marginTop: 18, fontSize: 14 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
