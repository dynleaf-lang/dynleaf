import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getCurrencyConfig, formatCurrency as formatCurrencyUtil } from '../utils/currencyUtils';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  const [currencyConfig, setCurrencyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = getApiBase();

  // Fetch branch/restaurant country information
  useEffect(() => {
    if (user?.branchId || user?.restaurantId) {
      fetchBranchCountry();
    } else {
      // Use default currency if no branch/restaurant info
      setCurrencyConfig(getCurrencyConfig('DEFAULT'));
      setLoading(false);
    }
  }, [user]);

  const fetchBranchCountry = async () => {
    try {
      setLoading(true);
      setError(null);

      let countryCode = 'DEFAULT';

      // Try to get country from branch first
      if (user?.branchId) {
        try {
          const branchResponse = await axios.get(`${API_BASE_URL}/public/branches/${user.branchId}`);
          if (branchResponse.data?.branch?.country) {
            countryCode = branchResponse.data.branch.country; 
          }
        } catch (branchError) {
          console.warn('Could not fetch branch country:', branchError.message);
        }
      }

      // If no branch country, try restaurant
      if (countryCode === 'DEFAULT' && user?.restaurantId) {
        try {
          const restaurantResponse = await axios.get(`${API_BASE_URL}/public/restaurants/${user.restaurantId}`);
          if (restaurantResponse.data?.restaurant?.country) {
            countryCode = restaurantResponse.data.restaurant.country; 
          }
        } catch (restaurantError) {
          console.warn('Could not fetch restaurant country:', restaurantError.message);
        }
      }

      // If still no country found, check user profile
      if (countryCode === 'DEFAULT' && user?.country) {
        countryCode = user.country; 
      }

      // Set currency configuration
      const config = getCurrencyConfig(countryCode);
      setCurrencyConfig(config); 

    } catch (error) {
      console.error('Error fetching country information:', error);
      setError('Failed to load currency settings');
      
      // Fallback to default currency
      setCurrencyConfig(getCurrencyConfig('DEFAULT'));
    } finally {
      setLoading(false);
    }
  };

  // Memoize a default formatter for the active currency; override options build a one-off
  const defaultFormatter = useMemo(() => {
    if (!currencyConfig) return null;
    try {
      return new Intl.NumberFormat(currencyConfig.locale, {
        style: 'currency',
        currency: currencyConfig.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    } catch (_) {
      return null;
    }
  }, [currencyConfig?.locale, currencyConfig?.currency]);

  /**
   * Format currency amount using the current branch's currency settings
   */
  const formatCurrency = useCallback((amount, options = {}) => {
    if (!currencyConfig) {
      return `$${Number(amount || 0).toFixed(0)}`;
    }

    const {
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
      useSymbol = false
    } = options;

    try {
      if (useSymbol) {
        return `${currencyConfig.symbol}${Number(amount || 0).toFixed(minimumFractionDigits)}`;
      }

      // Use default memoized formatter when options match defaults
      if (minimumFractionDigits === 0 && maximumFractionDigits === 2 && defaultFormatter) {
        return defaultFormatter.format(amount || 0);
      }

      // Fallback to ad-hoc formatter when custom options are requested
      const fmt = new Intl.NumberFormat(currencyConfig.locale, {
        style: 'currency',
        currency: currencyConfig.currency,
        minimumFractionDigits,
        maximumFractionDigits
      });
      return fmt.format(amount || 0);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currencyConfig.symbol}${Number(amount || 0).toFixed(0)}`;
    }
  }, [currencyConfig, defaultFormatter]);

  /**
   * Get the currency symbol for the current branch
   * @returns {string} Currency symbol
   */
  const getCurrencySymbol = useCallback(() => currencyConfig?.symbol || '$', [currencyConfig?.symbol]);

  /**
   * Get the currency code for the current branch
   * @returns {string} Currency code (e.g., 'USD', 'EUR', 'INR')
   */
  const getCurrencyCode = useCallback(() => currencyConfig?.currency || 'USD', [currencyConfig?.currency]);

  /**
   * Get the locale for the current branch
   * @returns {string} Locale string
   */
  const getLocale = useCallback(() => currencyConfig?.locale || 'en-US', [currencyConfig?.locale]);

  /**
   * Refresh currency configuration (useful when branch changes)
   */
  const refreshCurrency = useCallback(() => {
    if (user?.branchId || user?.restaurantId) {
      fetchBranchCountry();
    }
  }, [user?.branchId, user?.restaurantId]);

  const value = useMemo(() => ({
    currencyConfig,
    loading,
    error,
    formatCurrency,
    getCurrencySymbol,
    getCurrencyCode,
    getLocale,
    refreshCurrency,
    // Additional utility functions
    isLoading: loading,
    hasError: !!error,
    isReady: !loading && !error && currencyConfig
  }), [currencyConfig, loading, error, formatCurrency, getCurrencySymbol, getCurrencyCode, getLocale, refreshCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
