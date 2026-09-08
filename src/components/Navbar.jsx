import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <span className="dot" />
          iConnect
        </Link>

        <div className="nav-links">
          <NavLink to="/musicians">Musicians</NavLink>
          <NavLink to="/gigs">Gigs</NavLink>
          {user?.role === 'organizer' && <NavLink to="/dashboard">My Gigs</NavLink>}
          {user?.role === 'musician' && <NavLink to="/dashboard">My Dashboard</NavLink>}
          {user?.role === 'musician' && <NavLink to="/availability">Availability</NavLink>}
          {user && <NavLink to="/messages">Messages</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
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
        </div>
      </div>
    </nav>
  );
}
