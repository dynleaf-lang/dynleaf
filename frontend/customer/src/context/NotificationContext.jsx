import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
  const { table, branch, restaurant } = useRestaurant();
  const nextIdRef = useRef(1);
  const customerOrdersRef = useRef(new Set()); // Track customer's orders
  const lastNotificationRef = useRef({}); // Track last notification per order to prevent rapid duplicates

  // Add notification with duplicate prevention
  const addNotification = (notificationData) => {
    // Check for duplicate order update notifications with more specific criteria
    if (notificationData.type === 'order_update') {
      const isDuplicate = notifications.some(notification => 
        notification.type === 'order_update' &&
        notification.orderId === notificationData.orderId &&
        notification.metadata?.newStatus === notificationData.metadata?.newStatus &&
        (Date.now() - new Date(notification.timestamp).getTime()) < 10000 // Within last 10 seconds
      );
      
      if (isDuplicate) {
        return null;
      }
    }

    const notification = {
      id: nextIdRef.current++,
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData
    };
    
    setNotifications(prev => {
      // Also remove any older notifications for the same order and status to keep the list clean
      const filtered = prev.filter(n => 
        !(n.type === 'order_update' && 
          n.orderId === notification.orderId && 
          n.metadata?.newStatus === notification.metadata?.newStatus)
      );
      return [notification, ...filtered];
    });
    
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

  // Listen for user logout to clear notifications
  useEffect(() => {
    const handleUserLogout = () => {
      console.log('[NOTIFICATION CONTEXT] User logged out, clearing all notifications');
      clearAllNotifications();
    };

    // Listen for logout event
    window.addEventListener('user-logout', handleUserLogout);

    // Cleanup listener
    return () => {
      window.removeEventListener('user-logout', handleUserLogout);
    };
  }, []);

  // Clear notifications when user logs out or changes
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // User logged out, clear all notifications and tracked orders
      clearAllNotifications();
      console.log('[NOTIFICATION CONTEXT] User logged out, clearing all notifications');
    }
  }, [isAuthenticated, user]);

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
    if (!socket || !isConnected) {
      return;
    }

    // Listen for order confirmations
    const handleOrderConfirmation = (data) => {
      const { order, orderNumber } = data;
      
      // Determine the customer identifier
      const customerIdentifier = user?.phone || user?.email || user?.identifier;
      
      // Only add notifications for this customer's orders
      const isCustomerOrder = customerIdentifier && 
        (order?.customerPhone === customerIdentifier || order?.customerEmail === customerIdentifier);
      
      if (isCustomerOrder) {
        // Add this order to customer's tracked orders
        if (order?.id || order?._id) {
          customerOrdersRef.current.add(String(order.id || order._id));
        }
        
        addNotification({
          type: 'order_confirmation',
          title: 'Order Confirmed!',
          message: `👍 Great news! Your order #${orderNumber} has been confirmed. We’ll start preparing your meal right away. 🍴`,
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
      }
    };

    // Listen for order status updates - MOVED HERE FROM OrdersView
    const handleStatusUpdate = (data) => {
      const { orderNumber, orderId, newStatus, oldStatus, order } = data;
      const orderIdToCheck = String(orderId || order?._id || order?.id);
      
      // Check for rapid duplicates using debouncing
      const notificationKey = `${orderIdToCheck}-${newStatus}`;
      const lastTime = lastNotificationRef.current[notificationKey];
      const now = Date.now();
      
      if (lastTime && (now - lastTime) < 5000) {
        return;
      }
      
      lastNotificationRef.current[notificationKey] = now;
      
      // Determine the customer identifier
      const customerIdentifier = user?.phone || user?.email || user?.identifier;
      
      // Check if this is a customer order - only by customer identifier or tracked orders
      const isCustomerOrder = orderIdToCheck && (
        customerOrdersRef.current.has(orderIdToCheck) ||
        (customerIdentifier && 
         (order?.customerPhone === customerIdentifier || order?.customerEmail === customerIdentifier))
      );
      
      if (isCustomerOrder) {
        // Track this order for future updates if not already tracked
        if (orderIdToCheck && !customerOrdersRef.current.has(orderIdToCheck)) {
          customerOrdersRef.current.add(orderIdToCheck);
        }
        
        const statusConfig = getOrderStatusConfig(newStatus);
        
        addNotification({
          type: 'order_update',
          title: `Order #${orderNumber || order?.orderId || order?.orderNumber} ${statusConfig.title}`,
          message: statusConfig.message,
          icon: statusConfig.icon,
          priority: statusConfig.priority,
          orderId: orderIdToCheck,
          orderNumber: orderNumber || order?.orderId || order?.orderNumber,
          metadata: {
            oldStatus,
            newStatus,
            timestamp: new Date().toISOString()
          }
        });
      }
    };

    // Listen for promotional messages
    const handlePromotionalMessage = (data) => {
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
      const { orderNumber, status, estimatedTime, driverInfo, order } = data;
      
      // Determine the customer identifier
      const customerIdentifier = user?.phone || user?.email || user?.identifier;
      
      // Only show delivery notifications for this customer's orders
      const isCustomerOrder = customerIdentifier && 
        (order?.customerPhone === customerIdentifier || order?.customerEmail === customerIdentifier);
      
      if (isCustomerOrder) {
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
      }
    };

    // Listen for table service notifications (for dine-in)
    const handleTableService = (data) => {
      const { message, type, tableNumber, tableId } = data;
      
      // Only show table service notifications for the current customer's table
      if ((table?.number === tableNumber || table?.id === tableId) && isAuthenticated) {
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

    // Remove any existing listeners first to prevent duplicates
    socket.off('orderConfirmation');
    socket.off('statusUpdate'); // Now handled globally here
    socket.off('promotionalMessage');
    socket.off('deliveryUpdate');
    socket.off('tableService');

    // Register socket event listeners
    socket.on('orderConfirmation', handleOrderConfirmation);
    socket.on('statusUpdate', handleStatusUpdate); // Now handled globally here
    socket.on('promotionalMessage', handlePromotionalMessage);
    socket.on('deliveryUpdate', handleDeliveryUpdate);
    socket.on('tableService', handleTableService);

    // Cleanup listeners
    return () => {
      socket.off('orderConfirmation', handleOrderConfirmation);
      socket.off('statusUpdate', handleStatusUpdate); // Now handled globally here
      socket.off('promotionalMessage', handlePromotionalMessage);
      socket.off('deliveryUpdate', handleDeliveryUpdate);
      socket.off('tableService', handleTableService);
    };
  }, [socket, isConnected, table, branch, user?.phone, isAuthenticated]);

  // Track customer-specific orders when context initializes
  useEffect(() => {
    const fetchAndTrackCustomerOrders = async () => {
      if (!user || !isAuthenticated || !(user.phone || user.email || user.identifier)) return;
      
      try {
        // Import the api client dynamically to avoid circular dependencies
        const { api } = await import('../utils/apiClient');
        
        // Determine the customer identifier - prioritize phone, then email, then identifier
        const customerIdentifier = user.phone || user.email || user.identifier;
        
        const customerOrders = await api.public.orders.getByCustomerIdentifier(customerIdentifier);
        
        if (customerOrders && customerOrders.length > 0) {
          // Track all customer orders for notifications
          customerOrders.forEach(order => {
            if (order._id) {
              customerOrdersRef.current.add(String(order._id));
            }
          });
          
          console.log(`[NOTIFICATION CONTEXT] Tracked ${customerOrders.length} customer orders for notifications`);
        }
      } catch (error) {
        console.warn('[NOTIFICATION CONTEXT] Failed to fetch customer orders for tracking:', error);
      }
    };

    fetchAndTrackCustomerOrders();
  }, [user?.phone, user?.email, user?.identifier, isAuthenticated]);

  // Track customer orders for relevant notifications
  const trackCustomerOrder = (orderId) => {
    if (orderId) {
      // Ensure consistent string format
      const normalizedOrderId = String(orderId);
      const wasAlreadyTracked = customerOrdersRef.current.has(normalizedOrderId);
      customerOrdersRef.current.add(normalizedOrderId);
      
      if (!wasAlreadyTracked) {
        console.log('[NOTIFICATION CONTEXT] Now tracking order for notifications:', normalizedOrderId);
      }
    }
  };

  // Handle order status updates (called by OrdersView to avoid duplicate socket listeners)
  const handleOrderStatusUpdate = useCallback((data) => {
    const { orderNumber, orderId, newStatus, oldStatus, order } = data;
    const orderIdToCheck = String(orderId || order?._id || order?.id);
    
    // Check for rapid duplicates using debouncing
    const notificationKey = `${orderIdToCheck}-${newStatus}`;
    const lastTime = lastNotificationRef.current[notificationKey];
    const now = Date.now();
    
    if (lastTime && (now - lastTime) < 5000) {
      return;
    }
    
    lastNotificationRef.current[notificationKey] = now;
    
    // Determine the customer identifier
    const customerIdentifier = user?.phone || user?.email || user?.identifier;
    
    // Check if this is a customer order - only by customer identifier or tracked orders
    const isCustomerOrder = orderIdToCheck && (
      customerOrdersRef.current.has(orderIdToCheck) ||
      (customerIdentifier && 
       (order?.customerPhone === customerIdentifier || order?.customerEmail === customerIdentifier))
    );
    
    if (isCustomerOrder) {
      // Track this order for future updates if not already tracked
      if (orderIdToCheck && !customerOrdersRef.current.has(orderIdToCheck)) {
        customerOrdersRef.current.add(orderIdToCheck);
      }
      
      const statusConfig = getOrderStatusConfig(newStatus);
      
      addNotification({
        type: 'order_update',
        title: `Order #${orderNumber || order?.orderId || order?.orderNumber} ${statusConfig.title}`,
        message: statusConfig.message,
        icon: statusConfig.icon,
        priority: statusConfig.priority,
        orderId: orderIdToCheck,
        orderNumber: orderNumber || order?.orderId || order?.orderNumber,
        metadata: {
          oldStatus,
          newStatus,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [user?.phone, user?.email, user?.identifier, addNotification]);

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

  // Clear all notifications and tracked orders (for session cleanup)
  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    // Clear tracked customer orders for complete session cleanup
    customerOrdersRef.current.clear();
    // Clear last notification tracking
    lastNotificationRef.current = {};
  };

  // Get order status configuration
  const getOrderStatusConfig = (status) => {
    const configs = {
      'Pending': {
        title: 'Received',
        message: '✅ We\'ve received your order and will confirm it shortly. 🎉',
        icon: 'schedule',
        priority: 'medium'
      },
      'Processing': {
        title: 'Being Prepared',
        message: '👨‍🍳 Your order is now being prepared by our chefs. It’ll be ready to serve soon. ⏳',
        icon: 'restaurant',
        priority: 'high'
      },
      'Ready': {
        title: 'Ready for Pickup',
        message: '🔥 Your order is ready! You can pick it up at the counter or wait to be served at your table. 🍽️',
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
        message: `🥳 Your order has been delivered. Enjoy your delicious meal, and thank you for dining with ${(restaurant?.name || 'our restaurant')}${branch?.name ? ` – ${branch.name}` : ''}! 💚 We’d love to hear your feedback after your meal. 🙏`,
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
      message: `Your order has been ${status}.`,
      icon: 'check_circle',
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
    handleOrderStatusUpdate,
    getTimeAgo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
