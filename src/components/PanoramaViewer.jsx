import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'pannellum/build/pannellum.css';
import 'pannellum/build/pannellum.js';

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
}) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const hotSpots = useMemo(() => {
    const list = panorama?.connected_panoramas || [];
    return list.map((c) => ({
      pitch: typeof c.pitch === 'number' ? c.pitch : 0,
      yaw: typeof c.yaw === 'number' ? c.yaw : typeof c.direction === 'number' ? c.direction : 0,
      cssClass: hotspotClassForConfidence(c.confidence),
      createTooltipFunc: (hotSpotDiv) => {
        hotSpotDiv.innerHTML = `<div class="cv-hotspot-inner">Next</div>`;
      },
      clickHandlerFunc: () => onNavigate?.(c.id),
    }));
  }, [panorama, onNavigate]);

  useEffect(() => {
    setLoadError(null);
    setIsLoaded(false);

    if (!containerRef.current || !panorama?.image_url) return undefined;

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
        panorama: panorama.image_url,
        autoLoad: true,
        showControls: !!showControls,
        mouseZoom: true,
        keyboardZoom: true,
        draggable: true,
        hotSpots,
        autoRotate: autoRotate ? 1.2 : 0,
      });

      viewerRef.current = v;

      const onLoad = () => setIsLoaded(true);
      const onError = () => setLoadError('Failed to load panorama image.');
      v.on('load', onLoad);
      v.on('error', onError);

      onViewerReady?.(v);

      return () => {
        try {
          v.off('load', onLoad);
          v.off('error', onError);
          v.destroy();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      setLoadError(e?.message || 'Failed to initialize viewer.');
      return undefined;
    }
  }, [panorama?.id, panorama?.image_url, showControls, autoRotate, hotSpots, onViewerReady]);

  return (
    <div className="tv-pano-wrap">
      <div ref={containerRef} className="tv-pano" />
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


