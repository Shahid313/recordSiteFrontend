import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/logo.png';
import './Auth.css';

const scorePassword = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['#b3261e', '#d97706', '#ca8a04', '#4f7daf', '#3f7d20'];

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const strength = useMemo(() => scorePassword(formData.password), [formData.password]);
  const strengthLabel = STRENGTH_LABELS[strength];
  const strengthColor = STRENGTH_COLORS[strength];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = (data) => {
    const errors = {};
    const fullName = data.fullName.trim();
    const email = data.email.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName) errors.fullName = 'Please enter your full name.';
    if (!email) errors.email = 'Please enter your email address.';
    else if (!emailRe.test(email)) errors.email = 'Please enter a valid email address.';

    if (!data.password) errors.password = 'Please enter a password.';
    else if (data.password.length < 6) errors.password = 'Password must be at least 6 characters.';

    if (!data.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (data.password && data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = validate(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!agree) {
      setError('Please accept the terms to create an account.');
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      await register(formData.email.trim(), formData.password, formData.fullName.trim());
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d?.msg || '').filter(Boolean).join(' ')
          : 'Registration failed.';
      setError(message || 'Registration failed.');
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
          <span className="ax-eyebrow">Launch a polished workspace</span>
          <h1 className="ax-aside-title">
            Turn 360° footage into client-ready virtual tours.
          </h1>
          <p className="ax-aside-sub">
            Create your account and start mapping spaces, aligning floorplans, and
            sharing immersive walkthroughs in minutes.
          </p>

          <ul className="ax-feature-list">
            <li>
              <span className="ax-feature-icon">✦</span>
              Unlimited project workspaces with team-ready review tools
            </li>
            <li>
              <span className="ax-feature-icon">◇</span>
              Built-in SfM constellation graph for accurate node placement
            </li>
            <li>
              <span className="ax-feature-icon">◎</span>
              Responsive review on desktop, tablet, and mobile
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

          <p className="ax-card-eyebrow">Get started</p>
          <h2 className="ax-title">Create your account</h2>
          <p className="ax-sub">
            Free to start — no credit card required. Build your first tour in minutes.
          </p>

          <form className="ax-form" onSubmit={handleSubmit} noValidate>
            <div className="ax-field">
              <label htmlFor="reg-name" className="ax-label">Full name</label>
              <input
                id="reg-name"
                className={`ax-input${fieldErrors.fullName ? ' ax-input-error' : ''}`}
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Your name"
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'reg-name-error' : undefined}
              />
              {fieldErrors.fullName && (
                <p id="reg-name-error" className="ax-field-error" role="alert">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div className="ax-field">
              <label htmlFor="reg-email" className="ax-label">Email</label>
              <input
                id="reg-email"
                className={`ax-input${fieldErrors.email ? ' ax-input-error' : ''}`}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="reg-email-error" className="ax-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="ax-field">
              <label htmlFor="reg-password" className="ax-label">Password</label>
              <div className="ax-input-wrap">
                <input
                  id="reg-password"
                  className={`ax-input${fieldErrors.password ? ' ax-input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
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
              {fieldErrors.password && (
                <p id="reg-password-error" className="ax-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              {formData.password && !fieldErrors.password && (
                <div className="ax-strength">
                  <div className="ax-strength-track">
                    <div
                      className="ax-strength-fill"
                      style={{
                        width: `${(strength / 4) * 100}%`,
                        background: strengthColor,
                      }}
                    />
                  </div>
                  <span className="ax-strength-label" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            <div className="ax-field">
              <label htmlFor="reg-confirm" className="ax-label">Confirm password</label>
              <input
                id="reg-confirm"
                className={`ax-input${fieldErrors.confirmPassword ? ' ax-input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Repeat password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'reg-confirm-error' : undefined}
              />
              {fieldErrors.confirmPassword && (
                <p id="reg-confirm-error" className="ax-field-error" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <label className="ax-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                I agree to SiteRecord's <a className="ax-link" href="#terms">Terms</a>
                {' '}and <a className="ax-link" href="#privacy">Privacy Policy</a>.
              </span>
            </label>

            {error && (
              <div className="ax-error" role="alert">
                <span aria-hidden>!</span>
                <span>{error}</span>
              </div>
            )}

            <button className="ax-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>

            <p className="ax-foot">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>

          <Link to="/" className="ax-back">← Back to home</Link>
        </div>
      </main>
    </div>
  );
};

export default Register;
