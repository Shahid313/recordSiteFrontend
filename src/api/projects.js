import api from './auth';

export const projectsAPI = {
  create: async (data) => {
    const res = await api.post('/projects/', data);
    return res.data;
  },

  list: async () => {
    const res = await api.get('/projects/');
    return res.data;
  },

  get: async (id) => {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data;
  },

  remove: async (id) => {
    await api.delete(`/projects/${id}`);
  },

  listVideos: async (id) => {
    const res = await api.get(`/projects/${id}/videos`);
    return res.data;
  },
};


