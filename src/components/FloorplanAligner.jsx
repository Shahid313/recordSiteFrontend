import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save, Eye, Grid3x3, Move, RotateCw, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import { floorplansAPI } from '../api/floorplans';
import { constellationAPI } from '../api/constellation';
import { editingAPI } from '../api/editing';

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

export const FloorplanAligner = ({ projectId, floorplan, onSaved, onClose }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  const [matrix, setMatrix] = useState({
    scale: floorplan.transform_matrix?.scale ?? 1,
    rotation: floorplan.transform_matrix?.rotation ?? 0,
    offset_x: floorplan.transform_matrix?.offset_x ?? 0,
    offset_y: floorplan.transform_matrix?.offset_y ?? 0,
  });

  const [opacity, setOpacity] = useState(70);
  const [showGrid, setShowGrid] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  /* dragging constellation group (Alt+drag) */
  const [groupDragging, setGroupDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  /* individual node dragging */
  const [nodeDragMode, setNodeDragMode] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nodeDragging, setNodeDragging] = useState(null); // { id, startCx, startCy }
  const [dirtyNodeIds, setDirtyNodeIds] = useState(new Set());
  const [savingNodes, setSavingNodes] = useState(false);

  /* measurement tool */
  const [measurePoints, setMeasurePoints] = useState([]); // [{x,y}, {x,y}]
  const [measureMode, setMeasureMode] = useState(false);

  /* ── load constellation ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await constellationAPI.getConstellation(projectId);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
      } catch {
        /* ignore */
      }
    })();
  }, [projectId]);

  /* ── load floorplan image ── */
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImgLoaded(true);
    };
    img.src = floorplan.image_url;
  }, [floorplan.image_url]);

  /* ── canvas drawing ── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    /* floorplan image */
    ctx.globalAlpha = opacity / 100;
    const imgScale = Math.min(W / imgSize.w, H / imgSize.h);
    const iw = imgSize.w * imgScale;
    const ih = imgSize.h * imgScale;
    const ix = (W - iw) / 2;
    const iy = (H - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.globalAlpha = 1;

    /* grid */
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    if (!nodes.length) return;

    /* transform constellation coordinates → canvas pixels */
    const transformed = nodes.map((n) => {
      const p = transformPoint(n.position, matrix);
      return { ...n, cx: p.x * imgScale + ix, cy: p.y * imgScale + iy };
    });
    const nodeMap = new Map(transformed.map((n) => [n.id, n]));

    /* connections */
    if (showConnections) {
      ctx.lineWidth = 1.5;
      for (const c of connections) {
        const a = nodeMap.get(c.from);
        const b = nodeMap.get(c.to);
        if (!a || !b) continue;
        ctx.strokeStyle = c.manual ? 'rgba(59,130,246,0.6)' : 'rgba(156,163,175,0.5)';
        if (c.manual) ctx.setLineDash([4, 3]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    /* nodes */
    for (const n of transformed) {
      const isSel = n.id === selectedNodeId;
      const isDirty = dirtyNodeIds.has(n.id);
      const r = isSel ? 9 : 6;

      if (isSel) {
        ctx.beginPath();
        ctx.arc(n.cx, n.cy, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(n.cx, n.cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? 'rgba(249,115,22,0.9)' : isDirty ? 'rgba(79,125,175,0.9)' : 'rgba(59,130,246,0.85)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* frame number label */
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${n.frame_number}`, n.cx, n.cy + r + 11);
    }

    /* measurement line */
    if (measurePoints.length === 2) {
      const [p1, p2] = measurePoints;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      ctx.fillStyle = '#f97316';
      ctx.font = '13px sans-serif';
      ctx.fillText(`${dist.toFixed(0)}px`, mx + 6, my - 6);
    }
  }, [nodes, connections, matrix, opacity, showGrid, showConnections, imgLoaded, imgSize, measurePoints, selectedNodeId, dirtyNodeIds]);

  useEffect(() => { draw(); }, [draw]);

  /* ── helper: canvas pixel from event ── */
  const canvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  /* ── helper: find node near canvas pixel ── */
  const findNodeAt = (cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return null;
    const imgScale = Math.min(canvas.width / imgSize.w, canvas.height / imgSize.h);
    const iw = imgSize.w * imgScale;
    const ih = imgSize.h * imgScale;
    const ix = (canvas.width - iw) / 2;
    const iy = (canvas.height - ih) / 2;
    let closest = null;
    let closestDist = 18; // hit radius in canvas pixels
    for (const n of nodes) {
      const p = transformPoint(n.position, matrix);
      const nx = p.x * imgScale + ix;
      const ny = p.y * imgScale + iy;
      const d = Math.hypot(cx - nx, cy - ny);
      if (d < closestDist) { closest = n; closestDist = d; }
    }
    return closest;
  };

  /* ── helper: canvas pixel → data coordinate ── */
  const canvasToData = (cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const imgScale = Math.min(canvas.width / imgSize.w, canvas.height / imgSize.h);
    const iw = imgSize.w * imgScale;
    const ih = imgSize.h * imgScale;
    const ix = (canvas.width - iw) / 2;
    const iy = (canvas.height - ih) / 2;
    const px = (cx - ix) / imgScale;
    const py = (cy - iy) / imgScale;
    return inverseTransform({ x: px, y: py }, matrix);
  };

  /* ── interactions ── */
  const onCanvasMouseDown = (e) => {
    if (measureMode) {
      const { x, y } = canvasCoords(e);
      setMeasurePoints((prev) => prev.length >= 2 ? [{ x, y }] : [...prev, { x, y }]);
      return;
    }

    // Alt+click = group drag (move entire constellation overlay)
    if (e.altKey) {
      setGroupDragging(true);
      dragStart.current = { mx: e.clientX, my: e.clientY, ox: matrix.offset_x, oy: matrix.offset_y };
      return;
    }

    // Node drag mode: pick up individual node
    if (nodeDragMode) {
      const { x, y } = canvasCoords(e);
      const hit = findNodeAt(x, y);
      if (hit) {
        setSelectedNodeId(hit.id);
        setNodeDragging({ id: hit.id, startCx: e.clientX, startCy: e.clientY });
        return;
      }
      setSelectedNodeId(null);
    } else {
      // Selection-only when node drag is off
      const { x, y } = canvasCoords(e);
      const hit = findNodeAt(x, y);
      if (hit) {
        setSelectedNodeId(hit.id);
        return;
      }
    }

    // Fallback: group drag
    setGroupDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: matrix.offset_x, oy: matrix.offset_y };
  };

  const onCanvasMouseMove = (e) => {
    // Individual node drag
    if (nodeDragging) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = canvasCoords(e);
      const dataPos = canvasToData(x, y);
      setNodes((prev) => prev.map((n) => n.id === nodeDragging.id ? { ...n, position: { x: dataPos.x, y: dataPos.y } } : n));
      return;
    }
    // Group drag
    if (!groupDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const imgScale = Math.min(canvas.width / imgSize.w, canvas.height / imgSize.h);
    const dx = ((e.clientX - dragStart.current.mx) / rect.width) * canvas.width / imgScale;
    const dy = ((e.clientY - dragStart.current.my) / rect.height) * canvas.height / imgScale;
    setMatrix((m) => ({ ...m, offset_x: dragStart.current.ox + dx, offset_y: dragStart.current.oy + dy }));
  };

  const onCanvasMouseUp = () => {
    if (nodeDragging) {
      setDirtyNodeIds((prev) => new Set(prev).add(nodeDragging.id));
      setNodeDragging(null);
      return;
    }
    setGroupDragging(false);
  };

  /* ── save alignment transform ── */
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await floorplansAPI.update(floorplan.id, { transform_matrix: matrix });
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save alignment');
    } finally {
      setSaving(false);
    }
  };

  /* ── save individual node positions ── */
  const saveNodePositions = async () => {
    if (dirtyNodeIds.size === 0) return;
    setSavingNodes(true);
    setError(null);
    try {
      for (const id of dirtyNodeIds) {
        const n = nodes.find((nd) => nd.id === id);
        if (!n) continue;
        await editingAPI.updatePosition(id, { position_x: n.position.x, position_y: n.position.y, orientation: n.orientation ?? null });
      }
      setDirtyNodeIds(new Set());
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save node positions');
    } finally {
      setSavingNodes(false);
    }
  };

  const CANVAS_W = 900;
  const CANVAS_H = 560;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#0b1220', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', background: 'rgba(15,23,42,0.7)' }}>
        <span style={{ fontWeight: 900, fontSize: 14, color: '#fff', marginRight: 8 }}>Align: {floorplan.name}</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          <ZoomIn size={14} /> Scale
          <input type="range" min="0.1" max="10" step="0.05" value={matrix.scale} onChange={(e) => setMatrix((m) => ({ ...m, scale: parseFloat(e.target.value) }))} style={{ width: 90, accentColor: 'var(--primary)' }} />
          <span style={{ minWidth: 36 }}>{matrix.scale.toFixed(2)}</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          <RotateCw size={14} /> Rot
          <input type="range" min="0" max="360" step="1" value={matrix.rotation} onChange={(e) => setMatrix((m) => ({ ...m, rotation: parseFloat(e.target.value) }))} style={{ width: 80, accentColor: 'var(--primary)' }} />
          <span style={{ minWidth: 28 }}>{matrix.rotation}°</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          <Eye size={14} /> Opacity
          <input type="range" min="10" max="100" step="5" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: 70, accentColor: 'var(--primary)' }} />
          <span style={{ minWidth: 28 }}>{opacity}%</span>
        </label>

        <button className="ce-btn" onClick={() => setShowGrid((v) => !v)} style={{ background: showGrid ? 'rgba(79,125,175,0.35)' : undefined }}>
          <Grid3x3 size={14} /> Grid
        </button>

        <button className="ce-btn" onClick={() => { setMeasureMode((v) => !v); setMeasurePoints([]); }} style={{ background: measureMode ? 'rgba(249,115,22,0.35)' : undefined }}>
          <Move size={14} /> Measure
        </button>

        <button className="ce-btn" onClick={() => setNodeDragMode((v) => !v)} style={{ background: nodeDragMode ? 'rgba(79,125,175,0.35)' : undefined }} title="Drag individual nodes to reposition them">
          <GripVertical size={14} /> Node Drag
        </button>

        {dirtyNodeIds.size > 0 && (
          <button className="ce-btn" style={{ background: 'rgba(22,163,74,0.25)', borderColor: 'rgba(22,163,74,0.4)' }} onClick={saveNodePositions} disabled={savingNodes}>
            <Save size={14} /> {savingNodes ? 'Saving…' : `Save Nodes (${dirtyNodeIds.size})`}
          </button>
        )}

        <div style={{ marginLeft: 'auto' }} />

        <button className="ce-btn ce-btn-save" onClick={save} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Alignment'}
        </button>
        <button className="ce-btn" onClick={onClose}>Close</button>
      </div>

      {error && <div className="ce-error">{error}</div>}

      {/* canvas + side preview */}
      <div style={{ display: 'flex', gap: 10, padding: 8, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: measureMode ? 'crosshair' : nodeDragging ? 'grabbing' : nodeDragMode ? 'default' : groupDragging ? 'grabbing' : 'grab' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ width: '100%', maxWidth: CANVAS_W, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: '#0f172a' }}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          />
        </div>

        {/* selected node preview panel */}
        <div style={{ width: 260, flexShrink: 0, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          {(() => {
            const selectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (!selectedNode) {
              return (
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 900, color: '#fff', marginBottom: 6 }}>Panorama preview</div>
                  Click a node on the floorplan to preview its panorama frame here.
                </div>
              );
            }
            const fullUrl = selectedNode.thumbnail_url
              ? selectedNode.thumbnail_url.replace('/files/thumbnails/', '/files/panoramas/')
              : null;
            return (
              <>
                <div style={{ fontWeight: 900, color: '#fff', fontSize: 14 }}>Frame #{selectedNode.frame_number}</div>
                {selectedNode.thumbnail_url ? (
                  <a
                    href={fullUrl || selectedNode.thumbnail_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open full panorama"
                    style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a' }}
                  >
                    <img
                      src={selectedNode.thumbnail_url}
                      alt={`Frame ${selectedNode.frame_number}`}
                      style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 220 }}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>No thumbnail available.</div>
                )}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                  <div><b style={{ color: '#fff' }}>Timestamp:</b> {selectedNode.timestamp?.toFixed?.(2)}s</div>
                  <div><b style={{ color: '#fff' }}>X:</b> {selectedNode.position?.x?.toFixed?.(2)}</div>
                  <div><b style={{ color: '#fff' }}>Y:</b> {selectedNode.position?.y?.toFixed?.(2)}</div>
                  {dirtyNodeIds.has(selectedNode.id) && (
                    <div style={{ color: '#fbbf24', marginTop: 4 }}>● Unsaved position</div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* offset info */}
      <div style={{ display: 'flex', gap: 16, padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
        <span>Offset X: {matrix.offset_x.toFixed(1)}</span>
        <span>Offset Y: {matrix.offset_y.toFixed(1)}</span>
        <span>Scale: {matrix.scale.toFixed(3)}</span>
        <span>Rotation: {matrix.rotation.toFixed(1)}°</span>
      </div>
    </div>
  );
};
