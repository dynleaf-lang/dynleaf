import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from './SocketContext';
import { AuthContext } from './AuthContext';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

export const NotificationsProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handler = (payload) => {
      // Basic scope check if payload includes branch/restaurant
      if (payload?.branchId && user.branchId && payload.branchId !== user.branchId) return;
      if (payload?.restaurantId && user.restaurantId && payload.restaurantId !== user.restaurantId) return;

      const n = {
        id: `${payload.type || 'inventory'}-${payload.itemId || ''}-${payload.createdAt || Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        read: false,
        ...payload,
      };
      setNotifications((prev) => [n, ...prev].slice(0, 100));
      setUnreadCount((c) => c + 1);
    };

    socket.off('inventory:notification');
    socket.on('inventory:notification', handler);

    return () => {
      socket.off('inventory:notification', handler);
    };
  }, [socket, isConnected, user]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const value = useMemo(() => ({ notifications, unreadCount, markAllRead, clearAll }), [notifications, unreadCount]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
