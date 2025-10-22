import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../data/theme';

/**
 * Professional Payment Status Tracker
 * Shows real-time payment processing status with animations
 */
export const PaymentStatusTracker = ({ 
  status, 
  message, 
  show, 
  onRetry, 
  onCancel,
  onClose,
  canRetry = false,
  retryCount = 0,
  maxRetries = 3,
  // New props for verification
  verificationProgress = 0,
  verificationStep = '',
  verificationAttempts = 0,
  maxVerificationAttempts = 6
}) => {
  const [dots, setDots] = useState('');

  // Animated dots for loading states
  useEffect(() => {
    if (status === 'pending' || status === 'processing' || status === 'verifying') {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
    setDots('');
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'schedule',
          color: theme.colors.warning,
          backgroundColor: theme.colors.warning + '10',
          borderColor: theme.colors.warning + '30',
          title: 'Payment Processing',
          showProgress: true
        };
      case 'processing':
        return {
          icon: 'payment',
          color: theme.colors.primary,
          backgroundColor: theme.colors.primary + '10',
          borderColor: theme.colors.primary + '30',
          title: 'Processing Payment',
          showProgress: true
        };
      case 'verifying':
        return {
          icon: 'verified_user',
          color: theme.colors.info || theme.colors.primary,
          backgroundColor: (theme.colors.info || theme.colors.primary) + '10',
          borderColor: (theme.colors.info || theme.colors.primary) + '30',
          title: 'Verifying Payment',
          showProgress: true,
          showVerificationProgress: true
        };
      case 'success':
        return {
          icon: 'check_circle',
          color: theme.colors.success,
          backgroundColor: theme.colors.success + '10',
          borderColor: theme.colors.success + '30',
          title: 'Payment Successful',
          showProgress: false
        };
      case 'failed':
        return {
          icon: 'error',
          color: theme.colors.danger,
          backgroundColor: theme.colors.danger + '10',
          borderColor: theme.colors.danger + '30',
          title: 'Payment Failed',
          showProgress: false
        };
      case 'cancelled':
        return {
          icon: 'cancel',
          color: theme.colors.text.secondary,
          backgroundColor: theme.colors.text.secondary + '10',
          borderColor: theme.colors.text.secondary + '30',
          title: 'Payment Cancelled',
          showProgress: false
        };
      default:
        return {
          icon: 'info',
          color: theme.colors.text.secondary,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          title: 'Payment Status',
          showProgress: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: theme.spacing.md
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              backgroundColor: 'white',
              borderRadius: theme.borderRadius.xl,
              padding: theme.spacing.xl,
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              border: `2px solid ${config.borderColor}`,
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
            }}
          >
            {/* Status Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: config.backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto ' + theme.spacing.lg,
                border: `2px solid ${config.borderColor}`
              }}
            >
              {config.showProgress ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `3px solid ${config.color}30`,
                    borderTop: `3px solid ${config.color}`,
                    borderRadius: '50%'
                  }}
                />
              ) : (
                <span 
                  className="material-icons"
                  style={{ 
                    fontSize: '40px', 
                    color: config.color 
                  }}
                >
                  {config.icon}
                </span>
              )}
            </motion.div>

            {/* Status Title */}
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                margin: `0 0 ${theme.spacing.md} 0`,
                fontSize: theme.typography.sizes.xl,
                fontWeight: theme.typography.fontWeights.bold,
                color: config.color
              }}
            >
              {config.title}{config.showProgress ? dots : ''}
            </motion.h3>

            {/* Status Message */}
            {(message || (status === 'verifying' && verificationStep)) && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  margin: `0 0 ${theme.spacing.lg} 0`,
                  fontSize: theme.typography.sizes.md,
                  color: theme.colors.text.secondary,
                  lineHeight: 1.5
                }}
              >
                {status === 'verifying' && verificationStep ? verificationStep : message}
              </motion.p>
            )}

            {/* Verification Progress Bar */}
            {config.showVerificationProgress && status === 'verifying' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ 
                  marginBottom: theme.spacing.lg,
                  width: '100%'
                }}
              >
                <div style={{
                  marginBottom: theme.spacing.sm,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.secondary
                }}>
                  <span>Verification Progress</span>
                  <span>{verificationAttempts}/{maxVerificationAttempts} attempts</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: config.color + '20',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${verificationProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      backgroundColor: config.color,
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <div style={{
                  marginTop: theme.spacing.xs,
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.secondary,
                  textAlign: 'center'
                }}>
                  This may take up to 30 seconds while we confirm with your bank
                </div>
              </motion.div>
            )}

            {/* Progress Indicators */}
            {config.showProgress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                style={{ marginBottom: theme.spacing.lg }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.md
                }}>
                  {[1, 2, 3].map((step) => (
                    <motion.div
                      key={step}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 1, 0.3]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: (step - 1) * 0.2
                      }}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: config.color
                      }}
                    />
                  ))}
                </div>
                
                <p style={{
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.tertiary,
                  margin: 0
                }}>
                  Please don't close this window
                </p>
              </motion.div>
            )}

            {/* Action Buttons */}
            {(status === 'failed' || status === 'cancelled') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  display: 'flex',
                  gap: theme.spacing.md,
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}
              >
                {canRetry && retryCount < maxRetries && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      borderRadius: theme.borderRadius.lg,
                      backgroundColor: theme.colors.primary,
                      color: 'white',
                      border: 'none',
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '20px' }}>
                      refresh
                    </span>
                    Try Again
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onCancel}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.borderRadius.lg,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.medium,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '20px' }}>
                    close
                  </span>
                  Cancel
                </motion.button>
              </motion.div>
            )}

            {/* Retry Counter */}
            {retryCount > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: theme.spacing.md,
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.tertiary,
                  margin: 0
                }}
              >
                Attempt {retryCount + 1} of {maxRetries + 1}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentStatusTracker;