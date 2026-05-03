import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import { CreateProjectModal } from './CreateProjectModal';

export const ProjectList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await projectsAPI.list();
      setProjects(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (payload) => {
    const created = await projectsAPI.create(payload);
    await load();
    navigate(`/projects/${created.id}`);
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    const ok = window.confirm('Delete this project? This will delete all videos and panoramas in it.');
    if (!ok) return;
    try {
      await projectsAPI.remove(projectId);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete project.');
    }
  };

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-content">
          <div className="page-kicker">Project library</div>
          <h1 className="title">Build, review, and present every tour from one place.</h1>
          <p className="subtitle">Create a more polished project workspace for uploads, panorama extraction, constellation editing, and floorplan alignment.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Create Project
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="muted">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card surface-hero">
          <div className="card-inner">
            <div className="page-kicker">Start here</div>
            <h2 className="section-title" style={{ color: '#fff', fontSize: 28 }}>No projects yet.</h2>
            <p className="subtitle">Create your first project to begin uploading videos and shaping your virtual tour experience.</p>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => setIsModalOpen(true)}>
              Create your first project
            </button>
          </div>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <div key={p.id} className="project-tile">
              <button
                className="card-1 project-tile-card"
                onClick={() => navigate(`/projects/${p.id}`)}
                title="Open project"
              >
                <div className="card-inner">
                  <div className="project-meta">
                    <div className="project-pill">Project</div>
                    <div className="muted" style={{ fontSize: 12 }}>#{p.id}</div>
                  </div>
                  <div className="project-title-1">{p.name}</div>
                  <div className="project-desc-1">{p.description || 'No description'}</div>
                  <div className="project-foot-1">
                    Updated {new Date(p.updated_at).toLocaleString()}
                  </div>
                </div>
              </button>
              <button
                className="btn btn-danger"
                style={{ position: 'absolute', top: 12, right: 12, padding: '7px 10px', borderRadius: 12 }}
                onClick={(e) => handleDelete(e, p.id)}
                title="Delete project"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};


