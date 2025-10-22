import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../data/theme';

/**
 * Professional Success Toast Notification
 * Shows immediately after payment success before the modal
 */
export const PaymentSuccessToast = ({ show, onComplete, order }) => {
  const [progress, setProgress] = useState(0);
  const duration = 2000; // 2 seconds

  useEffect(() => {
    if (show) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300); // Small delay before completing
        }
      }, 16); // ~60fps updates

      return () => clearInterval(interval);
    }
  }, [show, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: theme.spacing.xl,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            backgroundColor: 'white',
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing.lg,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            border: `2px solid ${theme.colors.success}`,
            minWidth: '320px',
            maxWidth: '400px'
          }}
        >
          {/* Success Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md
          }}>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: theme.colors.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="material-icons" style={{ 
                color: 'white', 
                fontSize: '24px' 
              }}>
                check
              </span>
            </motion.div>

            <div style={{ flex: 1 }}>
              <motion.h3
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  margin: 0,
                  fontSize: theme.typography.sizes.lg,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.success
                }}
              >
                Payment Successful!
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  margin: 0,
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.secondary
                }}
              >
                Order #{order?.orderId || order?.id || 'PENDING'} confirmed
              </motion.p>
            </div>

            {/* Checkmark Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              <span className="material-icons" style={{ 
                color: theme.colors.success, 
                fontSize: '24px' 
              }}>
                done_all
              </span>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: '4px',
            backgroundColor: theme.colors.success + '20',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: theme.spacing.sm
          }}>
            <motion.div
              style={{
                height: '100%',
                backgroundColor: theme.colors.success,
                borderRadius: '2px'
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Status Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              margin: 0,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.tertiary,
              textAlign: 'center'
            }}
          >
            Preparing order details...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentSuccessToast;