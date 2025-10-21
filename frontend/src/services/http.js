import axios from 'axios';
import sessionStorageManager from './sessionStorageManager';

const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? 'http://localhost:3001/api' : 'http://dacn_backend_dev:3001/api'),
  withCredentials: false, // Changed to false for Docker
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
      
      // Get token from sessionStorage ONLY (tab-specific) - no localStorage fallback
      var token = sessionStorageManager.getToken();
      
      // Get tabId
      var tabId = sessionStorageManager.getTabId();
      
      console.log('HTTP Request:', config.method?.toUpperCase(), config.url, 'Token:', token ? 'Present' : 'Missing', 'TabId:', tabId);
      
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + token;
      }
      
      // Attach tabId to header
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