import axios from 'axios';
import sessionStorageManager from './sessionStorageManager';

// Compute a safe default baseURL that works in production behind Nginx
function computeBaseURL() {
  // 1) Highest priority: explicit env
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;

  // 2) In browser, follow current origin and hit /api (Nginx proxy)
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin.replace(/\/$/, '');
    return origin + '/api';
  }

  // 3) Fallbacks for docker/dev environments (node context)
  return 'http://dacn_backend_dev:3001/api';
}

const http = axios.create({
  baseURL: computeBaseURL(),
  withCredentials: false, // false for Docker; cookies not used currently
});

// Attach Authorization header, TabId, and normalize URLs
http.interceptors.request.use(
  function attachAuth(config) {
    try {
      const base = String(http.defaults.baseURL || '').replace(/\/+$/, '');
      if (typeof config.url === 'string' && base.endsWith('/api')) {
        if (config.url === '/api') {
          config.url = '/';
        } else if (config.url.startsWith('/api/')) {
          config.url = config.url.slice(4);
        }
      }
      
      // Get token from tab-scoped session storage
      var token = sessionStorageManager.getToken();
      // Get tabId
      var tabId = sessionStorageManager.getTabId();
      
      console.log('HTTP Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing', 'TabId:', tabId);
      
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + token;
      }
      
      // Attach tabId to header for multi-tab session awareness
      if (tabId) {
        config.headers = config.headers || {};
        config.headers['X-Tab-Id'] = tabId;
      }
    } catch (_) {}
    return config;
  },
  function onReqError(error) {
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default http;