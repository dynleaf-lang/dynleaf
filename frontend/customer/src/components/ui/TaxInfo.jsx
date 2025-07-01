import React from 'react';
import { useTax } from '../../context/TaxContext';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import { theme } from '../../data/theme';
import { motion } from 'framer-motion';

const TaxInfo = ({ subtotal }) => {
  const { 
    taxName, 
    formattedTaxRate, 
    calculateTax, 
    isLoading, 
    error, 
    isTaxActive
  } = useTax();
  
  // Calculate tax amount
  const taxAmount = calculateTax(subtotal);
  
  // If tax isn't active, show different message
  if (!isTaxActive) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text.secondary
      }}>
        <span>{taxName} (Not Applicable)</span>
        <span>-</span>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text.secondary
      }}>
        <span>Tax Loading...</span>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ 
            width: '16px', 
            height: '16px',
            border: '2px solid rgba(0,0,0,0.1)',
            borderTopColor: theme.colors.primary,
            borderRadius: '50%'
          }}
        />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.danger
      }}>
        <span>Tax (using default)</span>
        <span><CurrencyDisplay amount={taxAmount} /></span>
      </div>
    );
  }
  
  // Normal display
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text.secondary
    }}>
      <span>{taxName} ({formattedTaxRate})</span>
      <span><CurrencyDisplay amount={taxAmount} /></span>
    </div>
  );
};

export default React.memo(TaxInfo);
