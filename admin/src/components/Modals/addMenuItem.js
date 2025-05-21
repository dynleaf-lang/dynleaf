// reactstrap components
import React, { useState, useRef, useContext, useEffect } from "react";
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

const MenuItemModal = ({ isOpen, toggle, onSave, editItem = null }) => {
    // Get the default restaurant ID and user context
    const { addMenuItem, updateMenuItem, DEFAULT_RESTAURANT_ID, uploadImage } = useContext(MenuContext);
    const { categories, loading: categoriesLoading } = useContext(CategoryContext);
    const { user, isSuperAdmin } = useContext(AuthContext);
    const { restaurants, fetchRestaurants, loading: restaurantsLoading } = useContext(RestaurantContext);
    const { fetchBranchesByRestaurant } = useContext(BranchContext);

    // Determine if we're in edit mode
    const isEditMode = !!editItem;

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
        branchId: user?.branchId || "" // Add branchId to the state
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

    // Fetch restaurants when the modal opens
    useEffect(() => {
        if (isOpen) {
            fetchRestaurants();
        }
    }, [isOpen, fetchRestaurants]);

    // Load branches when restaurant changes
    useEffect(() => {
        const loadBranches = async () => {
            if (menuItem.restaurantId) {
                setLoadingBranches(true);
                try {
                    const branchData = await fetchBranchesByRestaurant(menuItem.restaurantId);
                    setBranches(branchData);
                } catch (error) {
                    console.error("Error loading branches:", error);
                    setBranches([]);
                } finally {
                    setLoadingBranches(false);
                }
            } else {
                setBranches([]);
            }
        };
        
        loadBranches();
    }, [menuItem.restaurantId, fetchBranchesByRestaurant]);

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
    }, [editItem, DEFAULT_RESTAURANT_ID, user, isSuperAdmin]);

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
            setMenuItem({ 
                ...menuItem, 
                imageFile: file,
                // Create a temporary URL for preview
                imageUrl: URL.createObjectURL(file)
            });
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
        if (!menuItem.name || !menuItem.price || !menuItem.categoryId) {
            setErrorMessage("Please fill in all required fields.");
            setShowErrorAlert(true);
            return;
        }

        // Parse price as a number to ensure it's sent as a number, not a string
        const parsedPrice = parseFloat(menuItem.price);
        if (isNaN(parsedPrice)) {
            setErrorMessage("Price must be a valid number.");
            setShowErrorAlert(true);
            return;
        }
        
        // Determine the appropriate restaurantId for the item
        let restaurantId = menuItem.restaurantId;
        
        // For non-Super_Admin users, always use their assigned restaurant
        if (user && !isSuperAdmin() && user.restaurantId) {
            restaurantId = user.restaurantId;
        }
        // For Super_Admin without a restaurant specified, use the default
        else if (isSuperAdmin() && !restaurantId) {
            restaurantId = DEFAULT_RESTAURANT_ID;
        }
        
        // Clone menuItem to send to parent
        const itemToSave = {
            ...menuItem,
            price: parsedPrice, // Ensure price is a number
            restaurantId: restaurantId, // Use the determined restaurantId
            // Make sure categoryId is never an empty string
            categoryId: menuItem.categoryId || undefined,
            // Include branchId only if it's set
            branchId: menuItem.branchId || undefined
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
            }

            // Call the appropriate API function based on whether we're adding or editing
            let result = null;
            if (isEditMode) {
                // Update existing item
                result = await updateMenuItem(editItem._id, itemToSave);
                
                if (!result.success) {
                    throw new Error(result.error?.message || "Failed to update menu item");
                }
            } else {
                // Add new item
                result = await addMenuItem(itemToSave);
                
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
                                    <Label for="branchId">Branch (Optional)</Label>
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
                                                <InputGroupText>₹</InputGroupText>
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
                                <Label for="categoryId">Category*</Label>
                                <Input
                                    type="select"
                                    name="categoryId"
                                    id="categoryId"
                                    value={menuItem.categoryId}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categoriesLoading ? (
                                        <option disabled>Loading categories...</option>
                                    ) : categories && categories.length > 0 ? (
                                        categories.map(category => (
                                            <option key={category._id} value={category._id}>
                                                {category.name}
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="64db01d2b533d955dd861ef1">Appetizers</option>
                                            <option value="64db01d2b533d955dd861ef2">Main Course</option>
                                            <option value="64db01d2b533d955dd861ef3">Desserts</option>
                                            <option value="64db01d2b533d955dd861ef4">Beverages</option>
                                        </>
                                    )}
                                </Input>
                                <small className="form-text text-muted">
                                    Must select a valid category from the database
                                </small>
                            </FormGroup>

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