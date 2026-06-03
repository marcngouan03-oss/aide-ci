import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register:   d  => api.post('/auth/register', d),
  login:      d  => api.post('/auth/login', d),
  me:         () => api.get('/auth/me'),
  logout:     () => api.put('/auth/logout'),
  updateLocation:      (lat,lng) => api.put('/auth/location', {lat,lng}),
  updateDisponibilite: d => api.put('/auth/disponibilite', {disponibilite:d}),
  getNotifications:    () => api.get('/auth/notifications'),
  markRead:            () => api.put('/auth/notifications/read'),
};

export const prestataireAPI = {
  search: p  => api.get('/prestataires', {params:p}),
  carte:  () => api.get('/prestataires/carte'),
  getOne: (id,p) => api.get(`/prestataires/${id}`, {params:p}),
};

export const messageAPI = {
  get:  uid => api.get(`/messages/${uid}`),
  send: d   => api.post('/messages', d),
};

export const missionAPI = {
  create:         d      => api.post('/missions', d),
  mesMissions:    ()     => api.get('/missions/mes-missions'),
  getOne:         id     => api.get(`/missions/${id}`),
  confirmerDepot: id     => api.put(`/missions/${id}/depot`),
  updateStatut:   (id,s) => api.put(`/missions/${id}/statut`, {statut:s}),
  noter:          (id,d) => api.post(`/missions/${id}/noter`, d),
};

export const categorieAPI = { getAll: () => api.get('/categories') };

export const adminAPI = {
  dashboard:       () => api.get('/admin/dashboard'),
  getUsers:        p  => api.get('/admin/users', {params:p}),
  updateUser:      (id,d) => api.put(`/admin/users/${id}`, d),
  getMissions:     p  => api.get('/admin/missions', {params:p}),
  getTransactions: p  => api.get('/admin/transactions', {params:p}),
  getCategories:   () => api.get('/admin/categories'),
  createCategorie: d  => api.post('/admin/categories', d),
  updateCategorie: (id,d) => api.put(`/admin/categories/${id}`, d),
  deleteCategorie: id => api.delete(`/admin/categories/${id}`),
  getConfig:       () => api.get('/admin/config'),
  updateConfig:    d  => api.put('/admin/config', d),
  getNotifications:() => api.get('/admin/notifications'),
};

export default api;
