import React from 'react';
import { ChevronDown } from 'lucide-react';

export const FloorSwitcher = ({ floorplans, selectedFloorId, onSelectFloor }) => {
  if (!floorplans || floorplans.length === 0) return null;

  const sorted = [...floorplans].sort((a, b) => a.floor_order - b.floor_order);
  const current = sorted.find((f) => f.id === selectedFloorId);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={selectedFloorId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          onSelectFloor?.(val === '' ? null : Number(val));
        }}
        style={{
          appearance: 'none',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          color: '#fff',
          padding: '6px 28px 6px 10px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          minWidth: 120,
        }}
      >
        <option value="">All Floors</option>
        {sorted.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'rgba(255,255,255,0.6)',
        }}
      />
    </div>
  );
};
