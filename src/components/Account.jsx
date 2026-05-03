import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../api/users';

export const Account = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const saveAvatar = async () => {
    setError(null);
    setSuccess(null);
    if (!file) return;
    setIsSaving(true);
    try {
      await usersAPI.uploadAvatar(file);
      setFile(null);
      await refreshUser();
      setSuccess('Profile image updated.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to upload avatar.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAccount = async () => {
    const ok = window.confirm('Delete your account? This will permanently remove your projects, videos, and panoramas.');
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      await usersAPI.deleteMe();
      await logout();
      navigate('/login');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-content">
          <div className="page-kicker">Profile settings</div>
          <h1 className="title">My Account</h1>
          <p className="subtitle">Manage your identity, avatar, and account actions from a cleaner control panel.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          {error && <div className="error">{error}</div>}
          {success && <div className="success-banner" style={{ marginTop: 10 }}>{success}</div>}

          <div className="account-grid" style={{ marginTop: 14 }}>
            <div>
              <div className="avatar-frame">
                <img
                  src={previewUrl || user?.avatar_url || 'https://dummyimage.com/320x320/0f172a/ffffff&text=Avatar'}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div className="file-hint" style={{ marginTop: 10 }}>
                JPG/PNG/WebP up to 5MB
              </div>
            </div>

            <div>
              <div className="label">Email</div>
              <div style={{ fontWeight: 900, marginTop: 6 }}>{user?.email}</div>
              <div className="muted" style={{ marginTop: 2 }}>{user?.full_name || '—'}</div>

              <div className="divider" />

              <div className="label">Profile image</div>
              <div style={{ marginTop: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />

                <div className="file-row">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    Choose image
                  </button>

                  <div style={{ minWidth: 0 }}>
                    <div className="file-name" title={file?.name || 'No file selected'}>
                      {file?.name || 'No file selected'}
                    </div>
                    <div className="file-hint">Tip: square images look best</div>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-primary" onClick={saveAvatar} disabled={!file || isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn" onClick={() => setFile(null)} disabled={!file || isSaving}>
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="divider" />

          <div className="danger-zone">
            <div>
              <div style={{ fontWeight: 950 }}>Danger Zone</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Delete your account and all associated data.
              </div>
            </div>
            <button className="btn btn-danger" onClick={deleteAccount} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


