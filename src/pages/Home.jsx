import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import GigCard from '../components/GigCard';
import MusicianCard from '../components/MusicianCard';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [musicians, setMusicians] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/gigs'), api.get('/musicians')])
      .then(([g, m]) => {
        setGigs(g.gigs.slice(0, 6));
        setMusicians(m.musicians.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <section className="hero container">
        <span className="eyebrow">● The marketplace for live music</span>
        <h1>Find the right <span className="grad">musicians</span> for every <span className="grad">gig</span>.</h1>
        <p className="lead">
          iConnect brings musicians and event organizers together — discover talented
          performers, post and manage gigs, and book with confidence.
        </p>
        <div className="hero-actions">
          <Link to="/musicians" className="btn primary">Browse musicians</Link>
          <Link to="/gigs" className="btn">Explore gigs</Link>
          {!user && <Link to="/signup" className="btn ghost">Create free account</Link>}
        </div>

        <div className="stats">
          <div className="stat"><div className="num">100s</div><div className="label">Musician profiles</div></div>
          <div className="stat"><div className="num">Live</div><div className="label">Gig listings</div></div>
          <div className="stat"><div className="num">1:1</div><div className="label">Direct connection</div></div>
          <div className="stat"><div className="num">Easy</div><div className="label">Apply in minutes</div></div>
        </div>
      </section>

      <section className="container" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 className="section-title">Featured gigs</h2>
          <Link to="/gigs" className="muted" style={{ fontSize: 14 }}>View all →</Link>
        </div>
        <div className="grid grid-3">
          {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
        </div>
      </section>

      <section className="container" style={{ marginTop: 56 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 className="section-title">Musicians to watch</h2>
          <Link to="/musicians" className="muted" style={{ fontSize: 14 }}>View all →</Link>
        </div>
        <div className="grid grid-2">
          {musicians.map((musician) => <MusicianCard key={musician.id} musician={musician} />)}
        </div>
      </section>
    </div>
  );
}
