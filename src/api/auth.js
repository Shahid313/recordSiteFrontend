import axios from 'axios';

// Base URL for the API.
// - In production, set VITE_API_URL (e.g. https://your-backend.up.railway.app) in .env.production.
// - In development, leave it unset to use the Vite proxy at /api (see vite.config.js).
const RAW_API_URL = import.meta.env.VITE_API_URL || '';
// Strip trailing slash so we don't end up with `//api/v1`.
const BASE = RAW_API_URL.replace(/\/+$/, '');
const API_URL = `${BASE}/api/v1`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

export const authAPI = {
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default api;