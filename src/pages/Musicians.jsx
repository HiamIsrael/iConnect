import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import MusicianCard from '../components/MusicianCard';
import PublicSection from '../components/PublicSection';
import { EmptyState, Loader, LoadError } from '../components/LoadState';

export default function Musicians() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const queryString = searchParams.toString();
  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const location = searchParams.get('location') || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/musicians${queryString ? `?${queryString}` : ''}`)
      .then((data) => {
        if (active) setMusicians(data.musicians || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryString, reloadKey]);

  const updateFilter = (key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value.trim()) next.set(key, value.trim());
      else next.delete(key);
      return next;
    }, { replace: true });
  };

  const clearFilters = () => setSearchParams({}, { replace: true });
  const retry = () => setReloadKey((key) => key + 1);
  const hasFilters = Boolean(q || genre || location);

  return (
    <div className="page container discovery-page">
      <div className="discovery-intro">
        <div>
          <p className="section-eyebrow">The people in the room</p>
          <h1 className="page-title">Find the right sound.</h1>
          <p className="page-subtitle">Browse musicians by the details that matter when the room, the brief, and the fit all need to line up.</p>
        </div>
        <Link to="/signup?next=%2Fmusicians&role=musician" className="btn primary">Create a profile</Link>
      </div>

      <form className="filters discovery-filters" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="musician-search" className="sr-only">Search musicians</label>
        <input id="musician-search" value={q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Name, instrument, or tag" />
        <label htmlFor="musician-location" className="sr-only">Filter by location</label>
        <input id="musician-location" value={location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Location, e.g. Lagos" />
        <label htmlFor="musician-genre" className="sr-only">Filter by genre</label>
        <input id="musician-genre" value={genre} onChange={(event) => updateFilter('genre', event.target.value)} placeholder="Genre, e.g. Jazz" />
        {hasFilters && <button type="button" className="btn ghost small filter-clear" onClick={clearFilters}>Clear filters</button>}
      </form>

      <PublicSection
        eyebrow={loading ? 'Searching the network' : `${musicians.length} ${musicians.length === 1 ? 'person' : 'people'} found`}
        title="Musicians with something to say."
        action={hasFilters && <span className="muted filter-context">Filters are shareable in the URL</span>}
        className="discovery-results"
      >
        {loading ? (
          <Loader>Finding musicians…</Loader>
        ) : error ? (
          <LoadError what="musicians" error={error} onRetry={retry} />
        ) : musicians.length === 0 ? (
          <EmptyState
            title="No one matches those filters yet"
            message="Try a broader location, genre, or search term."
            action={<button type="button" className="btn small" onClick={clearFilters}>Reset search</button>}
          />
        ) : (
          <div className="grid grid-2 musician-results">
            {musicians.map((musician) => <MusicianCard key={musician.id} musician={musician} />)}
          </div>
        )}
      </PublicSection>
    </div>
  );
}
