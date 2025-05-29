import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.API_BASE_URL || 'http://localhost:5001';

// Add request interceptor to ensure proper JSON handling
axios.interceptors.request.use(config => {
  if (config.method === 'post' || config.method === 'put') {
    config.headers['Content-Type'] = 'application/json';
    
    // Ensure we always have a payload object, never undefined
    if (!config.data) {
      config.data = {};
    }
    
    // For debugging
    console.log(`${config.method.toUpperCase()} ${config.url} request payload:`, config.data);
  }
  return config;
}, error => {
  return Promise.reject(error);
});


export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      // Using the correct endpoint and including the token in the Authorization header
      const response = await axios.get('/api/users/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const createUser = async (userData) => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      // Log the user data being sent to help with debugging
      console.log('Creating user with data:', { ...userData, password: '***HIDDEN***' });

      // Ensure userData has all required fields
      if (!userData.name && (userData.firstName || userData.lastName)) {
        userData.name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      }
      
      // Make a direct request without double-stringifying the payload
      const response = await axios.post('/api/users/register', userData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('User creation succeeded with response:', response.data);
      setUsers([...users, response.data.user]);
      setError(null);
      return response.data.user;
    } catch (err) {
      console.error('Error creating user:', err);
      
      // Extract more detailed error information
      let errorMessage = 'Error creating user';
      if (err.response) {
        // Server responded with an error
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        console.error('Server error details:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update existing user
  const updateUser = async (userId, userData) => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      // Log the update data being sent to help with debugging
      console.log('Updating user with data:', { userId, ...userData, password: userData.password ? '***HIDDEN***' : undefined });

      const response = await axios.put(`/api/users/${userId}`, userData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUsers(users.map(user => user._id === userId ? response.data : user));
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error updating user:', err);
      
      // Extract more detailed error information
      let errorMessage = 'Error updating user';
      if (err.response) {
        // Server responded with an error
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        console.error('Server error details:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    setLoading(true);
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      await axios.delete(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUsers(users.filter(user => user._id !== userId));
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Error deleting user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh a specific user from the server
  const refreshUser = async (userId) => {
    try {
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const response = await axios.get(`/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update the user in the users array
      setUsers(users.map(user => user._id === userId ? response.data : user));
      
      // If this is the current user in localStorage, update that too
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser._id === userId || currentUser.id === userId) {
        localStorage.setItem('user', JSON.stringify(response.data));
        // Dispatch an event to notify AuthContext
        window.dispatchEvent(new CustomEvent('userDataRefreshed', { 
          detail: { user: response.data } 
        }));
      }
      
      return response.data;
    } catch (err) {
      console.error('Error refreshing user data:', err);
      throw err;
    }
  };

  // Test payload function
  const testPayload = async () => {
    try {
      console.log('Testing payload endpoint...');
      
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'Branch_Manager'
      };
      
      const response = await axios({
        method: 'post',
        url: '/api/users/test-payload',
        data: JSON.stringify(testData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Test payload response:', response.data);
      return response.data;
    } catch (err) {
      console.error('Test payload error:', err);
      return {
        success: false,
        error: err.message,
        responseData: err.response?.data
      };
    }
  };

  return (
    <UserContext.Provider value={{
      users,
      loading,
      isEmailVerified: users.some(user => user.isEmailVerified),
      error,
      fetchUsers,
      createUser,
      updateUser,
      deleteUser,
      refreshUser,
      testPayload  // Add the test function to the context
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;