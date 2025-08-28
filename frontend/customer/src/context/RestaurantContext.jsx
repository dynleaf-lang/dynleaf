import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../utils/apiClient';
import { getCachedData, setCachedData, clearCache } from '../utils/cacheHelper';
import { promiseWithTimeout } from '../utils/promiseWithTimeout';

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
  const [cacheEnabled, setCacheEnabled] = useState(true); // Default to using cache
  
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

  /**
   * Helper function to get a placeholder image for menu items
   */
  const getPlaceholderImage = useCallback((foodName = '') => {
    return `https://via.placeholder.com/150?text=${encodeURIComponent(foodName)}`;
  }, []);

  /**
   * Handle API connection failure with appropriate user feedback
   */
  const useFallbackData = useCallback((restaurantId, branchId, tableId) => { 
    // Set basic data structures to empty
    setRestaurant({
      name: "Connection Error",
      description: "Could not connect to restaurant data"
    });
    setBranch({
      name: "Unavailable"
    });
    setTable({
      name: "Unknown",
      tableNumber: "N/A" 
    });
    setMenuItems([]);
    
    // Set a single "All" category
    const allCategories = [{
      id: 'all',
      _id: 'all',
      name: 'All',
      image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
    }];
    setCategories(allCategories);
    
    // Set initialized to true but display error message
    setInitialized(true);
    console.error('API connection failed. Please check network connection and server status.');
  }, []);

  /**
   * Clear application cache and reload fresh data
   */
  const clearCacheAndReload = useCallback(() => {
    // Clear the API response cache
    clearCache(); 
    
    // Reset states
    setRetryCount(0);
    setError(null);
    
    // Force reload restaurant data
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('restaurantId');
    const branchId = urlParams.get('branchId');
    const tableId = urlParams.get('tableId');
    
    if (restaurantId && branchId && tableId) {
      loadRestaurantData(restaurantId, branchId, tableId);
    } else {
      setError('Missing required parameters (restaurantId, branchId, tableId)');
    }
  }, []);
  
  /**
   * Toggle caching on/off
   */
  const toggleCaching = useCallback(() => {
    setCacheEnabled(prev => !prev); 
  }, [cacheEnabled]);
  /**
   * Main function to load restaurant data
   */
  const loadRestaurantData = useCallback(async (restaurantId, branchId, tableId) => {
    if (!restaurantId || !branchId || !tableId) {
      console.error('Missing required parameters for loading restaurant data');
      setError('Missing required parameters. Please scan a valid QR code.');
      return;
    }
    
    setLoading(true);
    setError(null); 
    
    try {
      // Fetch all data with a timeout
      const fetchDataPromise = Promise.all([
        api.public.branches.getById(branchId),
        api.public.tables.getById(tableId),
        api.public.menus.getByBranch(branchId),
        api.public.menus.getCategories(branchId)
      ]);
      
      // Apply timeout to the Promise.all call
      const [branchData, tableData, menuItemsData, categoriesData] = await promiseWithTimeout(
        fetchDataPromise,
        15000,
        'Request timed out'
      );
        // Set restaurant and branch data      setRestaurant(branchData.restaurant || null);
      setBranch(branchData);
      setTable(tableData);
      
      // Check for sizeVariants before setting menuItems
    const processedMenuItems = (menuItemsData || []).map(item => {
        // Log any products with sizeVariants for debugging
        if (item.sizeVariants && item.sizeVariants.length > 0) {
          console.log(`RestaurantContext - Found menu item with sizeVariants:`, {
            id: item._id || item.id,
            name: item.name || item.title,
            sizeVariants: item.sizeVariants
          });
        }
        return {
          ...item,
      // Ensure variantGroups is passed through so UI can render options+
      variantGroups: item.variantGroups || [],
          sizeVariants: item.sizeVariants || [],
          variants: item.variants || [],
          sizes: item.sizes || []
        };
      });
      setMenuItems(processedMenuItems);
      
      // Process and set categories using our helper
      const processedCategories = processCategories(categoriesData);
      setCategories(processedCategories);
      
      setInitialized(true); 
      
      // Reset retry count on successful load
      if (retryCount > 0) {
        setRetryCount(0);
      }    } catch (err) {
      console.error('Error loading restaurant data:', err);
      // Create a more user-friendly error message
      const errorMessage = `Failed to load restaurant data: ${err.message}`;
      setError(errorMessage);
      
      // If we've reached max retry count (3) and still failing, show error UI
      if (retryCount >= 2) {
        console.warn(`Max retry count (${retryCount}) reached, showing error UI`);
        useFallbackData(restaurantId, branchId, tableId);
      } else {
        setInitialized(false);
        // Increment retry count for the retry mechanism
        setRetryCount(prevCount => prevCount + 1);
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [retryCount, useFallbackData, cacheEnabled]);
  
  // Function to retry last failed request
  const retryLastRequest = useCallback(() => {
    setIsRetrying(true);
    
    // Get URL parameters for the retry
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('restaurantId');
    const branchId = urlParams.get('branchId');
    const tableId = urlParams.get('tableId');
    
    if (restaurantId && branchId && tableId) {
      loadRestaurantData(restaurantId, branchId, tableId);
    } else {
      setIsRetrying(false);
      setError('Missing required parameters for retry');
    }
  }, [loadRestaurantData]);
  
  /**
   * Process QR code data and load restaurant information
   * @param {string} qrCodeData - The scanned QR code data
   */
  const loadFromQrCode = useCallback((qrCodeData) => {
    try {
      console.log('Processing QR code data:', qrCodeData);
      setLoading(true);
      setError(null);
      
      // Extract parameters from QR code
      // QR code should contain a URL with restaurantId, branchId, tableId
      // e.g., https://example.com?restaurantId=123&branchId=456&tableId=789
      const url = new URL(qrCodeData);
      const params = new URLSearchParams(url.search);
      
      const restaurantId = params.get('restaurantId');
      const branchId = params.get('branchId');
      const tableId = params.get('tableId');
      
      if (!restaurantId || !branchId || !tableId) {
        throw new Error('Invalid QR code. Missing required parameters.');
      }
      
      // Update the browser URL to include these parameters
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('restaurantId', restaurantId);
      currentUrl.searchParams.set('branchId', branchId);
      currentUrl.searchParams.set('tableId', tableId);
      window.history.replaceState({}, '', currentUrl);
      
      // Load restaurant data with the extracted parameters
      loadRestaurantData(restaurantId, branchId, tableId);
    } catch (error) {
      console.error('Error processing QR code:', error);
      setError(`Failed to process QR code: ${error.message}`);
      setLoading(false);
    }
  }, [loadRestaurantData]);

  // Initialize from URL parameters if available
  useEffect(() => {
    // Skip if already initialized, currently loading, or already initializing
    if (initialized || loading || initializationRef.current) return;
    
    // Set a flag to prevent duplicate initialization
    initializationRef.current = true;
    
    const initFromUrlParams = async () => {
      try {
        // Get URL parameters for restaurant, branch and table
        const urlParams = new URLSearchParams(window.location.search);
        const restaurantId = urlParams.get('restaurantId');
        const branchId = urlParams.get('branchId');
        const tableId = urlParams.get('tableId');
        
        // If we have all the required parameters, initialize with them
        if (restaurantId && branchId && tableId) {
          setLoading(true);        try {
            // Fetch all data with a timeout
            const fetchDataPromise = Promise.all([
              api.public.branches.getById(branchId),
              api.public.tables.getById(tableId),
              api.public.menus.getByBranch(branchId),
              api.public.menus.getCategories(branchId)
            ]);
            
            // Apply timeout to the Promise.all call
            const [branchData, tableData, menuItemsData, categoriesData] = await promiseWithTimeout(
              fetchDataPromise,
              15000,
              'Request timed out'
            );
            
            // Set restaurant and branch data
            setRestaurant(branchData.restaurant || null);
            setBranch(branchData);
            setTable(tableData);
            setMenuItems(menuItemsData || []);
            
            // Add "All" category if not already present
            const allCategories = categoriesData || [];
            const hasAllCategory = allCategories.some(cat => cat.name === 'All');
            if (!hasAllCategory) {
              allCategories.unshift({
                id: 'all',
                name: 'All',
                image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
              });
            }
            setCategories(allCategories);
            
            setInitialized(true); 
            return true;
          } catch (error) { 
            setError(`Failed to load restaurant data: ${error.message}`);
            
            // If we've reached max retry count (3) and still failing, use fallback data
            if (retryCount >= 2) {
              
              useFallbackData(restaurantId, branchId, tableId);
            } else {
              setInitialized(false);
              // Increment retry count for the retry mechanism
              setRetryCount(prevCount => prevCount + 1);
            }
            return false;
          }
        } else {
          // If we don't have URL parameters, don't initialize yet
          console.log('No URL parameters found for initialization');
          return false;
        }
      } catch (error) {
        console.error('Error initializing with URL parameters:', error);
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
    
    // Initialize with URL parameters
    initFromUrlParams();
    
  }, []); // No dependencies to avoid render loops
  
  // Function to load all restaurant data in one call (using dummy data)
  // This function is no longer used as we've removed dummy data
const loadQrData = useCallback(async (restaurantId, branchId, tableId) => {
    try { 
      setLoading(true);
      setError(null);
      
      // Simply redirect to the loadRestaurantData function
      await loadRestaurantData(restaurantId, branchId, tableId);
      
    } catch (err) {
      console.error('Error loading QR data:', err);
      setError('Failed to load restaurant data');
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  }, [loadRestaurantData]);
  
  /**
   * Process categories to ensure consistent format for menu filtering
   * @param {Array} categoriesData - Raw categories from API
   * @returns {Array} - Processed categories with consistent IDs
   */
  const processCategories = useCallback((categoriesData = []) => {
    // Start with provided data or empty array
    const allCategories = categoriesData || []; 
    
    // Add "All" category if not already present
    const hasAllCategory = allCategories.some(cat => 
      cat.name === 'All' || cat.id === 'all' || cat._id === 'all'
    );
    
    if (!hasAllCategory) {
      allCategories.unshift({
        _id: 'all', // Use _id to match backend format
        id: 'all',  // Keep id for legacy compatibility
        name: 'All',
        image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png'
      });
    }
    
    // Ensure each category has both id and _id for consistency
    return allCategories.map(cat => ({
      ...cat,
      id: cat.id || cat._id || `cat-${Math.random().toString(36).substr(2, 9)}`,
      _id: cat._id || cat.id || `cat-${Math.random().toString(36).substr(2, 9)}`
    }));
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
    loadRestaurantData,
    retryLastRequest,
    toggleCaching,
    clearCacheAndReload
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
    loadRestaurantData,
    retryLastRequest,
    toggleCaching,
    clearCacheAndReload
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