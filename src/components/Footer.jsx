import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer>
      <div className="container footer-main">
        <div>
          <Link to="/" className="logo footer-logo">
            <span className="dot" />
            iConnect
          </Link>
          <p>Live music, connected with intention.</p>
        </div>
        <nav aria-label="Footer navigation" className="footer-links">
          <Link to="/musicians">Musicians</Link>
          <Link to="/gigs">Gigs</Link>
          <Link to="/venues">Venues</Link>
          <Link to="/signup">Join free</Link>
        </nav>
      </div>
      <div className="container footer-meta">
        <span>© {new Date().getFullYear()} iConnect</span>
        <span>Built for the music community.</span>
      </div>
    </footer>
  );
}
