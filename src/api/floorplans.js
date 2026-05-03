import api from './auth';

export const floorplansAPI = {
  upload: async (projectId, formData) => {
    const res = await api.post(`/projects/${projectId}/floorplans`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  list: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/floorplans`);
    return res.data;
  },

  update: async (floorplanId, data) => {
    const res = await api.patch(`/floorplans/${floorplanId}`, data);
    return res.data;
  },

  remove: async (floorplanId) => {
    await api.delete(`/floorplans/${floorplanId}`);
  },

  assignPanoramas: async (floorplanId, panoramaIds) => {
    const res = await api.post(`/floorplans/${floorplanId}/assign-panoramas`, { panorama_ids: panoramaIds });
    return res.data;
  },

  setTransition: async (panoId, data) => {
    const res = await api.patch(`/panoramas/${panoId}/transition`, data);
    return res.data;
  },

  getFloorAssignments: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/floor-assignments`);
    return res.data;
  },
};
