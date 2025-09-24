// API Client for Food Menu Order Management System
import axios from 'axios';
import {
  mapMenuItemToFrontend,
  mapCategoryToFrontend,
  mapRestaurantToFrontend,
  mapBranchToFrontend,
  mapTableToFrontend
} from './dataMappers';
import { getCachedData, setCachedData } from './cacheHelper';

// API base URL from environment variables or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const PUBLIC_API_PATH = '/api/public';
 
// Configuration options with defaults
const defaultConfig = {
  useCache: true,
  cacheDuration: 15 * 60 * 1000, // 15 minutes
  timeout: 15000, // 15 seconds
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: defaultConfig.timeout,
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add token to request if available - check user object first, then direct token
    let token = null;
    
    // First try to get token from user object (new auth system)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.token) {
          token = user.token;
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
      }
    }
    
    // Fallback to direct token storage (legacy)
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection or server availability.',
        isNetworkError: true,
        originalError: error.message
      });
    }
    
    // Handle API errors based on status code
    switch (error.response?.status) {
      case 400:
        return Promise.reject({
          message: error.response.data.message || 'Bad request. Please check your input.',
          status: 400
        });
      case 401:
        return Promise.reject({
          message: 'Unauthorized. Please log in again.',
          status: 401
        });
      case 403:
        return Promise.reject({
          message: 'Forbidden. You don\'t have permission to access this resource.',
          status: 403
        });
      case 404:
        return Promise.reject({
          message: 'Resource not found. Please check the URL or parameters.',
          status: 404,
          resourceNotFound: true
        });
      case 500:
        return Promise.reject({
          message: 'Internal server error. Please try again later.',
          status: 500
        });
      default:
        return Promise.reject({
          message: error.response.data.message || 'An unexpected error occurred.',
          status: error.response.status
        });
    }
    return Promise.reject(error.response.data);
  }
);

/**
 * Enhanced API request with caching
 * @param {Object} options - Request options
 * @returns {Promise<Object>} - Request response
 */
