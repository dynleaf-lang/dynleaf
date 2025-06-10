// reactstrap components
import React, { useState, useRef, useContext, useEffect, useCallback } from "react";
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    FormGroup,
    Form,
    Input, 
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Row,
    Col,
    Modal,
    CustomInput,
    Label,
    Badge,
    Alert
} from "reactstrap";
import "../../assets/css/modal-right.css"; // Import the custom modal CSS  
 
import { handleTagsChange, handleTagKeyDown, removeTag } from "../Utils/handleTagsChange"; // Import the utility functions for handling tags
import { MenuContext } from "../../context/MenuContext";
import { CategoryContext } from "../../context/CategoryContext";
import { AuthContext } from "../../context/AuthContext";
import { RestaurantContext } from "../../context/RestaurantContext";
import { BranchContext } from "../../context/BranchContext";
import { CurrencyContext } from "../../context/CurrencyContext";

const MenuItemModal = ({ isOpen, toggle, onSave, editItem = null }) => {
    // Get the default restaurant ID and user context
    const { addMenuItem, updateMenuItem, DEFAULT_RESTAURANT_ID, uploadImage } = useContext(MenuContext);
    const { categories, loading: categoriesLoading, filterCategories } = useContext(CategoryContext);
    const { user, isSuperAdmin } = useContext(AuthContext);
    const { restaurants, fetchRestaurants, loading: restaurantsLoading } = useContext(RestaurantContext);
    const { fetchBranchesByRestaurant } = useContext(BranchContext);
    const { currencySymbol } = useContext(CurrencyContext); // Get currency symbol from context

    // Determine if we're in edit mode
    const isEditMode = !!editItem;
    
    // State for filtered categories
    const [filteredCategories, setFilteredCategories] = useState([]);

    const [menuItem, setMenuItem] = useState({
        name: "",
        price: "",
        description: "",
        categoryId: "",
        imageUrl: "",
        isVegetarian: false,
        tags: [],
        featured: false,
        isActive: true,
        imageFile: null,
        restaurantId: user?.restaurantId || "",
        branchId: user?.branchId || "", // Add branchId to the state
        sizeVariants: [] // Add size variants array
    });
    

    // Add state for branches
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    
    // Add state for success message
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    // Add state for error message
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Reference to the tags input field
    const tagsInputRef = useRef(null);

    // Find restaurant name by ID
    const getRestaurantName = (id) => {
        if (!id) return 'No Restaurant Selected';
        const restaurant = restaurants.find(r => r._id === id);
        return restaurant ? restaurant.name : 'Unknown Restaurant';
    };

    // Get parent category name by ID
    const getParentCategoryName = (parentId) => {
        if (!parentId) return '';
        
        // Handle both object reference and ID string
        const categoryId = typeof parentId === 'object' ? parentId?._id : parentId;
        const parent = categories.find(cat => cat._id === categoryId);
        
        return parent ? parent.name : 'Unknown Category';
    };

    // Fetch restaurants and categories when the modal opens
    useEffect(() => {
        if (isOpen) {
            fetchRestaurants();
            
            // Ensure categories are loaded, especially important for edit mode
            // Force categories refresh on modal open
            filterCategories().then(() => {
                console.log("Categories loaded for modal, count:", categories.length);
                
                // If we're in edit mode and have categories loaded, make sure we set the category
                if (isEditMode && editItem && editItem.categoryId) {
                    console.log("Edit mode, setting categoryId:", editItem.categoryId);
                    
                    // Force update the categoryId in the form data to ensure it's set
                    setMenuItem(prev => ({
                        ...prev,
                        categoryId: editItem.categoryId
                    }));
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); // Only depend on isOpen

    // Load branches when restaurant changes - optimize with useCallback and debounce
    const loadBranches = useCallback(async (restaurantId) => {
        if (!restaurantId) {
            setBranches([]);
            return;
        }
        
        setLoadingBranches(true);
        try {
            // Use a local variable to track if this request is still relevant
            const requestId = Date.now();
            loadBranches.lastRequestId = requestId;
            
            const branchData = await fetchBranchesByRestaurant(restaurantId);
            
            // Only update state if this is still the most recent request
            if (loadBranches.lastRequestId === requestId) {
                setBranches(branchData || []);
            }
        } catch (error) {
            console.error("Error loading branches:", error);
            setBranches([]);
        } finally {
            setLoadingBranches(false);
        }
    }, [fetchBranchesByRestaurant]);

    // Add a function to fetch a single category by ID when needed
    const fetchCategoryById = useCallback(async (categoryId) => {
        if (!categoryId) return null;
        
        try {
            console.log("Attempting to fetch specific category by ID:", categoryId);
            
            // First check if it's already in our loaded categories
            const existingCategory = categories.find(c => String(c._id) === String(categoryId));
            if (existingCategory) {
                console.log("Category found in existing categories:", existingCategory.name);
                return existingCategory;
            }
            
            // If we're here, we need to make a dedicated API call for this specific category
            // We can reuse the filterCategories function but it will fetch all categories
            const refreshedCategories = await filterCategories();
            
            // Now check again in the refreshed categories list
            const foundCategory = refreshedCategories.find(c => String(c._id) === String(categoryId));
            
            if (foundCategory) {
                console.log("Category found after refresh:", foundCategory.name);
                return foundCategory;
            } else {
                console.log("Category still not found after refresh");
                return null;
            }
        } catch (error) {
            console.error("Error fetching category by ID:", error);
            return null;
        }
    }, [categories, filterCategories]);

    // Use the memoized loadBranches function with a useEffect to prevent excessive calls
    useEffect(() => {
        // Skip initial render or when the modal is closed
        if (!isOpen || !menuItem.restaurantId) {
            return;
        }
        
        // Add debounce to prevent multiple rapid calls
        const timerId = setTimeout(() => {
            loadBranches(menuItem.restaurantId);
        }, 300);
        
        return () => clearTimeout(timerId);
    }, [menuItem.restaurantId, loadBranches, isOpen]);

    // Load item data when in edit mode
    useEffect(() => {
        if (editItem) {
            setMenuItem({
                ...editItem,
                // Convert tags to array if it's not already
                tags: Array.isArray(editItem.tags) ? editItem.tags : (editItem.tags ? [editItem.tags] : []),
                // Set imageFile to null initially
                imageFile: null,
                // Keep existing restaurantId and branchId
                restaurantId: editItem.restaurantId,
                branchId: editItem.branchId || ""
            });
        } else {
            // Determine the appropriate restaurantId based on user role
            let restaurantId = "";
            
            // For non-Super_Admin users, use their assigned restaurant
            if (user && !isSuperAdmin() && user.restaurantId) {
                restaurantId = user.restaurantId;
            } 
            // For Super_Admin without an edit item, use the default
            else if (isSuperAdmin()) {
                restaurantId = DEFAULT_RESTAURANT_ID;
            }
            
            // Reset form when not in edit mode
            setMenuItem({
                name: "",
                price: "",
                description: "",
                categoryId: "",
                imageUrl: "",
                isVegetarian: false,
                tags: [],
                featured: false,
                isActive: true,
                imageFile: null,
                restaurantId: restaurantId,
                branchId: ""
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editItem, DEFAULT_RESTAURANT_ID, user]); // Remove isSuperAdmin which is a function

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === "checkbox") {
            setMenuItem({ ...menuItem, [name]: checked });
        } else if (name === "restaurantId") {
            // When restaurant changes, reset branch selection and trigger branch loading
            setMenuItem({ 
                ...menuItem, 
                [name]: value,
                branchId: "" 
            });
            
            // If a valid restaurant is selected, explicitly load its branches
            if (value) {
                setLoadingBranches(true);
                fetchBranchesByRestaurant(value)
                    .then(branchData => {
                        setBranches(branchData || []);
                    })
                    .catch(error => {
                        console.error("Error loading branches:", error);
                        setBranches([]);
                    })
                    .finally(() => {
                        setLoadingBranches(false);
                    });
            } else {
                // Clear branches when no restaurant is selected
                setBranches([]);
            }
        } else {
            setMenuItem({ ...menuItem, [name]: value });
        }
    };
    
    // Wrapper for the imported handleTagsChange function
    const handleTagsInputChange = (e) => {
        const result = handleTagsChange(e, menuItem, setMenuItem);
        if (result.shouldClearInput) {
            e.target.value = '';
        }
    };
    
    // Wrapper for the imported handleTagKeyDown function
    const handleTagsKeyDown = (e) => {
        const result = handleTagKeyDown(e, menuItem, setMenuItem);
        if (result.shouldClearInput) {
            e.target.value = '';
        }
    };
    
    // Wrapper for the imported removeTag function
    const handleRemoveTag = (tag) => {
        removeTag(tag, menuItem, setMenuItem);
        // Focus back on the input after removing a tag
        if (tagsInputRef.current) {
            tagsInputRef.current.focus();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type);
            
            // Validate file type and size before setting
            if (!file.type.startsWith('image/')) {
                setErrorMessage("Please select a valid image file");
                setShowErrorAlert(true);
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setErrorMessage("Image file size should be less than 5MB");
                setShowErrorAlert(true);
                return;
            }
            
            // Create a specific file object with proper properties to ensure it's correctly processed
            const imageFile = new File([file], file.name, {
                type: file.type,
                lastModified: file.lastModified,
            });
            
            setMenuItem({ 
                ...menuItem, 
                imageFile: imageFile,
                // Create a temporary URL for preview
                imageUrl: URL.createObjectURL(imageFile)
            });
            
            console.log("Image file set successfully in state:", imageFile.name);
        }
    };

    // Combined form submission handler
    const handleFormSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        } 
        // Clear any previous alerts
        setShowSuccessAlert(false);
        setShowErrorAlert(false);
         
        
        // Validate required fields
        if (!menuItem.name || (!menuItem.price && (!menuItem.sizeVariants || menuItem.sizeVariants.length === 0)) || !menuItem.categoryId) {
            setErrorMessage("Please fill in all required fields. Either a base price or size variants are required.");
            setShowErrorAlert(true);
            return;
        }

        // Validate size variants if they exist
        if (menuItem.sizeVariants && menuItem.sizeVariants.length > 0) {
            // Check if any variant is missing name or price
            const invalidVariants = menuItem.sizeVariants.filter(v => !v.name || !v.price);
            if (invalidVariants.length > 0) {
                setErrorMessage("All size variants must have both name and price. Please fill in all variant details.");
                setShowErrorAlert(true);
                return;
            }
            
            // Convert all variant prices to numbers
            menuItem.sizeVariants = menuItem.sizeVariants.map(v => ({
                ...v,
                price: parseFloat(v.price)
            }));
        }

        // Parse price as a number to ensure it's sent as a number, not a string
        const parsedPrice = parseFloat(menuItem.price);
        if (menuItem.price && isNaN(parsedPrice)) {
            setErrorMessage("Price must be a valid number.");
            setShowErrorAlert(true);
            return;
        }
        
        // Determine the appropriate restaurantId for the item
        let restaurantId = menuItem.restaurantId;

        // Determine the appropriate branchId for the item
        let branchId = menuItem.branchId
        
        // For non-Super_Admin users, always use their assigned restaurant
        if (user && !isSuperAdmin() && user.restaurantId) {
            restaurantId = user.restaurantId;
        } 

        // For Super_Admin without a restaurant specified, use the default
        else if (isSuperAdmin() && !restaurantId) {
            restaurantId = DEFAULT_RESTAURANT_ID;
        }

        // For non-Super_Admin users, always use their assigned branch
        if (user && !isSuperAdmin() && user.branchId) {
            branchId = user.branchId;
        }
        // For Super_Admin without a branch specified, use the default
        else if (isSuperAdmin() && !branchId) {
            branchId = ""; // Super_Admin can leave branch empty to apply to all branches
        }


        
        // Clone menuItem to send to parent - ensure categoryId is kept
        const itemToSave = {
            ...menuItem,
            price: parsedPrice || 0, // Ensure price is a number, default to 0 if not provided
            restaurantId: restaurantId, // Use the determined restaurantId
            categoryId: menuItem.categoryId, // Always include the category ID - don't override to undefined
            branchId: branchId || undefined,
            sizeVariants: menuItem.sizeVariants || [] // Ensure size variants are included
        };
         
        
        try {
            // Handle image upload if there's an image file
            if (menuItem.imageFile) {
                // Show uploading message
                setShowSuccessAlert(true);
                setSuccessMessage("Uploading image...");
                
                // Use the uploadImage function from our context
                const uploadResult = await uploadImage(menuItem.imageFile);
                
                if (!uploadResult.success) {
                    throw new Error(uploadResult.error?.message || "Failed to upload image");
                }
                
                // Update the imageUrl with the URL returned from the server
                itemToSave.imageUrl = uploadResult.data.file.url;
                
                // Clean up the imageFile as we no longer need it
                delete itemToSave.imageFile;
                
                // Update success message
                setSuccessMessage("Image uploaded successfully, saving menu item...");
            } else {
                // When no new image file is selected, keep the existing imageUrl
                // And ensure we're not accidentally sending imageFile: null to the API
                delete itemToSave.imageFile;
            }

            // Call the appropriate API function based on whether we're adding or editing
            let result = null;
            if (isEditMode) {
                // Update existing item
                result = await updateMenuItem(editItem._id, itemToSave);
                console.log("Update API response:", result);
                
                if (!result.success) {
                    throw new Error(result.error?.message || "Failed to update menu item");
                }
            } else {
                // Add new item
                result = await addMenuItem(itemToSave);
                console.log("Add API response:", result);
                
                if (!result.success) {
                    throw new Error(result.error?.message || "Failed to add menu item");
                }
            }
            
            if (onSave) {
                onSave(itemToSave);
            }
            
            // Show success message
            setSuccessMessage(`Menu item "${menuItem.name}" was ${isEditMode ? 'updated' : 'added'} successfully!`);
            setShowSuccessAlert(true);
            
            // Reset form state if adding a new item, keep state if editing
            if (!isEditMode) {
                // Determine the appropriate restaurantId for the next item
                let nextRestaurantId = "";
                if (user && !isSuperAdmin() && user.restaurantId) {
                    nextRestaurantId = user.restaurantId;
                } else if (isSuperAdmin()) {
                    nextRestaurantId = DEFAULT_RESTAURANT_ID;
                }
                
                setMenuItem({
                    name: "",
                    price: "",
                    description: "",
                    categoryId: "",
                    imageUrl: "",
                    isVegetarian: false,
                    tags: [],
                    featured: false,
                    isActive: true,
                    imageFile: null,
                    restaurantId: nextRestaurantId,
                    branchId: ""
                });
            }
            
            // Close modal after a short delay to allow user to see the success message
            setTimeout(() => {
                setShowSuccessAlert(false);
                toggle();
            }, 1500);
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} menu item:`, error);
            setErrorMessage(error.message || `Failed to ${isEditMode ? 'update' : 'add'} menu item. Please try again.`);
            setShowErrorAlert(true);
        }
    };

    // Function to dismiss alerts
    const onDismissSuccessAlert = () => setShowSuccessAlert(false);
    const onDismissErrorAlert = () => setShowErrorAlert(false);

    // Custom styles for right-aligned modal
    const modalStyles = {
        modal: {
            position: 'fixed',
            top: '0',
            right: '0',
            bottom: '0',
            margin: '0',
            height: '100vh',
            width: '500px',
            maxWidth: '100%'
        },
        card: {
            height: '100%',
            borderRadius: '0',
            margin: '0'
        },
        cardBody: {
            overflowY: 'auto'
        }
    };

    // Effect to filter categories when restaurant or branch changes
    useEffect(() => {
        // Skip if not open yet or no categories available
        if (!isOpen || !categories.length) return;
        
        // Filter categories based on selected restaurant and branch
        if (menuItem.restaurantId) {
            // If we're in edit mode and have a categoryId, first check if the category exists in the categories array
            if (isEditMode && menuItem.categoryId) {
                // Make sure the current category is included in filtered results
                const currentCategory = categories.find(cat => String(cat._id) === String(menuItem.categoryId));
                
                // If we have the category but it doesn't match the current restaurant/branch filter,
                // temporarily include it anyway so it appears in the dropdown
                if (currentCategory && String(currentCategory.restaurantId) !== String(menuItem.restaurantId)) {
                    const filtered = [
                        currentCategory,
                        ...categories.filter(category => {
                            // Normal filtering logic
                            const restaurantMatch = String(category.restaurantId) === String(menuItem.restaurantId);
                            

                            if (menuItem.branchId) {
                                return restaurantMatch && 
                                     (!category.branchId || String(category.branchId) === String(menuItem.branchId));
                            }
                            

                            return restaurantMatch;
                        })
                    ];
                    
                    setFilteredCategories(filtered);
                    return;
                }
            }
            
            // Standard filtering logic
            const filtered = categories.filter(category => {
                // Match by restaurant - convert both to strings for consistent comparison
                const restaurantMatch = String(category.restaurantId) === String(menuItem.restaurantId);
                
                // If branch is selected, match categories that either:
                // 1. Have the same branch ID 
                // 2. Have no branch ID specified (meaning they're available to all branches)
                if (menuItem.branchId) {
                    return restaurantMatch && 
                           (!category.branchId || String(category.branchId) === String(menuItem.branchId));
                }
                
                // If no branch selected, just match by restaurant
                return restaurantMatch;
            });
            
            setFilteredCategories(filtered);
            
            // In edit mode, never reset the category selection
            if (isEditMode) {
                return;
            }
            
            // Only for add mode: if current selection is not in filtered list and we have options, reset selection
            if (menuItem.categoryId && filtered.length > 0 && 
                !filtered.some(category => String(category._id) === String(menuItem.categoryId))) {
                setMenuItem(prev => ({
                    ...prev,
                    categoryId: "" // Reset category selection
                }));
            }
        } else {
            // If no restaurant selected, use all categories
            setFilteredCategories(categories);
        }
    }, [isOpen, categories, menuItem.restaurantId, menuItem.branchId, menuItem.categoryId, isEditMode]);

    // Special effect specifically for handling edit mode and category selection
    useEffect(() => {
        // Only run when in edit mode and the modal is open
        if (!isEditMode || !isOpen || !editItem) {
            return;
        }

        console.log("Edit mode effect triggered with item:", editItem);
        
        // Check if we have a categoryId in the edit item
        if (!editItem.categoryId) {
            console.log("Warning: Edit item doesn't have a categoryId");
            return;
        }

        console.log("Looking for category with ID:", editItem.categoryId);

        // Make sure categories are loaded
        if (categories && categories.length > 0) {
            // First try to find the category object
            const categoryObj = categories.find(c => String(c._id) === String(editItem.categoryId));
            console.log("Found category object:", categoryObj);
            
            // Always ensure the categoryId is set, even if we can't find the category object
            setMenuItem(prev => {
                // Only update if the categoryId has changed
                if (prev.categoryId !== editItem.categoryId) {
                    return {
                        ...prev,
                        categoryId: editItem.categoryId
                    };
                }
                return prev;
            });

            // Update filtered categories to include this category if it exists
            if (categoryObj) {
                // Make sure this category appears in filtered categories
                setFilteredCategories(prevFiltered => {
                    // Check if the category is already in the filtered list
                    const alreadyIncluded = prevFiltered.some(c => String(c._id) === String(categoryObj._id));
                    
                    if (!alreadyIncluded) {
                        console.log("Adding category to filtered list:", categoryObj.name);
                        return [categoryObj, ...prevFiltered];
                    }
                    
                    return prevFiltered;
                });
            } else {
                console.log("Category not found in categories list. Will use ID directly.");
                
                // Try to fetch the specific category by ID
                fetchCategoryById(editItem.categoryId).then(fetchedCategory => {
                    if (fetchedCategory) {
                        console.log("Successfully fetched category by ID:", fetchedCategory.name);
                        // Add this category to the filtered list
                        setFilteredCategories(prevFiltered => {
                            const alreadyIncluded = prevFiltered.some(c => String(c._id) === String(fetchedCategory._id));
                            if (!alreadyIncluded) {
                                return [fetchedCategory, ...prevFiltered];
                            }
                            return prevFiltered;
                        });
                    } else {
                        console.log("Could not find category with ID:", editItem.categoryId);
                        // Let's fetch all categories to make sure we have the latest data
                        filterCategories();
                    }
                });
            }
        } else {
            console.log("Categories not yet loaded. Will try again when they are.");
            // Ensure categories are loaded
            filterCategories();
        }
    }, [isEditMode, isOpen, editItem, categories, filterCategories, fetchCategoryById]);

    return (
        <>
            {/* Success Alert outside the modal */}
            <Alert 
                color="success" 
                isOpen={showSuccessAlert} 
                toggle={onDismissSuccessAlert}
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    minWidth: '300px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                    borderLeft: '5px solid #2dce89'
                }}
            >
                <div className="d-flex align-items-center">
                    <i className="ni ni-check-bold mr-2" style={{ fontSize: '1.2rem' }}></i>
                    <div>
                        <h6 className="mb-0">Success!</h6>
                        <p className="mb-0">{successMessage}</p>
                    </div>
                </div>
            </Alert>
            
            {/* Error Alert outside the modal */}
            <Alert 
                color="danger" 
                isOpen={showErrorAlert} 
                toggle={onDismissErrorAlert}
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    minWidth: '300px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                    borderLeft: '5px solid #f5365c'
                }}
            >
                <div className="d-flex align-items-center">
                    <i className="ni ni-fat-remove mr-2" style={{ fontSize: '1.2rem' }}></i>
                    <div>
                        <h6 className="mb-0">Error</h6>
                        <p className="mb-0">{errorMessage}</p>
                    </div>
                </div>
            </Alert>
            
            <Modal 
                isOpen={isOpen} 
                toggle={toggle} 
                backdrop="static"
                keyboard={false} 
                className="right-modal"
                contentClassName="modal-right"
                style={modalStyles.modal}
                size="lg"
            >
                <Card style={modalStyles.card}>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{isEditMode ? 'Edit Menu Item' : 'Add Menu Item'}</h5>
                        <button type="button" className="close" onClick={toggle}>
                            <span aria-hidden="true">×</span>
                        </button>
                    </CardHeader>
                    <CardBody style={modalStyles.cardBody}>
                        <Form onSubmit={handleFormSubmit}>
                            {/* Restaurant selection - only visible to Super_Admin */}
                            {isSuperAdmin() ? (
                                <FormGroup>
                                    <Label for="restaurantId">Restaurant</Label>
                                    <Input
                                        type="select"
                                        name="restaurantId"
                                        id="restaurantId"
                                        value={menuItem.restaurantId}
                                        onChange={handleChange}
                                        disabled={restaurantsLoading}
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
                                </FormGroup>
                            ) : (
                                <input type="hidden" name="restaurantId" value={user?.restaurantId || ''} />
                            )}

                            {/* Branch selection - appears only for Super_Admin or if the user already has a branch assignment */}
                            {isSuperAdmin() && menuItem.restaurantId ? (
                                <FormGroup>
                                    <Label for="branchId">Branch</Label>
                                    <Input
                                        type="select"
                                        name="branchId"
                                        id="branchId"
                                        value={menuItem.branchId}
                                        onChange={handleChange}
                                        disabled={loadingBranches}
                                    >
                                        <option value="">All Branches</option>
                                        {loadingBranches ? (
                                            <option disabled>Loading branches...</option>
                                        ) : branches.length > 0 ? (
                                            branches.map(branch => (
                                                <option key={branch._id} value={branch._id}>
                                                    {branch.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option disabled>No branches available</option>
                                        )}
                                    </Input>
                                    <small className="form-text text-muted">
                                        Select a specific branch or leave blank for all branches
                                    </small>
                                </FormGroup>
                            ) : (
                                <input type="hidden" name="branchId" value={user?.branchId || ''} />
                            )}

                            <FormGroup>
    <Label for="categoryId">Category*</Label>
    <Input
        type="select"
        name="categoryId"
        id="categoryId"
        value={typeof menuItem.categoryId === 'object' ? menuItem.categoryId?._id : menuItem.categoryId || ""}
        onChange={handleChange}
        required
    >
        <option value="">Select a category</option>
        {categoriesLoading ? (
            <option disabled>Loading categories...</option>
        ) : isEditMode && menuItem.categoryId ? (
            // In edit mode, always include current category at the top
            // This ensures it's displayed even if it doesn't match current filters
            <>
                {/* Display current category at the top if it exists in the categories array */}
                {(() => {
                    const categoryId = typeof menuItem.categoryId === 'object' ? menuItem.categoryId?._id : menuItem.categoryId;
                    const currentCategory = categories.find(c => String(c._id) === String(categoryId));
                    return currentCategory ? (
                        <option key={`current-${currentCategory._id}`} value={currentCategory._id} style={{fontWeight: "bold"}}>
                            {currentCategory.name} 
                        </option>
                    ) : (
                        <option key={`unknown-${categoryId}`} value={categoryId} style={{fontWeight: "bold"}}>
                            {typeof menuItem.categoryId === 'object' && menuItem.categoryId?.name 
                                ? menuItem.categoryId.name 
                                : `Category (ID: ${categoryId})`} 
                        </option>
                    );
                })()}
                
                {/* Filter out the current category to avoid duplication, and format with hierarchy */}
                {filteredCategories
                    .filter(c => String(c._id) !== String(typeof menuItem.categoryId === 'object' ? menuItem.categoryId?._id : menuItem.categoryId))
                    .map(category => {
                        const level = category.level || 0;
                        const indent = level > 0 ? Array(level).fill('\u00A0\u00A0\u00A0\u00A0').join('') : '';
                        const prefix = level > 0 ? '↳ ' : '';
                        
                        return (
                            <option key={category._id} value={category._id}>
                                {indent}{prefix}{category.name}
                                {category.parentCategory ? ` (${getParentCategoryName(category.parentCategory)})` : ''}
                            </option>
                        );
                    })
                }
            </>
        ) : filteredCategories && filteredCategories.length > 0 ? (
            filteredCategories.map(category => {
                const level = category.level || 0;
                const indent = level > 0 ? Array(level).fill('\u00A0\u00A0\u00A0\u00A0').join('') : '';
                const prefix = level > 0 ? '↳ ' : '';
                
                return (
                    <option key={category._id} value={category._id}>
                        {indent}{prefix}{category.name}
                        {category.parentCategory ? ` (${getParentCategoryName(category.parentCategory)})` : ''}
                    </option>
                );
            })
        ) : menuItem.restaurantId ? (
            <option disabled>No categories available for this restaurant/branch</option>
        ) : (
            <option disabled>Please select a restaurant first</option>
        )}
    </Input>
    <small className="form-text text-muted">
        {menuItem.restaurantId ? 
            `Showing categories for ${menuItem.branchId ? 'selected branch and common categories' : 'selected restaurant'}` : 
            'Select a restaurant to see available categories'}
    </small>
</FormGroup>

                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="name">Name*</Label>
                                        <Input
                                            type="text"
                                            name="name"
                                            id="name"
                                            value={menuItem.name}
                                            onChange={handleChange}
                                            placeholder="Enter item name"
                                            required
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="price">Price*</Label>
                                        <InputGroup>
                                            <InputGroupAddon addonType="prepend">
                                                <InputGroupText>{currencySymbol}</InputGroupText>
                                            </InputGroupAddon>
                                            <Input
                                                type="number"
                                                name="price"
                                                id="price"
                                                value={menuItem.price}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                                required
                                            />
                                        </InputGroup>
                                    </FormGroup>
                                </Col>
                            </Row>


                            <FormGroup>
                                <Label for="imageUpload">Item Image</Label>
                                <div className="d-flex align-items-center">
                                    <div className="flex-grow-1">
                                        <CustomInput
                                            type="file"
                                            id="imageUpload"
                                            name="imageFile"
                                            label="Choose an image..."
                                            onChange={handleFileChange}
                                            accept="image/*"
                                        />
                                    </div>
                                    {menuItem.imageUrl && (
                                        <div className="ml-3 position-relative" style={{ width: '60px', height: '60px' }}>
                                            <img 
                                                src={menuItem.imageUrl}
                                                alt="Preview" 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover',
                                                    borderRadius: '4px' 
                                                }} 
                                            /> 
                                            <button
                                                type="button"
                                                className="close"
                                                aria-label="Close"
                                                onClick={() => {    
                                                    setMenuItem({ ...menuItem, imageUrl: "", imageFile: null });
                                                   
                                                    // Check if it's a blob URL before revoking
                                                    if (menuItem.imageUrl && menuItem.imageUrl.startsWith('blob:')) {
                                                        URL.revokeObjectURL(menuItem.imageUrl); // Clean up the object URL
                                                    }
                                                }}
                                                style={{ position: 'absolute', top: '0', right: '0', background: 'white', border: 'none', width: '20px', height: '20px', cursor: 'pointer', zIndex: 1 }}
                                            >
                                                <span aria-hidden="true" style={{ color: 'red' }}>×</span>  
                                            </button>
                                        </div>
                                      
                                    )}
                                </div>
                                {!menuItem.imageFile && (
                                    <FormGroup className="mt-2">
                                        <Label for="imageUrl">Or Image URL</Label>
                                        <Input
                                            type="text"
                                            name="imageUrl"
                                            id="imageUrl"
                                            value={menuItem.imageUrl}
                                            onChange={handleChange}
                                            placeholder="https://example.com/image.jpg"
                                        />
                                    </FormGroup>
                                   

                                )}
                            </FormGroup>

                            <FormGroup>
                                <Label for="isVegetarian">Is Vegetarian</Label>
                                <div>
                                    <CustomInput
                                        type="switch"
                                        id="isVegetarian"
                                        name="isVegetarian"
                                        label="Yes"
                                        checked={menuItem.isVegetarian}
                                        onChange={handleChange}
                                    />
                                </div>
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
                                {menuItem.tags.length > 0 && (
                                    <div className="mt-2">
                                        {menuItem.tags.map((tag, index) => (
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

                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="featured">Featured Item</Label>
                                        <div>
                                            <CustomInput
                                                type="switch"
                                                id="featured"
                                                name="featured"
                                                label="In featured"
                                                checked={menuItem.featured}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="isActive">Active Status</Label>
                                        <div>
                                            <CustomInput
                                                type="switch"
                                                id="isActive"
                                                name="isActive"
                                                label="Is available"
                                                checked={menuItem.isActive}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </FormGroup>
                                </Col>
                            </Row>

                            <FormGroup>
                                <Label for="description">Description</Label>
                                <Input
                                    type="textarea"
                                    name="description"
                                    id="description"
                                    value={menuItem.description}
                                    onChange={handleChange}
                                    placeholder="Enter item description"
                                    rows="3"
                                />
                            </FormGroup>

                            {/* Size Variants Section */}
                            <FormGroup className="mt-3">
                                <Label className="d-flex justify-content-between align-items-center">
                                    <span>Size Variants</span>
                                    <Button 
                                        color="info" 
                                        size="sm" 
                                        onClick={() => {
                                            setMenuItem({
                                                ...menuItem,
                                                sizeVariants: [
                                                    ...menuItem.sizeVariants || [],
                                                    { name: '', price: '' }
                                                ]
                                            });
                                        }}
                                    >
                                        <i className="fas fa-plus-circle mr-1"></i> Add Size
                                    </Button>
                                </Label>
                                
                                {menuItem.sizeVariants && menuItem.sizeVariants.length > 0 ? (
                                    <div className="border rounded p-3 mb-3">
                                        {menuItem.sizeVariants.map((variant, index) => (
                                            <Row key={index} className="mb-2">
                                                <Col xs="5">
                                                    <Input
                                                        type="text"
                                                        placeholder="Size name (e.g. Small)"
                                                        value={variant.name}
                                                        onChange={(e) => {
                                                            const updatedVariants = [...menuItem.sizeVariants];
                                                            updatedVariants[index] = {
                                                                ...variant,
                                                                name: e.target.value
                                                            };
                                                            setMenuItem({
                                                                ...menuItem,
                                                                sizeVariants: updatedVariants
                                                            });
                                                        }}
                                                    />
                                                </Col>
                                                <Col xs="5">
                                                    <InputGroup>
                                                        <InputGroupAddon addonType="prepend">
                                                            <InputGroupText>{currencySymbol}</InputGroupText>
                                                        </InputGroupAddon>
                                                        <Input
                                                            type="number"
                                                            placeholder="Price"
                                                            min="0"
                                                            step="0.01"
                                                            value={variant.price}
                                                            onChange={(e) => {
                                                                const updatedVariants = [...menuItem.sizeVariants];
                                                                updatedVariants[index] = {
                                                                    ...variant,
                                                                    price: e.target.value
                                                                };
                                                                setMenuItem({
                                                                    ...menuItem,
                                                                    sizeVariants: updatedVariants
                                                                });
                                                            }}
                                                        />
                                                    </InputGroup>
                                                </Col>
                                                <Col xs="2" className="d-flex align-items-center">
                                                    <Button
                                                        color="danger"
                                                        size="sm"
                                                        onClick={() => {
                                                            const updatedVariants = menuItem.sizeVariants.filter((_, i) => i !== index);
                                                            setMenuItem({
                                                                ...menuItem,
                                                                sizeVariants: updatedVariants
                                                            });
                                                        }}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </Button>
                                                </Col>
                                            </Row>
                                        ))}
                                        <small className="text-muted mt-2 d-block">
                                            When size variants are added, they will be shown as options when ordering this item.
                                        </small>
                                    </div>
                                ) : (
                                    <div className="text-center p-3 border rounded mb-3 bg-light">
                                        <p className="text-muted mb-0">No size variants added. This item will use the base price only.</p>
                                        <small className="text-info">Click "Add Size" to create different sizes with their own prices.</small>
                                    </div>
                                )}
                            </FormGroup>

                            <Row className="mt-4">
                                <Col className="text-right">
                                    <Button color="secondary" onClick={toggle} type="button" className="mr-2">
                                        Cancel
                                    </Button>
                                    <Button color="primary" type="submit">
                                        {isEditMode ? 'Update Item' : 'Save Item'}
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    </CardBody>
                </Card>
            </Modal>
        </>
    );
};

export default MenuItemModal;