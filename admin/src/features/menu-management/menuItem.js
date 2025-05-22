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
  Progress,
  Table,
  Container,
  Row,
  UncontrolledTooltip,
  Modal,
  Button,
  Alert,
  FormGroup,
  Label,
  Input
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useEffect, useMemo, useCallback } from "react";
import MenuItemModal from "components/Modals/addMenuItem.js";
import { MenuContext } from "../../context/MenuContext";
import { CategoryContext } from "../../context/CategoryContext";  
import { AuthContext } from "../../context/AuthContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import { BranchContext } from "../../context/BranchContext";

import { useState } from "react";

const Tables = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { menuItems, loading, error, fetchMenuItems, deleteMenuItem } = useContext(MenuContext); 
  const { categories, fetchCategories, loading: categoriesLoading } = useContext(CategoryContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  const { restaurants } = useContext(RestaurantContext);
  const { branches } = useContext(BranchContext); 
  
  // State for restaurant filter (only for super admin)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');

  // Store isSuperAdmin result to prevent calling function during render
  const isUserSuperAdmin = useMemo(() => isSuperAdmin(), [isSuperAdmin]);
  
  // Memoize fetchMenuItems to prevent it changing on every render
  const memoizedFetchMenuItems = useCallback(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);
  
  // Add useEffect to fetch menu items and categories when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        console.log("Fetching menu items and categories...");
        await fetchMenuItems();
        await fetchCategories();
        console.log("Categories loaded:", categories);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    // Only fetch once when mounted
    if (isMounted) {
      fetchData();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  // Only run once on component mount, no dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Add effect to monitor categories and menu items
  useEffect(() => {
    // If we have menu items but no categories, fetch the categories
    if (menuItems?.length > 0 && (!categories || categories.length === 0)) {
      console.log("Menu items loaded but no categories - fetching categories now");
      fetchCategories();
    }
  }, [menuItems, categories, fetchCategories]);

  // Filter menu items based on user role and selected restaurant - memoize to prevent recalculations
  const filteredMenuItems = useMemo(() => {
    if (!menuItems || !Array.isArray(menuItems)) return [];
    
    return menuItems.filter(item => {
      // For super admin, show all items or filter by selected restaurant
      if (isUserSuperAdmin) {
        return selectedRestaurantId ? item.restaurantId === selectedRestaurantId : true;
      }
      
      // For regular users, only show items from their restaurant
      return user && user.restaurantId === item.restaurantId;
    });
  }, [menuItems, selectedRestaurantId, isUserSuperAdmin, user]);
  
  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null); // Reset the edit item when modal is closed
  };
  
  // Function to handle editing a menu item
  const handleEditMenuItem = (menuItem) => {
    setCurrentEditItem(menuItem);
    setModalOpen(true);
  };

  // Improved get category name with populate support
  const getCategoryNameById = (categoryId) => {
    if (!categoryId) {
      return "Unknown";
    }
    
    // First check if the menu item has a populated categoryId (object with name)
    if (typeof categoryId === 'object' && categoryId !== null && categoryId.name) {
      return categoryId.name;
    }
    
    if (!categories || categories.length === 0) {
      return "Loading...";
    }
    
    // Convert to string for consistent comparison
    const categoryIdString = String(categoryId);
    
    // Find the category by ID
    const category = categories.find(cat => String(cat._id) === categoryIdString);
    
    return category ? category.name : "Unknown";
  };
  
  // Function to handle adding or updating a menu item
  const handleSaveMenuItem = (menuItemData) => { 
    // The actual save functionality is handled by the modal component through the context
    setModalOpen(false);
    setCurrentEditItem(null); // Reset the edit item when save is complete
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
                 <h3 className="mb-0">Menu Items</h3>
                 </div>
                <div className="text-right d-inline-block">
                  {/* Restaurant filter for super admin */}
                  {isUserSuperAdmin && (
                    <FormGroup className="d-inline-block mr-3 mb--1">
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
                  )}
                  <Button 
                    color="info" 
                    size="sm" 
                    className="mr-2"
                    onClick={() => fetchMenuItems()}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt mr-1"></i> 
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    color="primary" 
                    size="sm"
                    onClick={() => {
                      setCurrentEditItem(null); // Ensure we're in add mode
                      setModalOpen(true);
                    }}
                  >
                    <i className="fas fa-plus mr-1"></i> 
                    Add New
                  </Button>
                </div>
                </CardHeader>
                
                {error && (
                  <Alert color="danger" className="m-3">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    Error: {error}
                    <Button 
                      color="link" 
                      className="alert-link ml-2" 
                      size="sm"
                      onClick={() => fetchMenuItems()}
                    >
                      Try Again
                    </Button>
                  </Alert>
                )}
                
                <Table className="align-items-center table-flush" responsive>
            <thead className="thead-light">
              <tr>
                <th scope="col">Image</th>
                <th scope="col">Name</th>
                <th scope="col">Price</th>
                <th scope="col">Category</th>
                {isUserSuperAdmin && <th scope="col">Restaurant</th>} 
                {isUserSuperAdmin && <th scope="col">Branch</th>} 
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isUserSuperAdmin ? "7" : "6"} className="text-center py-4">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span className="font-italic text-muted mb-0">Loading menu items...</span>
                  </td>
                </tr>
              ) : !filteredMenuItems || filteredMenuItems.length === 0 ? (
                <tr>
                  <td colSpan={isUserSuperAdmin ? "7" : "6"} className="text-center py-4">
                    <p className="font-italic text-muted mb-0">No menu items available</p>
                    <small className="text-muted d-block mt-2">
                      {!error ? "Add a new menu item to get started." : "There was an error fetching menu items. Please try refreshing."}
                    </small>
                  </td>
                </tr>
              ) : (
                filteredMenuItems.map((menuItem) => (
                  <tr key={menuItem._id}>
                    <td>
                      <Media className="align-items-center">
                        <a
                          className="avatar rounded-circle mr-3"
                          href="#"
                          onClick={(e) => e.preventDefault()}
                        >
                          {menuItem.imageUrl ? (
                            <img
                              alt={menuItem.name}
                              src={menuItem.imageUrl}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = require("../../assets/img/theme/sketch.jpg");
                              }}
                            />
                          ) : (
                            <img
                              alt="Default"
                              src={require("../../assets/img/theme/sketch.jpg")}
                            />
                          )}
                        </a>
                      </Media>
                    </td>
                    <td>
                      <Media className="align-items-center">
                        <Media>
                          <span className="mb-0 text-sm font-weight-bold">
                            {menuItem.name}
                          </span>
                          {menuItem.isVegetarian && (
                            <Badge color="success" pill className="ml-2">
                              Veg
                            </Badge>
                          )}
                        </Media>
                      </Media>
                    </td>
                    <td>₹{parseFloat(menuItem.price).toFixed(2)}</td>
                    <td> 
                      {getCategoryNameById(menuItem.categoryId) || "Unknown"}
                    </td>
                    {isUserSuperAdmin && (
                      <td>
                        {restaurants && restaurants.find(restaurant => restaurant._id === menuItem.restaurantId)?.name || "Unknown"}
                      </td>
                    )}  

                    {isUserSuperAdmin && (
                      <td>
                        {branches && branches.find(branch => branch._id === menuItem.branchId)?.name || "Unknown"}
                      </td>
                    )}
                    
                    <td>
                      <Badge color={menuItem.isActive ? "success" : "warning"} className="badge-dot mr-4">
                        <i className={menuItem.isActive ? "bg-success" : "bg-warning"} />
                        {menuItem.isActive ? "Available" : "Unavailable"}
                      </Badge>
                      {menuItem.featured && (
                        <Badge color="info" pill className="ml-2">
                          Featured
                        </Badge>
                      )}
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
                              handleEditMenuItem(menuItem);
                            }}
                          >
                            <i className="fas fa-edit text-primary mr-2"></i> Edit
                          </DropdownItem>
                          <DropdownItem  
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this menu item?")) {
                                deleteMenuItem(menuItem._id);
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
                {filteredMenuItems && filteredMenuItems.length > 0 && (
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
              
              {/* Menu Item Modal (for both Add and Edit) */}
      <MenuItemModal 
        isOpen={modalOpen}
        toggle={handleCloseModal}
        onSave={handleSaveMenuItem}
        editItem={currentEditItem}
      />
    </>
  );
};

export default Tables;
