import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const OrderContext = createContext();

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  const { emitNewOrder, emitOrderStatusUpdate, emitPaymentStatusUpdate } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api`;

  // Fetch orders when user is authenticated
  useEffect(() => {
    if (user?.branchId) {
      fetchOrders();
    }
  }, [user]);

  // Listen for real-time order updates
  useEffect(() => {
    const handleOrderStatusUpdate = (event) => {
      const orderData = event.detail;
      updateOrderInState(orderData.orderId, { status: orderData.status });
    };

    const handlePaymentStatusUpdate = (event) => {
      const paymentData = event.detail;
      updateOrderInState(paymentData.orderId, { paymentStatus: paymentData.paymentStatus });
    };

    window.addEventListener('orderStatusUpdate', handleOrderStatusUpdate);
    window.addEventListener('paymentStatusUpdate', handlePaymentStatusUpdate);

    return () => {
      window.removeEventListener('orderStatusUpdate', handleOrderStatusUpdate);
      window.removeEventListener('paymentStatusUpdate', handlePaymentStatusUpdate);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders with proper sorting (newest first)
      const response = await axios.get(`${API_BASE_URL}/public/orders?branchId=${user.branchId}&limit=100&sort=-createdAt`);
      const fetchedOrders = response.data.orders || [];
      
      setOrders(fetchedOrders); 
      
    } catch (error) { 
      setError('Failed to fetch orders');
      toast.error('Failed to load orders');
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const { enforceStock = true, allowInsufficientOverride = false } = options;

      const newOrderData = {
        ...orderData,
        branchId: user.branchId,
        restaurantId: user.restaurantId,
        createdBy: user._id,
        createdByName: user.name,
        source: 'pos',
        status: 'pending',
        paymentStatus: orderData.paymentStatus || 'unpaid',
        enforceStock,
        allowInsufficientOverride
      };
 
      const response = await axios.post(`${API_BASE_URL}/public/orders`, newOrderData);
      
      // Handle different response structures
      const createdOrder = response.data.order || response.data;
      
      // Validate that we have a valid order object
      if (!createdOrder || typeof createdOrder !== 'object') {
        throw new Error('Invalid order response from server');
      }
 

      // Add to local state immediately
      setOrders(prevOrders => [createdOrder, ...prevOrders]);

      // Emit to kitchen via socket (only if order has required fields)
      if (createdOrder._id) {
        emitNewOrder(createdOrder);
      }

      // Use orderNumber if available, otherwise use _id or a fallback
      const orderIdentifier = createdOrder.orderNumber || createdOrder._id || 'New Order';
      toast.success(`Order #${orderIdentifier} created successfully`);
      
      // Refresh orders to ensure persistence
      setTimeout(() => {
        fetchOrders();
      }, 1000);
      
      return { success: true, order: createdOrder };

    } catch (error) {
      // Handle insufficient stock conflict
      const status = error?.response?.status;
      if (status === 409 && error?.response?.data?.insufficient) {
        return {
          success: false,
          insufficient: true,
          details: error.response.data.details || [],
          message: error.response.data.message || 'Insufficient stock'
        };
      }

      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create order';
      toast.error(errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/public/orders/${orderId}/status`, { status });
      
      // Handle different response structures
      const updatedOrder = response.data.order || response.data;
      
      // Update local state
      updateOrderInState(orderId, { status });

      // Emit to kitchen via socket (with safe property access)
      emitOrderStatusUpdate({
        orderId,
        orderNumber: updatedOrder?.orderNumber || orderId,
        status,
        updatedBy: user.name
      });

      toast.success(`Order status updated to ${status}`);
      return { success: true, order: updatedOrder };

    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update order status';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus, paymentMethod = null) => {
    const updateData = { paymentStatus };
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    try {
      // Primary endpoint
      const response = await axios.patch(`${API_BASE_URL}/public/orders/${orderId}/payment-status`, updateData);
      const updatedOrder = response.data.order || response.data;

      updateOrderInState(orderId, updateData);
      emitPaymentStatusUpdate({
        orderId,
        orderNumber: updatedOrder?.orderNumber || orderId,
        paymentStatus,
        paymentMethod,
        updatedBy: user.name
      });
      toast.success(`Payment status updated to ${paymentStatus}`);
      return { success: true, order: updatedOrder };
    } catch (primaryError) {
      // Fallback: some backends accept generic PATCH to update fields
      const statusCode = primaryError?.response?.status;
      if (statusCode === 404 || statusCode === 405) {
        try {
          const fallbackResp = await axios.patch(`${API_BASE_URL}/public/orders/${orderId}`, updateData);
          const updatedOrder = fallbackResp.data.order || fallbackResp.data;

          updateOrderInState(orderId, updateData);
          emitPaymentStatusUpdate({
            orderId,
            orderNumber: updatedOrder?.orderNumber || orderId,
            paymentStatus,
            paymentMethod,
            updatedBy: user.name
          });
          toast.success(`Payment status updated to ${paymentStatus}`);
          return { success: true, order: updatedOrder };
        } catch (fallbackError) {
          const msg = fallbackError?.response?.data?.message || primaryError?.response?.data?.message || fallbackError?.message || 'Failed to update payment status';
          toast.error(msg);
          return { success: false, error: msg };
        }
      }

      const errorMessage = primaryError?.response?.data?.message || primaryError?.message || 'Failed to update payment status';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateOrderInState = (orderId, updates) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order._id === orderId
          ? { ...order, ...updates, updatedAt: new Date().toISOString() }
          : order
      )
    );
  };

  const getOrderById = (orderId) => {
    return orders.find(order => order._id === orderId);
  };

  const getOrdersByTable = (tableId) => {
    try {
      const targetId = typeof tableId === 'object' && tableId !== null
        ? (tableId._id || tableId.id || tableId.tableId || '')
        : tableId;

      return orders.filter(order => {
        const oTid = order?.tableId;
        if (!oTid) return false;
        // If stored as a plain id
        if (typeof oTid === 'string') return oTid === targetId;
        // If stored as a populated object
        if (typeof oTid === 'object') {
          return (
            oTid._id === targetId ||
            oTid.tableId === targetId ||
            oTid.id === targetId
          );
        }
        return false;
      });
    } catch (_) {
      return [];
    }
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const getOrdersByPaymentStatus = (paymentStatus) => {
    return orders.filter(order => order.paymentStatus === paymentStatus);
  };

  const getTodaysOrders = () => {
    const today = new Date().toDateString();
    return orders.filter(order => 
      new Date(order.createdAt).toDateString() === today
    );
  };

  const getTodaysRevenue = () => {
    const todaysOrders = getTodaysOrders();
    return todaysOrders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((total, order) => total + (order.totalAmount || 0), 0);
  };

  const getOrderStats = () => {
    const todaysOrders = getTodaysOrders();
    
    return {
      total: todaysOrders.length,
      pending: todaysOrders.filter(o => o.status === 'pending').length,
      confirmed: todaysOrders.filter(o => o.status === 'confirmed').length,
      preparing: todaysOrders.filter(o => o.status === 'preparing').length,
      ready: todaysOrders.filter(o => o.status === 'ready').length,
      delivered: todaysOrders.filter(o => o.status === 'delivered').length,
      paid: todaysOrders.filter(o => o.paymentStatus === 'paid').length,
      unpaid: todaysOrders.filter(o => o.paymentStatus === 'unpaid').length,
      revenue: getTodaysRevenue()
    };
  };

  const value = {
    // State
    orders,
    loading,
    error,

    // Actions
    fetchOrders,
    createOrder,
    updateOrderStatus,
    updatePaymentStatus,

    // Helpers
    getOrderById,
    getOrdersByTable,
    getOrdersByStatus,
    getOrdersByPaymentStatus,
    getTodaysOrders,
    getTodaysRevenue,
    getOrderStats,
    
    // Refresh function for manual refresh
    refreshOrders: fetchOrders
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
