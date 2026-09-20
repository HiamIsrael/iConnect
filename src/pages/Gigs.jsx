import { useEffect, useState } from 'react';
import { api } from '../api';
import GigCard from '../components/GigCard';

export default function Gigs() {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (genre) params.set('genre', genre);
    if (location) params.set('location', location);
    setLoading(true);
    api.get(`/gigs${params.size ? `?${params}` : ''}`)
      .then((data) => setGigs(data.gigs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, type, genre, location]);

  return (
    <div className="page container">
      <h1 className="page-title">Gigs</h1>
      <p className="page-subtitle">Browse open bookings and upcoming opportunities.</p>

      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gigs, venues, tags…" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option>Club / Pub</option>
          <option>Festival</option>
          <option>Corporate</option>
          <option>Restaurant / Cafe</option>
          <option>Wedding</option>
          <option>Recording</option>
          <option>Church / Gospel</option>
        </select>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Lagos)" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Genre (e.g. Jazz)" />
      </div>

      {loading ? (
        <div className="loader">Loading gigs…</div>
      ) : gigs.length === 0 ? (
        <div className="empty">No gigs found. Try a different search.</div>
      ) : (
        <div className="grid grid-3">
          {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
        </div>
      )}
    </div>
  );
}
