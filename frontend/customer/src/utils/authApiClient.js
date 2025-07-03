import axios from 'axios';

// API base URL from environment variables or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add token to request if available from local storage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Clear user data and redirect to login
      localStorage.removeItem('user');
      // You can add additional logic here if needed
    }
    return Promise.reject(error);
  }
);

export { api };
