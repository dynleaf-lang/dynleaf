import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

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
      let response;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // For Super_Admin with no filters, get all customers
      if (user.role === 'Super_Admin' && !filters.restaurantId && !filters.branchId) {
        response = await axios.get('/api/customers/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      // For Super_Admin with filters, get filtered customers
      else if (user.role === 'Super_Admin' && (filters.restaurantId || filters.branchId)) {
        const queryParams = [];
        if (filters.restaurantId) queryParams.push(`restaurantId=${filters.restaurantId}`);
        if (filters.branchId) queryParams.push(`branchId=${filters.branchId}`);
        
        response = await axios.get(`/api/customers/all?${queryParams.join('&')}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } 
      // For branch-specific users, get only their branch customers
      else if (user.branchId) {
        response = await axios.get(`/api/customers/branch/${user.branchId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      // Handle case where user has no branch assigned but has restaurant
      else if (user.restaurantId) {
        response = await axios.get(`/api/customers/restaurant/${user.restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        throw new Error('No restaurant or branch assigned to current user');
      }
      
      setCustomers(response.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // Get all restaurants (for Super_Admin filtering)
  const getRestaurants = useCallback(async () => {
    if (user?.role !== 'Super_Admin') return;
    
    try {
      const response = await axios.get('/api/restaurants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRestaurants(response.data);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    }
  }, [token, user]);

  // Get branches for a restaurant (for Super_Admin filtering)
  const getBranchesForRestaurant = useCallback(async (restaurantId) => {
    if (user?.role !== 'Super_Admin' || !restaurantId) return;
    
    try {
      const response = await axios.get(`/api/branches/restaurant/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const response = await axios.post('/api/customers', customerData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      const response = await axios.get(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      const response = await axios.put(`/api/customers/${customerId}`, customerData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
      await axios.delete(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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