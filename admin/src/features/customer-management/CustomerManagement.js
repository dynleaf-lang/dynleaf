import React, { useState, useEffect, useContext } from 'react';
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
  UncontrolledTooltip
} from 'reactstrap';
import { useCustomer } from '../../context/CustomerContext';
import { AuthContext } from '../../context/AuthContext';
import Header from '../../components/Headers/Header';
import { FaSearch, FaEllipsisV, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaStore, FaFilter } from 'react-icons/fa';

const CustomerManagement = () => {
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const {
    customers,
    loading,
    error,
    restaurants,
    branches,
    getAllCustomers,
    getRestaurants,
    getBranchesForRestaurant
  } = useCustomer();
  
  const { user } = useContext(AuthContext);
  const { createCustomer, updateCustomer, deleteCustomer } = useCustomer();

  // Filter customers when search term or customers list changes
  useEffect(() => {
    if (customers) {
      const filtered = customers.filter(
        customer =>
          (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone || '').includes(searchTerm) ||
          (customer.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  // Handle restaurant selection change
  const handleRestaurantChange = async (e) => {
    const restaurantId = e.target.value;
    setSelectedRestaurant(restaurantId);
    setSelectedBranch(''); // Reset branch selection when restaurant changes
    
    if (restaurantId) {
      await getBranchesForRestaurant(restaurantId);
    } else {
      // If no restaurant is selected, reset filters and fetch all customers
      await getAllCustomers();
    }
  };

  // Handle branch selection change
  const handleBranchChange = async (e) => {
    const branchId = e.target.value;
    setSelectedBranch(branchId);
    
    // Apply filters when branch changes
    applyFilters(selectedRestaurant, branchId);
  };

  // Apply restaurant and branch filters
  const applyFilters = async (restaurantId = selectedRestaurant, branchId = selectedBranch) => {
    const filters = {};
    if (restaurantId) filters.restaurantId = restaurantId;
    if (branchId) filters.branchId = branchId;
    
    await getAllCustomers(filters);
  };
  
  // Reset filters
  const resetFilters = async () => {
    setSelectedRestaurant('');
    setSelectedBranch('');
    await getAllCustomers();
  };

  // Toggle modal
  const toggle = () => {
    setModal(!modal);
    if (!modal) {
      // Reset form when opening modal
      resetForm();
    }
  };

  // Reset form state
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setFormErrors({});
    setEditMode(false);
    setCurrentCustomer(null);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field if exists
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    // Email is optional, but if provided, it should be valid
    if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    // Address is optional, no validation needed
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editMode) {
        await updateCustomer(currentCustomer._id, formData);
        setSuccessMessage(`Customer "${formData.name}" updated successfully`);
      } else {
        await createCustomer(formData);
        setSuccessMessage(`Customer "${formData.name}" created successfully`);
      }
      
      toggle(); // Close modal
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error saving customer:', err);
    }
  };

  // Open edit modal for a customer
  const handleEdit = (customer) => {
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setEditMode(true);
    setModal(true);
  };

  // Open delete confirmation modal
  const confirmDelete = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteConfirm(true);
  };

  // Handle customer deletion
  const handleDelete = async () => {
    try {
      if (!customerToDelete) return;
      
      await deleteCustomer(customerToDelete._id);
      setSuccessMessage(`Customer "${customerToDelete.name}" deleted successfully`);
      
      // Close modal and reset
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Refresh customers list
  const handleRefresh = () => {
    applyFilters(); // Apply current filters when refreshing
  };

  // Toggle filter section visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Get the title based on user role and branch assignment
  const getTitle = () => {
    if (user.role === 'Super_Admin') {
      if (selectedRestaurant && selectedBranch) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        const branchName = branches.find(b => b._id === selectedBranch)?.name || '';
        return `${restaurantName} - ${branchName} Customers`;
      } else if (selectedRestaurant) {
        const restaurantName = restaurants.find(r => r._id === selectedRestaurant)?.name || '';
        return `${restaurantName} Customers`;
      } else {
        return 'All Customers';
      }
    } else if (user.branchId) {
      return 'Branch Customers';
    } else {
      return 'Customer Management';
    }
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
                                            <FaStore className="mr-1" /> {user.role === 'Branch_Manager' ? 'Managing customers for your branch' : 'Viewing customers for your branch'}
                                        </p>
                                    )}
                                </Col>
                                <Col className="text-right" xs="4">
                                    {user.role === 'Super_Admin' && (
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            onClick={toggleFilters}
                                            className="mr-2"
                                        >
                                            <FaFilter className="mr-1" /> 
                                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                                        </Button>
                                    )}
                                    {user.role !== 'Super_Admin' && (
                                        <Button
                                            color="primary"
                                            onClick={toggle}
                                            disabled={loading}
                                            className="mr-2"
                                        >
                                            <i className="fas fa-user-plus mr-2"></i>Add New Customer
                                        </Button>
                                    )}
                                    <Button
                                        color="info"
                                        size="sm"
                                        onClick={handleRefresh}
                                        disabled={loading}
                                    >
                                        <i className="fas fa-sync-alt"></i>
                                    </Button>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {successMessage && (
                                <Alert color="success" className="mb-4">
                                    <i className="fas fa-check-circle mr-2"></i>
                                    {successMessage}
                                </Alert>
                            )}
                            
                            {error && (
                                <Alert color="danger" className="mb-4">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    {error}
                                </Alert>
                            )}

                            {/* Super Admin Filters */}
                            {user.role === 'Super_Admin' && showFilters && (
                                <Card className="mb-4 bg-light">
                                    <CardBody>
                                        <h4 className="mb-3">Filter Customers</h4>
                                        <Row>
                                            <Col md="5">
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
                                            <Col md="5">
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
                                            <Col md="2" className="d-flex align-items-end">
                                                <Button
                                                    color="secondary"
                                                    outline
                                                    block
                                                    onClick={resetFilters}
                                                    className="mb-3"
                                                >
                                                    Reset Filters
                                                </Button>
                                            </Col>
                                        </Row>
                                    </CardBody>
                                </Card>
                            )}

                            <Row className="mb-4">
                                <Col md="4">
                                    <InputGroup>
                                        <InputGroupAddon addonType="prepend">
                                            <InputGroupText>
                                                <FaSearch />
                                            </InputGroupText>
                                        </InputGroupAddon>
                                        <Input
                                            placeholder="Search customers..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                        />
                                    </InputGroup>
                                </Col>
                            </Row>
                            
                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner color="primary" />
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="text-center py-4">
                                    {searchTerm ? (
                                        <p className="text-muted">No customers found matching your search. Try different keywords or <Button color="link" onClick={() => setSearchTerm('')}>clear search</Button></p>
                                    ) : (
                                        <p className="text-muted">No customers found. Click "Add New Customer" to create one.</p>
                                    )}
                                </div>
                            ) : (
                                <Table className="align-items-center table-flush" responsive hover>
                                    <thead className="thead-light">
                                        <tr>
                                            <th scope="col">Name</th>
                                            <th scope="col">Contact Information</th>
                                            <th scope="col">Address</th>
                                            {user.role === 'Super_Admin' && (
                                                <th scope="col">Restaurant/Branch</th>
                                            )}
                                            {user.role !== 'Super_Admin' && ( <th scope="col">Actions</th> )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer._id}>
                                                <td>
                                                    <div className="font-weight-bold">{customer.name}</div>
                                                    <small className="text-muted">ID: {customer.customerId}</small>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        {customer.email && (
                                                            <div className="mb-1">
                                                                <FaEnvelope className="mr-2 text-primary" />
                                                                <a href={`mailto:${customer.email}`}>{customer.email}</a>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <FaPhoneAlt className="mr-2 text-success" />
                                                            <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {customer.address ? (
                                                        <div className="d-flex align-items-center">
                                                            <FaMapMarkerAlt className="mr-2 text-danger" />
                                                            <span>{customer.address}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted">Not provided</span>
                                                    )}
                                                </td>
                                                {user.role === 'Super_Admin' && (
                                                    <td>
                                                        {customer.restaurantId && customer.restaurantId.name ? (
                                                            <div className="d-flex flex-column">
                                                                <Badge color="info" className="mb-1">
                                                                    {customer.restaurantId.name}
                                                                </Badge>
                                                                {customer.branchId && customer.branchId.name && (
                                                                    <Badge color="secondary">
                                                                        {customer.branchId.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <small>
                                                                {customer.restaurantId ? `Restaurant ID: ${customer.restaurantId}` : 'N/A' }
                                                                <br/>
                                                                {customer.branchId ? `Branch ID: ${customer.branchId}` : 'N/A' }
                                                            </small>
                                                        )}
                                                    </td>
                                                )}
                                                 {user.role !== 'Super_Admin' && (
                                                <td>
                                                    <Button
                                                        color="info"
                                                        size="sm"
                                                        className="mr-2"
                                                        onClick={() => handleEdit(customer)}
                                                    >
                                                        <i className="fas fa-edit mr-1"></i>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => confirmDelete(customer)}
                                                    >
                                                        <i className="fas fa-trash mr-1"></i>
                                                        Delete
                                                    </Button>
                                                </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            
            {/* Add/Edit Customer Modal */}
            <Modal isOpen={modal} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle} className={editMode ? "bg-info text-white" : "bg-primary text-white"}>
                    <i className={`fas ${editMode ? 'fa-user-edit' : 'fa-user-plus'} mr-2`}></i>
                    {editMode ? 'Edit Customer' : 'Add New Customer'}
                </ModalHeader>
                <ModalBody>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label for="name">Full Name*</Label>
                                    <Input
                                        type="text"
                                        name="name"
                                        id="name"
                                        placeholder="Enter customer's full name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        invalid={!!formErrors.name}
                                    />
                                    {formErrors.name && <div className="text-danger">{formErrors.name}</div>}
                                </FormGroup>
                            </Col>
                        </Row>
                        
                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label for="email">Email Address</Label>
                                    <Input
                                        type="email"
                                        name="email"
                                        id="email"
                                        placeholder="Enter email address (optional)"
                                        value={formData.email}
                                        onChange={handleChange}
                                        invalid={!!formErrors.email}
                                    />
                                    {formErrors.email && <div className="text-danger">{formErrors.email}</div>}
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label for="phone">Phone Number*</Label>
                                    <Input
                                        type="tel"
                                        name="phone"
                                        id="phone"
                                        placeholder="Enter phone number"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        invalid={!!formErrors.phone}
                                    />
                                    {formErrors.phone && <div className="text-danger">{formErrors.phone}</div>}
                                </FormGroup>
                            </Col>
                        </Row>
                        
                        <FormGroup>
                            <Label for="address">Address</Label>
                            <Input
                                type="textarea"
                                name="address"
                                id="address"
                                placeholder="Enter address (optional)"
                                value={formData.address}
                                onChange={handleChange}
                                rows="3"
                            />
                        </FormGroup>
                        
                        {/* Help text explaining customer visibility based on branch */}
                        <Alert color="info" className="mt-3 mb-0 py-2">
                            <i className="fas fa-info-circle mr-2"></i>
                            {user.role === 'Super_Admin'
                                ? 'This customer will be associated with your current restaurant.'
                                : 'This customer will be associated with your current branch and only visible to users from this branch.'}
                            <br />
                            <small>* Required fields</small>
                        </Alert>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle}>
                        Cancel
                    </Button>
                    <Button color={editMode ? "info" : "primary"} onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <Spinner size="sm" className="mr-2" />
                        ) : (
                            <i className={`fas ${editMode ? 'fa-save' : 'fa-plus-circle'} mr-2`}></i>
                        )}
                        {editMode ? 'Update Customer' : 'Save Customer'}
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
                    {customerToDelete && (
                        <p>Are you sure you want to delete customer "<strong>{customerToDelete.name}</strong>"? This action cannot be undone.</p>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowDeleteConfirm(false)}>
                        Cancel
                    </Button>
                    <Button color="danger" onClick={handleDelete} disabled={loading}>
                        {loading ? <Spinner size="sm" /> : 'Delete Customer'}
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    </>
);
};

export default CustomerManagement;