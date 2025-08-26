import axios from 'axios';

// Create a custom axios instance with the base API URL
const API_URL = process.env.REACT_APP_BASE_API_URL || 'http://localhost:5001/api';

// Make sure the API_URL always ends with /api
const normalizedApiUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`.replace(/\/api\/api$/, '/api');

const api = axios.create({
  baseURL: normalizedApiUrl,
  // Do NOT set a global Content-Type; let axios/browser decide per request
  timeout: 15000, // 15 seconds timeout
});

// Add a request interceptor to include authentication token
api.interceptors.request.use(
  async (config) => {
    // Get token from local storage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ensure correct Content-Type handling
    // If the payload is FormData, let the browser set multipart boundaries automatically
    if (config.data instanceof FormData) {
      if (config.headers && 'Content-Type' in config.headers) {
        delete config.headers['Content-Type'];
      }
    } else if (config.data && typeof config.data === 'object') {
      // For JSON payloads, set Content-Type explicitly (axios also does this, but keep it explicit)
      config.headers['Content-Type'] = 'application/json';
    }
    
    // Log the complete URL for debugging
    const fullUrl = `${config.baseURL}${config.url}`.replace(/\/\//g, '/').replace('://', '://');
    console.log(`API Request [${new Date().toISOString()}]: ${config.method.toUpperCase()} ${fullUrl}`);
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        response: {
          data: {
            message: 'Network error. Please check your internet connection.'
          }
        }
      });
    }
    
    // Log specific error details
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized
      localStorage.removeItem('token');
      
      // Check if we're in admin panel and redirect to login
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;