import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

const colorForConfidence = (c) => {
  if (c >= 0.8) return '#16a34a'; // green
  if (c >= 0.5) return '#f59e0b'; // yellow
  return '#dc2626'; // red
};

export const ConstellationView = ({ nodes, connections, onSelectNode }) => {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const [hover, setHover] = useState(null);

  const bounds = useMemo(() => {
    if (!nodes?.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [nodes]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 6])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
  }, []);

  const width = 900;
  const height = 520;
  const pad = 40;

  const scaleX = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxX - bounds.minX);
    return (x) => ((x - bounds.minX) / span) * (width - pad * 2) + pad;
  }, [bounds, width]);

  const scaleY = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxY - bounds.minY);
    return (y) => ((y - bounds.minY) / span) * (height - pad * 2) + pad;
  }, [bounds, height]);

  const nodeById = useMemo(() => {
    const m = new Map();
    (nodes || []).forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: '100%',
          height: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: '#fff',
        }}
      >
        <g ref={gRef}>
          {(connections || []).map((e, idx) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const x1 = scaleX(a.position.x);
            const y1 = scaleY(a.position.y);
            const x2 = scaleX(b.position.x);
            const y2 = scaleY(b.position.y);
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={e.manual ? '#2563eb' : colorForConfidence(e.confidence)}
                strokeWidth={2}
                opacity={0.75}
                strokeDasharray={e.manual ? '6 6' : undefined}
              />
            );
          })}

          {(nodes || []).map((n) => {
            const x = scaleX(n.position.x);
            const y = scaleY(n.position.y);
            return (
              <g
                key={n.id}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectNode?.(n)}
                style={{ cursor: 'pointer' }}
              >
                <circle r={8} fill="var(--primary)" />
                <circle r={14} fill="transparent" />
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 220,
            border: '1px solid var(--border)',
            borderRadius: 14,
            background: '#fff',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <img src={hover.thumbnail_url} alt="preview" style={{ width: '100%', height: 130, objectFit: 'cover' }} />
          <div style={{ padding: 10, fontWeight: 900, color: 'var(--text)' }}>Panorama #{hover.id}</div>
        </div>
      )}
    </div>
  );
};


