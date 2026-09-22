import { useEffect, useState } from 'react';
import { api } from '../api';
import MusicianCard from '../components/MusicianCard';
import { Loader, LoadError } from '../components/LoadState';

export default function Musicians() {
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (genre) params.set('genre', genre);
    if (location) params.set('location', location);
    setLoading(true);
    setError(null);
    api.get(`/musicians${params.size ? `?${params}` : ''}`)
      .then((data) => {
        if (active) setMusicians(data.musicians);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, genre, location, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);

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
        <Loader>Loading musicians…</Loader>
      ) : error ? (
        <LoadError what="musicians" error={error} onRetry={retry} />
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
