import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import api from '../utils/api';

export const TableContext = createContext();

export const TableProvider = ({ children }) => {
  const [tables, setTables] = useState([]);
  const [floors, setFloors] = useState([]);
  const [tableZones, setTableZones] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  // Listen for real-time table status updates
  useEffect(() => {
    if (!socket) return;

    const handleTableStatusUpdate = (data) => {
      console.log('[TABLE CONTEXT] Received table status update:', data);
      
      // Update the specific table in the tables array
      setTables((prevTables) => 
        prevTables.map((table) => {
          if (table._id === data.tableId) {
            console.log(`[TABLE CONTEXT] Updating table ${table.tableNumber} from ${table.status} to ${data.status}`);
            return {
              ...table,
              status: data.status,
              isOccupied: data.status === 'occupied',
              currentOrderId: data.currentOrderId,
              currentOrder: data.currentOrderId // Also update currentOrder field
            };
          }
          return table;
        })
      );
    };

    // Also listen for new orders to update table status
    const handleNewOrder = (order) => {
      console.log('[TABLE CONTEXT] Received new order:', order._id);
      
      // If order has a tableId, update that table's status
      if (order.tableId) {
        setTables((prevTables) => 
          prevTables.map((table) => {
            if (table._id === order.tableId) {
              console.log(`[TABLE CONTEXT] New order for table ${table.tableNumber}, setting to occupied`);
              return {
                ...table,
                status: 'occupied',
                isOccupied: true,
                currentOrderId: order._id,
                currentOrder: order._id
              };
            }
            return table;
          })
        );
      }
    };

    socket.on('tableStatusUpdate', handleTableStatusUpdate);
    socket.on('newOrder', handleNewOrder);

    return () => {
      socket.off('tableStatusUpdate', handleTableStatusUpdate);
      socket.off('newOrder', handleNewOrder);
    };
  }, [socket]);

  // Get all tables for a restaurant/branch
  const getTables = async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string based on filters
      const queryParams = new URLSearchParams();
      
      if (filters.restaurantId) {
        queryParams.append('restaurantId', filters.restaurantId);
      } else if (user?.restaurantId) {
        queryParams.append('restaurantId', user.restaurantId);
      }
      
      if (filters.branchId) {
        queryParams.append('branchId', filters.branchId);
      } else if (user?.branchId) {
        queryParams.append('branchId', user.branchId);
      }
      
      // Add other filters if provided
      if (filters.zone) queryParams.append('zone', filters.zone);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.isVIP) queryParams.append('isVIP', true);
      if (filters.minCapacity) queryParams.append('minCapacity', filters.minCapacity);
      if (filters.maxCapacity) queryParams.append('maxCapacity', filters.maxCapacity);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await api.get(`/tables${query}`);
      
      if (response.data && response.data.data) {
        setTables(response.data.data);
        return { success: true, tables: response.data.data };
      } else {
        setTables(response.data || []);
        return { success: true, tables: response.data || [] };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch tables';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Alias for getTables to maintain existing code compatibility
  const fetchTables = getTables;

//get all reservations for a restaurant
  const getReservations = async (restaurantId) => {
    setLoading(true);
    setError(null);
    try {
      // Use restaurantId from params, or fall back to user context
      const id = restaurantId || user?.restaurantId;
      if (!id) {
        console.warn('No restaurant ID available for fetching reservations');
        return { success: false, message: 'Restaurant ID is required' };
      }
      
      console.log(`Fetching reservations for restaurant ID: ${id}`);
      const response = await api.get(`/reservations/restaurant/${id}`);
      
      // Handle different response formats
      let reservationsData = [];
      if (response.data && Array.isArray(response.data)) {
        reservationsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        reservationsData = response.data.data;
      } else if (response.data && response.data.reservations && Array.isArray(response.data.reservations)) {
        reservationsData = response.data.reservations;
      } else {
        console.warn('Unexpected response format from reservations API:', response.data);
        reservationsData = [];
      }
      
      console.log(`Received ${reservationsData.length} reservations from API`);
      
      // Add table name to each reservation if missing
      const processedReservations = reservationsData.map(reservation => {
        // Ensure each reservation has appropriate fields for display
        return {
          ...reservation,
          tableName: reservation.tableName || 
                    (reservation.tableId && typeof reservation.tableId === 'object' ? 
                     reservation.tableId.name || `Table ${reservation.tableId.number}` : 
                     `Table ${reservation.tableId || 'Unknown'}`),
          status: reservation.status || 'pending',
          customerName: reservation.customerName || 'Guest',
          partySize: reservation.partySize || 1
        };
      });
      
      // Set the reservations state to make it available to components
      setReservations(processedReservations);

      return { success: true, reservations: processedReservations };
    } catch (err) { 
      console.error('Error fetching reservations:', err);
      const errorMessage = err.response?.data?.message || 'Failed to fetch reservations';
      setError(errorMessage); 
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    } 
  };  


  // Get all floors for a restaurant
  const getFloors = async (restaurantId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use restaurantId from params, or fall back to user context
      const id = restaurantId || user?.restaurantId;
      if (!id) {
        return { success: false, message: 'Restaurant ID is required' };
      }
      
      const response = await api.get(`/floors/restaurant/${id}`);
      
      const floorsData = response.data || [];
      setFloors(floorsData);
      return { success: true, floors: floorsData };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch floors';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

   

  // Alias for getFloors
  const fetchFloors = getFloors;

  // Get all table zones for a restaurant
  const getTableZones = async (restaurantId) => {
    setLoading(true);
    setError(null);
    
    try {
      // First, ensure we have tables to extract zones from
      if (tables.length === 0) {
        // If no tables in state yet, fetch them first
        const id = restaurantId || user?.restaurantId;
        if (id) {
          await getTables({ restaurantId: id });
        }
      }
      
      // Extract unique zones from tables
      const zones = Array.from(new Set(
        tables
          .filter(table => table.location && table.location.zone)
          .map(table => table.location.zone)
      ));
      
      // Add default zones if none exist
      const defaultZones = ['Main', 'Patio', 'Private'];
      const uniqueZones = Array.from(new Set([...zones, ...defaultZones]));
      
      setTableZones(uniqueZones);
      return { success: true, tableZones: uniqueZones };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch table zones';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };



  // Alias for getTableZones
  const fetchTableZones = getTableZones;

  // Create a new table
  const createTable = async (tableData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure restaurantId and branchId are set
      const data = { ...tableData };
      if (!data.restaurantId && user?.restaurantId) {
        data.restaurantId = user.restaurantId;
      }
      
      if (!data.branchId && user?.branchId) {
        data.branchId = user.branchId;
      }
      
      if (!data.restaurantId) {
        return { success: false, message: 'Restaurant ID is required' };
      }
      
      const response = await api.post(`/tables`, data);
      
      setTables(prev => [...prev, response.data]);
      return { success: true, table: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create table';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update a table
  const updateTable = async (tableId, tableData) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/tables/${tableId}`, tableData);
      
      setTables(tables.map(table => (table._id === tableId ? response.data : table)));
      return { success: true, table: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update table';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete a table
  const deleteTable = async (tableId) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/tables/${tableId}`);
      
      setTables(tables.filter(table => table._id !== tableId));
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete table';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Create a new floor
  const createFloor = async (floorData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Ensure restaurantId is set
      const data = { ...floorData };
      if (!data.restaurantId && user?.restaurantId) {
        data.restaurantId = user.restaurantId;
      }
      
      if (!data.restaurantId) {
        return { success: false, message: 'Restaurant ID is required' };
      }
      
      const response = await api.post(`/floors`, data);
      
      setFloors([...floors, response.data]);
      return { success: true, floor: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create floor';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update a floor
  const updateFloor = async (floorId, floorData) => {
    if (!floorId) return { success: false, message: 'Floor ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/floors/${floorId}`, floorData);
      
      setFloors(floors.map(floor => (floor._id === floorId ? response.data : floor)));
      return { success: true, floor: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update floor';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete a floor
  const deleteFloor = async (floorId) => {
    if (!floorId) return { success: false, message: 'Floor ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/floors/${floorId}`);
      
      setFloors(floors.filter(floor => floor._id !== floorId));
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Get table reservations
  const getTableReservations = async (tableId, params = {}) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (params.date) queryParams.append('date', params.date);
      if (params.status) queryParams.append('status', params.status);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await api.get(`/tables/${tableId}/reservations${query}`);
      
      return { success: true, reservations: response.data.data || [] };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch reservations';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Create a reservation
  const createReservation = async (tableId, reservationData) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post(`/tables/${tableId}/reservations`, reservationData);
      
      return { success: true, reservation: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create reservation';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update a reservation
  const updateReservation = async (tableId, reservationId, reservationData) => {
    if (!tableId || !reservationId) return { success: false, message: 'Table ID and Reservation ID are required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/tables/${tableId}/reservations/${reservationId}`, reservationData);
      
      return { success: true, reservation: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update reservation';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Cancel a reservation
  const cancelReservation = async (tableId, reservationId) => {
    if (!tableId || !reservationId) return { success: false, message: 'Table ID and Reservation ID are required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(
        `/tables/${tableId}/reservations/${reservationId}/cancel`,
        {}
      );
      
      return { success: true, reservation: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to cancel reservation';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get all tables with their current order information
  const getTablesWithOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build URL with branch ID from user context if available
      let url = '/tables/with-orders';
      
      // Add query parameters for filtering
      const queryParams = new URLSearchParams();
      
      if (user?.restaurantId) {
        queryParams.append('restaurantId', user.restaurantId);
      }
      
      if (user?.branchId) {
        queryParams.append('branchId', user.branchId);
      }
      
      // Append query string if parameters exist
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
      
      console.log('DEBUG: Fetching tables from:', url, 'with user context:', { 
        restaurantId: user?.restaurantId,
        branchId: user?.branchId,
        role: user?.role
      });
      
      const response = await api.get(url);
      
      console.log('DEBUG: Raw API response:', response.status, response.statusText);
      
      let tablesData = [];
      
      // Handle different response formats from the API
      if (response.data && response.data.data) {
        // Response format: { data: [...tables] }
        console.log('DEBUG: Response format is { data: [...tables] }');
        tablesData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Response format: [...tables]
        console.log('DEBUG: Response format is [...tables]');
        tablesData = response.data;
      } else {
        console.error('DEBUG: Unexpected response format:', response.data);
        tablesData = [];
      }
      
      console.log(`DEBUG: Received ${tablesData.length} tables from API`);
      if (tablesData.length > 0) {
        console.log('DEBUG: First table sample:', tablesData[0]);
      } else {
        console.log('DEBUG: No tables received from API call');
      }
      
      // Process the tables to ensure consistent status properties
      const processedTables = tablesData.map(table => {
        // Create a normalized status field if it doesn't exist
        if (!table.status) {
          if (table.currentOrder) {
            table.status = 'Occupied';
          } else if (table.isReserved) {
            table.status = 'Reserved';
          } else {
            table.status = 'Available';
          }
        }
        
        return table;
      });
      
      console.log(`DEBUG: Processed ${processedTables.length} tables`);
      
      // Update tables with order information
      setTables(processedTables);
      return { success: true, tables: processedTables };
    } catch (err) {
      console.error('ERROR fetching tables with orders:', err);
      console.error('Request details:', { 
        url: '/tables/with-orders', 
        user: user ? { 
          restaurantId: user.restaurantId, 
          branchId: user.branchId,
          role: user.role 
        } : 'No user context'
      });
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch tables with orders';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Find customer by phone number
  const findCustomerByPhone = async (phone) => {
    if (!phone) return { success: false, message: 'Phone number is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the correct API endpoint with search query parameter
      const response = await api.get(`/customers?search=${encodeURIComponent(phone)}`);
      
      // Return all customers that might match instead of trying to find an exact match
      // This allows for different phone number formats to work properly
      return { success: true, customers: response.data };
    } catch (err) {
      console.error('Error searching for customer by phone:', err);
      const errorMessage = err.response?.data?.message || 'Failed to find customer';
      
      // Don't set global error for search failures, they'll be handled locally
      if (errorMessage === 'Not authorized to access all customers') {
        return { success: false, message: 'You do not have permission to search for customers' };
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Find customer by email
  const findCustomerByEmail = async (email) => {
    if (!email) return { success: false, message: 'Email is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the correct API endpoint with search query parameter
      const response = await api.get(`/customers?search=${encodeURIComponent(email)}`);
      
      // Return all customers that might match instead of trying to find one exact match
      return { success: true, customers: response.data };
    } catch (err) {
      console.error('Error searching for customer by email:', err);
      const errorMessage = err.response?.data?.message || 'Failed to find customer';
      
      // Don't set global error for search failures, they'll be handled locally
      if (errorMessage === 'Not authorized to access all customers') {
        return { success: false, message: 'You do not have permission to search for customers' };
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get customers with search capabilities
  const getCustomers = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      
      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      const response = await api.get(`/customers${query}`);
      
      return { success: true, customers: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch customers';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Assign a table to an order
  const assignTableToOrder = async (tableId, orderId) => {
    if (!tableId || !orderId) return { success: false, message: 'Table ID and Order ID are required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(
        `/tables/${tableId}/assign-order/${orderId}`,
        {}
      );
      
      // Update tables array with the updated table
      setTables(tables.map(table => (table._id === tableId ? response.data.data || response.data : table)));
      
      return { success: true, table: response.data.data || response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to assign table to order';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Release a table (mark as available and remove order association)
  const releaseTable = async (tableId) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(
        `/tables/${tableId}/release`,
        {}
      );
      
      // Update tables array with the updated table
      setTables(tables.map(table => (table._id === tableId ? response.data.data || response.data : table)));
      
      return { success: true, table: response.data.data || response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to release table';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update table positions in floor plan
  const updateTablePositions = async (tablePositions) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put('/tables/positions', { tables: tablePositions });
      
      // Update affected tables in state
      const updatedTables = [...tables];
      tablePositions.forEach(positionUpdate => {
        const tableIndex = updatedTables.findIndex(t => t._id === positionUpdate._id);
        if (tableIndex !== -1) {
          updatedTables[tableIndex] = {
            ...updatedTables[tableIndex],
            location: positionUpdate.location
          };
        }
      });
      
      setTables(updatedTables);
      return { success: true, message: 'Table positions updated successfully' };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update table positions';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get a single table by ID
  const getTable = async (tableId) => {
    if (!tableId) return { success: false, message: 'Table ID is required' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/tables/${tableId}`);
      return { success: true, table: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch table details';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return (
    <TableContext.Provider value={{ 
      tables, 
      floors, 
      tableZones,
      reservations,
      loading, 
      error, 
      getTables, 
      getFloors,
      getTableZones,
      fetchFloors,
      fetchTables,
      fetchTableZones,
      createTable, 
      updateTable, 
      deleteTable, 
      createFloor, 
      updateFloor, 
      deleteFloor, 
      getTableReservations, 
      createReservation, 
      updateReservation, 
      cancelReservation, 
      getReservations,
      findCustomerByPhone, 
      findCustomerByEmail, 
      getCustomers,
      getTablesWithOrders,
      assignTableToOrder,
      releaseTable,
      updateTablePositions,
      getTable
    }}>
      {children}
    </TableContext.Provider>
  );
};