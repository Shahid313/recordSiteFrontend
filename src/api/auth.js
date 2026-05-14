import axios from 'axios';

// Base URL for the API.
// - In production, set VITE_API_URL (e.g. https://your-backend.up.railway.app) in .env.production.
// - In development, leave it unset to use the Vite proxy at /api (see vite.config.js).
const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const RAW_PUBLIC_DEVELOPMENT_URL = import.meta.env.PUBLIC_DEVELOPMENT_URL || '';
// Strip trailing slash so we don't end up with `//api/v1`.
const BASE = RAW_API_URL.replace(/\/+$/, '');
const API_URL = `${BASE}/api/v1`;
const PUBLIC_DEVELOPMENT_URL = RAW_PUBLIC_DEVELOPMENT_URL.replace(/\/+$/, '');

const FILE_ROUTE_PATTERN = /(?:^|https?:\/\/[^/]+)\/api\/v1\/files\/(.+)$/;

const toPublicFileUrl = (value) => {
  if (!PUBLIC_DEVELOPMENT_URL || typeof value !== 'string') return value;

  const match = value.match(FILE_ROUTE_PATTERN);
  if (!match) return value;

  return `${PUBLIC_DEVELOPMENT_URL}/${match[1]}`;
};

const normalizeFileUrls = (value) => {
  if (Array.isArray(value)) return value.map(normalizeFileUrls);
  if (!value || typeof value !== 'object') return toPublicFileUrl(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, normalizeFileUrls(nestedValue)])
  );
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.response.use((response) => {
  response.data = normalizeFileUrls(response.data);
  return response;
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
