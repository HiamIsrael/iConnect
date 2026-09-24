import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import GigCard from '../components/GigCard';
import MusicianCard from '../components/MusicianCard';
import PublicSection from '../components/PublicSection';
import { EmptyState, LoadError, Loader } from '../components/LoadState';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [gigs, setGigs] = useState([]);
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([api.get('/gigs'), api.get('/musicians')])
      .then(([gigsResponse, musiciansResponse]) => {
        if (!active) return;
        setGigs((gigsResponse.gigs || []).slice(0, 3));
        setMusicians((musiciansResponse.musicians || []).slice(0, 4));
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
  }, [reloadKey]);

  const retry = () => setReloadKey((key) => key + 1);

  return (
    <div className="page public-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container home-hero-layout">
          <div className="home-hero-copy">
            <p className="hero-kicker"><span className="live-dot" /> A network for live music</p>
            <h1 id="home-title">Find your people. <span>Fill the room.</span></h1>
            <p className="home-hero-lead">
              iConnect brings musicians, organizers, venues, and the next great live moment into the same room.
            </p>
            <div className="home-hero-actions">
              <Link to="/gigs" className="btn primary">Find a gig</Link>
              <Link to="/musicians" className="btn">Find a musician</Link>
              {!user && <Link to="/signup" className="text-link">Create a free profile <span aria-hidden="true">↗</span></Link>}
            </div>
            <p className="home-hero-note">Browse public listings first. Join when you find the right reason.</p>
          </div>

          <div className="home-hero-art" aria-hidden="true">
            <div className="hero-art-topline">
              <span>iConnect / live network</span>
              <span>01—24</span>
            </div>
            <div className="hero-art-sun" />
            <div className="hero-art-copy">
              <span className="hero-art-label">The next set</span>
              <strong>is already<br />taking shape.</strong>
            </div>
            <div className="hero-art-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-art-footer">
              <span>Musicians</span>
              <span>Gigs</span>
              <span>Venues</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <PublicSection
          eyebrow="Start where you are"
          title="One network. Two clear ways in."
          description="Whether you are building the set or booking the room, the useful part starts with seeing the right people and opportunities."
          className="home-paths"
        >
          <div className="path-grid">
            <Link to="/gigs" className="path-card path-card-musician">
              <span className="path-number">01</span>
              <div>
                <p className="path-label">For musicians</p>
                <h3>Find the next opportunity that fits.</h3>
                <p>Browse real briefs, understand the room, and put your work in front of people who are looking.</p>
              </div>
              <span className="path-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link to="/musicians" className="path-card path-card-organizer">
              <span className="path-number">02</span>
              <div>
                <p className="path-label">For organizers</p>
                <h3>Find the right people for the moment.</h3>
                <p>Move from a vague brief to a shortlist of musicians, bands, and voices that can carry the room.</p>
              </div>
              <span className="path-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </PublicSection>

        <PublicSection
          eyebrow="Out in the world"
          title="Opportunities with a date, a place, and a point of view."
          description="A useful gig listing tells you enough to decide whether the room, the work, and the moment are right."
          action={<Link to="/gigs" className="text-link">See all gigs <span aria-hidden="true">↗</span></Link>}
          className="home-discovery"
        >
          {loading ? (
            <Loader>Finding current gigs…</Loader>
          ) : error ? (
            <LoadError what="current gigs" error={error} onRetry={retry} />
          ) : gigs.length ? (
            <div className="grid grid-3 home-gig-grid">
              {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
            </div>
          ) : (
            <EmptyState
              title="No public gigs yet"
              message="New opportunities will appear here as organizers publish them."
              action={<Link to="/signup" className="btn small">Get notified</Link>}
            />
          )}
        </PublicSection>

        <PublicSection
          eyebrow="People in the network"
          title="Meet the people behind the sound."
          description="Profiles are more useful when they show the person, the practice, and the kind of room they know how to make."
          action={<Link to="/musicians" className="text-link">Browse musicians <span aria-hidden="true">↗</span></Link>}
          className="home-discovery home-people"
        >
          {loading ? (
            <Loader>Finding musicians…</Loader>
          ) : error ? (
            <LoadError what="musicians" error={error} onRetry={retry} />
          ) : musicians.length ? (
            <div className="grid grid-2 home-musician-grid">
              {musicians.map((musician) => <MusicianCard key={musician.id} musician={musician} />)}
            </div>
          ) : (
            <EmptyState
              title="The network is warming up"
              message="Public musician profiles will appear here as people complete them."
              action={<Link to="/signup" className="btn small">Build a profile</Link>}
            />
          )}
        </PublicSection>

        <PublicSection
          eyebrow="How it works"
          title="Less searching. More making."
          description="iConnect keeps the public path simple: see what is happening, understand the fit, and make the next move when it feels right."
          className="home-process"
        >
          <ol className="process-list">
            <li>
              <span className="process-number">01</span>
              <div><h3>See the room</h3><p>Explore gigs, musicians, venues, and the details that make a booking make sense.</p></div>
            </li>
            <li>
              <span className="process-number">02</span>
              <div><h3>Find the fit</h3><p>Use clear signals—genre, place, date, availability, and story—to narrow the field.</p></div>
            </li>
            <li>
              <span className="process-number">03</span>
              <div><h3>Make a connection</h3><p>Join when you are ready to apply, present your work, post an opportunity, or start a conversation.</p></div>
            </li>
          </ol>
        </PublicSection>

        <section className="home-closing" aria-labelledby="home-closing-title">
          <div>
            <p className="section-eyebrow">Keep the signal strong</p>
            <h2 id="home-closing-title">The right room starts with the right connection.</h2>
          </div>
          <div className="home-closing-actions">
            <Link to="/gigs" className="btn primary">Explore gigs</Link>
            {!user && <Link to="/signup" className="btn home-closing-secondary">Join iConnect</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
