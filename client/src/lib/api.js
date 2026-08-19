import axios from 'axios';

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with caching and auth
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('sh_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;

  // Add request ID for tracking
  cfg.headers['X-Request-ID'] = crypto.randomUUID?.() || Math.random().toString(36).substring(7);

  // Cache GET requests
  if (cfg.method === 'get' && cfg.cache !== false) {
    const cacheKey = `${cfg.url}?${JSON.stringify(cfg.params)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      cfg.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
        request: {},
      });
    }
  }

  return cfg;
});

// Response interceptor with error handling and caching
api.interceptors.response.use(
  (res) => {
    // Cache successful GET responses
    if (res.config.method === 'get' && res.config.cache !== false) {
      const cacheKey = `${res.config.url}?${JSON.stringify(res.config.params)}`;
      cache.set(cacheKey, { data: res.data, timestamp: Date.now() });
    }
    return res.data;
  },
  async (err) => {
    const originalRequest = err.config;

    // Handle 401 unauthorized
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('sh_token');
      localStorage.removeItem('sh_user');
      if (!window.location.hash.includes('/login')) {
        window.location.href = '/#/login';
      }
      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // Retry on network errors (max 3 retries)
    if (!err.response && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    if (!err.response && originalRequest._retryCount < 3) {
      originalRequest._retryCount += 1;
      await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
      return api(originalRequest);
    }

    // Enhanced error messages
    let msg = err.response?.data?.message || err.message || 'Something went wrong';

    if (err.code === 'ECONNABORTED') {
      msg = 'Request timeout. Please check your connection.';
    } else if (err.code === 'ERR_NETWORK') {
      msg = 'Network error. Please check your internet connection.';
    } else if (err.response?.status === 429) {
      msg = 'Too many requests. Please wait a moment.';
    } else if (err.response?.status === 500) {
      msg = 'Server error. Please try again later.';
    } else if (err.response?.status === 503) {
      msg = 'Service temporarily unavailable. Please try again later.';
    }

    // Log errors for debugging (in development)
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: originalRequest.url,
        method: originalRequest.method,
        status: err.response?.status,
        message: msg,
        error: err,
      });
    }

    return Promise.reject(new Error(msg));
  }
);

// Cache utility functions
export const clearCache = () => cache.clear();
export const clearCachePattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
};

export const uploadApi = {
  image: (dataUrl) => api.post('/upload', { image: dataUrl }),
};

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.patch('/auth/password', data),
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
  bulkAvailability: (branch, available) => api.patch('/catalog/bulk-availability', { branch, available }),
  recommendations: (branch, customerId) => api.get('/catalog/recommendations', { params: { branch, customerId } }),
  ratings: (branch) => api.get('/catalog/ratings', { params: { branch } }),
  coOrdered: (branch, menuItemId) => api.get('/catalog/co-ordered', { params: { branch, menuItemId } }),
  tables: (branch) => api.get('/catalog/tables', { params: { branch } }),
};

export const orderApi = {
  create: (data) => api.post('/orders', data),
  get: (id) => api.get(`/orders/${id}`),
  list: (branch, status) => api.get('/orders', { params: { branch, status } }),
  history: (customerId) => api.get(`/orders/history/${customerId}`),
  loyalty: (customerId) => api.get(`/orders/loyalty/${customerId}`),
  smartEta: (id) => api.get(`/orders/${id}/smart-eta`),
  updateStatus: (id, to, note) => api.patch(`/orders/${id}/status`, { to, note }),
  kitchen: (id, action) => api.patch(`/orders/${id}/kitchen`, { action }),
  deliver: (id) => api.patch(`/orders/${id}/deliver`),
  cancel: (id, reason, guestId) => api.delete(`/orders/${id}`, { data: { reason, guestId } }),
};

export const serviceApi = {
  create: (data) => api.post('/services', data),
  list: (branch, status) => api.get('/services', { params: { branch, status } }),
  update: (id, data) => api.patch(`/services/${id}`, data),
};

export const reviewApi = {
  create: (data) => api.post('/reviews', data),
  quick: (data) => api.post('/reviews/quick', data),
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
  demandToday: (branch) => api.get('/analytics/demand/today', { params: { branch } }),
  recommendations: (branch, customerId, cart) =>
    api.get('/analytics/recommendations', { params: { branch, customerId, cart: Array.isArray(cart) ? cart.join(',') : cart } }),
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
  deleteHotel: (id) => api.delete(`/admin/hotels/${id}`),
  branches: (hotel) => api.get('/admin/branches', { params: { hotel } }),
  createBranch: (data) => api.post('/admin/branches', data),
  updateBranch: (id, data) => api.patch(`/admin/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/admin/branches/${id}`),
  users: () => api.get('/admin/users'),
  auditLogs: () => api.get('/admin/audit-logs'),
};

export const couponApi = {
  list: (branch) => api.get('/coupons', { params: { branch } }),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.patch(`/coupons/${id}`, data),
  remove: (id) => api.delete(`/coupons/${id}`),
  validate: (code, branch, subtotal) => api.post('/coupons/validate', { code, branch, subtotal }),
};

export default api;
