import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../data/theme';
import { useOrderType } from '../ui/EnhancedCart'; // Import from EnhancedCart.jsx that contains the context

// Enhanced OrderTypeSelector component with animations and better visuals
const OrderTypeSelector = memo(() => {
  const { orderType, setOrderType } = useOrderType();

  // Animation variants for the button transition
  const buttonVariants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    tap: { scale: 0.97 },
    hover: { y: -2 }
  };

  const handleTypeChange = (type) => {
    if (type === orderType) return;
    setOrderType(type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
        padding: `${theme.spacing.md} 0`,
        marginBottom: theme.spacing.md,
      }}
    >
      <h4 style={{
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.fontWeights.semibold,
        margin: 0,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs
      }}>
        How would you like to receive your order?
      </h4>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: theme.spacing.md,
        position: 'relative',
        padding: `${theme.spacing.xs} 0`,
      }}>
        <motion.button
          variants={buttonVariants}
          initial="initial"
          animate="animate"
          whileTap="tap"
          whileHover="hover"
          transition={{ delay: 0.2 }}
          onClick={() => handleTypeChange('dineIn')}
          style={{
            flex: 1,
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.md,
            border: 'none',
            background: orderType === 'dineIn' ? theme.colors.primary : theme.colors.background,
            color: orderType === 'dineIn' ? theme.colors.text.light : theme.colors.text.primary,
            cursor: 'pointer',
            fontWeight: orderType === 'dineIn' ? theme.typography.fontWeights.semibold : theme.typography.fontWeights.medium,
            boxShadow: orderType === 'dineIn' ? theme.shadows.md : theme.shadows.sm,
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>
            restaurant
          </span>
          Dine In
        </motion.button>
        
        <motion.button
          variants={buttonVariants}
          initial="initial"
          animate="animate"
          whileTap="tap"
          whileHover="hover"
          transition={{ delay: 0.3 }}
          onClick={() => handleTypeChange('takeaway')}
          style={{
            flex: 1,
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.md,
            border: 'none',
            background: orderType === 'takeaway' ? theme.colors.primary : theme.colors.background,
            color: orderType === 'takeaway' ? theme.colors.text.light : theme.colors.text.primary,
            cursor: 'pointer',
            fontWeight: orderType === 'takeaway' ? theme.typography.fontWeights.semibold : theme.typography.fontWeights.medium,
            boxShadow: orderType === 'takeaway' ? theme.shadows.md : theme.shadows.sm,
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>
            takeout_dining
          </span>
          Takeaway
        </motion.button>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.text.secondary,
          padding: `0 ${theme.spacing.xs}`,
          textAlign: 'center'
        }}
      >
        {orderType === 'dineIn' ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs }}>
            <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.success }}>
              info
            </span>
            Your order will be served to your table
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs }}>
            <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.success }}>
              info
            </span>
            Your order will be prepared for pickup
          </span>
        )}
      </motion.div>
    </motion.div>
  );
});

// Original OrderTypeSelector with props for backward compatibility
export const SimpleOrderTypeSelector = memo(({ orderType, setOrderType }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: `${theme.spacing.md} 0`,
      marginBottom: theme.spacing.md,
    }}>
      <button
        onClick={() => setOrderType('dineIn')}
        style={{
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          border: 'none',
          background: orderType === 'dineIn' ? theme.colors.primary : theme.colors.background,
          color: orderType === 'dineIn' ? theme.colors.text.light : theme.colors.text.primary,
          cursor: 'pointer',
          fontWeight: theme.typography.fontWeights.medium,
          boxShadow: orderType === 'dineIn' ? theme.shadows.md : theme.shadows.sm,
          transition: theme.transitions.fast
        }}
      >
        Dine In
      </button>
      
      <button
        onClick={() => setOrderType('takeaway')}
        style={{
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          border: 'none',
          background: orderType === 'takeaway' ? theme.colors.primary : theme.colors.background,
          color: orderType === 'takeaway' ? theme.colors.text.light : theme.colors.text.primary,
          cursor: 'pointer',
          fontWeight: theme.typography.fontWeights.medium,
          boxShadow: orderType === 'takeaway' ? theme.shadows.md : theme.shadows.sm,
          transition: theme.transitions.fast
        }}
      >
        Takeaway
      </button>
    </div>
  );
});

export default OrderTypeSelector;
