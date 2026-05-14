import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  GripVertical,
  Pencil,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Redo2,
  Save,
  X,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Shuffle,
  Link as LinkIcon,
  Unlink,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { editingAPI } from '../api/editing';
import { constellationAPI } from '../api/constellation';
import { floorplansAPI } from '../api/floorplans';
import './ConstellationEditor.css';

/* ────────────────────────────────────────────────────── helpers */

const clr = {
  auto: '#9ca3af',
  manual: 'var(--primary)',
  selected: '#ef4444',
  nodeDefault: 'rgba(64,69,85,0.55)',
  nodeSelected: '#f97316',
  nodeModified: 'rgba(79,125,175,0.75)',
};

function panoramaUrlFromThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  return thumbnailUrl
    .replace('/files/thumbnails/', '/files/panoramas/')
    .replace('/thumbnails/', '/panoramas/');
}

/* ────────────────────────────────────────────────────── component */

export const ConstellationEditor = ({ projectId, onClose, onSaved }) => {
  /* ── data ── */
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  /* ── edit state ── */
  const [editMode, setEditMode] = useState(true);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedConnId, setSelectedConnId] = useState(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [dirty, setDirty] = useState(new Set()); // pano ids with unsaved position changes

  /* ── floorplan background ── */
  const [floorplans, setFloorplans] = useState([]);
  const [activeFpId, setActiveFpId] = useState(null);
  const [showFloorplan, setShowFloorplan] = useState(true);
  const [fpOpacity, setFpOpacity] = useState(0.35);
  const [fpImgUrl, setFpImgUrl] = useState(null);

  /* ── drag ── */
  const [dragging, setDragging] = useState(null); // { id, startX, startY, origX, origY }
  const svgRef = useRef(null);

  /* ── locked bounds (stable while dragging) ── */
  const [lockedBounds, setLockedBounds] = useState(null);

  /* ── zoom & pan ── */
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null); // { startX, startY, origPanX, origPanY }

  /* ── node info panel ── */
  const [panelNode, setPanelNode] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: '', y: '', orientation: '' });

  /* ── layout ── */
  const WIDTH = 900;
  const HEIGHT = 560;
  const PAD = 260;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;

  /* ── dynamic viewBox from zoom/pan ── */
  const viewBox = useMemo(() => {
    const vw = WIDTH / scale;
    const vh = HEIGHT / scale;
    const vx = (WIDTH - vw) / 2 - panOffset.x;
    const vy = (HEIGHT - vh) / 2 - panOffset.y;
    return `${vx} ${vy} ${vw} ${vh}`;
  }, [scale, panOffset]);

  /* ── load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await constellationAPI.getConstellation(projectId);
      const loadedNodes = data.nodes || [];
      setNodes(loadedNodes);
      setConnections(data.connections || []);
      // Lock bounds from initial data so dragging doesn't shift all nodes
      if (loadedNodes.length) {
        const xs = loadedNodes.map((n) => n.position.x);
        const ys = loadedNodes.map((n) => n.position.y);
        setLockedBounds({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
      }
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load constellation');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── load floorplans ── */
  useEffect(() => {
    (async () => {
      try {
        const fps = await floorplansAPI.list(projectId);
        setFloorplans(fps);
        if (fps.length > 0 && !activeFpId) setActiveFpId(fps[0].id);
      } catch { /* ignore */ }
    })();
  }, [projectId]);

  useEffect(() => {
    const fp = floorplans.find((f) => f.id === activeFpId);
    setFpImgUrl(fp?.image_url || null);
  }, [activeFpId, floorplans]);

  /* ── derived ── */
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const bounds = lockedBounds ?? { minX: 0, minY: 0, maxX: 1, maxY: 1 };

  const sx = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxX - bounds.minX);
    return (x) => ((x - bounds.minX) / span) * (WIDTH - PAD * 2) + PAD;
  }, [bounds.minX, bounds.maxX]);

  const sy = useMemo(() => {
    const span = Math.max(1e-6, bounds.maxY - bounds.minY);
    return (y) => ((y - bounds.minY) / span) * (HEIGHT - PAD * 2) + PAD;
  }, [bounds.minY, bounds.maxY]);

  const inv = useMemo(() => {
    const spanX = Math.max(1e-6, bounds.maxX - bounds.minX);
    const spanY = Math.max(1e-6, bounds.maxY - bounds.minY);
    return {
      x: (svgX) => ((svgX - PAD) / (WIDTH - PAD * 2)) * spanX + bounds.minX,
      y: (svgY) => ((svgY - PAD) / (HEIGHT - PAD * 2)) * spanY + bounds.minY,
    };
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      else if (e.key === 'Delete' && selectedConnId) { handleDeleteConnection(selectedConnId); }
      else if (e.key === 'Escape') {
        setConnectMode(false);
        setConnectFrom(null);
        setSelectedNodeIds([]);
        setSelectedConnId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── SVG mouse helpers ── */
  const svgPoint = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const t = pt.matrixTransform(ctm);
    return { x: t.x, y: t.y };
  };

  /* ── zoom handler (wheel) ── */
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  /* ── pan handlers (middle-click or Alt+drag) ── */
  const onCanvasMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, origPanX: panOffset.x, origPanY: panOffset.y });
    }
  };

  const onCanvasMouseMove = (e) => {
    if (panning) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panning.startX) / rect.width) * (WIDTH / scale);
      const dy = ((e.clientY - panning.startY) / rect.height) * (HEIGHT / scale);
      setPanOffset({ x: panning.origPanX + dx, y: panning.origPanY + dy });
    }
  };

  const onCanvasMouseUp = () => {
    if (panning) {
      setPanning(null);
      return;
    }
  };

  const resetZoom = () => { setScale(1); setPanOffset({ x: 0, y: 0 }); };

  /* ── drag handlers ── */
  const onNodeMouseDown = (e, n) => {
    if (!editMode) return;
    e.stopPropagation();

    if (connectMode) {
      handleConnectClick(n.id);
      return;
    }

    const { x, y } = svgPoint(e);
    setDragging({ id: n.id, startX: x, startY: y, origX: n.position.x, origY: n.position.y });

    if (e.shiftKey) {
      setSelectedNodeIds((prev) => prev.includes(n.id) ? prev.filter((i) => i !== n.id) : [...prev, n.id]);
    } else if (!selectedNodeIds.includes(n.id)) {
      setSelectedNodeIds([n.id]);
    }
    setSelectedConnId(null);
  };

  const onSvgMouseMove = (e) => {
    if (connectMode && connectFrom != null) {
      setMousePos(svgPoint(e));
    }
    if (!dragging) return;
    const { x, y } = svgPoint(e);
    const dx = x - dragging.startX;
    const dy = y - dragging.startY;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === dragging.id || (selectedNodeIds.includes(dragging.id) && selectedNodeIds.includes(n.id))) {
          const origNode = nodeById.get(n.id);
          if (!origNode) return n;
          const origX = n.id === dragging.id ? dragging.origX : origNode.position.x;
          const origY = n.id === dragging.id ? dragging.origY : origNode.position.y;
          return { ...n, position: { x: inv.x(sx(origX) + dx), y: inv.y(sy(origY) + dy) } };
        }
        return n;
      })
    );
  };

  const onSvgMouseUp = () => {
    if (dragging) {
      const movedIds = selectedNodeIds.includes(dragging.id) ? selectedNodeIds : [dragging.id];
      setDirty((prev) => { const next = new Set(prev); movedIds.forEach((id) => next.add(id)); return next; });
      setDragging(null);
    }
  };

  /* ── connect mode ── */
  const handleConnectClick = async (nodeId) => {
    if (connectFrom == null) {
      setConnectFrom(nodeId);
      return;
    }
    if (connectFrom === nodeId) {
      setConnectFrom(null);
      return;
    }
    try {
      const result = await editingAPI.addConnection(connectFrom, nodeId);
      setConnections((prev) => [...prev, { from: result.from_pano_id, to: result.to_pano_id, confidence: 0, manual: true, id: result.id }]);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to add connection');
    }
    setConnectFrom(null);
    setConnectMode(false);
    setMousePos(null);
  };

  /* ── connection actions ── */
  const handleDeleteConnection = async (connId) => {
    // find the connection object to get its backend id
    const conn = connections.find((c) => c.id === connId);
    if (!conn) return;
    try {
      await editingAPI.deleteConnection(conn.id);
      setConnections((prev) => prev.filter((c) => c.id !== connId));
      setSelectedConnId(null);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to delete connection');
    }
  };

  /* ── undo/redo ── */
  const handleUndo = async () => {
    try {
      await editingAPI.undo(projectId);
      await loadData();
      setDirty(new Set());
    } catch {
      /* nothing to undo */
    }
  };

  const handleRedo = async () => {
    try {
      await editingAPI.redo(projectId);
      await loadData();
      setDirty(new Set());
    } catch {
      /* nothing to redo */
    }
  };

  /* ── save (persist dirty positions) ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      for (const id of dirty) {
        const n = nodes.find((nd) => nd.id === id);
        if (!n) continue;
        await editingAPI.updatePosition(id, { position_x: n.position.x, position_y: n.position.y, orientation: n.orientation ?? null });
      }
      setDirty(new Set());
      onSaved?.();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /* ── reset ── */
  const handleReset = async () => {
    if (!window.confirm('Reset all manual edits? This removes manual connections and clears edit history.')) return;
    try {
      await editingAPI.resetConstellation(projectId);
      await loadData();
      setDirty(new Set());
      setSelectedNodeIds([]);
      setSelectedConnId(null);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Reset failed');
    }
  };

  /* ── batch: align/distribute ── */
  const alignH = () => {
    if (selectedNodeIds.length < 2) return;
    const avg = selectedNodeIds.reduce((s, id) => s + (nodeById.get(id)?.position.y ?? 0), 0) / selectedNodeIds.length;
    setNodes((prev) => prev.map((n) => selectedNodeIds.includes(n.id) ? { ...n, position: { ...n.position, y: avg } } : n));
    setDirty((prev) => { const next = new Set(prev); selectedNodeIds.forEach((id) => next.add(id)); return next; });
  };

  const alignV = () => {
    if (selectedNodeIds.length < 2) return;
    const avg = selectedNodeIds.reduce((s, id) => s + (nodeById.get(id)?.position.x ?? 0), 0) / selectedNodeIds.length;
    setNodes((prev) => prev.map((n) => selectedNodeIds.includes(n.id) ? { ...n, position: { ...n.position, x: avg } } : n));
    setDirty((prev) => { const next = new Set(prev); selectedNodeIds.forEach((id) => next.add(id)); return next; });
  };

  const distribute = () => {
    if (selectedNodeIds.length < 3) return;
    const sel = selectedNodeIds.map((id) => nodeById.get(id)).filter(Boolean).sort((a, b) => a.position.x - b.position.x);
    const minX = sel[0].position.x;
    const maxX = sel[sel.length - 1].position.x;
    const step = (maxX - minX) / (sel.length - 1);
    const posMap = new Map();
    sel.forEach((n, i) => posMap.set(n.id, minX + step * i));
    setNodes((prev) => prev.map((n) => posMap.has(n.id) ? { ...n, position: { ...n.position, x: posMap.get(n.id) } } : n));
    setDirty((prev) => { const next = new Set(prev); selectedNodeIds.forEach((id) => next.add(id)); return next; });
  };

  const autoArrange = () => {
    if (nodes.length < 2) return;
    // Simple force-directed layout (300 iterations)
    const pos = new Map(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));
    const ids = [...pos.keys()];
    const edgeSet = connections.map((c) => [c.from, c.to]);

    for (let iter = 0; iter < 300; iter++) {
      const t = 1 - iter / 300;
      const forces = new Map(ids.map((id) => [id, { fx: 0, fy: 0 }]));

      // Repulsion
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos.get(ids[i]);
          const b = pos.get(ids[j]);
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.max(0.1, Math.hypot(dx, dy));
          const rep = 500 / (dist * dist);
          dx = (dx / dist) * rep;
          dy = (dy / dist) * rep;
          forces.get(ids[i]).fx -= dx;
          forces.get(ids[i]).fy -= dy;
          forces.get(ids[j]).fx += dx;
          forces.get(ids[j]).fy += dy;
        }
      }

      // Attraction (edges)
      for (const [from, to] of edgeSet) {
        const a = pos.get(from);
        const b = pos.get(to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const attr = dist * 0.01;
        const fx = (dx / Math.max(0.1, dist)) * attr;
        const fy = (dy / Math.max(0.1, dist)) * attr;
        forces.get(from).fx += fx;
        forces.get(from).fy += fy;
        forces.get(to).fx -= fx;
        forces.get(to).fy -= fy;
      }

      // Apply
      for (const id of ids) {
        const p = pos.get(id);
        const f = forces.get(id);
        p.x += f.fx * t * 0.5;
        p.y += f.fy * t * 0.5;
      }
    }

    const newNodes = nodes.map((n) => {
      const p = pos.get(n.id);
      return p ? { ...n, position: { x: p.x, y: p.y } } : n;
    });
    setNodes(newNodes);
    // Re-lock bounds after rearranging
    const xs = newNodes.map((n) => n.position.x);
    const ys = newNodes.map((n) => n.position.y);
    setLockedBounds({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
    setDirty((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; });
  };

  /* ── node info panel sync ── */
  useEffect(() => {
    if (selectedNodeIds.length === 1) {
      const n = nodeById.get(selectedNodeIds[0]);
      if (n) {
        setPanelNode(n);
        setPanelPos({ x: String(n.position.x), y: String(n.position.y), orientation: String(n.orientation ?? 0) });
      }
    } else {
      setPanelNode(null);
    }
  }, [selectedNodeIds, nodeById]);

  // Keep panel in sync while dragging
  useEffect(() => {
    if (panelNode && dragging && dragging.id === panelNode.id) {
      const n = nodes.find((nd) => nd.id === panelNode.id);
      if (n) setPanelPos({ x: n.position.x.toFixed(2), y: n.position.y.toFixed(2), orientation: String(n.orientation ?? 0) });
    }
  }, [nodes, panelNode, dragging]);

  const applyPanelPos = () => {
    const x = parseFloat(panelPos.x);
    const y = parseFloat(panelPos.y);
    const o = parseFloat(panelPos.orientation);
    if (!panelNode || isNaN(x) || isNaN(y)) return;
    setNodes((prev) => prev.map((n) => n.id === panelNode.id ? { ...n, position: { x, y }, orientation: isNaN(o) ? n.orientation : o } : n));
    setDirty((prev) => new Set(prev).add(panelNode.id));
  };

  /* ── connections for selected node ── */
  const nodeConns = useMemo(() => {
    if (!panelNode) return [];
    return connections.filter((c) => c.from === panelNode.id || c.to === panelNode.id);
  }, [panelNode, connections]);

  /* ── connection click ── */
  const onConnClick = (e, conn) => {
    e.stopPropagation();
    setSelectedConnId(conn.id ?? null);
    setSelectedNodeIds([]);
  };

  const onConnContextMenu = (e, conn) => {
    e.preventDefault();
    if (conn.id != null) handleDeleteConnection(conn.id);
  };

  /* ── render ── */
  if (loading) return <div className="ce-shell"><div className="muted" style={{ padding: 24 }}>Loading editor…</div></div>;

  return (
    <div className="ce-shell">
      {/* Toolbar */}
      <div className="ce-toolbar">
        <button className={`ce-btn ${editMode ? 'ce-btn-active' : ''}`} onClick={() => { setEditMode((v) => !v); setConnectMode(false); setConnectFrom(null); }} title="Toggle edit mode">
          <Pencil size={16} /> {editMode ? 'Editing' : 'View'}
        </button>

        {editMode && (
          <>
            <div className="ce-sep" />
            <button className={`ce-btn ${connectMode ? 'ce-btn-active' : ''}`} onClick={() => { setConnectMode((v) => !v); setConnectFrom(null); }} title="Add connection: click two nodes">
              <LinkIcon size={16} /> Connect
            </button>
            <button className="ce-btn" onClick={() => { if (selectedConnId) handleDeleteConnection(selectedConnId); }} disabled={!selectedConnId} title="Delete selected connection">
              <Unlink size={16} /> Delete conn
            </button>
            <div className="ce-sep" />
            <button className="ce-btn" onClick={handleUndo} title="Undo (Ctrl+Z)"><Undo2 size={16} /> Undo</button>
            <button className="ce-btn" onClick={handleRedo} title="Redo (Ctrl+Y)"><Redo2 size={16} /> Redo</button>
            <button className="ce-btn" onClick={handleReset} title="Reset all manual edits"><RotateCcw size={16} /> Reset</button>
            <div className="ce-sep" />
            <button className="ce-btn ce-btn-save" onClick={handleSave} disabled={saving || dirty.size === 0} title="Save positions (Ctrl+S)">
              <Save size={16} /> {saving ? 'Saving…' : `Save${dirty.size ? ` (${dirty.size})` : ''}`}
            </button>
          </>
        )}

        {floorplans.length > 0 && (
          <>
            <div className="ce-sep" />
            <button className="ce-btn" onClick={() => setShowFloorplan((v) => !v)} style={{ background: showFloorplan ? 'rgba(79,125,175,0.35)' : undefined }} title="Toggle floorplan background">
              {showFloorplan ? '🗺 Hide FP' : '🗺 Show FP'}
            </button>
            {showFloorplan && (
              <>
                <select
                  value={activeFpId ?? ''}
                  onChange={(e) => setActiveFpId(Number(e.target.value))}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}
                >
                  {floorplans.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input type="range" min="0.05" max="1" step="0.05" value={fpOpacity} onChange={(e) => setFpOpacity(parseFloat(e.target.value))} title={`Opacity: ${Math.round(fpOpacity * 100)}%`} style={{ width: 60, accentColor: 'var(--primary)' }} />
              </>
            )}
          </>
        )}

        <div className="ce-sep" />
        <div className="ce-zoom-controls">
          <button className="ce-btn ce-btn-sm" onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.25))} title="Zoom in"><ZoomIn size={14} /></button>
          <input
            type="range" min={MIN_SCALE} max={MAX_SCALE} step={0.05} value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="ce-zoom-slider" title={`Zoom: ${Math.round(scale * 100)}%`}
          />
          <button className="ce-btn ce-btn-sm" onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.25))} title="Zoom out"><ZoomOut size={14} /></button>
          <span className="ce-zoom-label">{Math.round(scale * 100)}%</span>
          <button className="ce-btn ce-btn-sm" onClick={resetZoom} title="Reset zoom & pan"><Maximize size={14} /></button>
        </div>

        <div style={{ marginLeft: 'auto' }} />
        <button className="ce-btn" onClick={onClose} title="Close editor"><X size={16} /> Close</button>
      </div>

      {error && <div className="ce-error">{error} <button className="ce-btn" onClick={() => setError(null)}>×</button></div>}

      <div className="ce-body">
        {/* SVG canvas */}
        <div className="ce-canvas">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="ce-svg"
            onMouseDown={onCanvasMouseDown}
            onMouseMove={(e) => { onCanvasMouseMove(e); onSvgMouseMove(e); }}
            onMouseUp={(e) => { onCanvasMouseUp(e); onSvgMouseUp(); }}
            onMouseLeave={(e) => { onCanvasMouseUp(e); onSvgMouseUp(); }}
            onClick={() => { if (!connectMode && !panning) { setSelectedNodeIds([]); setSelectedConnId(null); } }}
            style={{ cursor: panning ? 'grabbing' : undefined }}
          >
            {/* grid */}
            <defs>
              <pattern id="ce-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#ce-grid)" />

            {/* floorplan background */}
            {showFloorplan && fpImgUrl && (
              <image href={fpImgUrl} x={0} y={0} width={WIDTH} height={HEIGHT} preserveAspectRatio="xMidYMid meet" opacity={fpOpacity} />
            )}

            {/* connections */}
            {connections.map((c, idx) => {
              const a = nodeById.get(c.from);
              const b = nodeById.get(c.to);
              if (!a || !b) return null;
              const isSel = c.id === selectedConnId;
              return (
                <line
                  key={c.id ?? idx}
                  x1={sx(a.position.x)} y1={sy(a.position.y)}
                  x2={sx(b.position.x)} y2={sy(b.position.y)}
                  stroke={isSel ? clr.selected : c.manual ? clr.manual : clr.auto}
                  strokeWidth={isSel ? 3 : 2}
                  strokeDasharray={c.manual ? '6 4' : undefined}
                  opacity={isSel ? 1 : 0.6}
                  style={{ cursor: editMode ? 'pointer' : 'default' }}
                  onClick={(e) => editMode && onConnClick(e, c)}
                  onContextMenu={(e) => editMode && onConnContextMenu(e, c)}
                />
              );
            })}

            {/* connect-mode preview line */}
            {connectMode && connectFrom != null && mousePos && (() => {
              const fromNode = nodeById.get(connectFrom);
              if (!fromNode) return null;
              return (
                <line
                  x1={sx(fromNode.position.x)} y1={sy(fromNode.position.y)}
                  x2={mousePos.x} y2={mousePos.y}
                  stroke={clr.manual} strokeWidth={2} strokeDasharray="4 4" opacity={0.7}
                />
              );
            })()}

            {/* nodes */}
            {nodes.map((n) => {
              const x = sx(n.position.x);
              const y = sy(n.position.y);
              const isSel = selectedNodeIds.includes(n.id);
              const isDirty = dirty.has(n.id);
              const isConnFrom = connectFrom === n.id;
              const r = isSel ? 12 : 8;

              return (
                <g key={n.id} transform={`translate(${x},${y})`}
                  onMouseDown={(e) => onNodeMouseDown(e, n)}
                  style={{ cursor: editMode ? (connectMode ? 'crosshair' : 'grab') : 'pointer' }}
                >
                  {isSel && <circle r={r + 6} fill="none" stroke={clr.nodeSelected} strokeWidth={2} strokeDasharray="3 3" />}
                  <circle
                    r={r}
                    fill={isConnFrom ? clr.manual : isSel ? clr.nodeSelected : isDirty ? clr.nodeModified : clr.nodeDefault}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={1.5}
                  />
                  {isDirty && (
                    <text x={r + 2} y={-r + 2} fontSize={10} fill="rgba(255,255,255,0.8)">✏</text>
                  )}
                  <text y={r + 14} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.6)" fontWeight={700}>
                    #{n.frame_number}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        {editMode && (
          <div className="ce-panel">
            {panelNode ? (
              <>
                <div className="ce-panel-title">Edit Panorama #{panelNode.frame_number}</div>
                {panelNode.thumbnail_url && (
                  <a
                    href={panoramaUrlFromThumbnail(panelNode.thumbnail_url)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open full panorama"
                    style={{ display: 'block', margin: '0 0 12px', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a' }}
                  >
                    <img
                      src={panelNode.thumbnail_url}
                      alt={`Frame ${panelNode.frame_number}`}
                      style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 200 }}
                      loading="lazy"
                    />
                  </a>
                )}
                <div className="ce-field">
                  <label className="ce-label">X Position</label>
                  <input className="input ce-input" type="number" step="0.01" value={panelPos.x} onChange={(e) => setPanelPos((p) => ({ ...p, x: e.target.value }))} />
                </div>
                <div className="ce-field">
                  <label className="ce-label">Y Position</label>
                  <input className="input ce-input" type="number" step="0.01" value={panelPos.y} onChange={(e) => setPanelPos((p) => ({ ...p, y: e.target.value }))} />
                </div>
                <div className="ce-field">
                  <label className="ce-label">Orientation (0–360°)</label>
                  <input className="input ce-input" type="range" min="0" max="360" step="1" value={panelPos.orientation} onChange={(e) => setPanelPos((p) => ({ ...p, orientation: e.target.value }))} />
                  <span className="muted" style={{ fontSize: 12 }}>{panelPos.orientation}°</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyPanelPos}>Apply</button>
                  <button className="btn" style={{ flex: 1 }} onClick={() => { setSelectedNodeIds([]); }}>Cancel</button>
                </div>

                <div className="divider" />
                <div className="ce-panel-title">Connections ({nodeConns.length})</div>
                {nodeConns.length === 0 && <div className="muted" style={{ fontSize: 13 }}>No connections.</div>}
                {nodeConns.map((c) => {
                  const otherId = c.from === panelNode.id ? c.to : c.from;
                  const other = nodeById.get(otherId);
                  return (
                    <div key={c.id ?? `${c.from}-${c.to}`} className="ce-conn-row">
                      <span>→ #{other?.frame_number ?? otherId}</span>
                      <span className="muted" style={{ fontSize: 11 }}>
                        {typeof c.confidence === 'number' ? c.confidence.toFixed(2) : '—'} · {c.manual ? 'manual' : 'auto'}
                      </span>
                      <button className="ce-btn ce-btn-sm" onClick={() => c.id != null && handleDeleteConnection(c.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
                <button className="ce-btn" style={{ marginTop: 8, width: '100%' }} onClick={() => { setConnectMode(true); setConnectFrom(panelNode.id); }}>
                  <LinkIcon size={14} /> Add connection
                </button>
              </>
            ) : (
              <>
                <div className="ce-panel-title">Batch Operations</div>
                <button className="ce-btn" style={{ width: '100%' }} onClick={autoArrange} title="Force-directed auto-arrange">
                  <Shuffle size={14} /> Auto-arrange
                </button>
                <button className="ce-btn" style={{ width: '100%', marginTop: 6 }} onClick={alignH} disabled={selectedNodeIds.length < 2} title="Align selected horizontally">
                  <AlignHorizontalDistributeCenter size={14} /> Align horizontal
                </button>
                <button className="ce-btn" style={{ width: '100%', marginTop: 6 }} onClick={alignV} disabled={selectedNodeIds.length < 2} title="Align selected vertically">
                  <AlignVerticalDistributeCenter size={14} /> Align vertical
                </button>
                <button className="ce-btn" style={{ width: '100%', marginTop: 6 }} onClick={distribute} disabled={selectedNodeIds.length < 3} title="Distribute evenly">
                  <ArrowLeftRight size={14} /> Distribute evenly
                </button>
                <button className="ce-btn" style={{ width: '100%', marginTop: 6 }} onClick={handleReset}>
                  <RotateCw size={14} /> Reset to SfM
                </button>
                <div className="divider" />
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <b>Keyboard shortcuts</b><br />
                  Ctrl+Z: Undo<br />
                  Ctrl+Y: Redo<br />
                  Ctrl+S: Save<br />
                  Delete: Remove selected connection<br />
                  Shift+Click: Multi-select nodes<br />
                  Esc: Deselect / cancel
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
