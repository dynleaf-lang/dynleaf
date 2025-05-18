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
import { BranchContext } from "../../context/BranchContext";
import { RestaurantContext } from "../../context/RestaurantContext";

const BranchManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { branches, loading, error, createBranch, updateBranch, deleteBranch } = useContext(BranchContext);
  const { restaurants, fetchRestaurants } = useContext(RestaurantContext);
  
  // Form state
  const [formData, setFormData] = useState({
    restaurantId: '',
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
      restaurantId: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      openingHours: ''
    });
  };
  
  // Function to handle editing a branch
  const handleEditBranch = (branch) => {
    setCurrentEditItem(branch);
    setFormData({
      restaurantId: branch.restaurantId || '',
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      openingHours: branch.openingHours || ''
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
  
  // Function to handle saving a branch
  const handleSaveBranch = async () => {
    if (currentEditItem) {
      // Update existing branch
      await updateBranch(currentEditItem._id, formData);
    } else {
      // Create new branch
      await createBranch(formData);
    }
    
    handleCloseModal();
  };

  // Find restaurant name by ID
  const getRestaurantName = (id) => {
    const restaurant = restaurants.find(r => r._id === id);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
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
                 <h3 className="mb-0">Branches</h3>
                 </div>
                <div className="text-right d-inline-block">
                  <Button color="primary" onClick={() => {
                    setCurrentEditItem(null);
                    setModalOpen(true);
                  }}>
                    <i className="fas fa-plus mr-2"></i> Add New Branch
                  </Button>
                </div>
                </CardHeader>
                <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">Branch Name</th> 
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
                      <td colSpan="7" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">Loading branches...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <p className="text-danger mb-0">Error loading branches: {error}</p>
                      </td>
                    </tr>
                  ) : branches.length > 0 ? branches.map((branch) => (
                    <tr key={branch._id}>
                      <td>
                        <span className="mb-0 text-sm font-weight-bold">
                          {branch.name}
                        </span>
                      </td> 
                      <td>{branch.address}</td>
                      <td>{branch.phone}</td>
                      <td>{branch.email}</td>
                      <td>{branch.openingHours}</td>
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
                                handleEditBranch(branch);
                              }}
                            >
                              <i className="fas fa-edit text-primary mr-2"></i> Edit
                            </DropdownItem>
                            <DropdownItem  
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this branch?")) {
                                  deleteBranch(branch._id);
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
                      <td colSpan="7" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">No branches available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                </Table>
                {branches.length > 0 && (
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
      
      {/* Branch Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal}>
        <ModalHeader toggle={handleCloseModal}>
          {currentEditItem ? 'Edit Branch' : 'Add New Branch'}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="restaurantId">Restaurant</Label>
              <Input
                type="select"
                name="restaurantId"
                id="restaurantId"
                value={formData.restaurantId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Restaurant</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </Input>
            </FormGroup>
            <FormGroup>
              <Label for="name">Branch Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                placeholder="Branch Name"
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
                placeholder="Branch Address"
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
          <Button color="primary" onClick={handleSaveBranch}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default BranchManagement;