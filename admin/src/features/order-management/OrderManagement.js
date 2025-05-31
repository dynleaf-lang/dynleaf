import React, { useState, useEffect, useContext } from 'react';
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
  FaTruck
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';

const OrderStatus = {
  Pending: { color: 'warning', icon: FaClock, label: 'Pending' },
  Processing: { color: 'primary', icon: FaSpinner, label: 'Processing' },
  Completed: { color: 'success', icon: FaCheck, label: 'Completed' },
  Cancelled: { color: 'danger', icon: FaTimes, label: 'Cancelled' }
};

const OrderType = {
  'Dine-In': { color: 'info', icon: null, label: 'Dine-In' },
  'Takeout': { color: 'secondary', icon: null, label: 'Takeout' },
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
  });
  const [activeTab, setActiveTab] = useState('all');

  const {
    orders,
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

  const { user } = useContext(AuthContext);

  // Initialize and load data
  useEffect(() => {
    if (user) {
      applyFilters();
    }
  }, [user]);
  
  // Filter orders when search term, filters, or orders list changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      filterOrders();
    }
  }, [searchTerm, statusFilter, orderTypeFilter, dateRange, orders, sortConfig, activeTab]);

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
    if (orderTypeFilter) filters.OrderType = orderTypeFilter;
    
    // Date range filters
    if (dateRange.startDate) filters.startDate = dateRange.startDate;
    if (dateRange.endDate) filters.endDate = dateRange.endDate;
    
    await getAllOrders(filters);
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
    await getAllOrders();
  };

  // Client-side filtering and sorting
  const filterOrders = () => {
    let filtered = [...orders];
    
    // Filter by active tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.orderStatus.toLowerCase() === activeTab);
    }

    // Apply search term filter
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        (order.orderId && order.orderId.toLowerCase().includes(lowercasedTerm)) ||
        (order.customerId && order.customerId.name && order.customerId.name.toLowerCase().includes(lowercasedTerm))
      );
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
    setNewStatus(order.orderStatus);
    setShowStatusModal(true);
  };

  // Update order status
  const handleUpdateStatus = async () => {
    try {
      await updateOrderStatus(selectedOrder._id, newStatus);
      setShowStatusModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating status:', error);
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
      await deleteOrder(selectedOrder._id);
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  // Handle invoice generation
  const handleGenerateInvoice = async (order) => {
    try {
      await generateInvoice(order._id);
    } catch (error) {
      console.error('Error generating invoice:', error);
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Get the title based on user role and branch assignment
  const getTitle = () => {
    if (user.role === 'Super_Admin') {
      if (selectedRestaurant && selectedBranch) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        const branchName = branches.find(b => b._id === selectedBranch)?.name || '';
        return `${restaurantName} - ${branchName} Orders`;
      } else if (selectedRestaurant) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        return `${restaurantName} Orders`;
      } else {
        return 'All Orders';
      }
    } else if (user.branchId) {
      return 'Branch Orders';
    } else {
      return 'Order Management';
    }
  };
  
  // Render order status badge
  const renderStatusBadge = (status) => {
    const statusInfo = OrderStatus[status] || { color: 'secondary', icon: null, label: status };
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
    const typeInfo = OrderType[type] || { color: 'secondary', icon: null, label: type };
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
              <CardBody>
                {/* Status Tab Navigation */}
                <Nav tabs className="mb-4">
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
                        {orders.filter(o => o.orderStatus === 'Pending').length}
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
                        {orders.filter(o => o.orderStatus === 'Processing').length}
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
                        {orders.filter(o => o.orderStatus === 'Completed').length}
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
                        {orders.filter(o => o.orderStatus === 'Cancelled').length}
                      </Badge>
                      Cancelled
                    </NavLink>
                  </NavItem>
                </Nav>

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
                        </Col>
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="orderTypeFilter">Order Type</Label>
                            <Input
                              type="select"
                              name="orderTypeFilter"
                              id="orderTypeFilter"
                              value={orderTypeFilter}
                              onChange={(e) => setOrderTypeFilter(e.target.value)}
                            >
                              <option value="">All Types</option>
                              <option value="Dine-In">Dine-In</option>
                              <option value="Takeout">Takeout</option>
                              <option value="Delivery">Delivery</option>
                            </Input>
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
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <span className="font-weight-bold">{order.orderId}</span>
                            </td>
                            <td>
                              {order.customerId ? (
                                typeof order.customerId === 'object' ? (
                                  <div>
                                    <div className="font-weight-bold">{order.customerId.name}</div>
                                    <small>{order.customerId.phone}</small>
                                  </div>
                                ) : (
                                  <span className="text-muted">ID: {order.customerId}</span>
                                )
                              ) : (
                                <span className="text-muted">Unknown</span>
                              )}
                            </td>
                            <td>
                              <div>
                                <div>{formatDate(order.orderDate)}</div>
                              </div>
                            </td>
                            <td>
                              <Badge color="info" pill>
                                {order.items.length}
                              </Badge>
                            </td>
                            <td>
                              <span className="font-weight-bold">
                                {formatCurrency(order.totalAmount)}
                              </span>
                            </td>
                            <td>
                              {renderOrderTypeBadge(order.OrderType)}
                            </td>
                            <td>
                              {renderStatusBadge(order.orderStatus)}
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
                                  {order.orderStatus !== 'Completed' && order.orderStatus !== 'Cancelled' && (
                                    <DropdownItem onClick={() => handleOpenStatusModal(order)}>
                                      <FaEdit className="text-info mr-2" /> Update Status
                                    </DropdownItem>
                                  )}
                                  <DropdownItem onClick={() => handleGenerateInvoice(order)}>
                                    <FaFilePdf className="text-danger mr-2" /> Generate Invoice
                                  </DropdownItem>
                                  <DropdownItem onClick={() => handleOpenDeleteModal(order)}>
                                    <FaTrashAlt className="text-danger mr-2" /> Delete
                                  </DropdownItem>
                                </DropdownMenu>
                              </UncontrolledDropdown>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Order Details Modal */}
      <Modal isOpen={showOrderDetails} toggle={() => setShowOrderDetails(false)} size="lg">
        <ModalHeader toggle={() => setShowOrderDetails(false)} className="bg-info text-white">
          <i className="fas fa-file-alt mr-2"></i>
          Order Details
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <div>
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
                        <td>{renderStatusBadge(selectedOrder.orderStatus)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Type:</th>
                        <td>{renderOrderTypeBadge(selectedOrder.OrderType)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Table:</th>
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
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' 
                            ? selectedOrder.customerId.name 
                            : 'Unknown'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Phone:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId.phone 
                            ? selectedOrder.customerId.phone 
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Email:</th>
                        <td>
                          {selectedOrder.customerId && typeof selectedOrder.customerId === 'object' && selectedOrder.customerId.email 
                            ? selectedOrder.customerId.email 
                            : 'N/A'}
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
                          <span>Item ID: {item.itemId}</span>
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
          <Button color="danger" onClick={() => handleGenerateInvoice(selectedOrder)}>
            <FaFilePdf className="mr-2" /> Generate Invoice
          </Button>
        </ModalFooter>
      </Modal>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} toggle={() => setShowStatusModal(false)}>
        <ModalHeader toggle={() => setShowStatusModal(false)} className="bg-info text-white">
          <i className="fas fa-edit mr-2"></i>
          Update Order Status
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <Form>
              <FormGroup>
                <Label for="orderStatus">Order Status</Label>
                <Input
                  type="select"
                  name="orderStatus"
                  id="orderStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Input>
              </FormGroup>
              <p className="text-muted">
                <strong>Current Status:</strong> {selectedOrder.orderStatus}
              </p>
              <Alert color="info">
                <i className="fas fa-info-circle mr-2"></i>
                Changing the status will notify relevant staff members.
              </Alert>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowStatusModal(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleUpdateStatus} disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Update Status'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} toggle={() => setShowDeleteConfirm(false)}>
        <ModalHeader toggle={() => setShowDeleteConfirm(false)} className="bg-danger text-white">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Confirm Deletion
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <>
              <p>Are you sure you want to delete order <strong>#{selectedOrder.orderId}</strong>?</p>
              <p className="mb-0"><strong>Warning:</strong> This action cannot be undone.</p>
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