import React from 'react';
import { useCurrency } from '../../context/CurrencyContext';

/**
 * A reusable component to display prices with the restaurant/branch currency symbol
 * 
 * @param {Object} props - Component props
 * @param {number} props.amount - The amount to display
 * @param {boolean} props.showCode - Whether to show the currency code (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
const CurrencyFormatter = ({ amount, showCode = false, className = '', style = {} }) => {
  // Get currency information from context
  const { currencySymbol, currencyCode, formatCurrency } = useCurrency();
  
  return (
    <span className={`currency-display ${className}`} style={style}>
      {formatCurrency(amount)}
      {showCode && ` ${currencyCode}`}
    </span>
  );
};

export default CurrencyFormatter;
