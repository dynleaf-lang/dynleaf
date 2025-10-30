import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from '../utils/notify';
// Lazy access to ShiftContext without direct import to avoid cycles
import { useShift } from './ShiftContext';

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
  const { currentSession, isOpen, refresh: refreshSession } = useShift();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = getApiBase();

  // Upsert a batch snapshot from an order into localStorage so CartSidebar can render table batches
  const upsertBatchFromOrder = useCallback((ord) => {
    console.log('[ORDER CONTEXT] upsertBatchFromOrder called for order:', ord._id, {
      tableId: ord.tableId,
      status: ord.status,
      sourceType: ord.source,
      hasCreatedBy: !!ord.createdBy,
      hasCashierId: !!ord.cashierId
    });
    
    try {
      const tId = typeof ord?.tableId === 'object' ? (ord?.tableId?._id || ord?.tableId?.tableId || ord?.tableId?.id) : ord?.tableId;
      if (!tId) return; // only track dine-in/table orders

      const status = String(ord?.status || '').toLowerCase();
      const legacy = String(ord?.orderStatus || '').toLowerCase();
      const paid = String(ord?.paymentStatus || '').toLowerCase() === 'paid';
      const isTerminal = ['delivered', 'cancelled', 'canceled'].includes(status) || ['cancelled'].includes(legacy) || paid;

      const tableKey = String(tId);
      const batchesKey = 'pos_table_batches';
      
      // Use a retry mechanism for localStorage operations to handle race conditions
      const updateLocalStorageWithRetry = (retries = 3) => {
        try {
          const all = JSON.parse(localStorage.getItem(batchesKey) || '{}');

          // Remove terminal/settled orders from local batches
          if (isTerminal) {
            if (all[tableKey]?.batches) {
              const filtered = all[tableKey].batches.filter(b => b.orderId !== ord._id);
              if (filtered.length === 0) {
                delete all[tableKey];
              } else {
                all[tableKey].batches = filtered;
              }
              localStorage.setItem(batchesKey, JSON.stringify(all));
              
              // Also clear per-table cart if no batches remain
              try {
                if (!all[tableKey]) {
                  const cartsKey = 'pos_table_carts';
                  const cartsAll = JSON.parse(localStorage.getItem(cartsKey) || '{}');
                  if (cartsAll[tableKey]) {
                    delete cartsAll[tableKey];
                    localStorage.setItem(cartsKey, JSON.stringify(cartsAll));
                  }
                  
                  // Also clear KOT sent items for this table
                  const kotSentKey = 'pos_table_kot_sent';
                  const kotSentAll = JSON.parse(localStorage.getItem(kotSentKey) || '{}');
                  if (kotSentAll[tableKey]) {
                    delete kotSentAll[tableKey];
                    localStorage.setItem(kotSentKey, JSON.stringify(kotSentAll));
                  }
                }
              } catch (e) {
                console.warn('Failed to clear table cart/kot data:', e);
              }
              
              try { 
                window.dispatchEvent(new Event('batchesUpdated')); 
              } catch (e) {
                console.warn('Failed to dispatch batchesUpdated event:', e);
              }
            }
            return;
          }

          // Only upsert active orders
          const activeModern = ['pending', 'confirmed', 'accepted', 'placed', 'in_progress', 'preparing', 'ready', 'served'];
          const activeLegacy = ['pending', 'processing', 'completed'];
          const isActive = activeModern.includes(status) || activeLegacy.includes(legacy);
          if (!isActive) return;

          const entry = all[tableKey] || { nextOrderNumber: 1, batches: [] };
          const list = Array.isArray(entry.batches) ? entry.batches : [];
          const idx = list.findIndex((b) => b.orderId === ord._id);
          const safeItems = Array.isArray(ord.items) ? ord.items : [];
          const total = Number(ord.totalAmount) || safeItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);

          console.log('[ORDER CONTEXT] Processing order for batch storage:', {
            orderId: ord._id,
            orderTotalAmount: ord.totalAmount,
            calculatedTotal: total,
            itemCount: safeItems.length,
            itemDetails: safeItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId
            }))
          });

          // Derive customer/order meta from the order
          const ci = ord.customer || ord.customerInfo || {};
          const name = ci.name || ord.customerName || '';
          const phone = ci.phone || ord.customerPhone || '';
          const customerId = ci.customerId || ci._id || ord.customerId || null;
          const orderType = ord.orderType || ord.type || 'dine-in';
          const specialInstructions = ord.specialInstructions || ord.notes || ord.instructions || '';
          const deliveryAddress = ord.deliveryAddress || ci.address || '';
          
          // Determine if this is a customer order vs POS order
          // Customer orders: placed via customer app/website, don't have POS user fields
          // POS orders: placed via POS system, have cashier/user identification
          const isCustomerOrder = !ord.cashierId && !ord.createdBy && !ord.createdByName && ord.source !== 'pos';
          const sourceType = isCustomerOrder ? 'customer' : 'pos';

          if (idx === -1) {
            const orderNumber = ord.orderNumber || entry.nextOrderNumber;
            
            // Check if this order already exists by order ID to prevent duplicates
            const existingByOrderId = list.find(b => b.orderId === ord._id);
            if (existingByOrderId) {
              console.warn('[ORDER CONTEXT] Attempted to create duplicate batch for order:', ord._id, {
                tableId: tId,
                existingBatch: existingByOrderId,
                newOrder: {
                  id: ord._id,
                  sourceType,
                  status: ord.status,
                  createdAt: ord.createdAt
                }
              });
              return; // Prevent duplicate batch creation
            }
            
            const batch = {
              orderId: ord._id,
              orderNumber,
              items: safeItems,
              totalAmount: total,
              createdAt: ord.createdAt || new Date().toISOString(),
              sourceType, // Track whether this came from customer or POS
              kotPrinted: false, // Track KOT printing status
              // Extra meta so POS can reflect customer/order context
              orderType,
              customer: { name, phone, customerId },
              specialInstructions,
              deliveryAddress
            };
            
            console.log('[ORDER CONTEXT] Creating new batch for order:', ord._id, {
              batchItemCount: safeItems.length,
              batchItems: safeItems.map(i => ({ 
                name: i.name, 
                quantity: i.quantity, 
                menuItemId: i.menuItemId 
              })),
              totalAmount: total,
              sourceType
            });
            // Append new batch at the end so Batch #1 stays on top and newer batches appear below
            entry.batches = [...list, batch];
            if (!ord.orderNumber) entry.nextOrderNumber = (Number(entry.nextOrderNumber) || 1) + 1;
          } else {
            // update existing batch but keep its relative position
            const existing = list[idx];
            const updated = {
              ...existing,
              items: safeItems,
              totalAmount: total,
              sourceType: sourceType || existing.sourceType, // Preserve or update source type
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
            entry.batches = list.map((b, i) => (i === idx ? updated : b));
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
          } catch (e) {
            console.warn('Failed to update table cart data:', e);
          }
          
        } catch (e) {
          console.error('localStorage operation failed:', e);
          if (retries > 0) {
            console.log(`Retrying localStorage operation, ${retries} attempts remaining...`);
            setTimeout(() => updateLocalStorageWithRetry(retries - 1), 100);
          } else {
            console.error('Failed to update batches after all retries');
          }
        }
      };
      
      updateLocalStorageWithRetry();
      
    } catch (e) {
      console.error('Error in upsertBatchFromOrder:', e);
    }
  }, []);

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

  // upsertBatchFromOrder now provided by useCallback above

    const handleNewOrder = (event) => {
      try {
        const payload = event.detail;
        const created = payload?.order || payload; // backend sometimes sends { order, ... }
        if (!created || typeof created !== 'object') return;
        
        console.log('[ORDER CONTEXT] handleNewOrder triggered for:', created._id);
        
        // If order already present, update; else prepend
        setOrders(prev => {
          const exists = prev.some(o => o._id === created._id);
          console.log('[ORDER CONTEXT] Order exists in state:', exists);
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
        
        console.log('[ORDER CONTEXT] handleOrderUpdate triggered for:', updated._id);
        
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

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch orders with proper sorting (newest first)
    // Limit to today to avoid showing historical batches on available tables
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dstr = `${yyyy}-${mm}-${dd}`;
    const response = await axios.get(`${API_BASE_URL}/public/orders?branchId=${user.branchId}&limit=200&sort=-createdAt&startDate=${dstr}&endDate=${dstr}`);
      let fetchedOrders = response.data.orders || [];
      // Fallback if API doesn't support date filters
      if (!Array.isArray(fetchedOrders) || fetchedOrders.length === 0) {
        try {
          const respNoDate = await axios.get(`${API_BASE_URL}/public/orders?branchId=${user.branchId}&limit=200&sort=-createdAt`);
          fetchedOrders = respNoDate.data.orders || [];
        } catch (_) {
          // ignore; we'll proceed with whatever we have
        }
      }
      
      setOrders(fetchedOrders); 
    // Rebuild localStorage batches from scratch using only active dine-in orders
  try {
  localStorage.setItem('pos_table_batches', JSON.stringify({}));
  localStorage.setItem('pos_table_carts', JSON.stringify({}));
  // fetchedOrders is newest-first; upsert in ascending time so we append oldest first,
  // keeping visual order as Batch #1 (earliest) on top and newer batches below.
  fetchedOrders.slice().reverse().forEach(o => upsertBatchFromOrder(o));
        try { window.dispatchEvent(new Event('batchesUpdated')); } catch (_) {}
      } catch (_) {}
      
    } catch (error) { 
      setError('Failed to fetch orders');
      toast.error('Failed to load orders');
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, user?.branchId]);

  const createOrder = useCallback(async (orderData, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      // Guard: prevent creating orders when register is closed
      if (!isOpen) {
        toast.error('Register is closed. Please open a session to start selling.');
        try { await refreshSession(); } catch (_) {}
        return { success: false, error: 'Register is closed' };
      }
      
      const { enforceStock = true, allowInsufficientOverride = false } = options;

      // Base payload
      const newOrderData = {
        ...orderData,
        branchId: user.branchId,
        restaurantId: user.restaurantId,
        sessionId: currentSession?._id,
        createdBy: user._id,
        createdByName: user.name,
        source: 'pos',
        status: 'pending',
        paymentStatus: orderData.paymentStatus || 'unpaid',
        enforceStock,
        allowInsufficientOverride
      };

      // Normalize customer fields for backend compatibility
      // publicOrderRoutes expects customerInfo or legacy customerName/Phone
      if (!newOrderData.customerInfo && (orderData.customerInfo || orderData.customer)) {
        newOrderData.customerInfo = orderData.customerInfo || orderData.customer;
      }
      if (!newOrderData.customerName && (orderData?.customer?.name || orderData?.customerName)) {
        newOrderData.customerName = orderData?.customer?.name || orderData?.customerName;
      }
      if (!newOrderData.customerPhone && (orderData?.customer?.phone || orderData?.customerPhone)) {
        newOrderData.customerPhone = orderData?.customer?.phone || orderData?.customerPhone;
      }
      // Notes field fallback from specialInstructions
      if (!newOrderData.notes && (orderData?.notes || orderData?.specialInstructions)) {
        newOrderData.notes = orderData?.notes || orderData?.specialInstructions;
      }

      // Compute subtotal/total when missing to satisfy backend validators
      if (Array.isArray(newOrderData.items)) {
        const computedSubtotal = newOrderData.items.reduce((sum, it) => {
          const p = Number(it?.price) || 0;
          const q = Number(it?.quantity) || 0;
          return sum + p * q;
        }, 0);
        if (newOrderData.subtotal == null) newOrderData.subtotal = computedSubtotal;
        // If no tax provided, set total equal to subtotal so backend has a baseline
        if (newOrderData.total == null && newOrderData.taxAmount == null) {
          newOrderData.total = computedSubtotal;
        }
      }
 
      const response = await axios.post(`${API_BASE_URL}/public/orders`, newOrderData);
      
      // Handle different response structures
      const createdOrder = response.data.order || response.data;
      
      console.log('[ORDER CONTEXT] Backend returned order with items:', {
        orderId: createdOrder._id,
        itemCount: createdOrder.items?.length || 0,
        items: createdOrder.items?.map(i => ({ 
          name: i.name, 
          quantity: i.quantity, 
          menuItemId: i.menuItemId 
        })) || []
      });
      
      // Validate that we have a valid order object
      if (!createdOrder || typeof createdOrder !== 'object') {
        throw new Error('Invalid order response from server');
      }
 

      // Add to local state immediately
      setOrders(prevOrders => [createdOrder, ...prevOrders]);
      
      // NOTE: Don't call upsertBatchFromOrder here - let socket events handle it
      // to prevent duplicate batch creation. The socket 'newOrder' event will
      // trigger upsertBatchFromOrder when the backend broadcasts the order.

      // Emit to kitchen via socket (only if order has required fields)
      if (createdOrder._id) {
        emitNewOrder(createdOrder);
      }

      // Use orderNumber if available, otherwise use _id or a fallback
      const orderIdentifier = createdOrder.orderNumber || createdOrder._id || 'New Order';
      toast.success(`Order #${orderIdentifier} created successfully`);
      
      // Note: No need to refresh orders here as socket events will handle real-time updates
      // This prevents potential race conditions and duplicate batch creation
      
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
  }, [API_BASE_URL, isOpen, refreshSession, user?.branchId, user?.restaurantId, user?._id, user?.name, currentSession?._id, emitNewOrder, fetchOrders]);

  const updateOrderStatus = useCallback(async (orderId, status) => {
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
  }, [API_BASE_URL, emitOrderStatusUpdate, user?.name]);

  const updatePaymentStatus = useCallback(async (orderId, paymentStatus, paymentMethod = null) => {
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
  }, [API_BASE_URL, emitPaymentStatusUpdate, user?.name]);

  const updateOrderInState = useCallback((orderId, updates) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order._id === orderId
          ? { ...order, ...updates, updatedAt: new Date().toISOString() }
          : order
      )
    );
  }, []);

  // Move a single order (KOT/placed) to another table
  const moveOrderToTable = useCallback(async (orderId, newTableId) => {
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
  }, [API_BASE_URL, updateOrderInState]);

  // Move multiple orders to another table
  const moveOrdersToTable = useCallback(async (orderIds = [], newTableId) => {
    const results = [];
    for (const id of orderIds) {
      // eslint-disable-next-line no-await-in-loop
      const res = await moveOrderToTable(id, newTableId);
      results.push({ id, ...res });
    }
    return results;
  }, [moveOrderToTable]);

  const getOrderById = useCallback((orderId) => {
    return orders.find(order => order._id === orderId);
  }, [orders]);

  const getOrdersByTable = useCallback((tableId) => {
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
  }, [orders]);

  const getOrdersByStatus = useCallback((status) => orders.filter(order => order.status === status), [orders]);

  const getOrdersByPaymentStatus = useCallback((paymentStatus) => orders.filter(order => order.paymentStatus === paymentStatus), [orders]);

  const todaysOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter(order => new Date(order.createdAt).toDateString() === today);
  }, [orders]);

  const todaysRevenue = useMemo(() => {
    return todaysOrders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((total, order) => total + (order.totalAmount || 0), 0);
  }, [todaysOrders]);

  const orderStats = useMemo(() => {
    return {
      total: todaysOrders.length,
      pending: todaysOrders.filter(o => o.status === 'pending').length,
      confirmed: todaysOrders.filter(o => o.status === 'confirmed').length,
      preparing: todaysOrders.filter(o => o.status === 'preparing').length,
      ready: todaysOrders.filter(o => o.status === 'ready').length,
      delivered: todaysOrders.filter(o => o.status === 'delivered').length,
      paid: todaysOrders.filter(o => o.paymentStatus === 'paid').length,
      unpaid: todaysOrders.filter(o => o.paymentStatus === 'unpaid').length,
      revenue: todaysRevenue
    };
  }, [todaysOrders, todaysRevenue]);

  const value = useMemo(() => ({
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
    getTodaysOrders: () => todaysOrders,
    getTodaysRevenue: () => todaysRevenue,
    getOrderStats: () => orderStats,
    
    // Refresh function for manual refresh
    refreshOrders: fetchOrders
  }), [
    orders, loading, error,
    fetchOrders, createOrder, updateOrderStatus, updatePaymentStatus, moveOrderToTable, moveOrdersToTable,
    getOrderById, getOrdersByTable, getOrdersByStatus, getOrdersByPaymentStatus,
    todaysOrders, todaysRevenue, orderStats
  ]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
