import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
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
  
  // Get all customers for the current user's restaurant/branch
  const getAllCustomers = useCallback(async (filters = {}) => {
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
        endpoint = 'customers'; // Removed '/api' prefix as it's added by the API utility
      }
      // For Super_Admin with filters, get filtered customers
      else if (user.role === 'Super_Admin' && (filters.restaurantId || filters.branchId)) {
        endpoint = 'customers'; // Removed '/api' prefix as it's added by the API utility
        if (filters.restaurantId) params.restaurantId = filters.restaurantId;
        if (filters.branchId) params.branchId = filters.branchId;
      } 
      // For branch-specific users, get only their branch customers
      else if (user.branchId) {
        endpoint = `customers/branch/${user.branchId}`; // Removed '/api' prefix
      }
      // Handle case where user has no branch assigned but has restaurant
      else if (user.restaurantId) {
        endpoint = `customers/restaurant/${user.restaurantId}`; // Removed '/api' prefix
      } else {
        throw new Error('No restaurant or branch assigned to current user');
      }

      console.log(`Fetching customers from endpoint: ${endpoint}`);
      console.log('User info:', { 
        role: user.role, 
        userId: user._id, 
        restaurantId: user.restaurantId, 
        branchId: user.branchId 
      });
      
      const response = await api.get(endpoint, { params });

      if (response && response.data) {
        console.log(`Successfully fetched ${response.data.length} customers`);
        setCustomers(response.data);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        console.error('Server responded with error:', errMessage);
        setError(errMessage);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received from server');
        setError('No response from server. Please check your network connection and ensure the backend server is running.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', err.message);
        setError(err.message || 'Failed to fetch customers');
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // Get all restaurants (for Super_Admin filtering)
  const getRestaurants = useCallback(async () => {
    if (!user?.role || user.role !== 'Super_Admin') return;
    
    try {
      const response = await api.get('restaurants'); // Removed redundant '/api' prefix
      setRestaurants(response.data);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  }, [token, user]);

  // Get branches for a restaurant (for Super_Admin filtering)
  const getBranchesForRestaurant = useCallback(async (restaurantId) => {
    if (!user?.role || user.role !== 'Super_Admin' || !restaurantId) return;
    
    try {
      const response = await api.get(`branches/restaurant/${restaurantId}`); // Removed redundant '/api' prefix
      setBranches(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  }, [token, user]);

  // Create a new customer
  const createCustomer = useCallback(async (customerData) => {
    setLoading(true);
    setError(null);
    try {
      // API now uses the authenticated user's restaurantId and branchId,
      // so we don't need to include them in the request
      const response = await api.post('customers', customerData); // Removed redundant '/api' prefix
      
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
  }, [token]);

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
  }, [token]);

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
  }, [token]);

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
  }, [token]);

  // Initialize by fetching customers if the context is newly mounted
  useEffect(() => {
    if (token && user) {
      getAllCustomers();
      
      // For Super_Admin, also fetch restaurants for filtering
      if (user.role === 'Super_Admin') {
        getRestaurants();
      }
    }
  }, [token, user, getAllCustomers, getRestaurants]);

  const contextValue = {
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
  };

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => useContext(CustomerContext);

export default CustomerProvider;