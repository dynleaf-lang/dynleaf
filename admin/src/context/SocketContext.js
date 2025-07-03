import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

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
  const { user } = useContext(AuthContext);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Use refs instead of state for handlers to avoid re-renders
  const orderUpdateHandler = useRef(null);
  const statusUpdateHandler = useRef(null);
  const newOrderHandler = useRef(null);

  useEffect(() => {
    if (!user) {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socketInstance = io(process.env.BASE_API_URL || 'http://localhost:5001', {
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
      console.log('[SOCKET] Connected to server:', socketInstance.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;

      // Join appropriate rooms based on user role
      const joinData = {
        userType: 'admin',
        branchId: user.branchId,
        restaurantId: user.restaurantId,
      };

      socketInstance.emit('join', joinData);
      console.log('[SOCKET] Joined rooms with data:', joinData);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected from server:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect - try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      setConnectionError(error.message);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('[SOCKET] Max reconnection attempts reached');
        setConnectionError('Unable to connect to real-time server');
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[SOCKET] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[SOCKET] Reconnection error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

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

  // Emit events
  const emitJoin = (data) => {
    if (socket && isConnected) {
      socket.emit('join', data);
    }
  };

  const value = {
    socket,
    isConnected,
    connectionError,
    onOrderUpdate,
    onStatusUpdate,
    onNewOrder,
    offOrderUpdate,
    offStatusUpdate,
    offNewOrder,
    emitJoin,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
