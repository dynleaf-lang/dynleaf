import { dummyData, mockOrders, mockOrderUtils } from '../data/dummyData';
import authService from './auth';

// Mock API implementation using dummy data
export const api = {
  // Server health check
  health: {
    check: async () => {
      // Always return success in offline mode
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return { status: 'ok', online: true };
    }
  },
  
  // Restaurant endpoints
  restaurants: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return [dummyData.restaurant];
    },
    getById: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.restaurant;
    },
    getQrData: async (restaurantId, branchId, tableId) => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      return {
        restaurant: dummyData.restaurant,
        branch: dummyData.branch,
        table: dummyData.table,
        menuItems: dummyData.menuItems,
        categories: dummyData.categories
      };
    }
  },
  
  // Branch endpoints
  branches: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return [dummyData.branch];
    },
    getById: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.branch;
    },
    getByRestaurant: async (restaurantId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return [dummyData.branch];
    }
  },
  
  // Table endpoints
  tables: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return [dummyData.table];
    },
    getById: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.table;
    },
    getByBranch: async (branchId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return [dummyData.table];
    }
  },
  
  // Menu endpoints
  menus: {
    getAll: async (filters = {}) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.menuItems;
    },
    getById: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.menuItems.find(item => item.id === id) || null;
    },
    getByRestaurant: async (restaurantId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.menuItems;
    },
    getByRestaurantAndBranch: async (restaurantId, branchId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.menuItems;
    },
    getByCategory: async (categoryId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      if (categoryId === 'all') {
        return dummyData.menuItems;
      }
      return dummyData.menuItems.filter(item => item.categoryId === categoryId);
    }
  },
  
  // Category endpoints
  categories: {
    getAll: async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.categories;
    },
    getById: async (id) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.categories.find(cat => cat.id === id) || null;
    },
    getByRestaurant: async (restaurantId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return dummyData.categories;
    }
  },
  
  // Order endpoints
  orders: {
    create: async (orderData) => {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
      return mockOrderUtils.addOrder(orderData);
    },
    getByTable: async (tableId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return mockOrders.filter(order => order.tableId === tableId);
    },
    getById: async (orderId) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return mockOrderUtils.getOrderById(orderId);
    },
    updateStatus: async (orderId, status) => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      return mockOrderUtils.updateOrderStatus(orderId, status);
    }
  }
};

// Helper function to log errors and simulate API responses
const handleApiError = async (error) => {
  console.error('API Error:', error);
  throw new Error(error.message || 'An unknown error occurred');
};

export default api;