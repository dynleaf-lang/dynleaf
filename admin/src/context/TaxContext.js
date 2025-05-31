import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const TaxContext = createContext();

export const useTax = () => useContext(TaxContext);

export const TaxProvider = ({ children }) => {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // Update API URL to match backend port (5001 instead of 5000)
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // Configure axios headers with timeout
  const getConfig = useCallback(() => {
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      timeout: 10000 // 10 second timeout
    };
  }, [token]);

  // Get all taxes - memoized to prevent unnecessary re-renders
  const getAllTaxes = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) {
        console.log('No auth token available, skipping tax fetch');
        setError('Authentication required');
        setLoading(false);
        return;
      }
 
      console.log('Making request to:', `${API_URL}/taxes`);
      const response = await axios.get(`${API_URL}/taxes`, getConfig());
      console.log('Tax API response:', response.data);
      setTaxes(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching taxes:', err);
      
      // Enhanced error handling
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout - Backend server might be down or slow to respond');
      } else if (!err.response && err.request) {
        setError('Cannot connect to the server. Please check if the backend is running.');
        console.error('No response received:', err.request);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch taxes');
      }
      
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, getConfig]);

  // Retry mechanism for getting taxes - memoized
  const retryGetTaxes = useCallback(async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempt ${i + 1} to fetch taxes`);
        await getAllTaxes();
        
        // If successful, break out of the retry loop
        if (!error) break;
        
        // Wait before retrying
        if (error && i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (err) {
        console.error(`Retry ${i + 1} failed:`, err);
        if (i === retries - 1) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, [getAllTaxes, error]);

  // Get tax by country code - memoized
  const getTaxByCountry = useCallback(async (countryCode) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/taxes/${countryCode}`, getConfig());
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || `Failed to fetch tax for ${countryCode}`);
      console.error(`Error fetching tax for ${countryCode}:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig]);

  // Create tax - memoized
  const createTax = useCallback(async (taxData) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/taxes`, taxData, getConfig());
      setTaxes(prevTaxes => [...prevTaxes, response.data.data]);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tax');
      console.error('Error creating tax:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig]);

  // Update tax - memoized
  const updateTax = useCallback(async (countryCode, taxData) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_URL}/taxes/${countryCode}`, taxData, getConfig());
      setTaxes(prevTaxes => prevTaxes.map(tax => 
        tax.country === countryCode ? response.data.data : tax
      ));
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update tax for ${countryCode}`);
      console.error(`Error updating tax for ${countryCode}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig]);

  // Delete tax - memoized
  const deleteTax = useCallback(async (countryCode) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/taxes/${countryCode}`, getConfig());
      setTaxes(prevTaxes => prevTaxes.filter(tax => tax.country !== countryCode));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to delete tax for ${countryCode}`);
      console.error(`Error deleting tax for ${countryCode}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL, getConfig]);

  // Load taxes when token is available
  useEffect(() => {
    if (token) {
      console.log('Token available, fetching taxes');
      getAllTaxes().catch(err => {
        console.error('Initial tax fetch failed:', err);
      });
    }
  }, [token, getAllTaxes]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    taxes,
    loading,
    error,
    getAllTaxes,
    getTaxByCountry,
    createTax,
    updateTax,
    deleteTax,
    retryGetTaxes
  }), [taxes, loading, error, getAllTaxes, getTaxByCountry, createTax, updateTax, deleteTax, retryGetTaxes]);

  return <TaxContext.Provider value={value}>{children}</TaxContext.Provider>;
};
