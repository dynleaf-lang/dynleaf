import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { RestaurantContext } from '../../context/RestaurantContext';
import { BranchContext } from '../../context/BranchContext';
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';
import { OrderContext } from '../../context/OrderContext';
import { CustomerContext } from '../../context/CustomerContext'; 
import { MenuContext } from '../../context/MenuContext'; // Add MenuContext import
import { CategoryContext } from '../../context/CategoryContext'; // Add CategoryContext import
import useRenderTracker from '../../utils/useRenderTracker';

// Create a context to hold and provide stable widget data
export const WidgetDataContext = React.createContext({
  restaurantData: { restaurants: [], branches: [], loading: true },
  tableData: { tables: [], reservations: [], loading: true },
  orderData: { orders: [], loading: true },
  userData: { role: '', restaurantId: null, branchId: null },
  customerData: { customers: [], loading: true },
  menuData: { menuItems: [], loading: true }, // Add menuData to the context
  categoryData: { categories: [], loading: true }, // Add categoryData to the context
});

// StableDataProvider - centralized data fetching to prevent re-renders
const StableDataProvider = ({ children }) => {
  useRenderTracker('StableDataProvider');

  // Get user data from AuthContext
  const { user } = useContext(AuthContext);
  
  // Get data from global contexts
  const { restaurants, getRestaurants, loading: restaurantsLoading } = useContext(RestaurantContext);
  const { branches, getBranches, fetchBranchesByRestaurant, loading: branchesLoading } = useContext(BranchContext);
  const { tables, getTables, getTablesWithOrders, reservations, getReservations, loading: tablesLoading } = useContext(TableContext);
  const { orders, getAllOrders, loading: ordersLoading } = useContext(OrderContext);
  const { customers, getAllCustomers, loading: customersLoading } = useContext(CustomerContext);
  const { menuItems, getAllMenuItems, loading: menuItemsLoading } = useContext(MenuContext); // Add MenuContext data
  const { categories, getAllCategories, loading: categoriesLoading } = useContext(CategoryContext); // Add CategoryContext data

  // Refs to track if data has been fetched
  const fetchedRef = useRef({
    restaurants: false,
    branches: false,
    tables: false,
    reservations: false,
    orders: false,
    customers: false,
    menuItems: false, // Add menuItems to fetchedRef
    categories: false // Add categories to fetchedRef
  });

  // State for role-specific filtered data
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState([]); // Add state for filtered menu items
  const [filteredCategories, setFilteredCategories] = useState([]); // Add state for filtered categories

  // Cache control for data fetching
  const dataCache = useRef({
    timestamp: 0,
    ttl: 60000 // 1 minute cache TTL
  });
  
  // Force an initial load of data
  useEffect(() => {
    const initialLoad = async () => {
      // Only reset fetched flags and fetch data if cache is expired
      const now = Date.now();
      if (now - dataCache.current.timestamp > dataCache.current.ttl) {
        console.log("Cache expired or first load, fetching fresh data");
        dataCache.current.timestamp = now;
        
        // Reset all fetched flags
        fetchedRef.current = {
          restaurants: false,
          branches: false,
          tables: false,
          reservations: false,
          orders: false,
          customers: false,
          menuItems: false,
          categories: false
        };
        
        // Trigger immediate fetch
        await fetchData();
      } else {
        console.log("Using cached data, skipping fetch");
      }
    };
    
    initialLoad();
  }, []); // Run only on mount

  // Fetch data only once and apply role-based filtering
  const fetchData = async () => {
    try {
      console.log("StableDataProvider: Starting data fetch");
      
      // Create an array of fetch promises to parallelize data loading
      const fetchPromises = [];
      
      // Fetch restaurants
      if (!fetchedRef.current.restaurants && user) {
        console.log("StableDataProvider: Fetching restaurants");
        fetchPromises.push(getRestaurants().then(() => {
          fetchedRef.current.restaurants = true;
        }));
      }

      // Fetch branches based on user role
      if (!fetchedRef.current.branches && user) {
        console.log("StableDataProvider: Fetching branches");
        if (user.role === 'Super_Admin') {
          fetchPromises.push(getBranches().then(() => {
            fetchedRef.current.branches = true;
          }));
        } else if (user.restaurantId) {
          fetchPromises.push(fetchBranchesByRestaurant(user.restaurantId).then(() => {
            fetchedRef.current.branches = true;
          }));
        }
      }

      // Fetch orders with proper filters
      if (!fetchedRef.current.orders && user) {
        console.log("StableDataProvider: Fetching orders");
        const filters = {};
        if (user.role !== 'Super_Admin') {
          if (user.restaurantId) filters.restaurantId = user.restaurantId;
          if (user.branchId) filters.branchId = user.branchId;
        }
        // Add cache-busting parameter
        filters.timestamp = Date.now();
        fetchPromises.push(getAllOrders(filters).then(() => {
          fetchedRef.current.orders = true;
        }));
      }
      
      // Wait for key data to load first before loading dependent data
      await Promise.all(fetchPromises);
      
      // Now load tables and reservations which might depend on restaurants/branches
      const secondaryPromises = [];
      
      // Try to fetch tables with order information
      if (!fetchedRef.current.tables && user) {
        console.log("StableDataProvider: Fetching tables with orders");
        secondaryPromises.push(getTablesWithOrders().then((withOrdersResult) => {
          // If no tables were returned, fallback to regular tables endpoint
          if (!withOrdersResult.success || !withOrdersResult.tables || withOrdersResult.tables.length === 0) {
            console.log("No tables returned from getTablesWithOrders, falling back to getTables");
            return getTables();
          }
        }).then(() => {
          fetchedRef.current.tables = true;
        }));
      }

      // Fetch reservations with proper error handling
      if (!fetchedRef.current.reservations && user) {
        console.log("StableDataProvider: Fetching reservations");
        secondaryPromises.push(getReservations(user.restaurantId).catch(() => {
          // Try again with null to get all reservations as fallback for Super_Admin
          if (user.role === 'Super_Admin') {
            return getReservations(null);
          }
          return { success: false };
        }).then(() => {
          fetchedRef.current.reservations = true;
        }));
      }
      
      // Wait for secondary data
      await Promise.all(secondaryPromises);
      
      // Fetch remaining data in parallel
      const tertiaryPromises = [];
      
      // Fetch customers
      if (!fetchedRef.current.customers && user) {
        const filters = {};
        if (user.role !== 'Super_Admin') {
          if (user.restaurantId) filters.restaurantId = user.restaurantId;
          if (user.branchId) filters.branchId = user.branchId;
        }
        tertiaryPromises.push(getAllCustomers(filters).then(() => {
          fetchedRef.current.customers = true;
        }));
      }

      // Fetch menu items
      if (!fetchedRef.current.menuItems && user) {
        const filters = {};
        if (user.role !== 'Super_Admin') {
          if (user.restaurantId) filters.restaurantId = user.restaurantId;
          if (user.branchId) filters.branchId = user.branchId;
        }
        tertiaryPromises.push(getAllMenuItems(filters).then(() => {
          fetchedRef.current.menuItems = true;
        }));
      }

      // Fetch categories
      if (!fetchedRef.current.categories && user) {
        const filters = {};
        if (user.role !== 'Super_Admin') {
          if (user.restaurantId) filters.restaurantId = user.restaurantId;
          if (user.branchId) filters.branchId = user.branchId;
        }
        tertiaryPromises.push(getAllCategories(filters).then(() => {
          fetchedRef.current.categories = true;
        }));
      }
      
      // Wait for tertiary data
      await Promise.all(tertiaryPromises);
      
      console.log("StableDataProvider: All data fetched successfully");
    } catch (error) {
      console.error("StableDataProvider: Error fetching data:", error);
    }
  };

  // When user changes, re-fetch data to ensure correct permissions
  const prevUserRef = useRef();
  useEffect(() => {
    // Only re-fetch if we have a user and it's changed in a meaningful way
    if (user) {
      const userChanged = user.role !== prevUserRef.current?.role || 
                         user.branchId !== prevUserRef.current?.branchId ||
                         user.restaurantId !== prevUserRef.current?.restaurantId;
      
      if (userChanged) {
        console.log("User properties changed, re-fetching data");
        prevUserRef.current = {
          role: user.role,
          branchId: user.branchId,
          restaurantId: user.restaurantId
        };
        
        // Reset cache to force a refresh
        dataCache.current.timestamp = 0;
        fetchData();
      }
    }
  }, [user]); // Only depend on user object, not all the fetch functions

  // Filter data based on user role - using memoization to prevent excessive recalculations
  const filteredData = useMemo(() => {
    if (!user) {
      return {
        restaurants: [],
        branches: [],
        tables: [],
        orders: [],
        customers: [],
        menuItems: [],
        categories: []
      };
    }

    console.log("Recomputing filtered data for user role:", user.role);
    
    // Filter restaurants based on user role
    const filteredRestaurants = user.role === 'Super_Admin' 
      ? (restaurants || [])
      : user.restaurantId
        ? (restaurants || []).filter(r => r._id === user.restaurantId)
        : [];

    // Filter branches based on user role
    const filteredBranches = user.role === 'Super_Admin'
      ? (branches || [])
      : user.branchId
        ? (branches || []).filter(b => b._id === user.branchId)
        : user.restaurantId
          ? (branches || []).filter(b => b.restaurantId === user.restaurantId)
          : [];

    // Filter tables based on user role
    const filteredTables = user.role === 'Super_Admin'
      ? (tables || [])
      : user.branchId
        ? (tables || []).filter(t => t.branchId === user.branchId)
        : user.restaurantId
          ? (tables || []).filter(t => t.restaurantId === user.restaurantId)
          : [];
    
    // Filter orders based on user role with proper object handling
    const filteredOrders = user.role === 'Super_Admin'
      ? (orders || [])
      : user.branchId
        ? (orders || []).filter(o => 
            (o.branchId === user.branchId) || 
            (typeof o.branchId === 'object' && o.branchId?._id === user.branchId)
          )
        : user.restaurantId
          ? (orders || []).filter(o => 
              (o.restaurantId === user.restaurantId) || 
              (typeof o.restaurantId === 'object' && o.restaurantId?._id === user.restaurantId)
            )
          : [];
    
    // Filter customers based on user role
    const filteredCustomers = user.role === 'Super_Admin'
      ? (customers || [])
      : user.branchId
        ? (customers || []).filter(c => c.branchId === user.branchId)
        : user.restaurantId
          ? (customers || []).filter(c => c.restaurantId === user.restaurantId)
          : [];

    // Filter menu items based on user role
    const filteredMenuItems = user.role === 'Super_Admin'
      ? (menuItems || [])
      : user.branchId
        ? (menuItems || []).filter(m => m.branchId === user.branchId)
        : user.restaurantId
          ? (menuItems || []).filter(m => m.restaurantId === user.restaurantId)
          : [];

    // Filter categories based on user role
    const filteredCategories = user.role === 'Super_Admin'
      ? (categories || [])
      : user.branchId
        ? (categories || []).filter(c => c.branchId === user.branchId)
        : user.restaurantId
          ? (categories || []).filter(c => c.restaurantId === user.restaurantId)
          : [];
    
    // Log filtering results
    console.log("StableDataProvider: Data after filtering:", {
      restaurants: filteredRestaurants.length,
      branches: filteredBranches.length,
      tables: filteredTables.length,
      orders: filteredOrders.length,
      reservations: reservations?.length || 0,
      customers: filteredCustomers.length,
      menuItems: filteredMenuItems.length,
      categories: filteredCategories.length
    });
    
    return {
      restaurants: filteredRestaurants,
      branches: filteredBranches,
      tables: filteredTables,
      orders: filteredOrders,
      customers: filteredCustomers,
      menuItems: filteredMenuItems,
      categories: filteredCategories
    };
  }, [
    user?.role, 
    user?.branchId, 
    user?.restaurantId,
    restaurants,
    branches,
    tables,
    orders,
    customers,
    menuItems,
    categories
  ]);

  // Create memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    restaurantData: {
      restaurants: filteredData.restaurants,
      branches: filteredData.branches,
      loading: restaurantsLoading || branchesLoading
    },
    tableData: {
      tables: filteredData.tables,
      reservations: reservations || [],
      loading: tablesLoading
    },
    orderData: {
      orders: filteredData.orders,
      loading: ordersLoading
    },
    userData: {
      role: user?.role || '',
      restaurantId: user?.restaurantId || null,
      branchId: user?.branchId || null
    },
    customerData: {
      customers: filteredData.customers,
      loading: customersLoading
    },
    menuData: {
      menuItems: filteredData.menuItems,
      loading: menuItemsLoading
    },
    categoryData: {
      categories: filteredData.categories,
      loading: categoriesLoading
    }
  }), [
    filteredData,
    restaurantsLoading, branchesLoading,
    reservations, tablesLoading,
    ordersLoading,
    customersLoading,
    menuItemsLoading,
    categoriesLoading,
    user
  ]);

  return (
    <WidgetDataContext.Provider value={contextValue}>
      {children}
    </WidgetDataContext.Provider>
  );
};

export default StableDataProvider;