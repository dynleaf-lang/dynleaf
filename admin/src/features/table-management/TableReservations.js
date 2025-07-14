import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  Badge,
  Input,
  FormGroup,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  UncontrolledTooltip,
  Collapse,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  ListGroup,
  ListGroupItem
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';
import { CustomerContext } from '../../context/CustomerContext';
import { format, parseISO, isAfter, addMinutes, isBefore, isValid, formatDistance, isToday } from 'date-fns';
import { Calendar, Clock, Search, User, Phone, Mail, Clock as ClockIcon, Users, RefreshCw, ThumbsUp, Filter, ChevronDown } from 'react-feather';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './TableReservations.css';

const statusColors = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'danger',
  completed: 'info',
  noShow: 'dark'
};

const TableReservations = ({ tableId, tableName }) => {
  // Context
  const { 
    loading, 
    error, 
    getTableReservations, 
    createReservation, 
    updateReservation, 
    cancelReservation,
    findCustomerByPhone,
    findCustomerByEmail,
    getCustomers,
    getTable,
    updateTable
  } = useContext(TableContext);
  const { customers, createCustomer } = useContext(CustomerContext);
  
  // State for reservations data
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentReservation, setCurrentReservation] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);
  const [tableCapacity, setTableCapacity] = useState(null); // Added for table capacity
  const [tableData, setTableData] = useState(null); // Added for full table data including status
 
 
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: '',
    date: new Date(),
    time: '18:00',
    duration: 90,
    specialRequests: '',
    status: 'confirmed'
  });

  // Validation state
  const [formErrors, setFormErrors] = useState({});
  
  // Load reservations when component mounts or date/table changes
  useEffect(() => {
    fetchReservations();
  }, [tableId, selectedDate]);
  
  // Fetch table details to get capacity
  useEffect(() => {
    const fetchTableDetails = async () => {
      if (!tableId) return;
      
      try {
        const result = await getTable(tableId);
        if (result.success && result.table) {  
          setTableCapacity(result.table?.data?.capacity);
          setTableData(result.table?.data); // Store full table data
        } else {
          console.log('Could not fetch table capacity:', result.message);
          // Don't show error to user, just continue without capacity validation
        }
      } catch (err) {
        console.error('Error fetching table details:', err);
        // Don't show error to user, just continue without capacity validation
      }
    };
    
    fetchTableDetails();
    // Only depend on tableId, not on the getTable function
  }, [tableId]);

  // Generate time slots
  useEffect(() => {
    const slots = [];
    const startHour = 10; // 10 AM
    const endHour = 23; // 11 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    setTimeSlots(slots);
  }, []);

  // Fetch reservations for the table
  const fetchReservations = async () => {
    if (!tableId) return;
    
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const result = await getTableReservations(tableId, { date: formattedDate });
      
      if (result.success) {
        setReservations(result.reservations);
      } else {
        setLocalError(result.message || 'Failed to fetch reservations');
      }
    } catch (err) {
      setLocalError('Error fetching reservations');
      console.error('Error fetching reservations:', err);
    }
  };
  
  // Update table status
  const handleUpdateTableStatus = async (newStatus) => {
    try {
      const result = await updateTable(tableId, { status: newStatus });
      if (result.success) {
        setTableData(prev => prev ? {...prev, status: newStatus} : null);
        setLocalSuccess(`Table status updated to ${newStatus}`);
        setTimeout(() => setLocalSuccess(null), 3000);
      } else {
        setLocalError(result.message || 'Failed to update table status');
      }
    } catch (err) {
      console.error('Error updating table status:', err);
      setLocalError('Failed to update table status');
    }
  };

  // Filter reservations based on status
  const filteredReservations = useMemo(() => {
    // Start with filtering out cancelled reservations unless specifically viewing cancelled ones
    let filtered = statusFilter === 'cancelled' 
      ? reservations.filter(res => res.status === 'cancelled')
      : reservations.filter(res => res.status !== 'cancelled');
    
    // Then apply additional status filter if needed
    if (statusFilter !== 'all' && statusFilter !== 'cancelled') {
      filtered = filtered.filter(res => res.status === statusFilter);
    }
    
    return filtered;
  }, [reservations, statusFilter]);

  // Open the reservation form modal
  const openReservationModal = (reservation = null) => {
    setLocalError(null);
    setFormErrors({
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      partySize: null,
      date: null,
      time: null,
      duration: null,
      specialRequests: null,
      status: null
    });
    
    if (reservation) {
      // Edit mode - pre-fill form with existing reservation data
      const reservationTime = parseISO(reservation.startTime).toTimeString().substring(0, 5);
      const endTime = parseISO(reservation.endTime);
      const startTime = parseISO(reservation.startTime);
      const durationInMinutes = Math.round((endTime - startTime) / (1000 * 60));

      setFormData({
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone || '',
        customerEmail: reservation.customerEmail || '',
        partySize: reservation.partySize.toString(),
        date: parseISO(reservation.startTime),
        time: reservationTime,
        duration: durationInMinutes,
        specialRequests: reservation.specialRequests || '',
        status: reservation.status
      });
      setIsEditMode(true);
      setCurrentReservation(reservation);
    } else {
      // New reservation - use default values
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        partySize: '',
        date: selectedDate,
        time: '18:00',
        duration: 90,
        specialRequests: '',
        status: 'confirmed'
      });
      setIsEditMode(false);
      setCurrentReservation(null);
    }
    
    setIsModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user changes it
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  // Special handler for phone input to enforce formatting
  const handlePhoneChange = (e) => {
    const { value } = e.target;
    // Only allow digits, hyphens, parentheses, and spaces
    const filteredValue = value.replace(/[^\d\s()-]/g, '');
    setFormData(prev => ({ ...prev, customerPhone: filteredValue }));
    
    if (formErrors.customerPhone) {
      setFormErrors(prev => ({ ...prev, customerPhone: null }));
    }
    
    // Search for customer by phone if enough digits
    if (filteredValue.replace(/[^\d]/g, '').length >= 7) {
      searchCustomerByPhone(filteredValue);
    }
  };
  
  // Special handler for email input with validation
  const handleEmailChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, customerEmail: value }));
    
    if (formErrors.customerEmail) {
      setFormErrors(prev => ({ ...prev, customerEmail: null }));
    }
    
    // Search for customer by email if it looks like a valid email
    if (value.includes('@') && value.includes('.')) {
      searchCustomerByEmail(value);
    }
  };
  
  // Search for customers
  const searchCustomers = async (query) => {
    if (query.trim().length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
      return;
    }
    
    try {
      const result = await getCustomers({ search: query });
      if (result.success && result.customers) {
        setCustomerSearchResults(result.customers);
        setShowCustomerSearch(result.customers.length > 0);
      } else {
        setCustomerSearchResults([]);
        setShowCustomerSearch(false);
      }
    } catch (err) {
      console.error('Error searching customers:', err);
      setCustomerSearchResults([]);
      setShowCustomerSearch(false);
    }
  };
  
  // Search customer by phone
  const searchCustomerByPhone = async (phone) => {
    try {
      // Clean the phone number to compare just the digits
      const cleanPhone = phone.replace(/[^\d]/g, '');
      if (cleanPhone.length < 7) return; // Only search if we have enough digits
      
      const result = await findCustomerByPhone(phone);
      if (result.success && result.customers && result.customers.length > 0) {
        // Instead of trying to find an exact match, show all returned customers
        setCustomerSearchResults(result.customers);
        setShowCustomerSearch(true);
      } else if (result.success) {
        // No customer found with this phone number but API call was successful
        setCustomerSearchResults([]);
        setShowCustomerSearch(false);
      } else {
        // Show specific error message based on response
        console.error('Error searching customer by phone:', result.message);
        if (result.message.includes('permission')) {
          // Don't show permission errors to users - just show no results instead
          setCustomerSearchResults([]);
          setShowCustomerSearch(false);
        } else {
          setLocalError(result.message || 'Failed to search for customer. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error searching customer by phone:', err);
      setLocalError('Failed to search for customer. Please try again.');
    }
  };
  
  // Search customer by email
  const searchCustomerByEmail = async (email) => {
    try {
      const result = await findCustomerByEmail(email);
      if (result.success && result.customers && result.customers.length > 0) {
        // Show all matching customers in search results
        setCustomerSearchResults(result.customers);
        setShowCustomerSearch(true);
      } else if (result.success) {
        // No customer found with this email but API call was successful
        setCustomerSearchResults([]);
        setShowCustomerSearch(false);
      } else {
        // Show specific error message based on response
        console.error('Error searching customer by email:', result.message);
        if (result.message.includes('permission')) {
          // Don't show permission errors to users - just show no results instead
          setCustomerSearchResults([]);
          setShowCustomerSearch(false);
        } else {
          setLocalError(result.message || 'Failed to search for customer. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error searching customer by email:', err);
      setLocalError('Failed to search for customer. Please try again.');
    }
  };
  
  // Select a customer from search results
  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone || prev.customerPhone,
      customerEmail: customer.email || prev.customerEmail
    }));
    
    // Clear any related form errors
    const updatedErrors = { ...formErrors };
    delete updatedErrors.customerName;
    delete updatedErrors.customerPhone;
    delete updatedErrors.customerEmail;
    setFormErrors(updatedErrors);
    
    // Hide search results
    setShowCustomerSearch(false);
  };

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    if (!formData.customerName.trim()) {
      errors.customerName = 'Customer name is required';
    }
    
    if (!formData.partySize || Number(formData.partySize) <= 0) {
      errors.partySize = 'Valid party size is required';
    } else if (tableCapacity && Number(formData.partySize) > tableCapacity) {
      errors.partySize = `Party size exceeds table capacity (max: ${tableCapacity})`;
    }
    
    if (formData.customerEmail && !/^\S+@\S+\.\S+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Invalid email format';
    }
    
    // Check for time conflicts with other reservations
    const reservationDate = formData.date;
    const [hours, minutes] = formData.time.split(':').map(Number);
    
    // Create start and end times
    const startTime = new Date(reservationDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime.getTime() + formData.duration * 60 * 1000);
    
    // Check for conflicts with existing reservations, excluding the current reservation being edited
    const conflicts = reservations.filter(res => {
      // Skip the current reservation in edit mode
      if (isEditMode && currentReservation && res._id === currentReservation._id) {
        return false;
      }
      
      // Skip cancelled reservations
      if (res.status === 'cancelled' || res.status === 'noShow') {
        return false;
      }
      
      const resStart = parseISO(res.startTime);
      const resEnd = parseISO(res.endTime);
      
      // Check if there's an overlap
      return (
        (isAfter(startTime, resStart) && isBefore(startTime, resEnd)) || 
        (isAfter(endTime, resStart) && isBefore(endTime, resEnd)) ||
        (isBefore(startTime, resStart) && isAfter(endTime, resEnd)) ||
        startTime.getTime() === resStart.getTime()
      );
    });
    
    if (conflicts.length > 0) {
      errors.time = `Time conflict with existing reservation at ${format(parseISO(conflicts[0].startTime), 'h:mm a')}`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    
    if (!validateForm()) {
      return;
    }
    
    // Convert form data to reservation object
    const reservationData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      partySize: Number(formData.partySize),
      specialRequests: formData.specialRequests,
      status: formData.status
    };
    
    // Set the start time (combination of date and time)
    const reservationDate = formData.date;
    const [hours, minutes] = formData.time.split(':').map(Number);
    
    const startTime = new Date(reservationDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    // Calculate end time based on duration
    const endTime = new Date(startTime.getTime() + formData.duration * 60 * 1000);
    
    // Add all required date fields
    reservationData.reservationDate = reservationDate.toISOString().split('T')[0];
    reservationData.startTime = startTime.toISOString();
    reservationData.endTime = endTime.toISOString();
    
    try {
      // First check if this is a new customer and save them to the customer database
      if (!isEditMode && formData.customerName && (formData.customerPhone || formData.customerEmail)) {
        // Check if customer already exists with this phone or email
        let customerExists = false;
        
        if (formData.customerPhone) {
          const result = await findCustomerByPhone(formData.customerPhone);
          if (result.success && result.customers && result.customers.length > 0) {
            customerExists = true;
          }
        }
        
        if (!customerExists && formData.customerEmail) {
          const result = await findCustomerByEmail(formData.customerEmail);
          if (result.success && result.customers && result.customers.length > 0) {
            customerExists = true;
          }
        }
        
        // If customer does not exist, create a new customer record
        if (!customerExists) {
          try {
            const customerData = {
              name: formData.customerName,
              phone: formData.customerPhone,
              email: formData.customerEmail
            };
            
            // Create new customer in the database
            await createCustomer(customerData);
            console.log("New customer created:", formData.customerName);
            // No need to show a message to the user as they're just trying to make a reservation
          } catch (err) {
            console.error("Failed to create customer:", err);
            // Continue with reservation even if customer creation fails
          }
        }
      }
      
      // Now create or update the reservation
      let result;
      
      if (isEditMode && currentReservation) {
        result = await updateReservation(tableId, currentReservation._id, reservationData);
      } else {
        result = await createReservation(tableId, reservationData);
      }
      
      if (result.success) {
        setLocalSuccess(isEditMode ? 'Reservation updated successfully' : 'Reservation created successfully');
        setIsModalOpen(false);
        fetchReservations(); // Refresh the reservations list
        
        // If creating a new reservation for current time, consider updating table status to reserved
        if (!isEditMode && reservationData.status === 'confirmed') {
          const now = new Date();
          const reservationStart = new Date(reservationData.startTime);
          const reservationEnd = new Date(reservationData.endTime);
          
          // If the reservation time overlaps with current time and table is available
          if (reservationStart <= now && reservationEnd >= now && 
              tableData && tableData.status === 'available') {
            try {
              await handleUpdateTableStatus('reserved');
            } catch (err) {
              console.log('Could not auto-update table status:', err);
            }
          }
        }
      } else {
        setLocalError(result.message || 'Failed to save reservation');
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      setLocalError('An error occurred while saving the reservation');
    }
  };

  // Handle reservation cancellation
  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }
    
    try {
      const result = await cancelReservation(tableId, reservationId);
      
      if (result.success) {
        setLocalSuccess('Reservation cancelled successfully');
        fetchReservations(); // Refresh the reservations list
      } else {
        setLocalError(result.message || 'Failed to cancel reservation');
      }
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      setLocalError('An error occurred while cancelling the reservation');
    }
  };
  
  // Handle reservation deletion (completely removes the reservation)
  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to permanently delete this reservation? This action cannot be undone.')) {
      return;
    }
    
    try {
      // First cancel the reservation 
      const result = await cancelReservation(tableId, reservationId);
      
      if (result.success) {
        // Immediately remove from local state to update UI
        setReservations(currentReservations => 
          currentReservations.filter(r => r._id !== reservationId)
        );
        setLocalSuccess('Reservation deleted successfully');
        
        // Cancel the API refresh to avoid the deleted reservation from reappearing
        // if the backend hasn't fully processed the deletion yet
        setTimeout(() => {
          fetchReservations();
        }, 1000); // Increase timeout to give backend time to process
      } else {
        setLocalError(result.message || 'Failed to delete reservation');
      }
    } catch (err) {
      console.error('Error deleting reservation:', err);
      setLocalError('An error occurred while deleting the reservation');
    }
  };
  
  // Handle marking reservation as no-show
  const handleMarkNoShow = async (reservationId) => {
    if (!window.confirm('Are you sure you want to mark this reservation as no-show?')) {
      return;
    }
    
    try {
      const reservation = reservations.find(r => r._id === reservationId);
      if (!reservation) {
        setLocalError('Reservation not found');
        return;
      }
      
      // Update the reservation status to no-show
      const updatedData = {
        ...reservation,
        status: 'noShow'
      };
      
      const result = await updateReservation(tableId, reservationId, updatedData);
      
      if (result.success) {
        setLocalSuccess('Reservation marked as no-show');
        fetchReservations(); // Refresh the reservations list
      } else {
        setLocalError(result.message || 'Failed to update reservation');
      }
    } catch (err) {
      console.error('Error updating reservation:', err);
      setLocalError('An error occurred while updating the reservation');
    }
  };
  
  // Helper functions for date/time display
  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  };
  
  const getTimeRemaining = (dateString) => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    const now = new Date();
    
    if (isAfter(date, now)) {
      return `In ${formatDistance(date, now)}`;
    } else {
      return `${formatDistance(date, now)} ago`;
    }
  };

  // Document click handler to close customer search dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCustomerSearch(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div>
      <Card className="shadow mb-4">
        <CardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <span className="text-primary">{tableName}</span> Reservations
          </h5>
          <div className="d-flex align-items-center">
            <div className="date-selector mr-2">
              <ReactDatePicker
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                dateFormat="MMMM d, yyyy"
                className="form-control form-control-sm"
              />
            </div>
            <Button 
              color="primary" 
              bsSize="sm" 
              onClick={() => openReservationModal()}
              title="Add New Reservation"
            >
              + Add Reservation
            </Button>
          </div>
        </CardHeader>
        
        <CardBody>
          {localError && <Alert color="danger" toggle={() => setLocalError(null)}>{localError}</Alert>}
          {localSuccess && <Alert color="success" toggle={() => setLocalSuccess(null)}>{localSuccess}</Alert>}
          {error && <Alert color="danger">{error}</Alert>}
          
          {/* Table Status Display */}
          {tableData && (
            <div className="mb-3 p-3 bg-light rounded">
              <Row className="align-items-center">
                <Col md="6">
                  <h6 className="mb-1">
                    <i className="fas fa-table mr-2"></i>Table Status
                  </h6>
                  <div className="d-flex align-items-center">
                    <Badge 
                      color={
                        tableData.status === 'available' ? 'success' :
                        tableData.status === 'occupied' ? 'danger' :
                        tableData.status === 'reserved' ? 'warning' :
                        tableData.status === 'maintenance' ? 'secondary' : 'light'
                      }
                      className="px-3 py-2 mr-3"
                    >
                      {tableData.status === 'available' ? 'Available' :
                       tableData.status === 'occupied' ? 'Occupied' :
                       tableData.status === 'reserved' ? 'Reserved' :
                       tableData.status === 'maintenance' ? 'Maintenance' : 
                       tableData.status || 'Unknown'}
                    </Badge>
                    
                    <UncontrolledDropdown>
                      <DropdownToggle caret size="sm" color="secondary">
                        Change Status
                      </DropdownToggle>
                      <DropdownMenu>
                        <DropdownItem 
                          onClick={() => handleUpdateTableStatus('available')}
                          className={tableData.status === 'available' ? 'active' : ''}
                        >
                          <Badge color="success" className="mr-2">Available</Badge>
                          Available
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => handleUpdateTableStatus('reserved')}
                          className={tableData.status === 'reserved' ? 'active' : ''}
                        >
                          <Badge color="warning" className="mr-2">Reserved</Badge>
                          Reserved
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => handleUpdateTableStatus('occupied')}
                          className={tableData.status === 'occupied' ? 'active' : ''}
                        >
                          <Badge color="danger" className="mr-2">Occupied</Badge>
                          Occupied
                        </DropdownItem>
                        <DropdownItem 
                          onClick={() => handleUpdateTableStatus('maintenance')}
                          className={tableData.status === 'maintenance' ? 'active' : ''}
                        >
                          <Badge color="secondary" className="mr-2">Maintenance</Badge>
                          Maintenance
                        </DropdownItem>
                      </DropdownMenu>
                    </UncontrolledDropdown>
                  </div>
                  {tableData.status === 'reserved' && (
                    <div className="mt-2">
                      <small className="text-muted">
                        <i className="fas fa-info-circle mr-1"></i>
                        This table is manually marked as reserved. Check reservations below for details.
                      </small>
                    </div>
                  )}
                </Col>
                <Col md="6" className="text-right">
                  <small className="text-muted">
                    Capacity: {tableCapacity} persons
                    {tableData.isVIP && (
                      <Badge color="info" pill className="ml-2">VIP</Badge>
                    )}
                  </small>
                </Col>
              </Row>
            </div>
          )}
          
          <div className="mb-3 d-flex justify-content-between">
            <Button 
              color="light" 
              bsSize="sm" 
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="d-flex align-items-center"
            >
              <Filter size={14} className="mr-1" /> Filters <ChevronDown size={14} className="ml-1" />
            </Button>
            
            <Button 
              color="light" 
              bsSize="sm" 
              onClick={fetchReservations} 
              disabled={loading}
              className="d-flex align-items-center"
            >
              <RefreshCw size={14} className={`mr-1 ${loading ? 'spin' : ''}`} /> Refresh
            </Button>
          </div>
          
          <Collapse isOpen={filtersOpen}>
            <div className="p-3 bg-light rounded mb-3">
              <Row>
                <Col md="4">
                  <FormGroup>
                    <Label for="statusFilter" bsSize="sm">Status</Label>
                    <Input 
                      type="select" 
                      id="statusFilter" 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      bsSize="sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="noShow">No Show</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
            </div>
          </Collapse>
          
          {loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="mt-2">Loading reservations...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-5 bg-light rounded">
              <Calendar size={48} className="text-muted mb-3" />
              <h4>No Reservations</h4>
              <p className="text-muted">
                No reservations found for {format(selectedDate, 'MMMM d, yyyy')}.
              </p>
              <Button color="primary" onClick={() => openReservationModal()}>
                Create Reservation
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="align-items-center">
                <thead className="thead-light">
                  <tr>
                    <th>Customer</th>
                    <th>Time</th>
                    <th>Party Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(reservation => (
                    <tr key={reservation._id} className={isToday(parseISO(reservation.startTime)) ? 'bg-light' : ''}>
                      <td>
                        <div className="d-flex flex-column">
                          <div className="font-weight-bold">{reservation.customerName}</div>
                          {reservation.customerPhone && (
                            <small className="text-muted">
                              <Phone size={12} className="mr-1" /> {reservation.customerPhone}
                            </small>
                          )}
                          {reservation.customerEmail && (
                            <small className="text-muted">
                              <Mail size={12} className="mr-1" /> {reservation.customerEmail}
                            </small>
                          )}
                          {reservation.specialRequests && (
                            <small className="text-muted d-block mt-1">
                              <i>"{reservation.specialRequests}"</i>
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <div>{formatDate(reservation.startTime)}</div>
                          <small className="text-muted">
                            <ClockIcon size={12} className="mr-1" /> 
                            {getTimeRemaining(reservation.startTime)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Badge color="info" pill className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                          <Users size={12} className="mr-1" /> {reservation.partySize}
                        </Badge>
                      </td>
                      <td>
                        <Badge color={statusColors[reservation.status] || 'secondary'} pill>
                          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex align-items-center flex-wrap">
                          {/* Edit button - always visible */}
                          <Button
                            color="primary"
                            size="sm"
                            className="mr-1 mb-1"
                            title="Edit Reservation"
                            onClick={() => openReservationModal(reservation)}
                          >
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </Button>
                          
                          {/* Cancel button - only for non-cancelled reservations */}
                          {reservation.status !== 'cancelled' && reservation.status !== 'noShow' && (
                            <Button
                              color="warning"
                              size="sm"
                              className="mr-1 mb-1"
                              title="Cancel Reservation"
                              onClick={() => handleCancelReservation(reservation._id)}
                            >
                              <i className="fas fa-ban mr-1"></i>
                              Cancel
                            </Button>
                          )}
                          
                          {/* Delete button */}
                          <Button
                            color="danger"
                            size="sm"
                            className="mb-1"
                            title="Delete Reservation"
                            onClick={() => handleDeleteReservation(reservation._id)}
                          >
                            <i className="fas fa-trash mr-1"></i>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
      
      {/* Reservation Modal */}
      <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(!isModalOpen)} size="lg">
        <ModalHeader toggle={() => setIsModalOpen(!isModalOpen)}>
          {isEditMode ? 'Edit Reservation' : 'New Reservation'}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            <Row>
              <Col md="8">
                <FormGroup>
                  <Label for="customerName">Customer Name *</Label>
                  <InputGroup>
                    <Input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={(e) => {
                        handleInputChange(e);
                        searchCustomers(e.target.value);
                      }}
                      invalid={!!formErrors.customerName}
                      placeholder="Enter customer name"
                      onClick={e => e.stopPropagation()}
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>
                        <User size={16} />
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {formErrors.customerName && (
                    <div className="text-danger small">{formErrors.customerName}</div>
                  )}
                  
                  {/* Customer search results */}
                  {showCustomerSearch && customerSearchResults.length > 0 && (
                    <ListGroup className="position-absolute customer-search-results shadow-sm" style={{ zIndex: 1000 }}>
                      {customerSearchResults.map(customer => (
                        <ListGroupItem 
                          key={customer._id} 
                          tag="button" 
                          action 
                          onClick={() => selectCustomer(customer)}
                          className="d-flex flex-column align-items-start"
                        >
                          <div className="font-weight-bold">{customer.name}</div>
                          <div className="d-flex w-100 small text-muted">
                            {customer.phone && <span className="mr-2"><Phone size={12} /> {customer.phone}</span>}
                            {customer.email && <span><Mail size={12} /> {customer.email}</span>}
                          </div>
                        </ListGroupItem>
                      ))}
                    </ListGroup>
                  )}
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup>
                  <Label for="partySize">
                    Party Size * {tableCapacity && <small className="text-muted">(Max: {tableCapacity})</small>}
                  </Label>
                  <InputGroup>
                    <Input
                      type="number"
                      id="partySize"
                      name="partySize"
                      value={formData.partySize}
                      onChange={handleInputChange}
                      invalid={!!formErrors.partySize}
                      placeholder="Number of guests"
                      min="1"
                      max={tableCapacity || undefined}
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>
                        <Users size={16} />
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {formErrors.partySize && (
                    <div className="text-danger small">{formErrors.partySize}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="customerPhone">Phone</Label>
                  <InputGroup>
                    <Input
                      type="text"
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handlePhoneChange}
                      invalid={!!formErrors.customerPhone}
                      placeholder="Phone number"
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>
                        <Phone size={16} />
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {formErrors.customerPhone && (
                    <div className="text-danger small">{formErrors.customerPhone}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label for="customerEmail">Email</Label>
                  <InputGroup>
                    <Input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleEmailChange}
                      invalid={!!formErrors.customerEmail}
                      placeholder="Email address"
                    />
                    <InputGroupAddon addonType="append">
                      <InputGroupText>
                        <Mail size={16} />
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {formErrors.customerEmail && (
                    <div className="text-danger small">{formErrors.customerEmail}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>
            
            <Row>
              <Col md="3">
                <FormGroup>
                  <Label for="date">Date *</Label>
                  <ReactDatePicker
                    selected={formData.date}
                    onChange={date => setFormData(prev => ({ ...prev, date }))
                    }
                    dateFormat="MMMM d, yyyy"
                    className="form-control"
                    minDate={new Date()}
                    id="date"
                  />
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label for="time">Time *</Label>
                  <Input
                    type="select"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    invalid={!!formErrors.time}
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Input>
                  {formErrors.time && (
                    <div className="text-danger small">{formErrors.time}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md="3">
                <FormGroup>
                  <Label for="duration">Duration (minutes) *</Label>
                  <Input
                    type="select"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
            
            <FormGroup>
              <Label for="specialRequests">Special Requests</Label>
              <Input
                type="textarea"
                id="specialRequests"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                placeholder="Any special requests or notes"
                rows="3"
              />
            </FormGroup>
            
            {isEditMode && (
              <FormGroup>
                <Label for="status">Status</Label>
                <Input
                  type="select"
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="noShow">No Show</option>
                </Input>
              </FormGroup>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner bsSize="sm" className="mr-2" /> Saving...
                </>
              ) : isEditMode ? (
                'Update Reservation'
              ) : (
                'Create Reservation'
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default TableReservations;