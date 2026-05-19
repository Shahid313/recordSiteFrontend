import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { projectsAPI } from '../api/projects';
import { videosAPI } from '../api/videos';
import { VideoUpload } from './VideoUpload';
import { constellationAPI } from '../api/constellation';
import { ConstellationView } from './ConstellationView';
import { ConstellationEditor } from './ConstellationEditor';
import { FloorplanUpload } from './FloorplanUpload';
import { FloorplanAligner } from './FloorplanAligner';
import { floorplansAPI } from '../api/floorplans';
import { collaborationAPI } from '../api/collaboration';
import { useAuth } from '../context/AuthContext';

const IN_FLIGHT_STATUSES = new Set(['UPLOADED', 'EXTRACTING_FRAMES', 'PROCESSING_SFM']);

const STATUS_LABELS = {
  UPLOADED: 'Queued',
  EXTRACTING_FRAMES: 'Extracting frames',
  PROCESSING_SFM: 'Building constellation',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const formatStatus = (status) => STATUS_LABELS[status] || status || 'Unknown';

export const ProjectDetail = () => {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [panoramas, setPanoramas] = useState([]);
  const [tab, setTab] = useState('panoramas'); // panoramas | constellation | editor | floorplans
  const [constellation, setConstellation] = useState({ nodes: [], connections: [], video_id: null, video_status: null });
  const [sfmStatus, setSfmStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [deletingVideoIds, setDeletingVideoIds] = useState(() => new Set());
  const [floorplans, setFloorplans] = useState([]);
  const [aligningFp, setAligningFp] = useState(null);
  const [collaborators, setCollaborators] = useState(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabRole, setCollabRole] = useState('viewer');
  const [collabError, setCollabError] = useState(null);

  const selectedVideoIdRef = useRef(null);

  useEffect(() => {
    selectedVideoIdRef.current = selectedVideoId;
  }, [selectedVideoId]);

  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === selectedVideoId) || null,
    [videos, selectedVideoId]
  );
  const canEditProject = project?.access_role === 'editor';
  const isProjectOwner = project?.owner_id === user?.id || user?.is_superuser;

  const load = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const p = await projectsAPI.get(projectId);
      setProject(p);
      const v = await projectsAPI.listVideos(projectId);
      setVideos(v);
      if (!selectedVideoId && v.length > 0) setSelectedVideoId(v[0].id);
      if (p.owner_id === user?.id || user?.is_superuser) {
        try {
          const c = await collaborationAPI.listCollaborators(projectId);
          setCollaborators(c);
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load project.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVideosOnly = async () => {
    try {
      const v = await projectsAPI.listVideos(projectId);
      setVideos((prev) => {
        const prevById = Object.fromEntries(prev.map((p) => [p.id, p.status]));
        // Any video that left EXTRACTING_FRAMES OR became COMPLETED -> refresh panoramas
        const refreshTargets = v.filter((nv) => {
          const prevStatus = prevById[nv.id];
          if (!prevStatus) return false;
          if (prevStatus === nv.status) return false;
          // Transition out of extraction (frames are now available)
          if (prevStatus === 'EXTRACTING_FRAMES') return true;
          // Transition into COMPLETED (final state)
          if (nv.status === 'COMPLETED') return true;
          return false;
        });
        if (refreshTargets.length) {
          setTimeout(async () => {
            const target =
              refreshTargets.find((j) => j.id === selectedVideoIdRef.current) || refreshTargets[0];
            try {
              const data = await videosAPI.listPanoramas(target.id);
              if (target.id === selectedVideoIdRef.current) {
                setPanoramas(data);
              }
            } catch { /* non-fatal */ }
            if (refreshTargets.some((t) => t.status === 'COMPLETED')) {
              try { await loadConstellation(); } catch { /* non-fatal */ }
            }
          }, 0);
        }
        return v;
      });

      // While the selected video is still in flight, keep its panoramas list
      // in sync so newly extracted frames appear progressively without refresh.
      const selId = selectedVideoIdRef.current;
      if (selId) {
        const sel = v.find((x) => x.id === selId);
        if (sel && IN_FLIGHT_STATUSES.has(sel.status)) {
          try {
            const data = await videosAPI.listPanoramas(selId);
            if (selectedVideoIdRef.current === selId) {
              setPanoramas(data);
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    if (!Number.isFinite(projectId)) return;
    load();
    loadFloorplans();
  }, [projectId]);

  const loadFloorplans = async () => {
    try {
      const fps = await floorplansAPI.list(projectId);
      setFloorplans(fps);
    } catch { /* non-fatal */ }
  };

  // Keep video list status in sync while any video is still running.
  const hasInFlight = useMemo(
    () => videos.some((v) => IN_FLIGHT_STATUSES.has(v.status)),
    [videos]
  );

  useEffect(() => {
    if (!Number.isFinite(projectId)) return undefined;
    if (!hasInFlight) return undefined;

    const t = setInterval(() => {
      refreshVideosOnly();
    }, 3000);

    return () => clearInterval(t);
  }, [projectId, hasInFlight]);

  useEffect(() => {
    const loadPanos = async () => {
      if (!selectedVideoId) {
        setPanoramas([]);
        return;
      }
      try {
        const data = await videosAPI.listPanoramas(selectedVideoId);
        setPanoramas(data);
      } catch {
        // non-fatal
      }
    };
    loadPanos();
  }, [selectedVideoId]);

  const loadConstellation = async () => {
    try {
      const data = await constellationAPI.getConstellation(projectId);
      setConstellation(data);
      if (data?.video_id) {
        const ps = await constellationAPI.getProcessingStatus(data.video_id);
        setSfmStatus(ps);
      }
    } catch {
      // non-fatal
    }
  };

  const handleUploaded = async (newVideoId) => {
    await load();
    setSelectedVideoId(newVideoId);
  };

  const handleStatusUpdate = (s) => {
    if (!s?.id) return;
    // Keep the "Videos" list in sync with live polling (no refresh needed).
    setVideos((prev) => {
      const exists = prev.some((v) => v.id === s.id);
      const next = prev.map((v) =>
        v.id === s.id
          ? {
              ...v,
              status: s.status,
              progress_percent: s.progress_percent,
              duration: s.duration,
              fps: s.fps,
              resolution: s.resolution,
              error_message: s.error_message,
              processed_at: s.processed_at,
            }
          : v
      );
      return exists ? next : [{ ...s }, ...prev];
    });
  };

  const handleCompleted = async (status) => {
    // Immediately show frames for the completed upload without refresh.
    const vid = status?.id || selectedVideoId;
    await load();
    if (vid) {
      setSelectedVideoId(vid);
      const data = await videosAPI.listPanoramas(vid);
      setPanoramas(data);
      // Also refresh constellation after SfM phase completes
      await loadConstellation();
    }
  };

  const handleDeleteProject = async () => {
    const ok = window.confirm('Delete this project? This will delete all videos and panoramas in it.');
    if (!ok || isDeletingProject) return;
    setIsDeletingProject(true);
    setError(null);
    try {
      await projectsAPI.remove(projectId);
      navigate('/projects');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete project.');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleDeleteVideo = async (e, videoId) => {
    e.preventDefault();
    e.stopPropagation();
    if (deletingVideoIds.has(videoId)) return;
    const ok = window.confirm('Delete this video and all extracted panoramas?');
    if (!ok) return;
    const previousVideos = videos;
    const previousPanoramas = panoramas;
    const previousSelectedVideoId = selectedVideoId;
    try {
      setError(null);
      setDeletingVideoIds((prev) => new Set(prev).add(videoId));
      const nextVideos = videos.filter((v) => v.id !== videoId);
      setVideos(nextVideos);
      if (selectedVideoId === videoId) {
        const nextSelected = nextVideos[0]?.id ?? null;
        setSelectedVideoId(nextSelected);
        setPanoramas([]);
      }
      await videosAPI.remove(videoId);
      await refreshVideosOnly();
    } catch (err) {
      setVideos(previousVideos);
      setPanoramas(previousPanoramas);
      setSelectedVideoId(previousSelectedVideoId);
      setError(err?.response?.data?.detail || 'Failed to delete video.');
    } finally {
      setDeletingVideoIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };

  const loadCollaborators = async () => {
    if (!isProjectOwner) return;
    try {
      const data = await collaborationAPI.listCollaborators(projectId);
      setCollaborators(data);
      setCollabError(null);
    } catch (err) {
      setCollabError(err?.response?.data?.detail || 'Failed to load collaborators.');
    }
  };

  const addCollaborator = async () => {
    if (!collabEmail.trim()) return;
    try {
      await collaborationAPI.addCollaborator(projectId, { email: collabEmail.trim(), role: collabRole });
      setCollabEmail('');
      await loadCollaborators();
    } catch (err) {
      setCollabError(err?.response?.data?.detail || 'Failed to add collaborator.');
    }
  };

  const updateCollaboratorRole = async (collaboratorId, role) => {
    try {
      await collaborationAPI.updateCollaborator(projectId, collaboratorId, { role });
      await loadCollaborators();
    } catch (err) {
      setCollabError(err?.response?.data?.detail || 'Failed to update collaborator.');
    }
  };

  const removeCollaborator = async (collaboratorId) => {
    try {
      await collaborationAPI.removeCollaborator(projectId, collaboratorId);
      await loadCollaborators();
    } catch (err) {
      setCollabError(err?.response?.data?.detail || 'Failed to remove collaborator.');
    }
  };

  if (!Number.isFinite(projectId)) {
    return <div className="container">Invalid project id.</div>;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: 10 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/projects')}>
          ← Back to Projects
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="muted">Loading…</div>
      ) : !project ? (
        <div className="muted">Project not found.</div>
      ) : (
        <>
          <div className="card surface-hero">
            <div className="card-inner">
              <div className="page-kicker">Project workspace</div>
              <div className="pd-header">
                <div>
                  <h1 className="title">{project.name}</h1>
                  <div className="subtitle">{project.description || 'No description'}</div>
                </div>
                <div className="pd-header-right">
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
                    <div><b>Created:</b> {new Date(project.created_at).toLocaleString()}</div>
                    <div><b>Updated:</b> {new Date(project.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="page-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                    <button
                      onClick={() => navigate(`/projects/${projectId}/tour`)}
                      className="btn btn-primary"
                      disabled={panoramas.length === 0}
                      title={panoramas.length === 0 ? 'No panoramas yet' : 'Open the interactive virtual tour viewer'}
                    >
                      View Virtual Tour
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      className="btn btn-danger"
                      disabled={isDeletingProject}
                      style={{ display: isProjectOwner ? undefined : 'none' }}
                    >
                      {isDeletingProject ? 'Deleting…' : 'Delete Project'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="tabs-row">
                <button
                  className={`tab-btn ${tab === 'panoramas' ? 'active' : ''}`}
                  onClick={() => setTab('panoramas')}
                >
                  Panoramas
                </button>
                <button
                  className={`tab-btn ${tab === 'constellation' ? 'active' : ''}`}
                  onClick={async () => {
                    setTab('constellation');
                    await loadConstellation();
                  }}
                >
                  Constellation
                </button>
                <button
                  className={`tab-btn ${tab === 'editor' ? 'active' : ''}`}
                  style={{ display: canEditProject ? undefined : 'none' }}
                  onClick={async () => {
                    setTab('editor');
                    await loadConstellation();
                  }}
                >
                  Editor
                </button>
                <button
                  className={`tab-btn ${tab === 'floorplans' ? 'active' : ''}`}
                  style={{ display: canEditProject ? undefined : 'none' }}
                  onClick={() => setTab('floorplans')}
                >
                  Floorplans
                </button>
                {isProjectOwner && (
                  <button
                    className={`tab-btn ${tab === 'collaboration' ? 'active' : ''}`}
                    onClick={() => {
                      setTab('collaboration');
                      loadCollaborators();
                    }}
                  >
                    Collaboration
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="pd-grid" style={{ marginTop: 16 }}>
            <div className="card" style={{ display: canEditProject ? undefined : 'none' }}>
              <div className="card-inner">
                <div className="section-head">
                  <h2 className="section-title">Upload Video</h2>
                </div>
                <VideoUpload
                  projectId={projectId}
                  onUploaded={handleUploaded}
                  onStatus={handleStatusUpdate}
                  onCompleted={handleCompleted}
                  onFailed={() => load()}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="section-head">
                  <h2 className="section-title">Videos</h2>
                </div>
                {videos.length === 0 ? (
                  <div className="muted">No videos uploaded yet.</div>
                ) : (
                  <div className="pd-videos">
                    {videos.map((v) => (
                      <div
                        key={v.id}
                        className={`pd-video-row ${v.id === selectedVideoId ? 'active' : ''}`}
                        onClick={() => setSelectedVideoId(v.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedVideoId(v.id);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.filename}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {formatStatus(v.status)}
                              {typeof v.progress_percent === 'number' && v.status !== 'COMPLETED'
                                ? ` • ${Math.round(v.progress_percent)}%`
                                : ''}
                            </div>
                          </div>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '7px 10px', borderRadius: 12, display: canEditProject ? undefined : 'none' }}
                            onClick={(e) => handleDeleteVideo(e, v.id)}
                            title="Delete video"
                            disabled={!canEditProject || deletingVideoIds.has(v.id)}
                          >
                            {deletingVideoIds.has(v.id) ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {tab === 'editor' ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-inner">
              <ConstellationEditor
                projectId={projectId}
                onClose={() => setTab('constellation')}
                onSaved={() => loadConstellation()}
              />
            </div>
          </div>
          ) : tab === 'floorplans' ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-inner">
              <h2 style={{ margin: '0 0 14px 0' }}>Floorplans</h2>
              {aligningFp ? (
                <FloorplanAligner
                  projectId={projectId}
                  floorplan={aligningFp}
                  onSaved={() => { setAligningFp(null); loadFloorplans(); }}
                  onClose={() => setAligningFp(null)}
                />
              ) : (
                <>
                  <FloorplanUpload projectId={projectId} floorplans={floorplans} onRefresh={loadFloorplans} />
                  {floorplans.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Align with Constellation</h3>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {floorplans.map((fp) => (
                          <button key={fp.id} className="btn" onClick={() => setAligningFp(fp)}>
                            Align "{fp.name}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          ) : tab === 'collaboration' ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-inner">
              <h2 style={{ margin: '0 0 14px 0' }}>Collaboration</h2>
              {collabError && <div className="error" style={{ marginBottom: 12 }}>{collabError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 160px auto', gap: 10, alignItems: 'end' }}>
                <label>
                  <span className="label">User email</span>
                  <input className="input" value={collabEmail} onChange={(e) => setCollabEmail(e.target.value)} placeholder="teammate@example.com" />
                </label>
                <label>
                  <span className="label">Role</span>
                  <select value={collabRole} onChange={(e) => setCollabRole(e.target.value)}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                </label>
                <button className="btn btn-primary" onClick={addCollaborator}>Add</button>
              </div>
              <div className="divider" />
              <div className="pd-videos">
                {collaborators?.collaborators?.length ? collaborators.collaborators.map((collab) => (
                  <div key={collab.id} className="pd-video-row" style={{ cursor: 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{collab.user?.name || collab.user?.email}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{collab.user?.email}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select value={collab.role} onChange={(e) => updateCollaboratorRole(collab.id, e.target.value)} style={{ width: 130 }}>
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button className="btn btn-danger" onClick={() => removeCollaborator(collab.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="muted">No collaborators yet.</div>
                )}
              </div>
            </div>
          </div>
          ) : tab === 'panoramas' ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Extracted Panoramas</h2>
              {selectedVideo && (
                <div className="muted" style={{ fontSize: 13 }}>
                  Video: <b>{selectedVideo.filename}</b> • {panoramas.length} frames
                </div>
              )}
            </div>
            {panoramas.length === 0 ? (
              <div className="muted" style={{ marginTop: 10 }}>
                {selectedVideo ? 'No panoramas yet (processing may still be running).' : 'Select a video to view panoramas.'}
              </div>
            ) : (
              <div className="pd-pano-grid" style={{ marginTop: 12 }}>
                {panoramas.map((p) => (
                  <a key={p.id} href={p.file_url || '#'} target="_blank" rel="noreferrer" className="pd-pano-item">
                    <img
                      src={p.thumbnail_url || p.file_url}
                      alt={`Frame ${p.frame_number}`}
                      className="pd-pano-img"
                      loading="lazy"
                    />
                    <div className="pd-pano-cap">
                      #{p.frame_number} • {p.timestamp}s
                    </div>
                  </a>
                ))}
              </div>
            )}
            </div>
          </div>
          ) : (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-inner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>Constellation graph</h2>
                <div className="muted" style={{ fontSize: 13 }}>
                  {sfmStatus?.stage ? (
                    <>
                      {sfmStatus.stage}
                      {typeof sfmStatus.progress_percent === 'number' ? `: ${Math.round(sfmStatus.progress_percent)}%` : ''}
                    </>
                  ) : (
                    constellation?.video_status || ''
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {constellation?.nodes?.length ? (
                  <ConstellationView
                    nodes={constellation.nodes}
                    connections={constellation.connections || []}
                    onSelectNode={() => {
                      // Jump to panoramas tab and show the selected panorama's video
                      setTab('panoramas');
                      setSelectedVideoId(constellation.video_id);
                    }}
                  />
                ) : (
                  <div className="muted">No constellation data yet. Upload a video and wait for SfM processing.</div>
                )}
              </div>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};


