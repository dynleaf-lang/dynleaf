import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const RestaurantContext = createContext();

export const RestaurantProvider = ({ children }) => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useContext(AuthContext);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    
    // Use environment variable for API base URL
    const API_URL = process.env.REACT_APP_BASE_API_URL || 'http://localhost:5001/api';
    
    // Configure axios defaults for all requests
    useEffect(() => {
        axios.defaults.baseURL = API_URL.replace(/\/api$/, '');  // Remove '/api' if it's at the end
        
        // Add request interceptor to show when requests are made
        axios.interceptors.request.use(
            config => { 
                return config;
            },
            error => {
                return Promise.reject(error);
            }
        );
    }, [API_URL]);

    // Original function that fetches all restaurants (keeping for backward compatibility)
    const fetchRestaurants = async () => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return;
        }
        
        setLoading(true);
        setError(null);
        try { 
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            
            // Use consistent URL format
            const response = await axios.get('/api/restaurants', config); 
            setRestaurants(response.data);
        } catch (err) {
            console.error('Error fetching restaurants:', err);
            
            // Provide more detailed error information
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Response data:', err.response.data);
                console.error('Response status:', err.response.status);
                setError(`Failed to fetch restaurants: ${err.response.status} - ${err.response.data.message || 'Server error'}`);
            } else if (err.request) {
                // The request was made but no response was received
                console.error('No response received:', err.request);
                setError('Failed to fetch restaurants: No response from server');
            } else {
                // Something happened in setting up the request
                console.error('Error message:', err.message);
                setError(`Failed to fetch restaurants: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // New function for paginated restaurant fetching
    const getRestaurants = async (pageNumber = 1, pageLimit = 10) => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return;
        }
        
        setLoading(true);
        setError(null);
        try { 
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    page: pageNumber,
                    limit: pageLimit
                }
            };
            
            const response = await axios.get('/api/restaurants', config);
            
            // Check if the response has pagination metadata
            if (response.data.restaurants && response.data.pagination) {
                setRestaurants(response.data.restaurants);
                setTotalPages(response.data.pagination.totalPages);
                setTotalCount(response.data.pagination.totalCount);
                setPage(pageNumber);
                setLimit(pageLimit);
            } else {
                // Fallback for backward compatibility if endpoint doesn't support pagination yet
                setRestaurants(response.data);
            }
            
            return response.data;
        } catch (err) {
            console.error('Error fetching restaurants:', err);
            
            if (err.response) {
                console.error('Response data:', err.response.data);
                console.error('Response status:', err.response.status);
                setError(`Failed to fetch restaurants: ${err.response.status} - ${err.response.data.message || 'Server error'}`);
            } else if (err.request) {
                console.error('No response received:', err.request);
                setError('Failed to fetch restaurants: No response from server');
            } else {
                console.error('Error message:', err.message);
                setError(`Failed to fetch restaurants: ${err.message}`);
            }
            
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Rest of the methods updated to use consistent URL format
    const getRestaurant = async (id) => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return null;
        }
        
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            const response = await axios.get(`/api/restaurants/${id}`, config);
            return response.data;
        } catch (err) {
            console.error('Error fetching restaurant:', err);
            setError(err.response?.data?.message || 'Failed to fetch restaurant');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const createRestaurant = async (restaurantData) => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return null;
        }
        
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            const response = await axios.post('/api/restaurants', restaurantData, config);
            setRestaurants([...restaurants, response.data]);
            return response.data;
        } catch (err) {
            console.error('Error creating restaurant:', err);
            setError(err.response?.data?.message || 'Failed to create restaurant');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateRestaurant = async (id, restaurantData) => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return null;
        }
        
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };
            const response = await axios.put(`/api/restaurants/${id}`, restaurantData, config);
            setRestaurants(restaurants.map(restaurant => 
                restaurant._id === id ? response.data : restaurant
            ));
            return response.data;
        } catch (err) {
            console.error('Error updating restaurant:', err);
            setError(err.response?.data?.message || 'Failed to update restaurant');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteRestaurant = async (id) => {
        if (!token) {
            setError('Authentication required. Please log in.');
            return false;
        }
        
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
            await axios.delete(`/api/restaurants/${id}`, config);
            setRestaurants(restaurants.filter(restaurant => restaurant._id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting restaurant:', err);
            setError(err.response?.data?.message || 'Failed to delete restaurant');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Load restaurants when the component mounts or token changes
    useEffect(() => {
        if (token) {
            getRestaurants();
        } else {
            setRestaurants([]);
        }
    }, [token]);

    return (
        <RestaurantContext.Provider value={{
            restaurants,
            loading,
            error,
            fetchRestaurants,
            getRestaurant,
            fetchRestaurantById: getRestaurant, // Alias for getRestaurant
            createRestaurant,
            updateRestaurant,
            deleteRestaurant,
            // Pagination methods
            page,
            limit,
            totalPages,
            totalCount,
            getRestaurants
        }}>
            {children}
        </RestaurantContext.Provider>
    );
};