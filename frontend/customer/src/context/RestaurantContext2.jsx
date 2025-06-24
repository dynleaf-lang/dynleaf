import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';

// Create context
const RestaurantContext = createContext();

export const useRestaurant = () => useContext(RestaurantContext);

export const RestaurantProvider = ({ children }) => {
  // Core data states
  const [restaurant, setRestaurant] = useState(null);
  const [branch, setBranch] = useState(null);
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // UI related states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Function to load data based on QR code
  const loadDataFromQrCode = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      // Store QR code
      setQrCode(code);
      
      // Get table info from QR code
      const tableData = await api.tables.getByQRCode(code);
      setTable(tableData);
      
      if (!tableData) {
        throw new Error('Table not found');
      }
      
      // Get branch data
      const branchData = await api.branches.getById(tableData.branchId);
      setBranch(branchData);
      
      if (!branchData) {
        throw new Error('Branch not found');
      }
      
      // Get restaurant data
      const restaurantData = await api.restaurants.getById(branchData.restaurantId);
      setRestaurant(restaurantData);
      
      // Get categories for this restaurant
      const categoriesData = await api.categories.getByRestaurant(branchData.restaurantId);
      setCategories(
        categoriesData.map(category => ({
          id: category._id,
          name: category.name,
          image: category.imageUrl || `https://via.placeholder.com/200?text=${encodeURIComponent(category.name)}`
        }))
      );
      
      // Get menu items for this branch
      const menuItemsData = await api.menus.getByRestaurantAndBranch(
        branchData.restaurantId, 
        branchData._id
      );
      
      // Transform menu items to match our component structure
      setMenuItems(menuItemsData.map(item => ({
        id: item._id,
        title: item.name,
        subtitle: item.description,
        price: item.price,
        image: item.imageUrl || 'https://via.placeholder.com/300?text=No+Image',
        category: item.categoryId ? item.categoryId.name : 'Uncategorized',
        categoryId: item.categoryId ? item.categoryId._id : null,
      })));
      
      setInitialized(true);
    } catch (err) {
      console.error('Error loading data from QR code:', err);
      setError(err.message || 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  // Function to filter menu items by category
  const getMenuItemsByCategory = (categoryName) => {
    if (categoryName === 'All') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === categoryName);
  };

  // Function for direct category lookup by ID
  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId);
  };

  // Add a test/demo QR code function for development
  const loadDemoData = async () => {
    // You can hardcode a valid QR code from your system for testing
    const demoQrCode = 'DEMO123'; // Replace with a valid QR code from your database
    await loadDataFromQrCode(demoQrCode);
  };

  // Provide context value
  const contextValue = {
    restaurant,
    branch,
    table,
    menuItems,
    categories,
    loading,
    error,
    qrCode,
    initialized,
    loadDataFromQrCode,
    getMenuItemsByCategory,
    getCategoryById,
    loadDemoData
  };

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  );
};

export default RestaurantContext;