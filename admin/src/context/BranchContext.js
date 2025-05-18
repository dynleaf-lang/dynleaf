import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useContext(AuthContext);
    
    const API_URL = process.env.REACT_APP_BASE_API_URL || 'http://localhost:5001/api';

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
            const response = await axios.get(`${API_URL}/branches`, config);
            setBranches(response.data);
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError(err.response?.data?.message || 'Failed to fetch branches');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchesByRestaurant = async (restaurantId) => {
        setLoading(true);
        setError(null);
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            };
            const response = await axios.get(`${API_URL}/branches/restaurant/${restaurantId}`, config);
            setBranches(response.data);
            return response.data;
        } catch (err) {
            console.error('Error fetching branches for restaurant:', err);
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
            const response = await axios.get(`${API_URL}/branches/${id}`, config);
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
            const response = await axios.post(`${API_URL}/branches`, branchData, config);
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
            const response = await axios.put(`${API_URL}/branches/${id}`, branchData, config);
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
            await axios.delete(`${API_URL}/branches/${id}`, config);
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
            createBranch,
            updateBranch,
            deleteBranch
        }}>
            {children}
        </BranchContext.Provider>
    );
};