import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import {
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Menu,
  Shield,
  Star,
  User as UserIcon,
} from 'lucide-react';

const initialsFromEmail = (email) => {
  if (!email) return 'U';
  const name = email.split('@')[0] || 'u';
  const parts = name.split(/[._-]/).filter(Boolean);
  const a = (parts[0]?.[0] || name[0] || 'u').toUpperCase();
  const b = (parts[1]?.[0] || '').toUpperCase();
  return (a + b) || 'U';
};

export const AppShell = ({ children, title = 'Constellation' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef(null);

  const initials = useMemo(() => initialsFromEmail(user?.email), [user?.email]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <img
            src={Logo}
            alt="Constellation"
            className="brand-logo"
            style={{ display: 'block' }}
          />
        </div>

        <div className="nav-group-title">Main</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard className="nav-icon" size={18} /> Dashboard
        </NavLink>
        <button className="nav-item disabled" disabled title="Coming soon">
          <Star className="nav-icon" size={18} /> Subscribe to Pro
        </button>
        <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <FolderKanban className="nav-icon" size={18} /> Projects
        </NavLink>
        {user?.is_superuser && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Shield className="nav-icon" size={18} /> Admin
          </NavLink>
        )}

        <div className="nav-group-title">Profile</div>
        <NavLink to="/account" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UserIcon className="nav-icon" size={18} /> My Account
        </NavLink>
        <NavLink to="/change-password" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <KeyRound className="nav-icon" size={18} /> Change Password
        </NavLink>

        <div className="divider" />
        <div className="sidebar-note">
          <div className="sidebar-note-title">Workspace Focus</div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
            Build immersive tours, refine alignments, and review project progress from one place.
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>
            {location.pathname}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn"
              onClick={() => setSidebarOpen((v) => !v)}
              style={{ padding: '8px 10px', borderRadius: 12, display: 'none' }}
              aria-label="Toggle sidebar"
              id="sidebar-toggle"
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-subtitle">Constellation virtual tour workspace</div>
            </div>
          </div>

          <div className="topbar-right" ref={menuRef} style={{ position: 'relative' }}>
            <button className="avatar-btn" onClick={() => setOpen((v) => !v)} title="Account menu">
              {user?.avatar_url ? (
                <img className="avatar-img" src={user.avatar_url} alt="Avatar" />
              ) : (
                <div className="avatar-bg">
                  <div className="avatar-initials">{initials}</div>
                </div>
              )}
            </button>

            {open && (
              <div className="menu">
                <div className="menu-header">
                  <div className="menu-email">{user?.email || '—'}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {user?.is_superuser ? 'Admin' : 'User'}
                  </div>
                </div>

                <button className="menu-item" onClick={() => { setOpen(false); navigate('/account'); }}>
                  My Account
                </button>

                <button className="menu-item disabled" disabled title="Coming soon">Billing</button>
                <button className="menu-item disabled" disabled title="Coming soon">Subscription Plan</button>
                <button className="menu-item disabled" disabled title="Coming soon">Account Settings</button>
                <button className="menu-item disabled" disabled title="Coming soon">Invoices</button>

                <div className="menu-footer">
                  <button className="menu-item" onClick={() => { setOpen(false); doLogout(); }}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
};


