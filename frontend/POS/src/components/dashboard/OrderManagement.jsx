import React, { useState, useEffect, useRef } from 'react';
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
  FaMapMarkerAlt,
  FaBell
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

  // SLA settings (minutes) with persistence
  const SLA_STORAGE_KEY = 'pos_sla_settings';
  const [slaSettings, setSlaSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SLA_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { warnMinutes: 10, dangerMinutes: 20, enableSound: true };
  });
  const [showSlaModal, setShowSlaModal] = useState(false);

  // periodic tick to update timers
  const [tick, setTick] = useState(0);
  const prevCountsRef = useRef({ total: 0, ready: 0 });

  // Ref to focus search via keyboard shortcut
  const searchInputRef = useRef(null);

  // Global key handler: F -> focus search (avoid when typing or modifiers pressed)
  useEffect(() => {
    const isTypingContext = (target) => {
      if (!target) return false;
      const tag = (target.tagName || '').toUpperCase();
      const editable = target.isContentEditable;
      return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTypingContext(e.target)) return;
      const key = (e.key || '').toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          try { searchInputRef.current.select?.(); } catch {}
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Persist SLA settings
  useEffect(() => {
    try {
      localStorage.setItem(SLA_STORAGE_KEY, JSON.stringify(slaSettings));
    } catch {}
  }, [slaSettings]);

  // Interval tick for timers
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000); // 10s
    return () => clearInterval(id);
  }, []);

  // Simple beep using Web Audio API
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      o.start();
      o.stop(ctx.currentTime + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    } catch {}
  };

  // Sound alerts for new/ready orders
  useEffect(() => {
    const total = orders.length || 0;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    const prev = prevCountsRef.current;
    if (slaSettings.enableSound) {
      if (total > prev.total || readyCount > prev.ready) {
        playBeep();
      }
    }
    prevCountsRef.current = { total, ready: readyCount };
  }, [orders, slaSettings.enableSound]);

  // Helpers for SLA computation
  const getCreatedAt = (o) => {
    return o?.createdAt || o?.orderDate || Date.now();
  };
  const getElapsedMs = (o) => {
    try {
      return Date.now() - new Date(getCreatedAt(o)).getTime();
    } catch {
      return 0;
    }
  };
  const formatDuration = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `${mm}m ${ss.toString().padStart(2, '0')}s`;
  };
  const getSlaClass = (o) => {
    const mins = getElapsedMs(o) / 60000;
    if (mins >= slaSettings.dangerMinutes) return 'sla-danger';
    if (mins >= slaSettings.warnMinutes) return 'sla-warn';
    return 'sla-ok';
  };

  // Helper to display table info with fallbacks
  const getTableLabel = (o) => {
    try {
      const label =
        o?.tableName ||
        o?.tableId?.TableName ||
        o?.tableId?.tableNumber ||
        o?.tableId?.name ||
        o?.tableId?.label ||
        o?.tableId?.tableId ||
        o?.tableId?._id;
      return label ? String(label) : 'N/A';
    } catch (e) {
      return 'N/A';
    }
  };

  // Filter orders based on main view, active tab, search, and filters
  const filteredOrders = React.useMemo(() => {
    let filtered = orders;
 
  

    // Filter by main view (orders vs kot)
    if (mainView === 'kot') {
      // KOT view shows only orders that need kitchen attention
      filtered = filtered.filter(order => ['confirmed', 'preparing'].includes(order.status));

      // Apply KOT sub-tab filter if selected
      if (activeTab !== 'all') {
        if (['confirmed', 'preparing'].includes(activeTab)) {
          filtered = filtered.filter(order => order.status === activeTab);
        }
      }
    }

    // Filter by order type for Order View
    if (mainView === 'orders' && activeTab !== 'all') {
      if (['dine-in', 'delivery', 'takeaway', 'online', 'other'].includes(activeTab)) {
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
      filtered = filtered.filter(order => {
        const tableText = getTableLabel(order).toLowerCase();
        return (
          order.orderNumber?.toLowerCase().includes(searchLower) ||
          order.customerInfo?.name?.toLowerCase().includes(searchLower) ||
          tableText.includes(searchLower)
        );
      });
    }

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, mainView, activeTab, searchTerm, paymentFilter, getOrdersByStatus, tick]);

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
      case 'takeaway':
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
      case 'takeaway':
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
                <h6 className="order-number mb-0">#{order.orderId}</h6>
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
                {format(new Date(order.orderDate || order.createdAt), 'HH:mm')}
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
              <div className={`mt-2 sla-badge ${getSlaClass(order)}`} title="Service time elapsed">
                <FaClock className="me-1" /> {formatDuration(getElapsedMs(order))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="order-card-body">
          <div className="order-details">
            <div className="detail-item">
              <FaTable className="detail-icon" />
              <span className="detail-label">Table:</span>
              <span className="detail-value">{getTableLabel(order)}</span>
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
        <div className="d-flex gap-2">
          <Button color="outline-primary" onClick={fetchOrders}>
            <FaSync className="me-2" />
            Refresh
          </Button>
          <Button color="outline-warning" onClick={() => setShowSlaModal(true)}>
            <FaBell className="me-2" />
            SLA Settings
          </Button>
        </div>
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
              innerRef={searchInputRef}
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
              className={activeTab === 'takeaway' ? 'active' : ''}
              onClick={() => setActiveTab('takeaway')}
              style={{ cursor: 'pointer' }}
            >
              <FaShoppingBag className="me-2" />
              takeaway
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
                  <p><strong>Table:</strong> {getTableLabel(selectedOrder)}</p>
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

      {/* SLA Settings Modal */}
      <Modal isOpen={showSlaModal} toggle={() => setShowSlaModal(false)}>
        <ModalHeader toggle={() => setShowSlaModal(false)}>
          SLA Settings
        </ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <label className="form-label">Warning Threshold (minutes)</label>
            <Input
              type="number"
              min={1}
              value={slaSettings.warnMinutes}
              onChange={(e) => setSlaSettings(s => ({ ...s, warnMinutes: Math.max(1, parseInt(e.target.value || '0', 10)) }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Danger Threshold (minutes)</label>
            <Input
              type="number"
              min={1}
              value={slaSettings.dangerMinutes}
              onChange={(e) => setSlaSettings(s => ({ ...s, dangerMinutes: Math.max(1, parseInt(e.target.value || '0', 10)) }))}
            />
            <small className="text-muted">Danger should be greater than Warning.</small>
          </div>
          <div className="form-check">
            <Input
              id="enableSound"
              type="checkbox"
              className="form-check-input"
              checked={!!slaSettings.enableSound}
              onChange={(e) => setSlaSettings(s => ({ ...s, enableSound: e.target.checked }))}
            />
            <label className="form-check-label ms-2" htmlFor="enableSound">
              Enable sound alert for new and ready orders
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowSlaModal(false)}>Close</Button>
          <Button
            color="primary"
            onClick={() => {
              if (slaSettings.dangerMinutes <= slaSettings.warnMinutes) {
                toast.error('Danger threshold must be greater than Warning');
                return;
              }
              toast.success('SLA settings saved');
              setShowSlaModal(false);
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default OrderManagement;
