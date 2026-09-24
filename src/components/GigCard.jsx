import { Link } from 'react-router-dom';
import { formatDateShort, formatMoney } from '../lib';
import StatusBadge from './StatusBadge';

export default function GigCard({ gig }) {
  const date = new Date(gig.date);
  return (
    <div className="card pointer gig-card" data-reveal>
      <Link to={`/gigs/${gig.id}`} style={{ display: 'block' }}>
        <div className="banner">
          <span className="banner-mark" aria-hidden="true">{(gig.genre || gig.type || 'Live').slice(0, 1)}</span>
          <span className="badge brand">{gig.type}</span>
        </div>
        <h3>{gig.title}</h3>
        <div className="meta">
          {gig.venue} · {gig.location}
        </div>
        <p className="desc">{gig.description}</p>
        <div className="foot">
          <span className="fee">{formatMoney(gig.fee?.amount, gig.fee?.currency)}</span>
          <span className="date-pill">📅 {formatDateShort(gig.date)}</span>
        </div>
      </Link>
    </div>
  );
}
