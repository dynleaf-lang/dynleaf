import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

/**
 * Hook to handle order-related notifications
 * Use this hook in components that place orders to track them for notifications
 */
export const useOrderNotifications = () => {
  const { trackCustomerOrder, addNotification } = useNotifications();

  // Function to track a new order for notifications (without creating immediate notification)
  const trackOrder = (order) => {
    if (order && (order._id || order.id)) {
      const orderId = order._id || order.id;
      trackCustomerOrder(orderId);
      return orderId;
    }
    return null;
  };

  // Function to track order AND create immediate confirmation notification
  const trackOrderWithNotification = (order) => {
    if (order && (order._id || order.id)) {
      const orderId = order._id || order.id;
      trackCustomerOrder(orderId);

      // Add immediate confirmation notification
      addNotification({
        type: 'order_confirmation',
        title: 'Order Placed Successfully!',
        message: `✅ Your order #${order.orderId || order.orderNumber || orderId} has been placed successfully! Our team will review it shortly and get it confirmed. 🎉`,
        icon: 'check_circle',
        priority: 'high',
        orderId: orderId,
        orderNumber: order.orderId || order.orderNumber,
        metadata: {
          totalAmount: order.totalAmount || order.total,
          estimatedTime: order.estimatedTime || '15-20 minutes',
          timestamp: new Date().toISOString()
        }
      });

      return orderId;
    }
    return null;
  };

  // Function to add a custom notification
  const addCustomNotification = (notificationData) => {
    return addNotification(notificationData);
  };

  return {
    trackOrder,
    trackOrderWithNotification,
    addCustomNotification
  };
};

export default useOrderNotifications;
