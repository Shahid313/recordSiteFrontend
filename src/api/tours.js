import api from './auth';

export const toursAPI = {
  getTourData: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/tour-data`);
    return res.data;
  },

  getPanoramaDetails: async (panoId) => {
    const res = await api.get(`/panoramas/${panoId}`);
    return res.data;
  },
};


