import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
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
        console.log('[SOCKET] Order status update received:', data);
        toast.success(`Order #${data.orderNumber} status updated to: ${data.status}`);
        
        // Emit custom event for order context to handle
        window.dispatchEvent(new CustomEvent('orderStatusUpdate', { detail: data }));
      });

      // Listen for new orders (for kitchen integration)
      newSocket.on('newOrder', (data) => {
        console.log('[SOCKET] New order notification:', data);
        
        // Emit custom event for order context to handle
        window.dispatchEvent(new CustomEvent('newOrder', { detail: data }));
      });

      // Listen for table status updates
      newSocket.on('tableStatusUpdate', (data) => {
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
  const emitNewOrder = (orderData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting new order to kitchen:', orderData);
      socket.emit('newOrder', {
        ...orderData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  };

  // Emit order status update
  const emitOrderStatusUpdate = (orderData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting order status update:', orderData);
      socket.emit('orderStatusUpdate', {
        ...orderData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  };

  // Emit payment status update
  const emitPaymentStatusUpdate = (paymentData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting payment status update:', paymentData);
      socket.emit('paymentStatusUpdate', {
        ...paymentData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  };

  // Emit table status update
  const emitTableStatusUpdate = (tableData) => {
    if (socket && connected) {
      console.log('[SOCKET] Emitting table status update:', tableData);
      socket.emit('tableStatusUpdate', {
        ...tableData,
        timestamp: new Date().toISOString(),
        source: 'pos'
      });
    }
  };

  const value = {
    socket,
    connected,
    emitNewOrder,
    emitOrderStatusUpdate,
    emitPaymentStatusUpdate,
    emitTableStatusUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
