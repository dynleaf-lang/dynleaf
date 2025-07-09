import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Alert,
  Badge,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledTooltip,
  Collapse,
  Nav,
  NavItem,
  NavLink
} from 'reactstrap';
import { useOrder } from '../../context/OrderContext';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCurrency } from '../../context/CurrencyContext';
import { TableContext } from '../../context/TableContext';
import Header from '../../components/Headers/Header';
import { 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaEdit, 
  FaTrashAlt, 
  FaPrint, 
  FaFilePdf, 
  FaStore, 
  FaCalendarAlt, 
  FaSort, 
  FaAngleDown, 
  FaAngleUp,
  FaCheck,
  FaTimes,
  FaClock,
  FaSpinner,
  FaTruck,
  FaUtensils,
  FaShoppingBag
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';

const OrderStatus = {
  Pending: { color: 'warning', icon: FaClock, label: 'Pending' },
  Processing: { color: 'primary', icon: FaSpinner, label: 'Processing' },
  Completed: { color: 'success', icon: FaCheck, label: 'Completed' },
  Cancelled: { color: 'danger', icon: FaTimes, label: 'Cancelled' }
};

const OrderType = {
  'Dine-In': { color: 'info', icon: FaUtensils, label: 'Dine-In' },
  'Takeout': { color: 'warning', icon: FaShoppingBag, label: 'Takeout' },
  'Delivery': { color: 'primary', icon: FaTruck, label: 'Delivery' }
};

const OrderManagement = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'orderDate',
    direction: 'desc',
  });  const [activeTab, setActiveTab] = useState('all');
  const [activeOrderType, setActiveOrderType] = useState('all');
  const [generatingInvoice, setGeneratingInvoice] = useState(null); // Track which order is generating invoice
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [paginatedOrders, setPaginatedOrders] = useState([]);
  
  // Table filter state
  const [selectedTable, setSelectedTable] = useState('');
  const [availableTables, setAvailableTables] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false); // Track status update loading
  
  // Notification state for better UX
  const [notification, setNotification] = useState({
    show: false,
    type: 'success', // success, danger, warning, info
    title: '',
    message: '',
    autoClose: true
  });
  
  // Track recently updated orders for visual feedback
  const [recentlyUpdatedOrders, setRecentlyUpdatedOrders] = useState(new Set());
  
  // Add ref to track initial fetch
  const initialFetchDone = React.useRef(false);

  // Notification helper function - memoized to prevent re-renders
  const showNotification = useCallback((type, title, message, autoClose = true) => {
    setNotification({
      show: true,
      type,
      title,
      message,
      autoClose
    });

    // Auto-close notification after 4 seconds
    if (autoClose) {
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 4000);
    }
  }, []);

  // Close notification manually - memoized
  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const {
    orders: rawOrders,
    loading,
    error,
    restaurants,
    branches,
    getAllOrders,
    getRestaurants,
    getBranchesForRestaurant,
    updateOrderStatus,
    deleteOrder,
    generateInvoice,
    addNewOrder,
    updateExistingOrder,
    removeOrder,
    updateOrderStatusRealTime
  } = useOrder();

  // Ensure orders is always an array and deduplicate immediately with socket protection
  const orders = React.useMemo(() => {
    if (!Array.isArray(rawOrders)) {
      return [];
    }
    
    if (rawOrders.length === 0) {
      return [];
    }
    
    // Step 1: Remove orders without valid IDs
    const validOrders = rawOrders.filter(order => order && order._id);
    
    // Step 2: Enhanced multi-level deduplication
    const uniqueOrdersMap = new Map();
    const seenOrderIds = new Set();
    const processedIds = new Set(); // Track processed _ids
    
    validOrders.forEach(order => {
      // Skip if we've already processed this exact _id
      if (processedIds.has(order._id)) {
        console.log('[DEDUP] Skipping already processed _id:', order._id);
        return;
      }
      
      // Primary deduplication by _id
      if (!uniqueOrdersMap.has(order._id)) {
        // Secondary check: if an order with the same orderId already exists
        if (order.orderId && seenOrderIds.has(order.orderId)) {
          // Find the existing order with the same orderId
          const existingOrder = Array.from(uniqueOrdersMap.values()).find(o => o.orderId === order.orderId);
          if (existingOrder) {
            // Compare timestamps - keep the more recent one
            const existingTime = new Date(existingOrder.createdAt || existingOrder.timestamp || existingOrder.orderDate || 0);
            const currentTime = new Date(order.createdAt || order.timestamp || order.orderDate || 0);
            
            // If timestamps are equal, prefer the one with more data/fields
            if (currentTime.getTime() === existingTime.getTime()) {
              const existingFields = Object.keys(existingOrder).length;
              const currentFields = Object.keys(order).length;
              
              if (currentFields > existingFields) {
                uniqueOrdersMap.delete(existingOrder._id);
                processedIds.delete(existingOrder._id);
                uniqueOrdersMap.set(order._id, order);
                processedIds.add(order._id);
                console.log('[DEDUP] Replaced order with more complete data:', order.orderId);
              } else {
                console.log('[DEDUP] Kept existing order with same timestamp:', order.orderId);
              }
            } else if (currentTime > existingTime) {
              // Remove the old one and add the new one
              uniqueOrdersMap.delete(existingOrder._id);
              processedIds.delete(existingOrder._id);
              uniqueOrdersMap.set(order._id, order);
              processedIds.add(order._id);
              console.log('[DEDUP] Replaced older order with same orderId:', order.orderId);
            } else {
              console.log('[DEDUP] Kept existing newer order with orderId:', order.orderId);
            }
          }
        } else {
          // No duplicate orderId found, add the order
          uniqueOrdersMap.set(order._id, order);
          processedIds.add(order._id);
          if (order.orderId) {
            seenOrderIds.add(order.orderId);
          }
        }
      }
    });
    
    const uniqueOrders = Array.from(uniqueOrdersMap.values());
    
    // Log deduplication stats if significant duplicates were found
    if (validOrders.length !== uniqueOrders.length) {
      console.warn('[DEDUP] Removed duplicates:', {
        original: validOrders.length,
        unique: uniqueOrders.length,
        removed: validOrders.length - uniqueOrders.length
      });
    }
    
    return uniqueOrders;
  }, [rawOrders]);

  const { user } = useContext(AuthContext);
  
  // Currency context for proper currency formatting based on user's branch country
  const { formatCurrency } = useCurrency();
  
  // Table context for dining table filtering
  const { tables, getTables } = useContext(TableContext);
  
  // Socket context for real-time updates
  const { 
    isConnected, 
    onOrderUpdate, 
    onStatusUpdate, 
    offOrderUpdate,
    offStatusUpdate
  } = useSocket();

  // Helper function to safely get order type
  const getOrderType = (order) => {
    return order?.OrderType || order?.orderType || 'Dine-In';
  };

  // Helper function to safely get order status
  const getOrderStatus = (order) => {
    return order?.orderStatus || order?.status || 'Pending';
  };

  // Pagination helper functions
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  
  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const handleItemsPerPageChange = useCallback((items) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  const getPaginationInfo = useCallback(() => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredOrders.length);
    return { startItem, endItem, totalItems: filteredOrders.length };
  }, [currentPage, itemsPerPage, filteredOrders.length]);

  // Client-side filtering and sorting
  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    
    // Filter by active status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => {
        const status = order.orderStatus || order.status || '';
        const normalizedStatus = status.toLowerCase();
        const targetStatus = activeTab.toLowerCase();
        
        if (targetStatus === 'pending') {
          return normalizedStatus === 'pending' || normalizedStatus === 'new' || normalizedStatus === 'placed';
        } else if (targetStatus === 'processing') {
          return normalizedStatus === 'processing' || normalizedStatus === 'in_progress' || normalizedStatus === 'preparing';
        } else if (targetStatus === 'completed') {
          return normalizedStatus === 'completed' || normalizedStatus === 'complete' || normalizedStatus === 'delivered' || normalizedStatus === 'finished';
        } else if (targetStatus === 'cancelled') {
          return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled' || normalizedStatus === 'rejected';
        }
        
        return normalizedStatus === targetStatus;
      });
    }
    
    // Filter by active order type tab
    if (activeOrderType !== 'all') {
      filtered = filtered.filter(order => {
        // Handle different case formats (OrderType vs orderType)
        const orderType = order.OrderType || order.orderType || '';
        return orderType.toLowerCase() === activeOrderType.toLowerCase();
      });
    }

    // Filter by selected table (only for Dine-In orders)
    if (selectedTable && selectedTable !== '') {
      filtered = filtered.filter(order => {
        const orderType = order.OrderType || order.orderType || '';
        if (orderType.toLowerCase() !== 'dine-in') return false;
        
        // Check different table ID formats
        if (order.tableId && typeof order.tableId === 'object' && order.tableId._id) {
          return order.tableId._id === selectedTable;
        } else if (order.tableId && typeof order.tableId === 'string') {
          return order.tableId === selectedTable;
        }
        return false;
      });
    }

    // Apply search term filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        // Search in order ID
        if (order.orderId && order.orderId.toLowerCase().includes(lowercasedTerm)) {
          return true;
        }
        
        // Search in customer data (object format)
        if (order.customerId && typeof order.customerId === 'object' && order.customerId !== null) {
          const customerName = order.customerId.name || order.customerId.firstName || '';
          const customerPhone = order.customerId.phone || order.customerId.contactNumber || '';
          const customerEmail = order.customerId.email || '';
          
          if (customerName.toLowerCase().includes(lowercasedTerm) ||
              customerPhone.toLowerCase().includes(lowercasedTerm) ||
              customerEmail.toLowerCase().includes(lowercasedTerm)) {
            return true;
          }
        }
        
        // Search in customer data (string format)
        if (order.customerId && typeof order.customerId === 'string' && 
            order.customerId.toLowerCase().includes(lowercasedTerm)) {
          return true;
        }
        
        // Search in direct customer fields
        if (order.customerName && order.customerName.toLowerCase().includes(lowercasedTerm)) {
          return true;
        }
        
        if (order.customerPhone && order.customerPhone.toLowerCase().includes(lowercasedTerm)) {
          return true;
        }
        
        if (order.customerEmail && order.customerEmail.toLowerCase().includes(lowercasedTerm)) {
          return true;
        }
        
        return false;
      });
    }
    
    // Sort the filtered orders
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Handle nested fields
        const keyParts = sortConfig.key.split('.');
        
        let aValue, bValue;
        
        if (keyParts.length > 1) {
          aValue = keyParts.reduce((obj, key) => obj && obj[key], a);
          bValue = keyParts.reduce((obj, key) => obj && obj[key], b);
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        if (aValue === bValue) return 0;
        
        // Handle different data types
        if (typeof aValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        } else {
          // For dates, numbers, etc.
          return sortConfig.direction === 'asc' 
            ? aValue < bValue ? -1 : 1 
            : aValue < bValue ? 1 : -1;
        }
      });
    }
    
    setFilteredOrders(filtered);
  }, [orders, activeTab, activeOrderType, selectedTable, searchTerm, sortConfig]);

  // Initialize and load data - prevent multiple calls
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      console.log('[OrderManagement] First time initialization - fetching orders');
      initialFetchDone.current = true;
      
      // Use timeout to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        getAllOrders({}, true);
        
        if (user.role === 'Super_Admin') {
          getRestaurants();
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [user]); // Removed getAllOrders and getRestaurants from dependencies to prevent loops
  // Filter orders when search term, filters, or orders list changes
  useEffect(() => {
    // Debounce filtering to avoid excessive re-renders
    const timeoutId = setTimeout(() => {
      if (orders && orders.length > 0) {
        filterOrders();
      } else {
        // If no orders, ensure filtered orders is also empty
        setFilteredOrders([]);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [orders, filterOrders]); // Only depend on orders and the memoized filterOrders function

  // Pagination logic - apply after filtering
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredOrders.slice(startIndex, endIndex);
    setPaginatedOrders(paginated);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, activeOrderType, selectedTable, searchTerm]);

  // Load tables for filtering - only once when user is available
  useEffect(() => {
    if (user && getTables && availableTables.length === 0) {
      getTables().then(() => {
        // Tables will be available from context
      }).catch(err => {
        console.error('Error loading tables:', err);
      });
    }
  }, [user, getTables]); // Removed tables and availableTables from dependency array

  // Update available tables when tables from context change
  useEffect(() => {
    if (tables && tables.length > 0) {
      setAvailableTables(tables);
    }
  }, [tables]);

  // Track processed event IDs to prevent duplicate processing
  const processedEventIds = useRef(new Set());

  // Clear old event IDs periodically to prevent memory leaks
  useEffect(() => {
    const cleanup = setInterval(() => {
      // Keep only the last 1000 event IDs
      if (processedEventIds.current.size > 1000) {
        const eventArray = Array.from(processedEventIds.current);
        processedEventIds.current = new Set(eventArray.slice(-500)); // Keep last 500
      }
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  // Memoized socket event handlers to prevent re-registration
  const handleOrderUpdate = useCallback((data) => {
    const { order, eventType, eventId, timestamp } = data;
    
    // Comprehensive logging for debugging
    console.log('[Socket-DEBUG] Received order update:', {
      eventType,
      eventId,
      orderId: order?._id,
      orderNumber: order?.orderId,
      timestamp,
      currentOrdersCount: orders.length,
      rawData: data
    });
    
    // Add duplicate prevention for real-time events
    if (!order || !order._id) {
      console.warn('[Socket] Received invalid order data:', data);
      return;
    }

    // Enhanced event ID generation for better duplicate detection
    const fallbackEventId = `${eventType}_${order._id}_${order.orderId || 'no-orderId'}_${timestamp}`;
    const finalEventId = eventId || fallbackEventId;

    // Check if this event has already been processed
    if (processedEventIds.current.has(finalEventId)) {
      console.log('[Socket] Ignoring duplicate event:', finalEventId);
      return;
    }

    // Mark this event as processed immediately
    processedEventIds.current.add(finalEventId);
    console.log('[Socket-DEBUG] Event marked as processed:', finalEventId);

    // Enhanced duplicate check with more thorough validation
    const existingOrderById = orders.find(o => o._id === order._id);
    const existingOrderByOrderId = order.orderId ? orders.find(o => o.orderId === order.orderId) : null;
    
    console.log('[Socket-DEBUG] Duplicate check results:', {
      hasExistingById: !!existingOrderById,
      hasExistingByOrderId: !!existingOrderByOrderId,
      existingByIdOrderNumber: existingOrderById?.orderId,
      existingByOrderIdOrderNumber: existingOrderByOrderId?.orderId
    });
    
    // Check if we have any existing order (by _id or orderId)
    const hasExistingOrder = existingOrderById || existingOrderByOrderId;
    
    // Update the orders list in real-time based on event type
    if (eventType === 'created') {
      // Only add if no duplicate exists by either _id or orderId
      if (!hasExistingOrder) {
        console.log('[Socket] Adding new order:', order._id, order.orderId);
        addNewOrder(order);
        showNotification(
          'success',
          '🔔 New Order Alert!',
          `Order #${order.orderId} has been placed. Total: ${formatCurrency(order.totalAmount)}.`,
          true
        );
      } else {
        console.warn('[Socket] Prevented duplicate order addition:', {
          orderId: order._id,
          orderNumber: order.orderId,
          existingById: !!existingOrderById,
          existingByOrderId: !!existingOrderByOrderId
        });
      }
    } else if (eventType === 'updated') {
      // Update existing order or add if missing (but check for duplicates first)
      if (existingOrderById) {
        console.log('[Socket] Updating existing order by _id:', order._id, order.orderId);
        updateExistingOrder(order);
        showNotification(
          'info',
          'Order Updated!',
          `Order #${order.orderId} has been updated.`,
          true
        );
      } else if (existingOrderByOrderId) {
        console.log('[Socket] Updating existing order by orderId:', order._id, order.orderId);
        updateExistingOrder(order);
        showNotification(
          'info',
          'Order Updated!',
          `Order #${order.orderId} has been updated.`,
          true
        );
      } else {
        // Order doesn't exist, add it but only if we haven't processed a create event for it
        const createEventId = `created_${order._id}_${order.orderId || 'no-orderId'}`;
        const hasProcessedCreate = Array.from(processedEventIds.current).some(id => id.includes(createEventId));
        if (!hasProcessedCreate) {
          console.log('[Socket] Adding missing order during update:', order._id, order.orderId);
          addNewOrder(order);
        }
      }
    } else if (eventType === 'deleted') {
      // Remove by _id or orderId
      const orderToRemove = existingOrderById || existingOrderByOrderId;
      if (orderToRemove) {
        console.log('[Socket] Removing deleted order:', orderToRemove._id, orderToRemove.orderId);
        removeOrder(orderToRemove._id);
        showNotification(
          'warning',
          'Order Removed!',
          `Order #${orderToRemove.orderId} has been deleted.`,
          true
        );
      } else {
        console.warn('[Socket] Attempted to remove non-existent order:', order._id, order.orderId);
      }
    }
    
    console.log('[Socket-DEBUG] After processing - orders count:', orders.length);
  }, [orders, addNewOrder, updateExistingOrder, removeOrder, formatCurrency, showNotification]);

  // Memoized status update handler
  const handleStatusUpdate = useCallback((data) => {
    const { orderId, orderNumber, oldStatus, newStatus, eventId, timestamp } = data;
    
    // Validate the status update data
    if (!orderId || !newStatus) {
      console.warn('[Socket] Received invalid status update data:', data);
      return;
    }

    // Enhanced event ID generation for better duplicate detection
    const fallbackEventId = `status_${orderId}_${newStatus}_${timestamp}`;
    const finalEventId = eventId || fallbackEventId;

    // Check if this event has already been processed
    if (processedEventIds.current.has(finalEventId)) {
      console.log('[Socket] Ignoring duplicate status update event:', finalEventId);
      return;
    }

    // Mark this event as processed immediately
    processedEventIds.current.add(finalEventId);

    // Check if order exists before updating status
    const existingOrder = orders.find(o => o._id === orderId);
    if (!existingOrder) {
      console.warn('[Socket] Attempted to update status for non-existent order:', orderId);
      return;
    }

    // Prevent redundant status updates
    const currentStatus = existingOrder.orderStatus || existingOrder.status;
    if (currentStatus === newStatus) {
      console.log('[Socket] Status already up to date for order:', orderId, newStatus);
      return;
    }
    
    console.log('[Socket] Updating order status:', orderId, `${currentStatus} → ${newStatus}`);
    
    // Update the order status in real-time
    updateOrderStatusRealTime(orderId, newStatus);
    
    showNotification(
      'info',
      'Order Status Changed!',
      `Order #${orderNumber || existingOrder.orderId} status changed from ${oldStatus || currentStatus} to ${newStatus}.`,
      true
    );
  }, [orders, updateOrderStatusRealTime, showNotification]);

  // Setup real-time socket listeners
  useEffect(() => {
    if (!isConnected) return;

    // Register event listeners
    onOrderUpdate(handleOrderUpdate);
    onStatusUpdate(handleStatusUpdate);

    // Cleanup listeners when component unmounts or connection changes
    return () => {
      offOrderUpdate();
      offStatusUpdate();
    };
  }, [isConnected, handleOrderUpdate, handleStatusUpdate, onOrderUpdate, onStatusUpdate, offOrderUpdate, offStatusUpdate]);

  // Monitor order updates and detect duplicates with reduced logging
  useEffect(() => {
    // Check for duplicates in the orders array only if there are many orders
    if (orders.length > 50) {
      const orderIds = orders.map(o => o._id).filter(Boolean);
      const uniqueOrderIds = [...new Set(orderIds)];
      
      // Only log if duplicates are detected
      if (orderIds.length !== uniqueOrderIds.length) {
        console.warn('[WARNING] Duplicate order _ids detected:', {
          total: orderIds.length,
          unique: uniqueOrderIds.length,
          duplicates: orderIds.length - uniqueOrderIds.length
        });
      }
    }
  }, [orders.length]); // Only depend on length, not the full orders array

  // Real-time duplicate cleanup - watches for duplicates after socket events
  useEffect(() => {
    if (orders.length < 2) return; // No need to check if less than 2 orders
    
    const timeoutId = setTimeout(() => {
      // Check for duplicates by orderId and _id
      const duplicatesMap = new Map();
      const duplicatesFound = [];
      
      orders.forEach(order => {
        if (order.orderId) {
          if (duplicatesMap.has(order.orderId)) {
            duplicatesFound.push({
              original: duplicatesMap.get(order.orderId),
              duplicate: order
            });
          } else {
            duplicatesMap.set(order.orderId, order);
          }
        }
      });
      
      // If duplicates are found, trigger a cleanup
      if (duplicatesFound.length > 0) {
        console.warn('[REALTIME-DEDUP] Found duplicates after socket update:', duplicatesFound.length);
        
        // Force a re-fetch to clean up duplicates
        setTimeout(() => {
          console.log('[REALTIME-DEDUP] Triggering automatic cleanup of duplicates');
          getAllOrders({}, true); // Force refresh to clean duplicates
        }, 500); // Small delay to avoid rapid consecutive calls
      }
    }, 200); // Debounce duplicate detection
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, getAllOrders]); // Only depend on orders length to avoid excessive checks

  // Handle restaurant selection change
  const handleRestaurantChange = async (e) => {
    const restaurantId = e.target.value;
    setSelectedRestaurant(restaurantId);
    setSelectedBranch(''); // Reset branch selection
    
    if (restaurantId) {
      await getBranchesForRestaurant(restaurantId);
    }
    applyFilters(restaurantId, '');
  };

  // Handle branch selection change
  const handleBranchChange = async (e) => {
    const branchId = e.target.value;
    setSelectedBranch(branchId);
    applyFilters(selectedRestaurant, branchId);
  };

  // Apply filters when querying for orders
  const applyFilters = async (restaurantId = selectedRestaurant, branchId = selectedBranch) => {
    const filters = {};
    
    // Location filters
    if (restaurantId) filters.restaurantId = restaurantId;
    if (branchId) filters.branchId = branchId;
    
    // Status and type filters
    if (statusFilter) filters.orderStatus = statusFilter;
    if (orderTypeFilter) filters.orderType = orderTypeFilter; // Fixed: use orderType not OrderType
    
    // Date range filters
    if (dateRange.startDate) filters.startDate = dateRange.startDate;
    if (dateRange.endDate) filters.endDate = dateRange.endDate;
    
    await getAllOrders(filters, true); // Force refresh when applying filters
  };
  
  // Reset all filters
  const resetFilters = async () => {
    setSelectedRestaurant('');
    setSelectedBranch('');
    setStatusFilter('');
    setOrderTypeFilter('');
    setSelectedTable(''); // Reset table filter
    setDateRange({
      startDate: '',
      endDate: '',
    });
    setSearchTerm('');
    setActiveTab('all');
    setActiveOrderType('all');
    setCurrentPage(1); // Reset pagination
    
    // Force refresh to get all orders without filters
    await getAllOrders({}, true);
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  // View order details
  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Open status update modal
  const handleOpenStatusModal = (order) => {
    setSelectedOrder(order);
    setNewStatus(getOrderStatus(order));
    setShowStatusModal(true);
  };

  // Update order status
  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    
    try {
      const result = await updateOrderStatus(selectedOrder._id, newStatus);
      
      if (result.success) {
        setShowStatusModal(false);
        
        // Mark order as recently updated for visual feedback
        setRecentlyUpdatedOrders(prev => new Set([...prev, selectedOrder._id]));
        setTimeout(() => {
          setRecentlyUpdatedOrders(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedOrder._id);
            return newSet;
          });
        }, 3000); // Remove highlight after 3 seconds
        
        setSelectedOrder(null);
        // Show success notification
        showNotification(
          'success',
          'Status Updated Successfully!',
          `Order #${selectedOrder.orderId} status has been updated to "${newStatus}".`
        );
      } else {
        // Show specific error notification
        showNotification(
          'danger',
          'Failed to Update Status',
          result.message || 'An unknown error occurred while updating the order status.'
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification(
        'danger',
        'Network Error',
        error.message || 'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Open delete confirmation modal
  const handleOpenDeleteModal = (order) => {
    setSelectedOrder(order);
    setShowDeleteConfirm(true);
  };

  // Delete order
  const handleDeleteOrder = async () => {
    try {
      const result = await deleteOrder(selectedOrder._id);
      
      if (result.success) {
        setShowDeleteConfirm(false);
        setSelectedOrder(null);
        showNotification(
          'success',
          'Order Deleted Successfully!',
          `Order #${selectedOrder.orderId} has been permanently removed from your records.`
        );
      } else {
        showNotification(
          'danger',
          'Failed to Delete Order',
          result.message || 'An unknown error occurred while deleting the order.'
        );
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      showNotification(
        'danger',
        'Network Error',
        error.message || 'Unable to connect to the server. Please check your connection and try again.'
      );
    }
  };

  // Handle invoice generation
  const handleGenerateInvoice = async (order) => {
    setGeneratingInvoice(order._id);
    
    try {
      const result = await generateInvoice(order._id);
      if (result.success) {
        showNotification(
          'success',
          'Invoice Generated Successfully!',
          `Invoice for Order #${order.orderId} has been generated and downloaded.`
        );
      } else {
        showNotification(
          'warning',
          'Invoice Generation Failed',
          result.message || 'Unable to generate invoice. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      showNotification(
        'danger',
        'Network Error',
        error.message || 'Unable to connect to the server. Please check your connection and try again.'
      );
    } finally {
      setGeneratingInvoice(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      return dateString || 'N/A';
    }
  };


    // Count orders by type
  const countOrdersByType = (type) => {
    if (!Array.isArray(orders)) return 0;
    
    return orders.filter(order => {
      const orderType = order.OrderType || order.orderType || '';
      return orderType.toLowerCase() === type.toLowerCase();
    }).length;
  };
  
  // Get total orders count
  const getTotalOrdersCount = () => {
    return Array.isArray(orders) ? orders.length : 0;
  };

  // Safe status filtering for tabs
  const getOrdersByStatus = (status) => {
    if (!Array.isArray(orders)) return 0;
    
    return orders.filter(order => {
      const orderStatus = order.orderStatus || order.status || '';
      const normalizedStatus = orderStatus.toLowerCase();
      const targetStatus = status.toLowerCase();
      
      // Handle various status format variations
      if (targetStatus === 'pending') {
        return normalizedStatus === 'pending' || normalizedStatus === 'new' || normalizedStatus === 'placed';
      } else if (targetStatus === 'processing') {
        return normalizedStatus === 'processing' || normalizedStatus === 'in_progress' || normalizedStatus === 'preparing';
      } else if (targetStatus === 'completed') {
        return normalizedStatus === 'completed' || normalizedStatus === 'complete' || normalizedStatus === 'delivered' || normalizedStatus === 'finished';
      } else if (targetStatus === 'cancelled') {
        return normalizedStatus === 'cancelled' || normalizedStatus === 'canceled' || normalizedStatus === 'rejected';
      }
      
      return normalizedStatus === targetStatus;
    }).length;
  };
    // Get the title based on user role and branch assignment
  const getTitle = () => {
    let baseTitle = '';
    
    // Determine the base title based on user role
    if (user.role === 'Super_Admin') {
      if (selectedRestaurant && selectedBranch) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        const branchName = branches.find(b => b._id === selectedBranch)?.name || '';
        baseTitle = `${restaurantName} - ${branchName}`;
      } else if (selectedRestaurant) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        baseTitle = `${restaurantName}`;
      } else {
        baseTitle = 'All';
      }
    } else if (user.branchId) {
      baseTitle = 'Branch';
    } else {
      return 'Order Management';
    }
    
    // Add order type if it's specified
    if (activeOrderType !== 'all') {
      const orderTypeInfo = {
        'dine-in': { icon: <FaUtensils className="text-info mr-1" />, label: 'Dine-In' },
        'takeout': { icon: <FaShoppingBag className="text-warning mr-1" />, label: 'Takeout' },
        'delivery': { icon: <FaTruck className="text-primary mr-1" />, label: 'Delivery' }
      };
      
      const typeInfo = orderTypeInfo[activeOrderType];
      if (typeInfo) {
        return (
          <span className="d-flex align-items-center">
            {baseTitle} {' '}
            <span className="ml-2 mr-1">|</span>
            <span className="d-flex align-items-center ml-1">
              {typeInfo.icon}
              {typeInfo.label} Orders
            </span>
          </span>
        );
      }
    }
    
    return `${baseTitle} Orders`;
  };
    // Render order status badge
  const renderStatusBadge = (status) => {
    // Handle different possible status formats and values
    let normalizedStatus = '';
    
    if (!status) {
      normalizedStatus = 'Pending'; // Default to Pending instead of Unknown
    } else if (typeof status === 'string') {
      // Normalize the status - handle different cases and variations
      const cleanStatus = status.trim();
      
      // Map common variations to standard statuses
      const statusMap = {
        'pending': 'Pending',
        'PENDING': 'Pending',
        'processing': 'Processing', 
        'PROCESSING': 'Processing',
        'in_progress': 'Processing',
        'IN_PROGRESS': 'Processing',
        'completed': 'Completed',
        'COMPLETED': 'Completed',
        'complete': 'Completed',
        'COMPLETE': 'Completed',
        'cancelled': 'Cancelled',
        'CANCELLED': 'Cancelled',
        'canceled': 'Cancelled',
        'CANCELED': 'Cancelled',
        'rejected': 'Cancelled',
        'REJECTED': 'Cancelled'
      };
      
      normalizedStatus = statusMap[cleanStatus.toLowerCase()] || cleanStatus;
    } else {
      normalizedStatus = String(status);
    }
    
    // Get status info with fallback
    const statusInfo = OrderStatus[normalizedStatus] || { 
      color: 'secondary', 
      icon: FaClock, 
      label: normalizedStatus || 'Pending' 
    };
    
    const IconComponent = statusInfo.icon;
    
    return (
      <Badge color={statusInfo.color} className="d-flex align-items-center py-1 px-2">
        {IconComponent && <IconComponent size={12} className="mr-1" />}
        <span>{statusInfo.label}</span>
      </Badge>
    );
  };
    // Render order type badge
  const renderOrderTypeBadge = (type) => {
    // Handle different possible type formats and values
    let normalizedType = '';
    
    if (!type) {
      normalizedType = 'Dine-In'; // Default to Dine-In instead of N/A
    } else if (typeof type === 'string') {
      // Normalize the type - handle different cases and variations
      const cleanType = type.trim();
      
      // Map common variations to standard types
      const typeMap = {
        'dine-in': 'Dine-In',
        'dine_in': 'Dine-In',
        'dinein': 'Dine-In',
        'DINE-IN': 'Dine-In',
        'DINE_IN': 'Dine-In',
        'DINEIN': 'Dine-In',
        'eat-in': 'Dine-In',
        'EAT-IN': 'Dine-In',
        'takeout': 'Takeout',
        'take-out': 'Takeout',
        'take_out': 'Takeout',
        'TAKEOUT': 'Takeout',
        'TAKE-OUT': 'Takeout',
        'TAKE_OUT': 'Takeout',
        'pickup': 'Takeout',
        'PICKUP': 'Takeout',
        'delivery': 'Delivery',
        'DELIVERY': 'Delivery',
        'deliver': 'Delivery',
        'DELIVER': 'Delivery'
      };
      
      normalizedType = typeMap[cleanType.toLowerCase()] || cleanType;
    } else {
      normalizedType = String(type);
    }
    
    // Get type info with fallback
    const typeInfo = OrderType[normalizedType] || { 
      color: 'info', 
      icon: FaUtensils, 
      label: normalizedType || 'Dine-In' 
    };
    
    const IconComponent = typeInfo.icon;
    
    return (
      <Badge color={typeInfo.color} className="d-flex align-items-center py-1 px-2">
        {IconComponent && <IconComponent size={12} className="mr-1" />}
        <span>{typeInfo.label}</span>
      </Badge>
    );
  };

  // Add component mount tracking for debugging
  React.useEffect(() => {
    console.log('[OrderManagement] Component mounted at:', new Date().toISOString());
    return () => {
      console.log('[OrderManagement] Component unmounted at:', new Date().toISOString());
    };
  }, []);

  // Manual refresh function for getting latest orders
  const handleManualRefresh = async () => {
    try {
      await getAllOrders({}, true);
      showNotification(
        'success',
        'Refreshed!',
        'Order list has been updated with the latest data.',
        true
      );
    } catch (error) {
      showNotification(
        'danger',
        'Refresh Failed',
        'Unable to refresh the order list. Please try again.',
        true
      );
    }
  };

  // Debug function to detect and log duplicate orders
  const detectDuplicates = useCallback(() => {
    const duplicates = {
      byId: [],
      byOrderId: [],
      total: 0
    };

    // Check for duplicate _ids
    const idMap = new Map();
    orders.forEach(order => {
      if (idMap.has(order._id)) {
        duplicates.byId.push({
          _id: order._id,
          orderId: order.orderId,
          count: idMap.get(order._id) + 1
        });
        idMap.set(order._id, idMap.get(order._id) + 1);
      } else {
        idMap.set(order._id, 1);
      }
    });

    // Check for duplicate orderIds
    const orderIdMap = new Map();
    orders.forEach(order => {
      if (order.orderId) {
        if (orderIdMap.has(order.orderId)) {
          duplicates.byOrderId.push({
            orderId: order.orderId,
            _ids: [...orderIdMap.get(order.orderId), order._id],
            count: orderIdMap.get(order.orderId).length + 1
          });
          orderIdMap.set(order.orderId, [...orderIdMap.get(order.orderId), order._id]);
        } else {
          orderIdMap.set(order.orderId, [order._id]);
        }
      }
    });

    duplicates.total = duplicates.byId.length + duplicates.byOrderId.length;

    console.log('[DEBUG] Duplicate Detection Results:', duplicates);
    return duplicates;
  }, [orders]);

  // Force cleanup of duplicate orders
  const forceCleanupDuplicates = useCallback(async () => {
    console.log('[CLEANUP] Starting manual duplicate cleanup...');
    
    const duplicateInfo = detectDuplicates();
    
    if (duplicateInfo.total === 0) {
      showNotification(
        'info',
        'No Duplicates Found',
        'All orders are unique. No cleanup needed.',
        true
      );
      return;
    }

    // Force a fresh fetch from the server
    try {
      await getAllOrders({}, true);
      
      showNotification(
        'success',
        'Cleanup Complete',
        `Refreshed order list. Found and handled ${duplicateInfo.total} potential duplicates.`,
        true
      );
      
      // Clear processed event IDs to prevent false positives
      processedEventIds.current.clear();
      console.log('[CLEANUP] Cleared processed event IDs cache');
      
    } catch (error) {
      showNotification(
        'danger',
        'Cleanup Failed',
        'Unable to refresh and cleanup orders. Please try again.',
        true
      );
    }
  }, [detectDuplicates, getAllOrders, showNotification]);

  // Expose debug functions to window for development (remove in production)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      window.debugOrders = {
        detectDuplicates,
        forceCleanupDuplicates,
        currentOrders: orders,
        processedEventIds: processedEventIds.current
      };
    }
    
    return () => {
      if (window.debugOrders) {
        delete window.debugOrders;
      }
    };
  }, [detectDuplicates, forceCleanupDuplicates, orders]);

  return (
    <>
      <Header />
      
      {/* Real-time Connection Status */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          color: 'white',
          backgroundColor: isConnected ? '#28a745' : '#dc3545',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'white',
            animation: isConnected ? 'pulse 2s infinite' : 'none'
          }}
        />
        {isConnected ? 'Live Updates' : 'Disconnected'}
      </div>
      
      {/* CSS Animation for pulse effect */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
      
      {/* Notification Component */}
      {notification.show && (
        <div 
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 9999,
            minWidth: '380px',
            maxWidth: '480px'
          }}
        >
          <Alert 
            color={notification.type} 
            isOpen={notification.show}
            toggle={closeNotification}
            className="shadow-lg border-0 mb-0 notification-slide-in"
            style={{
              borderRadius: '12px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07)',
              border: `2px solid ${
                notification.type === 'success' ? '#2dce89' :
                notification.type === 'danger' ? '#f5365c' :
                notification.type === 'warning' ? '#fb6340' :
                '#11cdef'
              }`
            }}
          >
            <div className="d-flex align-items-start">
              <div 
                className={`mr-3 mt-1 p-2 rounded-circle bg-white`}
                style={{
                  color: notification.type === 'success' ? '#2dce89' :
                         notification.type === 'danger' ? '#f5365c' :
                         notification.type === 'warning' ? '#fb6340' :
                         '#11cdef'
                }}
              >
                {notification.type === 'success' && <FaCheck size={16} />}
                {notification.type === 'danger' && <FaTimes size={16} />}
                {notification.type === 'warning' && <FaClock size={16} />}
                {notification.type === 'info' && <FaClock size={16} />}
              </div>
              <div className="flex-1">
                <h6 className="mb-1 font-weight-bold text-white">
                  {notification.title}
                </h6>
                <p className="mb-0 text-white" style={{ opacity: 0.9, fontSize: '0.875rem' }}>
                  {notification.message}
                </p>
              </div>
              <Button 
                close 
                onClick={closeNotification}
                className="ml-2 text-white"
                style={{ 
                  fontSize: '1.2rem', 
                  opacity: 0.8,
                  background: 'none',
                  border: 'none'
                }}
              />
            </div>
            
            {/* Auto-close progress bar */}
            {notification.autoClose && (
              <div 
                className="progress mt-2"
                style={{ height: '2px', background: 'rgba(255,255,255,0.2)' }}
              >
                <div 
                  className="progress-bar bg-white"
                  style={{
                    animation: 'shrinkWidth 4s linear',
                    width: '100%'
                  }}
                ></div>
              </div>
            )}
          </Alert>
        </div>
      )}

      {/* CSS for notification animations and modal styling */}
      <style>
        {`
          @keyframes shrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
          
          .notification-slide-in {
            animation: slideInRight 0.3s ease-out;
          }
          
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .table-row-highlight {
            animation: highlightRow 3s ease-out;
          }
          
          @keyframes highlightRow {
            0% { background-color: rgba(45, 206, 137, 0.3); }
            50% { background-color: rgba(45, 206, 137, 0.15); }
            100% { background-color: transparent; }
          }
          
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          .btn:hover {
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          .badge {
            transition: all 0.2s ease;
          }
          
          .badge:hover {
            transform: scale(1.05);
          }

          /* Enhanced Modal Styling */
          .modal-xl {
            max-width: 1200px;
          }

          .modal-header.bg-gradient-primary {
            background: linear-gradient(87deg, #5e72e4 0, #825ee4 100%) !important;
          }

          .modal-header .btn-close {
            filter: brightness(0) invert(1);
          }

          .card-stats {
            transition: all 0.3s ease;
          }

          .card-stats:hover {
            transform: translateY(-2px);
            box-shadow: 0 7px 16px rgba(0, 0, 0, 0.1);
          }

          .avatar {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.875rem;
          }

          .avatar.avatar-sm {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }

          .icon-shape {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.375rem;
            font-size: 1.25rem;
          }

          .bg-gradient-info {
            background: linear-gradient(87deg, #11cdef 0, #1171ef 100%) !important;
          }

          .bg-gradient-warning {
            background: linear-gradient(87deg, #fb6340 0, #fbb140 100%) !important;
          }

          .bg-gradient-success {
            background: linear-gradient(87deg, #2dce89 0, #2dcecc 100%) !important;
          }

          .bg-gradient-secondary {
            background: linear-gradient(87deg, #6c757d 0, #8c9197 100%) !important;
          }

          .text-white-50 {
            color: rgba(255, 255, 255, 0.5) !important;
          }

          .text-white-75 {
            color: rgba(255, 255, 255, 0.75) !important;
          }

          .font-weight-600 {
            font-weight: 600 !important;
          }

          .font-size-sm {
            font-size: 0.875rem !important;
          }

          /* Table styling improvements */
          .table td, .table th {
            vertical-align: middle;
          }

          .table thead th {
            border-top: none;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
          }

          .table-responsive {
            border-radius: 0.375rem;
          }

          /* Card enhancements */
          .card {
            transition: all 0.15s ease;
          }

          .card:hover {
            box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
          }

          /* Badge improvements */
          .badge {
            font-weight: 600;
            padding: 0.375rem 0.75rem;
          }

          .badge.badge-pill {
            border-radius: 10rem;
          }

          /* Animation for modal content */
          .modal.show .modal-dialog {
            animation: modalSlideIn 0.3s ease-out;
          }

          @keyframes modalSlideIn {
            from {
              transform: translateY(-50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow">
              <CardHeader className="border-0">
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">{getTitle()}</h3>
                    {user.branchId && (
                      <p className="text-muted mb-0 small">
                        <FaStore className="mr-1" /> {user.role === 'Branch_Manager' ? 'Managing orders for your branch' : 'Viewing orders for your branch'}
                      </p>
                    )}
                  </Col>
                  <Col className="text-right" xs="4">
                    {/* Real-time Connection Status */}
                    <span className="mr-3">
                      <Badge 
                        color={isConnected ? 'success' : 'warning'} 
                        className="d-inline-flex align-items-center"
                      >
                        <span 
                          className={`mr-1 ${isConnected ? 'text-success' : 'text-warning'}`}
                          style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            backgroundColor: isConnected ? '#2dce89' : '#fb6340',
                            animation: isConnected ? 'none' : 'pulse 2s infinite'
                          }}
                        ></span>
                        {isConnected ? 'Live' : 'Offline'}
                      </Badge>
                    </span>
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="mr-2"
                    >
                      <FaFilter className="mr-1" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                    <Button
                      color="info"
                      size="sm"
                      onClick={handleManualRefresh}
                      disabled={loading}
                      title="Refresh orders to see latest updates"
                    >
                      <i className="fas fa-sync-alt mr-1"></i>
                      Refresh
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              <CardBody>                {/* Status Tab Navigation */}
                <Nav tabs className="mb-3">
                  <NavItem>
                    <NavLink
                      className={activeTab === 'all' ? 'active' : ''}
                      onClick={() => setActiveTab('all')}
                    >
                      All Orders
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'pending' ? 'active' : ''}
                      onClick={() => setActiveTab('pending')}
                    >
                      <Badge color="warning" pill className="mr-1">
                        {getOrdersByStatus('Pending')}
                      </Badge>
                      Pending
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'processing' ? 'active' : ''}
                      onClick={() => setActiveTab('processing')}
                    >
                      <Badge color="primary" pill className="mr-1">
                        {getOrdersByStatus('Processing')}
                      </Badge>
                      Processing
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'completed' ? 'active' : ''}
                      onClick={() => setActiveTab('completed')}
                    >
                      <Badge color="success" pill className="mr-1">
                        {getOrdersByStatus('Completed')}
                      </Badge>
                      Completed
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'cancelled' ? 'active' : ''}
                      onClick={() => setActiveTab('cancelled')}
                    >
                      <Badge color="danger" pill className="mr-1">
                        {getOrdersByStatus('Cancelled')}
                      </Badge>
                      Cancelled
                    </NavLink>
                  </NavItem>
                </Nav>                  {/* Order Type Tabs */}
                <div className="mb-4">
                  <h5 className="mb-3 font-weight-bold">Filter by Order Type</h5>
                  <Nav tabs className="mb-3">
                    <NavItem>
                      <NavLink
                        className={activeOrderType === 'all' ? 'active' : ''}
                        onClick={() => setActiveOrderType('all')}
                      >
                        <Badge color="secondary" pill className="mr-1">
                          {getTotalOrdersCount()}
                        </Badge>
                        All Types
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeOrderType === 'dine-in' ? 'active' : ''}
                        onClick={() => setActiveOrderType('dine-in')}
                      >
                        <FaUtensils className="mr-1 text-info" />
                        <Badge color="info" pill className="mr-1">
                          {countOrdersByType('dine-in')}
                        </Badge>
                        Dine-In
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeOrderType === 'takeout' ? 'active' : ''}
                        onClick={() => setActiveOrderType('takeout')}
                      >
                        <FaShoppingBag className="mr-1 text-warning" />
                        <Badge color="warning" pill className="mr-1">
                          {countOrdersByType('takeout')}
                        </Badge>
                        Takeout
                      </NavLink>
                    </NavItem>
                    {countOrdersByType('delivery') > 0 && (
                      <NavItem>
                        <NavLink
                          className={activeOrderType === 'delivery' ? 'active' : ''}
                          onClick={() => setActiveOrderType('delivery')}
                        >
                          <FaTruck className="mr-1 text-primary" />
                          <Badge color="primary" pill className="mr-1">
                            {countOrdersByType('delivery')}
                          </Badge>
                          Delivery
                        </NavLink>
                      </NavItem>
                    )}
                  </Nav>
                </div>

                {/* Filters Panel */}
                <Collapse isOpen={showFilters}>
                  <Card className="mb-4 bg-light">
                    <CardBody>
                      <h4 className="mb-3">Filter Orders</h4>
                      <Row>
                        {user.role === 'Super_Admin' && (
                          <>
                            <Col lg="3" md="6" className="mb-3">
                              <FormGroup>
                                <Label for="restaurant">Restaurant</Label>
                                <Input
                                  type="select"
                                  name="restaurant"
                                  id="restaurant"
                                  value={selectedRestaurant}
                                  onChange={handleRestaurantChange}
                                >
                                  <option value="">All Restaurants</option>
                                  {restaurants.map(restaurant => (
                                    <option key={restaurant._id} value={restaurant._id}>
                                      {restaurant.name}
                                    </option>
                                  ))}
                                </Input>
                              </FormGroup>
                            </Col>
                            <Col lg="3" md="6" className="mb-3">
                              <FormGroup>
                                <Label for="branch">Branch</Label>
                                <Input
                                  type="select"
                                  name="branch"
                                  id="branch"
                                  value={selectedBranch}
                                  onChange={handleBranchChange}
                                  disabled={!selectedRestaurant}
                                >
                                  <option value="">All Branches</option>
                                  {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>
                                      {branch.name}
                                    </option>
                                  ))}
                                </Input>
                              </FormGroup>
                            </Col>
                          </>
                        )}
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="statusFilter">Order Status</Label>
                            <Input
                              type="select"
                              name="statusFilter"
                              id="statusFilter"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="">All Statuses</option>
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </Input>
                          </FormGroup>
                        </Col>                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="orderTypeFilter">Order Type</Label>
                            <InputGroup>
                              <InputGroupAddon addonType="prepend">
                                <InputGroupText className="bg-white">
                                  {orderTypeFilter === 'Dine-In' && <FaUtensils className="text-info" />}
                                  {orderTypeFilter === 'Takeout' && <FaShoppingBag className="text-warning" />}
                                  {orderTypeFilter === 'Delivery' && <FaTruck className="text-primary" />}
                                  {orderTypeFilter === '' && <FaFilter className="text-muted" />}
                                </InputGroupText>
                              </InputGroupAddon>
                              <Input
                                type="select"
                                name="orderTypeFilter"
                                id="orderTypeFilter"
                                value={orderTypeFilter}
                                onChange={(e) => {
                                  setOrderTypeFilter(e.target.value);
                                  // Also update the active order type tab to match
                                  if (e.target.value) {
                                    setActiveOrderType(e.target.value.toLowerCase());
                                  } else {
                                    setActiveOrderType('all');
                                  }
                                }}
                                className={
                                  orderTypeFilter === 'Dine-In' 
                                    ? 'border-info' 
                                    : orderTypeFilter === 'Takeout'
                                      ? 'border-warning'
                                      : orderTypeFilter === 'Delivery'
                                        ? 'border-primary'
                                        : ''
                                }
                              >
                                <option value="">All Types</option>
                                <option value="Dine-In">Dine-In</option>
                                <option value="Takeout">Takeout</option>
                                <option value="Delivery">Delivery</option>
                              </Input>
                            </InputGroup>
                          </FormGroup>
                        </Col>
                        
                        {/* Dining Table Filter - only shown for Dine-In orders */}
                        {(activeOrderType === 'dine-in' || activeOrderType === 'all') && (
                          <Col lg="3" md="6" className="mb-3">
                            <FormGroup>
                              <Label for="tableFilter">
                                <FaUtensils className="text-info mr-1" />
                                Dining Table
                              </Label>
                              <Input
                                type="select"
                                name="tableFilter"
                                id="tableFilter"
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="border-info"
                              >
                                <option value="">All Tables</option>
                                {availableTables && availableTables.length > 0 ? (
                                  availableTables.map(table => (
                                    <option key={table._id} value={table._id}>
                                      {table.TableName || `Table ${table.tableId || table._id.slice(-6)}`}
                                      {table.capacity && ` (${table.capacity} seats)`}
                                    </option>
                                  ))
                                ) : (
                                  <option disabled>No tables available</option>
                                )}
                              </Input>
                              {selectedTable && (
                                <small className="text-muted mt-1 d-block">
                                  <i className="fas fa-info-circle mr-1"></i>
                                  Showing only Dine-In orders for selected table
                                </small>
                              )}
                            </FormGroup>
                          </Col>
                        )}
                        
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="startDate">Start Date</Label>
                            <Input
                              type="date"
                              name="startDate"
                              id="startDate"
                              value={dateRange.startDate}
                              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            />
                          </FormGroup>
                        </Col>
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="endDate">End Date</Label>
                            <Input
                              type="date"
                              name="endDate"
                              id="endDate"
                              value={dateRange.endDate}
                              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            />
                          </FormGroup>
                        </Col>
                        <Col lg="3" md="6" className="mb-3 d-flex align-items-end">
                          <Button
                            color="primary"
                            outline
                            onClick={() => applyFilters()}
                            className="mr-2"
                          >
                            Apply Filters
                          </Button>
                          <Button
                            color="secondary"
                            outline
                            onClick={resetFilters}
                          >
                            Reset
                          </Button>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
                </Collapse>

                {/* Debug Panel - Development Only */}
                {process.env.NODE_ENV === 'development' && (
                  <Card className="mb-4 border-warning" style={{ backgroundColor: '#fff3cd' }}>
                    <CardBody>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="mb-1 text-warning">
                            <i className="fas fa-bug mr-2"></i>
                            Debug Panel (Development Mode)
                          </h6>
                          <small className="text-muted">
                            Tools for debugging and resolving duplicate orders
                          </small>
                        </div>
                        <div>
                          <Button
                            color="info"
                            size="sm"
                            outline
                            onClick={detectDuplicates}
                            className="mr-2"
                          >
                            <i className="fas fa-search mr-1"></i>
                            Detect Duplicates
                          </Button>
                          <Button
                            color="warning"
                            size="sm"
                            outline
                            onClick={forceCleanupDuplicates}
                            className="mr-2"
                          >
                            <i className="fas fa-broom mr-1"></i>
                            Force Cleanup
                          </Button>
                          <Button
                            color="primary"
                            size="sm"
                            outline
                            onClick={handleManualRefresh}
                          >
                            <i className="fas fa-sync mr-1"></i>
                            Manual Refresh
                          </Button>
                        </div>
                      </div>
                      <small className="text-muted d-block mt-2">
                        <i className="fas fa-info-circle mr-1"></i>
                        Total Orders: {orders.length} | 
                        Processed Events: {processedEventIds.current.size} | 
                        Real-time: {isConnected ? 'Connected' : 'Disconnected'}
                      </small>
                    </CardBody>
                  </Card>
                )}

                {/* Search Bar */}
                <Row className="mb-4">
                  <Col md="4">
                    <InputGroup>
                      <InputGroupAddon addonType="prepend">
                        <InputGroupText>
                          <FaSearch />
                        </InputGroupText>
                      </InputGroupAddon>
                      <Input
                        placeholder="Search by order ID or customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Col>
                  <Col md="8" className="text-right d-flex align-items-center justify-content-end">
                    {/* Items per page selector */}
                    <div className="mr-3">
                      <small className="text-muted mr-2">Show:</small>
                      <Input
                        type="select"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                        style={{ width: 'auto', display: 'inline-block' }}
                        bsSize="sm"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </Input>
                    </div>
                    
                    {/* Pagination info */}
                    <span className="text-muted">
                      {filteredOrders.length > 0 ? (
                        <>
                          Showing {getPaginationInfo().startItem}-{getPaginationInfo().endItem} of {getPaginationInfo().totalItems} orders
                        </>
                      ) : (
                        'No orders found'
                      )}
                    </span>
                  </Col>
                </Row>

              

                {/* Loading and Error States */}
                {loading && (
                  <div className="text-center py-4">
                    <Spinner color="primary" />
                  </div>
                )}

                {error && (
                  <Alert color="danger" className="mb-4">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                  </Alert>
                )}

                {/* Orders Table */}
                {!loading && !error && filteredOrders.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted mb-0">No orders found matching your criteria.</p>
                    <p className="text-muted">Try adjusting your filters or search term.</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <Table className="align-items-center table-flush" responsive hover>
                        <thead className="thead-light">
                          <tr>
                            <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('orderId')}>
                              Order ID
                              {sortConfig.key === 'orderId' && (
                                <span className="ml-1">
                                  {sortConfig.direction === 'asc' ? <FaAngleUp /> : <FaAngleDown />}
                                </span>
                              )}
                            </th>
                            <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('customerId.name')}>
                              Customer
                              {sortConfig.key === 'customerId.name' && (
                                <span className="ml-1">
                                  {sortConfig.direction === 'asc' ? <FaAngleUp /> : <FaAngleDown />}
                                </span>
                              )}
                            </th>
                            <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('orderDate')}>
                              Date
                              {sortConfig.key === 'orderDate' && (
                                <span className="ml-1">
                                  {sortConfig.direction === 'asc' ? <FaAngleUp /> : <FaAngleDown />}
                                </span>
                              )}
                            </th>
                            <th scope="col">Items</th>
                            <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('totalAmount')}>
                              Total
                              {sortConfig.key === 'totalAmount' && (
                                <span className="ml-1">
                                  {sortConfig.direction === 'asc' ? <FaAngleUp /> : <FaAngleDown />}
                              </span>
                            )}
                          </th>
                          <th scope="col">Type</th>
                          <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('orderStatus')}>
                            Status
                            {sortConfig.key === 'orderStatus' && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? <FaAngleUp /> : <FaAngleDown />}
                              </span>
                            )}
                          </th>
                          {user.role === 'Super_Admin' && (
                            <th scope="col">Restaurant/Branch</th>
                          )}
                          <th scope="col">Actions</th>
                        </tr>                      </thead>                      <tbody>                        {paginatedOrders.map((order, index) => {
                          // Safety check: Skip orders without valid _id
                          if (!order._id) {
                            console.warn('Skipping order without _id:', order);
                            return null;
                          }
                          
                          const orderType = getOrderType(order);
                          const isRecentlyUpdated = recentlyUpdatedOrders.has(order._id);
                          
                          // Ensure unique key by combining _id with index as fallback
                          const uniqueKey = `order-${order._id}-${index}`;
                          
                          return (
                            <tr 
                              key={uniqueKey}
                              className={`
                                ${activeOrderType !== 'all' ? 'table-active' : ''}
                                ${isRecentlyUpdated ? 'table-success' : ''}
                              `.trim()}
                              style={{
                                borderLeft: orderType === 'Dine-In' ? '2px solid #5e72e4' : 
                                          orderType === 'Takeout' ? '2px solid #fb6340' : 
                                          orderType === 'Delivery' ? '2px solid #11cdef' : '',
                                transition: 'all 0.3s ease',
                                backgroundColor: isRecentlyUpdated ? 'rgba(45, 206, 137, 0.1)' : ''
                              }}
                            >
                              <td>
                                <span className="font-weight-bold">{order.orderId}</span>
                              </td>
                              <td>
                                {order.customerId ? (
                                  typeof order.customerId === 'object' && order.customerId !== null ? (
                                    <div>
                                      <div className="font-weight-bold">
                                        {order.customerId.name || order.customerId.firstName || 'Unknown Customer'}
                                      </div>
                                      <small>
                                        {order.customerId.phone || order.customerId.email || order.customerId.contactNumber || 'No contact info'}
                                      </small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">Customer ID: {order.customerId}</span>
                                  )
                                ) : order.customerName ? (
                                  <div>
                                    <div className="font-weight-bold">{order.customerName}</div>
                                    <small>{order.customerPhone || order.customerEmail || 'No contact info'}</small>
                                  </div>
                                ) : (
                                  <span className="text-muted">Walk-in Customer</span>
                                )}
                              </td>
                              <td>
                                <div>
                                  <div>{formatDate(order.orderDate)}</div>
                                </div>
                              </td>
                              <td>
                                <Badge color="info" pill>
                                  {order.items ? order.items.length : 0}
                                </Badge>
                              </td>
                              <td>
                                <span className="font-weight-bold">
                                  {formatCurrency(order.totalAmount || 0)}
                                </span>
                              </td>
                              <td>
                                {renderOrderTypeBadge(getOrderType(order))}
                              </td>
                              <td>
                                {renderStatusBadge(getOrderStatus(order))}
                              </td>
                              {user.role === 'Super_Admin' && (
                                <td>
                                  {order.restaurantId && typeof order.restaurantId === 'object' ? (
                                    <div className="d-flex flex-column">
                                      <Badge color="info" className="mb-1">
                                        {order.restaurantId.name}
                                      </Badge>
                                      {order.branchId && typeof order.branchId === 'object' && (
                                        <Badge color="secondary">
                                          {order.branchId.name}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <small className="text-muted">
                                      {order.restaurantId ? `Restaurant ID: ${order.restaurantId}` : 'N/A'}
                                      <br />
                                      {order.branchId ? `Branch ID: ${order.branchId}` : 'N/A'}
                                    </small>
                                  )}
                                </td>
                              )}
                              <td>
                                <UncontrolledDropdown>
                                  <DropdownToggle color="secondary" size="sm" className="btn-icon-only">
                                    <i className="fas fa-ellipsis-v"></i>
                                  </DropdownToggle>
                                  <DropdownMenu right>
                                    <DropdownItem onClick={() => handleViewDetails(order)}>
                                      <FaEye className="text-primary mr-2" /> View Details
                                    </DropdownItem>
                                    {getOrderStatus(order) !== 'Completed' && getOrderStatus(order) !== 'Cancelled' && (
                                      <DropdownItem onClick={() => handleOpenStatusModal(order)}>
                                        <FaEdit className="text-info mr-2" /> Update Status
                                      </DropdownItem>
                                    )}
                                    <DropdownItem 
                                      onClick={() => handleGenerateInvoice(order)}
                                      disabled={generatingInvoice === order._id}
                                    >
                                      {generatingInvoice === order._id ? (
                                        <>
                                          <Spinner size="sm" className="text-danger mr-2" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <FaFilePdf className="text-danger mr-2" /> Generate Invoice
                                        </>
                                      )}
                                    </DropdownItem>
                                    <DropdownItem onClick={() => handleOpenDeleteModal(order)}>
                                      <FaTrashAlt className="text-danger mr-2" /> Delete
                                    </DropdownItem>
                                  </DropdownMenu>
                                </UncontrolledDropdown>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {filteredOrders.length > itemsPerPage && (
                    <div className="d-flex justify-content-between align-items-center mt-4 px-3">
                      <div>
                        <small className="text-muted">
                          Page {currentPage} of {totalPages}
                        </small>
                      </div>
                      
                      <div className="d-flex align-items-center">
                        {/* Previous button */}
                        <Button
                          color="secondary"
                          size="sm"
                          outline
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                          className="mr-2"
                        >
                          <FaAngleUp style={{ transform: 'rotate(-90deg)' }} className="mr-1" />
                          Previous
                        </Button>
                        
                        {/* Page numbers */}
                        <div className="d-flex align-items-center mx-2">
                          {[...Array(totalPages)].map((_, index) => {
                            const page = index + 1;
                            // Show first, last, current, and pages around current
                            const showPage = page === 1 || 
                                           page === totalPages || 
                                           (page >= currentPage - 2 && page <= currentPage + 2);
                            
                            if (!showPage && page === 2 && currentPage > 4) {
                              return <span key={page} className="mx-1 text-muted">...</span>;
                            }
                            if (!showPage && page === totalPages - 1 && currentPage < totalPages - 3) {
                              return <span key={page} className="mx-1 text-muted">...</span>;
                            }
                            if (!showPage) return null;
                            
                            return (
                              <Button
                                key={page}
                                color={page === currentPage ? "primary" : "secondary"}
                                size="sm"
                                outline={page !== currentPage}
                                onClick={() => handlePageChange(page)}
                                className="mx-1"
                                style={{ minWidth: '40px' }}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>
                        
                        {/* Next button */}
                        <Button
                          color="secondary"
                          size="sm"
                          outline
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(currentPage + 1)}
                          className="ml-2"
                        >
                          Next
                          <FaAngleUp style={{ transform: 'rotate(90deg)' }} className="ml-1" />
                        </Button>
                      </div>
                      
                      {/* Jump to page */}
                      {totalPages > 10 && (
                        <div className="d-flex align-items-center">
                          <small className="text-muted mr-2">Go to:</small>
                          <Input
                            type="number"
                            min="1"
                            max={totalPages}
                            value={currentPage}
                            onChange={(e) => {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= totalPages) {
                                handlePageChange(page);
                              }
                            }}
                            style={{ width: '80px' }}
                            bsSize="sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>      {/* Enhanced Order Details Modal */}
      <Modal isOpen={showOrderDetails} toggle={() => setShowOrderDetails(false)} size="xl" className="modal-order-details">
        <ModalHeader 
          toggle={() => setShowOrderDetails(false)} 
          className="bg-gradient-primary text-white border-0"
          style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
        >
          <div className="d-flex align-items-center">
            <div className="icon icon-shape bg-white text-primary rounded-circle shadow mr-3">
              <i className="fas fa-receipt"></i>
            </div>
            <div>
              <h4 className="mb-0 text-white">Order Details</h4>
              <small className="text-white-50">Order #{selectedOrder?.orderId} • {formatDate(selectedOrder?.orderDate)}</small>
            </div>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          {selectedOrder && (
            <div>
              {/* Order Type Banner */}
              <div className={`px-4 py-3 ${
                getOrderType(selectedOrder) === 'Dine-In' ? 'bg-gradient-info' : 
                getOrderType(selectedOrder) === 'Takeout' ? 'bg-gradient-warning' : 
                'bg-gradient-success'
              }`}>
                <div className="d-flex align-items-center text-white">
                  <div className="icon icon-shape bg-white shadow rounded-circle mr-3" style={{ 
                    color: getOrderType(selectedOrder) === 'Dine-In' ? '#11cdef' : 
                           getOrderType(selectedOrder) === 'Takeout' ? '#fb6340' : 
                           '#2dce89'
                  }}>
                    {getOrderType(selectedOrder) === 'Dine-In' && <FaUtensils />}
                    {getOrderType(selectedOrder) === 'Takeout' && <FaShoppingBag />}
                    {getOrderType(selectedOrder) === 'Delivery' && <FaTruck />}
                  </div>
                  <div>
                    <h5 className="mb-1 text-white font-weight-bold">
                      {getOrderType(selectedOrder)} Order
                    </h5>
                    <p className="mb-0 text-white-75 small">
                      {getOrderType(selectedOrder) === 'Dine-In' && 'Customer is dining in the restaurant'}
                      {getOrderType(selectedOrder) === 'Takeout' && 'Customer will pick up their order'}
                      {getOrderType(selectedOrder) === 'Delivery' && 'Order will be delivered to customer'}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {renderStatusBadge(getOrderStatus(selectedOrder))}
                  </div>
                </div>
              </div>

              <div className="px-4 py-4">
                {/* Enhanced Order, Customer and Table Information */}
                <Row className="mb-4">
                  <Col lg="4">
                    <Card className="shadow-sm border-0 h-100">
                      <CardHeader className="bg-gradient-primary text-white border-0">
                        <div className="d-flex align-items-center">
                          <div className="icon icon-shape bg-white text-primary rounded-circle shadow-sm mr-3">
                            <i className="fas fa-info-circle"></i>
                          </div>
                          <h6 className="mb-0 text-white font-weight-bold">Order Information</h6>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-3">
                        <Table borderless size="sm" className="mb-0">
                          <tbody>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted" width="45%">Order ID:</td>
                              <td className="pr-0">
                                <Badge color="primary" className="font-size-sm">
                                  {selectedOrder.orderId}
                                </Badge>
                              </td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Date & Time:</td>
                              <td className="pr-0">
                                <div>
                                  <div className="font-weight-600">{formatDate(selectedOrder.orderDate)}</div>
                                  <small className="text-muted">
                                    {new Date(selectedOrder.orderDate).toLocaleTimeString()}
                                  </small>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Status:</td>
                              <td className="pr-0">{renderStatusBadge(getOrderStatus(selectedOrder))}</td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Order Type:</td>
                              <td className="pr-0">{renderOrderTypeBadge(getOrderType(selectedOrder))}</td>
                            </tr>
                            {selectedOrder.paymentMethod && (
                              <tr>
                                <td className="pl-0 font-weight-600 text-muted">Payment:</td>
                                <td className="pr-0">
                                  <Badge color="secondary" className="text-capitalize">
                                    {selectedOrder.paymentMethod}
                                  </Badge>
                                </td>
                              </tr>
                            )}
                            {selectedOrder.notes && (
                              <tr>
                                <td className="pl-0 font-weight-600 text-muted">Notes:</td>
                                <td className="pr-0">
                                  <div className="d-flex align-items-start">
                                    <i className="fas fa-sticky-note text-warning mr-2 mt-1"></i>
                                    <small className="text-muted">{selectedOrder.notes}</small>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  </Col>
                  
                  <Col lg="4">
                    <Card className="shadow-sm border-0 h-100">
                      <CardHeader className="bg-gradient-success text-white border-0">
                        <div className="d-flex align-items-center">
                          <div className="icon icon-shape bg-white text-success rounded-circle shadow-sm mr-3">
                            <i className="fas fa-user"></i>
                          </div>
                          <h6 className="mb-0 text-white font-weight-bold">Customer Information</h6>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-3">
                        <Table borderless size="sm" className="mb-0">
                          <tbody>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted" width="40%">Name:</td>
                              <td className="pr-0">
                                <div className="d-flex align-items-center">
                                  <div className="avatar avatar-sm rounded-circle bg-gradient-primary text-white mr-2">
                                    <i className="fas fa-user"></i>
                                  </div>
                                  <span className="font-weight-600">
                                    {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null 
                                      ? (selectedOrder.customerId.name || selectedOrder.customerId.firstName || 'Unknown Customer')
                                      : selectedOrder.customerName || 'Walk-in Customer'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Phone:</td>
                              <td className="pr-0">
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-phone text-primary mr-2"></i>
                                  <span>
                                    {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null
                                      ? (selectedOrder.customerId.phone || selectedOrder.customerId.contactNumber || 'N/A')
                                      : selectedOrder.customerPhone || 'N/A'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Email:</td>
                              <td className="pr-0">
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-envelope text-primary mr-2"></i>
                                  <span>
                                    {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null
                                      ? (selectedOrder.customerId.email || 'N/A')
                                      : selectedOrder.customerEmail || 'N/A'}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {getOrderType(selectedOrder) === 'Delivery' && (
                              <tr>
                                <td className="pl-0 font-weight-600 text-muted">Address:</td>
                                <td className="pr-0">
                                  <div className="d-flex align-items-start">
                                    <i className="fas fa-map-marker-alt text-primary mr-2 mt-1"></i>
                                    <small>
                                      {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId.address 
                                        ? selectedOrder.customerId.address 
                                        : selectedOrder.deliveryAddress || 'N/A'}
                                    </small>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  </Col>

                  <Col lg="4">
                    <Card className="shadow-sm border-0 h-100">
                      <CardHeader className="bg-gradient-info text-white border-0">
                        <div className="d-flex align-items-center">
                          <div className="icon icon-shape bg-white text-info rounded-circle shadow-sm mr-3">
                            {getOrderType(selectedOrder) === 'Dine-In' ? (
                              <i className="fas fa-chair"></i>
                            ) : getOrderType(selectedOrder) === 'Takeout' ? (
                              <i className="fas fa-store"></i>
                            ) : (
                              <i className="fas fa-truck"></i>
                            )}
                          </div>
                          <h6 className="mb-0 text-white font-weight-bold">
                            {getOrderType(selectedOrder) === 'Dine-In' ? 'Table Information' : 
                             getOrderType(selectedOrder) === 'Takeout' ? 'Pickup Information' : 
                             'Delivery Information'}
                          </h6>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-3">
                        <Table borderless size="sm" className="mb-0">
                          <tbody>
                            {getOrderType(selectedOrder) === 'Dine-In' ? ( 
                              <>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted" width="45%">Table:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center"> 
                                      <span className="font-weight-bold">
                                        {/* Display table name based on populated data structure */}
                                        {selectedOrder.tableId && typeof selectedOrder.tableId === 'object' && selectedOrder.tableId.TableName
                                          ? selectedOrder.tableId.TableName
                                          : selectedOrder.TableName
                                          ? selectedOrder.TableName
                                          : typeof selectedOrder.tableId === 'string'
                                          ? `Table ${selectedOrder.tableId.slice(-6)}`
                                          : 'Table N/A'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Table ID:</td>
                                  <td className="pr-0">
                                    <small className="text-muted font-family-monospace">
                                      {selectedOrder.tableId && typeof selectedOrder.tableId === 'object' && selectedOrder.tableId._id
                                        ? selectedOrder.tableId._id
                                        : selectedOrder.tableId || 'N/A'}
                                    </small>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Service Type:</td>
                                  <td className="pr-0">
                                    <Badge color="info" className="text-white">
                                      <i className="fas fa-utensils mr-1"></i>
                                      Dine-In Service
                                    </Badge>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Estimated Time:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-clock text-info mr-2"></i>
                                      <small>20-30 minutes</small>
                                    </div>
                                  </td>
                                </tr>
                              </>
                            ) : getOrderType(selectedOrder) === 'Takeout' ? (
                              <>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted" width="45%">Order #:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <div className="icon icon-shape icon-sm bg-gradient-warning text-white rounded-circle mr-2">
                                        <i className="fas fa-hashtag"></i>
                                      </div>
                                      <span className="font-weight-bold">
                                        {selectedOrder.orderId?.split('-').pop() || selectedOrder.orderId}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Pickup Location:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-store text-warning mr-2"></i>
                                      <small>Front Counter</small>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Estimated Time:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-clock text-warning mr-2"></i>
                                      <small>15-20 minutes</small>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Status:</td>
                                  <td className="pr-0">
                                    <Badge color="warning" className="text-white">
                                      <i className="fas fa-shopping-bag mr-1"></i>
                                      Ready for Pickup
                                    </Badge>
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted" width="45%">Delivery Address:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-start">
                                      <i className="fas fa-map-marker-alt text-success mr-2 mt-1"></i>
                                      <small>
                                        {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId.address 
                                          ? selectedOrder.customerId.address 
                                          : selectedOrder.deliveryAddress || 'Address not provided'}
                                      </small>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Estimated Time:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-clock text-success mr-2"></i>
                                      <small>30-45 minutes</small>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Delivery Fee:</td>
                                  <td className="pr-0">
                                    <Badge color="success" className="text-white">
                                      {selectedOrder.deliveryFee ? formatCurrency(selectedOrder.deliveryFee) : 'Free'}
                                    </Badge>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="pl-0 font-weight-600 text-muted">Driver:</td>
                                  <td className="pr-0">
                                    <div className="d-flex align-items-center">
                                      <i className="fas fa-user-circle text-success mr-2"></i>
                                      <small>{selectedOrder.driverName || 'Assigned Soon'}</small>
                                    </div>
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>

                {/* Enhanced Order Items */}
                <Card className="shadow-sm border-0 mb-4">
                  <CardHeader className="bg-gradient-warning text-white border-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div className="icon icon-shape bg-white text-warning rounded-circle shadow mr-3">
                          <i className="fas fa-list"></i>
                        </div>
                        <div>
                          <h5 className="mb-0 text-white font-weight-bold">Order Items</h5>
                          <small className="text-white-75">
                            {selectedOrder.items?.length || 0} items • Total Qty: {selectedOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                          </small>
                        </div>
                      </div>
                      <Badge color="light" pill className="shadow-sm">
                        <i className="fas fa-utensils mr-1"></i>
                        {selectedOrder.items?.length || 0}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="table-responsive">
                      <Table className="align-items-center table-hover" style={{ marginBottom: '0' }}>
                        <thead className="thead-light">
                          <tr>
                            <th className="border-0 text-muted font-weight-600">Item Details</th>
                            <th className="border-0 text-center text-muted font-weight-600">Quantity</th>
                            <th className="border-0 text-center text-muted font-weight-600">Unit Price</th>
                            <th className="border-0 text-center text-muted font-weight-600">Total</th>
                            <th className="border-0 text-muted font-weight-600">Special Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((item, index) => (
                            <tr key={index} className="border-bottom">
                              <td className="py-3">
                                <div className="d-flex align-items-center">
                                  <div className="avatar avatar-sm rounded-circle bg-gradient-primary text-white mr-3 shadow-sm">
                                    <i className="fas fa-utensils"></i>
                                  </div>
                                  <div>
                                    <span className="font-weight-600 text-dark">
                                      {typeof item.itemId === 'object' && item.itemId?.name
                                        ? item.itemId.name
                                        : item.name || 'Unknown Item'}
                                    </span>
                                    {typeof item.categoryId === 'object' && item.categoryId?.name && (
                                      <div>
                                        <Badge color="light" className="text-muted mt-1 font-size-xs">
                                          <i className="fas fa-tag mr-1"></i>
                                          {item.categoryId.name}
                                        </Badge>
                                      </div>
                                    )}
                                    {typeof item.itemId === 'object' && item.itemId?.description && (
                                      <div>
                                        <small className="text-muted d-block mt-1">
                                          {item.itemId.description}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center py-3">
                                <Badge color="primary" pill className="shadow-sm">
                                  <i className="fas fa-times mr-1"></i>
                                  {item.quantity || 1}
                                </Badge>
                              </td>
                              <td className="text-center font-weight-600 py-3">
                                <span className="text-dark">{formatCurrency(item.price || 0)}</span>
                              </td>
                              <td className="text-center font-weight-bold py-3">
                                <span className="text-primary font-size-lg">
                                  {formatCurrency((item.price || 0) * (item.quantity || 1))}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="d-flex align-items-center">
                                  {item.specialInstructions || item.notes ? (
                                    <>
                                      <i className="fas fa-sticky-note text-warning mr-2"></i>
                                      <small className="text-muted">
                                        {item.specialInstructions || item.notes}
                                      </small>
                                    </>
                                  ) : (
                                    <small className="text-muted">
                                      <i className="fas fa-check-circle text-success mr-1"></i>
                                      No special instructions
                                    </small>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </CardBody>
                </Card>

                {/* Enhanced Order Summary */}
                <Row>
                  <Col lg={{ size: 6, offset: 6 }}>
                    <Card className="shadow border-0">
                      <CardHeader className="bg-gradient-dark text-white border-0">
                        <div className="d-flex align-items-center">
                          <div className="icon icon-shape bg-white text-dark rounded-circle shadow mr-3">
                            <i className="fas fa-calculator"></i>
                          </div>
                          <h5 className="mb-0 text-white font-weight-bold">Order Summary</h5>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-3">
                        <Table borderless className="mb-0">
                          <tbody>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">Subtotal:</td>
                              <td className="pr-0 text-right font-weight-600">
                                {formatCurrency(selectedOrder.subtotal || 0)}
                              </td>
                            </tr>
                            <tr>
                              <td className="pl-0 font-weight-600 text-muted">
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-percent text-info mr-2"></i>
                                  <span>
                                    Tax 
                                    {(() => {
                                      const taxPercentage = selectedOrder.taxDetails?.percentage || 
                                                          (selectedOrder.tax && selectedOrder.subtotal ? 
                                                           ((selectedOrder.tax / selectedOrder.subtotal) * 100).toFixed(1) : 
                                                           0);
                                      return taxPercentage > 0 ? ` (${taxPercentage}%)` : '';
                                    })()}
                                  </span>
                                </div>
                                {selectedOrder.taxDetails?.taxName && (
                                  <small className="text-muted d-block">
                                    {selectedOrder.taxDetails.taxName}
                                  </small>
                                )}
                              </td>
                              <td className="pr-0 text-right font-weight-600">
                                {formatCurrency(
                                  selectedOrder.taxAmount || 
                                  selectedOrder.tax || 
                                  0
                                )}
                              </td>
                            </tr>
                            {selectedOrder.deliveryFee && (
                              <tr>
                                <td className="pl-0 font-weight-600 text-muted">
                                  <div className="d-flex align-items-center">
                                    <i className="fas fa-truck text-success mr-2"></i>
                                    <span>Delivery Fee</span>
                                  </div>
                                </td>
                                <td className="pr-0 text-right font-weight-600">
                                  {formatCurrency(selectedOrder.deliveryFee)}
                                </td>
                              </tr>
                            )}
                            {selectedOrder.taxDetails?.countryCode && (
                              <tr>
                                <td className="pl-0">
                                  <small className="text-muted">Tax Region:</small>
                                </td>
                                <td className="pr-0 text-right">
                                  <Badge color="light" className="text-muted">
                                    <i className="fas fa-globe mr-1"></i>
                                    {selectedOrder.taxDetails.countryCode}
                                  </Badge>
                                </td>
                              </tr>
                            )}
                            <tr className="border-top">
                              <td className="pl-0 pt-3">
                                <h4 className="mb-0 font-weight-bold text-primary"> 
                                  Total Amount:
                                </h4>
                              </td>
                              <td className="pr-0 text-right pt-3">
                                <h3 className="mb-0 font-weight-bold text-primary">
                                  {formatCurrency(selectedOrder.totalAmount || 0)}
                                </h3>
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-0 bg-light">
          <Button color="secondary" onClick={() => setShowOrderDetails(false)} className="shadow-sm">
            <i className="fas fa-times mr-2"></i>
            Close
          </Button>
          <Button 
            color="info" 
            onClick={() => {
              setShowOrderDetails(false);
              handleOpenStatusModal(selectedOrder);
            }}
            className="shadow-sm"
          >
            <i className="fas fa-edit mr-2"></i>
            Update Status
          </Button>
          <Button 
            color="danger" 
            onClick={() => handleGenerateInvoice(selectedOrder)}
            disabled={generatingInvoice === selectedOrder?._id}
            className="shadow-sm"
          >
            {generatingInvoice === selectedOrder?._id ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <FaFilePdf className="mr-2" /> Generate Invoice
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} toggle={() => setShowStatusModal(false)}>
        <ModalHeader toggle={() => setShowStatusModal(false)} className="bg-info text-white">
          <i className="fas fa-edit mr-2"></i>
          Update Order Status
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <Form>
              <Alert 
                color={
                  getOrderType(selectedOrder) === 'Dine-In' ? 'info' : 
                  getOrderType(selectedOrder) === 'Takeout' ? 'warning' : 
                  'primary'
                }
                className="mb-3"
              >
                <div className="d-flex align-items-center">
                  {getOrderType(selectedOrder) === 'Dine-In' && <FaUtensils className="mr-2" />}
                  {getOrderType(selectedOrder) === 'Takeout' && <FaShoppingBag className="mr-2" />}
                  {getOrderType(selectedOrder) === 'Delivery' && <FaTruck className="mr-2" />}
                  <div>
                    <strong>{getOrderType(selectedOrder)} Order #{selectedOrder.orderId}</strong>
                    <div><small>{formatDate(selectedOrder.orderDate)}</small></div>
                  </div>
                </div>
              </Alert>
              <FormGroup>
                <Label for="orderStatus">
                  <strong>Order Status</strong>
                </Label>
                <Input
                  type="select"
                  name="orderStatus"
                  id="orderStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={updatingStatus}
                  className={
                    newStatus === 'Pending' ? 'border-warning' : 
                    newStatus === 'Processing' ? 'border-primary' :
                    newStatus === 'Completed' ? 'border-success' :
                    newStatus === 'Cancelled' ? 'border-danger' : ''
                  }
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Input>
              </FormGroup>
              
              <div className="d-flex align-items-center mb-3">
                <span className="mr-2">Current Status:</span> 
                {renderStatusBadge(getOrderStatus(selectedOrder))}
              </div>
              
              <Alert 
                color="secondary"
                className="mb-0"
              >
                <div className="d-flex align-items-center">
                  <i className="fas fa-info-circle mr-2"></i>
                  {getOrderType(selectedOrder) === 'Dine-In' 
                    ? 'Updating status for Dine-In order will notify wait staff.' 
                    : getOrderType(selectedOrder) === 'Takeout' 
                    ? 'Updating status for Takeout order will notify pickup counter.' 
                    : 'Updating status will notify delivery personnel.'}
                </div>
              </Alert>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button 
            color="secondary" 
            onClick={() => setShowStatusModal(false)}
            disabled={updatingStatus}
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            onClick={handleUpdateStatus} 
            disabled={updatingStatus || loading}
            className="px-4"
          >
            {updatingStatus ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Updating Status...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Update Status
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} toggle={() => setShowDeleteConfirm(false)}>
        <ModalHeader toggle={() => setShowDeleteConfirm(false)} className="bg-danger text-white">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Confirm Deletion
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <>
              <Alert 
                color={
                  getOrderType(selectedOrder) === 'Dine-In' ? 'info' : 
                  getOrderType(selectedOrder) === 'Takeout' ? 'warning' : 
                  'primary'
                }
                className="mb-3"
              >
                <div className="d-flex align-items-center">
                  {getOrderType(selectedOrder) === 'Dine-In' && <FaUtensils className="mr-2" />}
                  {getOrderType(selectedOrder) === 'Takeout' && <FaShoppingBag className="mr-2" />}
                  {getOrderType(selectedOrder) === 'Delivery' && <FaTruck className="mr-2" />}
                  <div>
                    <strong>{getOrderType(selectedOrder)} Order #{selectedOrder.orderId}</strong>
                    <div><small>{formatDate(selectedOrder.orderDate)}</small></div>
                  </div>
                </div>
              </Alert>
              
              <Alert color="danger" className="mt-3">
                <p className="mb-0"><strong>Warning:</strong> Are you sure you want to delete this {getOrderType(selectedOrder).toLowerCase()} order? This action cannot be undone.</p>
              </Alert>
              
              <p className="text-muted">
                <small>
                  <i className="fas fa-info-circle mr-1"></i>
                  Deleting the order will remove it from your records and reports.
                </small>
              </p>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDeleteOrder} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Delete Order'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default OrderManagement;