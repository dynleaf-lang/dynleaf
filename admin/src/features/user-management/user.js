// reactstrap components
import {
  Badge,
  Card,
  CardHeader,
  CardFooter,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Media,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
  Container,
  Row,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  FormFeedback,
  Label,
  Input,
  Alert
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect } from "react";
import { UserContext } from "../../context/UserContext";
import { AuthContext } from "../../context/AuthContext";
import { RestaurantContext } from "../../context/RestaurantContext"; 
import { BranchContext } from "../../context/BranchContext";

const UserManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { users, loading, error, fetchUsers, createUser, updateUser, deleteUser } = useContext(UserContext);
  const { isSuperAdmin } = useContext(AuthContext);
  const { restaurants, loading: restaurantsLoading, error: restaurantsError, fetchRestaurants } = useContext(RestaurantContext);  
  const { branches, loading: branchesLoading, error: branchesError, fetchBranches, fetchBranchesByRestaurant } = useContext(BranchContext);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Branch_Manager',
    restaurantId: '',
    branchId: ''
  });

  // State to store branches for the selected restaurant
  const [restaurantBranches, setRestaurantBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Validation state
  const [validation, setValidation] = useState({
    name: { valid: true, message: '' },
    email: { valid: true, message: '' },
    password: { valid: true, message: '', strength: 0 },
    confirmPassword: { valid: true, message: '' },
    restaurantId: { valid: true, message: '' },
    branchId: { valid: true, message: '' }
  });
  
  // Password strength criteria
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };
  
  const getPasswordStrengthLabel = (strength) => {
    if (strength === 0) return { text: "Very Weak", color: "danger" };
    if (strength === 1) return { text: "Weak", color: "danger" };
    if (strength === 2) return { text: "Fair", color: "warning" };
    if (strength === 3) return { text: "Good", color: "info" };
    if (strength === 4) return { text: "Strong", color: "success" };
    if (strength === 5) return { text: "Very Strong", color: "success" };
  };

  // Helper function to get restaurant name by ID
  const getRestaurantName = (restaurantId) => {
    if (!restaurantId) return 'Not Assigned';
    
    const restaurant = restaurants.find(r => r._id === restaurantId);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
  };

  const getBranchName = (branchId) => {
    if (!branchId) return 'Not Assigned';
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : 'Unknown Branch';
  };

  // Fetch users and restaurants when component mounts
  useEffect(() => {
    fetchUsers();
    fetchRestaurants();

  }, []);
 

  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    // Reset form data
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'Branch_Manager',
      restaurantId: '',
      branchId: ''  // Add branchId to reset
    });
    // Reset validation
    setValidation({
      name: { valid: true, message: '' },
      email: { valid: true, message: '' },
      password: { valid: true, message: '', strength: 0 },
      confirmPassword: { valid: true, message: '' },
      restaurantId: { valid: true, message: '' }
    });
    // Clear branch data
    setRestaurantBranches([]);
  };
  
  // Function to handle editing a user
  const handleEditUser = (user) => {
    setCurrentEditItem(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't pre-fill password for security reasons
      confirmPassword: '', // Don't pre-fill confirm password
      role: user.role || 'Branch_Manager',
      restaurantId: user.restaurantId || '',
      branchId: user.branchId || ''
    });
    
    // Load branches for this restaurant if it has one
    if (user.restaurantId) {
      setLoadingBranches(true);
      fetchBranchesByRestaurant(user.restaurantId)
        .then(branchData => {
          setRestaurantBranches(branchData || []);
        })
        .catch(err => {
          console.error('Error fetching branches:', err);
        })
        .finally(() => {
          setLoadingBranches(false);
        });
    }
    
    setModalOpen(true);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for role changes
    if (name === 'role') {
      const newFormData = {
        ...formData,
        [name]: value
      };
      
      // If role is changed to a restaurant-specific role, validate restaurantId
      if (value === 'Branch_Manager' || value === 'Kitchen' || value === 'Delivery' || value === 'POS_Operator') {
        validateField('restaurantId', newFormData.restaurantId);
      }
      
      setFormData(newFormData);
      return;
    }
    
    // Special handling for restaurant selection to load branches
    if (name === 'restaurantId' && value) {
      setLoadingBranches(true);
      fetchBranchesByRestaurant(value)
        .then(branchData => {
          setRestaurantBranches(branchData || []);
        })
        .catch(err => {
          console.error('Error fetching branches:', err);
        })
        .finally(() => {
          setLoadingBranches(false);
        });
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Validate input as user types
    validateField(name, value);
  };
  
  // Validate individual field
  const validateField = (name, value) => {
    const newValidation = { ...validation };
    
    switch(name) {
      case 'name':
        newValidation.name.valid = value.trim().length >= 3;
        newValidation.name.message = newValidation.name.valid ? '' : 'Name must be at least 3 characters';
        break;
        
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        newValidation.email.valid = emailRegex.test(value);
        newValidation.email.message = newValidation.email.valid ? '' : 'Please enter a valid email address';
        break;
        
      case 'password':
        if (currentEditItem && !value) {
          // If editing and password is empty, it's valid (not changing password)
          newValidation.password.valid = true;
          newValidation.password.message = '';
          newValidation.password.strength = 0;
        } else {
          const strength = getPasswordStrength(value);
          newValidation.password.strength = strength;
          newValidation.password.valid = strength >= 3;
          newValidation.password.message = newValidation.password.valid ? 
            '' : 'Password should be at least 8 characters with uppercase, lowercase, numbers, and special characters';
        }
        
        // Also check confirmPassword match if it has a value
        if (formData.confirmPassword) {
          newValidation.confirmPassword.valid = value === formData.confirmPassword;
          newValidation.confirmPassword.message = newValidation.confirmPassword.valid ? 
            '' : 'Passwords do not match';
        }
        break;
        
      case 'confirmPassword':
        newValidation.confirmPassword.valid = value === formData.password;
        newValidation.confirmPassword.message = newValidation.confirmPassword.valid ? 
          '' : 'Passwords do not match';
        break;
        
      case 'restaurantId':
        if (formData.role === 'Branch_Manager' || formData.role === 'Kitchen' || 
            formData.role === 'Delivery' || formData.role === 'POS_Operator') {
          newValidation.restaurantId.valid = !!value;
          newValidation.restaurantId.message = newValidation.restaurantId.valid ? 
            '' : 'Restaurant selection is required for this role';
        } else {
          // For Super_Admin and admin, restaurant selection is optional
          newValidation.restaurantId.valid = true;
          newValidation.restaurantId.message = '';
        }
        break;
        
      default:
        break;
    }
    
    setValidation(newValidation);
  };
  
  // Function to validate all fields before submission
  const validateForm = () => {
    // Validate all fields
    validateField('name', formData.name);
    validateField('email', formData.email);
    if (!currentEditItem || formData.password) {
      validateField('password', formData.password);
      validateField('confirmPassword', formData.confirmPassword);
    }
    validateField('restaurantId', formData.restaurantId);
    
    // Check if all validations pass
    return validation.name.valid && 
           validation.email.valid && 
           (currentEditItem && !formData.password ? true : validation.password.valid) &&
           (currentEditItem && !formData.password ? true : validation.confirmPassword.valid) &&
           validation.restaurantId.valid;
  };
  
  // Function to handle saving a user
  const handleSaveUser = async () => {
    // Re-validate all fields
    if (!validateForm()) {
      return;
    }
    
    try {
      // Create a copy of form data for submission
      const userData = { ...formData };
      
      // Remove confirmPassword from the data to send
      delete userData.confirmPassword;
      
      // If password is empty and we're updating, remove it from the request
      if (currentEditItem && !userData.password) {
        delete userData.password;
      }
      
      // If restaurantId is empty, remove it (for Super_Admin and admin roles)
      if (!userData.restaurantId) {
        delete userData.restaurantId;
      }
      
      if (currentEditItem) {
        // Update existing user
        await updateUser(currentEditItem._id, userData);
      } else {
        // Create new user
        await createUser(userData);
      }
      
      handleCloseModal();
    } catch (err) {
      console.error('Error saving user:', err);
    }
  };

  // Only Super_Admin should be able to access this page
  if (!isSuperAdmin()) {
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
                <p>Only users with the Super_Admin role can access User Management.</p>
              </div>
            </Card>
          </div>
        </Row>
      </Container>
    );
  }

  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid> 
          <Row>
            <div className="col">
              <Card className="shadow">
                <CardHeader className="border-0 d-flex justify-content-between">
                 <div className="d-inline-block">
                 <h3 className="mb-0">Users</h3>
                 </div>
                <div className="text-right d-inline-block">
                  <Button color="primary" onClick={() => {
                    setCurrentEditItem(null);
                    // Ensure restaurants are loaded
                    fetchRestaurants();
                    setModalOpen(true);
                  }}>
                    <i className="fas fa-plus mr-2"></i> Add New User
                  </Button>
                </div>
                </CardHeader>
                <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Restaurant</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">Loading users...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="text-danger mb-0">Error loading users: {error}</p>
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <span className="mb-0 text-sm font-weight-bold">
                          {user.name}
                        </span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <Badge color={
                          user.role === 'Super_Admin' ? 'danger' :
                          user.role === 'Branch_Manager' ? 'success' :
                          user.role === 'Kitchen' ? 'info' :
                          user.role === 'Delivery' ? 'warning' :
                          user.role === 'POS_Operator' ? 'primary' : 'secondary'
                        } pill>
                          {user.role}
                        </Badge>
                      </td>
                      <td>
                        {user.restaurantId ? (
                          <span className="text-sm">
                            {getRestaurantName(user.restaurantId)}
                          </span>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        {user.branchId ? (
                          <span className="text-sm">
                            {getBranchName(user.branchId)}
                          </span>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="text-right">
                        <UncontrolledDropdown>
                          <DropdownToggle
                            className="btn-icon-only text-light"
                            href="#"
                            role="button"
                            size="sm"
                            color=""
                            onClick={(e) => e.preventDefault()}
                          >
                            <i className="fas fa-ellipsis-v" />
                          </DropdownToggle>
                          <DropdownMenu className="dropdown-menu-arrow" right>
                            <DropdownItem
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditUser(user);
                              }}
                            >
                              <i className="fas fa-edit text-primary mr-2"></i> Edit
                            </DropdownItem>
                            <DropdownItem  
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this user?")) {
                                  deleteUser(user._id);
                                }
                              }}
                            >
                              <i className="fas fa-trash text-danger mr-2"></i> Delete
                            </DropdownItem> 
                            </DropdownMenu>
                        </UncontrolledDropdown>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">No users available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                </Table>
                {users && users.length > 0 && (
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
            </div>
          </Row>
      </Container>
      
      {/* User Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal}>
        <ModalHeader toggle={handleCloseModal}>
          {currentEditItem ? 'Edit User' : 'Add New User'}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="name">Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                invalid={!validation.name.valid}
                required
              />
              <FormFeedback>{validation.name.message}</FormFeedback>
            </FormGroup>
            <FormGroup>
              <Label for="email">Email</Label>
              <Input
                type="email"
                name="email"
                id="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                invalid={!validation.email.valid}
                required
              />
              <FormFeedback>{validation.email.message}</FormFeedback>
            </FormGroup>
            <FormGroup>
              <Label for="password">
                Password {currentEditItem && <span className="text-muted">(Leave blank to keep current password)</span>}
              </Label>
              <Input
                type="password"
                name="password"
                id="password"
                placeholder={currentEditItem ? "Leave blank to keep current password" : "Password"}
                value={formData.password}
                onChange={handleInputChange}
                invalid={!validation.password.valid}
                required={!currentEditItem}
              />
              <FormFeedback>{validation.password.message}</FormFeedback>
              {formData.password && (
                <div className="mt-1">
                  <Label className="mr-2">Password Strength:</Label>
                  <Badge color={getPasswordStrengthLabel(validation.password.strength).color}>
                    {getPasswordStrengthLabel(validation.password.strength).text}
                  </Badge>
                  <small className="form-text text-muted">
                    Password should have at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                  </small>
                </div>
              )}
            </FormGroup>
            <FormGroup>
              <Label for="confirmPassword">Confirm Password</Label>
              <Input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                invalid={!validation.confirmPassword.valid}
                required={!currentEditItem || formData.password.length > 0}
                disabled={currentEditItem && !formData.password}
              />
              <FormFeedback>{validation.confirmPassword.message}</FormFeedback>
            </FormGroup>   
            <FormGroup>
              <Label for="role">Role</Label>
              <Input
                type="select"
                name="role"
                id="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="Branch_Manager">Branch Manager</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Delivery">Delivery</option>
                <option value="POS_Operator">POS Operator</option>
                <option value="admin">Admin</option>
                {isSuperAdmin() && <option value="Super_Admin">Super Admin</option>}
              </Input>
              <small className="form-text text-muted">
                {(formData.role === 'Branch_Manager' || formData.role === 'Kitchen' || 
                 formData.role === 'Delivery' || formData.role === 'POS_Operator') ? 
                  'This role requires a restaurant association' : 
                  'Restaurant association is optional for this role'}
              </small>
            </FormGroup>
            <FormGroup>
              <Label for="restaurantId">Restaurant</Label>
              <Input
                type="select"
                name="restaurantId" 
                id="restaurantId"
                value={formData.restaurantId}
                onChange={(e) => {
                  handleInputChange(e);
                  // Reset branchId when restaurant changes
                  setFormData(prevData => ({ ...prevData, restaurantId: e.target.value, branchId: '' }));
                }}
                invalid={!validation.restaurantId.valid}
                disabled={restaurantsLoading}
                required={formData.role === 'Branch_Manager' || formData.role === 'Kitchen' || 
                          formData.role === 'Delivery' || formData.role === 'POS_Operator'}
              >
                <option value="">Select a restaurant</option>
                {restaurantsLoading ? (
                  <option disabled>Loading restaurants...</option>
                ) : restaurants && restaurants.length > 0 ? (
                  restaurants.map(restaurant => (
                    <option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No restaurants available</option>
                )}
              </Input>
              <FormFeedback>{validation.restaurantId.message}</FormFeedback>
             
              {(formData.role === 'Super_Admin' || formData.role === 'admin') && (
                <small className="form-text text-muted">
                  Restaurant selection is optional for {formData.role} role.
                </small>
              )}
            </FormGroup>
               
            {formData.restaurantId && (
              <FormGroup>
                <Label for="branchId">Branch</Label>
                <Input
                  type="select"
                  name="branchId"
                  id="branchId"
                  value={formData.branchId}
                  onChange={handleInputChange}
                  disabled={loadingBranches}
                >
                  <option value="">Select a branch</option>
                  {loadingBranches ? (
                    <option disabled>Loading branches...</option>
                  ) : restaurantBranches.length > 0 ? (
                    restaurantBranches.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No branches available for this restaurant</option>
                  )}
                </Input>
                <small className="form-text text-muted">
                  Select a specific branch or leave blank to associate with all branches
                </small>
              </FormGroup>
            )}
            

          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>{' '}
          <Button color="primary" onClick={handleSaveUser} disabled={loading}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default UserManagement;