import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';
import QRDebugger from './QRDebugger';
import { debugRestaurantData } from '../../utils/debugUtils';

const QRInstructions = () => {
  const { error, retryLastRequest, loadRestaurantData } = useRestaurant();
  
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
  
  // Debug restaurant data
  const { restaurant, branch } = useRestaurant();
  useEffect(() => {
    // Debug the restaurant data whenever it changes
    if (restaurant || branch) {
      debugRestaurantData(restaurant, branch);
    }
  }, [restaurant, branch]);
  
  // Get the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasParams = urlParams.has('restaurantId') && urlParams.has('branchId');

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
        textAlign: "center"
      }}
    >
      <div style={{
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.lg,
        padding: "30px",
        boxShadow: theme.shadows.md,
        maxWidth: "500px",
        width: "100%"
      }}>
        <h2 style={{
          color: theme.colors.secondary,
          marginBottom: "20px",
          fontFamily: theme.typography.fontFamily.display
        }}>
          Welcome to OrderEase
        </h2>
        
        <div style={{
          fontSize: "60px",
          margin: "30px 0"
        }}>
          {hasParams ? '⚠️' : '📱 → 🍕'}
        </div>
        
        {hasParams ? (
          <p style={{
            fontSize: theme.typography.sizes.md,
            marginBottom: "30px",
            color: theme.colors.text.primary
          }}>
            We're having trouble connecting to the restaurant menu.
          </p>
        ) : (
          <p style={{
            fontSize: theme.typography.sizes.md,
            marginBottom: "30px",
            color: theme.colors.text.primary
          }}>
            Please scan a QR code from your table to view the restaurant menu.
          </p>
        )}
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: "#FEE2E2",
              color: "#B91C1C",
              padding: "12px",
              borderRadius: theme.borderRadius.md,
              marginTop: "15px",
              marginBottom: "20px",
              fontSize: theme.typography.sizes.sm
            }}
          >
            {error}
          </motion.div>
        )}
        
        {(error || hasParams) && (
          <button
            onClick={retryLastRequest}
            style={{
              backgroundColor: theme.colors.primary,
              color: "white",
              border: "none",
              borderRadius: theme.borderRadius.md,
              padding: "12px 24px",
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: "pointer",
              marginBottom: "20px",
              transition: "background-color 0.2s ease"
            }}
          >
            Try Again
          </button>
        )}
        
        <div style={{
          marginTop: "30px",
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.text.secondary
        }}>
          <p>If you're at the restaurant and having trouble with the QR code, please ask a staff member for assistance.</p>
        </div>
      </div>
      
      {/* Include the debugger in development mode or when there's an error */}
      {(isDev || error) && <QRDebugger />}
    </motion.div>
  );
};

export default QRInstructions;