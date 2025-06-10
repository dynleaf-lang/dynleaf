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

  // Debug counter
  const fetchCounter = useRef({
    getAllOrders: 0,
    getRestaurants: 0
  });
  
  // Get all orders with optional filters - prevent excessive fetching
  const getAllOrders = useCallback(async (filters = {}, forceRefresh = false) => {
    // If we've already fetched orders and this isn't a forced refresh, return cached data
    if (orders.length > 0 && !forceRefresh && !filters.restaurantId && !filters.branchId) {
      return { success: true, orders };
    }
    
    // Track fetch count
    fetchCounter.current.getAllOrders++;
    console.log(`[FETCH] getAllOrders called ${fetchCounter.current.getAllOrders} times`);

    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      else if (user?.restaurantId) queryParams.append('restaurantId', user.restaurantId);
      
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      else if (user?.branchId) queryParams.append('branchId', user.branchId);
      
      if (filters.orderStatus) queryParams.append('status', filters.orderStatus);
      if (filters.orderType) queryParams.append('type', filters.orderType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await api.get(`/orders${query}`);
      
      // Ensure response.data is an array before setting it
      const ordersData = Array.isArray(response.data) ? response.data : [];
      
      // Update state with the fetched orders
      setOrders(ordersData);
      return { success: true, orders: ordersData };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch orders';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [user, orders]);

  // Get order reports with optional filters
  const getOrderReports = useCallback(async (reportType, filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) queryParams.append('restaurantId', filters.restaurantId);
      else if (user?.restaurantId) queryParams.append('restaurantId', user.restaurantId);
      
      if (filters.branchId) queryParams.append('branchId', filters.branchId);
      else if (user?.branchId) queryParams.append('branchId', user.branchId);
      
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      // For demo purposes, we'll simulate API responses
      // In a real implementation, replace with actual API calls
      const response = await api.get(`/orders/reports/${reportType}${query}`).catch(() => {
        // Fallback for demo if endpoint doesn't exist
        return mockReportData(reportType);
      });
      
      // Store the reports in the appropriate state based on type
      const reportData = response.data || [];
      
      setOrderReports(prev => ({
        ...prev,
        [reportType]: reportData
      }));
      
      return { success: true, reports: reportData };
    } catch (err) {
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
      // In production, use an actual API endpoint for reports
      const reports = {};
      
      // Fetch all report types
      reports.daily = await getOrderReports('daily', filters).then(res => res.reports);
      reports.weekly = await getOrderReports('weekly', filters).then(res => res.reports);
      reports.monthly = await getOrderReports('monthly', filters).then(res => res.reports);
      reports.topSellingItems = await getOrderReports('topSellingItems', filters).then(res => res.reports);
      reports.revenueByCategory = await getOrderReports('revenueByCategory', filters).then(res => res.reports);
      reports.orderStatusDistribution = await getOrderReports('orderStatusDistribution', filters).then(res => res.reports);
      reports.revenueTrends = await getOrderReports('revenueTrends', filters).then(res => res.reports);
      
      setOrderReports(reports);
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
      
      // For production, use an actual API endpoint for report generation
      const response = await api.get(`/orders/report/${reportType}/download${query}`, {
        responseType: 'blob'
      }).catch(() => {
        // Mock the response for demo purposes
        const mockBlob = new Blob(['Order report data'], { type: 'application/pdf' });
        return { data: mockBlob };
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
      
      // For production, use an actual API endpoint for export
      const response = await api.get(`/orders/export/${format}${query}`, {
        responseType: 'blob'
      }).catch(() => {
        // Mock the response for demo purposes
        const mockBlob = new Blob(['Order export data'], { type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel' });
        return { data: mockBlob };
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
    // If we've already fetched restaurants and this isn't a forced refresh, return cached data
    if (restaurants.length > 0 && !forceRefresh) {
      return { success: true, restaurants };
    }
    
    // Track fetch count
    fetchCounter.current.getRestaurants++;
    console.log(`[FETCH] getRestaurants called ${fetchCounter.current.getRestaurants} times`);
    
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
  }, [user, restaurants]);

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
      const response = await api.put(`/orders/${orderId}/status`, { status });
      
      // Update orders state with the updated order, ensuring orders is an array
      setOrders(prevOrders => {
        if (!Array.isArray(prevOrders)) {
          return [response.data];
        }
        return prevOrders.map(order => order._id === orderId ? response.data : order);
      });
      
      return { success: true, order: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update order status';
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
      await api.delete(`/orders/${orderId}`);
      
      // Remove the deleted order from state, ensuring orders is an array
      setOrders(prevOrders => {
        if (!Array.isArray(prevOrders)) {
          return [];
        }
        return prevOrders.filter(order => order._id !== orderId);
      });
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete order';
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
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate invoice';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock report data for demo purposes
  const mockReportData = (reportType) => {
    const today = new Date();
    const mockData = {};
    
    switch(reportType) {
      case 'daily':
        mockData.data = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - i).toISOString().split('T')[0],
          orderCount: Math.floor(Math.random() * 50) + 10,
          revenue: (Math.random() * 2000 + 500).toFixed(2)
        }));
        break;
        
      case 'weekly':
        mockData.data = Array.from({ length: 4 }, (_, i) => ({
          week: `Week ${i+1}`,
          orderCount: Math.floor(Math.random() * 200) + 50,
          revenue: (Math.random() * 10000 + 2000).toFixed(2)
        }));
        break;
        
      case 'monthly':
        mockData.data = Array.from({ length: 12 }, (_, i) => {
          const month = new Date(today.getFullYear(), i, 1);
          return {
            month: month.toLocaleString('default', { month: 'long' }),
            orderCount: Math.floor(Math.random() * 500) + 100,
            revenue: (Math.random() * 30000 + 5000).toFixed(2)
          };
        });
        break;
        
      case 'topSellingItems':
        mockData.data = [
          { name: 'Burger', quantity: Math.floor(Math.random() * 100) + 50, revenue: (Math.random() * 2000 + 500).toFixed(2) },
          { name: 'Pizza', quantity: Math.floor(Math.random() * 100) + 30, revenue: (Math.random() * 1500 + 400).toFixed(2) },
          { name: 'Pasta', quantity: Math.floor(Math.random() * 80) + 20, revenue: (Math.random() * 1200 + 300).toFixed(2) },
          { name: 'Salad', quantity: Math.floor(Math.random() * 60) + 15, revenue: (Math.random() * 800 + 200).toFixed(2) },
          { name: 'Sandwich', quantity: Math.floor(Math.random() * 50) + 10, revenue: (Math.random() * 600 + 150).toFixed(2) }
        ];
        break;
        
      case 'revenueByCategory':
        mockData.data = [
          { name: 'Main Course', revenue: (Math.random() * 20000 + 5000).toFixed(2) },
          { name: 'Appetizers', revenue: (Math.random() * 10000 + 2000).toFixed(2) },
          { name: 'Desserts', revenue: (Math.random() * 8000 + 1000).toFixed(2) },
          { name: 'Beverages', revenue: (Math.random() * 5000 + 1000).toFixed(2) },
          { name: 'Sides', revenue: (Math.random() * 3000 + 500).toFixed(2) }
        ];
        break;
        
      case 'orderStatusDistribution':
        const pendingCount = Math.floor(Math.random() * 100) + 10;
        const processingCount = Math.floor(Math.random() * 80) + 20;
        const completedCount = Math.floor(Math.random() * 200) + 50;
        const cancelledCount = Math.floor(Math.random() * 30) + 5;
        const total = pendingCount + processingCount + completedCount + cancelledCount;
        
        mockData.data = {
          Pending: { count: pendingCount, percentage: (pendingCount / total * 100).toFixed(2) },
          Processing: { count: processingCount, percentage: (processingCount / total * 100).toFixed(2) },
          Completed: { count: completedCount, percentage: (completedCount / total * 100).toFixed(2) },
          Cancelled: { count: cancelledCount, percentage: (cancelledCount / total * 100).toFixed(2) }
        };
        break;
        
      case 'revenueTrends':
        mockData.data = Array.from({ length: 12 }, (_, i) => {
          const month = new Date(today.getFullYear(), i, 1);
          return {
            month: month.toLocaleString('default', { month: 'long' }),
            dineIn: (Math.random() * 10000 + 2000).toFixed(2),
            takeout: (Math.random() * 8000 + 1000).toFixed(2),
            delivery: (Math.random() * 12000 + 3000).toFixed(2)
          };
        });
        break;
        
      default:
        mockData.data = [];
    }
    
    return mockData;
  };

  // Initialize by fetching orders if the context is newly mounted - FIX LOOP ISSUE
  useEffect(() => {
    // Prevent multiple fetches and only fetch on first mount
    if (user && !initialFetchDone.current) {
      console.log('[INIT] Initial OrderContext fetch started');
      initialFetchDone.current = true;
      
      const initializeData = async () => {
        // Fetch orders first
        await getAllOrders({});
        
        // For Super_Admin, also fetch restaurants for filtering
        if (user.role === 'Super_Admin' && !restaurantsFetchDone.current) {
          await getRestaurants();
        }
      };
      
      initializeData();
    }
  }, [user]); // Remove function dependencies that cause re-fetching
  
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
    deleteOrder,
    generateInvoice,
    setCountryCode
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
    deleteOrder,
    generateInvoice
  ]);

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);

export default OrderProvider;