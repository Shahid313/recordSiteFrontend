import api from './auth';

export const collaborationAPI = {
  listCollaborators: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/collaborators`);
    return res.data;
  },

  addCollaborator: async (projectId, data) => {
    const res = await api.post(`/projects/${projectId}/collaborators`, data);
    return res.data;
  },

  updateCollaborator: async (projectId, collaboratorId, data) => {
    const res = await api.patch(`/projects/${projectId}/collaborators/${collaboratorId}`, data);
    return res.data;
  },

  removeCollaborator: async (projectId, collaboratorId) => {
    await api.delete(`/projects/${projectId}/collaborators/${collaboratorId}`);
  },

  listComments: async (projectId) => {
    const res = await api.get(`/projects/${projectId}/comments`);
    return res.data;
  },

  createComment: async (projectId, data) => {
    const res = await api.post(`/projects/${projectId}/comments`, data);
    return res.data;
  },

  setResolved: async (commentId, resolved) => {
    const res = await api.patch(`/comments/${commentId}/resolve`, { resolved });
    return res.data;
  },
};
