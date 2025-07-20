// filepath: d:\NodeJs\food-menu-order-managment\admin\src\context\OrderContext.js
import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { AuthContext } from './AuthContext';
import api from '../utils/api';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [orderReports, setOrderReports] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    topSellingItems: [],
    revenueByCategory: [],
    orderStatusDistribution: {},
    revenueTrends: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [countryCode, setCountryCode] = useState('DEFAULT');
  
  const { user } = useContext(AuthContext);
  
  // Add ref flags to track if data has been fetched already
  const initialFetchDone = useRef(false);
  const restaurantsFetchDone = useRef(false);
  const dateFetchStarted = useRef(Date.now());
  
  // Helper function to log API requests for debugging
  const logAPIRequest = (endpoint, query, method = 'GET') => {
    const baseURL = api.defaults.baseURL || '';
    const fullURL = `${baseURL}${endpoint}${query}`;
    console.log(`OrderContext: ${method} request to ${fullURL}`);
    return fullURL;
  };

  // Get all orders with optional filters - prevent excessive fetching
  const getAllOrders = useCallback(async (filters = {}, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      else if (user?.restaurantId) queryParams.append('restaurantId', user.restaurantId);
      
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      else if (user?.branchId) queryParams.append('branchId', user.branchId);
      
      if (filters.orderStatus) queryParams.append('orderStatus', filters.orderStatus);
      if (filters.orderType) queryParams.append('OrderType', filters.orderType); // Backend expects OrderType
      if (filters.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Use different endpoints based on user role and filters
      let endpoint = '/public/orders';
      
      // For Super_Admin with filters, use the specialized endpoint
      if (user?.role === 'Super_Admin' && (filters.restaurantId || filters.branchId || filters.orderStatus || filters.orderType || filters.paymentStatus || filters.startDate || filters.endDate)) {
        endpoint = '/public/orders/all';
      }

      // Log the full URL for debugging
      const apiUrl = logAPIRequest(endpoint, query);
      
      // For regular users, the /public/orders endpoint will automatically filter based on user's permissions
      console.log(`OrderContext: Fetching orders from ${apiUrl}`);
      
      const response = await api.get(`${endpoint}${query}`);
      console.log('OrderContext: Orders response received:', {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        itemCount: Array.isArray(response.data) ? response.data.length : 'N/A',
        hasDataProperty: response.data && typeof response.data === 'object' && 'data' in response.data
      });
      
      // Handle different response formats
      let ordersData;
      if (response.data.data && Array.isArray(response.data.data)) {
        // Standard success response format with data wrapper
        ordersData = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        ordersData = response.data;
      } else {
        // Fallback to empty array
        ordersData = [];
      }
      
      // Update state with the fetched orders
      setOrders(ordersData);
      return { success: true, orders: ordersData };
    } catch (err) {
      console.error('Error fetching orders:', err);
      let errorMsg = 'Failed to fetch orders';
      
      // Enhanced error logging with details
      if (err.response) {
        console.error('Server response error:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Get detailed error message from response if available
        if (err.response.data?.message) {
          errorMsg = `${errorMsg}: ${err.response.data.message}`;
        } else if (typeof err.response.data === 'string') {
          errorMsg = `${errorMsg}: ${err.response.data}`;
        } else if (err.response.status) {
          errorMsg = `${errorMsg} (Status: ${err.response.status})`;
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('Network error - no response received:', err.request);
        errorMsg = 'Network error - failed to reach the server';
      } else {
        // Something else happened while setting up the request
        console.error('Request setup error:', err.message);
        errorMsg = `Request error: ${err.message}`;
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user]); // Remove orders dependency to prevent infinite loop

  // Get order reports with optional filters
  const getOrderReports = useCallback(async (reportType, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`OrderContext: Fetching ${reportType} reports with filters:`, filters);
      
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      else if (user?.restaurantId) queryParams.append('restaurantId', user.restaurantId);
      
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      else if (user?.branchId) queryParams.append('branchId', user.branchId);
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Use real API endpoint based on report type
      let endpoint = '';
      
      switch (reportType) {
        case 'daily':
        case 'weekly':
        case 'monthly':
          endpoint = `/public/orders/reports/${reportType}${query}`;
          break;
        case 'topSellingItems':
          endpoint = `/public/orders/reports/items/top${query}`;
          break;
        case 'revenueByCategory':
          endpoint = `/public/orders/reports/revenue/category${query}`;
          break;
        case 'orderStatusDistribution':
          endpoint = `/public/orders/statistics${query}`;
          break;
        case 'revenueTrends':
          endpoint = `/public/orders/reports/trends${query}`;
          break;
        default:
          endpoint = `/public/orders/reports/${reportType}${query}`;
      }
      
      console.log(`OrderContext: Fetching data from endpoint: ${endpoint}`);
      
      let reportData;
      try {
        // Fetch real data from the API
        const apiResponse = await api.get(endpoint);
        
        if (apiResponse.data && (apiResponse.data.data || Array.isArray(apiResponse.data))) {
          reportData = {
            data: apiResponse.data.data || apiResponse.data
          };
          console.log(`OrderContext: Successfully fetched real data for ${reportType}`, reportData);
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (apiError) {
          console.error(`OrderContext: API call failed for ${reportType}:`, apiError);
          
          // Special handling for specific report types
          if (reportType === 'orderStatusDistribution') {
            // Try to use statistics endpoint for order status data
            try {
              const statsResponse = await api.get('/public/orders/statistics' + query);
              if (statsResponse.data) {
                reportData = processOrderStatisticsForStatusDistribution(statsResponse.data);
                console.log(`OrderContext: Processed order statistics for status distribution:`, reportData);
                return reportData;
              }
            } catch (statsError) {
              console.error(`OrderContext: Statistics endpoint failed too:`, statsError);
              setError(`Failed to fetch order status distribution data: ${statsError.message || 'Unknown error'}`);
              return { success: false, message: `Failed to fetch order status distribution data` };
            }
          }
          
          // Return error information to the UI
          setError(`Failed to fetch ${reportType} report data: ${apiError.message || 'Unknown error'}`);
          return { success: false, message: `Failed to fetch ${reportType} report data` };
      }
      
      // Store the reports in the appropriate state based on type
      console.log(`OrderContext: Setting ${reportType} report data:`, reportData);
      
      setOrderReports(prev => ({
        ...prev,
        [reportType]: reportData
      }));
      
      return { success: true, reports: reportData };
    } catch (err) {
      console.error(`OrderContext: Error fetching ${reportType} reports:`, err);
      const errorMsg = err.response?.data?.message || `Failed to fetch ${reportType} reports`;
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get all order reports in one call
  const getAllReports = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const reports = {};
      const errors = [];
      
      // Fetch all report types with improved error handling
      const reportTypes = ['daily', 'weekly', 'monthly', 'topSellingItems', 'revenueByCategory', 'orderStatusDistribution', 'revenueTrends'];
      
      // Process each report type
      for (const type of reportTypes) {
        try {
          const result = await getOrderReports(type, filters);
          if (result.success) {
            reports[type] = result.reports;
          } else {
            errors.push(`${type}: ${result.message}`);
            reports[type] = { data: [] }; // Empty placeholder for failed reports
          }
        } catch (reportError) {
          console.error(`Error fetching ${type} report:`, reportError);
          errors.push(`${type}: ${reportError.message || 'Unknown error'}`);
          reports[type] = { data: [] }; // Empty placeholder for failed reports
        }
      }
      
      // Update state with all reports (even if some failed)
      setOrderReports(reports);
      
      // Set error if any reports failed
      if (errors.length > 0) {
        const errorMessage = `Some reports failed to load: ${errors.join('; ')}`;
        setError(errorMessage);
        return { success: false, message: errorMessage, partialReports: reports };
      }
      
      return { success: true, reports };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch reports';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getOrderReports]);

  // Generate PDF report for orders
  const generateOrderReport = useCallback(async (reportType, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.orderStatus) queryParams.append('status', filters.orderStatus);
      if (filters.orderType) queryParams.append('type', filters.orderType);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Use the real API endpoint for report generation
      const response = await api.get(`/public/orders/report/${reportType}/download${query}`, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate report';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Export order data to Excel/CSV
  const exportOrderData = useCallback(async (format, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.orderStatus) queryParams.append('status', filters.orderStatus);
      if (filters.orderType) queryParams.append('type', filters.orderType);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // Use the real API endpoint for export
      const response = await api.get(`/public/orders/export/${format}${query}`, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Failed to export to ${format}`;
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get restaurants with country information - prevent excessive fetching
  const getRestaurants = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/restaurants');
      const restaurantsData = response.data;
      
      // Set restaurants and update country code from first restaurant if current user has a restaurantId
      setRestaurants(restaurantsData);
      
      if (user?.restaurantId && restaurantsData.length > 0) {
        const userRestaurant = restaurantsData.find(r => r._id === user.restaurantId);
        if (userRestaurant && userRestaurant.country) {
          setCountryCode(userRestaurant.country);
        }
      }
      
      // Mark that we've completed the restaurants fetch
      restaurantsFetchDone.current = true;
      
      return { success: true, restaurants: restaurantsData };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch restaurants';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user]); // Remove restaurants dependency to prevent infinite loop

  // Get branches for a restaurant
  const getBranchesForRestaurant = useCallback(async (restaurantId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/restaurants/${restaurantId}/branches`);
      const branchesData = response.data;
      setBranches(branchesData);
      
      // If branches have country info, update country code from the first branch
      if (branchesData.length > 0 && branchesData[0].country) {
        setCountryCode(branchesData[0].country);
      } else {
        // If branches don't have country info, try to get it from the restaurant
        const restaurant = restaurants.find(r => r._id === restaurantId);
        if (restaurant && restaurant.country) {
          setCountryCode(restaurant.country);
        }
      }
      
      return { success: true, branches: branchesData };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch branches';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [restaurants]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId, status) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Updating order status:', orderId, 'to:', status);
      
      const response = await api.patch(`/public/orders/${orderId}/status`, { 
        orderStatus: status  // Backend expects 'orderStatus', not 'status'
      });
      
      console.log('Status update response:', response.data);
      
      // Update orders state with the updated order, ensuring orders is an array
      setOrders(prevOrders => {
        if (!Array.isArray(prevOrders)) {
          return [response.data.data || response.data];
        }
        return prevOrders.map(order => 
          order._id === orderId ? (response.data.data || response.data) : order
        );
      });
      
      return { success: true, order: response.data.data || response.data };
    } catch (err) {
      console.error('Error updating order status:', err);
      
      let errorMsg = 'Failed to update order status';
      
      if (err.response) {
        console.error('Server error response:', err.response.status, err.response.data);
        
        if (err.response.status === 404) {
          errorMsg = 'Order not found';
        } else if (err.response.status === 400) {
          errorMsg = err.response.data?.message || 'Invalid status value';
        } else if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.request) {
        errorMsg = 'Network error - please check your connection';
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update payment status
  const updatePaymentStatus = useCallback(async (orderId, paymentStatus) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Updating payment status:', orderId, 'to:', paymentStatus);
      
      const response = await api.patch(`/public/orders/${orderId}/payment-status`, { 
        paymentStatus: paymentStatus
      });
      
      console.log('Payment status update response:', response.data);
      
      // Update orders state with the updated order, ensuring orders is an array
      setOrders(prevOrders => {
        if (!Array.isArray(prevOrders)) {
          return [response.data.data || response.data];
        }
        return prevOrders.map(order => 
          order._id === orderId ? (response.data.data || response.data) : order
        );
      });
      
      return { success: true, order: response.data.data || response.data };
    } catch (err) {
      console.error('Error updating payment status:', err);
      
      let errorMsg = 'Failed to update payment status';
      
      if (err.response) {
        console.error('Server error response:', err.response.status, err.response.data);
        
        if (err.response.status === 404) {
          errorMsg = 'Order not found';
        } else if (err.response.status === 400) {
          errorMsg = err.response.data?.message || 'Invalid payment status value';
        } else if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.request) {
        errorMsg = 'Network error - please check your connection';
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete an order
  const deleteOrder = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Deleting order:', orderId);
      
      await api.delete(`/public/orders/${orderId}`);
      
      console.log('Order deleted successfully');
      
      // Remove the deleted order from state, ensuring orders is an array
      setOrders(prevOrders => {
        if (!Array.isArray(prevOrders)) {
          return [];
        }
        return prevOrders.filter(order => order._id !== orderId);
      });
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting order:', err);
      
      let errorMsg = 'Failed to delete order';
      
      if (err.response) {
        console.error('Server error response:', err.response.status, err.response.data);
        
        if (err.response.status === 404) {
          errorMsg = 'Order not found';
        } else if (err.response.status === 403) {
          errorMsg = 'You do not have permission to delete this order';
        } else if (err.response.data?.message) {
          errorMsg = err.response.data.message;
        }
      } else if (err.request) {
        errorMsg = 'Network error - please check your connection';
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate invoice for an order
  const generateInvoice = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Generating invoice for order:', orderId);
      
      // Check if we have a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await api.get(`/public/orders/${orderId}/invoice`, {
        responseType: 'blob',
        timeout: 30000 // 30 second timeout for PDF generation
      });
      
      console.log('Invoice response received:', response.status, response.headers);
      
      // Check if response is actually a PDF
      const contentType = response.headers['content-type'] || response.headers['Content-Type'];
      console.log('Content-Type:', contentType);
      
      if (contentType && !contentType.includes('application/pdf')) {
        console.error('Unexpected content type:', contentType);
        
        // If it's JSON, try to parse error message
        if (contentType.includes('application/json')) {
          const text = await response.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Server returned error instead of PDF');
          } catch {
            throw new Error('Server returned unexpected response format');
          }
        }
        
        throw new Error('Invalid response format - expected PDF');
      }
      
      // Ensure we have data
      if (!response.data || response.data.size === 0) {
        throw new Error('Empty response received from server');
      }
      
      console.log('PDF size:', response.data.size, 'bytes');
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      console.log('Invoice download initiated successfully');
      return { success: true };
      
    } catch (err) {
      console.error('Invoice generation error:', err);
      
      let errorMsg = 'Failed to generate invoice';
      
      if (err.response) {
        // Server responded with error status
        console.error('Server error response:', err.response.status, err.response.statusText);
        
        if (err.response.status === 404) {
          errorMsg = 'Order not found';
        } else if (err.response.status === 401) {
          errorMsg = 'Authentication required - please log in again';
        } else if (err.response.status === 500) {
          errorMsg = 'Server error while generating invoice';
        } else if (err.response.data) {
          // Try to extract error message from response
          if (typeof err.response.data === 'string') {
            errorMsg = err.response.data;
          } else if (err.response.data.message) {
            errorMsg = err.response.data.message;
          }
        }
      } else if (err.request) {
        // Network error
        console.error('Network error:', err.request);
        errorMsg = 'Network error - please check your connection and try again';
      } else {
        // Other error
        errorMsg = err.message || errorMsg;
      }
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to process order statistics data for status distribution
  const processOrderStatisticsForStatusDistribution = (statsData) => {
    if (!statsData || !statsData.ordersByStatus) return { data: {} };
    
    const statusMap = {};
    let totalOrders = 0;
    
    // Process order status data
    statsData.ordersByStatus.forEach(status => {
      totalOrders += status.count;
      statusMap[status._id] = {
        count: status.count,
        revenue: status.revenue
      };
    });
    
    // Calculate percentages
    Object.keys(statusMap).forEach(status => {
      statusMap[status].percentage = ((statusMap[status].count / totalOrders) * 100).toFixed(2);
    });
    
    return { data: statusMap };
  };

  // Note: Mock data functionality has been removed. 
  // All reports now use real data from the backend API endpoints.

  // Initialize by fetching orders if the context is newly mounted - FIX LOOP ISSUE
  useEffect(() => {
    // Prevent multiple fetches and only fetch on first mount
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true;
      
      console.log('OrderContext: Initial load with user:', { 
        role: user.role,
        restaurantId: user.restaurantId,
        branchId: user.branchId
      });
      
      const initializeData = async () => {
        try {
          // Fetch orders first
          console.log('OrderContext: Fetching initial orders...');
          await getAllOrders({}, true);
          
          // For Super_Admin, also fetch restaurants for filtering
          if (user.role === 'Super_Admin' && !restaurantsFetchDone.current) {
            console.log('OrderContext: Fetching restaurants for Super_Admin...');
            await getRestaurants();
          }
        } catch (error) {
          console.error('OrderContext: Error during data initialization:', error);
        }
      };
      
      initializeData();
    }
  }, [user]); // Remove function dependencies that cause re-fetching
  
  // Real-time order management functions for socket integration
  const addNewOrder = useCallback((newOrder) => {
    console.log('OrderContext: Adding new order via real-time update:', newOrder._id);
    setOrders(prevOrders => {
      // Ensure orders is always an array
      if (!Array.isArray(prevOrders)) {
        return [newOrder];
      }
      
      // Check if order already exists to prevent duplicates
      const exists = prevOrders.some(order => order._id === newOrder._id);
      if (exists) {
        console.log('OrderContext: Order already exists, skipping addition:', newOrder._id);
        return prevOrders;
      }
      
      // Add the new order to the beginning of the array
      return [newOrder, ...prevOrders];
    });
  }, []);

  const updateExistingOrder = useCallback((updatedOrder) => {
    console.log('OrderContext: Updating existing order via real-time update:', updatedOrder._id);
    setOrders(prevOrders => {
      // Ensure orders is always an array
      if (!Array.isArray(prevOrders)) {
        return [updatedOrder];
      }
      
      // Find and update the order
      const orderIndex = prevOrders.findIndex(order => order._id === updatedOrder._id);
      if (orderIndex !== -1) {
        const newOrders = [...prevOrders];
        newOrders[orderIndex] = updatedOrder;
        return newOrders;
      } else {
        // Order doesn't exist, add it
        console.log('OrderContext: Order not found for update, adding as new:', updatedOrder._id);
        return [updatedOrder, ...prevOrders];
      }
    });
  }, []);

  const removeOrder = useCallback((orderId) => {
    console.log('OrderContext: Removing order via real-time update:', orderId);
    setOrders(prevOrders => {
      // Ensure orders is always an array
      if (!Array.isArray(prevOrders)) {
        return [];
      }
      
      return prevOrders.filter(order => order._id !== orderId);
    });
  }, []);

  const updateOrderStatusRealTime = useCallback((orderId, newStatus) => {
    console.log('OrderContext: Updating order status via real-time update:', orderId, newStatus);
    setOrders(prevOrders => {
      // Ensure orders is always an array
      if (!Array.isArray(prevOrders)) {
        return [];
      }
      
      return prevOrders.map(order => {
        if (order._id === orderId) {
          return {
            ...order,
            orderStatus: newStatus,
            status: newStatus // Update both possible status fields
          };
        }
        return order;
      });
    });
  }, []);

  // Export the context value with memoization to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    orders,
    orderReports,
    loading,
    error,
    restaurants,
    branches,
    countryCode,
    getAllOrders,
    getOrderReports,
    getAllReports,
    generateOrderReport,
    exportOrderData,
    getRestaurants,
    getBranchesForRestaurant,
    updateOrderStatus,
    updatePaymentStatus,
    deleteOrder,
    generateInvoice,
    setCountryCode,
    // Real-time update functions
    addNewOrder,
    updateExistingOrder,
    removeOrder,
    updateOrderStatusRealTime
  }), [
    orders,
    orderReports,
    loading,
    error,
    restaurants,
    branches,
    countryCode,
    getAllOrders,
    getOrderReports,
    getAllReports,
    generateOrderReport,
    exportOrderData,
    getRestaurants,
    getBranchesForRestaurant,
    updateOrderStatus,
    updatePaymentStatus,
    deleteOrder,
    generateInvoice,
    addNewOrder,
    updateExistingOrder,
    removeOrder,
    updateOrderStatusRealTime
  ]);

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);

export default OrderProvider;