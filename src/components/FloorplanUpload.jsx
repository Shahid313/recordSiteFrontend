import React, { useState } from 'react';
import { Upload, Trash2, GripVertical, Pencil, Check, X } from 'lucide-react';
import { floorplansAPI } from '../api/floorplans';

export const FloorplanUpload = ({ projectId, floorplans, onRefresh }) => {
  const [name, setName] = useState('');
  const [floorOrder, setFloorOrder] = useState(0);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState(0);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('floor_order', String(floorOrder));
      fd.append('image', file);
      await floorplansAPI.upload(projectId, fd);
      setName('');
      setFloorOrder(0);
      setFile(null);
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fp) => {
    if (!window.confirm(`Delete floorplan "${fp.name}"?`)) return;
    try {
      await floorplansAPI.remove(fp.id);
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Delete failed');
    }
  };

  const startEdit = (fp) => {
    setEditingId(fp.id);
    setEditName(fp.name);
    setEditOrder(fp.floor_order);
  };

  const saveEdit = async () => {
    try {
      await floorplansAPI.update(editingId, { name: editName, floor_order: editOrder });
      setEditingId(null);
      onRefresh?.();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Update failed');
    }
  };

  return (
    <div>
      <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div>
          <label className="muted" style={{ fontSize: 11, fontWeight: 800, display: 'block', marginBottom: 2 }}>Floor Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ground Floor" style={{ width: 160 }} />
        </div>
        <div>
          <label className="muted" style={{ fontSize: 11, fontWeight: 800, display: 'block', marginBottom: 2 }}>Order</label>
          <input className="input" type="number" value={floorOrder} onChange={(e) => setFloorOrder(Number(e.target.value))} style={{ width: 60 }} />
        </div>
        <div>
          <label className="muted" style={{ fontSize: 11, fontWeight: 800, display: 'block', marginBottom: 2 }}>Image (PNG/JPG)</label>
          <input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={uploading || !file || !name.trim()}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      {floorplans.length === 0 ? (
        <div className="muted">No floorplans uploaded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {floorplans.map((fp) => (
            <div
              key={fp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--card)',
              }}
            >
              <GripVertical size={14} style={{ opacity: 0.3 }} />
              {fp.thumbnail_url && (
                <img
                  src={fp.thumbnail_url}
                  alt={fp.name}
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
                />
              )}
              {editingId === fp.id ? (
                <>
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: 130 }} />
                  <input className="input" type="number" value={editOrder} onChange={(e) => setEditOrder(Number(e.target.value))} style={{ width: 50 }} />
                  <button className="btn" onClick={saveEdit} title="Save"><Check size={14} /></button>
                  <button className="btn" onClick={() => setEditingId(null)} title="Cancel"><X size={14} /></button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>{fp.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Order: {fp.floor_order}</div>
                  </div>
                  <button className="btn" onClick={() => startEdit(fp)} title="Edit"><Pencil size={14} /></button>
                  <button className="btn btn-danger" onClick={() => handleDelete(fp)} title="Delete" style={{ padding: '6px 8px' }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
