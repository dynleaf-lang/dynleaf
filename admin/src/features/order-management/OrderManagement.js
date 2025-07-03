import React, { useState, useEffect, useContext, useCallback } from 'react';
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

  // Notification helper function
  const showNotification = (type, title, message, autoClose = true) => {
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
  };

  // Close notification manually
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

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
    generateInvoice
  } = useOrder();

  // Ensure orders is always an array to prevent "orders.filter is not a function" error
  const orders = Array.isArray(rawOrders) ? rawOrders : [];

  const { user } = useContext(AuthContext);
  
  // Currency context for proper currency formatting based on user's branch country
  const { formatCurrency } = useCurrency();
  
  // Socket context for real-time updates
  const { 
    isConnected, 
    onOrderUpdate, 
    onStatusUpdate, 
    onNewOrder,
    offOrderUpdate,
    offStatusUpdate,
    offNewOrder
  } = useSocket();

  // Helper function to safely get order type
  const getOrderType = (order) => {
    return order?.OrderType || order?.orderType || 'Dine-In';
  };

  // Helper function to safely get order status
  const getOrderStatus = (order) => {
    return order?.orderStatus || order?.status || 'Pending';
  };

  // Client-side filtering and sorting
  const filterOrders = useCallback(() => {
    let filtered = [...orders];
    
    // Filter by active status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => {
        const status = order.orderStatus || order.status || '';
        
        // Normalize status for comparison
        const normalizedStatus = status.toLowerCase();
        const targetStatus = activeTab.toLowerCase();
        
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
  }, [orders, activeTab, activeOrderType, searchTerm, sortConfig]);

  // Initialize and load data
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true;
      
      // Force refresh on first load to get fresh data
      getAllOrders({}, true);
      
      // If Super_Admin, also get restaurants for filtering
      if (user.role === 'Super_Admin') {
        getRestaurants();
      }
    }
  }, [user]); // Remove function dependencies to prevent infinite loop
  // Filter orders when search term, filters, or orders list changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      filterOrders();
    } else {
      // If no orders, ensure filtered orders is also empty
      setFilteredOrders([]);
    }
  }, [orders, filterOrders]); // Only depend on orders and the memoized filterOrders function

  // Setup real-time socket listeners
  useEffect(() => {
    if (!isConnected) return;

    // Handle order updates (created, updated, deleted)
    const handleOrderUpdate = (data) => {
      console.log('[SOCKET] Order update received:', data);
      const { order, eventType } = data;
      
      // Force refresh orders to get the latest data
      getAllOrders({}, true);
      
      // Show notification based on event type
      if (eventType === 'created') {
        showNotification(
          'info',
          'New Order Received!',
          `Order #${order.orderId} has been placed.`,
          true
        );
      } else if (eventType === 'updated') {
        showNotification(
          'success',
          'Order Updated!',
          `Order #${order.orderId} has been updated.`,
          true
        );
      }
    };

    // Handle status updates specifically
    const handleStatusUpdate = (data) => {
      console.log('[SOCKET] Status update received:', data);
      const { orderNumber, oldStatus, newStatus } = data;
      
      // Force refresh orders to get the latest data
      getAllOrders({}, true);
      
      // Show status change notification
      showNotification(
        'info',
        'Order Status Changed!',
        `Order #${orderNumber} status changed from ${oldStatus} to ${newStatus}.`,
        true
      );
    };

    // Handle new order notifications
    const handleNewOrder = (data) => {
      console.log('[SOCKET] New order notification received:', data);
      const { order } = data;
      
      // Force refresh orders to get the latest data
      getAllOrders({}, true);
      
      // Show new order notification with sound/special styling
      showNotification(
        'success',
        '🔔 New Order Alert!',
        `Order #${order.orderId} has been placed. Total: ${formatCurrency(order.totalAmount)}`,
        false // Don't auto-close for new orders
      );
    };

    // Register event listeners
    onOrderUpdate(handleOrderUpdate);
    onStatusUpdate(handleStatusUpdate);
    onNewOrder(handleNewOrder);

    // Cleanup listeners when component unmounts or connection changes
    return () => {
      offOrderUpdate();
      offStatusUpdate();
      offNewOrder();
    };
  }, [isConnected]); // Only depend on isConnected to avoid infinite re-renders

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
    setDateRange({
      startDate: '',
      endDate: '',
    });
    setSearchTerm('');
    setActiveTab('all');
    setActiveOrderType('all');
    
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

  return (
    <>
      <Header />
      
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

      {/* CSS for notification animations */}
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
                      onClick={() => applyFilters()}
                      disabled={loading}
                    >
                      <i className="fas fa-sync-alt"></i>
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
                  <Col md="8" className="text-right">
                    <span className="text-muted">
                      {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
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
                        </tr>                      </thead>                      <tbody>                        {filteredOrders.map(order => {
                          const orderType = getOrderType(order);
                          const isRecentlyUpdated = recentlyUpdatedOrders.has(order._id);
                          
                          return (
                            <tr 
                              key={order._id}
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
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>      {/* Order Details Modal */}
      <Modal isOpen={showOrderDetails} toggle={() => setShowOrderDetails(false)} size="lg">
        <ModalHeader 
          toggle={() => setShowOrderDetails(false)} 
          className="bg-info text-white"
        >
          <i className="fas fa-file-alt mr-2"></i>
          Order Details
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <div>
              <Row className="mb-4">
                <Col xs="12">
                  <Alert 
                    color={
                      getOrderType(selectedOrder) === 'Dine-In' ? 'info' : 
                      getOrderType(selectedOrder) === 'Takeout' ? 'warning' : 
                      'primary'
                    }
                    className="mb-0"
                  >
                    {getOrderType(selectedOrder) === 'Dine-In' && (
                      <div className="d-flex align-items-center">
                        <FaUtensils className="mr-2" />
                        <div>
                          <strong>Dine-In Order</strong>
                          <div><small>Customer is dining in the restaurant</small></div>
                        </div>
                      </div>
                    )}
                    {getOrderType(selectedOrder) === 'Takeout' && (
                      <div className="d-flex align-items-center">
                        <FaShoppingBag className="mr-2" />
                        <div>
                          <strong>Takeout Order</strong>
                          <div><small>Customer will pick up their order</small></div>
                        </div>
                      </div>
                    )}
                    {getOrderType(selectedOrder) === 'Delivery' && (
                      <div className="d-flex align-items-center">
                        <FaTruck className="mr-2" />
                        <div>
                          <strong>Delivery Order</strong>
                          <div><small>Order will be delivered to customer</small></div>
                        </div>
                      </div>
                    )}
                  </Alert>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md="6">
                  <h4 className="mb-3">Order Information</h4>
                  <Table borderless size="sm">
                    <tbody>
                      <tr>
                        <th scope="row" width="40%">Order ID:</th>
                        <td>{selectedOrder.orderId}</td>
                      </tr>
                      <tr>
                        <th scope="row">Date:</th>
                        <td>{formatDate(selectedOrder.orderDate)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Status:</th>
                        <td>{renderStatusBadge(getOrderStatus(selectedOrder))}</td>
                      </tr>
                      <tr>
                        <th scope="row">Type:</th>
                        <td>{renderOrderTypeBadge(getOrderType(selectedOrder))}</td>
                      </tr>
                      <tr>
                        <th scope="row">{getOrderType(selectedOrder) === 'Dine-In' ? 'Table:' : 'Pickup/Delivery #:'}</th>
                        <td>{selectedOrder.tableId || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
                <Col md="6">
                  <h4 className="mb-3">Customer Information</h4>
                  <Table borderless size="sm">
                    <tbody>
                      <tr>
                        <th scope="row" width="40%">Name:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null 
                            ? (selectedOrder.customerId.name || selectedOrder.customerId.firstName || 'Unknown Customer')
                            : selectedOrder.customerName || 'Walk-in Customer'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Phone:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null
                            ? (selectedOrder.customerId.phone || selectedOrder.customerId.contactNumber || 'N/A')
                            : selectedOrder.customerPhone || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Email:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId !== null
                            ? (selectedOrder.customerId.email || 'N/A')
                            : selectedOrder.customerEmail || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Address:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId.address 
                            ? selectedOrder.customerId.address 
                            : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>

              <h4 className="mb-3">Order Items</h4>
              <Table className="mt-3" responsive>
                <thead className="thead-light">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Special Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        {typeof item.itemId === 'object' ? (
                          <div>
                            <span className="font-weight-bold">{item.itemId.name}</span>
                          </div>
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </td>
                      <td>
                        {typeof item.categoryId === 'object' ? (
                          item.categoryId.name
                        ) : (
                          <span className="text-muted">Category ID: {item.categoryId}</span>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{formatCurrency(item.price * item.quantity)}</td>
                      <td>{item.specialInstructions || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Row className="mt-4">
                <Col md={{ size: 5, offset: 7 }}>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <th>Subtotal:</th>
                        <td className="text-right">{formatCurrency(selectedOrder.subtotal)}</td>
                      </tr>
                      <tr>
                        <th>
                          Tax ({selectedOrder.taxDetails ? selectedOrder.taxDetails.percentage + '%' : '0%'})
                          <br />
                          <small className="text-muted">
                            {selectedOrder.taxDetails ? selectedOrder.taxDetails.taxName : 'Tax'}
                          </small>
                        </th>
                        <td className="text-right">{formatCurrency(selectedOrder.tax)}</td>
                      </tr>
                      <tr className="border-top">
                        <th>Total:</th>
                        <td className="text-right font-weight-bold">{formatCurrency(selectedOrder.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowOrderDetails(false)}>
            Close
          </Button>
          <Button 
            color="danger" 
            onClick={() => handleGenerateInvoice(selectedOrder)}
            disabled={generatingInvoice === selectedOrder?._id}
          >
            {generatingInvoice === selectedOrder?._id ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Generating Invoice...
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