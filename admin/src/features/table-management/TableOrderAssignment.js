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
  ModalFooter
} from 'reactstrap';
import { TableContext } from '../../context/TableContext';

// Mock order data as we don't have real order context yet
// In a real implementation, this would come from OrderContext
const mockOrders = [
  { _id: 'ord1', orderNumber: '1001', total: 45.99, status: 'pending' },
  { _id: 'ord2', orderNumber: '1002', total: 78.50, status: 'processing' },
  { _id: 'ord3', orderNumber: '1003', total: 32.75, status: 'pending' },
  { _id: 'ord4', orderNumber: '1004', total: 57.25, status: 'ready' }
];

const TableOrderAssignment = () => {
  const { tables, loading, error, fetchTables, assignTableToOrder, releaseTable, getTablesWithOrders } = useContext(TableContext);
  const [availableTables, setAvailableTables] = useState([]);
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [orders, setOrders] = useState(mockOrders);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modal, setModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [tableToRelease, setTableToRelease] = useState(null);
  
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
        table.status === 'occupied' && table.currentOrder
      ));
    }
  }, [tables]);
  
  const loadTables = async () => {
    await fetchTables();
    await getTablesWithOrders();
    
    // In a real implementation, we would also fetch pending orders
    // from the OrderContext
    // await fetchPendingOrders();
  };
  
  const toggleModal = () => {
    setModal(!modal);
    if (!modal) {
      setSelectedTable(null);
      setSelectedOrder(null);
    }
  };
  
  const toggleReleaseModal = (table = null) => {
    setShowReleaseModal(!showReleaseModal);
    setTableToRelease(table);
  };
  
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
      alert('Please select both a table and an order');
      return;
    }
    
    try {
      await assignTableToOrder(selectedTable._id, selectedOrder._id);
      loadTables();
      toggleModal();
    } catch (error) {
      console.error('Error assigning table to order:', error);
      alert('Failed to assign table to order');
    }
  };
  
  const handleReleaseTable = async () => {
    if (!tableToRelease) return;
    
    try {
      await releaseTable(tableToRelease._id);
      loadTables();
      toggleReleaseModal();
    } catch (error) {
      console.error('Error releasing table:', error);
      alert('Failed to release table');
    }
  };
  
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

  return (
    <Card className="shadow mb-4">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <h3 className="mb-0">Table Order Assignment</h3>
        <Button color="primary" onClick={toggleModal}>
          <i className="fas fa-link mr-2"></i> Assign Order to Table
        </Button>
      </CardHeader>
      <CardBody>
        <h4>Tables with Active Orders</h4>
        {loading ? (
          <div className="text-center my-3">
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : occupiedTables.length === 0 ? (
          <div className="text-center my-3 py-4">
            <p className="text-muted">No tables are currently assigned to orders.</p>
          </div>
        ) : (
          <Table responsive>
            <thead>
              <tr>
                <th>Table ID</th>
                <th>Table Name</th>
                <th>Capacity</th>
                <th>Order Number</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {occupiedTables.map((table) => (
                <tr key={table._id}>
                  <td>{table.tableId}</td>
                  <td>{table.TableName}</td>
                  <td>{table.capacity}</td>
                  <td>
                    {table.currentOrder ? (
                      typeof table.currentOrder === 'string' ? 
                        table.currentOrder : 
                        `#${table.currentOrder.orderNumber || 'Unknown'}`
                    ) : 'N/A'}
                  </td>
                  <td>{getStatusBadge(table.status)}</td>
                  <td>
                    <Button 
                      color="danger" 
                      size="sm"
                      onClick={() => toggleReleaseModal(table)}
                    >
                      <i className="fas fa-unlink mr-1"></i> Release
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      {/* Assign Order Modal */}
      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>
          Assign Order to Table
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="tableSelect">Select Table</Label>
            <Input
              type="select"
              name="tableSelect"
              id="tableSelect"
              value={selectedTable ? selectedTable._id : ''}
              onChange={(e) => handleTableSelect(e.target.value)}
            >
              <option value="">-- Select a Table --</option>
              {availableTables.map(table => (
                <option key={table._id} value={table._id}>
                  {table.tableId} - {table.TableName} ({table.capacity} persons)
                </option>
              ))}
            </Input>
          </FormGroup>
          
          <FormGroup>
            <Label for="orderSelect">Select Order</Label>
            <Input
              type="select"
              name="orderSelect"
              id="orderSelect"
              value={selectedOrder ? selectedOrder._id : ''}
              onChange={(e) => handleOrderSelect(e.target.value)}
            >
              <option value="">-- Select an Order --</option>
              {orders.map(order => (
                <option key={order._id} value={order._id}>
                  #{order.orderNumber} - ${order.total} ({order.status})
                </option>
              ))}
            </Input>
          </FormGroup>
          
          {selectedTable && selectedOrder && (
            <div className="mt-4 p-3 bg-light rounded">
              <h5>Assignment Summary</h5>
              <p><strong>Table:</strong> {selectedTable.tableId} - {selectedTable.TableName}</p>
              <p><strong>Order:</strong> #{selectedOrder.orderNumber} - ${selectedOrder.total}</p>
              <p><strong>Order Status:</strong> {getOrderStatusBadge(selectedOrder.status)}</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleModal}>Cancel</Button>
          <Button 
            color="primary" 
            onClick={handleAssignTable}
            disabled={!selectedTable || !selectedOrder}
          >
            Assign Order to Table
          </Button>
        </ModalFooter>
      </Modal>

      {/* Release Table Modal */}
      <Modal isOpen={showReleaseModal} toggle={() => toggleReleaseModal()}>
        <ModalHeader toggle={() => toggleReleaseModal()}>
          Release Table
        </ModalHeader>
        <ModalBody>
          {tableToRelease && (
            <div>
              <p>Are you sure you want to release table <strong>{tableToRelease.tableId} - {tableToRelease.TableName}</strong>?</p>
              <p>This will mark the table as available and remove its association with the current order.</p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => toggleReleaseModal()}>Cancel</Button>
          <Button color="danger" onClick={handleReleaseTable}>
            Release Table
          </Button>
        </ModalFooter>
      </Modal>
    </Card>
  );
};

export default TableOrderAssignment;