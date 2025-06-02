import React, { useState, useEffect, useContext } from 'react';
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
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Spinner,
  Alert,
  UncontrolledTooltip
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const TableOrderAssignment = () => {
  // Context
  const { 
    tables, 
    loading: tableLoading, 
    error: tableError, 
    fetchTables, 
    assignTableToOrder, 
    releaseTable, 
    getTablesWithOrders 
  } = useContext(TableContext);
  const { user } = useContext(AuthContext);

  // State
  const [availableTables, setAvailableTables] = useState([]);
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modal, setModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [tableToRelease, setTableToRelease] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  
  // Load tables and pending orders when component mounts
  useEffect(() => {
    loadTables();
  }, []);
  
  // Effect to filter available and occupied tables whenever tables array changes
  useEffect(() => {
    if (tables && tables.length > 0) {
      setAvailableTables(tables.filter(table => 
        table.status === 'available' || table.status === 'reserved'
      ));
      
      setOccupiedTables(tables.filter(table => 
        (table.status === 'occupied' || table.isOccupied) && table.currentOrder
      ));
    }
  }, [tables]);
  
  // Load tables data with order information
  const loadTables = async () => {
    try {
      // First fetch all tables
      await fetchTables();
      
      // Then fetch tables with orders to ensure we have order details
      const result = await getTablesWithOrders();
      
      if (!result.success) {
        console.error('Error fetching tables with orders:', result.message);
      }
      
      // After tables are loaded, load pending orders
      loadPendingOrders();
    } catch (err) {
      console.error('Error in loadTables:', err);
    }
  };

  // Load pending orders from API
  const loadPendingOrders = async () => {
    setOrderLoading(true);
    setOrderError(null);
    
    try {
      // Get the branch ID from the authenticated user
      const branchId = user?.branchId;
      if (!branchId) {
        throw new Error('No branch ID available');
      }
      
      const response = await api.get(`/orders?status=pending,processing,ready&branchId=${branchId}`);
      
      if (response.data && response.data.data) {
        setOrders(response.data.data);
      } else if (Array.isArray(response.data)) {
        // Handle case where the API returns the array directly
        setOrders(response.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrderError(err.response?.data?.message || err.message || 'Failed to fetch pending orders');
    } finally {
      setOrderLoading(false);
    }
  };
  
  // Modal toggle functions
  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      setSelectedTable(null);
      setSelectedOrder(null);
      // Refresh orders list when opening modal
      loadPendingOrders();
    }
  };
  
  const toggleReleaseModal = (table = null) => {
    setShowReleaseModal(!showReleaseModal);
    setTableToRelease(table);
  };
  
  // Handler functions
  const handleTableSelect = (tableId) => {
    const table = availableTables.find(t => t._id === tableId);
    setSelectedTable(table);
  };
  
  const handleOrderSelect = (orderId) => {
    const order = orders.find(o => o._id === orderId);
    setSelectedOrder(order);
  };
  
  const handleAssignTable = async () => {
    if (!selectedTable || !selectedOrder) {
      setError('Please select both a table and an order');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await assignTableToOrder(selectedTable._id, selectedOrder._id);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to assign table to order');
      }
      
      setSuccess(`Table ${selectedTable.TableName} successfully assigned to order #${selectedOrder.orderNumber}`);
      
      // Refresh data
      await loadTables();
      
      // Close modal after short delay
      setTimeout(() => {
        toggleModal();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Error assigning table to order:', err);
      setError(err.message || 'Failed to assign table to order');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReleaseTable = async () => {
    if (!tableToRelease) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await releaseTable(tableToRelease._id);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to release table');
      }
      
      setSuccess(`Table ${tableToRelease.TableName} successfully released`);
      
      // Refresh data
      await loadTables();
      
      // Close modal after short delay
      setTimeout(() => {
        toggleReleaseModal();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Error releasing table:', err);
      setError(err.message || 'Failed to release table');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper functions for rendering status badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'occupied':
        return <Badge color="danger">Occupied</Badge>;
      case 'reserved':
        return <Badge color="warning">Reserved</Badge>;
      case 'available':
        return <Badge color="success">Available</Badge>;
      case 'maintenance':
        return <Badge color="secondary">Maintenance</Badge>;
      default:
        return <Badge color="info">{status}</Badge>;
    }
  };
  
  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge color="primary">Pending</Badge>;
      case 'processing':
        return <Badge color="info">Processing</Badge>;
      case 'ready':
        return <Badge color="success">Ready</Badge>;
      case 'delivered':
        return <Badge color="secondary">Delivered</Badge>;
      case 'completed':
        return <Badge color="dark">Completed</Badge>;
      default:
        return <Badge color="light">{status}</Badge>;
    }
  };

  // Filter functions
  const getFilteredOccupiedTables = () => {
    return occupiedTables.filter(table => {
      let matchesSearch = true;
      let matchesFloor = true;
      let matchesZone = true;
      
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        matchesSearch = table.TableName.toLowerCase().includes(searchLower) || 
                        (table.tableId && table.tableId.toLowerCase().includes(searchLower)) ||
                        (table.currentOrder && typeof table.currentOrder === 'object' && 
                         table.currentOrder.orderNumber && table.currentOrder.orderNumber.toString().includes(searchQuery));
      }
      
      if (selectedFloor && table.location) {
        matchesFloor = table.location.floor === selectedFloor;
      }
      
      if (selectedZone && table.location) {
        matchesZone = table.location.zone === selectedZone;
      }
      
      return matchesSearch && matchesFloor && matchesZone;
    });
  };

  // Get unique floors and zones for filtering
  const getUniqueFloors = () => {
    // Add null check to prevent "Cannot read properties of undefined (reading 'map')" error
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return [];
    }
    
    const floors = tables
      .filter(table => table.location && table.location.floor)
      .map(table => {
        return {
          id: table.location.floor,
          name: typeof table.location.floor === 'object' ? table.location.floor.name : table.location.floor
        };
      });
      
    return [...new Map(floors.map(item => [item.id, item])).values()];
  };
  
  const getUniqueZones = () => {
    // Add null check to prevent "Cannot read properties of undefined (reading 'map')" error
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return [];
    }
    
    const zones = tables
      .filter(table => table.location && table.location.zone)
      .map(table => table.location.zone);
      
    return [...new Set(zones)];
  };
  
  // Filtered tables
  const filteredOccupiedTables = getFilteredOccupiedTables();

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFloor('');
    setSelectedZone('');
  };
  
  // Optional refresh handler
  const handleRefresh = async () => {
    setSuccess(null);
    setError(null);
    await loadTables();
  };

  return (
    <>
      <Card className="shadow mb-4">
        <CardHeader className="border-0 d-flex justify-content-between align-items-center">
          <div>
            <h3 className="mb-0 font-weight-bold">
              <i className="fas fa-tasks mr-2 text-primary"></i> 
              Table Order Assignment
            </h3>
            <p className="text-muted mb-0">
              <small>Assign orders to tables or release occupied tables</small>
            </p>
          </div>
          <div>
            <Button 
              color="info" 
              size="sm"
              className="mr-2"
              onClick={handleRefresh}
              disabled={tableLoading}
            >
              <i className={`fas fa-sync-alt ${tableLoading ? 'fa-spin' : ''} mr-1`}></i> 
              Refresh
            </Button>
            <Button 
              color="primary" 
              onClick={toggleModal}
              disabled={!availableTables.length || orderLoading || tableLoading}
            >
              <i className="fas fa-link mr-2"></i> 
              Assign Order to Table
              {(orderLoading || tableLoading) && <Spinner size="sm" className="ml-2" />}
            </Button>
          </div>
        </CardHeader>
        
        <CardBody>
          <h4 className="mb-3">
            <i className="fas fa-chair mr-2"></i>
            Tables with Active Orders
          </h4>
          
          {/* Filters */}
          <Row className="mb-4">
            <Col md={4}>
              <InputGroup size="sm">
                <InputGroupAddon addonType="prepend">
                  <InputGroupText>
                    <i className="fas fa-search"></i>
                  </InputGroupText>
                </InputGroupAddon>
                <Input
                  placeholder="Search tables or order #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Input
                type="select"
                size="sm"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
              >
                <option value="">All Floors</option>
                {getUniqueFloors().map(floor => (
                  <option key={floor.id} value={floor.id}>{floor.name || floor.id}</option>
                ))}
              </Input>
            </Col>
            <Col md={3}>
              <Input
                type="select"
                size="sm"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="">All Zones</option>
                {getUniqueZones().map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </Input>
            </Col>
            <Col md={2}>
              <Button
                color="info"
                size="sm"
                outline
                block
                onClick={resetFilters}
              >
                <i className="fas fa-sync-alt mr-1"></i> Reset
              </Button>
            </Col>
          </Row>
          
          {tableLoading ? (
            <div className="text-center my-5 py-5">
              <Spinner color="primary" />
              <p className="mt-3 text-muted">Loading tables...</p>
            </div>
          ) : tableError ? (
            <Alert color="danger">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {tableError}
            </Alert>
          ) : filteredOccupiedTables.length === 0 ? (
            <div className="text-center my-5 py-5 bg-light rounded">
              <i className="fas fa-coffee text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No tables are currently assigned to orders</h5>
              <p className="text-muted">
                {occupiedTables.length > 0 
                  ? "Try clearing your filters to see all assigned tables"
                  : "Assign a table to an order to get started"}
              </p>
              {occupiedTables.length > 0 && (
                <Button
                  color="primary"
                  size="sm"
                  outline
                  onClick={resetFilters}
                >
                  <i className="fas fa-sync-alt mr-1"></i> Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover responsive className="align-items-center">
                <thead>
                  <tr>
                    <th>Table ID</th>
                    <th>Table Name</th>
                    <th>Capacity</th>
                    <th>Location</th>
                    <th>Order Number</th>
                    <th>Order Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOccupiedTables.map((table) => (
                    <tr key={table._id}>
                      <td>
                        <span className="font-weight-bold">{table.tableId}</span>
                      </td>
                      <td>
                        {table.TableName}
                        {table.isVIP && (
                          <Badge color="info" pill className="ml-2">VIP</Badge>
                        )}
                      </td>
                      <td>
                        <Badge color="light" className="mr-1">{table.capacity}</Badge>
                        <small className="text-muted">persons</small>
                      </td>
                      <td>
                        {table.location && (
                          <>
                            <div>
                              <small className="text-muted mr-1">Zone:</small>
                              <Badge color="secondary" pill>{table.location.zone || 'Main'}</Badge>
                            </div>
                            {table.location.floor && (
                              <div className="mt-1">
                                <small className="text-muted mr-1">Floor:</small>
                                <Badge color="secondary" pill>{table.location.floor}</Badge>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {table.currentOrder ? (
                          <span className="font-weight-bold">
                            {typeof table.currentOrder === 'string' 
                              ? "Order #" + table.currentOrder.substring(0, 8)
                              : `#${table.currentOrder.orderNumber || 'Unknown'}`}
                          </span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(table.status)}
                      </td>
                      <td>
                        <Button 
                          color="danger" 
                          size="sm"
                          onClick={() => toggleReleaseModal(table)}
                          id={`release-btn-${table._id}`}
                        >
                          <i className="fas fa-unlink mr-1"></i> Release
                        </Button>
                        <UncontrolledTooltip target={`release-btn-${table._id}`}>
                          Mark table as available
                        </UncontrolledTooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="text-muted text-right">
                <small>Showing {filteredOccupiedTables.length} of {occupiedTables.length} occupied tables</small>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Assign Order Modal */}
      <Modal isOpen={modal} toggle={toggleModal} className="modal-dialog-centered">
        <ModalHeader toggle={toggleModal} className="bg-primary text-white">
          <i className="fas fa-link mr-2"></i>
          Assign Order to Table
        </ModalHeader>
        <ModalBody>
          {orderLoading ? (
            <div className="text-center py-4">
              <Spinner color="primary" />
              <p className="mt-3 mb-0">Loading available orders...</p>
            </div>
          ) : orderError ? (
            <Alert color="danger">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {orderError}
            </Alert>
          ) : orders.length === 0 ? (
            <Alert color="info">
              <i className="fas fa-info-circle mr-2"></i>
              No pending orders available to assign
            </Alert>
          ) : (
            <>
              <FormGroup>
                <Label for="tableSelect" className="font-weight-bold">
                  <i className="fas fa-chair mr-2 text-primary"></i>
                  Select Table
                </Label>
                <Input
                  type="select"
                  name="tableSelect"
                  id="tableSelect"
                  className="form-control-alternative"
                  value={selectedTable ? selectedTable._id : ''}
                  onChange={(e) => handleTableSelect(e.target.value)}
                >
                  <option value="">-- Select a Table --</option>
                  {availableTables.map(table => (
                    <option key={table._id} value={table._id}>
                      {table.tableId} - {table.TableName} ({table.capacity} persons)
                      {table.isVIP ? ' - VIP' : ''}
                      {table.location?.zone ? ` - ${table.location.zone}` : ''}
                    </option>
                  ))}
                </Input>
                <small className="form-text text-muted">
                  Only showing available and reserved tables
                </small>
              </FormGroup>
              
              <FormGroup>
                <Label for="orderSelect" className="font-weight-bold">
                  <i className="fas fa-receipt mr-2 text-primary"></i>
                  Select Order
                </Label>
                <Input
                  type="select"
                  name="orderSelect"
                  id="orderSelect"
                  className="form-control-alternative"
                  value={selectedOrder ? selectedOrder._id : ''}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                >
                  <option value="">-- Select an Order --</option>
                  {orders.map(order => (
                    <option key={order._id} value={order._id}>
                      #{order.orderNumber} - ${order.total ? order.total.toFixed(2) : '0.00'} ({order.status})
                    </option>
                  ))}
                </Input>
                <small className="form-text text-muted">
                  Only showing pending, processing, and ready orders
                </small>
              </FormGroup>
              
              {error && (
                <Alert color="danger" className="mt-3">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert color="success" className="mt-3">
                  <i className="fas fa-check-circle mr-2"></i>
                  {success}
                </Alert>
              )}
              
              {selectedTable && selectedOrder && (
                <div className="mt-4 p-3 bg-light rounded border">
                  <h5 className="mb-3">Assignment Summary</h5>
                  <Row>
                    <Col sm={6}>
                      <h6>
                        <i className="fas fa-chair mr-2 text-primary"></i>
                        Table
                      </h6>
                      <p className="mb-0"><strong>{selectedTable.TableName}</strong></p>
                      <p className="mb-0">ID: {selectedTable.tableId}</p>
                      <p className="mb-0">Capacity: {selectedTable.capacity} persons</p>
                      {selectedTable.isVIP && (
                        <Badge color="info" className="mt-1">VIP</Badge>
                      )}
                    </Col>
                    <Col sm={6}>
                      <h6>
                        <i className="fas fa-receipt mr-2 text-primary"></i>
                        Order
                      </h6>
                      <p className="mb-0"><strong>#{selectedOrder.orderNumber}</strong></p>
                      <p className="mb-0">
                        Total: ${selectedOrder.total ? selectedOrder.total.toFixed(2) : '0.00'}
                      </p>
                      <div className="mt-1">{getOrderStatusBadge(selectedOrder.status)}</div>
                    </Col>
                  </Row>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal} disabled={loading}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onClick={handleAssignTable}
            disabled={!selectedTable || !selectedOrder || loading}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Assigning...
              </>
            ) : (
              <>
                <i className="fas fa-link mr-2"></i>
                Assign Order to Table
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Release Table Modal */}
      <Modal isOpen={showReleaseModal} toggle={() => toggleReleaseModal()} className="modal-dialog-centered">
        <ModalHeader toggle={() => toggleReleaseModal()} className="bg-danger text-white">
          <i className="fas fa-unlink mr-2"></i>
          Release Table
        </ModalHeader>
        <ModalBody>
          {tableToRelease && (
            <div>
              <p className="font-weight-bold mb-4">
                Are you sure you want to release table <span className="text-danger">{tableToRelease.TableName}</span>?
              </p>
              
              <div className="bg-light p-3 rounded mb-4">
                <h6 className="mb-3">Table Information:</h6>
                <p className="mb-2">
                  <strong>Table ID:</strong> {tableToRelease.tableId}
                </p>
                <p className="mb-2">
                  <strong>Current Status:</strong> {getStatusBadge(tableToRelease.status)}
                </p>
                <p className="mb-2">
                  <strong>Current Order:</strong> {
                    tableToRelease.currentOrder ? (
                      typeof tableToRelease.currentOrder === 'string' 
                        ? tableToRelease.currentOrder.substring(0, 8) + '...'
                        : `#${tableToRelease.currentOrder.orderNumber || 'Unknown'}`
                    ) : 'None'
                  }
                </p>
              </div>
              
              <Alert color="warning">
                <i className="fas fa-exclamation-circle mr-2"></i>
                This will mark the table as available and remove its association with the current order.
              </Alert>
              
              {error && (
                <Alert color="danger" className="mt-3">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert color="success" className="mt-3">
                  <i className="fas fa-check-circle mr-2"></i>
                  {success}
                </Alert>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => toggleReleaseModal()} disabled={loading}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleReleaseTable} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" className="mr-2" /> 
                Releasing...
              </>
            ) : (
              <>
                <i className="fas fa-unlink mr-2"></i>
                Release Table
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default TableOrderAssignment;