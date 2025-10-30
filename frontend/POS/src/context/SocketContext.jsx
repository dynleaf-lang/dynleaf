import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from '../utils/notify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Event deduplication cache to prevent processing duplicate events
  const eventCache = useMemo(() => {
    const cache = new Map();
    const CACHE_DURATION = 5000; // 5 seconds
    
    return {
      isDuplicate: (eventType, eventId, data) => {
        const key = `${eventType}:${eventId}`;
        const now = Date.now();
        
        if (cache.has(key)) {
          const { timestamp } = cache.get(key);
          if (now - timestamp < CACHE_DURATION) {
            return true; // Duplicate within cache duration
          }
        }
        
        // Clean old entries
        for (const [k, v] of cache.entries()) {
          if (now - v.timestamp > CACHE_DURATION) {
            cache.delete(k);
          }
        }
        
        // Store new event
        cache.set(key, { timestamp: now, data });
        return false;
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
  const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001', {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true
      });

      newSocket.on('connect', () => {
        console.log('[SOCKET] Connected to server');
        setConnected(true);
        
        // Join appropriate rooms based on user role and branch
        const joinData = {
          userType: 'pos',
          userId: user._id,
          role: user.role,
          branchId: user.branchId,
          restaurantId: user.restaurantId
        };

        newSocket.emit('join', joinData);
        console.log('[SOCKET] Joined POS rooms:', joinData);
      });

      newSocket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected from server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[SOCKET] Connection error:', error);
        setConnected(false);
      });

      // Listen for order status updates from kitchen
      newSocket.on('orderStatusUpdate', (data) => {
        const eventId = `${data.orderId}-${data.status}-${data.timestamp || Date.now()}`;
        
        if (eventCache.isDuplicate('orderStatusUpdate', eventId, data)) {
          console.log('[SOCKET] Duplicate order status update ignored:', { orderId: data.orderId, status: data.status });
          return;
        }
        
        console.log('[SOCKET] Order status update received:', data);
        toast.success(`Order #${data.orderNumber} status updated to: ${data.status}`);
        
        // Emit custom event for order context to handle
        window.dispatchEvent(new CustomEvent('orderStatusUpdate', { detail: data }));
      });

      // Listen for new orders (for kitchen integration)
      newSocket.on('newOrder', (data) => {
        const eventId = `${data._id || data.orderId}-${data.timestamp || Date.now()}`;
        
        if (eventCache.isDuplicate('newOrder', eventId, data)) {
          console.log('[SOCKET] Duplicate new order ignored:', { orderId: data._id || data.orderId });
          return;
        }
        
        console.log('[SOCKET] New order notification:', data);
        
        // Emit custom event for order context to handle
        window.dispatchEvent(new CustomEvent('newOrder', { detail: data }));
      });

      // Listen for generic order updates (created/updated/deleted)
      newSocket.on('orderUpdate', (data) => {
        const eventId = `${data._id || data.orderId}-${data.status}-${data.timestamp || Date.now()}`;
        
        if (eventCache.isDuplicate('orderUpdate', eventId, data)) {
          console.log('[SOCKET] Duplicate order update ignored:', { orderId: data._id || data.orderId });
          return;
        }
        
        console.log('[SOCKET] Order update event:', data);
        window.dispatchEvent(new CustomEvent('orderUpdate', { detail: data }));
      });

      // Listen for table status updates
      newSocket.on('tableStatusUpdate', (data) => {
        // Generate a unique ID for this event to detect duplicates
        const eventId = `${data.tableId}-${data.status}-${data.currentOrderId || 'none'}-${data.timestamp || Date.now()}`;
        
        if (eventCache.isDuplicate('tableStatusUpdate', eventId, data)) {
          console.log('[SOCKET] Duplicate table status update ignored:', { tableId: data.tableId, status: data.status });
          return;
        }
        
        console.log('[SOCKET] Table status update:', data);
        
        // Emit custom event for table context to handle
        window.dispatchEvent(new CustomEvent('tableStatusUpdate', { detail: data }));
      });

      // Listen for payment status updates
      newSocket.on('paymentStatusUpdate', (data) => {
        console.log('[SOCKET] Payment status update:', data);
        toast.info(`Payment status updated for Order #${data.orderNumber}: ${data.paymentStatus}`);
        
        // Emit custom event for order context to handle
        window.dispatchEvent(new CustomEvent('paymentStatusUpdate', { detail: data }));
      });

      // Listen for inventory updates (quantity/status)
      newSocket.on('inventoryUpdate', (data) => {
        console.log('[SOCKET] Inventory update:', data);
        // Subtle toast to inform operator
        toast(`Inventory updated: ${data.itemId} → ${data.status}`, { icon: 'ℹ️' });
        // Dispatch a custom event so POSContext or components can refresh if they want
        window.dispatchEvent(new CustomEvent('inventoryUpdate', { detail: data }));
      });

      // Listen for inventory notifications (low/critical/out, wastage)
      newSocket.on('inventory:notification', (payload) => {
        console.log('[SOCKET] Inventory notification:', payload);
        const msg = payload?.message || `${payload?.itemName || 'Item'}: ${payload?.type}`;
        const sev = payload?.severity || 'info';
        if (sev === 'critical') {
          toast.error(msg);
        } else if (sev === 'low') {
          toast(`${msg}`, { icon: '⚠️' });
        } else {
          toast.success(msg);
        }
        window.dispatchEvent(new CustomEvent('inventoryNotification', { detail: payload }));
      });

      setSocket(newSocket);

      return () => {
        console.log('[SOCKET] Cleaning up socket connection');
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [isAuthenticated, user]);

  // Emit order creation to kitchen
  const emitNewOrder = useCallback((orderData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting new order to kitchen:', orderData);
      socket.emit('newOrder', {
        ...orderData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  }, [socket, connected]);

  // Emit order status update
  const emitOrderStatusUpdate = useCallback((orderData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting order status update:', orderData);
      socket.emit('orderStatusUpdate', {
        ...orderData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  }, [socket, connected]);

  // Emit payment status update
  const emitPaymentStatusUpdate = useCallback((paymentData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting payment status update:', paymentData);
      socket.emit('paymentStatusUpdate', {
        ...paymentData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  }, [socket, connected]);

  // Emit table status update
  const emitTableStatusUpdate = useCallback((tableData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting table status update:', tableData);
      socket.emit('tableStatusUpdate', {
        ...tableData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  }, [socket, connected]);

  const value = useMemo(() => ({
    socket,
    connected,
    emitNewOrder,
    emitOrderStatusUpdate,
    emitPaymentStatusUpdate,
    emitTableStatusUpdate
  }), [socket, connected, emitNewOrder, emitOrderStatusUpdate, emitPaymentStatusUpdate, emitTableStatusUpdate]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
