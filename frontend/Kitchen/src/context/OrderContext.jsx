import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const OrderContext = createContext();

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, preparing, ready
  const { user, isAuthenticated } = useAuth();
  const { socket, emitOrderStatusUpdate } = useSocket();

  // Helper function to check if an order should be archived
  const shouldArchiveOrder = (order) => {
    if (order.status !== 'ready') return false;
    
    const currentTime = new Date();
    const orderUpdatedTime = new Date(order.updatedAt);
    const timeDifferenceInHours = (currentTime - orderUpdatedTime) / (1000 * 60 * 60);
    
    // Archive orders that have been 'ready' for more than 1 hour
    return timeDifferenceInHours > 1;
  };

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated || !user?.branchId) return;

    setLoading(true);
    setError('');

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const token = localStorage.getItem('kitchenToken');
      
      console.log('[KITCHEN] Fetching orders for branchId:', user.branchId);
      
      // Fetch all orders for the branch (we'll filter by status on frontend)
      const response = await fetch(`${apiBaseUrl}/api/public/orders?branchId=${user.branchId}&limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch orders`);
      }

      const orders = await response.json();
      console.log('[KITCHEN] Received orders:', orders.length);
      
      // Filter orders to only show kitchen-relevant statuses and exclude archived orders
      const kitchenOrders = orders.filter(order => {
        // Only show orders with kitchen-relevant statuses
        const isKitchenRelevant = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
        
        // Exclude orders that should be archived (ready for > 1 hour)
        const shouldNotArchive = !shouldArchiveOrder(order);
        
        return isKitchenRelevant && shouldNotArchive;
      });
      
      console.log('[KITCHEN] Kitchen-relevant orders (after auto-archive):', kitchenOrders.length);
      
      // Log archived orders for debugging
      const archivedOrders = orders.filter(order => 
        order.status === 'ready' && shouldArchiveOrder(order)
      );
      if (archivedOrders.length > 0) {
        console.log('[KITCHEN] Auto-archived orders:', archivedOrders.length, archivedOrders.map(o => ({ id: o.orderId, updatedAt: o.updatedAt })));
      }
      
      setOrders(kitchenOrders);
    } catch (error) {
      console.error('[KITCHEN] Error fetching orders:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.branchId]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const token = localStorage.getItem('kitchenToken');
      
      // Map kitchen status to backend expected format
      const statusMapping = {
        'pending': 'Pending',
        'confirmed': 'Processing',
        'preparing': 'Processing', 
        'ready': 'Completed',
        'delivered': 'Completed',
        'cancelled': 'Cancelled'
      };
      
      const backendStatus = statusMapping[newStatus] || 'Pending';
      console.log(`[KITCHEN] Updating order ${orderId} status: ${newStatus} -> ${backendStatus}`);
      
      const response = await fetch(`${apiBaseUrl}/api/public/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderStatus: backendStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Emit socket event for real-time updates
      const oldOrder = orders.find(o => o._id === orderId);
      if (oldOrder) {
        emitOrderStatusUpdate(orderId, newStatus, oldOrder.status);
      }

      return { success: true, order: updatedOrder };
    } catch (error) {
      console.error('Error updating order status:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Listen for real-time order updates
  useEffect(() => {
    if (socket) {
      const handleNewOrder = (orderData) => {
        // Only add orders for this branch
        if (orderData.branchId === user?.branchId) {
          setOrders(prevOrders => {
            // Check if order already exists
            const exists = prevOrders.some(order => order._id === orderData._id);
            if (!exists) {
              return [orderData, ...prevOrders];
            }
            return prevOrders;
          });
        }
      };

      const handleOrderUpdate = (orderData) => {
        if (orderData.branchId === user?.branchId) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === orderData._id ? { ...order, ...orderData } : order
            )
          );
        }
      };

      const handleStatusUpdate = (statusData) => {
        if (statusData.order?.branchId === user?.branchId) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === statusData.order._id 
                ? { ...order, status: statusData.newStatus, updatedAt: new Date().toISOString() }
                : order
            )
          );
        }
      };

      socket.on('newOrder', handleNewOrder);
      socket.on('orderUpdate', handleOrderUpdate);
      socket.on('statusUpdate', handleStatusUpdate);

      return () => {
        socket.off('newOrder', handleNewOrder);
        socket.off('orderUpdate', handleOrderUpdate);
        socket.off('statusUpdate', handleStatusUpdate);
      };
    }
  }, [socket, user?.branchId]);

  // Fetch orders when component mounts or user changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh timer to check for orders that need archiving
  useEffect(() => {
    if (!isAuthenticated || !user?.branchId) return;

    // Set up interval to refresh orders every 5 minutes to check for auto-archiving
    const autoRefreshInterval = setInterval(() => {
      console.log('[KITCHEN] Auto-refresh: Checking for orders to archive...');
      fetchOrders();
    }, 5 * 60 * 1000); // 5 minutes

    // Also set up a more frequent check every 30 seconds for orders close to the 1-hour mark
    const frequentCheckInterval = setInterval(() => {
      const currentTime = new Date();
      const ordersNearArchiving = orders.filter(order => {
        if (order.status !== 'ready') return false;
        const orderUpdatedTime = new Date(order.updatedAt);
        const timeDifferenceInMinutes = (currentTime - orderUpdatedTime) / (1000 * 60);
        // Check orders that are between 55-65 minutes old (close to 1 hour)
        return timeDifferenceInMinutes >= 55 && timeDifferenceInMinutes <= 65;
      });
      
      if (ordersNearArchiving.length > 0) {
        console.log('[KITCHEN] Orders approaching archive time:', ordersNearArchiving.length);
        fetchOrders(); // Refresh to check if any should be archived now
      }
    }, 30 * 1000); // 30 seconds

    return () => {
      clearInterval(autoRefreshInterval);
      clearInterval(frequentCheckInterval);
    };
  }, [isAuthenticated, user?.branchId, fetchOrders, orders]);

  // Filter orders based on current filter
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  // Get order counts by status
  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
    };
  };

  const value = {
    orders: filteredOrders,
    allOrders: orders,
    loading,
    error,
    filter,
    setFilter,
    fetchOrders,
    updateOrderStatus,
    getOrderCounts
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export default OrderProvider;
