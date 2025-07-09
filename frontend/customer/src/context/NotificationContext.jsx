import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useRestaurant } from './RestaurantContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket, isConnected } = useSocket();
  const { isAuthenticated, user } = useAuth();
  const { table, branch } = useRestaurant();
  const nextIdRef = useRef(1);
  const customerOrdersRef = useRef(new Set()); // Track customer's orders

  // Add welcome notification for new customers
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if this is a new login session
      const lastLoginTime = localStorage.getItem('lastLoginTime');
      const currentTime = Date.now();
      const isNewSession = !lastLoginTime || (currentTime - parseInt(lastLoginTime)) > 30 * 60 * 1000; // 30 minutes

      if (isNewSession) {
        addNotification({
          type: 'welcome',
          title: `Welcome ${user.name || user.firstName || 'Customer'}!`,
          message: 'Browse our delicious menu and place your order. We\'re happy to serve you!',
          icon: 'waving_hand',
          priority: 'high'
        });

        // Update last login time
        localStorage.setItem('lastLoginTime', currentTime.toString());
      }
    }
  }, [isAuthenticated, user]);

  // Setup socket listeners for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for order status updates
    const handleOrderStatusUpdate = (data) => {
      console.log('[NOTIFICATION] Order status update received:', data);
      const { orderNumber, orderId, newStatus, oldStatus, customerOrderId } = data;
      
      // Only show notification if this is the customer's order
      if (customerOrdersRef.current.has(orderId) || customerOrdersRef.current.has(customerOrderId)) {
        const statusConfig = getOrderStatusConfig(newStatus);
        
        addNotification({
          type: 'order_update',
          title: `Order #${orderNumber} ${statusConfig.title}`,
          message: statusConfig.message,
          icon: statusConfig.icon,
          priority: statusConfig.priority,
          orderId: orderId || customerOrderId,
          orderNumber,
          metadata: {
            oldStatus,
            newStatus,
            timestamp: new Date().toISOString()
          }
        });
      }
    };

    // Listen for order confirmations
    const handleOrderConfirmation = (data) => {
      console.log('[NOTIFICATION] Order confirmation received:', data);
      const { order, orderNumber } = data;
      
      // Add this order to customer's tracked orders
      if (order?.id || order?._id) {
        customerOrdersRef.current.add(order.id || order._id);
      }
      
      addNotification({
        type: 'order_confirmation',
        title: 'Order Confirmed!',
        message: `Your order #${orderNumber} has been confirmed and is being prepared.`,
        icon: 'check_circle',
        priority: 'high',
        orderId: order?.id || order?._id,
        orderNumber,
        metadata: {
          totalAmount: order?.totalAmount,
          estimatedTime: order?.estimatedTime || '15-20 minutes',
          timestamp: new Date().toISOString()
        }
      });
    };

    // Listen for promotional messages
    const handlePromotionalMessage = (data) => {
      console.log('[NOTIFICATION] Promotional message received:', data);
      const { title, message, promoCode, discount } = data;
      
      addNotification({
        type: 'promotion',
        title: title || 'Special Offer!',
        message: message || `Get ${discount}% off with code ${promoCode}`,
        icon: 'local_offer',
        priority: 'medium',
        metadata: {
          promoCode,
          discount,
          timestamp: new Date().toISOString()
        }
      });
    };

    // Listen for delivery updates (if applicable)
    const handleDeliveryUpdate = (data) => {
      console.log('[NOTIFICATION] Delivery update received:', data);
      const { orderNumber, status, estimatedTime, driverInfo } = data;
      
      addNotification({
        type: 'delivery',
        title: `Delivery Update - Order #${orderNumber}`,
        message: getDeliveryMessage(status, estimatedTime, driverInfo),
        icon: 'delivery_dining',
        priority: 'high',
        orderNumber,
        metadata: {
          deliveryStatus: status,
          estimatedTime,
          driverInfo,
          timestamp: new Date().toISOString()
        }
      });
    };

    // Listen for table service notifications (for dine-in)
    const handleTableService = (data) => {
      console.log('[NOTIFICATION] Table service notification received:', data);
      const { message, type, tableNumber } = data;
      
      if (table?.number === tableNumber || table?.id === data.tableId) {
        addNotification({
          type: 'table_service',
          title: 'Table Service',
          message: message || 'Your server will be with you shortly.',
          icon: 'room_service',
          priority: 'medium',
          metadata: {
            tableNumber,
            serviceType: type,
            timestamp: new Date().toISOString()
          }
        });
      }
    };

    // Register socket event listeners
    socket.on('orderStatusUpdate', handleOrderStatusUpdate);
    socket.on('orderConfirmation', handleOrderConfirmation);
    socket.on('promotionalMessage', handlePromotionalMessage);
    socket.on('deliveryUpdate', handleDeliveryUpdate);
    socket.on('tableService', handleTableService);

    // Cleanup listeners
    return () => {
      socket.off('orderStatusUpdate', handleOrderStatusUpdate);
      socket.off('orderConfirmation', handleOrderConfirmation);
      socket.off('promotionalMessage', handlePromotionalMessage);
      socket.off('deliveryUpdate', handleDeliveryUpdate);
      socket.off('tableService', handleTableService);
    };
  }, [socket, isConnected, table]);

  // Track customer orders for relevant notifications
  const trackCustomerOrder = (orderId) => {
    if (orderId) {
      customerOrdersRef.current.add(orderId);
    }
  };

  // Add notification
  const addNotification = (notificationData) => {
    const notification = {
      id: nextIdRef.current++,
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-remove notifications after 24 hours (optional)
    setTimeout(() => {
      removeNotification(notification.id);
    }, 24 * 60 * 60 * 1000);

    return notification.id;
  };

  // Remove notification
  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(notification => {
      if (notification.id === notificationId && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
        return { ...notification, read: true };
      }
      return notification;
    }));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Get order status configuration
  const getOrderStatusConfig = (status) => {
    const configs = {
      'Pending': {
        title: 'Received',
        message: 'We\'ve received your order and it\'s being reviewed.',
        icon: 'schedule',
        priority: 'medium'
      },
      'Processing': {
        title: 'Being Prepared',
        message: 'Great news! Your order is now being prepared by our kitchen.',
        icon: 'restaurant',
        priority: 'high'
      },
      'Ready': {
        title: 'Ready for Pickup',
        message: 'Your order is ready! Please come to the counter for pickup.',
        icon: 'check_circle',
        priority: 'high'
      },
      'Completed': {
        title: 'Completed',
        message: 'Your order has been completed. Thank you for dining with us!',
        icon: 'check_circle',
        priority: 'high'
      },
      'Delivered': {
        title: 'Delivered',
        message: 'Your order has been delivered successfully. Enjoy your meal!',
        icon: 'delivery_dining',
        priority: 'high'
      },
      'Cancelled': {
        title: 'Cancelled',
        message: 'Your order has been cancelled. If you have questions, please contact us.',
        icon: 'cancel',
        priority: 'high'
      }
    };

    return configs[status] || {
      title: 'Updated',
      message: `Your order status has been updated to ${status}.`,
      icon: 'info',
      priority: 'medium'
    };
  };

  // Get delivery message based on status
  const getDeliveryMessage = (status, estimatedTime, driverInfo) => {
    switch (status) {
      case 'assigned':
        return `A delivery driver has been assigned to your order. ${driverInfo?.name ? `Driver: ${driverInfo.name}` : ''}`;
      case 'picked_up':
        return `Your order has been picked up and is on the way! ${estimatedTime ? `ETA: ${estimatedTime}` : ''}`;
      case 'nearby':
        return 'Your delivery driver is nearby! Please be ready to receive your order.';
      case 'delivered':
        return 'Your order has been delivered successfully. Enjoy your meal!';
      default:
        return `Delivery status: ${status}`;
    }
  };

  // Get formatted time for display
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    trackCustomerOrder,
    getTimeAgo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
