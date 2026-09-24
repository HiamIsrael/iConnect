import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import GigCard from '../components/GigCard';
import PublicSection from '../components/PublicSection';
import { EmptyState, Loader, LoadError } from '../components/LoadState';

const GIG_TYPES = [
  'Club / Pub',
  'Festival',
  'Corporate',
  'Restaurant / Cafe',
  'Wedding',
  'Recording',
  'Church / Gospel',
];

export default function Gigs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const queryString = searchParams.toString();
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const genre = searchParams.get('genre') || '';
  const location = searchParams.get('location') || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/gigs${queryString ? `?${queryString}` : ''}`)
      .then((data) => {
        if (active) setGigs(data.gigs || []);
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
  const hasFilters = Boolean(q || type || genre || location);

  return (
    <div className="page container discovery-page">
      <div className="discovery-intro">
        <div>
          <p className="section-eyebrow">The next room</p>
          <h1 className="page-title">Find a gig with a point of view.</h1>
          <p className="page-subtitle">Open opportunities with a date, a place, and enough detail to know whether the fit is worth pursuing.</p>
        </div>
        <Link to="/signup?next=%2Fgigs&role=organizer" className="btn primary">Post a gig</Link>
      </div>

      <form className="filters discovery-filters gigs-filters" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="gig-search" className="sr-only">Search gigs</label>
        <input id="gig-search" value={q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Gig, venue, or tag" />
        <label htmlFor="gig-type" className="sr-only">Filter by gig type</label>
        <select id="gig-type" value={type} onChange={(event) => updateFilter('type', event.target.value)}>
          <option value="">All formats</option>
          {GIG_TYPES.map((gigType) => <option key={gigType} value={gigType}>{gigType}</option>)}
        </select>
        <label htmlFor="gig-location" className="sr-only">Filter by location</label>
        <input id="gig-location" value={location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Location, e.g. Lagos" />
        <label htmlFor="gig-genre" className="sr-only">Filter by genre</label>
        <input id="gig-genre" value={genre} onChange={(event) => updateFilter('genre', event.target.value)} placeholder="Genre, e.g. Jazz" />
        {hasFilters && <button type="button" className="btn ghost small filter-clear" onClick={clearFilters}>Clear filters</button>}
      </form>

      <PublicSection
        eyebrow={loading ? 'Scanning open opportunities' : `${gigs.length} ${gigs.length === 1 ? 'gig' : 'gigs'} found`}
        title="Open calls for the right sound."
        action={hasFilters && <span className="muted filter-context">Filters are shareable in the URL</span>}
        className="discovery-results"
      >
        {loading ? (
          <Loader>Finding gigs…</Loader>
        ) : error ? (
          <LoadError what="gigs" error={error} onRetry={retry} />
        ) : gigs.length === 0 ? (
          <EmptyState
            title="No gigs match those filters yet"
            message="Try a broader location, format, genre, or search term."
            action={<button type="button" className="btn small" onClick={clearFilters}>Reset search</button>}
          />
        ) : (
          <div className="grid grid-3 gig-results">
            {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
          </div>
        )}
      </PublicSection>
    </div>
  );
}
