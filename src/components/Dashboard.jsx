import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsAPI } from '../api/projects';
import { CreateProjectModal } from './CreateProjectModal';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const loadProjects = async () => {
    setError(null);
    try {
      const data = await projectsAPI.list();
      setTotalProjects(data.length);
      setProjects(data.slice(0, 3));
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load recent projects.');
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="container">
      <div className="card surface-hero">
        <div className="card-inner">
          <div className="page-kicker">Dashboard overview</div>
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div className="page-head-content">
              <h1 className="title">Welcome back, {user?.full_name || 'there'}.</h1>
              <p className="subtitle">Keep your tour pipeline moving from upload to alignment to presentation with a more refined workspace.</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ Create project</button>
              <button className="btn" onClick={() => navigate('/projects')}>Browse projects</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Projects</div>
              <div className="stat-value">{totalProjects}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recent list</div>
              <div className="stat-value">{projects.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Role</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{user?.is_superuser ? 'Admin' : 'Member'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-inner">
            <div className="section-head">
              <h2 className="section-title">Recent projects</h2>
              <div className="dash-actions">
                <button className="btn btn-accent" onClick={() => setIsModalOpen(true)}>New project</button>
                <button className="btn" onClick={() => navigate('/projects')}>View all</button>
              </div>
            </div>

            {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

            <div className="stack-list" style={{ marginTop: 12 }}>
              {projects.length === 0 ? (
                <div className="muted">No projects yet. Create one to start uploading 360° videos.</div>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    className="list-card btn"
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{ textAlign: 'left' }}
                  >
                    <div style={{ fontWeight: 950 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.description || 'No description'}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>Updated {new Date(p.updated_at).toLocaleString()}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            <h2 className="section-title">Quick start</h2>
            <div className="check-list" style={{ marginTop: 14 }}>
              <div className="check-item"><div className="check-bullet">1</div><div>Create a project space for the site or property you want to publish.</div></div>
              <div className="check-item"><div className="check-bullet">2</div><div>Upload a 360° MP4, MOV, or AVI video and let processing extract panoramas.</div></div>
              <div className="check-item"><div className="check-bullet">3</div><div>Review constellation and floorplan alignment before opening the virtual tour.</div></div>
            </div>

            <div className="divider" />

            <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (payload) => {
          const created = await projectsAPI.create(payload);
          await loadProjects();
          navigate(`/projects/${created.id}`);
        }}
      />
    </div>
  );
};