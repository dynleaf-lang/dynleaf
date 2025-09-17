import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';
import { useAuth } from './AuthContext';
import toast from '../utils/notify';

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
  const [inventoryItems, setInventoryItems] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [branch, setBranch] = useState(null);

  // API base URL
  const API_BASE_URL = getApiBase();

  // Fetch data when user is authenticated (effect moved below function declarations to avoid TDZ)

  // Real-time: update a single table on tableStatusUpdate socket event
  useEffect(() => {
    const onTableStatus = (e) => {
      try {
        const d = e.detail || {};
        const tid = d.tableId;
        if (!tid) return;
        setTables((prev) =>
          Array.isArray(prev)
            ? prev.map((t) =>
                (t?._id === tid || t?.tableId === tid)
                  ? { ...t, status: d.status || t.status, currentOrderId: d.currentOrderId ?? t.currentOrderId, isOccupied: (d.status || '').toLowerCase() === 'occupied' }
                  : t
              )
            : prev
        );
      } catch (_) {}
    };
    window.addEventListener('tableStatusUpdate', onTableStatus);
    return () => window.removeEventListener('tableStatusUpdate', onTableStatus);
  }, []);

  const fetchTables = useCallback(async () => {
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
  }, [API_BASE_URL, user?.branchId]);

  // Customers API (search by phone and create)
  const findCustomerByPhone = useCallback(async (phone) => {
    try {
      const resp = await axios.get(`${API_BASE_URL}/customers`, { params: { search: phone } });
      const list = Array.isArray(resp.data) ? resp.data : [];
      // Prefer exact phone match
      const exact = list.find(c => (c.phone || '').toString() === phone.toString());
      return exact || null;
    } catch (error) {
      console.error('Error searching customer by phone:', error);
      return null;
    }
  }, [API_BASE_URL]);

  const createCustomerIfNeeded = useCallback(async ({ name, phone }) => {
    try {
      if (!name || !phone) return null;
      // ensure not existing
      const existing = await findCustomerByPhone(phone);
      if (existing) return existing;
      const payload = { name, phone };
      const resp = await axios.post(`${API_BASE_URL}/customers`, payload);
      return resp.data;
    } catch (error) {
      console.error('Error creating customer:', error);
      return null;
    }
  }, [API_BASE_URL, findCustomerByPhone]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/categories/restaurant/${user.restaurantId}`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  }, [API_BASE_URL, user?.restaurantId]);

  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/menus/restaurant/${user.restaurantId}`);
      setMenuItems(response.data.menus || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    }
  }, [API_BASE_URL, user?.restaurantId]);

  const fetchFloors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/floors/restaurant/${user.restaurantId}`);
      setFloors(response.data || []);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  }, [API_BASE_URL, user?.restaurantId]);

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId);
      if (user?.restaurantId) params.append('restaurantId', user.restaurantId);
      const response = await axios.get(`${API_BASE_URL}/public/inventory?${params.toString()}`);
      setInventoryItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Silent fail for POS; inventory is optional
    }
  }, [API_BASE_URL, user?.branchId, user?.restaurantId]);

  // (moved below fetchRestaurantInfo)

  const fetchRestaurantInfo = useCallback(async () => {
    try {
      if (!user?.restaurantId) return;
      const resp = await axios.get(`${API_BASE_URL}/public/restaurants/${user.restaurantId}`);
      const data = resp.data?.restaurant || null;
      setRestaurant(data);
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  }, [API_BASE_URL, user?.restaurantId]);

  const fetchBranchInfo = useCallback(async () => {
    try {
      if (!user?.branchId) return;
      const resp = await axios.get(`${API_BASE_URL}/public/branches/${user.branchId}`);
      const data = resp.data?.branch || resp.data || null;
      setBranch(data);
    } catch (error) {
      console.error('Error fetching branch info:', error);
    }
  }, [API_BASE_URL, user?.branchId]);

  // Fetch data when user is authenticated (placed after fetchRestaurantInfo)
  useEffect(() => {
    (async () => {
      try {
        if (user?.branchId) {
          await Promise.all([
            fetchTables(),
            fetchCategories(),
            fetchMenuItems(),
            fetchFloors(),
            fetchInventory(),
            fetchBranchInfo()
          ]);
        }
        if (user?.restaurantId) {
          await fetchRestaurantInfo();
        }
      } catch (_) {
        // individual fetchers handle their own toasts/errors
      }
    })();
  }, [user, fetchTables, fetchCategories, fetchMenuItems, fetchFloors, fetchInventory, fetchRestaurantInfo]);

  // Reservations API (secured)
  const getTableReservations = useCallback(async (tableId, params = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tables/${tableId}/reservations`, { params });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
      throw error;
    }
  }, [API_BASE_URL]);

  const createReservation = useCallback(async (tableId, payload) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/tables/${tableId}/reservations`, payload);
      // Refresh tables so UI gets updated reservations/status
      await fetchTables();
      toast.success('Reservation created');
      return response.data?.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create reservation';
      console.error('Create reservation error:', error);
      toast.error(msg);
      throw error;
    }
  }, [API_BASE_URL, fetchTables]);

  const updateReservation = useCallback(async (tableId, reservationId, payload) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/tables/${tableId}/reservations/${reservationId}`, payload);
      await fetchTables();
      return response.data?.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update reservation';
      console.error('Update reservation error:', error);
      toast.error(msg);
      throw error;
    }
  }, [API_BASE_URL, fetchTables]);

  const cancelReservation = useCallback(async (tableId, reservationId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/tables/${tableId}/reservations/${reservationId}/cancel`);
      await fetchTables();
      toast.success('Reservation cancelled');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to cancel reservation';
      console.error('Cancel reservation error:', error);
      toast.error(msg);
      throw error;
    }
  }, [API_BASE_URL, fetchTables]);

  const updateTableStatus = useCallback(async (tableId, status, orderData = null) => {
    try {
      // Map UI statuses to backend-compatible values
      const mapForServer = (s) => {
        const v = (s || '').toLowerCase();
        if (v === 'blocked') return 'maintenance';
        return s;
      };
      const updateData = { status: mapForServer(status) };
      if (orderData) {
        updateData.currentOrderId = orderData._id;
      }

      const response = await axios.patch(`${API_BASE_URL}/public/tables/${tableId}/status`, updateData);
      
      // Update local state
      setTables(prevTables => 
        prevTables.map(table => 
          table._id === tableId 
            ? { ...table, status: updateData.status, currentOrderId: updateData.currentOrderId }
            : table
        )
      );

      return response.data;
    } catch (error) {
      console.error('Error updating table status:', error);
      toast.error('Failed to update table status');
      throw error;
    }
  }, [API_BASE_URL]);

  const selectTable = useCallback((table) => {
    setSelectedTable(table);
  }, []);

  const clearSelectedTable = useCallback(() => {
    setSelectedTable(null);
  }, []);

  // Get menu items by category (including subcategories)
  const getMenuItemsByCategory = useCallback((categoryId) => {
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
  }, [menuItems, categories]);

  // Helper function to get category and all its children IDs
  const getCategoryWithChildren = useCallback((categoryId) => {
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
  }, [categories]);

  // Get available tables (not occupied)
  const getAvailableTables = useCallback(() => tables.filter(table => table.status !== 'occupied'), [tables]);

  // Get occupied tables
  const getOccupiedTables = useCallback(() => tables.filter(table => table.status === 'occupied'), [tables]);

  // Search menu items
  const searchMenuItems = useCallback((query) => {
    if (!query.trim()) return menuItems;
    
    const lowercaseQuery = query.toLowerCase();
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.description?.toLowerCase().includes(lowercaseQuery)
    );
  }, [menuItems]);

  // Get table by ID
  const getTableById = useCallback((tableId) => tables.find(table => table._id === tableId), [tables]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchTables(),
      fetchCategories(),
      fetchMenuItems(),
      fetchFloors(),
      fetchInventory()
    ]);
  }, [fetchTables, fetchCategories, fetchMenuItems, fetchFloors, fetchInventory]);

  // Map inventory by linked menu item id for quick lookup
  const getInventoryStatusForMenuItem = (menuItemId) => {
    if (!menuItemId || !Array.isArray(inventoryItems) || inventoryItems.length === 0) return null;
    const match = inventoryItems.find(it => (it.menuItemId === menuItemId) || (it.menuItemId && (it.menuItemId._id === menuItemId)));
    if (!match) return null;
    const currentQty = match.currentQty ?? 0;
    const low = match.lowThreshold ?? 0;
    const critical = match.criticalThreshold ?? 0;
    const status = currentQty <= 0 ? 'out' : (currentQty <= critical ? 'critical' : (currentQty <= low ? 'low' : 'in_stock'));
    return { status, currentQty, unit: match.unit, item: match };
  };

  const value = useMemo(() => ({
    // State
    tables,
    categories,
    menuItems,
    inventoryItems,
    floors,
    selectedTable,
    loading,
    error,

    // Actions
    fetchTables,
    fetchCategories,
    fetchMenuItems,
    fetchFloors,
    fetchInventory,
    updateTableStatus,
  // Customers helpers
  findCustomerByPhone,
  createCustomerIfNeeded,
  // Reservation APIs
  getTableReservations,
  createReservation,
  updateReservation,
  cancelReservation,
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
    ,
  getInventoryStatusForMenuItem,
  restaurant,
  branch,
  fetchRestaurantInfo,
  fetchBranchInfo
  }), [tables, categories, menuItems, inventoryItems, floors, selectedTable, loading, error, findCustomerByPhone, createCustomerIfNeeded, getTableReservations, createReservation, updateReservation, cancelReservation, fetchTables, fetchCategories, fetchMenuItems, fetchFloors, fetchInventory, updateTableStatus, selectTable, clearSelectedTable, refreshData, getMenuItemsByCategory, getCategoryWithChildren, getAvailableTables, getOccupiedTables, searchMenuItems, getTableById, getInventoryStatusForMenuItem, restaurant, branch, fetchRestaurantInfo, fetchBranchInfo]);

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};
