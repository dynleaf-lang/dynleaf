import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dummyData } from '../data/dummyData';

// Create the context
const RestaurantContext = createContext(null);

// Provider component
const RestaurantProvider = ({ children }) => {
  // State for restaurant data
  const [restaurant, setRestaurant] = useState(null);
  const [branch, setBranch] = useState(null);
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Use refs to prevent unnecessary effect re-executions
  const initializationRef = useRef(false);

  // Helper to generate default category images based on category name
  const getDefaultCategoryImage = useCallback((categoryName) => {
    const categoryIcons = {
      'Appetizers': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
      'Starters': 'https://cdn-icons-png.flaticon.com/512/5787/5787212.png',
      'Main Course': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
      'Mains': 'https://cdn-icons-png.flaticon.com/512/2515/2515263.png',
      'Desserts': 'https://cdn-icons-png.flaticon.com/512/3081/3081967.png',
      'Drinks': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
      'Beverages': 'https://cdn-icons-png.flaticon.com/512/2405/2405469.png',
      'Soups': 'https://cdn-icons-png.flaticon.com/512/2276/2276931.png',
      'Salads': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
      'Burgers': 'https://cdn-icons-png.flaticon.com/512/3075/3075977.png',
      'Pizza': 'https://cdn-icons-png.flaticon.com/512/3132/3132693.png',
      'Pasta': 'https://cdn-icons-png.flaticon.com/512/2276/2276589.png',
      'Seafood': 'https://cdn-icons-png.flaticon.com/512/3082/3082040.png',
      'Breakfast': 'https://cdn-icons-png.flaticon.com/512/1147/1147805.png',
      'Lunch': 'https://cdn-icons-png.flaticon.com/512/1147/1147940.png',
      'Dinner': 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png',
      'Snacks': 'https://cdn-icons-png.flaticon.com/512/2515/2515325.png',
      'Sides': 'https://cdn-icons-png.flaticon.com/512/2515/2515183.png',
      'Uncategorized': 'https://cdn-icons-png.flaticon.com/512/1827/1827319.png',
    };
    
    // Return matching icon or default icon
    return categoryIcons[categoryName] || 'https://cdn-icons-png.flaticon.com/512/1147/1147801.png';
  }, []);
  
  // Function to load specific restaurant data (using dummy data)
  const loadSpecificRestaurantData = useCallback(async (restaurantId, branchId, tableId) => {
    try {
      console.log(`Loading dummy restaurant data`);
      setLoading(true);
      setError(null);
      
      // Simulate API load time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set all data from our dummy data
      setRestaurant(dummyData.restaurant);
      setBranch(dummyData.branch);
      setTable(dummyData.table);
      setMenuItems(dummyData.menuItems);
      setCategories(dummyData.categories);
      
      setInitialized(true);
      console.log('Dummy restaurant data initialized successfully');
    } catch (err) {
      console.error('Error loading dummy data:', err);
      setError('Failed to load restaurant data');
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to retry last failed request
  const retryLastRequest = useCallback(() => {
    setIsRetrying(true);
    loadSpecificRestaurantData();
  }, [loadSpecificRestaurantData]);
  
  // Function to load from QR code (using dummy data)
  const loadFromQrCode = useCallback(async (qrCodeData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API load time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set all data from our dummy data
      setRestaurant(dummyData.restaurant);
      setBranch(dummyData.branch);
      setTable(dummyData.table);
      setMenuItems(dummyData.menuItems);
      setCategories(dummyData.categories);
      
      setInitialized(true);
      console.log('Dummy restaurant data initialized from QR code successfully');
    } catch (err) {
      console.error('Error loading dummy data from QR:', err);
      setError('Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initialize from URL parameters if available
  useEffect(() => {
    // Skip if already initialized, currently loading, or already initializing
    if (initialized || loading || initializationRef.current) return;
    
    // Set a flag to prevent duplicate initialization
    initializationRef.current = true;
    
    const initFromUrlParams = async () => {
      try {
        // Use dummy data directly
        setLoading(true);
        
        // Simulate API load time
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Set all data from our dummy data
        setRestaurant(dummyData.restaurant);
        setBranch(dummyData.branch);
        setTable(dummyData.table);
        setMenuItems(dummyData.menuItems);
        setCategories(dummyData.categories);
        
        setInitialized(true);
        console.log('Dummy restaurant data initialized from URL successfully');
        return true;
      } catch (error) {
        console.error('Error initializing with dummy data:', error);
        setError('Failed to load restaurant data');
        return false;
      } finally {
        setLoading(false);
        // Reset initialization flag in case of success or error
        setTimeout(() => {
          initializationRef.current = false;
        }, 1000); // Small delay to prevent rapid consecutive attempts
      }
    };
    
    // Initialize with dummy data
    initFromUrlParams();
    
  }, []); // No dependencies to avoid render loops
  
  // Function to load all restaurant data in one call (using dummy data)
  const loadQrData = useCallback(async (restaurantId, branchId, tableId) => {
    try {
      console.log(`Loading dummy QR data`);
      setLoading(true);
      setError(null);
      
      // Simulate API load time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set all data from our dummy data
      setRestaurant(dummyData.restaurant);
      setBranch(dummyData.branch);
      setTable(dummyData.table);
      setMenuItems(dummyData.menuItems);
      setCategories(dummyData.categories);
      
      setInitialized(true);
      console.log('Dummy QR data initialized successfully');
    } catch (err) {
      console.error('Error loading dummy QR data:', err);
      setError('Failed to load restaurant data');
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    restaurant,
    branch,
    table,
    menuItems,
    categories,
    loading,
    error,
    initialized,
    retryCount,
    isRetrying,
    loadFromQrCode,
    loadSpecificRestaurantData,
    retryLastRequest
  }), [
    restaurant,
    branch,
    table,
    menuItems,
    categories,
    loading,
    error,
    initialized,
    retryCount,
    isRetrying,
    loadFromQrCode,
    loadSpecificRestaurantData,
    retryLastRequest
  ]);
  
  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  );
};

// Hook to use the context - define after the Provider component for better HMR support
export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

// Export the provider as default
export default RestaurantProvider;