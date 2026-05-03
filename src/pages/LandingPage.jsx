import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import './LandingPage.css';

const features = [
  {
    eyebrow: 'Capture',
    title: 'Turn one walkthrough video into a full virtual tour',
    body:
      'Upload a single 360° walkthrough and Constellation automatically extracts panoramic frames, builds a spatial map of the site, and gives you an instantly navigable tour — no manual stitching required.',
    bullets: ['Drag & drop MP4 / MOV / AVI', 'Up to 2 GB per video', 'Live progress while frames extract'],
  },
  {
    eyebrow: 'Map',
    title: 'A constellation of every viewpoint, automatically connected',
    body:
      'Our SfM engine reconstructs the spatial relationships between frames so visitors can walk from room to room. Manually nudge any node — the editor keeps the rest of your map perfectly in place.',
    bullets: ['Automatic connections between viewpoints', 'Drag-to-align node editor', 'Undo / redo history'],
  },
  {
    eyebrow: 'Align',
    title: 'Drop your floorplan in. We line up the rest.',
    body:
      'Upload an architectural floorplan and overlay the constellation on top of it. Scale, rotate, and translate to match — then drag any node to its real-world location for pixel-perfect navigation.',
    bullets: ['Multi-floor support', 'Real-time alignment preview', 'Per-node fine tuning'],
  },
  {
    eyebrow: 'Share',
    title: 'Immersive 360° tours your clients can open in one click',
    body:
      'Send a link, embed in a listing, or share on social — your viewers get a smooth interactive tour with a side preview of every frame and effortless navigation between rooms.',
    bullets: ['Works on mobile, tablet, and desktop', 'Instant frame thumbnails', 'No downloads, no installs'],
  },
];

const stats = [
  { value: 'Auto', label: 'Frame extraction' },
  { value: 'Built-in', label: 'SfM constellation' },
  { value: 'Drag', label: 'To align nodes' },
  { value: '1-Click', label: 'Tour sharing' },
];

const steps = [
  {
    n: '01',
    title: 'Record a walkthrough',
    body:
      'Use any 360° camera (Insta360, Ricoh Theta, etc.) and walk through the space at a steady pace.',
  },
  {
    n: '02',
    title: 'Upload to Constellation',
    body:
      'Drop your video into a project. Frames are extracted automatically and a spatial map starts building.',
  },
  {
    n: '03',
    title: 'Align & publish',
    body:
      'Drop in your floorplan, fine-tune positions if needed, and share an interactive tour with anyone.',
  },
];

const industries = [
  'Real Estate',
  'Architecture',
  'Construction',
  'Interior Design',
  'Hospitality',
  'Education',
  'Retail',
  'Cultural Heritage',
];

