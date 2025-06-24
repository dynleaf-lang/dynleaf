import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useRestaurant } from './RestaurantContext';

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
  const { restaurant, branch, initialized } = useRestaurant();
  
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
        
        // Get menu items for this restaurant and branch
        const menuData = await api.menus.getByRestaurantAndBranch(
          restaurant._id, 
          branch._id
        );
        
        // Process menu items to match the expected format
        const processedMenuItems = menuData.map(item => ({
          id: item._id,
          title: item.name,
          subtitle: item.description || '',
          description: item.description || '',
          price: item.price,
          image: item.imageUrl || 'https://via.placeholder.com/300',
          category: item.categoryId ? item.categoryId.name : 'Uncategorized',
          categoryId: item.categoryId ? item.categoryId._id : null,
          available: item.available !== false,
          popular: item.popular || false,
          restaurantId: item.restaurantId,
          branchId: item.branchId || [],
          options: item.options || []
        }));
        
        setMenuItems(processedMenuItems);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(
          processedMenuItems
            .filter(item => item.category)
            .map(item => item.category)
        )];
        
        setCategories(uniqueCategories);
        
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
      setFilteredItems(menuItems.filter(item => item.category === selectedCategory));
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