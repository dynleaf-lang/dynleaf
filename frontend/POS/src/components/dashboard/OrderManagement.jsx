import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  Badge, 
  Input, 
  InputGroup,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Alert,
  Table
} from 'reactstrap';
import { 
  FaReceipt, 
  FaSearch, 
  FaFilter, 
  FaClock, 
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEdit,
  FaPrint, 
  FaUtensils,
  FaTable,
  FaSync,
  FaShoppingBag,
  FaTruck,
  FaGlobe,
  FaEllipsisH,
  FaClipboardList,
  FaConciergeBell,
  FaPhone,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { useOrder } from '../../context/OrderContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './OrderManagement.css';

const OrderManagement = () => {
  const { 
    orders, 
    loading, 
    fetchOrders,
    updateOrderStatus,
    updatePaymentStatus,
    getOrdersByStatus,
    getOrdersByPaymentStatus,
    getTodaysOrders
  } = useOrder();

  // Main view states
  const [mainView, setMainView] = useState('orders'); // 'orders' or 'kot'
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Filter orders based on main view, active tab, search, and filters
  const filteredOrders = React.useMemo(() => {
    let filtered = orders;

    // Filter by main view (orders vs kot)
    if (mainView === 'kot') {
      // KOT view shows only orders that need kitchen attention
      filtered = filtered.filter(order => 
        ['confirmed', 'preparing'].includes(order.status)
      );
    }

    // Filter by order type for Order View
    if (mainView === 'orders' && activeTab !== 'all') {
      if (['dine-in', 'delivery', 'pickup', 'online', 'other'].includes(activeTab)) {
        filtered = filtered.filter(order => {
          const orderType = order.customerInfo?.orderType || order.orderType || 'dine-in';
          return orderType.toLowerCase().replace(/[^a-z]/g, '') === activeTab.replace(/[^a-z]/g, '');
        });
      } else {
        // Status-based filtering
        filtered = getOrdersByStatus(activeTab);
      }
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.customerInfo?.name?.toLowerCase().includes(searchLower) ||
        order.tableName?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, mainView, activeTab, searchTerm, paymentFilter, getOrdersByStatus]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handlePaymentStatusUpdate = async (orderId, newPaymentStatus) => {
    try {
      await updatePaymentStatus(orderId, newPaymentStatus);
      toast.success(`Payment status updated to ${newPaymentStatus}`);
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'primary';
      case 'ready':
        return 'success';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'danger';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'danger';
      case 'refunded':
        return 'info';
      case 'partial':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock />;
      case 'confirmed':
        return <FaCheckCircle />;
      case 'preparing':
        return <FaUtensils />;
      case 'ready':
        return <FaConciergeBell />;
      case 'delivered':
        return <FaCheckCircle />;
      case 'cancelled':
        return <FaExclamationTriangle />;
      default:
        return <FaClock />;
    }
  };

  const getOrderTypeIcon = (orderType) => {
    switch (orderType?.toLowerCase()) {
      case 'dine-in':
      case 'dinein':
        return <FaUtensils />;
      case 'delivery':
        return <FaTruck />;
      case 'pickup':
      case 'takeaway':
        return <FaShoppingBag />;
      case 'online':
        return <FaGlobe />;
      default:
        return <FaEllipsisH />;
    }
  };

  const getOrderTypeColor = (orderType) => {
    switch (orderType?.toLowerCase()) {
      case 'dine-in':
      case 'dinein':
        return 'primary';
      case 'delivery':
        return 'info';
      case 'pickup':
      case 'takeaway':
        return 'warning';
      case 'online':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const OrderCard = ({ order }) => {
    const orderType = order.customerInfo?.orderType || order.orderType || 'dine-in';
    
    return (
      <Card className="order-card h-100 shadow-sm">
        <CardHeader className="order-card-header">
          <div className="d-flex justify-content-between align-items-start">
            <div className="order-header-info">
              <div className="d-flex align-items-center mb-2">
                <div className="status-icon me-2">
                  {getStatusIcon(order.status)}
                </div>
                <h6 className="order-number mb-0">#{order.orderNumber}</h6>
              </div>
              <div className="d-flex align-items-center mb-2">
                <div className="order-type-badge me-2">
                  {getOrderTypeIcon(orderType)}
                </div>
                <Badge color={getOrderTypeColor(orderType)} className="order-type-label">
                  {orderType.toUpperCase()}
                </Badge>
              </div>
              <small className="order-time text-muted">
                {format(new Date(order.createdAt), 'HH:mm')}
              </small>
            </div>
            <div className="order-status-badges">
              <Badge color={getStatusColor(order.status)} className="mb-1">
                {order.status.toUpperCase()}
              </Badge>
              <br />
              <Badge color={getPaymentStatusColor(order.paymentStatus)}>
                {order.paymentStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardBody className="order-card-body">
          <div className="order-details">
            <div className="detail-item">
              <FaTable className="detail-icon" />
              <span className="detail-label">Table:</span>
              <span className="detail-value">{order.tableName}</span>
            </div>
            <div className="detail-item">
              <FaPhone className="detail-icon" />
              <span className="detail-label">Customer:</span>
              <span className="detail-value">{order.customerInfo?.name || 'Walk-in'}</span>
            </div>
            <div className="detail-item">
              <FaReceipt className="detail-icon" />
              <span className="detail-label">Items:</span>
              <span className="detail-value">{order.items?.length || 0}</span>
            </div>
            <div className="detail-item total-amount">
              <span className="detail-label">Total:</span>
              <span className="detail-value font-weight-bold">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </CardBody>
        <div className="order-card-footer">
          <div className="action-buttons">
            <Button
              size="sm"
              color="outline-info"
              className="view-btn"
              onClick={() => handleViewOrder(order)}
            >
              <FaEye className="me-1" />
              View
            </Button>
            
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <>
                {order.status === 'pending' && (
                  <Button
                    size="sm"
                    color="success"
                    className="action-btn"
                    onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                  >
                    <FaCheckCircle className="me-1" />
                    Confirm
                  </Button>
                )}
                {order.status === 'confirmed' && (
                  <Button
                    size="sm"
                    color="primary"
                    className="action-btn"
                    onClick={() => handleStatusUpdate(order._id, 'preparing')}
                  >
                    <FaUtensils className="me-1" />
                    Prepare
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button
                    size="sm"
                    color="warning"
                    className="action-btn"
                    onClick={() => handleStatusUpdate(order._id, 'ready')}
                  >
                    <FaConciergeBell className="me-1" />
                    Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button
                    size="sm"
                    color="success"
                    className="action-btn"
                    onClick={() => handleStatusUpdate(order._id, 'delivered')}
                  >
                    <FaCheckCircle className="me-1" />
                    Delivered
                  </Button>
                )}
              </>
            )}

            {order.paymentStatus === 'unpaid' && (
              <Button
                size="sm"
                color="warning"
                className="payment-btn"
                onClick={() => handlePaymentStatusUpdate(order._id, 'paid')}
              >
                Mark Paid
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
         <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">
          <h5>Loading Orders...</h5>
          <p className="text-muted">Please wait while we fetch the order information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-management">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3>Order Management</h3>
          <p className="text-muted mb-0">Manage and track all orders</p>
        </div>
        <Button color="outline-primary" onClick={fetchOrders}>
          <FaSync className="me-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={4}>
          <InputGroup>
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button color="outline-secondary">
              <FaSearch />
            </Button>
          </InputGroup>
        </Col>
        <Col md={4}>
          <Input
            type="select"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partial">Partial</option>
          </Input>
        </Col>
        <Col md={4}>
          <Button color="outline-secondary" block>
            <FaFilter className="me-2" />
            Advanced Filters
          </Button>
        </Col>
      </Row>

      {/* Main View Tabs */}
      <Nav tabs className="mb-4 main-view-tabs">
        <NavItem>
          <NavLink
            className={mainView === 'orders' ? 'active' : ''}
            onClick={() => {
              setMainView('orders');
              setActiveTab('all');
            }}
            style={{ cursor: 'pointer' }}
          >
            <FaClipboardList className="me-2" />
            Order View
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={mainView === 'kot' ? 'active' : ''}
            onClick={() => {
              setMainView('kot');
              setActiveTab('all');
            }}
            style={{ cursor: 'pointer' }}
          >
            <FaUtensils className="me-2" />
            KOT View
          </NavLink>
        </NavItem>
      </Nav>

      {/* Sub-category Tabs */}
      {mainView === 'orders' && (
        <Nav pills className="mb-4 order-type-tabs">
          <NavItem>
            <NavLink
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
              style={{ cursor: 'pointer' }}
            >
              All Orders ({orders.length})
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'dine-in' ? 'active' : ''}
              onClick={() => setActiveTab('dine-in')}
              style={{ cursor: 'pointer' }}
            >
              <FaUtensils className="me-2" />
              Dine-in
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'delivery' ? 'active' : ''}
              onClick={() => setActiveTab('delivery')}
              style={{ cursor: 'pointer' }}
            >
              <FaTruck className="me-2" />
              Delivery
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'pickup' ? 'active' : ''}
              onClick={() => setActiveTab('pickup')}
              style={{ cursor: 'pointer' }}
            >
              <FaShoppingBag className="me-2" />
              Pickup
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'online' ? 'active' : ''}
              onClick={() => setActiveTab('online')}
              style={{ cursor: 'pointer' }}
            >
              <FaGlobe className="me-2" />
              Online
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'other' ? 'active' : ''}
              onClick={() => setActiveTab('other')}
              style={{ cursor: 'pointer' }}
            >
              <FaEllipsisH className="me-2" />
              Other
            </NavLink>
          </NavItem>
        </Nav>
      )}

      {mainView === 'kot' && (
        <Nav pills className="mb-4 kot-status-tabs">
          <NavItem>
            <NavLink
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
              style={{ cursor: 'pointer' }}
            >
              All KOT ({filteredOrders.length})
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'confirmed' ? 'active' : ''}
              onClick={() => setActiveTab('confirmed')}
              style={{ cursor: 'pointer' }}
            >
              <FaCheckCircle className="me-2" />
              Confirmed
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'preparing' ? 'active' : ''}
              onClick={() => setActiveTab('preparing')}
              style={{ cursor: 'pointer' }}
            >
              <FaUtensils className="me-2" />
              Preparing
            </NavLink>
          </NavItem>
        </Nav>
      )}

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <Alert color="info" className="text-center" fade={false}>
            <h5>No Orders Found</h5>
            <p>No orders match your current search criteria.</p>
          </Alert>
        ) : (
          <Row className="orders-grid">
            {filteredOrders.map(order => (
              <Col key={order._id} xl={3} lg={4} md={6} sm={12} className="mb-4">
                <OrderCard order={order} />
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal 
        isOpen={showOrderModal} 
        toggle={() => setShowOrderModal(false)}
        size="lg"
      >
        <ModalHeader toggle={() => setShowOrderModal(false)}>
          Order Details - #{selectedOrder?.orderNumber}
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Order Information</h6>
                  <p><strong>Order Number:</strong> {selectedOrder.orderNumber}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                  <p><strong>Table:</strong> {selectedOrder.tableName}</p>
                  <p>
                    <strong>Status:</strong> 
                    <Badge color={getStatusColor(selectedOrder.status)} className="ms-2">
                      {selectedOrder.status.toUpperCase()}
                    </Badge>
                  </p>
                  <p>
                    <strong>Payment:</strong> 
                    <Badge color={getPaymentStatusColor(selectedOrder.paymentStatus)} className="ms-2">
                      {selectedOrder.paymentStatus.toUpperCase()}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {selectedOrder.customerInfo?.name || 'Walk-in Customer'}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customerInfo?.phone || 'N/A'}</p>
                  <p><strong>Order Type:</strong> {selectedOrder.customerInfo?.orderType || 'dine-in'}</p>
                  {selectedOrder.specialInstructions && (
                    <p><strong>Special Instructions:</strong> {selectedOrder.specialInstructions}</p>
                  )}
                </Col>
              </Row>

              <h6>Order Items</h6>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <strong>{item.name}</strong>
                          {item.customizations?.spiceLevel && (
                            <Badge color="warning" size="sm" className="ms-2">
                              {item.customizations.spiceLevel} spice
                            </Badge>
                          )}
                          {item.customizations?.specialInstructions && (
                            <div className="text-info small">
                              Note: {item.customizations.specialInstructions}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{formatPrice(item.price)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatPrice(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <div className="order-summary">
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax:</span>
                  <span>{formatPrice(selectedOrder.tax)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowOrderModal(false)}>
            Close
          </Button>
          <Button color="primary" onClick={() => window.print()}>
            <FaPrint className="me-2" />
            Print Receipt
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default OrderManagement;
