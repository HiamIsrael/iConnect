import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page container">
      <div className="empty" style={{ margin: '0 auto', maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>404</h2>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn primary" style={{ marginTop: 12 }}>Go home</Link>
      </div>
    </div>
  );
}
