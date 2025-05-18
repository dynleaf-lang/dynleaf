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
  Label,
  Input
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect } from "react";
import { RestaurantContext } from "../../context/RestaurantContext";

const RestaurantManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { restaurants, loading, error, fetchRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } = useContext(RestaurantContext);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    openingHours: ''
  });

  // Fetch restaurants when component mounts
  useEffect(() => {
    fetchRestaurants();
  }, []);

  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    // Reset form data
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      openingHours: ''
    });
  };
  
  // Function to handle editing a restaurant
  const handleEditRestaurant = (restaurant) => {
    setCurrentEditItem(restaurant);
    setFormData({
      name: restaurant.name || '',
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      openingHours: restaurant.openingHours || ''
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
  };
  
  // Function to handle saving a restaurant
  const handleSaveRestaurant = async () => {
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
                        <span className="mb-0 text-sm font-weight-bold">
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
              />
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
              />
            </FormGroup>
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
              />
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
              />
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
              />
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