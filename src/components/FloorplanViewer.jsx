import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ── coordinate transforms ── */

function transformPoint(pt, matrix) {
  const sx = pt.x * matrix.scale;
  const sy = pt.y * matrix.scale;
  const rad = (matrix.rotation * Math.PI) / 180;
  return {
    x: sx * Math.cos(rad) - sy * Math.sin(rad) + matrix.offset_x,
    y: sx * Math.sin(rad) + sy * Math.cos(rad) + matrix.offset_y,
  };
}

function inverseTransform(pixel, matrix) {
  const dx = pixel.x - matrix.offset_x;
  const dy = pixel.y - matrix.offset_y;
  const rad = (-matrix.rotation * Math.PI) / 180;
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  return { x: rx / matrix.scale, y: ry / matrix.scale };
}

/* ── component ── */

export const FloorplanViewer = ({
  floorplan,
  panoramas,
  connections,
  currentPanoId,
  visitedIds,
  onSelectPano,
  showConnectionLines = false,
  mode = 'minimap', // minimap | full
  onToggleMode,
}) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const animRef = useRef(0);

  const matrix = useMemo(
    () => floorplan?.transform_matrix || { scale: 1, rotation: 0, offset_x: 0, offset_y: 0 },
    [floorplan],
  );

  /* load image */
  useEffect(() => {
    if (!floorplan?.image_url) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = floorplan.image_url;
  }, [floorplan?.image_url]);

  /* draw */
  const draw = useCallback(
    (pulse) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !imgLoaded) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* draw floorplan image */
      const imgScale = Math.min(W / imgSize.w, H / imgSize.h);
      const iw = imgSize.w * imgScale;
      const ih = imgSize.h * imgScale;
      const ix = (W - iw) / 2;
      const iy = (H - ih) / 2;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, ix, iy, iw, ih);
      ctx.globalAlpha = 1;

      if (!panoramas?.length) return;

      /* transform panos → canvas coords */
      const pts = panoramas.map((p) => {
        const t = transformPoint(p.position, matrix);
        return { ...p, cx: t.x * imgScale + ix, cy: t.y * imgScale + iy };
      });
      const ptMap = new Map(pts.map((p) => [p.id, p]));

      /* connections */
      if (showConnectionLines && connections) {
        ctx.lineWidth = 1;
        for (const c of connections) {
          const a = ptMap.get(c.from);
          const b = ptMap.get(c.to);
          if (!a || !b) continue;
          ctx.strokeStyle = 'rgba(156,163,175,0.35)';
          ctx.beginPath();
          ctx.moveTo(a.cx, a.cy);
          ctx.lineTo(b.cx, b.cy);
          ctx.stroke();
        }
      }

      /* dots */
      for (const p of pts) {
        const isCurrent = p.id === currentPanoId;
        const isVisited = visitedIds?.includes(p.id);

        if (isCurrent) {
          /* pulsing blue dot */
          const r = 6 + Math.sin(pulse * 0.004) * 2;
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, r + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59,130,246,0.2)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (p.is_transition) {
          /* transition point: diamond marker */
          ctx.save();
          ctx.translate(p.cx, p.cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = isVisited ? 'rgba(249,115,22,0.8)' : 'rgba(249,115,22,0.5)';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(-4, -4, 8, 8);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.cx, p.cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = isVisited ? 'rgba(156,163,175,0.8)' : 'rgba(156,163,175,0.4)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    },
    [panoramas, connections, currentPanoId, visitedIds, matrix, imgLoaded, imgSize, showConnectionLines],
  );

  /* animation loop for pulsing dot */
  useEffect(() => {
    let running = true;
    const loop = (t) => {
      if (!running) return;
      draw(t);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  /* click detection */
  const onClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !panoramas?.length) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const imgScale = Math.min(canvas.width / imgSize.w, canvas.height / imgSize.h);
    const ix = (canvas.width - imgSize.w * imgScale) / 2;
    const iy = (canvas.height - imgSize.h * imgScale) / 2;

    let closest = null;
    let minDist = 20; // pixel radius threshold
    for (const p of panoramas) {
      const t = transformPoint(p.position, matrix);
      const px = t.x * imgScale + ix;
      const py = t.y * imgScale + iy;
      const d = Math.hypot(cx - px, cy - py);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    if (closest) onSelectPano?.(closest.id);
  };

  const isSmall = mode === 'minimap';
  const cw = isSmall ? 280 : 700;
  const ch = isSmall ? 200 : 440;

  if (!floorplan) return null;

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={cw}
        height={ch}
        onClick={onClick}
        style={{
          width: '100%',
          maxWidth: cw,
          borderRadius: isSmall ? 10 : 14,
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)',
          background: '#0f172a',
        }}
      />
      {onToggleMode && (
        <button
          onClick={onToggleMode}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            color: '#fff',
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {isSmall ? '⛶' : '▫'}
        </button>
      )}
    </div>
  );
};
