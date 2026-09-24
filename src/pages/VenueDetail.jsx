import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import GigCard from '../components/GigCard';
import { EmptyState, LoadError, Loader } from '../components/LoadState';

export default function VenueDetail() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get(`/venues/${id}`)
      .then((data) => {
        if (!active) return;
        setVenue(data.venue);
        setGigs(data.gigs || []);
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
  }, [id]);

  if (loading) return <div className="page container detail-page venue-detail-page"><Loader>Loading venue…</Loader></div>;
  if (error) return <div className="page container detail-page venue-detail-page"><LoadError what="this venue" error={error} onRetry={() => window.location.reload()} /></div>;
  if (!venue) {
    return (
      <div className="page container detail-page venue-detail-page">
        <EmptyState
          title="Venue not found"
          message="This venue may have been unpublished or moved."
          action={<Link to="/venues" className="btn">Back to venues</Link>}
        />
      </div>
    );
  }

  return (
    <div className="page container detail-page venue-detail-page">
      <Link to="/venues" className="detail-back-link">← All venues</Link>

      <article className="detail-card venue-sheet">
        <header className="venue-detail-header">
          {venue.photoUrl ? <img src={venue.photoUrl} alt="" className="avatar venue-detail-avatar" /> : <Avatar name={venue.name} size={84} />}
          <div>
            <p className="section-eyebrow">A room in the network</p>
            <h1 className="page-title">{venue.name}</h1>
            <p className="venue-detail-subtitle">{venue.type || 'Venue'} · {venue.location}</p>
          </div>
        </header>
        <p className="venue-detail-description">{venue.description || 'No description yet.'}</p>
        <ul className="detail-list venue-detail-list">
          {venue.capacity > 0 && <li><span className="k">Capacity</span><span>{venue.capacity}</span></li>}
          {venue.amenities && <li><span className="k">Amenities</span><span>{venue.amenities}</span></li>}
          {venue.website && <li><span className="k">Website</span><a href={venue.website} target="_blank" rel="noreferrer">{venue.website}</a></li>}
          {venue.phone && <li><span className="k">Phone</span><span>{venue.phone}</span></li>}
          {venue.contactEmail && <li><span className="k">Email</span><span>{venue.contactEmail}</span></li>}
        </ul>
      </article>

      <section className="venue-gigs" aria-labelledby="venue-gigs-title">
        <p className="section-eyebrow">On the calendar</p>
        <h2 id="venue-gigs-title" className="section-title">Gigs at this venue</h2>
        {gigs.length === 0 ? (
          <EmptyState title="No gigs listed here yet" message="Check back when this venue publishes its next opportunity." />
        ) : (
          <div className="grid grid-3">{gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}</div>
        )}
      </section>
    </div>
  );
}
