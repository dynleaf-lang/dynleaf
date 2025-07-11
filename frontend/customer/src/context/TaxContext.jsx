import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useRestaurant } from './RestaurantContext';
import { api } from '../utils/apiClient';
import { getCachedData, setCachedData } from '../utils/cacheHelper';

// Create the Tax Context
export const TaxContext = createContext();

export const TaxProvider = ({ children }) => {
  // State for tax information
  const [taxRate, setTaxRate] = useState(0.1); // Default 10%
  const [taxName, setTaxName] = useState('Tax');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [taxDetails, setTaxDetails] = useState(null);

  // Get restaurant and branch from RestaurantContext
  const { restaurant, branch } = useRestaurant();

  // Get country code based on branch or restaurant settings
  const countryCode = useMemo(() => {
    if (branch && branch.country) {
      return branch.country;
    }
    
    if (restaurant && restaurant.country) {
      return restaurant.country;
    }
    
    return 'DEFAULT'; // Default country code
  }, [branch, restaurant]);  // Helper to normalize country codes
  const normalizeCountryCode = useCallback((code) => {
    if (!code) return 'DEFAULT';
    
    // Handle null, undefined, or empty strings
    if (!code || code.trim() === '') return 'DEFAULT';
    
    // If it's already a 2-letter code, use it directly (convert to uppercase)
    if (code.length === 2) return code.toUpperCase();
    
    // Common 2-letter country codes - comprehensive list for common variations
    const countryMappings = {
      // United Kingdom variations
      'UNITEDKINGDOM': 'GB',
      'UNITED KINGDOM': 'GB',
      'UK': 'GB',
      'U.K.': 'GB',
      'GREATBRITAIN': 'GB',
      'GREAT BRITAIN': 'GB',
      'ENGLAND': 'GB',
      'BRITAIN': 'GB',
      'GBR': 'GB',
      // United States variations
      'UNITEDSTATES': 'US',
      'UNITED STATES': 'US',
      'UNITEDSTATESOFAMERICA': 'US',
      'UNITED STATES OF AMERICA': 'US',
      'USA': 'US',
      'U.S.A.': 'US',
      'U.S.': 'US',
      'AMERICA': 'US',
      'ESTADOS UNIDOS': 'US',
      'ÉTATS-UNIS': 'US',
      // Canada variations
      'CANADA': 'CA',
      'CAN': 'CA',
    };
    
    // Remove spaces and convert to uppercase for consistent lookup
    const normalizedName = code.toUpperCase().replace(/\s+/g, '');
    
    // Return the mapped code or the original if no mapping exists
    return countryMappings[normalizedName] || code;
  }, []);
  // Fetch tax settings based on country code
  const fetchTaxSettings = useCallback(async (overrideCountryCode = null) => {
    // Use provided country code or fallback to context value
    let codeToUse = overrideCountryCode || countryCode;
    const originalCode = codeToUse;
    
    // Normalize the country code
    codeToUse = normalizeCountryCode(codeToUse);
    // Tax API: Code normalization
    
    // Even if the code is DEFAULT, try to fetch from the backend first
    // The backend has logic to handle DEFAULT as a special case
    
    // Check cache first (but skip cache for GB/UK codes until we fix the issue)
    const cacheKey = `tax_settings_${codeToUse}`;
    const cachedData = ['GB', 'UK'].includes(codeToUse) ? null : getCachedData(cacheKey);
    
    if (cachedData) {
      // Using cached tax settings
      setTaxDetails(cachedData);
      setTaxRate(cachedData.percentage / 100);
      setTaxName(cachedData.name);
      return;
    }
    
    setIsLoading(true);
    setError(null);    try {
      // Use the new API endpoint from our apiClient utility
      console.log(`Attempting to fetch tax info for country code: ${codeToUse}`);
      const response = await api.public.taxes.getByCountry(codeToUse);
        // Log the full response for debugging
      console.log('Tax API full response:', response);
      console.log('Response type:', typeof response);
      
      // The tax controller returns data in two possible formats:
      // 1. { success: true, data: {...} } - This is the standard format
      // 2. Direct tax object - This might happen with makeRequest implementation
      
      // Handle both formats gracefully
      const taxData = response?.data || response;
      
      if (taxData) {
        console.log('Tax data extracted:', taxData);
        
        // Update state with the tax info
        setTaxDetails(taxData);
        
        // Convert percentage to decimal for calculations (e.g., 10% -> 0.1)
        setTaxRate(taxData.percentage / 100);
        setTaxName(taxData.name);
        
        // Cache the response
        setCachedData(cacheKey, taxData, 30 * 60 * 1000); // Cache for 30 minutes
      } else {
        // If no tax found, set default values
        setTaxRate(0.1);
        setTaxName('Tax');
        setTaxDetails({
          country: codeToUse,
          name: 'Tax',
          percentage: 10,
          isCompound: false,
          active: true
        });
      }
    } catch (err) {
      console.error('Error fetching tax settings:', err);
      setError(err.message || 'Failed to fetch tax settings');
      
      // Set default values on error
      setTaxRate(0.1);
      setTaxName('Tax');
      setTaxDetails({
        country: countryCode,
        name: 'Tax',
        percentage: 10,
        isCompound: false,
        active: true
      });    } finally {
      setIsLoading(false);
    }
  }, [countryCode, normalizeCountryCode]);
  // Calculate tax amount based on the subtotal with error handling
  const calculateTax = useCallback((subtotal) => {
    // Input validation
    if (!subtotal || isNaN(subtotal)) {
      return 0;
    }
    
    // If there was an error fetching tax or tax isn't active, use fallback logic
    if (error || (taxDetails && !taxDetails.active)) {
      return 0;
    }
    
    // If taxRate is invalid for some reason, use a safe default
    if (isNaN(taxRate) || taxRate < 0) {
      console.warn('Invalid tax rate detected, using default 10%');
      return subtotal * 0.1; // Safe default of 10%
    }
    
    return subtotal * taxRate;
  }, [taxRate, taxDetails, error]);
  // Retry logic for fetching tax settings
  const retryFetchTaxSettings = useCallback(async (retries = 2, delay = 1000) => {
    let lastError = null;
    
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`Attempt ${i + 1} to fetch tax settings for ${countryCode}`);
        await fetchTaxSettings();
        
        // If we got here, the fetch was successful
        return;
      } catch (err) {
        lastError = err;
        console.warn(`Fetch attempt ${i + 1} failed:`, err);
        
        // If this isn't the last attempt, wait before retrying
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    // If we got here, all retries failed
    console.error(`Failed to fetch tax settings after ${retries + 1} attempts`);
    setError(lastError?.message || 'Failed to fetch tax settings after multiple attempts');
  }, [fetchTaxSettings, countryCode]);

  // Fetch tax settings when country code changes with retry logic
  useEffect(() => {
    retryFetchTaxSettings();
  }, [countryCode, retryFetchTaxSettings]);  // Context value
  const value = useMemo(() => ({
    taxRate,
    taxName,
    taxDetails,
    isLoading,
    error,
    calculateTax,
    countryCode,
    isTaxActive: taxDetails ? taxDetails.active : true,
    formattedTaxRate: `${(taxRate * 100).toFixed(1)}%`,
    // Expose useful functions
    fetchTaxSettings,
    normalizeCountryCode
  }), [taxRate, taxName, taxDetails, isLoading, error, calculateTax, countryCode, fetchTaxSettings, normalizeCountryCode]);

  return (
    <TaxContext.Provider value={value}>
      {children}
    </TaxContext.Provider>
  );
};

// Custom hook for using tax context
export const useTax = () => {
  const context = useContext(TaxContext);
  if (!context) {
    throw new Error('useTax must be used within a TaxProvider');
  }
  return context;
};
