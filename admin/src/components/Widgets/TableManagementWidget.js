import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Badge,
  Row,
  Col,
  Table,
  Progress
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { format, parseISO, isAfter } from 'date-fns';
import { FaChair, FaUsers, FaClock, FaCalendarAlt } from 'react-icons/fa';
import useRenderTracker from '../../utils/useRenderTracker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

// Component to display table management data
const TableManagementWidget = React.memo(({ tables, reservations, loading }) => {
  useRenderTracker('TableManagementWidget');
  const { user } = useContext(AuthContext);
  
  // Add direct data fetch for tables only
  const [directFetchedTables, setDirectFetchedTables] = useState([]);
  
  // Debug logging for development
  useEffect(() => {
    console.log('TableManagementWidget received:', {
      tablesCount: tables?.length || 0,
      reservationsCount: reservations?.length || 0,
      loading
    });
    
    // Log sample data
    if (tables && tables.length > 0) {
      console.log('Sample table data:', tables[0]);
    }
  }, [tables, reservations, loading]);
  
  // If no tables are provided through props, try to fetch them directly
  useEffect(() => {
    const fetchTablesDirectly = async () => {
      if (!tables || tables.length === 0) {
        console.log("No tables received from props, attempting direct fetch");
        try {
          // Use the API utility to fetch tables
          let url = '/tables';
          if (user?.restaurantId) {
            url += `?restaurantId=${user.restaurantId}`;
            if (user?.branchId) {
              url += `&branchId=${user.branchId}`;
            }
          }
          
          const response = await api.get(url);
          
          if (response && response.data) {
            console.log("Directly fetched tables:", response.data);
            
            // Handle different data structures
            let tableData;
            if (response.data.data) {
              tableData = response.data.data; 
            } else if (Array.isArray(response.data)) {
              tableData = response.data;
            } else {
              tableData = [];
            }
            
            setDirectFetchedTables(tableData);
          }
        } catch (error) {
          console.error("Error directly fetching tables:", error);
        }
      }
    };
    
    fetchTablesDirectly();
  }, [tables, user]);
  
  // Extract reservations from tables data
  const extractedReservations = useMemo(() => {
    // Use tables from props or directly fetched tables
    const tablesData = (tables && tables.length > 0) ? tables : directFetchedTables;
    
    if (!tablesData || tablesData.length === 0) {
      return [];
    }
    
    console.log('Extracting reservations from tables data');
    
    // Gather all reservations from all tables
    const allReservations = [];
    
    tablesData.forEach(table => {
      // Check if table has reservations array
      if (table.reservations && Array.isArray(table.reservations)) {
        // Process each reservation
        table.reservations.forEach(reservation => {
          // Create proper table name using available information
          let tableName = '';
          
          // First try to use existing tableName
          if (reservation.tableName) {
            tableName = reservation.tableName;
          } 
          // Next try to use table name from the table object
          else if (table.name) {
            tableName = table.name;
          }
          // If table has a number property, use that
          else if (table.number) {
            tableName = `Table ${table.number}`;
          }
          // Last resort - use table ID
          else {
            tableName = `Table ${table._id ? table._id.substring(0, 5) : ''}`;
          }
          
          // Add tableName and other details to reservation
          const processedReservation = {
            ...reservation,
            tableName: tableName,
            tableNumber: reservation.tableNumber || table.number,
            tableId: reservation.tableId || table._id
          };
          allReservations.push(processedReservation);
        });
      }
    });
    
    console.log(`Extracted ${allReservations.length} reservations from ${tablesData.length} tables`);
    return allReservations;
  }, [tables, directFetchedTables]);
  
  // Calculate table statistics using useMemo
  const tableStats = useMemo(() => {
    // Use directFetchedTables as fallback if tables prop is empty
    const tablesData = (tables && tables.length > 0) ? tables : directFetchedTables;
    
    // Default values
    const defaultStats = {
      total: 0,
      occupied: 0,
      available: 0,
      reserved: 0,
    };
    
    // Return default stats if no tables data
    if (!tablesData || !Array.isArray(tablesData) || tablesData.length === 0) { 
      return defaultStats;
    }
    
    console.log('Processing tables for stats:', tablesData);
    
    // Count tables by status
    const stats = {...defaultStats, total: tablesData.length};
    
    for (const table of tablesData) {
      // Check for specific status indicators first
      const hasCurrentOrder = Boolean(table.currentOrder) || 
                              (Array.isArray(table.orders) && table.orders.length > 0);
                              
      const hasReservation = Boolean(table.isReserved) || 
                            (Array.isArray(table.reservations) && table.reservations.length > 0) ||
                            Boolean(table.currentReservation);
                            
      // Get the status string (converted to lowercase for case insensitive comparison)
      const tableStatus = String(table.status || '').toLowerCase();
 
      
      // Determine table status with priority for orders over reservations
      if (hasCurrentOrder || tableStatus === 'occupied') {
        stats.occupied++;
      } else if (hasReservation || tableStatus === 'reserved') {
        stats.reserved++;
      } else {
        stats.available++;
      }
    }
     
    return stats;
  }, [tables, directFetchedTables]);

  // Calculate table availability percentage
  const getTableAvailability = () => {
    if (tableStats.total === 0) return 0;
    
    // Calculate percentage of available tables
    const availabilityPercentage = Math.round((tableStats.available / tableStats.total) * 100);
    return availabilityPercentage;
  };
  

  // Process upcoming reservations
  const upcomingReservations = useMemo(() => {
    // Combine prop reservations and extracted reservations
    const combinedReservations = [
      ...(reservations || []),
      ...extractedReservations
    ];
    
    if (combinedReservations.length === 0) {
      console.log("No reservation data available to process");
      return [];
    }
     
    
    // Current date/time for comparison
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    try {
      // Process and filter reservations
      const processedReservations = combinedReservations
        .filter(reservation => {
          // Skip if missing required data
          if (!reservation) return false;
          
          try {
            // Try to parse the date, looking at multiple possible fields
            const dateString = reservation.startTime || 
                              reservation.date || 
                              reservation.reservationDate || 
                              reservation.reservationTime;
                              
            if (!dateString) return false;
            
            const reservationDate = new Date(dateString);
            
            // Include only upcoming reservations (in the next 7 days)
            const isUpcoming = reservationDate > now && reservationDate < sevenDaysFromNow;
            const notCancelled = reservation.status?.toLowerCase() !== 'cancelled';
            
            return isUpcoming && notCancelled;
          } catch (error) {
            console.error("Error processing reservation date:", error);
            return false;
          }
        })
        .sort((a, b) => {
          // Sort by date (earliest first)
          const dateA = new Date(a.startTime || a.date || a.reservationDate || a.reservationTime);
          const dateB = new Date(b.startTime || b.date || b.reservationDate || b.reservationTime);
          return dateA - dateB;
        })
        .slice(0, 5); // Only show up to 5 reservations      
       
      console.log(`Found ${processedReservations.length} upcoming reservations after filtering`);
      return processedReservations;
    } catch (error) {
      console.error("Error processing reservations:", error);
      return [];
    }
  }, [reservations, extractedReservations]);


   

  const getStatusColor = (status) => {
    if (!status) return 'secondary';
    
    switch(status.toLowerCase()) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'completed':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const formatReservationTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Card className="shadow">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Table Management</h6>
        <Link to="/admin/tables-management">
          <Button color="primary" size="sm">Manage Tables</Button>
        </Link>
      </CardHeader>
      <CardBody>
        <Row className="mb-4">
          <Col md="6">
            <Card className="shadow-sm mb-3">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-uppercase text-muted ls-1 mb-1">
                      Table Availability
                    </h6>
                    <div className="d-flex align-items-center">
                      <span className="h2 font-weight-bold mb-0 mr-2">
                        {loading ? <Spinner size="sm" /> : getTableAvailability()}%
                      </span>
                      <FaChair className={`text-${getTableAvailability() > 50 ? 'success' : 'warning'}`} size={18} />
                    </div>
                  </div>
                  <div>
                    <Button color="secondary" size="sm" className="rounded-circle" disabled>
                      <FaChair />
                    </Button>
                  </div>
                </div>
                <Progress 
                  className="my-3"
                  color={getTableAvailability() > 50 ? 'success' : 'warning'}
                  value={getTableAvailability()}
                />
                <p className="mt-3 mb-0 text-sm">
                  <span className="text-nowrap">
                    {tableStats.available} of {tableStats.total} tables available
                  </span>
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col md="6">
            <Card className="shadow-sm mb-3">
              <CardBody>
                <div className="d-flex justify-content-between">
                  <div>
                    <h6 className="text-uppercase text-muted ls-1 mb-1">
                      Table Status
                    </h6>
                  </div>
                </div>
                <div className="d-flex justify-content-around mt-3">
                  <div className="text-center">
                    <div className="h4 font-weight-bold mb-0">
                      {loading ? <Spinner size="sm" /> : tableStats.occupied}
                    </div>
                    <Badge color="danger" pill>Occupied</Badge>
                  </div>
                  <div className="text-center">
                    <div className="h4 font-weight-bold mb-0">
                      {loading ? <Spinner size="sm" /> : tableStats.available}
                    </div>
                    <Badge color="success" pill>Available</Badge>
                  </div>
                  <div className="text-center">
                    <div className="h4 font-weight-bold mb-0">
                      {loading ? <Spinner size="sm" /> : tableStats.reserved}
                    </div>
                    <Badge color="warning" pill>Reserved</Badge>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Upcoming Reservations</h6>
        {loading ? (
          <div className="text-center py-3">
            <Spinner color="primary" />
          </div>
        ) : (
          <Table size="sm" responsive hover>
            <thead className="thead-light">
              <tr>
                <th>Table</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Party Size</th>
              </tr>
            </thead>
            <tbody>
              {upcomingReservations.length > 0 ? upcomingReservations.map(reservation => (

                
                <tr key={reservation._id || Math.random().toString(36).substr(2, 9)}>
                  <td>
                    <span className="font-weight-bold">
                      {reservation.tableName || 
                       (reservation.tableId && typeof reservation.tableId === 'object' ? 
                        reservation.tableId.name || `Table ${reservation.tableId.number}` : 
                        `Table ${reservation.tableNumber || reservation.tableId || '?'}`)}
                    </span>
                  </td>
                  <td>{reservation.customerName || 'Guest'}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <FaCalendarAlt className="text-primary mr-2" size={12} />
                      {formatReservationTime(reservation.startTime || 
                                            reservation.date || 
                                            reservation.reservationDate || 
                                            reservation.reservationTime)}
                    </div>
                  </td>
                  <td>
                    <Badge color={getStatusColor(reservation.status)} pill>
                      {reservation.status || 'pending'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <FaUsers className="text-info mr-2" size={12} />
                      {reservation.partySize || '?'}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center py-3">
                    <div className="d-flex flex-column align-items-center">
                      <FaCalendarAlt size={24} className="text-muted mb-3" />
                      <p className="text-muted mb-0">No upcoming reservations</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
});

export default TableManagementWidget;