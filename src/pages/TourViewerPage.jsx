import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toursAPI } from '../api/tours';
import { TourViewer } from '../components/TourViewer';

export const TourViewerPage = () => {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();

  const [tourData, setTourData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!Number.isFinite(projectId)) {
        setError('Invalid project id.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await toursAPI.getTourData(projectId);
        if (!cancelled) setTourData(data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load tour data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="container" style={{ maxWidth: 1400 }}>
      <div className="tour-page-head">
        <button className="btn btn-ghost" onClick={() => navigate(`/projects/${projectId}`)}>
          ← Back to Project
        </button>
        <div className="page-kicker" style={{ marginBottom: 0 }}>Tour viewer</div>
      </div>

      {error && <div className="error">{error}</div>}
      {isLoading ? (
        <div className="muted">Loading tour…</div>
      ) : (
        <TourViewer projectId={projectId} tourData={tourData} onExit={() => navigate(`/projects/${projectId}`)} />
      )}
    </div>
  );
};


