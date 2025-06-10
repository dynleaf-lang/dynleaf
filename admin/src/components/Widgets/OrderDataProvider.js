import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';
import { OrderContext } from '../../context/OrderContext';

// Create a localized context for widget consumption only
export const WidgetOrderContext = createContext();

/**
 * This provider component isolates the OrderContext data for widgets
 * to prevent excessive re-renders. It only re-fetches data when explicit
 * actions trigger it, not on every parent re-render.
 */
const OrderDataProvider = ({ children }) => {
  // Get data from the main OrderContext
  const mainOrderContext = useContext(OrderContext);
  
  // Create a local cache of the data to prevent re-renders
  const [orders, setOrders] = useState([]);
  const [orderReports, setOrderReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countryCode, setCountryCode] = useState(mainOrderContext.countryCode || 'DEFAULT');
  
  // Load data once on initial mount, but don't re-render when the parent context changes
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Use the main context methods but only load data once
        const ordersData = await mainOrderContext.getAllOrders();
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        }
        
        // Try to load reports as well if available
        if (mainOrderContext.getAllReports) {
          const reportsData = await mainOrderContext.getAllReports();
          if (reportsData && reportsData.success) {
            setOrderReports(reportsData.reports);
          }
        }
        
        // Update country code if available
        if (mainOrderContext.countryCode) {
          setCountryCode(mainOrderContext.countryCode);
        }
      } catch (err) {
        console.error("Error loading initial order data:", err);
        setError(err.message || "Failed to load order data");
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array - load only once
  
  // Stable methods that don't change on re-renders
  const getAllOrders = useCallback(async () => {
    // First check if we already have orders
    if (orders.length > 0) return orders;
    
    // If not, fetch them
    setLoading(true);
    try {
      const ordersData = await mainOrderContext.getAllOrders();
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
        return ordersData;
      }
      return [];
    } catch (err) {
      setError(err.message || "Failed to load orders");
      return [];
    } finally {
      setLoading(false);
    }
  }, [mainOrderContext.getAllOrders, orders.length]);
  
  // Force refresh data - only call this when you need fresh data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await mainOrderContext.getAllOrders();
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      }
    } catch (err) {
      setError(err.message || "Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [mainOrderContext.getAllOrders]);
  
  // Stable context value that doesn't change on every render
  const contextValue = useMemo(() => ({
    orders,
    orderReports,
    loading,
    error,
    countryCode,
    getAllOrders,
    refreshData
  }), [orders, orderReports, loading, error, countryCode, getAllOrders, refreshData]);
  
  return (
    <WidgetOrderContext.Provider value={contextValue}>
      {children}
    </WidgetOrderContext.Provider>
  );
};

export default OrderDataProvider;