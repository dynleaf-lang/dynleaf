import React, { createContext, useContext, useState, useEffect } from 'react';
// Use the apiClient implementation
import { api } from '../utils/apiClient';
import { useRestaurant } from './RestaurantContext';
import { ensureCategories, categorizeMenuItem } from '../utils/categoryMiddleware';

// Create the context
const MenuContext = createContext();

// Hook to use the context
export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

// Provider component
export const MenuProvider = ({ children }) => {
  console.log('MenuProvider initializing...'); // This should appear in your console when the component mounts
  
  const { restaurant, branch, initialized, categories: restaurantCategories } = useRestaurant();
  
  // State
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredItems, setFilteredItems] = useState([]);
 
  
  
  // Fetch menu items whenever restaurant or branch changes
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!restaurant || !branch) return;
       
      
      try {
        setLoading(true);
        
        // Add debugging before API call
        console.log("%c Fetching menu data for: ", "background: #007bff; color: white; font-size: 14px", { 
          restaurantId: restaurant._id,
          branchId: branch._id 
        });
          // Get menu items for this restaurant and branch
        // Note: apiClient.js doesn't have getByRestaurantAndBranch, using getByBranch instead
        let menuData;        try {          console.log("%c BEFORE API CALL", "background: red; color: white; font-size: 16px", { branchId: branch._id });
          console.log("API structure:", {
            hasPublic: !!api.public,
            publicProps: api.public ? Object.keys(api.public) : [],
            hasMenus: api.public ? !!api.public.menus : false,
            menuProps: api.public && api.public.menus ? Object.keys(api.public.menus) : []
          });
          
          // Using branch ID only as that's what apiClient supports
          // FIXED: The correct path is api.public.menus.getByBranch, not menuItems
          menuData = await api.public.menus.getByBranch(branch._id);
          
          console.log("%c MenuData raw:", "background: #222; color: #bada55; font-size: 16px", menuData);
          console.log("MenuData plain log:", menuData); // Plain log as backup
         
          if (!menuData || (Array.isArray(menuData) && menuData.length === 0)) {
            console.warn("API returned empty menu data");
          }        } catch (apiError) {
          console.error("%c API CALL FAILED", "background: red; color: white; font-size: 16px", apiError);
          console.error("API call failed - Error details:", {
            message: apiError.message,
            stack: apiError.stack,
            response: apiError.response ? {
              status: apiError.response.status,
              data: apiError.response.data
            } : 'No response data'
          });
          throw apiError;
        }
          // Check if any menu items have sizeVariants
        const itemsWithSizeVariants = menuData.filter(item => 
          item.sizeVariants && Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0
        );
        
        if (itemsWithSizeVariants.length > 0) {
          console.log("Found menu items with sizeVariants:", itemsWithSizeVariants.length);
          console.log("First item sizeVariants:", itemsWithSizeVariants[0].sizeVariants);
        } else {
          console.log("No menu items with sizeVariants found in raw data");
        }
        
        // Process menu items to match the expected format
        const processedMenuItems = menuData.map(item => {
          // Preserve the original sizeVariants data
          const sizeVariantData = item.sizeVariants || [];
          
          console.log("Processing menu item:", item.name || item.title, 
            "has sizeVariants:", sizeVariantData.length > 0,
            "sizeVariants count:", sizeVariantData.length);
          
          return {
            id: item._id || item.id, // Handle both formats
            title: item.name || item.title, // Handle both formats
            subtitle: item.description || item.subtitle || '',
            description: item.description || '',
            // Use the first size variant price if available, otherwise use the item price
            price: item.price,
            image: item.imageUrl || item.image || 'https://via.placeholder.com/300',
            // Extract category data
            category: item.categoryId ? 
                      (typeof item.categoryId === 'object' ? item.categoryId.name : categorizeMenuItem(item)) 
                      : categorizeMenuItem(item),
            categoryId: item.categoryId ? 
                        (typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId) 
                        : null,
            available: item.available !== false,
            popular: item.popular || false,
            restaurantId: item.restaurantId,
            branchId: item.branchId || [],
            options: item.options || [],
            // Explicitly preserve the sizeVariants
            sizeVariants: sizeVariantData,
            variants: item.variants || [],
            sizes: item.sizes || []
          };
        });
        
        setMenuItems(processedMenuItems);
          // Check if sizeVariants were preserved after processing
        const processedItemsWithSizeVariants = processedMenuItems.filter(item => 
          item.sizeVariants && Array.isArray(item.sizeVariants) && item.sizeVariants.length > 0
        );
        
        if (processedItemsWithSizeVariants.length > 0) {
          console.log("Processed menu items with sizeVariants:", processedItemsWithSizeVariants.length);
          console.log("Example item with sizeVariants:", {
            itemName: processedItemsWithSizeVariants[0].title,
            sizeVariantCount: processedItemsWithSizeVariants[0].sizeVariants.length,
            firstVariant: processedItemsWithSizeVariants[0].sizeVariants[0]
          });
          
          // Log more details about ALL items with sizeVariants for debugging
          console.table(processedItemsWithSizeVariants.map(item => ({
            name: item.title,
            sizeVariantCount: item.sizeVariants.length,
            hasVariantPrices: item.sizeVariants.some(v => v.price !== undefined),
            basePrice: item.price
          })));
        } else {
          console.log("No sizeVariants found in processed menu items");
          
          if (itemsWithSizeVariants.length > 0) {
            console.error("ERROR: sizeVariants were lost during processing!");
          }
        }
        
        // Extract unique categories from menu items
        const uniqueCategoriesFromItems = ['All', ...new Set(
          processedMenuItems
            .filter(item => item.category)
            .map(item => item.category)
        )];
        
        console.log('Categories from items:', uniqueCategoriesFromItems);
        
        // Ensure we have a complete set of categories
        let finalCategories;
        
        // Try to use restaurant categories if available
        if (restaurantCategories && restaurantCategories.length > 1) {
          console.log('Using restaurant categories:', restaurantCategories);
          finalCategories = restaurantCategories.map(cat => cat.name);
        } else {
          console.log('Using categories extracted from items:', uniqueCategoriesFromItems);
          finalCategories = uniqueCategoriesFromItems;
        }
        
        // Apply our middleware to ensure we have proper categories
        const enhancedCategories = ensureCategories(finalCategories);
        console.log('Final enhanced categories:', enhancedCategories);
        
        // Set the categories with our ensured list
        setCategories(enhancedCategories);
        
        // Apply initial filtering
        if (selectedCategory === 'All') {
          setFilteredItems(processedMenuItems);
        } else {
          setFilteredItems(processedMenuItems.filter(item => item.category === selectedCategory));
        }
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError(err.message || 'Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };
    
    if (initialized) {
      fetchMenuItems();
    }
  }, [restaurant, branch, initialized]);

  // Filter items when category changes
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredItems(menuItems);
    } else {
      // Case insensitive comparison for more robust filtering
      const selected = selectedCategory.toLowerCase();
      setFilteredItems(menuItems.filter(item => 
        item.category && item.category.toLowerCase() === selected
      ));
      console.log(`Filtered to ${selected} category:`, 
        menuItems.filter(item => item.category && item.category.toLowerCase() === selected)
      );
    }
  }, [selectedCategory, menuItems]);
  
  // Get popular items
  const getPopularItems = () => {
    return menuItems.filter(item => item.popular);
  };
  
  // Get items by category
  const getItemsByCategory = (category) => {
    if (category === 'All') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === category);
  };
  
  // Search items
  const searchItems = (query) => {
    if (!query || query.trim() === '') {
      return menuItems;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    return menuItems.filter(item => 
      item.title.toLowerCase().includes(lowerCaseQuery) ||
      item.subtitle.toLowerCase().includes(lowerCaseQuery) ||
      item.description.toLowerCase().includes(lowerCaseQuery)
    );
  };
  
  // Value to be provided by the context
  const value = {
    menuItems,
    categories,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    filteredItems,
    getPopularItems,
    getItemsByCategory,
    searchItems
  };
  
  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};
