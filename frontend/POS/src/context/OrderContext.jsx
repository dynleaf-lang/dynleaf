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

    const upsertBatchFromOrder = (ord) => {
      try {
        const tId = typeof ord?.tableId === 'object' ? (ord?.tableId?._id || ord?.tableId?.tableId || ord?.tableId?.id) : ord?.tableId;
        if (!tId) return; // only track dine-in/table orders
        const tableKey = String(tId);
        const batchesKey = 'pos_table_batches';
        const all = JSON.parse(localStorage.getItem(batchesKey) || '{}');
        const entry = all[tableKey] || { nextOrderNumber: 1, batches: [] };
        const list = Array.isArray(entry.batches) ? entry.batches : [];
        const idx = list.findIndex((b) => b.orderId === ord._id);
        const safeItems = Array.isArray(ord.items) ? ord.items : [];
        const total = Number(ord.totalAmount) || safeItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

        // Derive customer/order meta from the order
        const ci = ord.customer || ord.customerInfo || {};
        const name = ci.name || ord.customerName || '';
        const phone = ci.phone || ord.customerPhone || '';
        const customerId = ci.customerId || ci._id || ord.customerId || null;
        const orderType = ord.orderType || ord.type || 'dine-in';
        const specialInstructions = ord.specialInstructions || ord.notes || ord.instructions || '';
        const deliveryAddress = ord.deliveryAddress || ci.address || '';
        if (idx === -1) {
          const orderNumber = ord.orderNumber || entry.nextOrderNumber;
          const batch = {
            orderId: ord._id,
            orderNumber,
            items: safeItems,
            totalAmount: total,
            createdAt: ord.createdAt || new Date().toISOString(),
            // Extra meta so POS can reflect customer/order context
            orderType,
            customer: { name, phone, customerId },
            specialInstructions,
            deliveryAddress
          };
          entry.batches = [batch, ...list];
          // increment nextOrderNumber only if we used it
          if (!ord.orderNumber) entry.nextOrderNumber = (Number(entry.nextOrderNumber) || 1) + 1;
        } else {
          // update existing batch
          const existing = list[idx];
          const updated = {
            ...existing,
            items: safeItems,
            totalAmount: total,
            orderType: orderType || existing.orderType,
            customer: {
              ...(existing.customer || {}),
              ...(name ? { name } : {}),
              ...(phone ? { phone } : {}),
              ...(customerId ? { customerId } : {})
            },
            specialInstructions: specialInstructions || existing.specialInstructions || '',
            deliveryAddress: deliveryAddress || existing.deliveryAddress || ''
          };
          entry.batches = [updated, ...list.filter((_, i) => i !== idx)];
        }
        all[tableKey] = entry;
        localStorage.setItem(batchesKey, JSON.stringify(all));

        // Also mirror customer meta into per-table cart storage so selecting the table restores it
        try {
          const cartsKey = 'pos_table_carts';
          const cartsAll = JSON.parse(localStorage.getItem(cartsKey) || '{}');
          const saved = cartsAll[tableKey] || { items: [], customerInfo: {} };
          const mergedCustomer = {
            ...(saved.customerInfo || {}),
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            ...(customerId ? { customerId } : {}),
            ...(orderType ? { orderType } : {}),
            ...(specialInstructions ? { specialInstructions } : {}),
            ...(deliveryAddress ? { deliveryAddress } : {})
          };
          cartsAll[tableKey] = { items: saved.items || [], customerInfo: mergedCustomer };
          localStorage.setItem(cartsKey, JSON.stringify(cartsAll));
        } catch (_) {}
      } catch (_) {}
    };

    const handleNewOrder = (event) => {
      try {
        const payload = event.detail;
        const created = payload?.order || payload; // backend sometimes sends { order, ... }
        if (!created || typeof created !== 'object') return;
        // If order already present, update; else prepend
        setOrders(prev => {
          const exists = prev.some(o => o._id === created._id);
          return exists ? prev.map(o => (o._id === created._id ? { ...o, ...created } : o)) : [created, ...prev];
        });
        // Mirror into local batches so CartSidebar shows it
        upsertBatchFromOrder(created);
  // Notify UI listeners that batches changed
  try { window.dispatchEvent(new CustomEvent('batchesUpdated', { detail: { tableId: created.tableId, orderId: created._id } })); } catch {}
      } catch {}
    };

    const handleOrderUpdate = (event) => {
      try {
        const payload = event.detail;
        const updated = payload?.order || payload;
        if (!updated || typeof updated !== 'object') return;
        setOrders(prev => prev.map(o => (o._id === updated._id ? { ...o, ...updated } : o)));
        upsertBatchFromOrder(updated);
  try { window.dispatchEvent(new CustomEvent('batchesUpdated', { detail: { tableId: updated.tableId, orderId: updated._id } })); } catch {}
      } catch {}
    };

    window.addEventListener('orderStatusUpdate', handleOrderStatusUpdate);
    window.addEventListener('paymentStatusUpdate', handlePaymentStatusUpdate);
    window.addEventListener('newOrder', handleNewOrder);
    window.addEventListener('orderUpdate', handleOrderUpdate);

    return () => {
      window.removeEventListener('orderStatusUpdate', handleOrderStatusUpdate);
      window.removeEventListener('paymentStatusUpdate', handlePaymentStatusUpdate);
      window.removeEventListener('newOrder', handleNewOrder);
      window.removeEventListener('orderUpdate', handleOrderUpdate);
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

  // Move a single order (KOT/placed) to another table
  const moveOrderToTable = async (orderId, newTableId) => {
    try {
      // Try a dedicated endpoint if supported
      try {
        const resp = await axios.patch(`${API_BASE_URL}/public/orders/${orderId}/move-table`, { tableId: newTableId });
        const updated = resp.data.order || resp.data;
        updateOrderInState(orderId, { tableId: newTableId });
        toast.success(`Order #${updated?.orderNumber || orderId} moved to table`);
        return { success: true, order: updated };
      } catch (primaryErr) {
        // Fallback to generic PATCH
        const resp2 = await axios.patch(`${API_BASE_URL}/public/orders/${orderId}`, { tableId: newTableId });
        const updated = resp2.data.order || resp2.data;
        updateOrderInState(orderId, { tableId: newTableId });
        toast.success(`Order #${updated?.orderNumber || orderId} moved to table`);
        return { success: true, order: updated };
      }
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to move order';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Move multiple orders to another table
  const moveOrdersToTable = async (orderIds = [], newTableId) => {
    const results = [];
    for (const id of orderIds) {
      // eslint-disable-next-line no-await-in-loop
      const res = await moveOrderToTable(id, newTableId);
      results.push({ id, ...res });
    }
    return results;
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
  moveOrderToTable,
  moveOrdersToTable,

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
