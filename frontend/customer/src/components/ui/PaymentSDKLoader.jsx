import React from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../data/theme';

/**
 * Component for handling Cashfree SDK loading states
 * Shows loading, error, and retry states
 */
export const PaymentSDKLoader = ({ 
  children, 
  sdkLoaded, 
  sdkError, 
  isLoading, 
  retryLoad, 
  canRetry,
  retryCount,
  maxRetries 
}) => {
  
  // Show error state
  if (sdkError && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: theme.spacing.xl,
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: theme.borderRadius.lg,
          border: '1px solid #fecaca',
          margin: theme.spacing.md + ' 0'
        }}
      >
        {/* Error Icon */}
        <div style={{
          fontSize: '48px',
          marginBottom: theme.spacing.md,
          color: theme.colors.danger
        }}>
          ⚠️
        </div>
        
        {/* Error Title */}
        <h3 style={{
          margin: `0 0 ${theme.spacing.sm} 0`,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.danger
        }}>
          Payment System Unavailable
        </h3>
        
        {/* Error Message */}
        <p style={{
          margin: `0 0 ${theme.spacing.md} 0`,
          fontSize: theme.typography.sizes.md,
          color: theme.colors.text.secondary,
          lineHeight: 1.5
        }}>
          {sdkError}
        </p>

        {/* Retry Counter */}
        {retryCount > 0 && (
          <p style={{
            margin: `0 0 ${theme.spacing.md} 0`,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.tertiary
          }}>
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}
        
        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {canRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={retryLoad}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                backgroundColor: theme.colors.danger,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.semibold,
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              Try Again
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.reload()}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              backgroundColor: 'transparent',
              color: theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            Refresh Page
          </motion.button>
        </div>

        {/* Troubleshooting Tips */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: '#f8fafc',
          borderRadius: theme.borderRadius.md,
          textAlign: 'left'
        }}>
          <h4 style={{
            margin: `0 0 ${theme.spacing.sm} 0`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary
          }}>
            Troubleshooting:
          </h4>
          <ul style={{
            margin: 0,
            paddingLeft: theme.spacing.md,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary,
            lineHeight: 1.5
          }}>
            <li>Check your internet connection</li>
            <li>Disable ad blockers temporarily</li>
            <li>Try refreshing the page</li>
            <li>Clear browser cache and cookies</li>
          </ul>
        </div>
      </motion.div>
    );
  }

  // Show loading state
  if (isLoading || !sdkLoaded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: theme.spacing.xl,
          textAlign: 'center'
        }}
      >
        {/* Loading Spinner */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(0,0,0,0.1)',
          borderTopColor: theme.colors.primary,
          animation: 'spin 1s linear infinite',
          margin: '0 auto ' + theme.spacing.md
        }} />
        
        {/* Loading Text */}
        <p style={{ 
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.md,
          margin: `0 0 ${theme.spacing.sm} 0`
        }}>
          Loading payment system...
        </p>

        {/* Additional info for slower connections */}
        <p style={{ 
          color: theme.colors.text.tertiary,
          fontSize: theme.typography.sizes.sm,
          margin: 0
        }}>
          This may take a few seconds
        </p>
      </motion.div>
    );
  }

  // SDK loaded successfully - render children
  return children;
};

export default PaymentSDKLoader;