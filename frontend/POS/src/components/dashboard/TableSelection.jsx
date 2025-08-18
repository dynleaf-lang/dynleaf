import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  CardBody, 
  Button, 
  Badge, 
  Input, 
  InputGroup,
  Modal,
  ModalHeader,
  ModalBody, 
  ModalFooter,
  Spinner,
  Alert,
  ButtonGroup,
  Container
} from 'reactstrap';
import { 
  FaTable, 
  FaSearch, 
  FaFilter, 
  FaUsers, 
  FaClock, 
  FaCheckCircle,
  FaExclamationTriangle, 
  FaSync,
  FaPlus,
  FaPhone,
  FaEye,
  FaPrint,
  FaUtensils,
  FaSnowflake,
  FaFan,
  FaMapMarkerAlt,
  FaCalendarPlus,
  FaHandPaper,
  FaCog,
  FaTh,
  FaList
} from 'react-icons/fa';
import { usePOS } from '../../context/POSContext';
import { useOrder } from '../../context/OrderContext';
import { useCart } from '../../context/CartContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './TableSelection.css';
import { generateHTMLReceipt, printHTMLReceipt } from '../../utils/thermalPrinter';

const TableSelection = () => {
  const { 
    tables, 
    floors,
    loading, 
    error, 
    selectedTable, 
    selectTable, 
    clearSelectedTable,
    updateTableStatus,
    refreshData 
  } = usePOS();
  
  const { getOrdersByTable } = useOrder();
  const { cartItems, customerInfo, replaceCart } = useCart();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTableForDetails, setSelectedTableForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState('floor'); // 'floor' or 'list'
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showContactlessModal, setShowContactlessModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetTableId, setMoveTargetTableId] = useState('');
  const [quickFilter, setQuickFilter] = useState('none'); // none | running | printed | kot

  // Helper function to get floor name by ObjectId
  const getFloorName = (floorId) => {
    if (!floorId || !floors.length) return 'Unassigned Floor';
    const floor = floors.find(f => f._id === floorId);
    return floor ? floor.name : 'Unassigned Floor';
  };

  // Helpers for quick filters
  const tableHasPrinted = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId) || [];
      return orders.some(o => o?.printed === true || o?.kotPrinted === true || o?.billPrinted === true);
    } catch (_) {
      return false;
    }
  };

  const tableHasActiveKOT = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId) || [];
      return orders.some(o => ['pending','confirmed','preparing','ready'].includes(o?.status));
    } catch (_) {
      return false;
    }
  };

  // Filter tables based on search, status, floor, and quick filters
  const filteredTables = tables.filter(table => {
    const tableName = table.TableName || table.name || '';
    const floorName = getFloorName(table.location?.floor);
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = tableName.toLowerCase().includes(searchLower) ||
                         floorName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    
    // For floor filtering, use actual floor ObjectId
    const matchesFloor = selectedFloor === 'all' || table.location?.floor === selectedFloor;

    // Quick filter logic
    let matchesQuick = true;
    if (quickFilter === 'running') {
      matchesQuick = table.status === 'occupied' || tableHasActiveKOT(table._id);
    } else if (quickFilter === 'printed') {
      matchesQuick = tableHasPrinted(table._id);
    } else if (quickFilter === 'kot') {
      matchesQuick = tableHasActiveKOT(table._id);
    }
    
    return matchesSearch && matchesStatus && matchesFloor && matchesQuick;
  });

  // Group tables by actual floor (using ObjectId reference)
  const groupedTables = {};
  filteredTables.forEach(table => {
    const floorId = table.location?.floor;
    const floorName = getFloorName(floorId);
    
    if (!groupedTables[floorName]) {
      groupedTables[floorName] = [];
    }
    groupedTables[floorName].push(table);
  });

  // Table status counts for legend
  const statusCounts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    blocked: tables.filter(t => t.status === 'blocked').length
  };

  // Print helper: builds a minimal orderData and prints via browser
  const handlePrintForTable = (table, activeOrderCandidate = null) => {
    try {
      const tableOrders = getTableOrders(table._id) || [];
      // Prefer active order else pick most recent by createdAt
      let order = activeOrderCandidate;
      if (!order) {
        order = [...tableOrders].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];
      }

      if (!order) {
        toast.error('No orders found for this table to print.');
        return;
      }

      const safeItems = Array.isArray(order.items) ? order.items : [];
      const subtotal = safeItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
      const orderData = {
        order: {
          orderNumber: order.orderNumber || order._id || 'N/A',
          createdAt: order.createdAt || new Date().toISOString(),
          items: safeItems.map(it => ({
            name: it.name || it.itemName || 'Item',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
            customizations: it.customizations || []
          })),
          subtotal,
          tax: Number(order.tax) || 0,
          discount: Number(order.discount) || 0,
          totalAmount: Number(order.totalAmount) || subtotal
        },
        paymentDetails: {
          method: (order.paymentMethod || order.paymentMode || 'cash').toString(),
          amountReceived: Number(order.amountReceived) || Number(order.totalAmount) || subtotal,
          change: Number(order.change) || 0,
          cardNumber: order.cardNumber || '',
          cardHolder: order.cardHolder || '',
          upiId: order.upiId || '',
          transactionId: order.transactionId || ''
        },
        customerInfo: order.customerInfo || {
          name: order.customerName || 'Walk-in Customer',
          phone: order.customerPhone || '',
          orderType: order.orderType || 'dine-in'
        },
        tableInfo: {
          name: table.TableName || table.name || table.tableNumber || 'Table',
          _id: table._id
        }
      };

      const restaurantInfo = {
        name: (order.restaurantName || 'Restaurant'),
        address: order.branchAddress || 'Address',
        phone: order.branchPhone || 'Phone',
        email: '',
        gst: order.gstNumber || ''
      };

      const html = generateHTMLReceipt(orderData, restaurantInfo, { duplicateReceipt: false });
      const result = printHTMLReceipt(html);
      if (result?.success) {
        toast.success('Printing started');
      } else {
        toast.error(result?.error || 'Failed to print');
      }
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Print failed');
    }
  };

  const handleTableSelect = (table) => {
    console.log('Table selected:', table.TableName || table.name, table);
    try {
      // Persist current selected table's cart before switching
      if (selectedTable?._id) {
        const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
        carts[selectedTable._id] = {
          items: cartItems,
          customerInfo
        };
        localStorage.setItem('pos_table_carts', JSON.stringify(carts));
      }

      // Switch selection
      console.log('Calling selectTable function...');
      selectTable(table);

      // Load the new table's persisted cart if present
      const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
      const saved = carts[table._id];
      if (saved && Array.isArray(saved.items)) {
        replaceCart(saved.items, saved.customerInfo || {});
      } else {
        // No saved cart -> start clean for this table (do not affect global if same table)
        replaceCart([], { orderType: 'dine-in' });
      }

      toast.success(`Table ${table.TableName || table.name} selected`);
    } catch (e) {
      console.error('Error switching tables:', e);
      selectTable(table);
      toast.success(`Table ${table.TableName || table.name} selected`);
    }
  };

  const handleTableDetails = (table) => {
    setSelectedTableForDetails(table);
    setShowDetailsModal(true);
  };

  const handleStatusChange = async (tableId, newStatus) => {
    try {
      await updateTableStatus(tableId, newStatus);
      toast.success('Table status updated successfully');
    } catch (error) {
      toast.error('Failed to update table status');
    }
  };

  const handleBlockSelectedTable = async () => {
    if (!selectedTable?._id) {
      return toast.error('Please select a table to block.');
    }
    if (!window.confirm(`Block table ${selectedTable.TableName || selectedTable.name}?`)) return;
    await handleStatusChange(selectedTable._id, 'blocked');
  };

  const handleHoldSelectedTable = async () => {
    if (!selectedTable?._id) {
      return toast.error('Please select a table to hold.');
    }
    // Using 'reserved' as Hold semantics
    await handleStatusChange(selectedTable._id, 'reserved');
  };

  const openMoveModal = () => {
    if (!selectedTable?._id) {
      return toast.error('Select a source table first to move items from.');
    }
    setMoveTargetTableId('');
    setShowMoveModal(true);
  };

  const performMoveCart = () => {
    try {
      if (!selectedTable?._id) return toast.error('No source table selected.');
      if (!moveTargetTableId) return toast.error('Select a destination table.');
      if (moveTargetTableId === selectedTable._id) return toast.error('Source and destination cannot be the same.');

      const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
      const sourceSaved = carts[selectedTable._id] || { items: cartItems, customerInfo };
      const destSaved = carts[moveTargetTableId] || { items: [], customerInfo: {} };

      // Move by concatenating; adjust to business rule as needed
      carts[moveTargetTableId] = {
        items: [...(destSaved.items || []), ...(sourceSaved.items || [])],
        customerInfo: { ...(destSaved.customerInfo || {}), ...(sourceSaved.customerInfo || {}) }
      };
      carts[selectedTable._id] = { items: [], customerInfo: { orderType: 'dine-in' } };

      localStorage.setItem('pos_table_carts', JSON.stringify(carts));

      // If currently on source, clear current cart in UI
      replaceCart([], { orderType: 'dine-in' });

      toast.success('Items moved successfully');
      setShowMoveModal(false);
    } catch (e) {
      console.error('Move cart error', e);
      toast.error('Failed to move items');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#E8F5E8'; // Light green
      case 'occupied':
        return '#FFE8E8'; // Light red
      case 'reserved':
        return '#FFF4E6'; // Light orange
      case 'cleaning':
        return '#E6F3FF'; // Light blue
      case 'blocked':
        return '#F0F0F0'; // Light gray
      default:
        return '#FFFFFF';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'available':
        return '#4CAF50'; // Green
      case 'occupied':
        return '#F44336'; // Red
      case 'reserved':
        return '#FF9800'; // Orange
      case 'cleaning':
        return '#2196F3'; // Blue
      case 'blocked':
        return '#9E9E9E'; // Gray
      default:
        return '#E0E0E0';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <FaCheckCircle />;
      case 'occupied':
        return <FaUsers />;
      case 'reserved':
        return <FaClock />;
      case 'cleaning':
        return <FaExclamationTriangle />;
      default:
        return <FaTable />;
    }
  };

  const getTableOrders = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId);
      return Array.isArray(orders) ? orders : [];
    } catch (_) {
      return [];
    }
  };

  const FloorPlanTable = ({ table, index }) => {
    const tableOrders = getTableOrders(table._id);
    const activeStatuses = ['pending','confirmed','preparing','ready','accepted','placed','in_progress'];
    const activeOrder = (tableOrders || []).find(order => {
      const s = (order?.status || '').toLowerCase();
      return activeStatuses.includes(s);
    });
    const shouldShowPrint = (table.status && table.status.toLowerCase() !== 'available') || !!activeOrder;
 
    

    return (
      <div 
        className={`floor-table ${selectedTable?._id === table._id ? 'selected' : ''}`}
        style={{
          backgroundColor: getStatusColor(table.status),
          borderColor: getStatusBorderColor(table.status),
          cursor: 'pointer',
          position: 'relative',
          width: '110px',
          height: '110px',
          border: '1px solid #dfdfdf',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '5px',
          transition: 'all 0.3s ease',
          fontSize: '12px',
          fontWeight: '600'
        }}
        onClick={() => handleTableSelect(table)}
        onDoubleClick={() => handleTableDetails(table)}
      >
        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
          {table.TableName}
        </div>
        
        
        
        {/* Print icon for orders */}
        {shouldShowPrint && (
          <button
            type="button"
            aria-label="Print order"
            title={activeOrder ? 'Print order' : 'Select table to print from Order Management'}
            onClick={(e) => {
              e.stopPropagation();
              try {
                // Select table for context and trigger print
                handleTableSelect(table);
                handlePrintForTable(table, activeOrder);
              } catch (err) {
                console.error('Print action error', err);
                toast.error('Unable to start print action');
              }
            }}
            style={{ 
              position: 'absolute', 
              top: '2px', 
              left: '2px',
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer'
            }}
          >
            <FaPrint size={15} color="#555" />
          </button>
        )}
        
        {/* Eye icon for viewing */}
        {table.status === 'occupied' && (
          <button
            type="button"
            aria-label="View table details"
            title="View table details"
            onClick={(e) => {
              e.stopPropagation();
              try {
                handleTableDetails(table);
              } catch (err) {
                console.error('Open details error', err);
                toast.error('Unable to open table details');
              }
            }}
            style={{ 
              position: 'absolute', 
              top: '2px', 
              right: '2px',
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer'
            }}
          >
            <FaEye size={15} color="#555" />
          </button>
        )}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">
          Loading tables...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger" className="text-center">
        <h5>Error Loading Tables</h5>
        <p>{error}</p>
        <Button color="primary" onClick={refreshData}>
          <FaSync className="me-2" />
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="table-selection">
      {/* Professional Header with Action Buttons */}
      <div className="table-selection-header">
        <div className="header-top">
          <div className="header-left">
            <h2 className="page-title">
              <FaTable className="me-2" />
              Table View
            </h2>
          </div>
          <div className="header-right">
            <ButtonGroup size="sm">
              <Button 
                color="outline-primary"
                onClick={refreshData}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : <FaSync />}
              </Button>
              <Button color="danger" onClick={() => setShowReservationModal(true)}>
                <FaCalendarPlus className="me-1" />
                Table Reservation
              </Button>
              <Button color="warning" onClick={() => setShowContactlessModal(true)}>
                <FaPhone className="me-1" />
                Contactless
              </Button>
            </ButtonGroup>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="action-bar">
          <div className="action-buttons">
            <Button size="sm" color="light" className="action-btn" onClick={openMoveModal}>
              <FaHandPaper className="me-1" />
              Move KOT/ Items
            </Button>
            <Button size="sm" color="light" className="action-btn" onClick={handleBlockSelectedTable}>
              <FaHandPaper className="me-1" />
              Block Table
            </Button>
            <Button size="sm" color="info" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'running' ? 'none' : 'running')}>
              <FaTable className="me-1" />
              Running Table
            </Button>
            <Button size="sm" color="warning" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'printed' ? 'none' : 'printed')}>
              <FaPrint className="me-1" />
              Printed Table
            </Button>
            <Button size="sm" color="success" className="action-btn" onClick={handleHoldSelectedTable}>
              <FaCheckCircle className="me-1" />
              Hold Table
            </Button>
            <Button size="sm" color="primary" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'kot' ? 'none' : 'kot')}>
              <FaUtensils className="me-1" />
              Running KOT Table
            </Button>
          </div>
          
          <div className="view-controls">
            {/* Floor Filter */}
            <div className="me-3">
              <span className="me-2">Floor:</span>
              <Input
                type="select"
                size="sm"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                style={{ width: '150px', display: 'inline-block' }}
              >
                <option value="all">All Floors</option>
                {floors.map(floor => (
                  <option key={floor._id} value={floor._id}>
                    {floor.name} (Level {floor.level})
                  </option>
                ))}
              </Input>
            </div>
            
            <span className="me-2">Floor Plan</span>
            <ButtonGroup size="sm">
              <Button 
                color={viewMode === 'floor' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('floor')}
              >
                <FaTh />
              </Button>
              <Button 
                color={viewMode === 'list' ? 'primary' : 'outline-primary'}
                onClick={() => setViewMode('list')}
              >
                <FaList />
              </Button>
            </ButtonGroup>
            <span className="ms-3 me-2">Default Layout</span>
            <Button size="sm" color="outline-secondary">
              <FaCog />
            </Button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="status-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#E8F5E8', border: '2px solid #4CAF50' }}></div>
          <span>Available ({statusCounts.available})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFE8E8', border: '2px solid #F44336' }}></div>
          <span>Occupied ({statusCounts.occupied})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFF4E6', border: '2px solid #FF9800' }}></div>
          <span>Reserved ({statusCounts.reserved})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#E6F3FF', border: '2px solid #2196F3' }}></div>
          <span>Cleaning ({statusCounts.cleaning})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F0F0F0', border: '2px solid #9E9E9E' }}></div>
          <span>Blocked ({statusCounts.blocked || 0})</span>
        </div>
      </div>

      {/* Floor Plan View */}
      {viewMode === 'floor' ? (
        <div className="floor-plan-container">
          {Object.entries(groupedTables).map(([floorName, floorTables]) => (
            floorTables.length > 0 && (
              <div key={floorName} className="floor-section">
                <div className="section-header">
                  <h4 className="section-title">
                    <FaMapMarkerAlt className="me-2" />
                    {floorName}
                    <span className="ms-2 text-muted">({floorTables.length} tables)</span>
                  </h4>
                </div>
                <div className="tables-grid">
                  {floorTables.map((table, index) => (
                    <FloorPlanTable key={table._id} table={table} index={index} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        /* List View */
        <Row>
          {filteredTables.length === 0 ? (
            <Col>
              <Alert color="warning" className="text-center" fade={false}>
                <h5>No Tables Found</h5>
                <p>No tables match your current search criteria.</p>
              </Alert>
            </Col>
          ) : (
            filteredTables.map(table => (
              <Col key={table._id} xs={6} sm={4} md={3} lg={2} className="mb-4">
                <Card 
                  className={`table-card h-100 ${selectedTable?._id === table._id ? 'selected' : ''}`}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                  onClick={() => handleTableSelect(table)}
                >
                  <CardBody className="text-center p-3">
                    <div className="table-icon mb-2">
                      <FaTable size={32} className="text-primary" />
                    </div>
                    <h5 className="table-name mb-2">{table.TableName}</h5>
                    <Badge 
                      style={{ 
                        backgroundColor: getStatusBorderColor(table.status),
                        color: 'white'
                      }}
                      className="mb-2"
                    >
                      {getStatusIcon(table.status)}
                      <span className="ms-1">{table.status.toUpperCase()}</span>
                    </Badge>
                    <div className="table-info">
                      <small className="text-muted d-block">
                        <FaUsers className="me-1" />
                        Capacity: {table.capacity}
                      </small>
                      {table.category && (
                        <small className="text-muted d-block">
                          <FaMapMarkerAlt className="me-1" />
                          {table.category}
                        </small>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}

      {/* Table Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        toggle={() => setShowDetailsModal(false)}
        size="lg"
      >
        <ModalHeader toggle={() => setShowDetailsModal(false)}>
          Table Details - {selectedTableForDetails?.name}
        </ModalHeader>
        <ModalBody>
          {selectedTableForDetails && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Table Information</h6>
                  <p><strong>Name:</strong> {selectedTableForDetails.name}</p>
                  <p><strong>Capacity:</strong> {selectedTableForDetails.capacity} people</p>
                  <p><strong>Category:</strong> {selectedTableForDetails.category || 'Non A/C'}</p>
                  <p>
                    <strong>Status:</strong> 
                    <Badge 
                      style={{ 
                        backgroundColor: getStatusBorderColor(selectedTableForDetails.status),
                        color: 'white'
                      }}
                      className="ms-2"
                    >
                      {selectedTableForDetails.status.toUpperCase()}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Recent Orders</h6>
                  {getTableOrders(selectedTableForDetails._id).slice(0, 3).map(order => (
                    <div key={order._id} className="border-bottom pb-2 mb-2">
                      <div className="d-flex justify-content-between">
                        <span>Order #{order.orderNumber}</span>
                        <Badge color={order.status === 'delivered' ? 'success' : 'warning'}>
                          {order.status}
                        </Badge>
                      </div>
                      <small className="text-muted">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                      </small>
                    </div>
                  ))}
                </Col>
              </Row>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selectedTableForDetails && (
            <Button 
              color="primary" 
              onClick={() => {
                handleTableSelect(selectedTableForDetails);
                setShowDetailsModal(false);
              }}
            >
              Select This Table
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Move KOT/Items Modal */}
      <Modal
        isOpen={showMoveModal}
        toggle={() => setShowMoveModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowMoveModal(false)}>
          <FaHandPaper className="me-2" />
          Move KOT/Items
        </ModalHeader>
        <ModalBody>
          <p className="mb-3">
            Select a destination table to move current table's items/cart. This moves unsent items stored locally. Printed/placed orders are not altered here.
          </p>
          <div className="mb-2"><strong>From:</strong> {selectedTable?.TableName || selectedTable?.name || 'Not selected'}</div>
          <div className="mb-2"><strong>To:</strong></div>
          <Input type="select" value={moveTargetTableId} onChange={(e) => setMoveTargetTableId(e.target.value)}>
            <option value="">-- Select Destination Table --</option>
            {tables
              .filter(t => t._id !== selectedTable?._id)
              .map(t => (
                <option key={t._id} value={t._id}>
                  {t.TableName || t.name} [{t.status}]
                </option>
              ))}
          </Input>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowMoveModal(false)}>Cancel</Button>
          <Button color="primary" onClick={performMoveCart}>Move Items</Button>
        </ModalFooter>
      </Modal>
      
      {/* Table Reservation Modal */}
      <Modal 
        isOpen={showReservationModal} 
        toggle={() => setShowReservationModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowReservationModal(false)}>
          <FaCalendarPlus className="me-2" />
          Table Reservation
        </ModalHeader>
        <ModalBody>
          <p>Table reservation functionality will be implemented here.</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowReservationModal(false)}>
            Close
          </Button>
          <Button color="primary">
            Create Reservation
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Contactless Modal */}
      <Modal 
        isOpen={showContactlessModal} 
        toggle={() => setShowContactlessModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowContactlessModal(false)}>
          <FaPhone className="me-2" />
          Contactless Options
        </ModalHeader>
        <ModalBody>
          <p>Contactless ordering and payment options will be implemented here.</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowContactlessModal(false)}>
            Close
          </Button>
          <Button color="primary">
            Generate QR Code
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default TableSelection;
