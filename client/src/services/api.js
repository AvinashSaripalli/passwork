import axios from 'axios';
import { clearSecureSession } from '../utils/secureSession';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

let isRefreshing = false;
let isLoggedOut = false;
let waitQueue = [];

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  clearSecureSession();
  try {
    sessionStorage.removeItem('masterPasswordVerifier');
  } catch {
    // ignore
  }
};

const forceLogout = () => {
  if (isLoggedOut) return;
  isLoggedOut = true;
  clearAuth();
  window.location.href = '/login';
};

const flushQueue = (token) => {
  waitQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(new Error('refresh_failed'));
    }
  });
  waitQueue = [];
};

// Attempt to obtain a fresh access token using the stored refresh token.
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await api.post('/auth/refresh', { refreshToken }, {
      headers: { 'Content-Type': 'application/json' },
      skipAuthRefresh: true,
    });
    const newToken = res.data?.token;
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
    return newToken || null;
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    // No response / network error — reject as-is.
    if (!response) {
      return Promise.reject(error);
    }

    // Only auto-refresh on 401 from an authenticated request we haven't already
    // retried, and never on the refresh request itself.
    const shouldRefresh =
      response.status === 401 &&
      !config?.skipAuthRefresh &&
      !config?._retry &&
      localStorage.getItem('refreshToken');

    if (!shouldRefresh) {
      if (response.status === 401 && !config?.skipAuthRefresh && localStorage.getItem('token')) {
        // A valid-looking token was rejected and there's no refresh token to use.
        clearAuth();
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request is already refreshing — wait for it.
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (newToken) {
            config._retry = true;
            config.headers.Authorization = `Bearer ${newToken}`;
            return api(config);
          }
          forceLogout();
          return Promise.reject(error);
        })
        .catch(() => {
          forceLogout();
          return Promise.reject(error);
        });
    }

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;

    if (newToken) {
      flushQueue(newToken);
      config._retry = true;
      config.headers.Authorization = `Bearer ${newToken}`;
      return api(config);
    }

    flushQueue(null);
    forceLogout();
    return Promise.reject(error);
  }
);

export const requestPasswordReset = (email) =>
  api.post('/auth/forgot-password', { email }, { skipAuthRefresh: true });

export const resetPasswordRequest = (token, newPassword) =>
  api.post('/auth/reset-password', { token, newPassword }, { skipAuthRefresh: true });

export default api;