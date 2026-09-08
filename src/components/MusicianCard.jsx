import { Link } from 'react-router-dom';
import Avatar from './Avatar';

export default function MusicianCard({ musician }) {
  return (
    <div className="card pointer musician-card">
      <Link to={`/musicians/${musician.id}`} style={{ display: 'block' }}>
        <div className="top">
          <Avatar name={musician.name} size={52} />
          <div>
            <h3>{musician.name}</h3>
            <div className="role">{musician.title || 'Musician'}</div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 13 }}>
          {musician.location && <span>📍 {musician.location}</span>}
          {musician.genre && <span> · {musician.genre}</span>}
        </div>

        <p className="bio">{musician.bio || 'This musician has not added a bio yet.'}</p>

        <div className="instrument-list">
          {(musician.instruments || []).map((instrument) => (
            <span key={instrument} className="tag">{instrument}</span>
          ))}
        </div>
      </Link>
    </div>
  );
}
