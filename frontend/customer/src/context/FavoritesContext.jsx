import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/apiClient';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false); // For add/remove operations
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Get customer identifier (phone or email)
  const getCustomerIdentifier = () => {
    if (!user) {
      return null;
    }
    
    const identifier = user.phone || user.email || user.identifier;
    
    return identifier;
  };

  // Load favorites when user changes or component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFavorites();
    } else {
      // Clear favorites when user logs out
      setFavorites([]);
    }
  }, [isAuthenticated, user?.phone, user?.email]); // More specific dependencies

  // Load favorites from backend
  const loadFavorites = async () => {
    const identifier = getCustomerIdentifier();
    if (!identifier) {
      console.log('No customer identifier available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.public.favorites.getFavorites(identifier);
      
      if (response.success) {
        setFavorites(response.favorites || []);
      } else {
        setError(response.message || 'Failed to load favorites');
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to load favorites';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 404) {
          // Customer not found - this is normal for new users
          setFavorites([]);
          setError(null);
          return;
        } else if (status === 400) {
          errorMessage = data.message || 'Invalid request';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.message || `Error ${status}`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Other error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if a product is in favorites
  const isFavorite = (productId) => {
    return favorites.some(fav => fav.productId === productId);
  };

  // Add product to favorites
  const addToFavorites = async (productId) => {
    const identifier = getCustomerIdentifier();
    if (!identifier) {
      throw new Error('User not authenticated');
    }

    try {
      setOperationLoading(true);
      setError(null);
      const response = await api.public.favorites.addToFavorites(identifier, productId);
      
      if (response.success) {
        // Instead of optimistic update, refresh the full favorites list to get enhanced data
        await loadFavorites();
        return { success: true };
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      setError('Failed to add to favorites');
      
      // If it's a conflict (already in favorites), still return success
      if (error.response?.status === 409) {
        return { success: true, message: 'Already in favorites' };
      }
      
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  // Remove product from favorites
  const removeFromFavorites = async (productId) => {
    const identifier = getCustomerIdentifier();
    if (!identifier) {
      throw new Error('User not authenticated');
    }

    try {
      setOperationLoading(true);
      setError(null);
      const response = await api.public.favorites.removeFromFavorites(identifier, productId);
      
      if (response.success) {
        // Instead of optimistic update, refresh the full favorites list
        await loadFavorites();
        return { success: true };
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      setError('Failed to remove from favorites');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (productId) => {
    if (isFavorite(productId)) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  };

  // Clear all favorites (for logout)
  const clearFavorites = () => {
    setFavorites([]);
    setError(null);
  };

  // Refresh favorites (alias for loadFavorites for better clarity)
  const refreshFavorites = loadFavorites;

  const value = {
    favorites,
    loading,
    operationLoading,
    error,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    loadFavorites,
    refreshFavorites,
    clearFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

// Custom hook to use favorites context
export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export default FavoritesProvider;
