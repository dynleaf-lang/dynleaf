import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import { theme } from '../../data/theme';

const NotificationToast = () => {
  const { notifications } = useNotifications();
  const [toastNotifications, setToastNotifications] = useState([]);

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      // Check if this notification is already shown as toast
      const alreadyShown = toastNotifications.some(toast => toast.id === latestNotification.id);
      
      if (!alreadyShown && !latestNotification.read) {
        // Add to toast list
        setToastNotifications(prev => [...prev, {
          ...latestNotification,
          toastId: `toast-${latestNotification.id}-${Date.now()}`
        }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
          setToastNotifications(prev => 
            prev.filter(toast => toast.id !== latestNotification.id)
          );
        }, 5000);
      }
    }
  }, [notifications]);

  const removeToast = (notificationId) => {
    setToastNotifications(prev => 
      prev.filter(toast => toast.id !== notificationId)
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
      maxWidth: '400px'
    }}>
      <AnimatePresence>
        {toastNotifications.map((notification) => (
          <motion.div
            key={notification.toastId}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              background: 'white',
              borderRadius: theme.borderRadius.lg,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              border: `1px solid ${theme.colors.border}`,
              padding: theme.spacing.md,
              minWidth: '300px',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing.sm
            }}
          >
            {/* Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span className="material-icons" style={{
                fontSize: '20px',
                color: theme.colors.primary
              }}>
                {notification.icon || 'notifications'}
              </span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: theme.typography.fontWeights.semibold,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.xs,
                lineHeight: 1.4
              }}>
                {notification.title}
              </div>
              <div style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                lineHeight: 1.4
              }}>
                {notification.message}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => removeToast(notification.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: theme.spacing.xs,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.text.secondary,
                flexShrink: 0
              }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationToast;
