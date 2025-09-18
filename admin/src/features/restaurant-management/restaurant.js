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
  Col,
  FormGroup,
  Label,
  Input,
  FormFeedback
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect } from "react";
import { RestaurantContext } from "../../context/RestaurantContext";
import { AuthContext } from "../../context/AuthContext"; // Import AuthContext
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { countries } from "../../utils/countryList"; // Import countries list
import { indiaStates } from "../../utils/indiaStates";

const RestaurantManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { restaurants, loading, error, fetchRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } = useContext(RestaurantContext);
  const { isSuperAdmin } = useContext(AuthContext); // Access isSuperAdmin function
  const navigate = useNavigate(); // Initialize useNavigate hook
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
  state: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
  openingHours: '',
  gstRegistrations: []
  });

  const [formErrors, setFormErrors] = useState({});

  // Navigate to branches view for a specific restaurant
  const handleRestaurantClick = (restaurantId) => {
    navigate(`/admin/branches/${restaurantId}`);
  };

  // Fetch restaurants when component mounts
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    setFormErrors({});
    // Reset form data
    setFormData({
      name: '',
      address: '',
      city: '',
  state: '',
      postalCode: '',
      country: '',
      phone: '',
      email: '',
  openingHours: '',
  gstRegistrations: []
    });
  };
  
  // Function to handle editing a restaurant
  const handleEditRestaurant = (restaurant) => {
    setCurrentEditItem(restaurant);
    setFormData({
      name: restaurant.name || '',
      address: restaurant.address || '',
      city: restaurant.city || '',
  state: restaurant.state || '',
      postalCode: restaurant.postalCode || '',
      country: restaurant.country || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
  openingHours: restaurant.openingHours || '',
  gstRegistrations: restaurant.gstRegistrations || []
    });
    setModalOpen(true);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const addGstRegistration = () => {
    setFormData(prev => ({
      ...prev,
      gstRegistrations: [...(prev.gstRegistrations || []), { state: '', gstin: '', legalName: '', tradeName: '', effectiveFrom: '' }]
    }));
  };

  const updateGstRegistration = (index, key, value) => {
    setFormData(prev => {
      const list = [...(prev.gstRegistrations || [])];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, gstRegistrations: list };
    });
  };

  const removeGstRegistration = (index) => {
    setFormData(prev => {
      const list = [...(prev.gstRegistrations || [])];
      list.splice(index, 1);
      return { ...prev, gstRegistrations: list };
    });
  };
  
  // Function to validate form
  const validateForm = () => {
    const errors = {};
    const requiredFields = ['name', 'address', 'city', 'country', 'phone', 'email', 'openingHours'];
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
      }
    });
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Function to handle saving a restaurant
  const handleSaveRestaurant = async () => { 
    if (!validateForm()) {
      return;
    }
    
    try {
      if (currentEditItem) {
        // Update existing restaurant
        await updateRestaurant(currentEditItem._id, formData);
      } else {
        // Create new restaurant
        await createRestaurant(formData);
      }
      
      handleCloseModal();
    } catch (err) {
      console.error('Error saving restaurant:', err);
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
                <p>Only users with the Super_Admin role can access Restaurant Management.</p>
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
                 <h3 className="mb-0">Restaurants</h3>
                 </div>
                <div className="text-right d-inline-block">
                
                  <Button color="primary" onClick={() => {
                    setCurrentEditItem(null);
                    setModalOpen(true);
                  }}>
                    <i className="fas fa-plus mr-2"></i> Add New Restaurant
                  </Button>
                </div>
                </CardHeader>
                <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Address</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Email</th>
                    <th scope="col">Opening Hours</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="state">State</Label>
                        {formData.country === 'India' ? (
                          <Input
                            type="select"
                            name="state"
                            id="state"
                            value={formData.state}
                            onChange={handleInputChange}
                          >
                            <option value="">Select State</option>
                            {indiaStates.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </Input>
                        ) : (
                          <Input
                            type="text"
                            name="state"
                            id="state"
                            placeholder="State/Province"
                            value={formData.state}
                            onChange={handleInputChange}
                          />
                        )}
                      </FormGroup>
                    </Col>
                      <td colSpan="6" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">Loading restaurants...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="text-danger mb-0">Error loading restaurants: {error}</p>
                      </td>
                    </tr>
                  ) : restaurants && restaurants.length > 0 ? restaurants.map((restaurant) => (
                    <tr key={restaurant._id}>
                      <td>
                        <span className="mb-0 text-sm font-weight-bold text-primary" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRestaurantClick(restaurant._id)}>
                          {restaurant.name}
                        </span>
                      </td>
                      <td>{restaurant.address}</td>
                      <td>{restaurant.phone}</td>
                      <td>{restaurant.email}</td>
                      <td>{restaurant.openingHours}</td>
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
                                handleEditRestaurant(restaurant);
                              }}
                            >
                              <i className="fas fa-edit text-primary mr-2"></i> Edit
                            </DropdownItem>
                            <DropdownItem  
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this restaurant?")) {
                                  deleteRestaurant(restaurant._id);
                                }
                              }}
                            >
                              <i className="fas fa-trash text-danger mr-2"></i> Delete
                            </DropdownItem>
                            <DropdownItem
                              href="#"
                              onClick={(e) => e.preventDefault()}
                            >
                              <i className="fas fa-eye text-info mr-2"></i> View Details
                            </DropdownItem>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">No restaurants available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                </Table>
                {restaurants && restaurants.length > 0 && (
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
      
      {/* Restaurant Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal}>
        <ModalHeader toggle={handleCloseModal}>
          {currentEditItem ? 'Edit Restaurant' : 'Add New Restaurant'}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="name">Restaurant Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                placeholder="Restaurant Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.name}
              />
              {formErrors.name && <FormFeedback>{formErrors.name}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="address">Address</Label>
              <Input
                type="text"
                name="address"
                id="address"
                placeholder="Restaurant Address"
                value={formData.address}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.address}
              />
              {formErrors.address && <FormFeedback>{formErrors.address}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="city">City</Label>
              <Input
                type="text"
                name="city"
                id="city"
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.city}
              />
              {formErrors.city && <FormFeedback>{formErrors.city}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="postalCode">Postal Code</Label>
              <Input
                type="text"
                name="postalCode"
                id="postalCode"
                placeholder="Postal Code"
                value={formData.postalCode}
                onChange={handleInputChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="country">Country</Label>
              <Input
                type="select"
                name="country"
                id="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.country}
              >
                <option value="">Select Country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </Input>
              {formErrors.country && <FormFeedback>{formErrors.country}</FormFeedback>}
            </FormGroup>

            {formData.country === 'India' && (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <Label className="mb-0">GST Registrations (State specific, optional)</Label>
                  <Button color="secondary" size="sm" onClick={addGstRegistration}>
                    <i className="fas fa-plus mr-1"></i> Add State GST
                  </Button>
                </div>
                {(formData.gstRegistrations || []).length === 0 && (
                  <p className="text-muted mb-2">No GST registrations added.</p>
                )}
                {(formData.gstRegistrations || []).map((reg, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2">
                    <Row>
                      <Col md={4}>
                        <FormGroup>
                          <Label>State</Label>
                          <Input type="select" value={reg.state || ''} onChange={(e)=>updateGstRegistration(idx,'state',e.target.value)}>
                            <option value="">Select State</option>
                            {indiaStates.map((st)=> <option key={st} value={st}>{st}</option>)}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup>
                          <Label>GSTIN</Label>
                          <Input type="text" value={reg.gstin || ''} placeholder="e.g., 27ABCDE1234F1Z5" onChange={(e)=>updateGstRegistration(idx,'gstin',e.target.value)} />
                        </FormGroup>
                      </Col>
                      <Col md={4} className="d-flex align-items-end">
                        <Button color="danger" size="sm" onClick={()=>removeGstRegistration(idx)}>
                          <i className="fas fa-trash mr-1"></i> Remove
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>
            )}
            <FormGroup>
              <Label for="phone">Phone</Label>
              <Input
                type="text"
                name="phone"
                id="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.phone}
              />
              {formErrors.phone && <FormFeedback>{formErrors.phone}</FormFeedback>}
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
                required
                invalid={!!formErrors.email}
              />
              {formErrors.email && <FormFeedback>{formErrors.email}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="openingHours">Opening Hours</Label>
              <Input
                type="text"
                name="openingHours"
                id="openingHours"
                placeholder="e.g. Mon-Fri: 9am-10pm, Sat-Sun: 10am-11pm"
                value={formData.openingHours}
                onChange={handleInputChange}
                required
                invalid={!!formErrors.openingHours}
              />
              {formErrors.openingHours && <FormFeedback>{formErrors.openingHours}</FormFeedback>}
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>{' '}
          <Button color="primary" onClick={handleSaveRestaurant}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default RestaurantManagement;