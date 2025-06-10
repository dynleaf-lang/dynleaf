import React, { createContext, useState, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import api from '../utils/api';

export const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [branches, setBranches] = useState([]);
  const { token, user } = useContext(AuthContext);
  
  // Create refs to store the latest versions of functions to prevent unnecessary rerenders
  const customersRef = useRef(customers);
  const loadingRef = useRef(loading);
  const errorRef = useRef(error);
  
  // Update refs when state changes
  useEffect(() => {
    customersRef.current = customers;
    loadingRef.current = loading;
    errorRef.current = error;
  }, [customers, loading, error]);
  
  // Get all customers for the current user's restaurant/branch
  const getAllCustomers = useCallback(async (filters = {}) => {
    // Skip if we already have customers and no filters are provided
    if (customersRef.current.length > 0 && Object.keys(filters).length === 0) {
      return customersRef.current;
    }
    
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      let endpoint = '';
      let params = {};
      
      // For Super_Admin with no filters, get all customers
      if (user.role === 'Super_Admin' && !filters.restaurantId && !filters.branchId) {
        endpoint = 'customers';
      }
      // For Super_Admin with filters, get filtered customers
      else if (user.role === 'Super_Admin' && (filters.restaurantId || filters.branchId)) {
        endpoint = 'customers';
        if (filters.restaurantId) params.restaurantId = filters.restaurantId;
        if (filters.branchId) params.branchId = filters.branchId;
      } 
      // For branch-specific users, get only their branch customers
      else if (user.branchId) {
        endpoint = `customers/branch/${user.branchId}`;
      }
      // Handle case where user has no branch assigned but has restaurant
      else if (user.restaurantId) {
        endpoint = `customers/restaurant/${user.restaurantId}`;
      } else {
        throw new Error('No restaurant or branch assigned to current user');
      }

      console.log(`Fetching customers from endpoint: ${endpoint}`);
      
      const response = await api.get(endpoint, { params });

      if (response && response.data) {
        console.log(`Successfully fetched ${response.data.length} customers`);
        setCustomers(response.data);
        return response.data;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch customers';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, user]); // Remove unnecessary dependencies

  // Get all restaurants (for Super_Admin filtering)
  const getRestaurants = useCallback(async () => {
    if (!user?.role || user.role !== 'Super_Admin') return;
    
    try {
      const response = await api.get('restaurants');
      setRestaurants(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      return [];
    }
  }, [user?.role]);

  // Get branches for a restaurant (for Super_Admin filtering)
  const getBranchesForRestaurant = useCallback(async (restaurantId) => {
    if (!user?.role || user.role !== 'Super_Admin' || !restaurantId) return [];
    
    try {
      const response = await api.get(`branches/restaurant/${restaurantId}`);
      setBranches(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
      return [];
    }
  }, [user?.role]);

  // Create a new customer
  const createCustomer = useCallback(async (customerData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('customers', customerData);
      
      // Update the customers list with the new customer
      setCustomers(prevCustomers => [...prevCustomers, response.data]);
      
      return response.data;
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err.response?.data?.message || 'Failed to create customer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific customer by ID
  const getCustomerById = useCallback(async (customerId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`customers/${customerId}`);
      return response.data;
    } catch (err) {
      console.error(`Error fetching customer with ID ${customerId}:`, err);
      setError(err.response?.data?.message || 'Failed to fetch customer details');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing customer
  const updateCustomer = useCallback(async (customerId, customerData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(`customers/${customerId}`, customerData);
      
      // Update the customers list with the updated customer
      setCustomers(prevCustomers => 
        prevCustomers.map(customer => 
          customer._id === customerId ? response.data : customer
        )
      );
      
      return response.data;
    } catch (err) {
      console.error(`Error updating customer with ID ${customerId}:`, err);
      setError(err.response?.data?.message || 'Failed to update customer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a customer
  const deleteCustomer = useCallback(async (customerId) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`customers/${customerId}`);
      
      // Remove the deleted customer from the list
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => customer._id !== customerId)
      );
      
      return true;
    } catch (err) {
      console.error(`Error deleting customer with ID ${customerId}:`, err);
      setError(err.response?.data?.message || 'Failed to delete customer');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data when component mounts
  useEffect(() => {
    if (token && user) {
      // Only load data if we don't already have customers
      if (customers.length === 0) {
        getAllCustomers();
      }
      
      // For Super_Admin, also fetch restaurants for filtering
      if (user.role === 'Super_Admin' && restaurants.length === 0) {
        getRestaurants();
      }
    }
  }, [token, user, getAllCustomers, getRestaurants, customers.length, restaurants.length]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    customers,
    loading,
    error,
    restaurants,
    branches,
    getAllCustomers,
    getRestaurants,
    getBranchesForRestaurant,
    createCustomer,
    getCustomerById,
    updateCustomer,
    deleteCustomer
  }), [
    customers,
    loading,
    error,
    restaurants,
    branches,
    getAllCustomers,
    getRestaurants,
    getBranchesForRestaurant,
    createCustomer,
    getCustomerById,
    updateCustomer,
    deleteCustomer
  ]);

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => useContext(CustomerContext);

export default CustomerProvider;