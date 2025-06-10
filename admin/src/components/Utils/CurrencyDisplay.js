import React from 'react';
import { useCurrency } from '../../context/CurrencyContext';

/**
 * A reusable component to display prices with the user's branch currency symbol
 * 
 * @param {Object} props - Component props
 * @param {number} props.amount - The amount to display
 * @param {boolean} props.showCode - Whether to show the currency code (default: false)
 * @param {string} props.className - Additional CSS classes
 */
const CurrencyDisplay = ({ amount, showCode = false, className = '' }) => {
  // Get currency information from context
  const { currencySymbol, currencyCode, formatCurrency } = useCurrency();
  
  return (
    <span className={`currency-display ${className}`}>
      {formatCurrency(amount)}
      {showCode && ` ${currencyCode}`}
    </span>
  );
};

export default CurrencyDisplay;