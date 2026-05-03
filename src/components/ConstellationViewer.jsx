import React, { useMemo, useRef } from 'react';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';

const colorForConfidence = (c) => {
  if (c >= 0.8) return '#16a34a'; // green
  if (c >= 0.5) return '#f59e0b'; // yellow
  return '#9ca3af'; // gray for low in minimap
};

export const ConstellationViewer = ({
  nodes = [],
  connections = [],
  currentPanoId,
  visitedIds = [],
  onSelectPano,
  mode = 'minimap', // minimap | full
  onToggleMode,
}) => {
  const svgRef = useRef(null);

  const visited = useMemo(() => new Set(visitedIds || []), [visitedIds]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const bounds = useMemo(() => {
    if (!nodes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }, [nodes]);

  const width = mode === 'full' ? 1000 : 300;
  const height = mode === 'full' ? 600 : 200;
  const pad = mode === 'full' ? 50 : 18;

  const scaleX = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxX - bounds.minX);
    return (x) => ((x - bounds.minX) / span) * (width - pad * 2) + pad;
  }, [bounds, width, pad]);

  const scaleY = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxY - bounds.minY);
    return (y) => ((y - bounds.minY) / span) * (height - pad * 2) + pad;
  }, [bounds, height, pad]);

  const fitView = () => {
    // We keep viewBox fixed; "fit" is effectively a reset for future enhancement.
    // Still useful UX-wise as a semantic "reset".
    if (!svgRef.current) return;
    svgRef.current.style.transform = 'scale(1)';
  };

  if (!nodes.length) {
    return (
      <div className={mode === 'full' ? 'tv-map tv-map-full' : 'tv-map tv-map-mini'}>
        <div className="muted" style={{ padding: 12 }}>
          No map data yet.
        </div>
      </div>
    );
  }

  return (
    <div className={mode === 'full' ? 'tv-map tv-map-full' : 'tv-map tv-map-mini'}>
      <div className="tv-map-header">
        <div className="tv-map-title">{mode === 'full' ? 'Constellation Map' : 'Map'}</div>
        <div className="tv-map-actions">
          <button className="tv-iconbtn" onClick={fitView} title="Reset view">
            <RefreshCw size={16} />
          </button>
          <button className="tv-iconbtn" onClick={onToggleMode} title={mode === 'full' ? 'Minimap' : 'Expand'}>
            {mode === 'full' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="tv-map-svg"
        role="img"
        aria-label="Constellation map"
      >
        <g>
          {connections.map((e, idx) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            return (
              <line
                key={idx}
                x1={scaleX(a.position.x)}
                y1={scaleY(a.position.y)}
                x2={scaleX(b.position.x)}
                y2={scaleY(b.position.y)}
                stroke={e.manual ? 'var(--primary)' : colorForConfidence(e.confidence)}
                strokeWidth={mode === 'full' ? 2.2 : 1.6}
                opacity={0.6}
                strokeDasharray={e.manual ? '5 5' : undefined}
              />
            );
          })}

          {nodes.map((n) => {
            const x = scaleX(n.position.x);
            const y = scaleY(n.position.y);
            const isCurrent = n.id === currentPanoId;
            const isVisited = visited.has(n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectPano?.(n.id)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={isCurrent ? (mode === 'full' ? 10 : 7) : mode === 'full' ? 7 : 5}
                  fill={isCurrent ? 'var(--primary)' : isVisited ? 'rgba(79,125,175,0.55)' : 'rgba(64,69,85,0.35)'}
                  stroke={isCurrent ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'}
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                />
                {isCurrent && <circle r={mode === 'full' ? 18 : 14} className="tv-pulse" />}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};


