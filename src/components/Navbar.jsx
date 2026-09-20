import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="dot" />
          iConnect
        </Link>

        <div className={`nav-links${menuOpen ? ' open' : ''}`}>
          <NavLink to="/musicians" onClick={() => setMenuOpen(false)}>Musicians</NavLink>
          <NavLink to="/gigs" onClick={() => setMenuOpen(false)}>Gigs</NavLink>
          <NavLink to="/community" onClick={() => setMenuOpen(false)}>Community</NavLink>
          <NavLink to="/bands" onClick={() => setMenuOpen(false)}>Bands</NavLink>
          <NavLink to="/venues" onClick={() => setMenuOpen(false)}>Venues</NavLink>
          {user?.role === 'organizer' && <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>My Gigs</NavLink>}
          {user?.role === 'musician' && <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>My Dashboard</NavLink>}
          {user && <NavLink to="/messages" onClick={() => setMenuOpen(false)}>Messages</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>}
        </div>

        <div className="nav-actions">
          {!user ? (
            <>
              <Link to="/login" className="btn ghost">Log in</Link>
              <Link to="/signup" className="btn primary">Join free</Link>
            </>
          ) : (
            <>
              <NotificationBell />
              <Link to="/profile" className="btn ghost small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={user.name} size={28} />
                {user.name.split(' ')[0]}
              </Link>
              <button className="btn ghost small" onClick={logout}>Log out</button>
            </>
          )}
          <button className="btn ghost small menu-toggle" aria-label="Menu" onClick={() => setMenuOpen((m) => !m)}>☰</button>
        </div>
      </div>
    </nav>
  );
}
