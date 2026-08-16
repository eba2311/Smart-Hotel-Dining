import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('sh_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sh_token');
      localStorage.removeItem('sh_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const msg = err.response?.data?.message || err.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);

export const uploadApi = {
  image: (dataUrl) => api.post('/upload', { image: dataUrl }),
};

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const catalogApi = {
  resolveQr: (token) => api.get(`/catalog/qr/${token}`),
  menu: (branch) => api.get('/catalog/menu', { params: { branch } }),
  categories: (branch) => api.get('/catalog/categories', { params: { branch } }),
  all: (branch) => api.get('/catalog/all', { params: { branch } }),
  createCategory: (data) => api.post('/catalog/categories', data),
  updateCategory: (id, data) => api.patch(`/catalog/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/catalog/categories/${id}`),
  createItem: (data) => api.post('/catalog/items', data),
  updateItem: (id, data) => api.patch(`/catalog/items/${id}`, data),
  deleteItem: (id) => api.delete(`/catalog/items/${id}`),
};

export const orderApi = {
  create: (data) => api.post('/orders', data),
  get: (id) => api.get(`/orders/${id}`),
  list: (branch, status) => api.get('/orders', { params: { branch, status } }),
  history: (customerId) => api.get(`/orders/history/${customerId}`),
  updateStatus: (id, to, note) => api.patch(`/orders/${id}/status`, { to, note }),
  kitchen: (id, action) => api.patch(`/orders/${id}/kitchen`, { action }),
  deliver: (id) => api.patch(`/orders/${id}/deliver`),
  cancel: (id, reason) => api.delete(`/orders/${id}`, { data: { reason } }),
};

export const serviceApi = {
  create: (data) => api.post('/services', data),
  list: (branch, status) => api.get('/services', { params: { branch, status } }),
  update: (id, data) => api.patch(`/services/${id}`, data),
};

export const reviewApi = {
  create: (data) => api.post('/reviews', data),
  list: (branch) => api.get('/reviews', { params: { branch } }),
  analyze: (comment) => api.post('/reviews/analyze', { comment }),
};

export const inventoryApi = {
  list: (branch) => api.get('/inventory', { params: { branch } }),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
  restock: (id, quantity, branch) => api.post(`/inventory/${id}/restock`, { quantity, branch }),
  adjust: (id, stock, branch) => api.post(`/inventory/${id}/adjust`, { stock, branch }),
  transactions: (branch) => api.get('/inventory/transactions/all', { params: { branch } }),
};

export const tableApi = {
  tables: (branch) => api.get('/tables', { params: { branch } }),
  createTable: (data) => api.post('/tables', data),
  updateTable: (id, data) => api.patch(`/tables/${id}`, data),
  deleteTable: (id) => api.delete(`/tables/${id}`),
  tableQr: (id) => api.get(`/qr/table/${id}`),
  regenerateTableQr: (id) => api.post(`/tables/${id}/qr/regenerate`),
  rooms: (branch) => api.get('/rooms', { params: { branch } }),
  createRoom: (data) => api.post('/rooms', data),
  updateRoom: (id, data) => api.patch(`/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/rooms/${id}`),
  roomQr: (id) => api.get(`/qr/room/${id}`),
  regenerateRoomQr: (id) => api.post(`/rooms/${id}/qr/regenerate`),
};

export const analyticsApi = {
  summary: (branch) => api.get('/analytics/summary', { params: { branch } }),
  revenue: (branch, days) => api.get('/analytics/revenue', { params: { branch, days } }),
  satisfaction: (branch) => api.get('/analytics/satisfaction', { params: { branch } }),
  demand: (branch) => api.get('/analytics/demand', { params: { branch } }),
  recommendations: (branch, customerId, cart) =>
    api.get('/analytics/recommendations', { params: { branch, customerId, cart } }),
  analyzeFeedback: (comment) => api.post('/analytics/feedback/analyze', { comment }),
};

export const staffApi = {
  list: (branch) => api.get('/staff', { params: { branch } }),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.patch(`/staff/${id}`, data),
  remove: (id) => api.delete(`/staff/${id}`),
};

export const adminApi = {
  hotels: () => api.get('/admin/hotels'),
  createHotel: (data) => api.post('/admin/hotels', data),
  updateHotel: (id, data) => api.patch(`/admin/hotels/${id}`, data),
  branches: (hotel) => api.get('/admin/branches', { params: { hotel } }),
  createBranch: (data) => api.post('/admin/branches', data),
  updateBranch: (id, data) => api.patch(`/admin/branches/${id}`, data),
  users: () => api.get('/admin/users'),
  auditLogs: () => api.get('/admin/audit-logs'),
};

export const couponApi = {
  list: (branch) => api.get('/coupons', { params: { branch } }),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.patch(`/coupons/${id}`, data),
  remove: (id) => api.delete(`/coupons/${id}`),
};

export default api;
