import api from './auth';

export const videosAPI = {
  upload: async (projectId, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/videos/upload/${projectId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!evt.total) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        onProgress?.(pct);
      },
    });
    return res.data;
  },

  getStatus: async (videoId) => {
    const res = await api.get(`/videos/${videoId}`);
    return res.data;
  },

  listPanoramas: async (videoId) => {
    const res = await api.get(`/videos/${videoId}/panoramas`);
    return res.data;
  },

  remove: async (videoId) => {
    await api.delete(`/videos/${videoId}`);
  },
};

export const pollVideoStatus = (videoId, { intervalMs = 3000, onUpdate, onDone, onError } = {}) => {
  let stopped = false;
  let timer = null;

  const tick = async () => {
    if (stopped) return;
    try {
      const data = await videosAPI.getStatus(videoId);
      onUpdate?.(data);
      if (['COMPLETED', 'FAILED'].includes(data.status)) {
        stopped = true;
        onDone?.(data);
        return;
      }
    } catch (e) {
      stopped = true;
      onError?.(e);
      return;
    }
    timer = setTimeout(tick, intervalMs);
  };

  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};


