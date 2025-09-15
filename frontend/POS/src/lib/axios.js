// Centralized axios instance and defaults for POS
// Non-breaking: sets global defaults and exports a configured instance
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

// Set a base URL for all axios requests (ignored if absolute URL is used)
axios.defaults.baseURL = getApiBase();

// Attach Authorization header from localStorage if present
const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Normalize errors to a consistent shape
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message || 'Request failed',
      details: error.response?.data || null,
      url: error.config?.url,
      method: error.config?.method,
    };
    // Preserve original error but attach normalized for consumers if needed
    error.normalized = normalized;
    return Promise.reject(error);
  }
);

// Export the axios instance for optional direct use
export const api = axios;

export default api;
