import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check for existing session on app load
  useEffect(() => {
    const token = localStorage.getItem('kitchenToken');
    const userData = localStorage.getItem('kitchenUser');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role === 'Chef') {
          setUser(parsedUser);
        } else {
          // Clear invalid user data
          localStorage.removeItem('kitchenToken');
          localStorage.removeItem('kitchenUser');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('kitchenToken');
        localStorage.removeItem('kitchenUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
      const response = await fetch(`${apiBaseUrl}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Verify user is a chef
      if (data.user.role !== 'Chef') {
        throw new Error('Access denied. Chef credentials required.');
      }

      // Store authentication data
      localStorage.setItem('kitchenToken', data.token);
      localStorage.setItem('kitchenUser', JSON.stringify(data.user));
      
      setUser(data.user);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('kitchenToken');
    localStorage.removeItem('kitchenUser');
    setUser(null);
    setError('');
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isChef: user?.role === 'Chef'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
