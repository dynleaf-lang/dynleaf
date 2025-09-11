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
  
  // OTP expiration tracking
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // OTP expiration checker
  useEffect(() => {
    let interval;
    
    if (otpExpiresAt) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, otpExpiresAt - now);
        const remainingSeconds = Math.ceil(remaining / 1000);
        
        setTimeRemaining(remainingSeconds);
        
        if (remaining <= 0) {
          setOtpExpired(true);
          setTimeRemaining(0);
          clearInterval(interval);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [otpExpiresAt]);
  
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
      setOtpExpired(false);
      
      // API call to register user
      const response = await api.post('/api/customers/auth/register', userData);
      
      // Store user data but mark as unverified
      const newUser = { ...response.data, isVerified: false };
      setUser(newUser);
      
      // Set OTP expiration (default 5 minutes from now)
      const expirationTime = Date.now() + (response.data.otpExpiresIn || 300) * 1000;
      setOtpExpiresAt(expirationTime);
      
      // Don't set isAuthenticated yet - user needs to verify OTP first
      return { success: true, data: response.data };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Registration failed');
      setIsVerifying(false);
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Verify OTP - handles both login and registration flows
  const verifyOTP = async (otp, identifier = null, isRegistration = false) => {
    try {
      setAuthError(null);
      
      // Check if OTP has expired
      if (otpExpired || (otpExpiresAt && Date.now() > otpExpiresAt)) {
        setOtpExpired(true);
        setAuthError('OTP has expired. Please request a new one.');
        return { success: false, error: 'OTP has expired' };
      }
      
      let response;
      
      if (isRegistration) {
        // For registration flow, use verify-otp endpoint with otpId
        response = await api.post('/api/customers/auth/verify-otp', { 
          otpId: user.otpId,
          otp 
        });
      } else {
        // For login flow, use login endpoint with identifier and OTP
        const loginData = {
          identifier: identifier || user.identifier || user.email || user.phone,
          otp,
          // Include otpId if available for additional verification
          ...(user.otpId && { otpId: user.otpId })
        };
        
        response = await api.post('/api/customers/auth/login', loginData);
      }
      
      // Update user with response data (which includes token) and mark as verified
      const verifiedUser = { ...response.data, isVerified: true };
      setUser(verifiedUser);
      setIsAuthenticated(true);
      setIsVerifying(false);
      
      // Clear OTP expiration tracking
      setOtpExpiresAt(null);
      setOtpExpired(false);
      setTimeRemaining(0);
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(verifiedUser));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'OTP verification failed';
      setAuthError(errorMessage);
      
      // If the error is due to expiration, mark as expired
      if (errorMessage.toLowerCase().includes('expired')) {
        setOtpExpired(true);
      }
      
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Login existing user
  const login = async (credentials) => {
    try {
      setAuthError(null);
      setLoading(true);
      setOtpExpired(false);
      
      // For login, first request OTP
      const response = await api.post('/api/customers/auth/request-otp', credentials);
      
      // Store the identifier and otpId for later verification
      setUser({ 
        identifier: credentials.identifier,
        otpId: response.data.otpId,
        isVerified: false 
      });
      setIsVerifying(true);
      
      // Set OTP expiration (default 5 minutes from now)
      const expirationTime = Date.now() + (response.data.otpExpiresIn || 300) * 1000;
      setOtpExpiresAt(expirationTime);
      
      setLoading(false);
      return { success: true, requiresOTP: true, data: response.data };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Login failed');
      setLoading(false);
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Request new OTP
  const requestNewOTP = async (identifier) => {
    try {
      setAuthError(null);
      setOtpExpired(false);
      
      const response = await api.post('/api/customers/auth/request-otp', { 
        identifier 
      });
      
      // Update user data with new OTP info
      if (user) {
        setUser({ ...user, ...response.data });
      }
      
      // Set new OTP expiration
      const expirationTime = Date.now() + (response.data.otpExpiresIn || 300) * 1000;
      setOtpExpiresAt(expirationTime);
      
      return { success: true, data: response.data };
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Failed to send new OTP');
      return { success: false, error: error.response?.data || error.message };
    }
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setIsVerifying(false);
    
    // Clear OTP state
    setOtpExpiresAt(null);
    setOtpExpired(false);
    setTimeRemaining(0);
    
    localStorage.removeItem('user');
    
    // Trigger global logout event for other components to clean up
    window.dispatchEvent(new CustomEvent('user-logout', { 
      detail: { timestamp: Date.now() } 
    }));
  };

  // Login via magic token (WhatsApp/direct). Accepts either a signed magic token or URL param.
  const loginWithMagicToken = async (token) => {
    try {
      setAuthError(null);
      if (!token) return { success: false, error: 'Missing token' };

      const response = await api.post('/api/customers/auth/verify-magic', { token });
      const magicUser = { ...response.data, isVerified: true };
      setUser(magicUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(magicUser));
      return { success: true, user: magicUser };
    } catch (error) {
      const msg = error.response?.data?.message || 'Magic link verification failed';
      setAuthError(msg);
      return { success: false, error: msg };
    }
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
    otpExpired,
    timeRemaining,
    register,
    verifyOTP,
    login,
    logout,
    checkSession,
  requestNewOTP,
  loginWithMagicToken
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
