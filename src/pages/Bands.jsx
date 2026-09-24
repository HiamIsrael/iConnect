import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import PublicSection from '../components/PublicSection';
import { EmptyState, Loader, LoadError } from '../components/LoadState';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', description: '', genre: '', location: '' };

export default function Bands() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const queryString = searchParams.toString();
  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';
  const location = searchParams.get('location') || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/bands${queryString ? `?${queryString}` : ''}`)
      .then((data) => {
        if (active) setBands(data.bands || []);
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
  const hasFilters = Boolean(q || genre || location);
  const retry = () => setReloadKey((key) => key + 1);
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/bands', form);
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page container discovery-page network-page">
      <div className="discovery-intro">
        <div>
          <p className="section-eyebrow">The collective voice</p>
          <h1 className="page-title">Find your people.</h1>
          <p className="page-subtitle">Meet bands and collectives, discover collaborators, and see where a shared sound is taking shape.</p>
        </div>
        {user && <button className="btn primary" onClick={() => setCreateOpen(true)}>Create a band</button>}
      </div>

      <div className="filters discovery-filters network-filters">
        <label htmlFor="band-search" className="sr-only">Search bands</label>
        <input id="band-search" value={q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Band or collective name" />
        <label htmlFor="band-genre" className="sr-only">Filter bands by genre</label>
        <input id="band-genre" value={genre} onChange={(event) => updateFilter('genre', event.target.value)} placeholder="Genre, e.g. Afrobeat" />
        <label htmlFor="band-location" className="sr-only">Filter bands by location</label>
        <input id="band-location" value={location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Location, e.g. Lagos" />
        {hasFilters && <button type="button" className="btn ghost small filter-clear" onClick={clearFilters}>Clear filters</button>}
      </div>

      <PublicSection
        eyebrow={loading ? 'Listening for the collective' : `${bands.length} ${bands.length === 1 ? 'band' : 'bands'} found`}
        title="A shared sound is a different kind of signal."
        action={hasFilters && <span className="muted filter-context">Filters are shareable in the URL</span>}
        className="discovery-results"
      >
        {loading ? <Loader>Finding bands…</Loader> : error ? <LoadError what="bands" error={error} onRetry={retry} /> : bands.length === 0 ? (
          <EmptyState
            title="No bands match those filters yet"
            message="Try a broader search, genre, or location."
            action={<button type="button" className="btn small" onClick={clearFilters}>Reset search</button>}
          />
        ) : (
          <div className="grid grid-3 network-results">
            {bands.map((band) => (
              <Link key={band.id} to={`/bands/${band.id}`} className="network-card-link">
                <article className="card pointer network-card">
                  <div className="network-card-identity">
                    {band.photoUrl ? <img src={band.photoUrl} alt="" className="avatar" /> : <Avatar name={band.name} size={56} />}
                    <div>
                      <h3>{band.name}</h3>
                      <p>{band.genre || 'Collective'} · {band.location || '—'}</p>
                    </div>
                  </div>
                  <p className="network-card-description">{band.description || 'No description yet.'}</p>
                  <p className="network-card-meta">{band.memberCount || 0} member{band.memberCount === 1 ? '' : 's'}</p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </PublicSection>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a band">
        <form className="form-stack" onSubmit={create}>
          <label>Band name <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} required /></label>
          <div className="form-grid-2">
            <label>Genre <input value={form.genre} onChange={(event) => updateForm('genre', event.target.value)} /></label>
            <label>Location <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} /></label>
          </div>
          <label>Description <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} /></label>
          {error && <div className="alert error">{error.message || error}</div>}
          <div className="form-actions"><button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create band'}</button></div>
        </form>
      </Modal>
    </div>
  );
}
