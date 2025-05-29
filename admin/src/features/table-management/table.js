// reactstrap components
import {
  Card,
  CardHeader,
  CardFooter,
  CardBody,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
  Container,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
  Nav,
  NavItem,
  NavLink
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect, useRef } from "react";
import { TableContext } from "../../context/TableContext";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import FloorPlan from "./FloorPlan";
import TableReservations from "./TableReservations";
import TableOrderAssignment from "./TableOrderAssignment";
import { QRCodeCanvas } from "qrcode.react";

const TableManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { 
    tables, 
    loading, 
    error, 
    fetchTables, 
    createTable, 
    updateTable, 
    deleteTable,
    tableZones,
    fetchTableZones
  } = useContext(TableContext);
  const { user, isAdmin, isSuperAdmin, isBranchManager } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [filters, setFilters] = useState({
    zone: '',
    status: '',
    minCapacity: '',
    maxCapacity: '',
    isVIP: false,
  });
  const [selectedTable, setSelectedTable] = useState(null);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    TableName: '',
    capacity: '',
    shape: 'square',
    location: {
      zone: 'Main',
      x: 50,
      y: 50,
    },
    isVIP: false,
    notes: ''
  });

  // Fetch tables and zones when component mounts
  useEffect(() => {
    // For Super_Admin, fetch all tables or use filters
    // For other users, restrict to their assigned restaurant and branch
    if (isSuperAdmin()) {
      fetchTables();
    } else if (user && user.restaurantId && user.branchId) {
      fetchTables({
        restaurantId: user.restaurantId,
        branchId: user.branchId
      });
    }
    
    fetchTableZones();
  }, [user, isSuperAdmin]);

  // Apply filters when they change
  useEffect(() => {
    const applyFilters = async () => {
      // Only apply filters that have values
      const activeFilters = Object.entries(filters)
        .reduce((acc, [key, value]) => {
          if (value !== '' && value !== false && value !== null) {
            acc[key] = value;
          }
          return acc;
        }, {});
      
      await fetchTables(activeFilters);
    };
    
    applyFilters();
  }, [filters]);

  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    // Reset form data
    setFormData({
      TableName: '',
      capacity: '',
      shape: 'square',
      location: {
        zone: 'Main',
        x: 50,
        y: 50,
      },
      isVIP: false,
      notes: ''
    });
  };
  
  // Function to handle editing a table
  const handleEditTable = (table) => {
    setCurrentEditItem(table);
    setFormData({
      TableName: table.TableName || '',
      capacity: table.capacity || '',
      shape: table.shape || 'square',
      location: table.location || {
        zone: 'Main',
        x: 50,
        y: 50
      },
      isVIP: table.isVIP || false,
      notes: table.notes || ''
    });
    setModalOpen(true);
  };

  // Function to handle viewing table reservations
  const handleViewReservations = (table) => {
    setSelectedTable(table);
    setReservationsModalOpen(true);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., location.zone)
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : 
               name === 'capacity' ? Number(value) : value
      });
    }
  };
  
  // Function to handle saving a table
  const handleSaveTable = async () => {
    // Validate form data
    if (!formData.TableName || !formData.capacity) {  
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (currentEditItem) {
        // Update existing table
        const result = await updateTable(currentEditItem._id, formData);
        if (result.success) {
          handleCloseModal();
        }
      } else {
        // Create new table
        // For non-SuperAdmin users, add the restaurant and branch IDs from the user context
        const tableData = { ...formData };
        
        // If not SuperAdmin, use the user's assigned restaurant and branch
        if (!isSuperAdmin() && user) {
          tableData.restaurantId = user.restaurantId;
          tableData.branchId = user.branchId;
        }
        
        const result = await createTable(tableData);
        if (result.success) {
          handleCloseModal();
        }
      }
    } catch (err) {
      console.error("Error saving table:", err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      zone: '',
      status: '',
      minCapacity: '',
      maxCapacity: '',
      isVIP: false,
    });
  };

  // Check if user has permission to access this page
  if (!isAdmin() && !isSuperAdmin() && !isBranchManager()) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <div className="col-lg-6">
            <Card className="shadow border-0">
              <CardHeader className="bg-transparent">
                <h3 className="text-center">Access Denied</h3>
              </CardHeader>
              <div className="card-body text-center">
                <p>You do not have permission to view this page.</p>
                <p>Only admin, super admin, or branch manager users can access Table Management.</p>
              </div>
            </Card>
          </div>
        </Row>
      </Container>
    );
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'occupied':
        return <Badge color="danger">Occupied</Badge>;
      case 'reserved':
        return <Badge color="warning">Reserved</Badge>;
      case 'maintenance':
        return <Badge color="secondary">Maintenance</Badge>;
      case 'available':
      default:
        return <Badge color="success">Available</Badge>;
    }
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow">
              <CardHeader className="bg-gradient-primary text-white py-4 border-bottom-0">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="mb-0 text-white font-weight-bold">
                    <i className="fas fa-table mr-2"></i> Table Management
                  </h3>
                  <div className="text-right">
                    <Badge color="light" pill className="px-3 py-2">
                      <i className="fas fa-building mr-1"></i> {user?.restaurantId ? 'Restaurant ID: ' + user.restaurantId.substring(0, 8) : 'All Restaurants'}
                    </Badge>
                  </div>
                </div>

                <Nav tabs className="nav-fill flex-column flex-md-row border-0 nav-tabs-custom mt-2">
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'list' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('list')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-list mr-2"></i> List View
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'floor-plan' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('floor-plan')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-th mr-2"></i> Floor Plan
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'orders' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('orders')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-utensils mr-2"></i> Table Orders
                    </NavLink>
                  </NavItem>
                </Nav>
              </CardHeader>
            </Card>
            
            {activeTab === 'list' && (
              <Card className="shadow">
                <CardHeader className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <h3 className="mb-0 font-weight-bold">
                      <i className="fas fa-chair mr-2"></i>Dining Tables
                    </h3>
                    <p className="mb-0 small">
                      <i className="fas fa-info-circle mr-1"></i>Manage your restaurant's tables
                    </p>
                  </div>
                  <div>
                    <Button color="primary" className="font-weight-bold" onClick={() => {
                      setCurrentEditItem(null);
                      setModalOpen(true);
                    }}>
                      <i className="fas fa-plus mr-2"></i> Add New Table
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Filters */}
                  <div className="mb-4">
                    <h5>Filters</h5>
                    <Row form>
                      <Col md={3}>
                        <FormGroup>
                          <Label for="zone">Zone</Label>
                          <Input 
                            type="select" 
                            name="zone" 
                            id="zone"
                            value={filters.zone}
                            onChange={handleFilterChange}
                          >
                            <option value="">All Zones</option>
                            {tableZones.map(zone => (
                              <option key={zone} value={zone}>
                                {zone}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={3}>
                        <FormGroup>
                          <Label for="status">Status</Label>
                          <Input 
                            type="select" 
                            name="status" 
                            id="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                          >
                            <option value="">All Statuses</option>
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="reserved">Reserved</option>
                            <option value="maintenance">Maintenance</option>
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={2}>
                        <FormGroup>
                          <Label for="minCapacity">Min Capacity</Label>
                          <Input
                            type="number"
                            name="minCapacity"
                            id="minCapacity"
                            min="1"
                            value={filters.minCapacity}
                            onChange={handleFilterChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={2}>
                        <FormGroup>
                          <Label for="maxCapacity">Max Capacity</Label>
                          <Input
                            type="number"
                            name="maxCapacity"
                            id="maxCapacity"
                            min="1"
                            value={filters.maxCapacity}
                            onChange={handleFilterChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={2} className="d-flex align-items-center">
                        <FormGroup check>
                          <Label check>
                            <Input
                              type="checkbox"
                              name="isVIP"
                              checked={filters.isVIP}
                              onChange={handleFilterChange}
                            />{' '}
                            VIP Tables Only
                          </Label>
                        </FormGroup>
                      </Col>
                    </Row>
                    <div className="mt-2">
                      <Button color="info" size="sm" onClick={resetFilters}>
                        <i className="fas fa-sync-alt mr-1"></i> Reset Filters
                      </Button>
                    </div>
                  </div>
                  
                  <Table className="align-items-center table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th scope="col">Table ID</th> 
                      <th scope="col">Name</th>
                      <th scope="col">Capacity</th>
                      <th scope="col">Zone</th>
                      <th scope="col">Status</th>
                      <th scope="col">QR Code</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <p className="text-danger mb-0">Error loading tables: {error}</p>
                        </td>
                      </tr>
                    ) : tables && tables.length > 0 ? tables.map((table) => (
                      <tr key={table._id}>
                        <td>
                          <span className="mb-0 text-sm">
                            {table.tableId}
                          </span>
                        </td> 
                        <td>
                          <span className="mb-0 text-sm font-weight-bold">
                            {table.TableName}
                          </span>
                          {table.isVIP && (
                            <Badge color="info" pill className="ml-2">VIP</Badge>
                          )}
                        </td>
                        <td>{table.capacity} persons</td>
                        <td>{table.location?.zone || 'Main'}</td>
                        <td>
                          {getStatusBadge(table.status || (table.isOccupied ? 'occupied' : 'available'))}
                        </td>
                        <td>
                          <Button
                            color="secondary"
                            size="sm"
                            onClick={() => {
                              // Create QR code and download immediately
                              const qrCodeValue = `${window.location.origin}/menu?tableId=${table._id}&tableName=${encodeURIComponent(table.TableName)}`;
                              
                              // Create a QR code element temporarily in the DOM
                              const qrContainer = document.createElement('div');
                              qrContainer.style.position = 'absolute';
                              qrContainer.style.left = '-9999px';
                              document.body.appendChild(qrContainer);
                              
                              // Render the QR code to the temporary container
                              const qrCode = document.createElement('canvas');
                              qrContainer.appendChild(qrCode);
                              
                              // Use the library directly without React
                              import('qrcode').then(QRCode => {
                                QRCode.toCanvas(qrCode, qrCodeValue, {
                                  width: 256,
                                  margin: 4,
                                  color: {
                                    dark: '#000000',
                                    light: '#ffffff'
                                  },
                                  errorCorrectionLevel: 'H'
                                }, function(error) {
                                  if (error) {
                                    console.error("Error generating QR code:", error);
                                    alert("Failed to generate QR code");
                                    document.body.removeChild(qrContainer);
                                    return;
                                  }
                                  
                                  // Create a temporary link element for download
                                  const link = document.createElement("a");
                                  link.href = qrCode.toDataURL("image/png");
                                  link.download = `Table_QR_${table.TableName.replace(/\s+/g, '_')}.png`;
                                  
                                  // Trigger download
                                  document.body.appendChild(link);
                                  link.click();
                                  
                                  // Clean up
                                  document.body.removeChild(link);
                                  document.body.removeChild(qrContainer);
                                });
                              }).catch(err => {
                                console.error("Error loading QRCode library:", err);
                                alert("Failed to load QR code generator");
                                document.body.removeChild(qrContainer);
                              });
                            }}
                            className="mr-2"
                          >
                            <i className="fas fa-qrcode"></i> QR Code
                          </Button> 
                        </td>
                        <td>
                          <Button
                            color="primary"
                            size="sm"
                            className="mr-1"
                            onClick={() => handleEditTable(table)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            color="info"
                            size="sm"
                            className="mr-1"
                            onClick={() => handleViewReservations(table)}
                          >
                            <i className="fas fa-calendar"></i>
                          </Button>
                          <Button
                            color="secondary"
                            size="sm"
                            className="mr-1"
                            onClick={() => navigate(`/admin/tables-management/${table._id}`)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this table?")) {
                                deleteTable(table._id);
                              }
                            }}
                            disabled={table.isOccupied || table.status === 'occupied'}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <p className="font-italic text-muted mb-0">No tables available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  </Table>
                </CardBody>
                {tables && tables.length > 0 && (
                <CardFooter className="py-4">
                  <nav aria-label="...">
                    <Pagination
                      className="pagination justify-content-end mb-0"
                      listClassName="justify-content-end mb-0"
                    >
                      <PaginationItem className="disabled">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                          tabIndex="-1"
                        >
                          <i className="fas fa-angle-left" />
                          <span className="sr-only">Previous</span>
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem className="active">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          <i className="fas fa-angle-right" />
                          <span className="sr-only">Next</span>
                        </PaginationLink>
                      </PaginationItem>
                    </Pagination>
                  </nav>
                </CardFooter>
                )}
              </Card>
            )}
            
            {activeTab === 'floor-plan' && (
              <FloorPlan />
            )}
            
            {activeTab === 'orders' && (
              <TableOrderAssignment />
            )}
          </Col>
        </Row>
      </Container>
      
      {/* Table Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal} size="lg">
        <ModalHeader toggle={handleCloseModal} className={`bg-gradient-${currentEditItem ? 'warning' : 'success'} text-white py-3`}>
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className={`fas ${currentEditItem ? 'fa-edit' : 'fa-plus'} mr-2`}></i>
              {currentEditItem ? 'Edit Dining Table' : 'Add New Dining Table'}
            </h4>
            <p className="text-white-50 mb-0 small">
              {currentEditItem ? 'Update the details of an existing table' : 'Create a new table in your restaurant'}
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <Form>
            {currentEditItem && (
              <FormGroup>
                <Label for="tableIdDisplay">Table ID</Label>
                <Input
                  type="text"
                  id="tableIdDisplay"
                  value={currentEditItem.tableId || ''}
                  disabled
                  className="bg-light"
                />
                <small className="form-text text-muted">
                  Table ID is auto-generated and cannot be modified.
                </small>
              </FormGroup>
            )}
            
            <Row form>
              <Col md={6}>
                <FormGroup>
                  <Label for="TableName">Table Name*</Label>
                  <Input
                    type="text"
                    name="TableName"
                    id="TableName"
                    placeholder="Table Name"
                    value={formData.TableName}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="capacity">Capacity*</Label>
                  <Input
                    type="number"
                    name="capacity"
                    id="capacity"
                    placeholder="Number of persons"
                    min="1"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </Col>
            </Row>
            
            <Row form>
              <Col md={6}>
                <FormGroup>
                  <Label for="shape">Shape</Label>
                  <Input
                    type="select"
                    name="shape"
                    id="shape"
                    value={formData.shape}
                    onChange={handleInputChange}
                  >
                    <option value="square">Square</option>
                    <option value="round">Round</option>
                    <option value="rectangle">Rectangle</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="location.zone">Zone</Label>
                  <Input
                    type="select"
                    name="location.zone"
                    id="location.zone"
                    value={formData.location?.zone || 'Main'}
                    onChange={handleInputChange}
                  >
                    <option value="Main">Main</option>
                    <option value="Patio">Patio</option>
                    <option value="Private">Private</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
            
            <FormGroup check className="mb-3">
              <Label check>
                <Input
                  type="checkbox"
                  name="isVIP"
                  checked={formData.isVIP}
                  onChange={handleInputChange}
                />{' '}
                VIP Table
              </Label>
              <small className="form-text text-muted">
                Mark as VIP for special service and reservations
              </small>
            </FormGroup>
            
            <FormGroup>
              <Label for="notes">Notes</Label>
              <Input
                type="textarea"
                name="notes"
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional details about this table"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>{' '}
          <Button color="primary" onClick={handleSaveTable}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Reservations Modal */}
      {selectedTable && (
        <Modal isOpen={reservationsModalOpen} toggle={() => setReservationsModalOpen(false)} size="xl">
          <ModalBody className="p-0">
            <TableReservations 
              table={selectedTable} 
              onClose={() => setReservationsModalOpen(false)} 
            />
          </ModalBody>
        </Modal>
      )}
    </>
  );
};

export default TableManagement;