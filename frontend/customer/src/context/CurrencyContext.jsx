import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { useRestaurant } from './RestaurantContext';
import { getCurrencySymbol, getCurrencyCode, formatCurrencyByCountry } from '../utils/currencyUtils';

// Create the Currency Context
export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  // Access required contexts
  const { restaurant, branch } = useRestaurant();
  
  // State to store currency information
  const [currencySymbol, setCurrencySymbol] = useState('₹'); // Default to INR
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [countryCode, setCountryCode] = useState('DEFAULT');

 

  // Update currency information when branch or restaurant changes
  useEffect(() => {
    // First check if we have branch information with country
    if (branch && branch.country) {


      setCountryCode(branch.country);
 
      

      // Get currency symbol and code based on country
      const symbol = getCurrencySymbol(branch.country);
      const code = getCurrencyCode(branch.country);
      
      setCurrencySymbol(symbol);
      setCurrencyCode(code);
      return;
    }
    
    // If no branch or branch has no country, try from restaurant
    if (restaurant && restaurant.country) {
      setCountryCode(restaurant.country);
      // Get currency symbol and code based on country
      const symbol = getCurrencySymbol(restaurant.country);
      const code = getCurrencyCode(restaurant.country);
      
      setCurrencySymbol(symbol);
      setCurrencyCode(code);
      return;
    }
    
    // Fallback to default
    setCountryCode('DEFAULT');
    const defaultSymbol = getCurrencySymbol('DEFAULT');
    const defaultCode = getCurrencyCode('DEFAULT');
    setCurrencySymbol(defaultSymbol);
    setCurrencyCode(defaultCode);
  }, [restaurant, branch]);

  // Create a format function with the current country code baked in
  const formatCurrency = useMemo(() => {
    return (amount) => formatCurrencyByCountry(amount, countryCode);
  }, [countryCode]);

  // Context value
  const value = {
    currencySymbol,
    currencyCode,
    countryCode,
    formatCurrency
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook for easy access to the currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
