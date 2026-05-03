import api from './auth';

export const editingAPI = {
  updatePosition: async (panoId, data) => {
    const res = await api.patch(`/panoramas/${panoId}/position`, data);
    return res.data;
  },

  addConnection: async (fromPanoId, toPanoId) => {
    const res = await api.post('/connections', { from_pano_id: fromPanoId, to_pano_id: toPanoId });
    return res.data;
  },

  deleteConnection: async (connId) => {
    await api.delete(`/connections/${connId}`);
  },

  patchConnection: async (connId, data) => {
    const res = await api.patch(`/connections/${connId}`, data);
    return res.data;
  },

  resetConstellation: async (projectId) => {
    const res = await api.post(`/projects/${projectId}/constellation/reset`);
    return res.data;
  },

  getHistory: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/constellation/history`);
    return res.data;
  },

  undo: async (projectId) => {
    const res = await api.post(`/projects/${projectId}/constellation/undo`);
    return res.data;
  },

  redo: async (projectId) => {
    const res = await api.post(`/projects/${projectId}/constellation/redo`);
    return res.data;
  },
};
