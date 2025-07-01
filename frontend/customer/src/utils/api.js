// Redirects to apiClient for consistent API usage
import { api as realApi } from './apiClient';
import authService from './auth';

// Export the real API client to ensure consistent implementation
export const api = realApi;

// Health check is provided for backward compatibility
if (!api.health) {
  api.health = {
    check: async () => {
      try {
        const response = await fetch(`${realApi.baseURL}/api/health`);
        if (response.ok) {
          return { status: 'ok', online: true };
        }
        return { status: 'error', online: false };
      } catch (error) {
        console.error('Health check failed:', error);
        return { status: 'error', online: false, error: error.message };
      }
    }
  };
}

// If you want to use mock endpoints, uncomment and use the following instead of the export above:
// export const api = {
//   ...realApi,
//   // Restaurant endpoints
//   restaurants: { ... },
//   // Branch endpoints
//   branches: { ... },
//   // Table endpoints
//   tables: { ... },
//   // Menu endpoints
//   menus: { ... },
//   // Category endpoints
//   categories: { ... },
//   // Order endpoints
//   orders: { ... }
// };

// Helper function to log errors and simulate API responses
const handleApiError = async (error) => {
  console.error('API Error:', error);
  throw new Error(error.message || 'An unknown error occurred');
};

export default api;