const makeRequest = async (options) => {
  const { method = 'GET', url, data, params, useCache = defaultConfig.useCache, cacheDuration = defaultConfig.cacheDuration } = options;
  
  // Only cache GET requests
  const canUseCache = useCache && method.toUpperCase() === 'GET';
  
  // Generate cache key based on URL and params
  const cacheKey = canUseCache ? 
    `${url}_${JSON.stringify(params || {})}_${JSON.stringify(data || {})}` : 
    null;
  
  // Try to get from cache first if applicable
  if (canUseCache) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  try {
    // Make the actual request
    const response = await apiClient.request({
      method,
      url,
      data,
      params,
    });
    
    // Store successful GET responses in cache
    if (canUseCache && response.data) {
      setCachedData(cacheKey, response.data, cacheDuration);
    }
    
    return response.data;
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    throw error;
  }
};  // API utility methods
export const api = {
  // Server health check
  health: {
    check: () => makeRequest({ url: '/', method: 'GET' }),
  },
  
  // Restaurant endpoints
  restaurants: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/restaurants', 
        method: 'GET', 
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapRestaurantToFrontend);
        }
        return [];
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/restaurants/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => mapRestaurantToFrontend(data)),
  },
  
  // Branch endpoints
  branches: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/branches', 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapBranchToFrontend);
        }
        return [];
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/branches/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => mapBranchToFrontend(data)),
    
    getByRestaurant: (restaurantId, options = {}) => 
      makeRequest({ 
        url: `/branches/restaurant/${restaurantId}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapBranchToFrontend);
        }
        return [];
      }),
  },
  
  // Table endpoints
  tables: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/tables', 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapTableToFrontend);
        }
        return [];
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/tables/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => mapTableToFrontend(data)),
    
    getByBranch: (branchId, options = {}) => 
      makeRequest({ 
        url: `/tables/branch/${branchId}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapTableToFrontend);
        }
        return [];
      }),
  },
  
  // Menu endpoints
  menus: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/menus', 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/menus/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }),
    
    getByBranch: (branchId, options = {}) => 
      makeRequest({ 
        url: `/menus/branch/${branchId}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }),
  },
  
  // Menu item endpoints
  menuItems: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/menu-items', 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapMenuItemToFrontend);
        }
        return [];
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/menu-items/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => mapMenuItemToFrontend(data)),
    
    getByMenu: (menuId, options = {}) => 
      makeRequest({ 
        url: `/menu-items/menu/${menuId}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapMenuItemToFrontend);
        }
        return [];
      }),
    
    getByCategory: (categoryId, options = {}) => 
      makeRequest({ 
        url: `/menu-items/category/${categoryId}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapMenuItemToFrontend);
        }
        return [];
      }),
  },
  
  // Category endpoints
  categories: {
    getAll: (options = {}) => 
      makeRequest({ 
        url: '/categories', 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => {
        if (Array.isArray(data)) {
          return data.map(mapCategoryToFrontend);
        }
        return [];
      }),
    
    getById: (id, options = {}) => 
      makeRequest({ 
        url: `/categories/${id}`, 
        method: 'GET',
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }).then(data => mapCategoryToFrontend(data)),
  },
  
  // Payments endpoints (public)
  payments: {
    cashfree: {
      createOrder: async ({ amount, currency = 'INR', customer = {}, orderMeta = {} }) => {
        try {
          const response = await apiClient.post(`${PUBLIC_API_PATH}/payments/cashfree/order`, {
            amount,
            currency,
            customer,
            orderMeta
          });
          return response.data;
        } catch (error) {
          console.error('[API CLIENT] Cashfree create order error:', error);
          throw error;
        }
      },
      getOrder: async (cfOrderId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/payments/cashfree/order/${cfOrderId}`);
          return response.data;
        } catch (error) {
          console.error('[API CLIENT] Cashfree get order error:', error);
          throw error;
        }
      },
      getPayments: async (cfOrderId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/payments/cashfree/order/${cfOrderId}/payments`);
          return response.data;
        } catch (error) {
          console.error('[API CLIENT] Cashfree get payments error:', error);
          throw error;
        }
      }
    }
  },
  
  // Order endpoints
  orders: {
    create: (orderData) => 
      makeRequest({ 
        url: '/orders', 
        method: 'POST', 
        data: orderData,
        useCache: false
      }),
    
    getById: (id) => 
      makeRequest({ 
        url: `/orders/${id}`, 
        method: 'GET',
        useCache: false // Orders should never be cached
      }),
    
    updateStatus: (id, status) => 
      makeRequest({ 
        url: `/orders/${id}/status`, 
        method: 'PATCH', 
        data: { status },
        useCache: false
      }),
    
    getByTable: (tableId) => 
      makeRequest({ 
        url: `/orders/table/${tableId}`, 
        method: 'GET',
        useCache: false
      }),
  },
  
  // Custom API requests
  custom: {
    get: (endpoint, params, options = {}) => 
      makeRequest({ 
        url: endpoint, 
        method: 'GET', 
        params,
        useCache: options.useCache,
        cacheDuration: options.cacheDuration
      }),
    
    post: (endpoint, data) => 
      makeRequest({ 
        url: endpoint, 
        method: 'POST', 
        data,
        useCache: false
      }),
    
    put: (endpoint, data) => 
      makeRequest({ 
        url: endpoint, 
        method: 'PUT', 
        data,
        useCache: false
      }),
    
    patch: (endpoint, data) => 
      makeRequest({ 
        url: endpoint, 
        method: 'PATCH', 
        data,
        useCache: false
      }),
    
    delete: (endpoint) => 
      makeRequest({ 
        url: endpoint, 
        method: 'DELETE',
        useCache: false
      }),
  },
    // Test-only method to update base URL
  _updateBaseUrl: (newBaseUrl) => {
    if (newBaseUrl && typeof newBaseUrl === 'string') {
      
      apiClient.defaults.baseURL = newBaseUrl;
      return true;
    }
    return false;
  },
      // Public API endpoints (don't require authentication)
  public: {
    // Health check for the public API
    health: async () => {
      try {
        const response = await apiClient.get(`${PUBLIC_API_PATH}/health`);
        return response.data;
      } catch (error) {
        console.error('Error checking public API health:', error);
        throw error;
      }
    },
      // Tax APIs
    taxes: {
      // Get tax information by country code
      getByCountry: async (countryCode) => {
        // Fetching tax info
        try {
          const result = await makeRequest({
            url: `${PUBLIC_API_PATH}/taxes/${countryCode}`,
            method: 'GET',
            useCache: false // Don't cache for debugging
          });
          console.log(`Tax API Client: Successfully retrieved tax data for ${countryCode}`);
          return result;
        } catch (error) {
          console.error(`Tax API Client: Error fetching tax information for ${countryCode}:`, error);
          
          // Provide more detailed error for debugging
          if (error.isNetworkError) {
            throw new Error(`Network error while fetching tax data for ${countryCode}: ${error.originalError}`);
          } else if (error.resourceNotFound) {
            throw new Error(`Tax data for country ${countryCode} not found`);
          } else if (error.status) {
            throw new Error(`Tax API error (${error.status}): ${error.message}`);
          }
          
          throw error;
        }
      }
    },
    
    // Restaurant and Branch APIs
    branches: {
      // Get all branches for a restaurant
      getByRestaurant: async (restaurantId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/branches/restaurant/${restaurantId}`);
          return response.data.map(mapBranchToFrontend);
        } catch (error) {
          console.error('Error fetching branches:', error);
          throw error;
        }
      },
        // Get branch details
      getById: async (branchId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/branches/${branchId}`); 
          
          // Extract and map the restaurant data separately
          const branchData = { ...mapBranchToFrontend(response.data) };
          
          // Handle restaurant data if it exists
          if (response.data.restaurant && typeof response.data.restaurant === 'object') {
            branchData.restaurant = mapRestaurantToFrontend(response.data.restaurant); 
          } else {
            console.warn('Missing or invalid restaurant data in branch response:', response.data.restaurant);
            branchData.restaurant = null;
          }
          
          return branchData;
        } catch (error) {
          console.error('Error fetching branch details:', error);
          throw error;
        }
      },
      
      // Find nearby branches
      findNearby: async (latitude, longitude, radius = 10) => {
        try {
          const response = await apiClient.get(
            `${PUBLIC_API_PATH}/branches/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
          );
          return response.data.map(branch => ({
            ...mapBranchToFrontend(branch),
            restaurant: mapRestaurantToFrontend(branch.restaurant)
          }));
        } catch (error) {
          console.error('Error finding nearby branches:', error);
          throw error;
        }
      }
    },
    
    // Menu APIs
    menus: {      // Get all menu categories for a branch
      getCategories: async (branchId) => {
        try {
          
          const cacheKey = `categories_${branchId}`;
          
          // First try to get from cache
          const cachedData = defaultConfig.useCache ? getCachedData(cacheKey) : null;
          if (cachedData) { 
            return cachedData;
          }
          
          const response = await apiClient.get(`${PUBLIC_API_PATH}/menus/branch/${branchId}/categories`); 
          
          // Check if we actually got categories data
          if (!response.data || response.data.length === 0) {
            console.warn(`No categories found for branch ${branchId}. Using fallback categories.`);
            // Create fallback categories
            const fallbackCategories = [
              { _id: 'all', name: 'All', image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png' },
              { _id: 'popular', name: 'Popular', image: 'https://cdn-icons-png.flaticon.com/512/2636/2636863.png' },
              { _id: 'main', name: 'Main Course', image: 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png' },
              { _id: 'sides', name: 'Sides', image: 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png' },
              { _id: 'drinks', name: 'Drinks', image: 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png' }
            ];
            return fallbackCategories.map(mapCategoryToFrontend);
          }
          
          const mappedCategories = response.data.map(mapCategoryToFrontend); 
          
          // Store in cache
          if (defaultConfig.useCache) {
            setCachedData(cacheKey, mappedCategories, defaultConfig.cacheDuration);
          }
          
          return mappedCategories;
        } catch (error) {
          console.error('Error fetching categories:', error);
          // Return default categories on error instead of throwing to keep the app working
          const defaultCategories = [
            { _id: 'all', name: 'All', image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png' }
          ];
          return defaultCategories.map(mapCategoryToFrontend);
        }
      },
        // Get all menu items for a branch
      getByBranch: async (branchId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/menus/branch/${branchId}`);
          
          // Debug: Check for sizeVariants in the raw response data
          const itemsWithSizeVariants = response.data.filter(
            item => item.sizeVariants && item.sizeVariants.length > 0
          );
          
          if (itemsWithSizeVariants.length > 0) {
            console.log(`Found ${itemsWithSizeVariants.length} items with sizeVariants in API response`);
            console.log('Example item with sizeVariants:', itemsWithSizeVariants[0]);
          }
          
          // Map the items to frontend format
          const mappedItems = response.data.map(mapMenuItemToFrontend);
          
          // Debug: Check if sizeVariants were preserved after mapping
          const mappedItemsWithSizeVariants = mappedItems.filter(
            item => item.sizeVariants && item.sizeVariants.length > 0
          );
          
          if (mappedItemsWithSizeVariants.length > 0) {
            console.log(`Found ${mappedItemsWithSizeVariants.length} items with sizeVariants after mapping`);
          } else if (itemsWithSizeVariants.length > 0) {
            console.log('WARNING: sizeVariants were lost during mapping!');
          }
          
          return mappedItems;
        } catch (error) {
          console.error('Error fetching menu items:', error);
          throw error;
        }
      },
      
      // Get menu items by category
      getByCategory: async (branchId, categoryId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/menus/branch/${branchId}/category/${categoryId}`);
          return response.data.map(mapMenuItemToFrontend);
        } catch (error) {
          console.error('Error fetching category menu items:', error);
          throw error;
        }
      },
      
      // Get menu item details
      getById: async (itemId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/menus/item/${itemId}`);
          return mapMenuItemToFrontend(response.data);
        } catch (error) {
          console.error('Error fetching menu item details:', error);
          throw error;
        }
      },
      
      // Search menu items
      search: async (branchId, query) => {
        try {
          const response = await apiClient.get(
            `${PUBLIC_API_PATH}/menus/search?branchId=${branchId}&query=${encodeURIComponent(query)}`
          );
          return response.data.map(mapMenuItemToFrontend);
        } catch (error) {
          console.error('Error searching menu items:', error);
          throw error;
        }
      }
    },
    // Payments (public)
    payments: {
      cashfree: {
        createOrder: async ({ amount, currency = 'INR', customer = {}, orderMeta = {} }) => {
          try {
            const response = await apiClient.post(`${PUBLIC_API_PATH}/payments/cashfree/order`, {
              amount,
              currency,
              customer,
              orderMeta
            });
            return response.data;
          } catch (error) {
            console.error('[API CLIENT] (public) Cashfree create order error:', error);
            throw error;
          }
        },
        getOrder: async (cfOrderId) => {
          try {
            const response = await apiClient.get(`${PUBLIC_API_PATH}/payments/cashfree/order/${cfOrderId}`);
            return response.data;
          } catch (error) {
            console.error('[API CLIENT] (public) Cashfree get order error:', error);
            throw error;
          }
        },
        getPayments: async (cfOrderId) => {
          try {
            const response = await apiClient.get(`${PUBLIC_API_PATH}/payments/cashfree/order/${cfOrderId}/payments`);
            return response.data;
          } catch (error) {
            console.error('[API CLIENT] (public) Cashfree get payments error:', error);
            throw error;
          }
        }
      }
    },
      // Table APIs
    tables: {
      // Get all tables with optional filtering
      getAll: async (filters = {}) => {
        try {
          // Build query string from filters
          const queryParams = new URLSearchParams();
          if (filters.branchId) queryParams.append('branchId', filters.branchId);
          if (filters.floorId) queryParams.append('floorId', filters.floorId);
          if (filters.zone) queryParams.append('zone', filters.zone);
          if (filters.status) queryParams.append('status', filters.status);
          if (filters.isVIP !== undefined) queryParams.append('isVIP', filters.isVIP);
          
          const queryString = queryParams.toString();
          const url = `${PUBLIC_API_PATH}/tables${queryString ? `?${queryString}` : ''}`;
          
          const response = await apiClient.get(url);
          return response.data.map(mapTableToFrontend);
        } catch (error) {
          console.error('Error fetching tables with filters:', error);
          throw error;
        }
      },
      
      // Get all tables for a branch (shorthand method)
      getByBranch: async (branchId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/tables/branch/${branchId}`);
          return response.data.map(mapTableToFrontend);
        } catch (error) {
          console.error('Error fetching branch tables:', error);
          throw error;
        }
      },
      
      // Get a specific table
      getById: async (tableId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/tables/${tableId}`);
          return mapTableToFrontend(response.data);
        } catch (error) {
          console.error('Error fetching table details:', error);
          throw error;
        }
      }    },
    
    // Order APIs
    orders: {
      // Create a new order
      create: async (orderData) => {
        try {
          console.log('[API CLIENT] Creating order with data:', JSON.stringify(orderData, null, 2));
          console.log('[API CLIENT] POST URL:', `${PUBLIC_API_PATH}/orders`);
          
          const response = await apiClient.post(`${PUBLIC_API_PATH}/orders`, orderData);
          console.log('[API CLIENT] Order creation successful:', response.data);
          return response.data;
        } catch (error) {
          console.error('[API CLIENT] Error creating order:', error);
          console.error('[API CLIENT] Error response:', error.response?.data);
          console.error('[API CLIENT] Error status:', error.response?.status);
          console.error('[API CLIENT] Error message:', error.message);
          throw error;
        }
      },

      // Check if register is open for a branch
      getRegisterStatus: async (branchId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/orders/register-status`, { params: { branchId } });
          return response.data;
        } catch (error) {
          console.error('Error fetching register status:', error);
          // Treat unknown as closed to keep UX safe
          return { open: false };
        }
      },
      
      // Get order details
      getById: async (orderId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/orders/${orderId}`);
          return response.data;
        } catch (error) {
          console.error('Error fetching order details:', error);
          throw error;
        }
      },
      
      // Get orders for a table
      getByTable: async (tableId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/orders/table/${tableId}`);
          return response.data;
        } catch (error) {
          console.error('Error fetching table orders:', error);
          throw error;
        }
      },
      
      // Get orders for a customer by identifier (phone or email)
      getByCustomerIdentifier: async (identifier) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/orders/customer-orders/${identifier}`);
          return response.data;
        } catch (error) {
          console.error('Error fetching customer orders by identifier:', error);
          throw error;
        }
      },

      // Get orders for a customer by phone number (legacy, kept for backward compatibility)
      getByCustomerPhone: async (phoneNumber) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/orders/customer/${phoneNumber}`);
          return response.data;
        } catch (error) {
          console.error('Error fetching customer orders:', error);
          throw error;
        }
      }
    },

    // Favorites APIs
    favorites: {
      // Get customer's favorites
      getFavorites: async (identifier) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/favorites/${identifier}`);
          return response.data;
        } catch (error) {
          console.error('Error fetching favorites:', error);
          throw error;
        }
      },

      // Check if a product is favorite
      isFavorite: async (identifier, productId) => {
        try {
          const response = await apiClient.get(`${PUBLIC_API_PATH}/favorites/${identifier}/${productId}`);
          return response.data;
        } catch (error) {
          console.error('Error checking favorite status:', error);
          throw error;
        }
      },

      // Add product to favorites
      addToFavorites: async (identifier, productId) => {
        try {
          const response = await apiClient.post(`${PUBLIC_API_PATH}/favorites/${identifier}`, {
            productId: productId
          });
          return response.data;
        } catch (error) {
          console.error('Error adding to favorites:', error);
          throw error;
        }
      },

      // Remove product from favorites
      removeFromFavorites: async (identifier, productId) => {
        try {
          const response = await apiClient.delete(`${PUBLIC_API_PATH}/favorites/${identifier}/${productId}`);
          return response.data;
        } catch (error) {
          console.error('Error removing from favorites:', error);
          throw error;
        }
      }
    }
  }
};

export default api;
