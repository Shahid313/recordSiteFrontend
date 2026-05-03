import React, { useEffect, useMemo, useRef, useState } from 'react';
import { videosAPI, pollVideoStatus } from '../api/videos';

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_EXT = ['.mp4', '.mov', '.avi'];

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const STATUS_LABELS = {
  UPLOADED: 'Queued',
  EXTRACTING_FRAMES: 'Extracting frames',
  PROCESSING_SFM: 'Building constellation',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const formatStatus = (s) => STATUS_LABELS[s] || s || 'Unknown';

const isProcessingStatus = (s) =>
  s === 'EXTRACTING_FRAMES' || s === 'PROCESSING_SFM' || s === 'UPLOADED';

export const VideoUpload = ({ projectId, onUploaded, onStatus, onCompleted, onFailed }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoId, setVideoId] = useState(null);

  // Keep the latest callback refs so the polling effect doesn't restart every tick.
  const onStatusRef = useRef(onStatus);
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { onCompletedRef.current = onCompleted; }, [onCompleted]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  const fileError = useMemo(() => {
    if (!file) return null;
    const name = file.name?.toLowerCase() || '';
    const okExt = ALLOWED_EXT.some((e) => name.endsWith(e));
    const okType = !file.type || ALLOWED.includes(file.type);
    if (!okExt || !okType) return `Unsupported format. Allowed: ${ALLOWED_EXT.join(', ')}`;
    if (file.size > MAX_BYTES) return 'Video exceeds 2GB limit.';
    return null;
  }, [file]);

  useEffect(() => {
    if (!videoId) return undefined;
    const stop = pollVideoStatus(videoId, {
      intervalMs: 3000,
      onUpdate: (s) => {
        setStatus(s);
        onStatusRef.current?.(s);
      },
      onDone: async (s) => {
        setStatus(s);
        onStatusRef.current?.(s);
        if (s.status === 'COMPLETED') onCompletedRef.current?.(s);
        if (s.status === 'FAILED') onFailedRef.current?.(s);
      },
      onError: () => {
        setError('Failed to poll video status.');
      },
    });
    return () => stop();
  }, [videoId]);

  const pick = () => inputRef.current?.click();

  const handleFile = (f) => {
    setError(null);
    setUploadPct(0);
    setStatus(null);
    setVideoId(null);
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const startUpload = async () => {
    setError(null);
    if (!file) return;
    if (fileError) {
      setError(fileError);
      return;
    }
    setIsUploading(true);
    try {
      const res = await videosAPI.upload(projectId, file, (pct) => setUploadPct(pct));
      setVideoId(res.video_id);
      onUploaded?.(res.video_id);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div
        style={{
          ...styles.drop,
          borderColor: dragOver ? 'rgba(30, 58, 138, 0.55)' : 'var(--border)',
          backgroundColor: dragOver ? 'rgba(30, 58, 138, 0.06)' : 'var(--panel)',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={pick}
        role="button"
        tabIndex={0}
      >
        <div style={styles.dropTitle}>Drag & drop a 360° video here</div>
        <div style={styles.dropSub}>or click to choose (MP4 / MOV / AVI, max 2GB)</div>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      {file && (
        <div style={styles.fileRow}>
          <div style={styles.fileName}>{file.name}</div>
          <div style={styles.fileSize}>{formatBytes(file.size)}</div>
        </div>
      )}

      {fileError && <div style={styles.warn}>{fileError}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div className="vu-actions">
        <button className="btn" onClick={() => handleFile(null)} disabled={isUploading}>
          Clear
        </button>
        <button className="btn btn-primary" onClick={startUpload} disabled={!file || !!fileError || isUploading}>
          {isUploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {(isUploading || uploadPct > 0) && (
        <div style={styles.progressWrap}>
          <div style={styles.progressBarOuter}>
            <div style={{ ...styles.progressBarInner, width: `${uploadPct}%` }} />
          </div>
          <div style={styles.progressText}>{uploadPct}%</div>
        </div>
      )}

      {status && (
        <div style={styles.statusCard}>
          <div style={styles.statusRow}>
            <div style={styles.statusLabel}>Status</div>
            <div style={styles.statusValue}>{formatStatus(status.status)}</div>
          </div>
          {isProcessingStatus(status.status) && (
            <>
              <div style={styles.statusRow}>
                <div style={styles.statusLabel}>Processing</div>
                <div style={styles.statusValue}>
                  {typeof status.progress_percent === 'number' ? `${Math.round(status.progress_percent)}%` : '…'}
                </div>
              </div>
              <div style={styles.procBarOuter}>
                <div
                  style={{
                    ...styles.procBarInner,
                    width: typeof status.progress_percent === 'number' ? `${Math.round(status.progress_percent)}%` : '35%',
                    ...(typeof status.progress_percent === 'number' ? {} : styles.procBarIndeterminate),
                  }}
                />
              </div>
              <div style={styles.procMeta}>
                {typeof status.processed_frames === 'number' ? `${status.processed_frames} frames` : ''}
                {typeof status.total_frames === 'number' ? ` / ${status.total_frames}` : ''}
              </div>
            </>
          )}
          {status.error_message && (
            <div style={styles.statusError}>
              {status.error_message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  drop: {
    border: '2px dashed var(--border)',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    textAlign: 'center',
  },
  dropTitle: { fontWeight: 900, color: 'var(--text)', marginBottom: 6 },
  dropSub: { color: 'var(--muted)', fontSize: 13 },
  fileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    flexWrap: 'wrap',
  },
  fileName: { fontWeight: 900, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize: { color: 'var(--muted)', fontWeight: 800, whiteSpace: 'nowrap' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  progressBarOuter: {
    flex: 1,
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', backgroundColor: 'var(--primary)' },
  progressText: { fontWeight: 900, color: 'var(--text)', width: 44, textAlign: 'right' },
  statusCard: {
    backgroundColor: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 14,
  },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0' },
  statusLabel: { color: 'var(--muted)', fontWeight: 800 },
  statusValue: { color: 'var(--text)', fontWeight: 950 },
  procBarOuter: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  procBarInner: { height: '100%', backgroundColor: 'var(--secondary)' },
  procBarIndeterminate: {
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  procMeta: { marginTop: 8, color: 'var(--muted)', fontSize: 12, fontWeight: 800 },
  statusError: {
    marginTop: 10,
    backgroundColor: '#fff1f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #fecaca',
  },
  warn: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #fde68a',
  },
  error: {
    backgroundColor: '#fff1f2',
    color: '#991b1b',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #fecaca',
  },
};


