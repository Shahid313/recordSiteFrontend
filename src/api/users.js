import api from './auth';

export const usersAPI = {
  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteMe: async () => {
    await api.delete('/users/me');
  },

  changePassword: async (current_password, new_password) => {
    const res = await api.post('/users/me/change-password', { current_password, new_password });
    return res.data;
  },
};


