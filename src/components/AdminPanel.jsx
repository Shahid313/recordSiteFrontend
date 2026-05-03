import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/admin';

export const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [setPanoramas, setSetPanoramas] = useState([]);
  const [isLoadingSet, setIsLoadingSet] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const loadUsers = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await adminAPI.listUsers();
      setUsers(data);
      if (!selectedUserId && data.length > 0) setSelectedUserId(data[0].id);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDetails = async (userId) => {
    setError(null);
    try {
      const [p, s] = await Promise.all([
        adminAPI.listUserProjects(userId),
        adminAPI.listUserPanoramaSets(userId),
      ]);
      setProjects(p);
      setSets(s);
      setSelectedSet(null);
      setSetPanoramas([]);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load user details.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) loadUserDetails(selectedUserId);
  }, [selectedUserId]);

  if (!user?.is_superuser) {
    return (
      <div className="container">
        <div className="page-head">
          <div className="page-head-content">
            <div className="page-kicker">Restricted area</div>
            <h1 className="title">Admin Panel</h1>
            <p className="subtitle">Admin privileges are required to access this area.</p>
          </div>
          <div className="page-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const toggleUser = async (userId, patch) => {
    try {
      const updated = await adminAPI.updateUser(userId, patch);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to update user.');
    }
  };

  const deleteUser = async (userId) => {
    const ok = window.confirm('Delete this user? This will also delete their projects/videos/panoramas.');
    if (!ok) return;
    try {
      await adminAPI.deleteUser(userId);
      await loadUsers();
      setSelectedUserId(null);
      setProjects([]);
      setSets([]);
      setSelectedSet(null);
      setSetPanoramas([]);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const deleteProject = async (projectId) => {
    const ok = window.confirm('Delete this project?');
    if (!ok) return;
    try {
      await adminAPI.deleteProject(projectId);
      if (selectedUserId) await loadUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to delete project.');
    }
  };

  const openSet = async (s) => {
    setError(null);
    setSelectedSet(s);
    setIsLoadingSet(true);
    try {
      const panos = await adminAPI.listVideoPanoramas(s.video_id);
      setSetPanoramas(panos);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load panoramas for this set.');
      setSetPanoramas([]);
    } finally {
      setIsLoadingSet(false);
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-content">
          <div className="page-kicker">Admin tools</div>
          <h1 className="title">Admin Panel</h1>
          <p className="subtitle">Review users, projects, and panorama sets with a clearer operational dashboard.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="card"><div className="card-inner">Loading…</div></div>
      ) : (
        <div className="admin-grid">
          <div className="card">
            <div className="card-inner">
            <div className="section-head">
              <h2 className="section-title">Users</h2>
              <button className="btn btn-accent" onClick={loadUsers}>Refresh</button>
            </div>
            <div className="admin-list">
              {users.map((u) => (
                <button
                  key={u.id}
                  className="admin-list-item"
                  style={{ borderColor: u.id === selectedUserId ? 'rgba(90, 119, 146, 0.38)' : undefined }}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <div style={{ fontWeight: 900, color: 'var(--text-strong)' }}>{u.email}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {u.full_name || '—'} • {u.is_active ? 'Active' : 'Inactive'} • {u.is_superuser ? 'Admin' : 'User'}
                  </div>
                </button>
              ))}
            </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
            <h2 className="section-title">User Details</h2>
            {!selectedUser ? (
              <div className="muted">Select a user.</div>
            ) : (
              <>
                <div className="admin-detail-row" style={{ marginTop: 12 }}>
                  <div><b>ID:</b> {selectedUser.id}</div>
                  <div><b>Email:</b> {selectedUser.email}</div>
                </div>
                <div className="admin-actions-row" style={{ marginTop: 14 }}>
                  <button
                    className="btn btn-accent"
                    onClick={() => toggleUser(selectedUser.id, { is_active: !selectedUser.is_active })}
                  >
                    {selectedUser.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="btn btn-accent"
                    onClick={() => toggleUser(selectedUser.id, { is_superuser: !selectedUser.is_superuser })}
                  >
                    {selectedUser.is_superuser ? 'Remove admin' : 'Make admin'}
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteUser(selectedUser.id)}>
                    Delete user
                  </button>
                </div>

                <div className="admin-split">
                  <div>
                    <h3 className="section-title" style={{ fontSize: 16, marginTop: 18 }}>Projects</h3>
                    {projects.length === 0 ? (
                      <div className="muted">No projects.</div>
                    ) : (
                      <div className="admin-list">
                        {projects.map((p) => (
                          <div key={p.id} className="admin-project-row">
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 900, color: 'var(--text-strong)' }}>{p.name}</div>
                              <div className="muted" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.description || '—'}
                              </div>
                            </div>
                            <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => deleteProject(p.id)}>
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="section-title" style={{ fontSize: 16, marginTop: 18 }}>Panorama sets (by video)</h3>
                    {sets.length === 0 ? (
                      <div className="muted">No panorama sets.</div>
                    ) : (
                      <div className="admin-set-grid">
                        {sets.map((s) => (
                          <button
                            key={`${s.project_id}-${s.video_id}`}
                            className="admin-set-card"
                            style={{ borderColor: selectedSet?.video_id === s.video_id ? 'rgba(90, 119, 146, 0.38)' : undefined }}
                            onClick={() => openSet(s)}
                            title="Click to view all panoramas in this set"
                          >
                            {s.sample_thumbnail_url ? (
                              <img src={s.sample_thumbnail_url} alt="Sample" className="admin-thumb" />
                            ) : (
                              <div className="admin-thumb-placeholder">No thumbnail</div>
                            )}
                            <div
                              style={{ fontWeight: 900, color: 'var(--text-strong)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={s.video_filename}
                            >
                              {s.video_filename}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              Project: {s.project_name}
                            </div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              Frames: {s.panoramas_count}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedSet && (
                  <div style={{ marginTop: 16 }}>
                    <div className="admin-set-header">
                      <h3 className="section-title" style={{ fontSize: 16, margin: 0 }}>
                        Panoramas: {selectedSet.video_filename}
                      </h3>
                      <button className="btn btn-accent" onClick={() => { setSelectedSet(null); setSetPanoramas([]); }}>
                        Close
                      </button>
                    </div>

                    {isLoadingSet ? (
                      <div className="muted" style={{ marginTop: 10 }}>Loading panoramas…</div>
                    ) : setPanoramas.length === 0 ? (
                      <div className="muted" style={{ marginTop: 10 }}>No panoramas found for this set.</div>
                    ) : (
                      <div className="admin-pano-grid">
                        {setPanoramas.map((p) => (
                          <a
                            key={p.id}
                            href={p.file_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-pano-item"
                            title={`Frame ${p.frame_number} at ${p.timestamp}s`}
                          >
                            <img
                              src={p.thumbnail_url || p.file_url}
                              alt={`Frame ${p.frame_number}`}
                              className="admin-pano-img"
                              loading="lazy"
                            />
                            <div className="admin-pano-caption">
                              #{p.frame_number} • {p.timestamp}s
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



