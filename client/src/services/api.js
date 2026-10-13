import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
    : '/api',
  withCredentials: true, // Send HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if fallback session token is stored
api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('cns_session_token');
  if (token && !reqConfig.headers.Authorization) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// Intercept responses for unified error message extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message =
      error.response?.data?.error ||
      error.response?.data?.message;

    if (!message) {
      if (
        (error.response?.status === 500 || error.code === 'ECONNREFUSED') &&
        (typeof error.response?.data === 'string' &&
          (error.response.data.includes('ECONNREFUSED') || error.response.data.includes('Proxy error')))
      ) {
        message = 'Backend server is offline or disconnected on port 5000. Please ensure the backend server is running.';
      } else if (error.response?.status === 500) {
        message = error.response?.data?.error || 'Backend server connection error (Port 5000). Please check backend console.';
      } else {
        message = error.message || 'An unexpected network error occurred';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((res) => res.data),
  login: (data) => api.post('/auth/login', data).then((res) => res.data),
  logout: () => api.post('/auth/logout').then((res) => res.data),
  getMe: () => api.get('/auth/me').then((res) => res.data),
};

export const qrApi = {
  initiate: (email) => api.post('/auth/qr/initiate', { email }).then((res) => res.data),
  getStatus: (requestId) => api.get(`/auth/qr/${requestId}`).then((res) => res.data),
  inspect: (token) => api.post('/auth/qr/inspect', { token }).then((res) => res.data),
  approve: (data) => api.post('/auth/qr/approve', data).then((res) => res.data),
  reject: (data) => api.post('/auth/qr/reject', data).then((res) => res.data),
  complete: (data) => api.post('/auth/qr/complete', data).then((res) => res.data),
};

export const userApi = {
  getProfile: () => api.get('/user/profile').then((res) => res.data),
  updateProfile: (data) => api.patch('/user/profile', data).then((res) => res.data),
  getHistory: () => api.get('/user/history').then((res) => res.data),
  getDevices: () => api.get('/user/devices').then((res) => res.data),
  revokeDevice: (deviceId) => api.delete(`/user/devices/${deviceId}`).then((res) => res.data),
  getHealth: () => api.get('/health').then((res) => res.data),
};

export default api;
