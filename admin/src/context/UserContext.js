import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';


// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.API_BASE_URL || 'http://localhost:5001';


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

      const response = await axios.post('/api/users/register', userData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUsers([...users, response.data.user]);
      setError(null);
      return response.data.user;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'Error creating user');
      throw err;
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
      setError(err.response?.data?.message || 'Error updating user');
      throw err;
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

  return (
    <UserContext.Provider value={{
      users,
      loading,
      error,
      fetchUsers,
      createUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;