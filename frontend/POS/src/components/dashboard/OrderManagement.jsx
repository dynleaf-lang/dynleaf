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
} from 'react-icons/fa';
import { useOrder } from '../../context/OrderContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Filter orders based on active tab, search, and filters
  const filteredOrders = React.useMemo(() => {
    let filtered = orders;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = getOrdersByStatus(activeTab);
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
  }, [orders, activeTab, searchTerm, paymentFilter, getOrdersByStatus]);

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
      case 'preparing':
        return <FaUtensils />;
      case 'ready':
      case 'delivered':
        return <FaCheckCircle />;
      case 'cancelled':
        return <FaExclamationTriangle />;
      default:
        return <FaReceipt />;
    }
  };

  const OrderCard = ({ order }) => (
    <Card className="order-card mb-3">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <div className="me-3">
            {getStatusIcon(order.status)}
          </div>
          <div>
            <h6 className="mb-0">Order #{order.orderNumber}</h6>
            <small className="text-muted">
              {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
            </small>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge color={getStatusColor(order.status)}>
            {order.status.toUpperCase()}
          </Badge>
          <Badge color={getPaymentStatusColor(order.paymentStatus)}>
            {order.paymentStatus.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <Row>
          <Col md={6}>
            <div className="order-info">
              <p className="mb-1">
                <FaTable className="me-2 text-muted" />
                <strong>Table:</strong> {order.tableName}
              </p>
              <p className="mb-1">
                <strong>Customer:</strong> {order.customerInfo?.name || 'Walk-in'}
              </p>
              <p className="mb-1">
                <strong>Items:</strong> {order.items?.length || 0}
              </p>
              <p className="mb-0">
                <strong>Total:</strong> {formatPrice(order.totalAmount)}
              </p>
            </div>
          </Col>
          <Col md={6}>
            <div className="order-actions">
              <div className="d-grid gap-2">
                <Button
                  size="sm"
                  color="outline-info"
                  onClick={() => handleViewOrder(order)}
                >
                  <FaEye className="me-2" />
                  View Details
                </Button>
                
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="d-flex gap-2">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        color="success"
                        onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                      >
                        Confirm
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        color="primary"
                        onClick={() => handleStatusUpdate(order._id, 'preparing')}
                      >
                        Preparing
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        color="success"
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                      >
                        Delivered
                      </Button>
                    )}
                  </div>
                )}

                {order.paymentStatus === 'unpaid' && (
                  <Button
                    size="sm"
                    color="warning"
                    onClick={() => handlePaymentStatusUpdate(order._id, 'paid')}
                  >
                    Mark Paid
                  </Button>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  );

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

      {/* Status Tabs */}
      <Nav tabs className="mb-4">
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
            className={activeTab === 'pending' ? 'active' : ''}
            onClick={() => setActiveTab('pending')}
            style={{ cursor: 'pointer' }}
          >
            Pending ({getOrdersByStatus('pending').length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'preparing' ? 'active' : ''}
            onClick={() => setActiveTab('preparing')}
            style={{ cursor: 'pointer' }}
          >
            Preparing ({getOrdersByStatus('preparing').length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'ready' ? 'active' : ''}
            onClick={() => setActiveTab('ready')}
            style={{ cursor: 'pointer' }}
          >
            Ready ({getOrdersByStatus('ready').length})
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'delivered' ? 'active' : ''}
            onClick={() => setActiveTab('delivered')}
            style={{ cursor: 'pointer' }}
          >
            Delivered ({getOrdersByStatus('delivered').length})
          </NavLink>
        </NavItem>
      </Nav>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <Alert color="info" className="text-center" fade={false}>
            <h5>No Orders Found</h5>
            <p>No orders match your current search criteria.</p>
          </Alert>
        ) : (
          filteredOrders.map(order => (
            <OrderCard key={order._id} order={order} />
          ))
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
