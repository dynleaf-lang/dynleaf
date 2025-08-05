import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const POSContext = createContext();

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const POSProvider = ({ children }) => {
  const { user } = useAuth();
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

  // Fetch data when user is authenticated
  useEffect(() => {
    if (user?.branchId) {
      fetchTables();
      fetchCategories();
      fetchMenuItems();
      fetchFloors();
    }
  }, [user]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/public/tables/branch/${user.branchId}`);
      setTables(response.data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError('Failed to fetch tables');
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/categories/restaurant/${user.restaurantId}`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/menus/restaurant/${user.restaurantId}`);
      setMenuItems(response.data.menus || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    }
  };

  const fetchFloors = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/floors/restaurant/${user.restaurantId}`);
      setFloors(response.data || []);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  };

  const updateTableStatus = async (tableId, status, orderData = null) => {
    try {
      const updateData = { status };
      if (orderData) {
        updateData.currentOrderId = orderData._id;
      }

      const response = await axios.patch(`${API_BASE_URL}/public/tables/${tableId}/status`, updateData);
      
      // Update local state
      setTables(prevTables => 
        prevTables.map(table => 
          table._id === tableId 
            ? { ...table, status, currentOrderId: updateData.currentOrderId }
            : table
        )
      );

      return response.data;
    } catch (error) {
      console.error('Error updating table status:', error);
      toast.error('Failed to update table status');
      throw error;
    }
  };

  const selectTable = (table) => {
    setSelectedTable(table);
  };

  const clearSelectedTable = () => {
    setSelectedTable(null);
  };

  // Get menu items by category (including subcategories)
  const getMenuItemsByCategory = (categoryId) => {
    if (!categoryId || categoryId === 'all') {
      return menuItems;
    }

    // Get all category IDs that should be included (parent + children)
    const categoryIds = getCategoryWithChildren(categoryId);
    
    // Filter menu items that belong to any of these categories
    return menuItems.filter(item => {
      // Handle different possible field names for category reference
      let itemCategoryId = item.categoryId || item.category?._id || item.category;
      
      // If category is a populated object, extract the _id
      if (typeof itemCategoryId === 'object' && itemCategoryId?._id) {
        itemCategoryId = itemCategoryId._id;
      }
      
      return categoryIds.includes(itemCategoryId);
    });
  };

  // Helper function to get category and all its children IDs
  const getCategoryWithChildren = (categoryId) => {
    const categoryIds = [categoryId];
    
    // Find all child categories recursively
    const findChildren = (parentId) => {
      categories.forEach(category => {
        const catId = category._id || category.categoryId;
        const parentCatId = category.parentCategory?._id || category.parentCategory;
        
        if (parentCatId === parentId && !categoryIds.includes(catId)) {
          categoryIds.push(catId);
          // Recursively find children of this child
          findChildren(catId);
        }
      });
    };
    
    findChildren(categoryId);
    return categoryIds;
  };

  // Get available tables (not occupied)
  const getAvailableTables = () => {
    return tables.filter(table => table.status !== 'occupied');
  };

  // Get occupied tables
  const getOccupiedTables = () => {
    return tables.filter(table => table.status === 'occupied');
  };

  // Search menu items
  const searchMenuItems = (query) => {
    if (!query.trim()) return menuItems;
    
    const lowercaseQuery = query.toLowerCase();
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Get table by ID
  const getTableById = (tableId) => {
    return tables.find(table => table._id === tableId);
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([
      fetchTables(),
      fetchCategories(),
      fetchMenuItems(),
      fetchFloors()
    ]);
  };

  const value = {
    // State
    tables,
    categories,
    menuItems,
    floors,
    selectedTable,
    loading,
    error,

    // Actions
    fetchTables,
    fetchCategories,
    fetchMenuItems,
    fetchFloors,
    updateTableStatus,
    selectTable,
    clearSelectedTable,
    refreshData,

    // Helpers
    getMenuItemsByCategory,
    getCategoryWithChildren,
    getAvailableTables,
    getOccupiedTables,
    searchMenuItems,
    getTableById
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};
