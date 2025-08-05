import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

const StaffContext = createContext();

export const useStaff = () => {
    const context = useContext(StaffContext);
    if (!context) {
        throw new Error('useStaff must be used within a StaffProvider');
    }
    return context;
};

export const StaffProvider = ({ children }) => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalStaff: 0,
        activeStaff: 0,
        inactiveStaff: 0,
        suspendedStaff: 0,
        employees: 0,
        waiters: 0,
        chefs: 0
    });

    const { user, token } = useContext(AuthContext);

    // Get all staff for the current branch
    const fetchStaff = useCallback(async (staffType = 'all') => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            setError('Access denied. Only branch managers can view staff.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(
                `/api/staff/branch/${user.branchId}?staffType=${staffType}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setStaff(response.data.data);
            } else {
                setError('Failed to fetch staff data');
            }
        } catch (err) {
            console.error('Error fetching staff:', err);
            setError(err.response?.data?.message || 'Failed to fetch staff');
        } finally {
            setLoading(false);
        }
    }, [user, token]);

    // Get staff statistics
    const fetchStaffStats = useCallback(async () => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            return;
        }

        try {
            const response = await axios.get(
                `/api/staff/branch/${user.branchId}/stats`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching staff stats:', err);
        }
    }, [user, token]);

    // Create new staff member
    const createStaff = useCallback(async (staffData) => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            throw new Error('Access denied. Only branch managers can create staff.');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `/api/staff/branch/${user.branchId}`,
                staffData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                // Refresh staff list
                await fetchStaff();
                await fetchStaffStats();
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to create staff member');
            }
        } catch (err) {
            console.error('Error creating staff:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to create staff member';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, token, fetchStaff, fetchStaffStats]);

    // Update staff member
    const updateStaff = useCallback(async (staffId, staffData) => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            throw new Error('Access denied. Only branch managers can update staff.');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.put(
                `/api/staff/branch/${user.branchId}/${staffId}`,
                staffData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                // Refresh staff list
                await fetchStaff();
                await fetchStaffStats();
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to update staff member');
            }
        } catch (err) {
            console.error('Error updating staff:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update staff member';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, token, fetchStaff, fetchStaffStats]);

    // Update staff status
    const updateStaffStatus = useCallback(async (staffId, status) => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            throw new Error('Access denied. Only branch managers can update staff status.');
        }

        try {
            const response = await axios.patch(
                `/api/staff/branch/${user.branchId}/${staffId}/status`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                // Refresh staff list
                await fetchStaff();
                await fetchStaffStats();
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to update staff status');
            }
        } catch (err) {
            console.error('Error updating staff status:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update staff status';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [user, token, fetchStaff, fetchStaffStats]);

    // Delete staff member
    const deleteStaff = useCallback(async (staffId) => {
        if (!user || !user.branchId || user.role !== 'Branch_Manager') {
            throw new Error('Access denied. Only branch managers can delete staff.');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.delete(
                `/api/staff/branch/${user.branchId}/${staffId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                // Refresh staff list
                await fetchStaff();
                await fetchStaffStats();
                return true;
            } else {
                throw new Error(response.data.message || 'Failed to delete staff member');
            }
        } catch (err) {
            console.error('Error deleting staff:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to delete staff member';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [user, token, fetchStaff, fetchStaffStats]);

    const value = {
        staff,
        loading,
        error,
        stats,
        fetchStaff,
        fetchStaffStats,
        createStaff,
        updateStaff,
        updateStaffStatus,
        deleteStaff,
        setError
    };

    return (
        <StaffContext.Provider value={value}>
            {children}
        </StaffContext.Provider>
    );
};

export default StaffContext;
