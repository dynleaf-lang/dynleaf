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
  Input,
  Alert,
  CustomInput
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CategoryContext } from "../../context/CategoryContext";
import { RestaurantContext } from "../../context/RestaurantContext";  
import { BranchContext } from "../../context/BranchContext";
import { AuthContext } from "../../context/AuthContext";  
import { handleTagsChange, handleTagKeyDown, removeTag } from "../../components/Utils/handleTagsChange"; // Import tag utilities

const CategoryManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { 
    categories, 
    categoryTree, 
    loading, 
    error, 
    fetchCategories, 
    fetchCategoryTree,
    getChildCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    uploadImage, 
    getCategoryById
  } = useContext(CategoryContext);
  const { restaurants, fetchRestaurants } = useContext(RestaurantContext);
  const { fetchBranchesByRestaurant } = useContext(BranchContext);
  const { isSuperAdmin, user } = useContext(AuthContext);   
  
  // Reference to the tags input field
  const tagsInputRef = useRef(null);
   
  // State for restaurant filter (only for super admin)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    restaurantId: user && user.restaurantId ? user.restaurantId : '', 
    branchId: user && user.branchId ? user.branchId : '',
    parentCategory: null,
    name: '',
    description: '',
    imageUrl: '',
    imageFile: null,
    tags: [],
    isActive: true
  });
  
  // State for upload status
  const [uploadStatus, setUploadStatus] = useState({
    loading: false,
    error: null,
    success: false
  });
 
 
  
  
  
  // State to store branches for selected restaurant
  const [restaurantBranches, setRestaurantBranches] = useState([]);
  
  // State to store categories with matched user data
  const [categoriesWithUsers, setCategoriesWithUsers] = useState([]);

  // Fetch restaurants when component mounts - UPDATED: Added empty dependency array
  useEffect(() => {
    fetchRestaurants();
  }, []); // Empty dependency array ensures this only runs once

  // Fetch categories when component mounts or user changes - UPDATED: Removed fetchCategories from deps
  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]); // Removed fetchCategories from dependencies to avoid loop

  // Match categories with users based on restaurantId - UPDATED: Removed console.logs
  useEffect(() => {
    // Set categories directly without filtering
    setCategoriesWithUsers(categories || []);
  }, [categories]); // Only depend on categories
  // Filter categories based on user role and selected restaurant
  const filteredCategories = categoriesWithUsers ? categoriesWithUsers.filter(category => {
    // For super admin, show all categories or filter by selected restaurant
    if (isSuperAdmin()) {
      if (selectedRestaurantId) {
        // Compare as strings to handle different types (ObjectId vs String)
        return String(category.restaurantId) === String(selectedRestaurantId);
      }
      return true; // Show all if no restaurant is selected
    }
    
    // For regular users, only show categories from their restaurant (compare as strings)
    return user && user.restaurantId ? 
      String(category.restaurantId) === String(user.restaurantId) : 
      false;
  }) : [];
  
  // Function to flatten the category tree into a list with proper level indications
  const flattenCategoryTree = useCallback((tree, level = 0) => {
    if (!tree || tree.length === 0) return [];
    
    return tree.reduce((acc, category) => {
      // Add the current category with its level
      const categoryWithLevel = { ...category, level };
      acc.push(categoryWithLevel);
      
      // If there are children, flatten them and add them to the result
      if (category.children && category.children.length > 0) {
        const flattenedChildren = flattenCategoryTree(category.children, level + 1);
        acc.push(...flattenedChildren);
      }
      
      return acc;
    }, []);
  }, []);
  
  // Use category tree for hierarchical display if available, otherwise fall back to filtered categories
  const displayCategories = useMemo(() => {
    if (categoryTree && categoryTree.length > 0) {
      return flattenCategoryTree(categoryTree);
    }
    return filteredCategories;
  }, [categoryTree, filteredCategories, flattenCategoryTree]);

 
  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    // Reset form data
    setFormData({
      restaurantId: user && user.restaurantId ? user.restaurantId : '',
      branchId: user && user.branchId ? user.branchId : '',
      parentCategory: null,
      name: '',
      description: '',
      imageUrl: '',
      imageFile: null,
      tags: [],
      isActive: true
    });
    setRestaurantBranches([]);
    setUploadStatus({
      loading: false,
      error: null,
      success: false
    });
  };
  
  // Function to handle editing a category - memoized to prevent unnecessary re-renders
  const handleEditCategory = useCallback((category) => {
    setCurrentEditItem(category);
    
    // Ensure parentCategory is properly formatted as an object with _id if it exists
    let parentCategoryObj = null;
    if (category.parentCategory) {
      // If parentCategory is already an object with _id, use it directly
      if (typeof category.parentCategory === 'object' && category.parentCategory._id) {
        parentCategoryObj = { _id: category.parentCategory._id };
      } 
      // If parentCategory is just the ID string
      else if (typeof category.parentCategory === 'string') {
        parentCategoryObj = { _id: category.parentCategory };
      }
    }
    
    setFormData({
      restaurantId: category.restaurantId || '',
      branchId: category.branchId || '',
      parentCategory: parentCategoryObj,
      name: category.name || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      imageFile: null,
      tags: Array.isArray(category.tags) ? category.tags : (category.tags ? [category.tags] : []),
      isActive: category.isActive !== undefined ? category.isActive : true
    });
    
    // Load branches for this restaurant
    if (category.restaurantId) {
      fetchBranchesByRestaurant(category.restaurantId)
        .then(branches => setRestaurantBranches(branches || []));
    }
    
    setModalOpen(true);
  }, [fetchBranchesByRestaurant]);
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'restaurantId' && value) {
      // When restaurant changes, reset branch and fetch new branches
      setFormData({
        ...formData,
        restaurantId: value,
        branchId: ''  // Reset branch selection
      });
      
      // Fetch branches for the selected restaurant
      fetchBranchesByRestaurant(value)
        .then(branches => setRestaurantBranches(branches || []));
    } else if (name === 'parentCategory') {
      // Handle parent category specifically as an object with _id
      if (value) {
        // Find the selected category object to get its details
        const selectedCategory = categories.find(cat => cat._id === value);
        setFormData({
          ...formData,
          parentCategory: selectedCategory ? { _id: value } : null
        });
      } else {
        // If no parent category selected, set to null
        setFormData({
          ...formData,
          parentCategory: null
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };
  
  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Update form with file and create temporary preview URL
      setFormData({
        ...formData,
        imageFile: file,
        imageUrl: URL.createObjectURL(file) // Create temporary preview URL
      });
      
      // Set upload status to loading
      setUploadStatus({
        loading: true,
        error: null,
        success: false
      });
      
      // Upload the image to server
      uploadImage(file)
        .then(response => {
          if (response.success && response.data && response.data.file) {
            // Update with the real server URL once upload completes
            setFormData(prevData => ({
              ...prevData,
              imageUrl: response.data.file.url
            }));
            
            // Update upload status to success
            setUploadStatus({
              loading: false,
              error: null,
              success: true
            });
          } else {
            // Handle upload failure
            setUploadStatus({
              loading: false,
              error: response.error || "Image upload failed. Please try again.",
              success: false
            });
          }
        })
        .catch(error => {
          console.error("Error uploading image:", error);
          setUploadStatus({
            loading: false,
            error: "Image upload failed. Please try again.",
            success: false
          });
        });
    }
  };
  
  // Handle tags input change
  const handleTagsInputChange = (e) => {
    const result = handleTagsChange(e, formData, setFormData);
    if (result.shouldClearInput) {
      e.target.value = '';
    }
  };
  
  // Handle tag key down events
  const handleTagsKeyDown = (e) => {
    const result = handleTagKeyDown(e, formData, setFormData);
    if (result.shouldClearInput) {
      e.target.value = '';
    }
  };
  
  // Handle remove tag
  const handleRemoveTag = (tag) => {
    removeTag(tag, formData, setFormData);
    // Focus back on the input after removing a tag
    if (tagsInputRef.current) {
      tagsInputRef.current.focus();
    }
  };
    // Function to handle saving a category
  const handleSaveCategory = async () => {
    // Validate form data
    if (!formData.name) {  
      alert("Please fill in the category name.");
      return;
    }
    
    // Ensure a restaurant is selected
    if (!formData.restaurantId) {
      alert("Please select a restaurant.");
      return;
    }
    
    // For debugging - log the form data being sent
    console.log('Saving category with data:', formData);
      try {
      if (currentEditItem) {
        // Update existing category
        const result = await updateCategory(currentEditItem._id, formData);
        if (!result.success) {
          throw new Error(result.error || "Failed to update category");
        }
      } else {
        // Create new category
        await createCategory(formData);
      }
      
      // Close modal and refresh categories list and tree
      handleCloseModal();
      await fetchCategories(); // Fetch regular categories list
      
      // Also refresh category tree for hierarchical display
      if (selectedRestaurantId || (user && user.restaurantId)) {
        const restaurantId = selectedRestaurantId || user.restaurantId;
        const branchId = user?.branchId || null;
        await fetchCategoryTree(restaurantId, branchId);
      }
    } catch (err) {
      console.error("Error saving category:", err);
      alert(err.message || "Failed to save category. Please try again.");
    }
  };

  // Find restaurant name by ID - memoized to prevent unnecessary re-renders
  const getRestaurantName = useCallback((id) => {
    const restaurant = restaurants.find(r => r._id === id);
    return restaurant ? restaurant.name : 'Unknown Restaurant';
  }, [restaurants]);

  // Effect to load branches when a restaurant is selected or when a category is being edited
  // UPDATED: Optimized with proper dependency management and memoization
  useEffect(() => {
    // Only fetch branches when we actually need them and have a restaurant ID
    const restaurantId = currentEditItem?.restaurantId || formData.restaurantId;
    
    if (restaurantId) {
      fetchBranchesByRestaurant(restaurantId)
        .then(branches => setRestaurantBranches(branches || []));
    }
  }, [currentEditItem?._id, formData.restaurantId]); // Reduced dependencies to only what's needed
  // Fetch category tree for the selected restaurant
  useEffect(() => {
    if (selectedRestaurantId || (user && user.restaurantId)) {
      const restaurantId = selectedRestaurantId || user.restaurantId;
      const branchId = user?.branchId || null;
      fetchCategoryTree(restaurantId, branchId);
    }
  }, [selectedRestaurantId, user, fetchCategoryTree, categories]); // Add categories as a dependency to refresh tree when categories change
    // Get parent category name
  const getParentCategoryName = useCallback((parentId) => { 
    if (!parentId) return null;
    if (!parentId._id) return 'Unknown Category';
    
    const parent = categories.find(cat => cat._id === parentId._id);  
    return parent ? parent.name : 'Unknown Category';
  }, [categories]);
    // Format category name with indentation based on level
  const formatCategoryName = (category) => {
    const level = category.level || 0;
    const indent = level > 0 ? Array(level).fill('\u00A0\u00A0\u00A0\u00A0').join('') : '';
    
    return (
      <div>
        {indent}
        {level > 0 && (
          <span className="category-hierarchy-indicator">
            <i className="fas fa-level-up-alt fa-rotate-90 mr-2 text-muted"></i>
            {/* Visual connector line */}
            <span 
              className="connector-line" 
              style={{ 
                borderLeft: '1px dashed #ccc',
                position: 'absolute',
                height: level > 1 ? '20px' : '10px',
                left: 10 + ((level - 1) * 20), 
                top: -10
              }}
            ></span>
          </span>
        )}
        
        <span className={level > 0 ? "ml-1" : ""}>
          {category.name}
        </span>
        
        {/* Only show parent category name if not using the tree structure */}
        {!categoryTree.length > 0 && category.parentCategory && (
          <small className="text-muted ml-2">
            (Parent: {getParentCategoryName(category.parentCategory)})
          </small>
        )}
      </div>
    );
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
                    {/* Restaurant filter only for Super Admin */}
                    {isSuperAdmin() && (
                      <FormGroup className="d-inline-block mr-3">
                        <Input
                          type="select"
                          name="restaurantFilter"
                          id="restaurantFilter"
                          value={selectedRestaurantId}
                          onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        >
                          <option value="">All Restaurants</option>
                          {restaurants && restaurants.map(restaurant => (
                            <option key={restaurant._id} value={restaurant._id}>
                              {restaurant.name}
                            </option>
                          ))}
                        </Input>
                      </FormGroup>
                    )}                    <Button 
                      color="info" 
                      size="sm" 
                      className="mr-2"
                      onClick={async () => {
                        // Refresh both categories and category tree
                        await fetchCategories();
                        if (selectedRestaurantId || (user && user.restaurantId)) {
                          const restaurantId = selectedRestaurantId || user.restaurantId;
                          const branchId = user?.branchId || null;
                          await fetchCategoryTree(restaurantId, branchId);
                        }
                      }}
                      disabled={loading}
                    >
                      <i className="fas fa-sync-alt mr-1"></i> 
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button 
                      color="primary" 
                      size="sm"
                      onClick={() => setModalOpen(true)}
                    >
                      <i className="fas fa-plus mr-1"></i> 
                      Add New
                    </Button>
                  </div>
                </CardHeader>
                
                {error && (
                  <Alert color="danger" className="m-3">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Error: {error}                    <Button 
                      color="link" 
                      className="alert-link ml-2" 
                      size="sm"
                      onClick={async () => {
                        await fetchCategories();
                        if (selectedRestaurantId || (user && user.restaurantId)) {
                          const restaurantId = selectedRestaurantId || user.restaurantId;
                          const branchId = user?.branchId || null;
                          await fetchCategoryTree(restaurantId, branchId);
                        }
                      }}
                    >
                      Try Again
                    </Button>
                  </Alert>
                )}
                
                {!user?.restaurantId && !isSuperAdmin() && (
                  <Alert color="warning" className="m-3">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    <strong>Restaurant Not Assigned:</strong> Your account does not have a restaurant assigned. 
                    Please contact an administrator to assign a restaurant to your account before managing categories.
                  </Alert>
                )}

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
                        <td colSpan="5" className="text-center py-4">
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          <span className="font-italic text-muted mb-0">Loading categories...</span>
                        </td>
                      </tr>                    ) : !displayCategories || displayCategories.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <p className="font-italic text-muted mb-0">No categories available</p>
                          <small className="text-muted d-block mt-2">
                            {!error ? "Add a new category to get started." : "There was an error fetching categories. Please try refreshing."}
                          </small>
                        </td>
                      </tr>
                    ) : (
                      displayCategories.map((category) => (
                        <tr 
                          key={category._id} 
                          className={category.level > 0 ? "child-category-row" : ""}
                          style={{ backgroundColor: category.level > 0 ? `rgba(0,0,0,${0.02 * category.level})` : 'transparent' }}
                        >
                          <td>
                            <Media className="align-items-center">
                              {category.imageUrl && (
                                <a
                                  className="avatar rounded-circle mr-3"
                                  href="#"
                                  onClick={(e) => e.preventDefault()}
                                >
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
                                  {formatCategoryName(category)}
                                </span>
                                {/* Display tags as badges */}
                                <div className="ml-2">
                                  {category.tags && category.tags.length > 0 && 
                                    category.tags.map((tag, index) => (
                                      <Badge key={index} color="info" pill className="mr-1">
                                        {tag}
                                      </Badge>
                                    ))
                                  }
                                </div>
                              </Media>
                            </Media>
                          </td>
                          <td>
                            {category.description ? (
                              category.description.length > 50 ? 
                                `${category.description.substring(0, 50)}...` : 
                                category.description
                            ) : (
                              <span className="text-muted">No description</span>
                            )}
                          </td> 
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
                                </DropdownItem>                                <DropdownItem  
                                  onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this category?")) {
                                      const result = await deleteCategory(category._id);
                                      if (!result.success) {
                                        alert(result.error || "Failed to delete category. Please try again.");
                                      } else {
                                        // Successfully deleted - refresh category tree as well
                                        if (selectedRestaurantId || (user && user.restaurantId)) {
                                          const restaurantId = selectedRestaurantId || user.restaurantId;
                                          const branchId = user?.branchId || null;
                                          fetchCategoryTree(restaurantId, branchId);
                                        }
                                      }
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
                      ))
                    )}
                  </tbody>
                </Table>
                {displayCategories && displayCategories.length > 0 && (
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
      
      {/* Category Modal */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal}>
        <ModalHeader toggle={handleCloseModal}>
          {currentEditItem ? `Edit Category: ${currentEditItem.name}` : 'Add New Category'}
        </ModalHeader>
        <ModalBody>
          <Form>
            {/* Restaurant selection - only visible to Super_Admin */}
            {isSuperAdmin() ? (
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
            ) : (
              /* Hidden input for non-Super_Admin to maintain the value */
              <Input 
                type="hidden" 
                name="restaurantId" 
                value={user?.restaurantId || ''} 
              />
            )}

            {/* Branch selection - only visible to Super_Admin */}
            {isSuperAdmin() && formData.restaurantId && (
              <FormGroup>
                <Label for="branchId">Branch (Optional)</Label>
                <Input
                  type="select"
                  name="branchId"
                  id="branchId"
                  value={formData.branchId}
                  onChange={handleInputChange}
                >
                  <option value="">All Branches</option>
                  {restaurantBranches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </Input>
                <small className="form-text text-muted">
                  Leave empty to make this category available to all branches
                </small>
              </FormGroup>
            )}
            
            {/* Hidden input for non-Super_Admin to maintain branch value */}
            {!isSuperAdmin() && (
              <Input 
                type="hidden" 
                name="branchId" 
                value={user?.branchId || ''} 
              />
            )}

            <FormGroup>
              <Label for="name">Category Name*</Label>
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
                rows="3"
              />
            </FormGroup>
            <FormGroup>
              <Label for="image">Image</Label>
              <CustomInput
                type="file"
                name="image"
                id="image"
                onChange={handleFileChange}
                accept="image/*"
                label={formData.imageFile ? formData.imageFile.name : "Choose an image"}
              />
              {uploadStatus.loading && (
                <div className="mt-2">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span className="font-italic text-muted">Uploading image...</span>
                </div>
              )}
              {uploadStatus.error && (
                <Alert color="danger" className="mt-2">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {uploadStatus.error}
                </Alert>
              )}
              {uploadStatus.success && (
                <Alert color="success" className="mt-2">
                  <i className="fas fa-check-circle mr-2"></i>
                  Image uploaded successfully!
                </Alert>
              )}
              {formData.imageUrl && (
                <div className="mt-2 position-relative" style={{ display: 'inline-block' }}>
                  <img 
                    src={formData.imageUrl} 
                    alt="Category preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px',
                      borderRadius: '4px'
                    }} 
                  />
                  <button
                    type="button"
                    className="close"
                    aria-label="Remove image"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        imageUrl: "",
                        imageFile: null
                      });
                      
                      // If it's a blob URL, revoke it to free up memory
                      if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(formData.imageUrl);
                      }
                      
                      setUploadStatus({
                        loading: false,
                        error: null,
                        success: false
                      });
                    }}
                    style={{ 
                      position: 'absolute', 
                      top: '5px', 
                      right: '5px', 
                      background: 'white', 
                      borderRadius: '50%', 
                      width: '24px', 
                      height: '24px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <span aria-hidden="true" style={{ color: '#dc3545' }}>&times;</span>
                  </button>
                </div>
              )}
              {!formData.imageFile && !formData.imageUrl && (
                <div className="mt-2">
                  <small className="text-muted">
                    Recommended image size: 500x500 pixels. Max file size: 2MB.
                  </small>
                </div>
              )}
            </FormGroup>
            <FormGroup>
              <Label for="tags">Tags</Label>
              <Input
                type="text"
                name="tags"
                id="tags"
                placeholder="Type and press Enter or comma to add tags"
                onChange={handleTagsInputChange}
                onKeyDown={handleTagsKeyDown}
                innerRef={tagsInputRef}
              />
              <small className="form-text text-muted">Press Enter or type comma to add a tag</small>
              {formData.tags.length > 0 && (
                <div className="mt-2">
                  {formData.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      color="info" 
                      className="mr-1 mb-1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <span className="ml-1">&times;</span>
                    </Badge>
                  ))}
                </div>
              )}
            </FormGroup>
            {/* Parent Category selection - for all users */}            <FormGroup>
              <Label for="parentCategory">Parent Category</Label>
              <Input
                type="select"
                name="parentCategory"
                id="parentCategory"
                value={formData.parentCategory ? formData.parentCategory._id : ''}
                onChange={handleInputChange}
              >
                <option value="">No Parent Category</option>                {displayCategories && displayCategories.length > 0 && displayCategories
                  // Only show categories from same restaurant/branch
                  .filter(cat => 
                    // Don't show itself as a parent option when editing
                    (!currentEditItem || cat._id !== currentEditItem._id) && 
                    // Don't show categories that would create a circular reference
                    (!currentEditItem || !cat.parentCategory || (cat.parentCategory && cat.parentCategory._id !== currentEditItem._id))
                  )
                  .map(category => {
                    // Create indented display for dropdown options
                    const level = category.level || 0;
                    const indent = level > 0 ? Array(level).fill('\u00A0\u00A0\u2192\u00A0').join('') : '';
                    
                    return (
                      <option key={category._id} value={category._id}>
                        {indent} {category.name}
                      </option>
                    );
                  })
                }
              </Input>
              <small className="form-text text-muted">
                Select a parent category if this category is a sub-category
              </small>
            </FormGroup>

            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                />{' '}
                Active
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button color="primary" onClick={handleSaveCategory}>Save</Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default CategoryManagement;