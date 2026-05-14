import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'pannellum/build/pannellum.css';
import 'pannellum/build/pannellum.js';
import { getApiFileProxyUrl } from '../api/auth';

const getPannellumViewer = () => {
  return typeof window !== 'undefined' ? window.pannellum?.viewer : undefined;
};

const hotspotClassForConfidence = (c) => {
  if (typeof c !== 'number') return 'cv-hotspot cv-hotspot-low';
  if (c >= 0.8) return 'cv-hotspot cv-hotspot-high';
  if (c >= 0.5) return 'cv-hotspot cv-hotspot-med';
  return 'cv-hotspot cv-hotspot-low';
};

export const PanoramaViewer = ({
  panorama,
  onNavigate,
  showControls = true,
  autoRotate = false,
  onViewerReady,
  comments = [],
  commentMode = false,
  onCreateComment,
  onSelectComment,
}) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const hotspotIdsRef = useRef([]);
  const onViewerReadyRef = useRef(onViewerReady);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const panoramaImageUrl = useMemo(
    () => getApiFileProxyUrl(panorama?.image_url),
    [panorama?.image_url],
  );

  useEffect(() => {
    onViewerReadyRef.current = onViewerReady;
  }, [onViewerReady]);

  const navigationHotSpots = useMemo(() => {
    const list = panorama?.connected_panoramas || [];
    return list.map((c) => ({
      id: `nav-${c.id}`,
      pitch: typeof c.pitch === 'number' ? c.pitch : 0,
      yaw: typeof c.yaw === 'number' ? c.yaw : typeof c.direction === 'number' ? c.direction : 0,
      cssClass: hotspotClassForConfidence(c.confidence),
      createTooltipFunc: (hotSpotDiv) => {
        hotSpotDiv.innerHTML = `<div class="cv-hotspot-inner">Next</div>`;
      },
      clickHandlerFunc: () => onNavigate?.(c.id),
    }));
  }, [panorama, onNavigate]);

  const commentHotSpots = useMemo(() => {
    return comments.map((comment) => ({
      id: `comment-${comment.id}`,
      pitch: typeof comment.pitch === 'number' ? comment.pitch : 0,
      yaw: typeof comment.yaw === 'number' ? comment.yaw : 0,
      cssClass: `cv-comment-hotspot ${comment.resolved ? 'resolved' : ''}`,
      createTooltipFunc: (hotSpotDiv) => {
        hotSpotDiv.innerHTML = `<div class="cv-comment-dot">${comment.resolved ? 'OK' : '!'}</div>`;
        hotSpotDiv.title = comment.body || 'Comment';
      },
      clickHandlerFunc: () => onSelectComment?.(comment.id),
    }));
  }, [comments, onSelectComment]);

  const hotSpots = useMemo(
    () => [...navigationHotSpots, ...commentHotSpots],
    [navigationHotSpots, commentHotSpots],
  );

  const handlePanoramaClick = (event) => {
    if (!commentMode || !viewerRef.current?.mouseEventToCoords) return;
    if (event.target?.closest?.('.pnlm-hotspot')) return;

    const coords = viewerRef.current.mouseEventToCoords(event);
    if (!coords) return;
    onCreateComment?.({ pitch: coords[0], yaw: coords[1] });
  };

  useEffect(() => {
    setLoadError(null);
    setIsLoaded(false);

    if (!containerRef.current || !panoramaImageUrl) return undefined;

    // Reset any previous instance
    try {
      if (viewerRef.current?.destroy) viewerRef.current.destroy();
    } catch {
      // ignore
    }
    viewerRef.current = null;

    const el = containerRef.current;
    el.innerHTML = '';

    try {
      const viewerFactory = getPannellumViewer();
      if (!viewerFactory) {
        throw new Error('Pannellum viewer is not available (module interop failed).');
      }

      const v = viewerFactory(el, {
        type: 'equirectangular',
        panorama: panoramaImageUrl,
        crossOrigin: 'use-credentials',
        autoLoad: true,
        showControls: !!showControls,
        mouseZoom: true,
        keyboardZoom: true,
        draggable: true,
        hotSpots: [],
        autoRotate: false,
      });

      viewerRef.current = v;

      const onLoad = () => setIsLoaded(true);
      const onError = () => setLoadError('Failed to load panorama image.');
      v.on('load', onLoad);
      v.on('error', onError);

      onViewerReadyRef.current?.(v);

      return () => {
        try {
          v.off('load', onLoad);
          v.off('error', onError);
          hotspotIdsRef.current = [];
          v.destroy();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      setLoadError(e?.message || 'Failed to initialize viewer.');
      return undefined;
    }
  }, [panorama?.id, panoramaImageUrl, showControls]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer?.addHotSpot || !viewer?.removeHotSpot) return;

    for (const id of hotspotIdsRef.current) {
      try {
        viewer.removeHotSpot(id);
      } catch {
        // ignore stale hot spots
      }
    }

    hotspotIdsRef.current = [];
    for (const hotSpot of hotSpots) {
      try {
        viewer.addHotSpot(hotSpot);
        hotspotIdsRef.current.push(hotSpot.id);
      } catch {
        // ignore malformed hot spots
      }
    }
  }, [hotSpots, isLoaded]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (autoRotate) {
      viewer.startAutoRotate?.(1.2);
    } else {
      viewer.stopAutoRotate?.();
    }
  }, [autoRotate]);

  return (
    <div className="tv-pano-wrap">
      <div
        ref={containerRef}
        className={`tv-pano ${commentMode ? 'tv-pano-commenting' : ''}`}
        onClickCapture={handlePanoramaClick}
      />
      {!isLoaded && !loadError && (
        <div className="tv-loading">
          <div className="spinner" />
          <div className="muted" style={{ marginTop: 10 }}>
            Loading panorama…
          </div>
        </div>
      )}
      {loadError && <div className="tv-error">{loadError}</div>}
    </div>
  );
};


