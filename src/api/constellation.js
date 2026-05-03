import api from './auth';
import { videosAPI } from './videos';

export const constellationAPI = {
  getConstellation: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/constellation`);
    return res.data;
  },

  getProcessingStatus: async (videoId) => {
    // Prefer dedicated endpoint if present
    const res = await api.get(`/videos/${videoId}/processing-status`);
    return res.data;
  },
};


