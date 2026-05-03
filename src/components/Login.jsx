import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import './Auth.css';

export const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ax-root">
      <aside className="ax-aside">
        <div className="ax-aside-grid" />
        <Link to="/" className="ax-brand">
          <img src={Logo} alt="SiteRecord" className="ax-brand-logo" />
        </Link>

        <div className="ax-aside-body">
          <span className="ax-eyebrow">Spatial storytelling platform</span>
          <h1 className="ax-aside-title">
            Welcome back. Pick up where your tour left off.
          </h1>
          <p className="ax-aside-sub">
            Sign in to manage projects, review constellation maps, and publish
            polished virtual tours from any device.
          </p>

          <ul className="ax-feature-list">
            <li>
              <span className="ax-feature-icon">✦</span>
              Auto frame extraction and panorama processing
            </li>
            <li>
              <span className="ax-feature-icon">◇</span>
              Drag-to-align constellation and floorplan editors
            </li>
            <li>
              <span className="ax-feature-icon">◎</span>
              Share immersive tours with clients in one click
            </li>
          </ul>
        </div>

        <div className="ax-aside-foot">
          <span>© {new Date().getFullYear()} SiteRecord</span>
          <span>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </span>
        </div>
      </aside>

      <main className="ax-main">
        <div className="ax-main-bg" />
        <div className="ax-card">
          <Link to="/" className="ax-mobile-brand">
            <img src={Logo} alt="SiteRecord" />
            <span className="ax-mobile-brand-name">SiteRecord</span>
          </Link>

          <p className="ax-card-eyebrow">Sign in</p>
          <h2 className="ax-title">Welcome back</h2>
          <p className="ax-sub">
            Continue building immersive tours with a cleaner, more guided workspace.
          </p>

          <form className="ax-form" onSubmit={handleSubmit} noValidate>
            <div className="ax-field">
              <label htmlFor="login-email" className="ax-label">Email</label>
              <input
                id="login-email"
                className="ax-input"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="ax-field">
              <label htmlFor="login-password" className="ax-label">Password</label>
              <div className="ax-input-wrap">
                <input
                  id="login-password"
                  className="ax-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="ax-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="ax-options">
              <label className="ax-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <a className="ax-link" href="#forgot">Forgot password?</a>
            </div>

            {error && (
              <div className="ax-error" role="alert">
                <span aria-hidden>!</span>
                <span>{error}</span>
              </div>
            )}

            <button className="ax-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="ax-foot">
              Don&apos;t have an account? <Link to="/register">Create one</Link>
            </p>
          </form>

          <Link to="/" className="ax-back">← Back to home</Link>
        </div>
      </main>
    </div>
  );
};

export default Login;
