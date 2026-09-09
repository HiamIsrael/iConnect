import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import Avatar from '../components/Avatar';
import GigCard from '../components/GigCard';

export default function VenueDetail() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/venues/${id}`)
      .then((d) => { setVenue(d.venue); setGigs(d.gigs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page container"><div className="loader">Loading venue…</div></div>;
  if (!venue) {
    return (
      <div className="page container">
        <div className="empty">Venue not found.</div>
        <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/venues" className="btn">Back to venues</Link></div>
      </div>
    );
  }

  return (
    <div className="page container">
      <Link to="/venues" className="muted" style={{ fontSize: 14 }}>← All venues</Link>

      <div className="detail-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {venue.photoUrl
            ? <img src={venue.photoUrl} alt="" className="avatar" style={{ width: 76, height: 76, objectFit: 'cover' }} />
            : <Avatar name={venue.name} size={76} />}
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{venue.name}</h1>
            <div className="muted">{venue.type || 'Venue'} · {venue.location}</div>
          </div>
        </div>
        <p style={{ marginTop: 18, color: 'var(--text-muted)' }}>{venue.description || 'No description yet.'}</p>
        <ul className="detail-list" style={{ marginTop: 18 }}>
          {venue.capacity > 0 && <li><span className="k">Capacity</span><span>{venue.capacity}</span></li>}
          {venue.amenities && <li><span className="k">Amenities</span><span>{venue.amenities}</span></li>}
          {venue.website && <li><span className="k">Website</span><a href={venue.website} target="_blank" rel="noreferrer">{venue.website}</a></li>}
          {venue.phone && <li><span className="k">Phone</span><span>{venue.phone}</span></li>}
          {venue.contactEmail && <li><span className="k">Email</span><span>{venue.contactEmail}</span></li>}
        </ul>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 className="section-title">Upcoming gigs here</h2>
        {gigs.length === 0 ? (
          <div className="empty">No gigs listed at this venue yet.</div>
        ) : (
          <div className="grid grid-3">
            {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
          </div>
        )}
      </div>
    </div>
  );
}
