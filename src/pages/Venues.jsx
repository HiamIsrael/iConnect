import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import PublicSection from '../components/PublicSection';
import { EmptyState, Loader, LoadError } from '../components/LoadState';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', type: '', description: '', location: '', capacity: '', amenities: '', website: '', phone: '', contactEmail: '' };

export default function Venues() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const queryString = searchParams.toString();
  const q = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/venues${queryString ? `?${queryString}` : ''}`)
      .then((data) => {
        if (active) setVenues(data.venues || []);
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
  const hasFilters = Boolean(q || location);
  const retry = () => setReloadKey((key) => key + 1);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/venues', form);
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="page container discovery-page network-page">
      <div className="discovery-intro">
        <div>
          <p className="section-eyebrow">The places that hold the sound</p>
          <h1 className="page-title">Find the right room.</h1>
          <p className="page-subtitle">Explore venues, capacities, and the spaces where the next live moment could happen.</p>
        </div>
        {user?.role === 'organizer' && <button className="btn primary" onClick={() => setCreateOpen(true)}>Add a venue</button>}
      </div>

      <div className="filters discovery-filters network-filters">
        <label htmlFor="venue-search" className="sr-only">Search venues</label>
        <input id="venue-search" value={q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Venue or event name" />
        <label htmlFor="venue-location" className="sr-only">Filter venues by location</label>
        <input id="venue-location" value={location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Location, e.g. Lagos" />
        {hasFilters && <button type="button" className="btn ghost small filter-clear" onClick={clearFilters}>Clear filters</button>}
      </div>

      <PublicSection
        eyebrow={loading ? 'Mapping the network' : `${venues.length} ${venues.length === 1 ? 'venue' : 'venues'} found`}
        title="Rooms with a story to tell."
        action={hasFilters && <span className="muted filter-context">Filters are shareable in the URL</span>}
        className="discovery-results"
      >
        {loading ? <Loader>Finding venues…</Loader> : error ? <LoadError what="venues" error={error} onRetry={retry} /> : venues.length === 0 ? (
          <EmptyState
            title="No venues match those filters yet"
            message="Try a broader location or search term."
            action={<button type="button" className="btn small" onClick={clearFilters}>Reset search</button>}
          />
        ) : (
          <div className="grid grid-3 network-results">
            {venues.map((venue) => (
              <Link key={venue.id} to={`/venues/${venue.id}`} className="network-card-link">
                <article className="card pointer network-card">
                  <div className="network-card-identity">
                    {venue.photoUrl ? <img src={venue.photoUrl} alt="" className="avatar" /> : <Avatar name={venue.name} size={54} />}
                    <div>
                      <h3>{venue.name}</h3>
                      <p>{venue.type || 'Venue'} · {venue.location}</p>
                    </div>
                  </div>
                  <p className="network-card-description">{venue.description || 'No description yet.'}</p>
                  <p className="network-card-meta">{venue.gigCount || 0} upcoming or past gigs {venue.capacity ? `· capacity ${venue.capacity}` : ''}</p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </PublicSection>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a venue">
        <form className="form-stack" onSubmit={create}>
          <label>Name <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required /></label>
          <div className="form-grid-2">
            <label>Type <input value={form.type} onChange={(event) => updateForm('type', event.target.value)} placeholder="Live music venue" /></label>
            <label>Location <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} required /></label>
          </div>
          <label>Description <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
          <div className="form-grid-2">
            <label>Capacity <input type="number" min="0" value={form.capacity} onChange={(event) => updateForm('capacity', event.target.value)} /></label>
            <label>Amenities <input value={form.amenities} onChange={(event) => updateForm('amenities', event.target.value)} placeholder="Sound, stage, bar" /></label>
          </div>
          <div className="form-grid-2">
            <label>Website <input value={form.website} onChange={(event) => updateForm('website', event.target.value)} /></label>
            <label>Phone <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} /></label>
          </div>
          <label>Contact email <input type="email" value={form.contactEmail} onChange={(event) => updateForm('contactEmail', event.target.value)} /></label>
          {error && <div className="alert error">{error.message || error}</div>}
          <div className="form-actions"><button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Adding…' : 'Add venue'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
