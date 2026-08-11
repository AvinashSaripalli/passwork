import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

let isLoggingOut = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('sessionMasterPassword');
      sessionStorage.removeItem('sessionAdminMasterPassword');
      sessionStorage.removeItem('isMasterVerified');
      sessionStorage.removeItem('masterPasswordVerifier');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
