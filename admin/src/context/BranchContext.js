import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

// Configure axios with base URL from environment variables
axios.defaults.baseURL = process.env.API_BASE_URL || 'http://localhost:5001';

// Helper function to ensure ID is a string
const ensureIdString = (id) => {
    if (!id) return '';
    return typeof id === 'object' && id.toString ? id.toString() : String(id);
};

export const BranchProvider = ({ children }) => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useContext(AuthContext);
    
    // We'll use axios's baseURL instead, which is already configured in AuthContext
    
    const fetchBranches = async () => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.get('/api/branches', config);
            setBranches(response.data);
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError(err.response?.data?.message || 'Failed to fetch branches');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchesByRestaurant = async (restaurantId) => {
        // Don't set global loading state when called from components
        setError(null);
        
        try {
            if (!restaurantId) {
                console.warn('Restaurant ID is missing');
                return [];
            }
            
            // Ensure restaurant ID is a string
            const restaurantIdStr = ensureIdString(restaurantId);
            console.log(`Fetching branches for restaurant: ${restaurantIdStr}`);
            
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                // Add timeout to prevent hanging requests
                timeout: 10000
            };
            
            try {
                const response = await axios.get(`/api/branches/restaurant/${restaurantIdStr}`, config);
                console.log(`Found ${response.data.length} branches for restaurant ${restaurantIdStr}`);
                return response.data;
            } catch (axiosError) {
                // Handle axios specific errors
                if (axiosError.code === 'ECONNABORTED') {
                    console.error('Request timeout');
                    setError('Request timed out. Please try again.');
                    return [];
                }
                throw axiosError; // Re-throw to be caught by outer catch
            }
        } catch (err) {
            console.error('Error fetching branches for restaurant:', err);
            
            // Enhanced error logging
            if (err.response) {
                console.error('Response status:', err.response.status);
                console.error('Response data:', err.response.data);
                
                // Handle specific error cases with more user-friendly messages
                if (err.response.status === 403) {
                    setError('You do not have permission to view branches for this restaurant');
                } else if (err.response.status === 404) {
                    setError('Restaurant not found');
                } else {
                    setError(`Error (${err.response.status}): ${err.response.data?.message || 'Failed to fetch branches'}`);
                }
            } else if (err.request) {
                // The request was made but no response was received
                console.error('No response received:', err.request);
                setError('Server did not respond. Please check your connection.');
            } else {
                // Something else caused the error
                console.error('Error message:', err.message);
                setError('Failed to fetch branches: ' + err.message);
            }
            
            // Return empty array instead of throwing to prevent UI crashes
            return [];
        }
    };

    const getBranches = async () => {
        setLoading(true);
        setError(null);
        try {   
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };  
            const response = await axios.get('/api/branches', config);
            setBranches(response.data);
            return response.data;
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError(err.response?.data?.message || 'Failed to fetch branches');
            return [];
        } finally {
            setLoading(false);
        }
    };


    const getBranch = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.get(`/api/branches/${id}`, config);
            return response.data;
        } catch (err) {
            console.error('Error fetching branch:', err);
            setError(err.response?.data?.message || 'Failed to fetch branch');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const createBranch = async (branchData) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.post('/api/branches', branchData, config);
            setBranches([...branches, response.data]);
            return response.data;
        } catch (err) {
            console.error('Error creating branch:', err);
            setError(err.response?.data?.message || 'Failed to create branch');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateBranch = async (id, branchData) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.put(`/api/branches/${id}`, branchData, config);
            setBranches(branches.map(branch => 
                branch._id === id ? response.data : branch
            ));
            return response.data;
        } catch (err) {
            console.error('Error updating branch:', err);
            setError(err.response?.data?.message || 'Failed to update branch');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteBranch = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };
            await axios.delete(`/api/branches/${id}`, config);
            setBranches(branches.filter(branch => branch._id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting branch:', err);
            setError(err.response?.data?.message || 'Failed to delete branch');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Update branch settings (e.g., whatsappUpdatesEnabled)
    const updateBranchSettings = async (id, settings) => {
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.patch(`/api/branches/${id}/settings`, { settings }, config);
            const updated = response.data?.branch || response.data;
            if (updated && updated._id) {
                setBranches(prev => prev.map(b => (b._id === updated._id ? updated : b)));
            }
            return updated;
        } catch (err) {
            console.error('Error updating branch settings:', err);
            setError(err.response?.data?.message || 'Failed to update branch settings');
            throw err;
        }
    };

    // Load branches when the component mounts
    useEffect(() => {
        if (token) {
            fetchBranches();
        }
    }, [token]);

    return (
        <BranchContext.Provider value={{
            branches,
            loading,
            error,
            fetchBranches,
            fetchBranchesByRestaurant,
            getBranch,
            getBranches,
            fetchBranchById: getBranch, // Alias for getBranch function
            createBranch,
            updateBranch,
            deleteBranch
            ,updateBranchSettings
        }}>
            {children}
        </BranchContext.Provider>
    );
};