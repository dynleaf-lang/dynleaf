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
  Table,
  Container,
  Row,
  Button,
  Alert,
  FormGroup,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Col
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useEffect, useMemo, useCallback, useRef, useState } from "react";
import MenuItemModal from "components/Modals/addMenuItem.js";
import ImportMenuItemModal from "components/Modals/ImportMenuItemModal.js";
import ExportMenuItemModal from "components/Modals/ExportMenuItemModal.js";
import BulkActionsToolbar from "components/Utils/BulkActionsToolbar.js";
import Pagination from "components/Utils/Pagination.js"; // Import new pagination component
import { MenuContext } from "../../context/MenuContext";
import { CategoryContext } from "../../context/CategoryContext";  
import { AuthContext } from "../../context/AuthContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import { BranchContext } from "../../context/BranchContext";  
import CurrencyDisplay from "../../components/Utils/CurrencyDisplay";

const Tables = () => {
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentSort, setCurrentSort] = useState({ field: 'name', direction: 'asc' });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Context data
  const { menuItems, loading, error, fetchMenuItems, deleteMenuItem } = useContext(MenuContext); 
  const { categories, fetchCategories } = useContext(CategoryContext);
  const { user, isSuperAdmin } = useContext(AuthContext);
  const { restaurants } = useContext(RestaurantContext);
  const { branches, fetchBranches } = useContext(BranchContext); 
  
  // Refs
  const isInitialLoad = useRef(true);
  const searchTimeout = useRef(null);
  const appliedFilters = useRef({});
  
  // Derived state
  const isUserSuperAdmin = useMemo(() => isSuperAdmin(), [isSuperAdmin]);
  
  const filteredBranches = useMemo(() => {
    return selectedRestaurantId
      ? branches.filter(branch => branch.restaurantId === selectedRestaurantId)
      : branches;
  }, [branches, selectedRestaurantId]);
 
  
  
  // Add local state to manage filtered results
  const [filteredMenuItems, setFilteredMenuItems] = useState([]);
  const [useLocalFilter, setUseLocalFilter] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Access denied error state
  const [accessDeniedError, setAccessDeniedError] = useState(null);
  
  // Update derived state - use either context menu items or locally filtered items
  const displayedMenuItems = useMemo(() => {
    // If the user is not a Super_Admin, filter menu items based on their restaurant and branch assignment
    if (!isUserSuperAdmin && user) {
      // For non-Super_Admin users, only show items from their assigned restaurant and branch
      const userRestaurantId = user.restaurantId;
      const userBranchId = user.branchId;
      
      if (userRestaurantId && userBranchId) {
        const userFiltered = useLocalFilter 
          ? filteredMenuItems.filter(item => 
              item.restaurantId === userRestaurantId && item.branchId === userBranchId)
          : menuItems.filter(item => 
              item.restaurantId === userRestaurantId && item.branchId === userBranchId);
        
        return userFiltered;
      }
      // For users with only restaurant assigned but no branch (may happen for some roles)
      else if (userRestaurantId) {
        const userFiltered = useLocalFilter 
          ? filteredMenuItems.filter(item => item.restaurantId === userRestaurantId)
          : menuItems.filter(item => item.restaurantId === userRestaurantId);
        
        return userFiltered;
      }
    }
    
    // For Super_Admin users or if user doesn't have restaurant/branch assigned, show all items
    return useLocalFilter ? filteredMenuItems : menuItems;
  }, [useLocalFilter, filteredMenuItems, menuItems, isUserSuperAdmin, user]);
  
  // Paginate the displayed items
  const paginatedItems = useMemo(() => {
    if (!displayedMenuItems || displayedMenuItems.length === 0) return [];
    
    // Calculate start and end index for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, displayedMenuItems.length);
    
    // Return only items for current page
    return displayedMenuItems.slice(startIndex, endIndex);
  }, [displayedMenuItems, currentPage, itemsPerPage]);
 
  
  
  // Get category name helper - MOVED UP before being used in handleSearch
  const getCategoryNameById = useCallback((categoryId) => {
    if (!categoryId) return "Unknown";
     
    // Handle case when categoryId is an object with _id property
    if (typeof categoryId === 'object' && categoryId !== null) {
      if (categoryId.name) return categoryId.name;
      if (categoryId._id) categoryId = categoryId._id;
    }
    
    if (!categories || categories.length === 0) {
      return "Loading...";
    }
 
    
    
    const category = categories.find(cat => String(cat._id) === String(categoryId));
 
    

    return category ? category.name : "Unknown";
  }, [categories]);
  
  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use a flag to prevent multiple calls
        if (isInitialLoad.current) {
          const fetchPromises = [fetchCategories(), fetchBranches()];
          await Promise.all(fetchPromises);
          
          // Only fetch menu items once with pagination
          await fetchMenuItems({
            page: currentPage,
            limit: itemsPerPage
          });
          
          // Update pagination state
          setTotalItems(menuItems.length);
          setTotalPages(Math.ceil(menuItems.length / itemsPerPage));
          
          isInitialLoad.current = false;
        }
      } catch (error) {
        console.error("Error loading initial data", error);
        isInitialLoad.current = false;
      }
    };
    
    loadData();
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []); // Empty dependency array to ensure it only runs once
  
  // Effect to update pagination when menu items change
  useEffect(() => {
    if (!isInitialLoad.current) {
      setTotalItems(menuItems.length);
      setTotalPages(Math.ceil(menuItems.length / itemsPerPage));
    }
  }, [menuItems, itemsPerPage]);
  
  // Helper to build filters object
  const buildFilters = useCallback(() => {
    const filters = {};
    
    if (searchTerm) filters.search = searchTerm;
    if (filterCategory) filters.categoryId = filterCategory;
    if (selectedRestaurantId) filters.restaurantId = selectedRestaurantId;
    if (selectedBranchId) filters.branchId = selectedBranchId;
    
    if (filterStatus === 'active') filters.isActive = true;
    else if (filterStatus === 'inactive') filters.isActive = false;
    else if (filterStatus === 'featured') filters.featured = true;
    
    filters.sortBy = currentSort.field;
    filters.sortOrder = currentSort.direction;
    
    return filters;
  }, [searchTerm, filterCategory, filterStatus, selectedRestaurantId, selectedBranchId, currentSort]);
  
  // Search with debounce
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (!value) {
      // If search is cleared, reset to using context menu items
      setUseLocalFilter(false);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      try {
        setSearchLoading(true); // Using our new searchLoading state
        
        // Try server-side filtering first
        const filters = buildFilters();
        appliedFilters.current = filters;
        
        // Check if we should use client-side filtering instead
        const lowercaseSearch = value.toLowerCase();
        const filtered = menuItems.filter(item => 
          item.name.toLowerCase().includes(lowercaseSearch) ||
          item.description?.toLowerCase().includes(lowercaseSearch) ||
          parseFloat(item.price).toString().includes(lowercaseSearch) || 
          getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch) ||
         
          (isUserSuperAdmin && (
            (item.restaurantId && restaurants.find(r => r._id === item.restaurantId)?.name.toLowerCase().includes(lowercaseSearch)) ||
            (item.branchId && branches.find(b => b._id === item.branchId)?.name.toLowerCase().includes(lowercaseSearch))
          ))
        );
        
        // Store filtered results locally and switch to using them
        setFilteredMenuItems(filtered);
        setUseLocalFilter(true);
         
      } catch (error) {
        console.error('Error during search:', error);
      } finally {
        setSearchLoading(false); // Using our new searchLoading state
      }
    }, 300); // Reduced debounce time for more responsive search
  }, [buildFilters, menuItems, getCategoryNameById]);
  
  // Filter application
  const applyFilters = useCallback(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    const filters = buildFilters();
    appliedFilters.current = filters;
    fetchMenuItems(filters);
  }, [buildFilters, fetchMenuItems]);
  
  // Clear filters
  const clearAllFilters = useCallback(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    setSearchTerm('');
    setFilterCategory('');
    setFilterStatus('');
    setSelectedBranchId('');
    setSelectedRestaurantId('');
    setUseLocalFilter(false);
    setFilteredMenuItems([]);
    setSelectedItems([]);
    if (isUserSuperAdmin) setSelectedRestaurantId('');
    setCurrentSort({ field: 'name', direction: 'asc' });
    
    appliedFilters.current = {};
    fetchMenuItems({});
  }, [fetchMenuItems, isUserSuperAdmin]);
  
  // Modal handlers
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setCurrentEditItem(null);
  }, []);
  
  const handleEditMenuItem = useCallback((menuItem) => {
    setCurrentEditItem(menuItem);
    setModalOpen(true);
  }, []);
  
  const handleSaveMenuItem = useCallback(() => {
    setModalOpen(false);
    setCurrentEditItem(null);
    
    // Refresh with current filters
    const filters = appliedFilters.current;
    fetchMenuItems(filters);
  }, [fetchMenuItems]);
  
  // Selection handlers
  const toggleItemSelection = useCallback((itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);
  
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.length === menuItems.length && menuItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(menuItems.map(item => item._id));
    }
  }, [menuItems, selectedItems]);
  
  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);
  
  // Sort handler
  const handleSort = useCallback((field) => {
    setCurrentSort(prev => {
      const newSort = { 
        field, 
        direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc' 
      };
      
      // Apply sort immediately
      setTimeout(() => applyFilters(), 0);
      return newSort;
    });
  }, [applyFilters]);
  
  // Pagination handlers
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    
    // Fetch new data for the page
    const filters = buildFilters();
    appliedFilters.current = filters;
    fetchMenuItems({ ...filters, page, limit: itemsPerPage });
  }, [buildFilters, fetchMenuItems, itemsPerPage]);
  
  const handleItemsPerPageChange = useCallback((limit) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
    
    // Fetch new data with updated items per page
    const filters = buildFilters();
    appliedFilters.current = filters;
    fetchMenuItems({ ...filters, page: 1, limit });
  }, [buildFilters, fetchMenuItems]);
  
  return (
    <>
      <Header />
      <Container className="mt--7" fluid> 
        <Row>
          <div className="col">
            <Card className="shadow">
              <CardHeader className="border-0">
                <h3 className="mb-0">Menu Items</h3>
                
                <Row className="mt-3">
                  <Col md="4">
                    <div className="search-wrapper">
                      <InputGroup size="sm">
                        <Input 
                          placeholder="Type to search menu items..." 
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className={searchTerm ? "border-primary" : ""}
                          aria-label="Search menu items"
                        />
                        {loading && (
                          <InputGroupAddon addonType="append">
                            <InputGroupText>
                              <i className="fas fa-spinner fa-spin"></i>
                            </InputGroupText>
                          </InputGroupAddon>
                        )}
                        {searchTerm && (
                          <InputGroupAddon addonType="append">
                            <Button 
                              color="light" 
                              onClick={() => handleSearch('')}
                              title="Clear search"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                      <small className="form-text text-muted">
                        <i className="fas fa-info-circle mr-1"></i>
                        Search by name, price range, or category
                      </small>
                    </div>
                  </Col>
                  
                  <Col md="8" className="text-right">
                    {/* Restaurant filter for super admin */}
                    {isUserSuperAdmin && (
                      <FormGroup className="d-inline-block mr-2 mb-0">
                        <Input
                          bsSize="sm"
                          type="select"
                          value={selectedRestaurantId}
                          onChange={(e) => {
                            const restaurantId = e.target.value;
                            setSelectedRestaurantId(restaurantId);
                            setSelectedBranchId(''); // Reset branch when restaurant changes
                            
                            // Apply immediate client-side filtering 
                            if (!restaurantId) {
                              // If restaurant filter is cleared, reset to using context menu items if no other filters are active
                              if (!searchTerm && !filterCategory && !filterStatus) {
                                setUseLocalFilter(false);
                              } else {
                                // Apply other active filters locally
                                const filtered = menuItems.filter(item => {
                                  let match = true;
                                  if (searchTerm) {
                                    const lowercaseSearch = searchTerm.toLowerCase();
                                    match = match && (
                                      item.name.toLowerCase().includes(lowercaseSearch) ||
                                      item.description?.toLowerCase().includes(lowercaseSearch) ||
                                      parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                      getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                    );
                                  }
                                  if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                                  if (filterStatus === 'active') match = match && item.isActive;
                                  if (filterStatus === 'inactive') match = match && !item.isActive;
                                  if (filterStatus === 'featured') match = match && item.featured;
                                  return match;
                                });
                                setFilteredMenuItems(filtered);
                                setUseLocalFilter(true);
                              }
                            } else {
                              // Apply restaurant filter locally
                              const filtered = menuItems.filter(item => {
                                let match = item.restaurantId === restaurantId;
                                
                                if (searchTerm) {
                                  const lowercaseSearch = searchTerm.toLowerCase();
                                  match = match && (
                                    item.name.toLowerCase().includes(lowercaseSearch) ||
                                    item.description?.toLowerCase().includes(lowercaseSearch) ||
                                    parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                    getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                  );
                                }
                                if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                                if (filterStatus === 'active') match = match && item.isActive;
                                if (filterStatus === 'inactive') match = match && !item.isActive;
                                if (filterStatus === 'featured') match = match && item.featured;
                                
                                return match;
                              });
                              setFilteredMenuItems(filtered);
                              setUseLocalFilter(true);
                            }
                          }}
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

                    {/* Branch filter for super admin */}
                    {isUserSuperAdmin && (
                    <FormGroup className="d-inline-block mr-2 mb-0">
                      <Input
                        bsSize="sm"
                        type="select"
                        value={selectedBranchId}
                        onChange={(e) => {
                          const branchId = e.target.value;
                          setSelectedBranchId(branchId);
                          
                          // Apply immediate client-side filtering 
                          if (!branchId) {
                            // If branch filter is cleared, reset to using context menu items if no other filters are active
                            if (!searchTerm && !filterCategory && !filterStatus && !selectedRestaurantId) {
                              setUseLocalFilter(false);
                            } else {
                              // Apply other active filters locally
                              const filtered = menuItems.filter(item => {
                                let match = true;
                                if (searchTerm) {
                                  const lowercaseSearch = searchTerm.toLowerCase();
                                  match = match && (
                                    item.name.toLowerCase().includes(lowercaseSearch) ||
                                    item.description?.toLowerCase().includes(lowercaseSearch) ||
                                    parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                    getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                  );
                                }
                                if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                                if (filterStatus === 'active') match = match && item.isActive;
                                if (filterStatus === 'inactive') match = match && !item.isActive;
                                if (filterStatus === 'featured') match = match && item.featured;
                                if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                                return match;
                              });
                              setFilteredMenuItems(filtered);
                              setUseLocalFilter(true);
                            }
                          } else {
                            // Apply branch filter locally
                            const filtered = menuItems.filter(item => {
                              let match = item.branchId === branchId;
                              
                              if (searchTerm) {
                                const lowercaseSearch = searchTerm.toLowerCase();
                                match = match && (
                                  item.name.toLowerCase().includes(lowercaseSearch) ||
                                  item.description?.toLowerCase().includes(lowercaseSearch) ||
                                  parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                  getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                );
                              }
                              if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                              if (filterStatus === 'active') match = match && item.isActive;
                              if (filterStatus === 'inactive') match = match && !item.isActive;
                              if (filterStatus === 'featured') match = match && item.featured;
                              if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                              
                              return match;
                            });
                            setFilteredMenuItems(filtered);
                            setUseLocalFilter(true);
                          }
                        }}
                        disabled={isUserSuperAdmin && !selectedRestaurantId}
                      >
                        <option value="">All Branches</option>
                        {filteredBranches && filteredBranches.map(branch => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
        )}
                    {/* Category filter */}
                    <FormGroup className="d-inline-block mr-2 mb-0">
                      <Input
                        bsSize="sm"
                        type="select"
                        value={filterCategory}
                        onChange={(e) => {
                          setFilterCategory(e.target.value);
                          
                          // Apply local filtering immediately when category changes
                          const categoryId = e.target.value;
                          if (!categoryId) {
                            // If category filter is cleared, reset to using context menu items if no other filters are active
                            if (!searchTerm && !filterStatus && !selectedRestaurantId && !selectedBranchId) {
                              setUseLocalFilter(false);
                            } else {
                              // Apply other active filters locally
                              const filtered = menuItems.filter(item => {
                                let match = true;
                                if (searchTerm) {
                                  const lowercaseSearch = searchTerm.toLowerCase();
                                  match = match && (
                                    item.name.toLowerCase().includes(lowercaseSearch) ||
                                    item.description?.toLowerCase().includes(lowercaseSearch) ||
                                    parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                    getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                  );
                                }
                                if (filterStatus === 'active') match = match && item.isActive;
                                if (filterStatus === 'inactive') match = match && !item.isActive;
                                if (filterStatus === 'featured') match = match && item.featured;
                                if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                                if (selectedBranchId) match = match && item.branchId === selectedBranchId;
                                return match;
                              });
                              setFilteredMenuItems(filtered);
                              setUseLocalFilter(true);
                            }
                          } else {
                            // Apply category filter locally
                            const filtered = menuItems.filter(item => {
                              // Normalize category IDs for comparison
                              let itemCategoryId = item.categoryId;
                              if (typeof itemCategoryId === 'object' && itemCategoryId !== null) {
                                itemCategoryId = itemCategoryId._id || itemCategoryId;
                              }
                              
                              let match = String(itemCategoryId) === String(categoryId);
                              
                              if (searchTerm) {
                                const lowercaseSearch = searchTerm.toLowerCase();
                                match = match && (
                                  item.name.toLowerCase().includes(lowercaseSearch) ||
                                  item.description?.toLowerCase().includes(lowercaseSearch) ||
                                  parseFloat(item.price).toString().includes(lowercaseSearch)
                                );
                              }
                              if (filterStatus === 'active') match = match && item.isActive;
                              if (filterStatus === 'inactive') match = match && !item.isActive;
                              if (filterStatus === 'featured') match = match && item.featured;
                              if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                              if (selectedBranchId) match = match && item.branchId === selectedBranchId;
                              return match;
                            });
                            setFilteredMenuItems(filtered);
                            setUseLocalFilter(true);
                          }
                        }}
                      >
                        <option value="">All Categories</option>
                        {categories && categories.map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>

                    {/* Status filter */}
                    <FormGroup className="d-inline-block mr-2 mb-0">
                      <Input
                        bsSize="sm"
                        type="select"
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          
                          // Apply local filtering immediately when status changes
                          const status = e.target.value;
                          if (!status) {
                            // If status filter is cleared, reset to using context menu items if no other filters are active
                            if (!searchTerm && !filterCategory && !selectedRestaurantId && !selectedBranchId) {
                              setUseLocalFilter(false);
                            } else {
                              // Apply other active filters locally
                              const filtered = menuItems.filter(item => {
                                let match = true;
                                if (searchTerm) {
                                  const lowercaseSearch = searchTerm.toLowerCase();
                                  match = match && (
                                    item.name.toLowerCase().includes(lowercaseSearch) ||
                                    item.description?.toLowerCase().includes(lowercaseSearch) ||
                                    parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                    getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                  );
                                }
                                if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                                if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                                if (selectedBranchId) match = match && item.branchId === selectedBranchId;
                                return match;
                              });
                              setFilteredMenuItems(filtered);
                              setUseLocalFilter(true);
                            }
                          } else {
                            // Apply status filter locally
                            const filtered = menuItems.filter(item => {
                              let match = true;
                              
                              if (status === 'active') match = match && item.isActive;
                              else if (status === 'inactive') match = match && !item.isActive;
                              else if (status === 'featured') match = match && item.featured;
                              
                              if (searchTerm) {
                                const lowercaseSearch = searchTerm.toLowerCase();
                                match = match && (
                                  item.name.toLowerCase().includes(lowercaseSearch) ||
                                  item.description?.toLowerCase().includes(lowercaseSearch) ||
                                  parseFloat(item.price).toString().includes(lowercaseSearch) ||
                                  getCategoryNameById(item.categoryId).toLowerCase().includes(lowercaseSearch)
                                );
                              }
                              if (filterCategory) match = match && String(item.categoryId) === String(filterCategory);
                              if (selectedRestaurantId) match = match && item.restaurantId === selectedRestaurantId;
                              if (selectedBranchId) match = match && item.branchId === selectedBranchId;
                              
                              return match;
                            });
                            setFilteredMenuItems(filtered);
                            setUseLocalFilter(true);
                          }
                        }}
                      >
                        <option value="">All Status</option>
                        <option value="active">Available</option>
                        <option value="inactive">Unavailable</option>
                        <option value="featured">Featured</option>
                      </Input>
                    </FormGroup>

                    <Button 
                      color="secondary" 
                      size="sm" 
                      className="mr-2"
                      onClick={clearAllFilters}
                    >
                      <i className="fas fa-times-circle mr-1"></i> 
                      Clear
                    </Button>

                    {/* <Button 
                      color="info" 
                      size="sm" 
                      className="mr-2"
                      onClick={applyFilters}
                      disabled={loading}
                    >
                      <i className="fas fa-filter mr-1"></i> 
                      Apply
                    </Button> */}

                    <Button 
                      color="primary" 
                      size="sm"
                      onClick={() => {
                        setCurrentEditItem(null); 
                        setModalOpen(true);
                      }}
                    >
                      <i className="fas fa-plus mr-1"></i> 
                      Add New
                    </Button>
                  </Col>
                </Row>
              </CardHeader>
              
              {/* Bulk Actions Toolbar */}
              {selectedItems.length > 0 && (
                <div className="px-4 pt-2">
                  <BulkActionsToolbar
                    selectedItems={selectedItems}
                    clearSelection={clearSelection}
                    refreshData={() => fetchMenuItems(appliedFilters.current)}
                    toggleImportModal={() => setImportModalOpen(true)}
                    toggleExportModal={() => setExportModalOpen(true)}
                  />
                </div>
              )}
              
              {error && (
                <Alert color="danger" className="m-3">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Error: {error}
                  <Button 
                    color="link" 
                    className="alert-link ml-2" 
                    size="sm"
                    onClick={applyFilters}
                  >
                    Try Again
                  </Button>
                </Alert>
              )}
              
              {accessDeniedError && (
                <Alert color="danger" className="m-3">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {accessDeniedError}
                  <Button 
                    color="link" 
                    className="alert-link ml-2" 
                    size="sm"
                    onClick={() => setAccessDeniedError(null)}
                  >
                    Close
                  </Button>
                </Alert>
              )}
              
              <Table className="align-items-center table-flush" responsive>
                <thead className="thead-light">
                  <tr>
                    <th className="width-min">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="table-check-all"
                          checked={selectedItems.length === menuItems.length && menuItems.length > 0}
                          onChange={toggleSelectAll}
                        />
                        <label className="custom-control-label" htmlFor="table-check-all"></label>
                      </div>
                    </th>
                    <th scope="col">Image</th>
                    <th 
                      scope="col" 
                      className="cursor-pointer" 
                      onClick={() => handleSort('name')}
                    >
                      Name
                      {currentSort.field === 'name' && (
                        <i className={`ml-1 fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="cursor-pointer" 
                      onClick={() => handleSort('price')}
                    >
                      Price
                      {currentSort.field === 'price' && (
                        <i className={`ml-1 fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th scope="col">Category</th>
                    {isUserSuperAdmin && <th scope="col">Restaurant</th>} 
                    {isUserSuperAdmin && <th scope="col">Branch</th>} 
                    <th 
                      scope="col" 
                      className="cursor-pointer" 
                      onClick={() => handleSort('isActive')}
                    >
                      Status
                      {currentSort.field === 'isActive' && (
                        <i className={`ml-1 fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isUserSuperAdmin ? "9" : "7"} className="text-center py-4">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        <span className="font-italic text-muted mb-0">Loading menu items...</span>
                      </td>
                    </tr>
                  ) : !displayedMenuItems || displayedMenuItems.length === 0 ? (
                    <tr>
                      <td colSpan={isUserSuperAdmin ? "9" : "7"} className="text-center py-4">
                        <p className="font-italic text-muted mb-0">
                          {searchTerm ? "No results match your search criteria" : "No menu items available"}
                        </p>
                        <small className="text-muted d-block mt-2">
                          {searchTerm ? "Try different keywords or clear the search" : (!error ? "Add a new menu item to get started." : "There was an error fetching menu items. Please try refreshing.")}
                        </small>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((menuItem) => (
                      <tr key={menuItem._id}>
                        <td>
                          <div className="custom-control custom-checkbox">
                            <input
                              type="checkbox"
                              className="custom-control-input"
                              id={`table-check-${menuItem._id}`}
                              checked={selectedItems.includes(menuItem._id)}
                              onChange={() => toggleItemSelection(menuItem._id)}
                            />
                            <label className="custom-control-label" htmlFor={`table-check-${menuItem._id}`}></label>
                          </div>
                        </td>
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
                        <td>
                          {menuItem.sizeVariants && menuItem.sizeVariants.length > 0 ? (
                            <div>
                              {menuItem.sizeVariants.map((variant, idx) => (
                                <div key={idx} className="mb-1">
                                  <span className="text-dark">{variant.name}:</span> <CurrencyDisplay amount={variant.price} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <CurrencyDisplay amount={menuItem.price} />
                          )}
                        </td>
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
                                    deleteMenuItem(menuItem._id).then((result) => {
                                      // Check for access denied error
                                      if (!result.success && result.error?.accessDenied) {
                                        // Show access denied error using alert
                                        setAccessDeniedError(result.error.message);
                                        return;
                                      }
                                      
                                      // If item was selected, remove from selection
                                      if (selectedItems.includes(menuItem._id)) {
                                        setSelectedItems(prev => 
                                          prev.filter(id => id !== menuItem._id)
                                        );
                                      }
                                    });
                                  }
                                }}
                              >
                                <i className="fas fa-trash text-danger mr-2"></i> Delete
                              </DropdownItem>
                              <DropdownItem divider />
                              <DropdownItem
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Toggle active state
                                  const updatedItem = {
                                    ...menuItem,
                                    isActive: !menuItem.isActive
                                  };
                                  handleEditMenuItem(updatedItem);
                                }}
                              >
                                {menuItem.isActive ? (
                                  <><i className="fas fa-times-circle text-warning mr-2"></i> Mark Unavailable</>
                                ) : (
                                  <><i className="fas fa-check-circle text-success mr-2"></i> Mark Available</>
                                )}
                              </DropdownItem>
                              <DropdownItem
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Toggle featured state
                                  const updatedItem = {
                                    ...menuItem,
                                    featured: !menuItem.featured
                                  };
                                  handleEditMenuItem(updatedItem);
                                }}
                              >
                                {menuItem.featured ? (
                                  <><i className="fas fa-star-half-alt text-muted mr-2"></i> Remove from Featured</>
                                ) : (
                                  <><i className="fas fa-star text-warning mr-2"></i> Add to Featured</>
                                )}
                              </DropdownItem>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
              
              {/* Table Footer */}
              {selectedItems.length === 0 && menuItems && menuItems.length > 0 && (
                <div className="d-flex justify-content-end p-3">
                  <Button color="success" size="sm" className="mr-2" onClick={() => setImportModalOpen(true)}>
                    <i className="fas fa-file-import mr-1"></i> Import
                  </Button>
                  <Button color="info" size="sm" onClick={() => setExportModalOpen(true)}>
                    <i className="fas fa-file-export mr-1"></i> Export
                  </Button>
                </div>
              )}
              
              {/* Pagination Component - REPLACED WITH NEW PAGINATION COMPONENT */}
              {menuItems && menuItems.length > 0 && (
                <CardFooter className="py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalItems={menuItems.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    disabled={loading}
                    size="sm"
                  />
                </CardFooter>
              )}
            </Card>
          </div>
        </Row>
      </Container>
      
      {/* Modals */}
      <MenuItemModal 
        isOpen={modalOpen}
        toggle={handleCloseModal}
        onSave={handleSaveMenuItem}
        editItem={currentEditItem}
      />
      
      <ImportMenuItemModal 
        isOpen={importModalOpen}
        toggle={() => setImportModalOpen(false)}
      />
      
      <ExportMenuItemModal 
        isOpen={exportModalOpen}
        toggle={() => setExportModalOpen(false)}
      />
    </>
  );
};

export default Tables;
