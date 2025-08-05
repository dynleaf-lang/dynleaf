import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const newSocket = io(apiBaseUrl, {
        auth: {
          token: localStorage.getItem('kitchenToken'),
          userId: user._id,
          role: user.role,
          branchId: user.branchId
        }
      });

      newSocket.on('connect', () => {
        console.log('[KITCHEN SOCKET] Connected to server');
        setConnected(true);
        
        // Join kitchen-specific rooms
        if (user.branchId) {
          newSocket.emit('joinRoom', `kitchen_branch_${user.branchId}`);
          newSocket.emit('joinRoom', `branch_${user.branchId}`);
        }
        newSocket.emit('joinRoom', 'kitchen_global');
      });

      newSocket.on('disconnect', () => {
        console.log('[KITCHEN SOCKET] Disconnected from server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[KITCHEN SOCKET] Connection error:', error);
        setConnected(false);
      });

      // Listen for order updates
      newSocket.on('newOrder', (orderData) => {
        console.log('[KITCHEN SOCKET] New order received:', orderData);
        // This will be handled by OrderContext
      });

      newSocket.on('orderUpdate', (orderData) => {
        console.log('[KITCHEN SOCKET] Order updated:', orderData);
        // This will be handled by OrderContext
      });

      newSocket.on('statusUpdate', (statusData) => {
        console.log('[KITCHEN SOCKET] Status update:', statusData);
        // This will be handled by OrderContext
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const emitOrderStatusUpdate = (orderId, newStatus, oldStatus) => {
    if (socket && connected) {
      socket.emit('orderStatusUpdate', {
        orderId,
        newStatus,
        oldStatus,
        updatedBy: user?._id,
        updatedByName: user?.name,
        timestamp: new Date().toISOString()
      });
    }
  };

  const value = {
    socket,
    connected,
    emitOrderStatusUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
