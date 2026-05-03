import React from 'react';
import { ChevronLeft, ChevronRight, Home, Map, Maximize2, Minimize2, RotateCw, Info, Pencil } from 'lucide-react';

export const NavigationControls = ({
  onPrev,
  onNext,
  onHome,
  onToggleMinimap,
  onToggleFullscreen,
  onToggleAutoRotate,
  onEdit,
  isMinimapVisible,
  isFullscreen,
  isAutoRotate,
  infoText,
}) => {
  return (
    <div className="tv-controls" aria-label="Tour controls">
      <button className="tv-ctl" onClick={onPrev} title="Previous (←)">
        <ChevronLeft size={18} />
        <span className="tv-ctl-label">Prev</span>
      </button>
      <button className="tv-ctl" onClick={onNext} title="Next (→ / Enter)">
        <ChevronRight size={18} />
        <span className="tv-ctl-label">Next</span>
      </button>
      <button className="tv-ctl" onClick={onHome} title="Return to start (H)">
        <Home size={18} />
        <span className="tv-ctl-label">Start</span>
      </button>
      <button className="tv-ctl" onClick={onToggleMinimap} title="Toggle minimap (M)">
        <Map size={18} />
        <span className="tv-ctl-label">{isMinimapVisible ? 'Hide map' : 'Map'}</span>
      </button>
      <button className="tv-ctl" onClick={onToggleAutoRotate} title="Auto-rotate (Space)">
        <RotateCw size={18} />
        <span className="tv-ctl-label">{isAutoRotate ? 'Stop' : 'Rotate'}</span>
      </button>
      <button className="tv-ctl" onClick={onToggleFullscreen} title="Fullscreen (F)">
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        <span className="tv-ctl-label">{isFullscreen ? 'Exit' : 'Full'}</span>
      </button>
      {onEdit && (
        <button className="tv-ctl" onClick={onEdit} title="Edit constellation (E)">
          <Pencil size={18} />
          <span className="tv-ctl-label">Edit</span>
        </button>
      )}

      <div className="tv-info" title="Info">
        <Info size={16} />
        <span className="tv-info-text">{infoText}</span>
      </div>
    </div>
  );
};


