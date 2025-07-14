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
  Col,
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
import axios from "axios"; // Import axios for direct API calls
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
  const { isSuperAdmin, token } = useContext(AuthContext);
  const { restaurants, loading: restaurantsLoading, error: restaurantsError, fetchRestaurants } = useContext(RestaurantContext);  
  const { branches, loading: branchesLoading, error: branchesError, fetchBranches, fetchBranchesByRestaurant } = useContext(BranchContext);
  
  // Add new state variables for verification modal
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');

  // Add form submission loading state
  const [formSubmitting, setFormSubmitting] = useState(false);
   

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '', // Added phone number field
    role: 'Branch_Manager',
    restaurantId: '',
    branchId: ''
  });

  // State to store branches for the selected restaurant
  const [restaurantBranches, setRestaurantBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // State for username uniqueness checking
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  // State for "use email as username" option
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(false);

  // Validation state
  const [validation, setValidation] = useState({
    firstName: { valid: true, message: '' },
    lastName: { valid: true, message: '' },
    username: { valid: true, message: '' },
    email: { valid: true, message: '' },
    password: { valid: true, message: '', strength: 0 },
    confirmPassword: { valid: true, message: '' },
    restaurantId: { valid: true, message: '' },
    branchId: { valid: true, message: '' }
  });
  
  const [alertMessage, setAlertMessage] = useState({
    visible: false,
    color: '',
    message: ''
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
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'Branch_Manager',
      restaurantId: '',
      branchId: ''  // Add branchId to reset
    });
    // Reset validation
    setValidation({
      firstName: { valid: true, message: '' },
      lastName: { valid: true, message: '' },
      username: { valid: true, message: '' },
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
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
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
    
    // Special handling for first name and last name to auto-generate username
    if (name === 'firstName' || name === 'lastName') {
      const updatedFormData = {
        ...formData,
        [name]: value
      };
      
      // Only auto-generate username if both first and last name have been entered
      // and username hasn't been manually edited or we're using email as username
      if (!useEmailAsUsername && updatedFormData.firstName && updatedFormData.lastName) {
        // Generate username from first name and last name (all lowercase, no spaces)
        const generatedUsername = `${updatedFormData.firstName.toLowerCase()}${updatedFormData.lastName.toLowerCase()}`;
        updatedFormData.username = generatedUsername;
        
        // Validate the new username
        validateField('username', generatedUsername);
        
        // Check if the username is already taken
        checkUsernameUniqueness(generatedUsername);
      }
      
      setFormData(updatedFormData);
      validateField(name, value);
      return;
    }
    
    // Special handling for email when "use email as username" is checked
    if (name === 'email' && useEmailAsUsername) {
      const updatedFormData = {
        ...formData,
        [name]: value,
        username: value // Set username to be the same as email
      };
      
      setFormData(updatedFormData);
      validateField(name, value);
      validateField('username', value);
      
      // Check if the username (email) is already taken
      if (value.trim()) {
        checkUsernameUniqueness(value);
      }
      return;
    }
    
    // Special handling for username to check uniqueness
    if (name === 'username') {
      if (value.trim()) {
        checkUsernameUniqueness(value);
      }
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
      case 'firstName':
        newValidation.firstName.valid = value.trim().length >= 3;
        newValidation.firstName.message = newValidation.firstName.valid ? '' : 'First name must be at least 3 characters';
        break;
        
      case 'lastName':
        newValidation.lastName.valid = value.trim().length >= 3;
        newValidation.lastName.message = newValidation.lastName.valid ? '' : 'Last name must be at least 3 characters';
        break;
        
      case 'username':
        // Don't validate username if using email as username
        if (useEmailAsUsername) {
          newValidation.username.valid = true;
          newValidation.username.message = '';
          break;
        }
        
        newValidation.username.valid = value.trim().length >= 3;
        newValidation.username.message = newValidation.username.valid ? '' : 'Username must be at least 3 characters';
        
        // Note: Username uniqueness is checked separately in the checkUsernameUniqueness function
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
  
  // Check if username is already taken
  const checkUsernameUniqueness = async (username) => {
    // Skip check for empty usernames or when editing the same user
    if (!username || (currentEditItem && currentEditItem.username === username)) {
      setUsernameExists(false);
      return;
    }
    
    setUsernameChecking(true);
    
    try {
      // Check if username exists by searching through users
      const userWithSameUsername = users.find(
        u => u.username && u.username.toLowerCase() === username.toLowerCase() && 
        (!currentEditItem || u._id !== currentEditItem._id)
      );
      
      setUsernameExists(!!userWithSameUsername);
      
      // Update validation state
      setValidation(prev => ({
        ...prev,
        username: {
          ...prev.username,
          valid: prev.username.valid && !userWithSameUsername,
          message: userWithSameUsername ? 'Username already taken' : prev.username.message
        }
      }));
    } catch (error) {
      console.error('Error checking username uniqueness:', error);
    } finally {
      setUsernameChecking(false);
    }
  };
  
  // Handle "use email as username" checkbox change
  const handleUseEmailAsUsername = (e) => {
    const isChecked = e.target.checked;
    setUseEmailAsUsername(isChecked);
    
    if (isChecked) {
      // Use email as username
      const newFormData = {
        ...formData,
        username: formData.email
      };
      setFormData(newFormData);
      validateField('username', formData.email);
      
      // Check if the email is unique when used as username
      if (formData.email) {
        checkUsernameUniqueness(formData.email);
      }
    }
  };
  
  // Function to validate all fields before submission
  const validateForm = () => {
    // Validate all fields
    validateField('firstName', formData.firstName);
    validateField('lastName', formData.lastName);
    validateField('username', formData.username);
    validateField('email', formData.email);
    if (!currentEditItem || formData.password) {
      validateField('password', formData.password);
      validateField('confirmPassword', formData.confirmPassword);
    }
    validateField('restaurantId', formData.restaurantId);
    
    // Check if all validations pass
    return validation.firstName.valid && 
           validation.lastName.valid && 
           validation.username.valid && 
           validation.email.valid && 
           (currentEditItem && !formData.password ? true : validation.password.valid) &&
           (currentEditItem && !formData.password ? true : validation.confirmPassword.valid) &&
           validation.restaurantId.valid;
  };
  
  // Function to handle saving a user
  const handleSaveUser = async () => {
    // Re-validate all fields
    if (!validateForm()) {
      setAlertMessage({
        visible: true,
        color: 'danger',
        message: 'Please fix the validation errors before saving.'
      });
      return;
    }
    
    try {
      // Show loading state in UI
      setFormSubmitting(true);
      
      // Create a copy of form data for submission
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phoneNumber: formData.phoneNumber || ''
      };
      
      // Only add restaurantId and branchId if they have values
      if (formData.restaurantId && formData.restaurantId.trim() !== '') {
        userData.restaurantId = formData.restaurantId;
      }
      
      if (formData.branchId && formData.branchId.trim() !== '') {
        userData.branchId = formData.branchId;
      }
      
      console.log('Prepared user data:', { ...userData, password: '***HIDDEN***' });
      
      if (currentEditItem) {
        // Update existing user - remove password if empty
        if (!userData.password) {
          delete userData.password;
        }
        
        await updateUser(currentEditItem._id, userData);
        await fetchUsers();
        handleCloseModal();
      } else {
        // Use axios instead of fetch for creating new users
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        
        console.log('Using standard registration endpoint with axios');
        
        try {
          const response = await axios({
            method: 'POST',
            url: `${apiUrl}/api/users/register`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            data: userData  // Axios automatically stringifies the data
          });
          
          console.log('User created successfully:', response.data);
          
          await fetchUsers();
          
          setAlertMessage({
            visible: true,
            color: 'success',
            message: 'User created successfully! A verification email has been sent to the user.'
          });
          
          handleCloseModal();
        } catch (axiosError) {
          console.error('Registration error with detailed info:', {
            message: axiosError.message,
            response: axiosError.response?.data,
            status: axiosError.response?.status
          });
          
          // Extract the most useful error message
          let errorMessage = 'Registration failed';
          if (axiosError.response?.data?.message) {
            errorMessage = axiosError.response.data.message;
          } else if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          } else if (axiosError.message) {
            errorMessage = axiosError.message;
          }
          
          throw new Error(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error saving user:', err);
      
      let errorMessage = 'Failed to save user';
      if (err.message) {
        errorMessage = err.message;
      }
      
      setAlertMessage({
        visible: true,
        color: 'danger',
        message: errorMessage
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Function to resend verification email
  const handleResendVerification = async (email) => {
    try {
      setFormSubmitting(true);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      // Log the request for debugging
      console.log('Sending verification email request for:', email);
      
      // Use axios instead of fetch for consistent error handling
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}/api/users/verify-email`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: { email }
      });
      
      console.log('Verification email sent successfully:', response.data);
      
      setAlertMessage({
        visible: true,
        color: 'success',
        message: 'Verification email has been sent successfully. Please check your inbox.'
      });
      
      // Show the alert at the top of the page
      window.scrollTo(0, 0);
      
    } catch (err) {
      console.error('Error sending verification email:', err);
      
      // Check if it's a network error
      if (err.message && (err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        setAlertMessage({
          visible: true,
          color: 'danger',
          message: 'Network error. Please check your internet connection and try again.'
        });
      } else {
        setAlertMessage({
          visible: true,
          color: 'danger',
          message: `Failed to send verification email: ${err.response?.data?.message || err.message}`
        });
      }
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Add state for showing OTP for development/testing purposes
  const [showOtp, setShowOtp] = useState(false);
  
  // Function to handle OTP verification
  const handleVerifyEmail = async () => {
    if (!verificationOtp) {
      setAlertMessage({
        visible: true,
        color: 'danger',
        message: 'Please enter the OTP sent to your email'
      });
      return;
    }
    
    try {
      setFormSubmitting(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}/api/users/confirm-verification`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: { otp: verificationOtp }
      });
      
      console.log('Email verification successful:', response.data);
      
      // Close the verification modal
      setVerificationModalOpen(false);
      
      // Show success message
      setAlertMessage({
        visible: true,
        color: 'success',
        message: 'Email verified successfully!'
      });
      
      // Refresh user list to show updated verification status
      await fetchUsers();
      
      // Reset form
      setVerificationEmail('');
      setVerificationOtp('');
      
    } catch (err) {
      console.error('Error verifying email:', err);
      
      setAlertMessage({
        visible: true,
        color: 'danger',
        message: err.response?.data?.message || 'Failed to verify email. Please check the OTP and try again.'
      });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  // Only Super_Admin should be able to access this page
  if (!isSuperAdmin()) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <div className="col-lg-6">
            <div className="text-center">
              <h1 className="display-4 text-danger">Access Denied</h1>
              <p className="lead text-muted">
                You do not have permission to access this page. Please contact the administrator if you believe this is an error.
              </p>
              <Button color="primary" href="/admin/dashboard" className="mt-4">
                <i className="fas fa-arrow-left mr-2"></i> Back to Dashboard
              </Button>
            </div>
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
                    <th scope="col">Username</th>
                    <th scope="col">Email</th>
                    <th scope="col">Verified</th>
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
                      <td colSpan="7" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">Loading users...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <p className="text-danger mb-0">Error loading users: {error}</p>
                      </td>
                    </tr>
                  ) : users && users.length > 0 ? users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <span className="mb-0 text-sm font-weight-bold">
                          {user.firstName} {user.lastName || user.name}
                        </span>
                      </td>
                      <td>{user.username || 'N/A'}</td>
                      <td>{user.email}</td>
                      <td>
                        <Badge color={
                          user.isEmailVerified ? 'success' : 'danger'
                        } pill>
                          {user.isEmailVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </td>
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
                            {!user.isEmailVerified && (
                              <DropdownItem
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Send verification email
                                  handleResendVerification(user.email);
                                  // Open verification modal with user's email
                                  setVerificationEmail(user.email);
                                  setVerificationOtp('');
                                  setVerificationModalOpen(true);
                                }}
                              >
                                <i className="fas fa-envelope text-info mr-2"></i> Verify Email
                              </DropdownItem>
                            )}
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
                      <td colSpan="7" className="text-center py-4">
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
      <Modal isOpen={modalOpen} toggle={handleCloseModal} size="lg">
        <ModalHeader toggle={handleCloseModal} className={`bg-gradient-${currentEditItem ? 'info' : 'primary'} text-white py-3`}>
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className={`fas ${currentEditItem ? 'fa-user-edit' : 'fa-user-plus'} mr-2`}></i>
              {currentEditItem ? 'Edit User' : 'Add New User'}
            </h4>
            <p className="text-white-50 mb-0 small">
              {currentEditItem ? 'Update user information' : 'Create a new user account'}
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {alertMessage.visible && (
            <Alert color={alertMessage.color} toggle={() => setAlertMessage({ ...alertMessage, visible: false })}>
              {alertMessage.message}
            </Alert>
          )}
          <Form>
            {/* Personal Information Section */}
            <h6 className="heading-small text-muted mb-3">
              User Information
            </h6>
            <div className="pl-lg-2">
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="firstName">First Name</Label>
                    <Input
                      className="form-control-alternative"
                      type="text"
                      name="firstName"
                      id="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      invalid={!validation.firstName.valid}
                      required
                    />
                    <FormFeedback>{validation.firstName.message}</FormFeedback>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="lastName">Last Name</Label>
                    <Input
                      className="form-control-alternative"
                      type="text"
                      name="lastName"
                      id="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      invalid={!validation.lastName.valid}
                      required
                    />
                    <FormFeedback>{validation.lastName.message}</FormFeedback>
                  </FormGroup>
                </Col>
              </Row>

              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="username">Username</Label>
                    <Input
                      className="form-control-alternative"
                      type="text"
                      name="username"
                      id="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleInputChange}
                      invalid={!validation.username.valid}
                      disabled={useEmailAsUsername}
                      required
                    />
                    {usernameChecking && <small className="text-info"><i className="fas fa-spinner fa-spin mr-1"></i> Checking username...</small>}
                    {usernameExists && <small className="text-danger"><i className="fas fa-exclamation-circle mr-1"></i> Username already taken</small>}
                    <FormFeedback>{validation.username.message}</FormFeedback>
                  </FormGroup>
                  <FormGroup className="mt-2" check>
                    <Label check>
                      <Input 
                        type="checkbox" 
                        checked={useEmailAsUsername}
                        onChange={handleUseEmailAsUsername}
                      />{' '}
                      Use email as username
                    </Label>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="email">Email</Label>
                    <Input
                      className="form-control-alternative"
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
                </Col>
              </Row>

              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      className="form-control-alternative"
                      type="tel"
                      name="phoneNumber"
                      id="phoneNumber"
                      placeholder="Phone Number"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                    />
                    <small className="form-text text-muted">
                      <i className="fas fa-info-circle mr-1"></i>Format: +1 (555) 123-4567
                    </small>
                  </FormGroup>
                </Col>
              </Row>
            </div>

            {/* Divider */}
            <hr className="my-4" />

            {/* Password Section */}
            <h6 className="heading-small text-muted mb-3">
              Password
            </h6>
            <div className="pl-lg-2">
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="password">
                      {currentEditItem ? 'New Password' : 'Password'} {currentEditItem && <small className="text-muted">(leave blank to keep current)</small>}
                    </Label>
                    <Input
                      className="form-control-alternative"
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
                      <div className="mt-2">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <div className="progress" style={{ height: "6px", flex: "1", marginRight: "10px" }}>
                            <div 
                              className={`progress-bar bg-${getPasswordStrengthLabel(validation.password.strength).color}`} 
                              role="progressbar" 
                              style={{ width: `${(validation.password.strength / 5) * 100}%` }}
                              aria-valuenow={validation.password.strength}
                              aria-valuemin="0" 
                              aria-valuemax="5">
                            </div>
                          </div>
                          <Badge color={getPasswordStrengthLabel(validation.password.strength).color}>
                            {getPasswordStrengthLabel(validation.password.strength).text}
                          </Badge>
                        </div>
                        <small className="form-text text-muted">
                          Include uppercase, lowercase, numbers, and special characters
                        </small>
                      </div>
                    )}
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      className="form-control-alternative"
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
                </Col>
              </Row>
            </div>

            {/* Divider */}
            <hr className="my-4" />

            {/* Role & Assignment Section */}
            <h6 className="heading-small text-muted mb-3">
              Role & Restaurant Assignment
            </h6>
            <div className="pl-lg-2">
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="role">Role</Label>
                    <Input
                      className="form-control-alternative"
                      type="select"
                      name="role"
                      id="role"
                      value={formData.role}
                      onChange={handleInputChange}
                    >
                      <option value="Branch_Manager">Branch Manager</option> 
                      {isSuperAdmin() && <option value="Super_Admin">Super Admin</option>}
                    </Input>
                    <small className="form-text text-muted">
                      {(formData.role === 'Branch_Manager' || formData.role === 'Kitchen' || 
                      formData.role === 'Delivery' || formData.role === 'POS_Operator') ? 
                        <span><i className="fas fa-info-circle mr-1"></i>This role requires a restaurant association</span> : 
                        <span><i className="fas fa-info-circle mr-1"></i>Restaurant association is optional</span>}
                    </small>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label className="form-control-label" htmlFor="restaurantId">Restaurant</Label>
                    <Input
                      className="form-control-alternative"
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
                  </FormGroup>
                </Col>
              </Row>

              {formData.restaurantId && (
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <Label className="form-control-label" htmlFor="branchId">Branch</Label>
                      <Input
                        className="form-control-alternative"
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
                          <option disabled>No branches available</option>
                        )}
                      </Input>
                      <small className="form-text text-muted">
                        <i className="fas fa-info-circle mr-1"></i>Leave blank to associate with all branches
                      </small>
                    </FormGroup>
                  </Col>
                </Row>
              )}
            </div>
          </Form>
        </ModalBody>
        <ModalFooter className="pt-0">
          <Button color="secondary" onClick={handleCloseModal} className="font-weight-bold">
            <i className="fas fa-times mr-2"></i>Cancel
          </Button>{' '}
          <Button color={currentEditItem ? "info" : "primary"} onClick={handleSaveUser} disabled={formSubmitting} className="font-weight-bold">
            <i className={`fas ${currentEditItem ? 'fa-save' : 'fa-plus-circle'} mr-2`}></i>
            {formSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                {currentEditItem ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              currentEditItem ? 'Update' : 'Save'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Verification Modal */}
      <Modal isOpen={verificationModalOpen} toggle={() => setVerificationModalOpen(false)} size="md">
        <ModalHeader toggle={() => setVerificationModalOpen(false)} className="bg-gradient-info text-white">
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className="fas fa-envelope mr-2"></i>Verify Email Address
            </h4>
            <p className="text-white-50 mb-0 small">
              Verify the user's email address to activate their account
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {alertMessage.visible && (
            <Alert color={alertMessage.color} toggle={() => setAlertMessage({ ...alertMessage, visible: false })}>
              {alertMessage.message}
            </Alert>
          )}

          <div className="text-center mb-4">
            <div className="icon icon-shape icon-shape-primary rounded-circle mb-3 shadow">
              <i className="fas fa-shield-alt fa-2x"></i>
            </div>
            <h4>Verify Email Address</h4>
            <p className="text-muted">
              An OTP verification code was sent to the user's email address. 
              Enter the code below to verify the account.
            </p>
          </div>

          <Form>
            <FormGroup>
              <Label className="form-control-label" htmlFor="verificationEmail">Email Address</Label>
              <Input
                className="form-control-alternative"
                type="email"
                name="verificationEmail"
                id="verificationEmail"
                placeholder="Email Address"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                disabled
                required
              />
              <small className="form-text text-muted">
                <i className="fas fa-info-circle mr-1"></i>
                This is the email address to which the OTP was sent
              </small>
            </FormGroup>
            <FormGroup>
              <Label className="form-control-label" htmlFor="verificationOtp">Verification Code (OTP)</Label>
              <Input
                className="form-control-alternative form-control-lg text-center"
                type="text"
                name="verificationOtp"
                id="verificationOtp"
                placeholder="Enter 6-digit code"
                value={verificationOtp}
                onChange={(e) => setVerificationOtp(e.target.value)}
                maxLength={6}
                style={{ fontSize: '24px', letterSpacing: '0.5rem' }}
                required
              />
            </FormGroup>

            <div className="text-center mt-4">
              <Button color="secondary" className="mr-2" onClick={() => setVerificationModalOpen(false)}>
                <i className="fas fa-times mr-1"></i> Cancel
              </Button>
              <Button color="primary" onClick={handleVerifyEmail} disabled={formSubmitting || !verificationOtp || verificationOtp.length !== 6}>
                {formSubmitting ? (
                  <><span className="spinner-border spinner-border-sm mr-1"></span> Verifying...</>
                ) : (
                  <><i className="fas fa-check-circle mr-1"></i> Verify Email</>
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <Button color="link" size="sm" onClick={() => handleResendVerification(verificationEmail)}>
                <i className="fas fa-paper-plane mr-1"></i> Resend verification code
              </Button>
            </div>

            {showOtp && (
              <Alert color="info" className="mt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Development Mode:</strong> Here's the OTP for testing:
                    <div className="mt-1 bg-light p-2 rounded border text-center font-weight-bold" style={{fontSize: '1.5rem', letterSpacing: '0.25rem'}}>
                      {verificationOtp}
                    </div>
                  </div>
                  <div>
                    <Button color="link" className="p-0" onClick={() => setShowOtp(false)}>
                      <i className="fas fa-times"></i>
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
          </Form>
        </ModalBody>
      </Modal>
    </>
  );
};

export default UserManagement;