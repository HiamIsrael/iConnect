import { useEffect, useState } from 'react';
import { api } from '../api';
import MusicianCard from '../components/MusicianCard';

export default function Musicians() {
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (genre) params.set('genre', genre);
    if (location) params.set('location', location);
    setLoading(true);
    api.get(`/musicians${params.size ? `?${params}` : ''}`)
      .then((data) => setMusicians(data.musicians))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, genre, location]);

  return (
    <div className="page container">
      <h1 className="page-title">Musicians</h1>
      <p className="page-subtitle">Discover talented performers and direct them to your next event.</p>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, instrument, tags…" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Lagos)" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (e.g. Jazz)" />
      </div>

      {loading ? (
        <div className="loader">Loading musicians…</div>
      ) : musicians.length === 0 ? (
        <div className="empty">No musicians found. Try a different search.</div>
      ) : (
        <div className="grid grid-2">
          {musicians.map((m) => <MusicianCard key={m.id} musician={m} />)}
        </div>
      )}
    </div>
  );
}
