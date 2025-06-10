import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { BranchContext } from './BranchContext';
import { RestaurantContext } from './RestaurantContext';
import { getUserBranchCurrencySymbol, getUserBranchCurrencyCode, formatCurrencyByCountry } from '../utils/currencyUtils';

// Create the Currency Context
export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  // Access required contexts
  const { user } = useContext(AuthContext);
  const { branches, fetchBranches } = useContext(BranchContext);
  const { restaurants, fetchRestaurants } = useContext(RestaurantContext);
  
  // State to store currency information
  const [currencySymbol, setCurrencySymbol] = useState('₹'); // Default to INR
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [countryCode, setCountryCode] = useState('DEFAULT');
  const [initialized, setInitialized] = useState(false);

  // Ensure we have loaded branch and restaurant data
  useEffect(() => {
    const loadData = async () => {
      console.log('CurrencyContext: Loading data for currency detection');
      
      if (user) {
        console.log('CurrencyContext: User detected', {
          id: user.id,
          role: user.role,
          branchId: user.branchId,
          restaurantId: user.restaurantId
        });
        
        // Load restaurants and branches if needed
        if (restaurants.length === 0) {
          console.log('CurrencyContext: Fetching restaurants');
          await fetchRestaurants();
        } else {
          console.log('CurrencyContext: Restaurants already loaded', restaurants.length);
        }
        
        if (branches.length === 0) {
          console.log('CurrencyContext: Fetching branches');
          await fetchBranches();
        } else {
          console.log('CurrencyContext: Branches already loaded', branches.length);
        }
        
        setInitialized(true);
      }
    };
    
    if (user && !initialized) {
      loadData();
    }
  }, [user, restaurants, branches, fetchRestaurants, fetchBranches, initialized]);

  // Update currency information when user, branches, or restaurants change
  useEffect(() => {
    if (!user || !initialized) return;
    
    console.log('CurrencyContext: Updating currency information', {
      userBranchId: user.branchId,
      userRestaurantId: user.restaurantId,
      branchesLoaded: branches.length,
      restaurantsLoaded: restaurants.length
    });
    
    // First check if user has a branch assigned
    if (user.branchId && branches.length > 0) {
      const userBranch = branches.find(branch => branch._id === user.branchId);
      console.log('CurrencyContext: User branch found?', !!userBranch, userBranch ? userBranch.country : 'N/A');
      
      if (userBranch && userBranch.country) {
        setCountryCode(userBranch.country);
        // Get currency symbol and code based on country
        const symbol = getUserBranchCurrencySymbol(user, branches, restaurants, userBranch.country);
        const code = getUserBranchCurrencyCode(user, branches, restaurants, userBranch.country);
        
        console.log('CurrencyContext: Setting currency from branch', {
          country: userBranch.country,
          symbol,
          code
        });
        
        setCurrencySymbol(symbol);
        setCurrencyCode(code);
        return;
      }
    }
    
    // If no branch or branch has no country, try from restaurant
    if (user.restaurantId && restaurants.length > 0) {
      const userRestaurant = restaurants.find(restaurant => restaurant._id === user.restaurantId);
      console.log('CurrencyContext: User restaurant found?', !!userRestaurant, userRestaurant ? userRestaurant.country : 'N/A');
      
      if (userRestaurant && userRestaurant.country) {
        setCountryCode(userRestaurant.country);
        // Get currency symbol and code based on country
        const symbol = getUserBranchCurrencySymbol(user, branches, restaurants, userRestaurant.country);
        const code = getUserBranchCurrencyCode(user, branches, restaurants, userRestaurant.country);
        
        console.log('CurrencyContext: Setting currency from restaurant', {
          country: userRestaurant.country,
          symbol,
          code
        });
        
        setCurrencySymbol(symbol);
        setCurrencyCode(code);
        return;
      }
    }
    
    // Fallback to default
    console.log('CurrencyContext: Using default currency (no branch/restaurant match)');
    setCountryCode('DEFAULT');
    const defaultSymbol = getUserBranchCurrencySymbol(null, [], [], 'DEFAULT');
    const defaultCode = getUserBranchCurrencyCode(null, [], [], 'DEFAULT');
    setCurrencySymbol(defaultSymbol);
    setCurrencyCode(defaultCode);
  }, [user, branches, restaurants, initialized]);

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