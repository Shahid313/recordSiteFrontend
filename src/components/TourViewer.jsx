import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toursAPI } from '../api/tours';
import { PanoramaViewer } from './PanoramaViewer';
import { ConstellationViewer } from './ConstellationViewer';
import { FloorplanViewer } from './FloorplanViewer';
import { FloorSwitcher } from './FloorSwitcher';
import { NavigationControls } from './NavigationControls';
import { ConstellationEditor } from './ConstellationEditor';
import { collaborationAPI } from '../api/collaboration';
import './TourViewer.css';

const isMobile = () => (typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 640px)')?.matches : false);

export const TourViewer = ({ projectId, tourData, onExit }) => {
  const containerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const cacheRef = useRef(new Map()); // panoId -> details

  const ordered = useMemo(() => {
    const list = tourData?.panoramas || [];
    return [...list].sort((a, b) => (a.frame_number ?? 0) - (b.frame_number ?? 0));
  }, [tourData]);

  const panoById = useMemo(() => new Map(ordered.map((p) => [p.id, p])), [ordered]);

  const startPanoId = tourData?.metadata?.start_pano_id || (ordered[0]?.id ?? null);
  const total = tourData?.metadata?.total || ordered.length || 0;
  const accessRole = tourData?.metadata?.access_role || 'viewer';
  const canResolveComments = accessRole === 'editor';

  const [currentPanoId, setCurrentPanoId] = useState(startPanoId);
  const [currentDetails, setCurrentDetails] = useState(null);
  const [visited, setVisited] = useState(() => (startPanoId ? [startPanoId] : []));

  const [showMinimap, setShowMinimap] = useState(!isMobile());
  const [mapMode, setMapMode] = useState('minimap'); // minimap | full
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fade, setFade] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsError, setCommentsError] = useState(null);
  const [commentMode, setCommentMode] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);

  /* floorplan support */
  const floorplans = useMemo(() => tourData?.floorplans || [], [tourData]);
  const hasFloorplans = floorplans.length > 0;
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  /* auto-select floor based on current panorama */
  useEffect(() => {
    if (!hasFloorplans) return;
    const curPano = panoById.get(currentPanoId);
    if (curPano?.floor_id) setSelectedFloorId(curPano.floor_id);
  }, [currentPanoId, panoById, hasFloorplans]);

  const activeFloorplan = useMemo(
    () => floorplans.find((f) => f.id === selectedFloorId) || floorplans[0] || null,
    [floorplans, selectedFloorId],
  );

  const currentComments = useMemo(
    () => comments.filter((comment) => comment.panorama_id === currentPanoId),
    [comments, currentPanoId],
  );

  const selectedComment = useMemo(
    () => comments.find((comment) => comment.id === selectedCommentId) || null,
    [comments, selectedCommentId],
  );

  /* filter panoramas for current floor */
  const floorPanoramas = useMemo(() => {
    if (!selectedFloorId) return ordered;
    return ordered.filter((p) => p.floor_id === selectedFloorId || p.is_transition);
  }, [ordered, selectedFloorId]);

  /* handle transition navigation */
  const handleTransitionNavigate = (pano) => {
    if (pano.is_transition && pano.transition_pano_id) {
      if (pano.transition_floor_id) setSelectedFloorId(pano.transition_floor_id);
      navigateTo(pano.transition_pano_id);
    }
  };

  useEffect(() => {
    setCurrentPanoId(startPanoId);
    setVisited(startPanoId ? [startPanoId] : []);
  }, [projectId, startPanoId]);

  const loadComments = async () => {
    try {
      const rows = await collaborationAPI.listComments(projectId);
      setComments(rows);
      setCommentsError(null);
    } catch (e) {
      setCommentsError(e?.response?.data?.detail || 'Failed to load comments.');
    }
  };

  useEffect(() => {
    if (!projectId) return undefined;
    loadComments();
    const timer = setInterval(loadComments, 5000);
    return () => clearInterval(timer);
  }, [projectId]);

  const idx = useMemo(() => ordered.findIndex((p) => p.id === currentPanoId), [ordered, currentPanoId]);
  const prevId = idx > 0 ? ordered[idx - 1].id : null;
  const nextId = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;

  const preloadImage = (url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  };

  const loadDetails = async (panoId) => {
    if (!panoId) return null;
    if (cacheRef.current.has(panoId)) return cacheRef.current.get(panoId);
    const d = await toursAPI.getPanoramaDetails(panoId);
    cacheRef.current.set(panoId, d);
    return d;
  };

  const navigateTo = async (newId) => {
    if (!newId || newId === currentPanoId) return;
    setFade(true);
    setTimeout(() => {
      setCurrentPanoId(newId);
      setVisited((v) => (v.includes(newId) ? v : [...v, newId]));
      setFade(false);
    }, 140);
  };

  const createCommentAt = async ({ yaw, pitch }) => {
    if (!currentPanoId) return;
    const body = window.prompt('Add a comment for this marker');
    if (!body?.trim()) return;
    try {
      const created = await collaborationAPI.createComment(projectId, {
        panorama_id: currentPanoId,
        body: body.trim(),
        yaw,
        pitch,
      });
      setComments((prev) => [...prev.filter((comment) => comment.id !== created.id), created]);
      setSelectedCommentId(created.id);
      setCommentMode(false);
      setCommentsError(null);
    } catch (e) {
      setCommentsError(e?.response?.data?.detail || 'Failed to create comment.');
    }
  };

  const toggleResolved = async (comment) => {
    if (!comment || !canResolveComments) return;
    try {
      const updated = await collaborationAPI.setResolved(comment.id, !comment.resolved);
      setComments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setCommentsError(null);
    } catch (e) {
      setCommentsError(e?.response?.data?.detail || 'Failed to update comment.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentPanoId) {
        setCurrentDetails(null);
        return;
      }
      try {
        const d = await loadDetails(currentPanoId);
        if (!cancelled) setCurrentDetails(d);
        // Preload sequential neighbors
        const pPrev = prevId ? panoById.get(prevId) : null;
        const pNext = nextId ? panoById.get(nextId) : null;
        preloadImage(pPrev?.image_url);
        preloadImage(pNext?.image_url);
        if (prevId) loadDetails(prevId).catch(() => {});
        if (nextId) loadDetails(nextId).catch(() => {});
      } catch (e) {
        if (!cancelled) setCurrentDetails({ error: e?.response?.data?.detail || 'Failed to load panorama.' });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentPanoId, prevId, nextId, panoById]);

  // Fullscreen state sync
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        if (prevId) navigateTo(prevId);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (nextId) navigateTo(nextId);
      } else if (e.key?.toLowerCase?.() === 'm') {
        setShowMinimap((s) => !s);
      } else if (e.key?.toLowerCase?.() === 'h') {
        if (startPanoId) navigateTo(startPanoId);
      } else if (e.key?.toLowerCase?.() === 'f') {
        toggleFullscreen();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsAutoRotate((a) => !a);
      } else if (e.key === 'Escape') {
        onExit?.();
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevId, nextId, startPanoId, onExit]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const infoText = useMemo(() => {
    const n = idx >= 0 ? idx + 1 : 0;
    const frame = panoById.get(currentPanoId)?.frame_number;
    return `${n}/${total}${typeof frame === 'number' ? ` • Frame ${frame}` : ''}`;
  }, [idx, total, currentPanoId, panoById]);

  if (!tourData || !ordered.length) {
    return (
      <div className="tv-shell">
        <div className="tv-empty">
          <div className="title" style={{ fontSize: 18 }}>
            No panoramas found
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            Upload and process a video first.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`tv-shell ${fade ? 'tv-fade' : ''}`}>
      <div className="tv-main">
        {currentDetails?.error ? (
          <div className="tv-error">{currentDetails.error}</div>
        ) : (
          <PanoramaViewer
            panorama={currentDetails}
            onNavigate={(id) => navigateTo(id)}
            showControls
            autoRotate={isAutoRotate}
            comments={currentComments}
            commentMode={commentMode}
            onCreateComment={createCommentAt}
            onSelectComment={setSelectedCommentId}
            onViewerReady={(v) => {
              viewerInstanceRef.current = v;
            }}
          />
        )}

        <NavigationControls
          onPrev={() => prevId && navigateTo(prevId)}
          onNext={() => nextId && navigateTo(nextId)}
          onHome={() => startPanoId && navigateTo(startPanoId)}
          onToggleMinimap={() => setShowMinimap((s) => !s)}
          onToggleFullscreen={toggleFullscreen}
          onToggleAutoRotate={() => setIsAutoRotate((a) => !a)}
          onEdit={() => setShowEditor(true)}
          isMinimapVisible={showMinimap}
          isFullscreen={isFullscreen}
          isAutoRotate={isAutoRotate}
          infoText={infoText}
        />

        {showEditor && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--bg, #111)' }}>
            <ConstellationEditor
              projectId={projectId}
              onClose={() => setShowEditor(false)}
              onSaved={() => setShowEditor(false)}
            />
          </div>
        )}

        <div className="tv-comments-panel">
          <div className="tv-comments-head">
            <div>
              <div className="tv-comments-title">Comments</div>
              <div className="tv-comments-meta">{currentComments.length} on this panorama</div>
            </div>
            <button
              className={`tv-ctl tv-comment-add ${commentMode ? 'active' : ''}`}
              onClick={() => setCommentMode((v) => !v)}
              title="Place a comment marker"
            >
              {commentMode ? 'Cancel' : 'Add marker'}
            </button>
          </div>
          {commentMode && <div className="tv-comments-hint">Click anywhere in the panorama to place the marker.</div>}
          {commentsError && <div className="tv-comments-error">{commentsError}</div>}
          <div className="tv-comments-list">
            {currentComments.length === 0 ? (
              <div className="tv-comments-empty">No comments here yet.</div>
            ) : (
              currentComments.map((comment) => (
                <button
                  key={comment.id}
                  className={`tv-comment-row ${comment.id === selectedCommentId ? 'active' : ''} ${comment.resolved ? 'resolved' : ''}`}
                  onClick={() => setSelectedCommentId(comment.id)}
                >
                  <div className="tv-comment-body">{comment.body}</div>
                  <div className="tv-comment-meta">
                    {comment.author?.name || 'Unknown'} - {comment.resolved ? 'Resolved' : 'Open'}
                  </div>
                </button>
              ))
            )}
          </div>
          {selectedComment && (
            <div className="tv-comment-detail">
              <div className="tv-comment-body">{selectedComment.body}</div>
              <div className="tv-comment-meta">
                {selectedComment.author?.name || 'Unknown'} - {new Date(selectedComment.created_at).toLocaleString()}
              </div>
              <button
                className="tv-ctl"
                disabled={!canResolveComments}
                onClick={() => toggleResolved(selectedComment)}
                title={canResolveComments ? 'Resolve or reopen this comment' : 'Viewer role cannot resolve comments'}
              >
                {selectedComment.resolved ? 'Reopen' : 'Resolve'}
              </button>
            </div>
          )}
        </div>

        {showMinimap && (
          <div className={mapMode === 'full' ? 'tv-map-wrap tv-map-wrap-full' : 'tv-map-wrap'}>
            {hasFloorplans && (
              <div style={{ marginBottom: 6 }}>
                <FloorSwitcher
                  floorplans={floorplans}
                  selectedFloorId={selectedFloorId}
                  onSelectFloor={setSelectedFloorId}
                />
              </div>
            )}
            {hasFloorplans && activeFloorplan ? (
              <FloorplanViewer
                floorplan={activeFloorplan}
                panoramas={floorPanoramas}
                connections={tourData.connections || []}
                currentPanoId={currentPanoId}
                visitedIds={visited}
                onSelectPano={(id) => {
                  const pano = panoById.get(id);
                  if (pano?.is_transition && pano?.transition_pano_id) {
                    handleTransitionNavigate(pano);
                  } else {
                    navigateTo(id);
                  }
                }}
                showConnectionLines
                mode={mapMode}
                onToggleMode={() => setMapMode((m) => (m === 'full' ? 'minimap' : 'full'))}
              />
            ) : (
              <ConstellationViewer
                nodes={ordered}
                connections={tourData.connections || []}
                currentPanoId={currentPanoId}
                visitedIds={visited}
                onSelectPano={(id) => navigateTo(id)}
                mode={mapMode}
                onToggleMode={() => setMapMode((m) => (m === 'full' ? 'minimap' : 'full'))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};


