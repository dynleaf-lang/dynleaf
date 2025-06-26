import React from 'react';
import { motion } from 'framer-motion';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';

const PreLoader = () => {
  const { loading, error, loadFromQrCode } = useRestaurant();
  
  // Function to load demo data
  const handleLoadDemoData = async () => {
    try {
      // This will load sample data without requiring a QR code
      await loadFromQrCode("test-mode");
    } catch (error) {
      console.error("Error loading demo data:", error);
    }
  };
  
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
        gap: "30px",
        padding: "20px",
        minHeight: "100vh",
        margin: "0 auto",
        backgroundColor: theme.colors.background
      }}
    >
      <div style={{
        textAlign: "center",
        marginBottom: "20px",
      }}>
        <motion.h1 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            fontFamily: theme.typography.fontFamily.display,
            fontSize: "36px",
            color: theme.colors.secondary,
            margin: "0 0 10px 0"
          }}
        >
          Order<span style={{ color: theme.colors.primary }}>Ease</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.typography.sizes.md,
            margin: 0
          }}
        >
          Your digital dining experience
        </motion.p>
      </div>
      
      {/* Animated loader */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 1.5
        }}
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          backgroundColor: theme.colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <span className="material-icons" style={{ fontSize: "40px", color: "white" }}>
          restaurant
        </span>
      </motion.div>
      
      <div style={{ width: "80%", maxWidth: "400px", textAlign: "center" }}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.typography.sizes.sm,
            marginBottom: "30px"
          }}
        >
          Preparing your dining experience...
        </motion.p>
        
        {/* Test mode button */}
        <motion.button 
          onClick={handleLoadDemoData}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            backgroundColor: theme.colors.secondary,
            color: "white",
            border: "none",
            padding: "12px 24px",
            width: "100%",
            borderRadius: theme.borderRadius.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: loading ? "wait" : "pointer",
            boxShadow: theme.shadows.md
          }}
        >
          {loading ? "Loading..." : "Load Demo Restaurant"}
        </motion.button>
      </div>
      
      {/* Error message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: "80%",
            maxWidth: "400px",
            backgroundColor: "#FEE2E2",
            color: "#B91C1C",
            padding: "12px",
            borderRadius: theme.borderRadius.md,
            textAlign: "center",
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium,
            marginTop: "20px"
          }}
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default PreLoader;
