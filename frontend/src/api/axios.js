import axios from 'axios';
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
instance.interceptors.request.use(config => {
  if (config.url?.startsWith('/api/')) {
    config.url = config.url.slice(4);
  }
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
instance.interceptors.response.use(r => r, error => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  if (error.response?.data?.message) {
    error.userMessage = error.response.data.message;
  } else if (!error.response) {
    error.userMessage = 'Unable to reach the CO-LAB CONNECT service.';
  }
  return Promise.reject(error);
});
export default instance;
