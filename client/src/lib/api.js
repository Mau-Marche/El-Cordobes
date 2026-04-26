import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Inyectar token JWT en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirigir al login si el token expiró
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clientsApi = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// ─── Vehicles ────────────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: (params) => api.get('/vehicles', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

// ─── Jobs ────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  toQuote: (id) => api.post(`/jobs/${id}/to-quote`),
  uploadAttachments: (id, formData) =>
    api.post(`/jobs/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAttachment: (jobId, attachId) => api.delete(`/jobs/${jobId}/attachments/${attachId}`),
};

// ─── Quotes ──────────────────────────────────────────────────────────────────
export const quotesApi = {
  list: (params) => api.get('/quotes', { params }),
  get: (id) => api.get(`/quotes/${id}`),
  create: (data) => api.post('/quotes', data),
  update: (id, data) => api.put(`/quotes/${id}`, data),
  delete: (id) => api.delete(`/quotes/${id}`),
  generatePDF: (id) => api.post(`/quotes/${id}/pdf`),
  convertToJob: (id) => api.post(`/quotes/${id}/convert`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard'),
  search: (q) => api.get('/dashboard/search', { params: { q } }),
};

// ─── Migration ───────────────────────────────────────────────────────────────
export const migrationApi = {
  logs: () => api.get('/migration/logs'),
  preview: (formData) =>
    api.post('/migration/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importClients: (formData) =>
    api.post('/migration/import/clients', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importVehicles: (formData) =>
    api.post('/migration/import/vehicles', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// ─── Catalog ─────────────────────────────────────────────────────────────────
export const catalogApi = {
  search: (q) => api.get('/catalog', { params: { q } }),
  cleanSpcGe: () => api.delete('/catalog/spcge'),
};
