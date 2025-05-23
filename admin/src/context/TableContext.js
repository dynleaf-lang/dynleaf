import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

// Enable detailed debugging for table operations
const DEBUG_MODE = true;

const TableContext = createContext();

const TableProvider = ({ children }) => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tableZones, setTableZones] = useState([]);
    const [reservations, setReservations] = useState({});
    const [tablesWithOrders, setTablesWithOrders] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const { user } = useContext(AuthContext);
    
    // Debug logger that only logs in debug mode
    const debug = (message, data) => {
        if (DEBUG_MODE) {
            console.log(`[TableContext Debug] ${message}`, data);
        }
    };

    // Get all tables for the current branch with optional filters
    const fetchTables = async (filters = {}) => {
        if (!user) {
            const errorMessage = 'User authentication required';
            debug('Authentication error', { error: errorMessage });
            setError(errorMessage);
            return [];
        }
        
        if (!user.restaurantId || !user.branchId) {
            const missingIds = [];
            if (!user.restaurantId) missingIds.push('restaurant');
            if (!user.branchId) missingIds.push('branch');
            
            const errorMessage = `User authentication error: Missing ${missingIds.join(' and ')} ID`;
            debug('Missing IDs', { user, missingIds });
            console.error(errorMessage, { user });
            setError(errorMessage);
            return [];
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            
            // Add filter parameters if they exist
            if (filters.zone) queryParams.append('zone', filters.zone);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.isVIP !== undefined) queryParams.append('isVIP', filters.isVIP);
            if (filters.minCapacity) queryParams.append('minCapacity', filters.minCapacity);
            if (filters.maxCapacity) queryParams.append('maxCapacity', filters.maxCapacity);
            
            const queryString = queryParams.toString();
            const url = `/api/tables${queryString ? '?' + queryString : ''}`;
            
            debug('Fetching tables', {
                restaurantId: user.restaurantId,
                branchId: user.branchId,
                url,
                filters
            });
            
            // Add a timestamp parameter to prevent caching issues
            const timestampedUrl = url + (queryString ? '&' : '?') + '_t=' + Date.now();
            
            // Add a specific header for debugging
            const response = await axios.get(timestampedUrl, {
                headers: {
                    'X-Debug-Mode': 'true',
                    'X-Request-ID': `table-fetch-${Date.now()}`
                }
            });
            
            debug('API Response received', { status: response.status, headers: response.headers });
            
            if (!response.data) {
                throw new Error('Empty response from server');
            }
            
            if (!response.data.data) {
                throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
            }
            
            const tableData = response.data.data;
            debug('Tables fetched successfully', { count: tableData.length });
            setTables(tableData);
            return tableData;
        } catch (error) {
            // Enhanced error logging
            debug('Error details', { 
                message: error.message,
                response: error.response,
                request: error.request,
                config: error.config
            });
            
            let errorMessage = 'Failed to fetch dining tables';
            
            if (error.response) {
                // Server responded with an error status
                errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
                debug('Server error response', { 
                    status: error.response.status,
                    data: error.response.data
                });
            } else if (error.request) {
                // Request made but no response received
                errorMessage = 'No response received from server. Please check your network connection.';
                debug('No response from server', { request: error.request });
            } else {
                // Error in setting up the request
                errorMessage = `Request setup error: ${error.message}`;
                debug('Request setup error', { error });
            }
            
            console.error('Error fetching tables:', error);
            setError(errorMessage);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Create a new table
    const createTable = async (tableData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.post('/api/tables', tableData);
            setTables([...tables, response.data.data]);
            return { success: true, table: response.data.data };
        } catch (error) {
            console.error('Error creating table:', error);
            setError(error.response?.data?.message || 'Failed to create table');
            return { success: false, error: error.response?.data?.message || 'Failed to create table' };
        } finally {
            setLoading(false);
        }
    };

    // Update an existing table
    const updateTable = async (tableId, tableData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put(`/api/tables/${tableId}`, tableData);
            setTables(tables.map(table => 
                table._id === tableId ? response.data.data : table
            ));
            return { success: true, table: response.data.data };
        } catch (error) {
            console.error('Error updating table:', error);
            setError(error.response?.data?.message || 'Failed to update table');
            return { success: false, error: error.response?.data?.message || 'Failed to update table' };
        } finally {
            setLoading(false);
        }
    };

    // Delete a table
    const deleteTable = async (tableId) => {
        setLoading(true);
        setError(null);
        
        try {
            await axios.delete(`/api/tables/${tableId}`);
            setTables(tables.filter(table => table._id !== tableId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting table:', error);
            setError(error.response?.data?.message || 'Failed to delete table');
            return { success: false, error: error.response?.data?.message || 'Failed to delete table' };
        } finally {
            setLoading(false);
        }
    };

    // Update table status (occupied/available)
    const updateTableStatus = async (tableId, status) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put(`/api/tables/${tableId}/status`, status);
            setTables(tables.map(table => 
                table._id === tableId ? response.data.data : table
            ));
            return { success: true, table: response.data.data };
        } catch (error) {
            console.error('Error updating table status:', error);
            setError(error.response?.data?.message || 'Failed to update table status');
            return { success: false, error: error.response?.data?.message || 'Failed to update table status' };
        } finally {
            setLoading(false);
        }
    };

    // Get all available zones for filtering
    const fetchTableZones = async () => {
        if (!user || !user.branchId) return [];
        
        try {
            const response = await axios.get('/api/tables/zones');
            setTableZones(response.data.data);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching table zones:', error);
            return [];
        }
    };

    // Create a reservation for a table
    const createReservation = async (tableId, reservationData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.post(`/api/tables/${tableId}/reservations`, reservationData);
            
            // Update the reservations state
            setReservations(prev => ({
                ...prev,
                [tableId]: [...(prev[tableId] || []), response.data.data]
            }));
            
            return { success: true, reservation: response.data.data };
        } catch (error) {
            console.error('Error creating reservation:', error);
            setError(error.response?.data?.message || 'Failed to create reservation');
            return { success: false, error: error.response?.data?.message || 'Failed to create reservation' };
        } finally {
            setLoading(false);
        }
    };

    // Get reservations for a specific table
    const getTableReservations = async (tableId, filters = {}) => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams();
            
            if (filters.date) queryParams.append('date', filters.date);
            if (filters.status) queryParams.append('status', filters.status);
            
            const url = `/api/tables/${tableId}/reservations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await axios.get(url);
            
            // Update the reservations state for this table
            setReservations(prev => ({
                ...prev,
                [tableId]: response.data.data
            }));
            
            return { success: true, reservations: response.data.data };
        } catch (error) {
            console.error('Error fetching reservations:', error);
            setError(error.response?.data?.message || 'Failed to fetch reservations');
            return { success: false, error: error.response?.data?.message || 'Failed to fetch reservations' };
        } finally {
            setLoading(false);
        }
    };

    // Update a reservation
    const updateReservation = async (tableId, reservationId, reservationData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put(`/api/tables/${tableId}/reservations/${reservationId}`, reservationData);
            
            // Update the reservations state
            setReservations(prev => {
                const tableReservations = [...(prev[tableId] || [])];
                const index = tableReservations.findIndex(r => r._id === reservationId);
                
                if (index !== -1) {
                    tableReservations[index] = response.data.data;
                }
                
                return {
                    ...prev,
                    [tableId]: tableReservations
                };
            });
            
            return { success: true, reservation: response.data.data };
        } catch (error) {
            console.error('Error updating reservation:', error);
            setError(error.response?.data?.message || 'Failed to update reservation');
            return { success: false, error: error.response?.data?.message || 'Failed to update reservation' };
        } finally {
            setLoading(false);
        }
    };

    // Cancel a reservation
    const cancelReservation = async (tableId, reservationId) => {
        setLoading(true);
        setError(null);
        
        try {
            await axios.put(`/api/tables/${tableId}/reservations/${reservationId}/cancel`);
            
            // Update the reservations state
            setReservations(prev => {
                const tableReservations = [...(prev[tableId] || [])];
                const index = tableReservations.findIndex(r => r._id === reservationId);
                
                if (index !== -1) {
                    tableReservations[index].status = 'cancelled';
                }
                
                return {
                    ...prev,
                    [tableId]: tableReservations
                };
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error cancelling reservation:', error);
            setError(error.response?.data?.message || 'Failed to cancel reservation');
            return { success: false, error: error.response?.data?.message || 'Failed to cancel reservation' };
        } finally {
            setLoading(false);
        }
    };

    // Get available tables for a specific time
    const getAvailableTables = async (params) => {
        setLoading(true);
        setError(null);
        
        try {
            const { date, startTime, endTime, partySize } = params;
            
            const queryParams = new URLSearchParams({
                date,
                startTime,
                endTime
            });
            
            if (partySize) queryParams.append('partySize', partySize);
            
            const response = await axios.get(`/api/tables/available?${queryParams.toString()}`);
            setAvailableTables(response.data.data);
            
            return { success: true, tables: response.data.data };
        } catch (error) {
            console.error('Error fetching available tables:', error);
            setError(error.response?.data?.message || 'Failed to fetch available tables');
            return { success: false, error: error.response?.data?.message || 'Failed to fetch available tables' };
        } finally {
            setLoading(false);
        }
    };

    // Update table positions in floor plan
    const updateTablePositions = async (tablePositions) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put('/api/tables/positions', { tables: tablePositions });
            
            // Refresh tables to get updated positions
            await fetchTables();
            
            return { success: true, result: response.data };
        } catch (error) {
            console.error('Error updating table positions:', error);
            setError(error.response?.data?.message || 'Failed to update table positions');
            return { success: false, error: error.response?.data?.message || 'Failed to update table positions' };
        } finally {
            setLoading(false);
        }
    };

    // Assign a table to an order
    const assignTableToOrder = async (tableId, orderId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put(`/api/tables/${tableId}/assign-order`, { orderId });
            
            // Update tables state
            setTables(tables.map(table => 
                table._id === tableId ? response.data.data : table
            ));
            
            return { success: true, table: response.data.data };
        } catch (error) {
            console.error('Error assigning table to order:', error);
            setError(error.response?.data?.message || 'Failed to assign table to order');
            return { success: false, error: error.response?.data?.message || 'Failed to assign table to order' };
        } finally {
            setLoading(false);
        }
    };

    // Release a table from an order
    const releaseTable = async (tableId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.put(`/api/tables/${tableId}/release`);
            
            // Update tables state
            setTables(tables.map(table => 
                table._id === tableId ? response.data.data : table
            ));
            
            return { success: true, table: response.data.data };
        } catch (error) {
            console.error('Error releasing table:', error);
            setError(error.response?.data?.message || 'Failed to release table');
            return { success: false, error: error.response?.data?.message || 'Failed to release table' };
        } finally {
            setLoading(false);
        }
    };

    // Get all tables with current orders
    const getTablesWithOrders = async () => {
        if (!user || !user.branchId) return [];
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.get('/api/tables/with-orders');
            setTablesWithOrders(response.data.data);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching tables with orders:', error);
            setError(error.response?.data?.message || 'Failed to fetch tables with orders');
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Load tables when the component mounts and when the user/branch changes
    useEffect(() => {
        if (user && user.branchId) {
            debug('User or branch changed, fetching tables', { 
                userId: user.id,
                branchId: user.branchId
            });
            fetchTables();
            fetchTableZones();
        }
    }, [user?.branchId]);

    return (
        <TableContext.Provider value={{
            tables,
            loading,
            error,
            tableZones,
            reservations,
            tablesWithOrders,
            availableTables,
            fetchTables,
            createTable,
            updateTable,
            deleteTable,
            updateTableStatus,
            fetchTableZones,
            createReservation,
            getTableReservations,
            updateReservation,
            cancelReservation,
            getAvailableTables,
            updateTablePositions,
            assignTableToOrder,
            releaseTable,
            getTablesWithOrders,
            debugMode: DEBUG_MODE
        }}>
            {children}
        </TableContext.Provider>
    );
};

export { TableContext, TableProvider };
export default TableProvider;