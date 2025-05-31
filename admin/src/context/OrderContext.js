// filepath: d:\NodeJs\food-menu-order-managment\admin\src\context\OrderContext.js
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [branches, setBranches] = useState([]);
  const { token, user } = useContext(AuthContext);
  
  // Get all orders for the current user's restaurant/branch with filtering
  const getAllOrders = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // For Super_Admin with no filters, get all orders
      if (user.role === 'Super_Admin' && !filters.restaurantId && !filters.branchId) {
        response = await axios.get('/api/orders/all', {
          headers: { Authorization: `Bearer ${token}` },
          params: filters // Pass any additional filters like status, date range, etc.
        });
      }
      // For Super_Admin with filters, get filtered orders
      else if (user.role === 'Super_Admin' && (filters.restaurantId || filters.branchId)) {
        response = await axios.get('/api/orders/all', {
          headers: { Authorization: `Bearer ${token}` },
          params: filters
        });
      } 
      // For branch-specific users, get only their branch orders
      else if (user.branchId) {
        response = await axios.get(`/api/orders/branch/${user.branchId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: filters // Additional filters
        });
      }
      // Handle case where user has no branch assigned but has restaurant
      else if (user.restaurantId) {
        response = await axios.get(`/api/orders/restaurant/${user.restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: filters
        });
      } else {
        throw new Error('No restaurant or branch assigned to current user');
      }
      
      setOrders(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to fetch orders');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // Get order details by ID
  const getOrderById = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (err) {
      console.error(`Error fetching order with ID ${orderId}:`, err);
      setError(err.response?.data?.message || 'Failed to fetch order details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Create a new order
  const createOrder = useCallback(async (orderData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/orders', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the orders list with the new order
      setOrders(prevOrders => [...prevOrders, response.data]);
      
      return response.data;
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Update an existing order
  const updateOrder = useCallback(async (orderId, orderData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`/api/orders/${orderId}`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the orders list with the updated order
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? response.data : order
        )
      );
      
      return response.data;
    } catch (err) {
      console.error(`Error updating order with ID ${orderId}:`, err);
      setError(err.response?.data?.message || 'Failed to update order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId, status) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`/api/orders/${orderId}/status`, { orderStatus: status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the orders list with the updated status
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, orderStatus: status } : order
        )
      );
      
      return response.data;
    } catch (err) {
      console.error(`Error updating order status for ID ${orderId}:`, err);
      setError(err.response?.data?.message || 'Failed to update order status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Delete an order
  const deleteOrder = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the deleted order from the list
      setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
      
      return true;
    } catch (err) {
      console.error(`Error deleting order with ID ${orderId}:`, err);
      setError(err.response?.data?.message || 'Failed to delete order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Get all restaurants (for Super_Admin filtering)
  const getRestaurants = useCallback(async () => {
    if (user?.role !== 'Super_Admin') return;
    
    try {
      const response = await axios.get('/api/restaurants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRestaurants(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      return [];
    }
  }, [token, user]);

  // Get branches for a restaurant (for Super_Admin filtering)
  const getBranchesForRestaurant = useCallback(async (restaurantId) => {
    if (!restaurantId) return [];
    
    try {
      const response = await axios.get(`/api/branches/restaurant/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
      return [];
    }
  }, [token]);

  // Get order statistics
  const getOrderStatistics = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/orders/statistics', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      return response.data;
    } catch (err) {
      console.error('Error fetching order statistics:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Generate order invoice
  const generateInvoice = useCallback(async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create a download link for the PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError('Failed to generate invoice');
      throw err;
    }
  }, [token]);

  // Initialize by fetching orders if the context is newly mounted
  useEffect(() => {
    if (token && user) {
      getAllOrders();
      
      // For Super_Admin, also fetch restaurants for filtering
      if (user.role === 'Super_Admin') {
        getRestaurants();
      }
    }
  }, [token, user, getAllOrders, getRestaurants]);

  const contextValue = {
    orders,
    loading,
    error,
    restaurants,
    branches,
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getRestaurants,
    getBranchesForRestaurant,
    getOrderStatistics,
    generateInvoice
  };

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);

export default OrderProvider;