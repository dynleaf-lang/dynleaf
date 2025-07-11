import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/authApiClient';

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Load user from localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Register new user - first step
  const register = async (userData) => {
    try {
      setAuthError(null);
      setIsVerifying(true);
      // API call to register user
      const response = await api.post('/api/customers/auth/register', userData);
      // Store user data but mark as unverified
      const newUser = { ...response.data, isVerified: false };
      setUser(newUser);
      // Don't set isAuthenticated yet - user needs to verify OTP first
      return { success: true, data: response.data };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Registration failed');
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Verify OTP
  const verifyOTP = async (otp) => {
    try {
      setAuthError(null);
      // API call to verify OTP
      const response = await api.post('/api/customers/auth/verify-otp', { 
        otpId: user.otpId,
        otp 
      });
      
      // Update user with response data (which includes token) and mark as verified
      const verifiedUser = { ...response.data, isVerified: true };
      setUser(verifiedUser);
      setIsAuthenticated(true);
      setIsVerifying(false);
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(verifiedUser));
      
      return { success: true };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'OTP verification failed');
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Login existing user
  const login = async (credentials) => {
    try {
      setAuthError(null);
      setLoading(true);
      // API call to login
      const response = await api.post('/api/customers/auth/login', credentials);
      setUser(response.data);
      setIsAuthenticated(true);
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      setLoading(false);
      return { success: true };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Login failed');
      setLoading(false);
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  // Check if user session is still valid
  const checkSession = async () => {
    try {
      if (!user || !isAuthenticated) {
        return { valid: false, error: 'Not authenticated' };
      }

      // This will be caught by the interceptor if token is invalid
      const response = await api.get('/api/customers/auth/verify-session');
      
      if (response.data.isValid && response.data.isActive) {
        return { valid: true, customer: response.data.customer };
      } else {
        // Session is invalid, logout user
        logout();
        return { valid: false, error: 'Session invalid or user inactive' };
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // If it's an auth error, logout the user
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      return { valid: false, error: error.response?.data?.message || 'Session check failed' };
    }
  };

  const value = {
    user,
    loading,
    authError,
    isAuthenticated,
    isVerifying,
    register,
    verifyOTP,
    login,
    logout,
    checkSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
