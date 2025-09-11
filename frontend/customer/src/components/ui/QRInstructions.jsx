import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';
import QRDebugger from './QRDebugger';

const QRInstructions = () => {
  const { 
    error, 
    retryLastRequest, 
    loadRestaurantData, 
    loading, 
    initialized, 
    restaurant, 
    branch,
    retryCount 
  } = useRestaurant();
  
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Automatically check for URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('restaurantId');
    const branchId = urlParams.get('branchId');
    const tableId = urlParams.get('tableId');
    
    if (restaurantId && branchId) {
     loadRestaurantData(restaurantId, branchId, tableId || null);
    }
  }, [loadRestaurantData]);
  
  // Debug restaurant data in development mode only
  useEffect(() => {
    if (isDev && (restaurant || branch)) {
      // Development logging removed
    }
  }, [restaurant, branch, isDev]);
  
  // Get the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasParams = urlParams.has('restaurantId') && urlParams.has('branchId');
  
  // Determine the current state and what to display
  const getDisplayState = () => {
    // If we have URL params but no restaurant data loaded and there's an error
    if (hasParams && error && !loading) {
      return 'error';
    }
    
    // If we have URL params but still loading
    if (hasParams && loading) {
      return 'loading';
    }
    
    // If we have URL params but no restaurant data after initialization
    if (hasParams && initialized && (!restaurant || !branch)) {
      return 'failed';
    }
    
    // If no URL params, show QR scan instruction
    if (!hasParams) {
      return 'scan';
    }
    
    // Default - should not show this component if data is loaded successfully
    return 'hidden';
  };
  
  const displayState = getDisplayState();
  
  // Don't render if the state is hidden (successful load)
  if (displayState === 'hidden') {
    return null;
  }

  // Content based on display state
  const getContent = () => {
    switch (displayState) {
      case 'loading':
        return {
          emoji: '⏳',
          title: 'Loading Menu...',
          message: 'Please wait while we prepare your dining experience.',
          showRetry: false,
          isError: false
        };
      
      case 'error':
        return {
          emoji: '⚠️',
          title: 'Connection Issue',
          message: `We're having trouble loading the restaurant menu. ${error}`,
          showRetry: true,
          isError: true
        };
      
      case 'failed':
        return {
          emoji: '❌',
          title: 'Unable to Load Menu',
          message: retryCount > 0 
            ? 'We tried multiple times but couldn\'t load the restaurant data. Please check your connection and try again.'
            : 'The restaurant information couldn\'t be loaded. This might be a temporary issue.',
          showRetry: true,
          isError: true
        };
      
      case 'scan':
      default:
        return {
          emoji: '📱',
          title: 'Welcome to DynLeaf',
          message: 'Please scan the QR code on your table to view the restaurant menu and place your order.',
          showRetry: false,
          isError: false
        };
    }
  };
  
  const content = getContent();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        textAlign: "center",
        backgroundColor: theme.colors.background
      }}
    >
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        style={{
          backgroundColor: 'white',
          borderRadius: theme.borderRadius.xl,
          padding: "40px 30px",
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          maxWidth: "500px",
          width: "100%",
          border: content.isError ? `2px solid ${theme.colors.danger}20` : `2px solid ${theme.colors.primary}20`
        }}
      >
        {/* Status Icon */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            fontSize: "72px",
            marginBottom: "24px",
            filter: loading ? 'blur(1px)' : 'none'
          }}
        >
          {content.emoji}
        </motion.div>
        
        {/* Title */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            color: content.isError ? theme.colors.danger : theme.colors.primary,
            marginBottom: "20px",
            fontFamily: theme.typography.fontFamily.display,
            fontSize: theme.typography.sizes["2xl"],
            fontWeight: theme.typography.fontWeights.bold,
            margin: "0 0 20px 0"
          }}
        >
          {content.title}
        </motion.h2>
        
        {/* Message */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: theme.typography.sizes.lg,
            lineHeight: "1.6",
            marginBottom: "30px",
            color: theme.colors.text.primary,
            margin: "0 0 30px 0"
          }}
        >
          {content.message}
        </motion.p>
        
        {/* Loading indicator */}
        {displayState === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{
                width: '24px',
                height: '24px',
                border: `3px solid ${theme.colors.primary}20`,
                borderTop: `3px solid ${theme.colors.primary}`,
                borderRadius: '50%'
              }}
            />
            <span style={{ 
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm 
            }}>
              Loading restaurant data...
            </span>
          </motion.div>
        )}
        
        {/* Retry button */}
        {content.showRetry && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={retryLastRequest}
            disabled={loading}
            style={{
              backgroundColor: theme.colors.primary,
              color: "white",
              border: "none",
              borderRadius: theme.borderRadius.lg,
              padding: "14px 28px",
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              marginBottom: "20px",
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto 20px auto'
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>
              {loading ? 'hourglass_empty' : 'refresh'}
            </span>
            {loading ? 'Retrying...' : 'Try Again'}
          </motion.button>
        )}
        
        {/* Help text */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: "30px",
            padding: "20px",
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span className="material-icons" style={{ 
              fontSize: '20px',
              color: theme.colors.primary 
            }}>
              help_outline
            </span>
            <h4 style={{
              margin: 0,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary
            }}>
              Need Help?
            </h4>
          </div>
          <p style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary,
            margin: 0,
            lineHeight: '1.5'
          }}>
            {content.isError 
              ? "If this issue persists, please ask a staff member for assistance or try connecting to a different network."
              : "Look for a QR code on your table or ask any staff member to help you get started with digital ordering."
            }
          </p>
        </motion.div>
      </motion.div>
      
      {/* Include the debugger only in development mode and when there's an error */}
      {isDev && content.isError && <QRDebugger />}
    </motion.div>
  );
};

export default QRInstructions;