import React, { useState } from 'react';
import { usersAPI } from '../api/users';

export const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsSaving(true);
    try {
      await usersAPI.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      setSuccess('Password updated successfully.');
    } catch (e2) {
      setError(e2?.response?.data?.detail || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-content">
          <div className="page-kicker">Security</div>
          <h1 className="title">Change Password</h1>
          <p className="subtitle">Update your password and keep access to your workspace secure across all devices.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-inner">
          {error && <div className="error">{error}</div>}
          {success && <div className="success-banner" style={{ marginTop: 10 }}>{success}</div>}

          <form onSubmit={submit} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="label">Current password</div>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="label">New password</div>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <div className="label">Confirm new password</div>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-actions" style={{ marginTop: 6 }}>
              <button className="btn btn-primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


