import api from './auth';

export const adminAPI = {
  listUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  updateUser: async (userId, data) => {
    const res = await api.put(`/admin/users/${userId}`, data);
    return res.data;
  },

  deleteUser: async (userId) => {
    await api.delete(`/admin/users/${userId}`);
  },

  listUserProjects: async (userId) => {
    const res = await api.get(`/admin/users/${userId}/projects`);
    return res.data;
  },

  deleteProject: async (projectId) => {
    await api.delete(`/admin/projects/${projectId}`);
  },

  listUserPanoramaSets: async (userId) => {
    const res = await api.get(`/admin/users/${userId}/panorama_sets`);
    return res.data;
  },

  listVideoPanoramas: async (videoId) => {
    const res = await api.get(`/admin/videos/${videoId}/panoramas`);
    return res.data;
  },
};


