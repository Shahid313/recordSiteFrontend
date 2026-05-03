import React, { useState } from 'react';

export const CreateProjectModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>Create Project</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Office Building Tour"
              maxLength={255}
              autoFocus
            />
          </label>

          <label style={styles.label}>
            Description
            <textarea
              style={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this tour…"
              maxLength={5000}
              rows={4}
            />
          </label>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.secondaryButton} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },
  modal: {
    width: '100%',
    maxWidth: 'min(520px, 92vw)',
    backgroundColor: 'var(--panel)',
    borderRadius: 16,
    boxShadow: 'var(--shadow)',
    padding: 18,
    border: '1px solid var(--border)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: 28,
    cursor: 'pointer',
    lineHeight: 1,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text)', fontWeight: 800 },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    fontSize: 14,
    width: '100%',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    fontSize: 14,
    resize: 'vertical',
    width: '100%',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--primary)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 800,
  },
  secondaryButton: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontWeight: 800,
  },
  error: {
    backgroundColor: '#fff1f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    border: '1px solid #fecaca',
  },
};


