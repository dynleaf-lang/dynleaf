import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useRestaurant } from './RestaurantContext';

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
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { restaurant, branch, table } = useRestaurant();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Use refs instead of state for handlers to avoid re-renders
  const orderUpdateHandler = useRef(null);
  const statusUpdateHandler = useRef(null);
  const newOrderHandler = useRef(null);

  useEffect(() => {
    // Create socket connection for customer
    const socketInstance = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      setConnectionError(error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setConnectionError('Unable to connect to real-time server');
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('reconnect_error', (error) => {
      // Handle reconnection errors silently
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Auto-join customer rooms when restaurant info is available and socket is connected
  useEffect(() => {
    if (socket && isConnected && branch) {
      const joinData = {
        userType: 'customer',
        tableId: table?._id || null,
        branchId: branch._id,
      };

      socket.emit('join', joinData);
      
      // Also manually join the global customer room as fallback
      socket.emit('join-room', 'customer_global');
    }
  }, [socket, isConnected, restaurant, branch, table]);

  // Join customer rooms when table/branch info is available
  const joinCustomerRooms = (tableId, branchId) => {
    if (socket && isConnected) {
      const joinData = {
        userType: 'customer',
        tableId,
        branchId,
      };

      socket.emit('join', joinData);
    }
  };

  // Register event handlers
  const onOrderUpdate = (handler) => {
    if (socket && handler) {
      socket.off('orderUpdate'); // Remove previous handler
      socket.on('orderUpdate', handler);
      orderUpdateHandler.current = handler;
    }
  };

  const onStatusUpdate = (handler) => {
    if (socket && handler) {
      socket.off('statusUpdate'); // Remove previous handler
      socket.on('statusUpdate', handler);
      statusUpdateHandler.current = handler;
    }
  };

  const onNewOrder = (handler) => {
    if (socket && handler) {
      socket.off('newOrder'); // Remove previous handler
      socket.on('newOrder', handler);
      newOrderHandler.current = handler;
    }
  };

  // Remove event handlers
  const offOrderUpdate = () => {
    if (socket) {
      socket.off('orderUpdate');
      orderUpdateHandler.current = null;
    }
  };

  const offStatusUpdate = () => {
    if (socket) {
      socket.off('statusUpdate');
      statusUpdateHandler.current = null;
    }
  };

  const offNewOrder = () => {
    if (socket) {
      socket.off('newOrder');
      newOrderHandler.current = null;
    }
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    joinCustomerRooms,
    onOrderUpdate,
    onStatusUpdate,
    onNewOrder,
    offOrderUpdate,
    offStatusUpdate,
    offNewOrder,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
