import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../data/theme';

// Enhanced EmptyCart component with improved visuals and animation
const EmptyCart = memo(() => (
  <motion.div
    key="empty-cart-container" // Add explicit key to prevent conflicts
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      textAlign: 'center',
      height: '100%',
      minHeight: '400px'
    }}
  >
    <motion.div 
      key="empty-cart-icon"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 15,
        delay: 0.2 
      }}
      style={{
        backgroundColor: theme.colors.background,
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: `1px dashed ${theme.colors.border}`
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="60"
        height="60"
        viewBox="0 0 24 24"
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.9 }}
      >
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
    </motion.div>
    
    <motion.div
      key="empty-cart-text"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 style={{
        fontSize: theme.typography.sizes['2xl'],
        fontWeight: theme.typography.fontWeights.bold,
        marginBottom: theme.spacing.md,
        color: theme.colors.text.primary,
        letterSpacing: '-0.01em'
      }}>
        Your cart is empty
      </h3>
      <p style={{
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xl,
        maxWidth: '280px',
        margin: '0 auto',
        lineHeight: 1.5
      }}>
        Browse the menu and add your favorite dishes to your cart
      </p>
    </motion.div>
    
    <motion.button
      key="empty-cart-button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      style={{
        marginTop: theme.spacing.xl,
        padding: `${theme.spacing.md} ${theme.spacing.xl}`,
        backgroundColor: theme.colors.primary + '15',
        color: theme.colors.primary,
        border: 'none',
        borderRadius: theme.borderRadius.md,
        fontWeight: theme.typography.fontWeights.medium,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.sm,
        transition: theme.transitions.fast
      }}
      onClick={() => {
        document.dispatchEvent(new CustomEvent('goToMenu'));
      }}
    >
      <span className="material-icons" style={{ fontSize: '20px' }}>restaurant_menu</span>
      Explore the menu
    </motion.button>
  </motion.div>
));

export default EmptyCart;
