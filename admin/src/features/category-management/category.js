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
import { CategoryContext } from "../../context/CategoryContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import { BranchContext } from "../../context/BranchContext";

const CategoryManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useContext(CategoryContext);
  const { restaurants, fetchRestaurants } = useContext(RestaurantContext);
  const { fetchBranchesByRestaurant } = useContext(BranchContext);
  
  // Form state
  const [formData, setFormData] = useState({
    restaurantId: '', 
    branchId: '',
    name: '',
    description: '',
    imageUrl: '',
    tags: '',
    isActive: true
  });
  
  // State to store branches for selected restaurant
  const [restaurantBranches, setRestaurantBranches] = useState([]);

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
      branchId: '',
      name: '',
      description: '',
      imageUrl: '',
      tags: '',
      isActive: true
    });
    setRestaurantBranches([]);
  };
  
  // Function to handle editing a category
  const handleEditCategory = (category) => {
    setCurrentEditItem(category);
    setFormData({
      restaurantId: category.restaurantId || '', 
      branchId: category.branchId || '',
      name: category.name || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      tags: category.tags ? category.tags.join(', ') : '',
      isActive: category.isActive !== undefined ? category.isActive : true
    });
    setModalOpen(true);
    if (category.restaurantId) {
      fetchBranchesByRestaurant(category.restaurantId).then(branches => {
        setRestaurantBranches(branches);
      });
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (name === 'restaurantId') {
      fetchBranchesByRestaurant(value).then(branches => {
        setRestaurantBranches(branches);
        setFormData({
          ...formData,
          branchId: '',
          [name]: value
        });
      });
    }
  };
 
  

  
  // Function to handle saving a category
  const handleSaveCategory = async () => {
    // Process the tags from comma-separated string to array
    const processedFormData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    };
    
    if (currentEditItem) {
      // Update existing category
      await updateCategory(currentEditItem._id, processedFormData);
    } else {
      // Create new category
      await addCategory(processedFormData);
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
                 <h3 className="mb-0">Categories</h3>
                 </div>
                <div className="text-right d-inline-block">
                  <Button color="primary" onClick={() => {
                    setCurrentEditItem(null);
                    setModalOpen(true);
                  }}>
                    <i className="fas fa-plus mr-2"></i> Add New Category
                  </Button>
                </div>
                </CardHeader>
                <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr> 
                    <th scope="col">Name</th> 
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="font-italic text-muted mb-0">Loading categories...</p>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <p className="text-danger mb-0">Error loading categories: {error}</p>
                      </td>
                    </tr>
                  ) : categories.length > 0 ? categories.map((category) => (
                    <tr key={category._id}> 
                      <td>
                        <Media className="align-items-center">
                          {category.imageUrl && (
                            <a className="avatar rounded-circle mr-3">
                              <img
                                alt={category.name}
                                src={category.imageUrl}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = require("../../assets/img/theme/sketch.jpg");
                                }}
                              />
                            </a>
                          )}
                          <Media>
                            <span className="mb-0 text-sm font-weight-bold">
                              {category.name}
                            </span>
                          </Media>
                        </Media>
                      </td> 
                      <td>{category.description}</td>
                      <td>
                        <Badge color={category.isActive ? "success" : "warning"} className="badge-dot mr-4">
                          <i className={category.isActive ? "bg-success" : "bg-warning"} />
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
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
                                handleEditCategory(category);
                              }}
                            >
                              <i className="fas fa-edit text-primary mr-2"></i> Edit
                            </DropdownItem>
                            <DropdownItem  
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this category?")) {
                                  deleteCategory(category._id);
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
                        <p className="font-italic text-muted mb-0">No categories available</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                </Table>
                {categories.length > 0 && (
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
      
      {/* Category Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal}>
        <ModalHeader toggle={handleCloseModal}>
          {currentEditItem ? 'Edit Category' : 'Add New Category'}
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
            <Label for="branchId">Branch</Label>
            <Input
              type="select"
              name="branchId"
              id="branchId"
              value={formData.branchId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Branch</option>
              {restaurantBranches.map(branch => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </Input>
          </FormGroup>


            <FormGroup>
              <Label for="name">Name</Label>
              <Input
                type="text"
                name="name"
                id="name"
                placeholder="Category Name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label for="description">Description</Label>
              <Input
                type="textarea"
                name="description"
                id="description"
                placeholder="Category Description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="imageUrl">Image URL</Label>
              <Input
                type="text"
                name="imageUrl"
                id="imageUrl"
                placeholder="Image URL for the category"
                value={formData.imageUrl}
                onChange={handleInputChange}
              />
            </FormGroup>
            <FormGroup>
              <Label for="tags">Tags</Label>
              <Input
                type="text"
                name="tags"
                id="tags"
                placeholder="Comma-separated tags (e.g. popular, spicy)"
                value={formData.tags}
                onChange={handleInputChange}
              />
              <small className="form-text text-muted">Enter tags separated by commas</small>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />{' '}
                Active
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>{' '}
          <Button color="primary" onClick={handleSaveCategory}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default CategoryManagement;