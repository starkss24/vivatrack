import axios from 'axios';

// Dev: talk to the API directly (VITE_API_URL). Production: always same-origin ('' => /api, /socket.io);
// the host (client/vercel.json) proxies those paths to the backend. That makes the auth cookie
// first-party, so it isn't dropped by Safari / Firefox / incognito "block third-party cookies".
export const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const http = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true, timeout: 20000 });

// Let the AuthContext know when a session has expired.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
http.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/')) onUnauthorized?.();
    return Promise.reject(err);
  }
);

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check your connection.';
  return fallback;
}

// Maps server zod details [{field, message}] to { field: message } for inline display.
export function fieldErrors(err) {
  const out = {};
  const details = err?.response?.data?.error?.details;
  if (Array.isArray(details)) for (const d of details) if (d.field && !out[d.field]) out[d.field] = d.message;
  return out;
}