const testimonials = [
  {
    quote:
      'Constellation turned a 12-minute walkthrough into a navigable virtual tour in minutes. The auto-connected map saved us hours of manual hotspotting.',
    name: 'Maya Rivera',
    role: 'Real Estate Photographer',
  },
  {
    quote:
      'Floorplan alignment is the killer feature. Our clients can finally see exactly where each viewpoint sits within the building.',
    name: 'David Chen',
    role: 'Architectural Studio Lead',
  },
  {
    quote:
      'We replaced three separate tools with this one platform. Capture, build, share — done.',
    name: 'Priya Anand',
    role: 'Construction Documentation Manager',
  },
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Authenticated users skip the landing and go straight to the dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const goAnchor = (id) => (e) => {
    e.preventDefault();
    setNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-root">
      {/* NAVBAR */}
      <header className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <Link to="/" className="lp-brand" aria-label="Constellation home">
            <img src={Logo} alt="Constellation" className="lp-brand-logo" />
          </Link>
          <nav className={`lp-nav-links ${navOpen ? 'open' : ''}`}>
            <a href="#features" onClick={goAnchor('features')}>Features</a>
            <a href="#how" onClick={goAnchor('how')}>How it works</a>
            <a href="#industries" onClick={goAnchor('industries')}>Industries</a>
            <a href="#about" onClick={goAnchor('about')}>About</a>
            <div className="lp-nav-divider" />
            <Link to="/login" className="lp-nav-link-mobile">Sign in</Link>
            <Link to="/register" className="lp-nav-link-mobile lp-nav-cta-mobile">Get started</Link>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-nav-link">Sign in</Link>
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-sm">
              Get started
            </Link>
          </div>
          <button
            type="button"
            className="lp-nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-hero-glow lp-hero-glow-a" />
          <div className="lp-hero-glow lp-hero-glow-b" />
          <div className="lp-hero-grid" />
        </div>
        <div className="lp-container lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">360° Virtual Tours · Reimagined</span>
            <h1 className="lp-hero-title">
              Virtual tours, made <span className="lp-grad-text">effortless.</span>
            </h1>
            <p className="lp-hero-sub">
              Upload a single 360° walkthrough video. Constellation automatically extracts panoramic
              frames, builds a navigable spatial map, and gives you an immersive tour you can share
              in one click.
            </p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
                Get started — it's free
              </Link>
              <a href="#features" onClick={goAnchor('features')} className="lp-btn lp-btn-ghost lp-btn-lg">
                See how it works
              </a>
            </div>
            <div className="lp-hero-meta">
              <span className="lp-dot" /> Takes less than 60 seconds to sign up
            </div>
          </div>
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-orbit">
              <div className="lp-orbit-ring lp-orbit-ring-1" />
              <div className="lp-orbit-ring lp-orbit-ring-2" />
              <div className="lp-orbit-ring lp-orbit-ring-3" />
              <div className="lp-orbit-core" />
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className={`lp-orbit-node lp-orbit-node-${i + 1}`} />
              ))}
              <svg className="lp-orbit-lines" viewBox="0 0 320 320" preserveAspectRatio="none">
                <line x1="160" y1="160" x2="40" y2="120" />
                <line x1="160" y1="160" x2="280" y2="100" />
                <line x1="160" y1="160" x2="220" y2="260" />
                <line x1="160" y1="160" x2="80" y2="240" />
                <line x1="160" y1="160" x2="260" y2="200" />
                <line x1="160" y1="160" x2="120" y2="60" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* STATS / TRUST */}
      <section className="lp-stats">
        <div className="lp-container lp-stats-inner">
          {stats.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">What you get</span>
            <h2 className="lp-section-title">
              Everything you need to capture, build, and share immersive tours.
            </h2>
            <p className="lp-section-sub">
              Constellation replaces a stack of stitching, mapping, and hosting tools with one
              streamlined workflow built for professionals.
            </p>
          </div>

          <div className="lp-feature-grid">
            {features.map((f, i) => (
              <article key={f.title} className={`lp-feature ${i % 2 === 1 ? 'lp-feature-alt' : ''}`}>
                <div className="lp-feature-copy">
                  <span className="lp-eyebrow lp-eyebrow-soft">{f.eyebrow}</span>
                  <h3 className="lp-feature-title">{f.title}</h3>
                  <p className="lp-feature-body">{f.body}</p>
                  <ul className="lp-feature-bullets">
                    {f.bullets.map((b) => (
                      <li key={b}>
                        <span className="lp-check" aria-hidden="true">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lp-feature-art" aria-hidden="true">
                  <div className={`lp-art lp-art-${i + 1}`}>
                    <div className="lp-art-shine" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-section lp-section-dark">
        <div className="lp-container">
          <div className="lp-section-head lp-section-head-light">
            <span className="lp-eyebrow lp-eyebrow-light">From recording to ready</span>
            <h2 className="lp-section-title">Three steps. One immersive tour.</h2>
          </div>

          <div className="lp-steps">
            {steps.map((s) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <h3 className="lp-step-title">{s.title}</h3>
                <p className="lp-step-body">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="lp-section-cta">
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
              Start your first tour
            </Link>
            <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">Built for</span>
            <h2 className="lp-section-title">Teams across every industry that sells space.</h2>
            <p className="lp-section-sub">
              Constellation works wherever a walkthrough tells a better story than a static photo.
            </p>
          </div>
          <div className="lp-industry-grid">
            {industries.map((name) => (
              <div key={name} className="lp-industry">
                <span className="lp-industry-dot" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-eyebrow">A growing community</span>
            <h2 className="lp-section-title">Loved by photographers, agencies, and studios.</h2>
          </div>
          <div className="lp-testimonial-grid">
            {testimonials.map((t) => (
              <figure key={t.name} className="lp-testimonial">
                <blockquote>“{t.quote}”</blockquote>
                <figcaption>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="lp-section lp-section-soft">
        <div className="lp-container lp-about">
          <div>
            <span className="lp-eyebrow">About Constellation</span>
            <h2 className="lp-section-title">A spatial map for every walkthrough.</h2>
            <p className="lp-about-body">
              Constellation is a virtual tour platform built around one idea: a 360° walkthrough
              video already contains everything needed for a navigable virtual tour — you just need
              the right tools to extract it.
            </p>
            <p className="lp-about-body">
              We combine automatic frame extraction, structure-from-motion mapping, floorplan
              alignment, and an immersive web viewer in one place. Whether you're a real estate
              photographer, a construction site manager, or a curator documenting a gallery,
              Constellation gives you a faster path from raw footage to shareable experience.
            </p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-btn lp-btn-primary">Create your account</Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
            </div>
          </div>
          <aside className="lp-about-card">
            <h4>What you can do today</h4>
            <ul>
              <li><span className="lp-check">✓</span> Upload 360° walkthroughs and extract frames automatically</li>
              <li><span className="lp-check">✓</span> Build a navigable constellation of viewpoints</li>
              <li><span className="lp-check">✓</span> Align floorplans and reposition nodes by hand</li>
              <li><span className="lp-check">✓</span> Share interactive tours with a single link</li>
              <li><span className="lp-check">✓</span> Manage projects, teams, and access from one dashboard</li>
            </ul>
          </aside>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="lp-cta">
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Ready to build your first virtual tour?</h2>
          <p className="lp-cta-sub">
            Sign up free and turn your next walkthrough into a navigable, shareable experience.
          </p>
          <div className="lp-hero-actions lp-cta-actions">
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">Join now</Link>
            <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg">Sign in</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={Logo} alt="Constellation" className="lp-brand-logo" />
            <p>Virtual tours, made effortless.</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <h5>Product</h5>
              <a href="#features" onClick={goAnchor('features')}>Features</a>
              <a href="#how" onClick={goAnchor('how')}>How it works</a>
              <a href="#industries" onClick={goAnchor('industries')}>Industries</a>
            </div>
            <div>
              <h5>Account</h5>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
            </div>
            <div>
              <h5>Company</h5>
              <a href="#about" onClick={goAnchor('about')}>About</a>
              <a href="mailto:contact@constellation.app">Contact</a>
            </div>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>© {new Date().getFullYear()} Constellation. All rights reserved.</span>
          <span className="lp-footer-small">Crafted for teams that document space.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
