import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

  // Configure axios defaults
  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/users/profile`);
      const userData = response.data.user;

      // Check if user has POS_Operator or Staff role
      if (!['POS_Operator', 'Staff', 'admin', 'Branch_Manager'].includes(userData.role)) {
        throw new Error('Unauthorized: Invalid role for POS access');
      }

      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('pos_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        email,
        password
      });

      const { token, user: userData } = response.data;

      // Check if user has appropriate role for POS access
      if (!['POS_Operator', 'Staff', 'admin', 'Branch_Manager'].includes(userData.role)) {
        throw new Error('Unauthorized: You do not have permission to access the POS system');
      }

      // Store token and set user
      localStorage.setItem('pos_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      toast.success(`Welcome back, ${userData.name}!`);
      return { success: true, user: userData };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear local storage and axios headers
      localStorage.removeItem('pos_token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setError(null);
      
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      
      const response = await axios.put(`${API_BASE_URL}/users/change-password`, {
        currentPassword,
        newPassword
      });

      toast.success('Password changed successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      
      const response = await axios.put(`${API_BASE_URL}/users/profile`, profileData);
      const updatedUser = response.data.user;
      
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      return { success: true, user: updatedUser };

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    updateProfile,
    checkAuthStatus,
    isAuthenticated: !!user,
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
