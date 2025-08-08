import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  CardBody, 
  CardImg,
  Button, 
  Badge, 
  Input, 
  InputGroup,
  Nav,
  NavItem,
  NavLink,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Spinner,
  Alert
} from 'reactstrap';
import { 
  FaSearch, 
  FaPlus, 
  FaMinus, 
  FaShoppingCart,
  FaUtensils,
  FaFilter,
  FaStar,
  FaLeaf,
  FaFire,
  FaEdit,
  FaEye
} from 'react-icons/fa';
import { usePOS } from '../../context/POSContext';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import CartSidebar from './CartSidebar';
import toast from 'react-hot-toast';
import './MenuSelection.css';

const MenuSelection = () => {
  const { 
    categories, 
    menuItems, 
    selectedTable, 
    getMenuItemsByCategory,
    searchMenuItems,
    loading 
  } = usePOS();
 
  
  
  const { addToCart, cartItems, getItemCount } = useCart();
  const { formatCurrency: formatCurrencyDynamic, getCurrencySymbol, isReady: currencyReady } = useCurrency();

  // Dynamic currency formatting function
  const formatPrice = (price) => {
    if (currencyReady && formatCurrencyDynamic) {
      return formatCurrencyDynamic(price, { minimumFractionDigits: 0 });
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price || 0);
  };
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemCustomizations, setItemCustomizations] = useState({
    spiceLevel: 'medium',
    specialInstructions: ''
  });

  // Menu display settings state
  const [menuSettings, setMenuSettings] = useState({
    showCardImages: false,
    cardImageHeight: 120,
    showItemDescription: false,
    compactView: true,
    showPreparationTime: true,
    showItemBadges: true
  });

  // Load menu settings from localStorage and listen for changes
  useEffect(() => {
    const loadMenuSettings = () => {
      const savedSettings = localStorage.getItem('menu_settings');
      if (savedSettings) {
        setMenuSettings(JSON.parse(savedSettings));
      }
    };

    // Load settings on component mount
    loadMenuSettings();

    // Listen for settings changes from Settings component
    const handleSettingsChange = (event) => {
      setMenuSettings(event.detail);
    };

    window.addEventListener('menuSettingsChanged', handleSettingsChange);

    // Cleanup event listener
    return () => {
      window.removeEventListener('menuSettingsChanged', handleSettingsChange);
    };
  }, []);
 

  // Filter menu items based on category and search
  const filteredItems = React.useMemo(() => {
    let items = selectedCategory === 'all' 
      ? menuItems 
      : getMenuItemsByCategory(selectedCategory);
    
    if (searchTerm.trim()) {
      items = searchMenuItems(searchTerm);
      if (selectedCategory !== 'all') {
        items = items.filter(item => {
          let itemCategoryId = item.categoryId || item.category?._id || item.category;
          // If category is a populated object, extract the _id
          if (typeof itemCategoryId === 'object' && itemCategoryId?._id) {
            itemCategoryId = itemCategoryId._id;
          }
          return itemCategoryId === selectedCategory;
        });
      }
    }
    
    return items;
  }, [menuItems, selectedCategory, searchTerm, getMenuItemsByCategory, searchMenuItems]);
  
 
  


  const handleAddToCart = (item, quantity = 1, customizations = {}) => {
    addToCart(item, quantity, customizations);
    setShowItemModal(false);
    resetItemModal();
  };

  // Direct add to cart function for Add button (no modal)
  const handleDirectAddToCart = (item) => {
    const defaultCustomizations = {
      spiceLevel: 'medium',
      specialInstructions: ''
    };
    addToCart(item, 1, defaultCustomizations);
    toast.success(`${item.name} added to cart!`);
  };

  const handleItemClick = (item) => {
    // Only open modal for viewing item details, not for adding
    setSelectedItem(item);
    setItemQuantity(1);
    setItemCustomizations({
      spiceLevel: 'medium',
      specialInstructions: ''
    });
    setShowItemModal(true);
  };

  const handleEditItem = (item) => {
    // Open modal for editing existing cart item
    const cartItem = getItemInCart(item._id);
    setSelectedItem(item);
    setItemQuantity(cartItem ? cartItem.quantity : 1);
    setItemCustomizations(cartItem ? cartItem.customizations : {
      spiceLevel: 'medium',
      specialInstructions: ''
    });
    setShowItemModal(true);
  };

  const resetItemModal = () => {
    setSelectedItem(null);
    setItemQuantity(1);
    setItemCustomizations({
      spiceLevel: 'medium',
      specialInstructions: ''
    });
  };



  const getItemInCart = (itemId) => {
    return cartItems.find(cartItem => cartItem._id === itemId);
  };

  // Check if item has variants or size differences that require modal
  const hasVariantsOrSizes = (item) => {
    // Check for variants (like sizes, flavors, etc.)
    if (item.variants && item.variants.length > 0) {
      return true;
    }
    
    // Check for size options
    if (item.sizes && item.sizes.length > 1) {
      return true;
    }
    
    // Check for customization options that require user input
    if (item.customizations && item.customizations.length > 0) {
      return true;
    }
    
    // Check if item has complex spice levels or special requirements
    if (item.requiresCustomization) {
      return true;
    }
    
    return false;
  };

  // Handle smart card click - add to cart or open modal
  const handleSmartCardClick = (item) => {
    if (hasVariantsOrSizes(item)) {
      // Item has variants/sizes, open modal for customization
      handleItemClick(item);
    } else {
      // Simple item, add directly to cart
      handleDirectAddToCart(item);
    }
  };

  const ItemCard = ({ item }) => {
    const itemInCart = getItemInCart(item._id);
    const itemCount = getItemCount(item._id);
    const hasVariants = hasVariantsOrSizes(item);
    
    const cardHeight = menuSettings.compactView ? '60px' : '80px';
    const imageHeight = menuSettings.showCardImages ? `${menuSettings.cardImageHeight}px` : '0px';
    
    return (
      <Card 
        className={`menu-item-card h-100 shadow-sm border-0`}
        style={{
          cursor: 'pointer',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        onClick={() => handleSmartCardClick(item)}
      >
        {/* Conditional Image Section */}
        {menuSettings.showCardImages && (
          <div className="position-relative" style={{ height: imageHeight, overflow: 'hidden' }}>
            <CardImg
              top 
              src={item.imageUrl || 'https://thumbs.dreamstime.com/b/no-found-symbol-unsuccessful-search-vecotr-upset-magnifying-glass-cute-not-zoom-icon-suitable-results-oops-page-failure-122786031.jpg' }
              alt={item.name}
              style={{ 
                height: '100%', 
                objectFit: 'cover',
                transition: 'transform 0.2s ease'
              }}
              onError={(e) => {
                e.target.src = 'https://thumbs.dreamstime.com/b/no-found-symbol-unsuccessful-search-vecotr-upset-magnifying-glass-cute-not-zoom-icon-suitable-results-oops-page-failure-122786031.jpg';
              }}
            />
            
            {/* Item Count Badge on Image */}
            {itemCount > 0 && (
              <Badge 
                color="success" 
                className="position-absolute top-0 start-0 m-2"
                style={{ 
                  fontSize: '0.7rem',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}
              >
                {itemCount}
              </Badge>
            )}
            
            {/* Variants Indicator on Image */}
            {hasVariants && (
              <Badge 
                color="info" 
                className="position-absolute top-0 end-0 m-2"
                style={{ 
                  fontSize: '0.65rem',
                  borderRadius: '12px'
                }}
              >
                Options
              </Badge>
            )}
            
            {/* Overlay for better text visibility */}
            <div className="position-absolute bottom-0 start-0 end-0" style={{
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              height: '50%'
            }}></div>
          </div>
        )}
        
        <CardBody className="p-2 d-flex flex-column justify-content-center" style={{ 
          minHeight: menuSettings.showCardImages ? cardHeight : cardHeight
        }}>
          <div className="text-center">
            {/* Item Name */}
            <h6 className="card-title mb-1" style={{ 
              fontSize: menuSettings.compactView ? '0.85rem' : '0.95rem', 
              fontWeight: '600',
              color: '#2d3748',
              lineHeight: '1.2'
            }}>
              {item.name}
            </h6>
           
            
            {/* Variants Indicator when no image */}
            {!menuSettings.showCardImages && hasVariants && (
              <Badge 
                color="info" 
                size="sm"
                className="mb-1 ms-1"
                style={{ 
                  fontSize: '0.65rem',
                  borderRadius: '12px'
                }}
              >
                Options Available
              </Badge>
            )}
            
            {/* Conditional Item Description */}
            {menuSettings.showItemDescription && (
              <p className="card-text text-muted mb-1" style={{ 
                fontSize: '0.7rem',
                lineHeight: '1.2',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.description || 'Delicious menu item'}
              </p>
            )}
            
            {/* Conditional Item Tags */}
            {menuSettings.showItemBadges && (
              <div className="d-flex justify-content-center flex-wrap gap-1">
                {item.isVegetarian && (
                  <Badge color="success" className="badge-sm" style={{
                    fontSize: '0.6rem',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '8px'
                  }}>
                    <FaLeaf style={{ fontSize: '0.55rem' }} />
                  </Badge>
                )}
                {item.isSpicy && (
                  <Badge color="danger" className="badge-sm" style={{
                    fontSize: '0.6rem',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '8px'
                  }}>
                    <FaFire style={{ fontSize: '0.55rem' }} />
                  </Badge>
                )}
                {menuSettings.showPreparationTime && item.preparationTime && (
                  <Badge color="info" className="badge-sm" style={{
                    fontSize: '0.6rem',
                    padding: '0.1rem 0.3rem',
                    borderRadius: '8px'
                  }}>
                    {item.preparationTime}m
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardBody>
        
        {/* Hover Effect Overlay */}
        <div className="hover-overlay">
          <div className="text-white text-center d-flex align-items-center justify-content-center">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', marginRight: '0.5rem' }}>
              {hasVariants ? '⚙️' : '+'}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
              {hasVariants ? 'Choose Options' : 'Add to Cart'}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (!selectedTable) {
    return (
      <Alert color="warning" className="m-4" fade={false}>
        <h5>No Table Selected</h5>
        <p>Please select a table first before browsing the menu.</p>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">
          <h5>Loading Menu...</h5>
          <p className="text-muted">Please wait while we fetch the menu items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-selection" style={{ height: 'calc(100vh - 100px)' }}>
      <Row className="h-100">
        {/* Menu Section - Left Side */}
        <Col lg={8} className="pe-3 d-flex flex-column">
          {/* Header with Search - Fixed */}
          <div className="menu-header bg-white" style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 5,
            paddingBottom: '1rem',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '1rem'
          }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center">
                <h4 className="mb-0 me-3">
                  <FaUtensils className="me-2 text-primary" />
                  Menu Selection
                </h4>
                {selectedTable && (
                  <Badge color="info" className="fs-6">
                    Table {selectedTable.TableName}
                  </Badge>
                )}
              </div>
              
              {/* Search */}
              <InputGroup style={{ width: '280px' }}>
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
                <Button color="outline-secondary" size="sm">
                  <FaSearch />
                </Button>
              </InputGroup>
            </div>

            {/* Categories Navigation */}
            <Nav pills className="flex-nowrap category-nav" style={{ 
              overflowX: 'auto',
              scrollbarWidth: 'thin'
            }}>
              <NavItem>
                <NavLink
                  className={selectedCategory === 'all' ? 'active' : ''}
                  onClick={() => setSelectedCategory('all')}
                  style={{ 
                    cursor: 'pointer', 
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                    padding: '0.4rem 0.8rem'
                  }}
                >
                  <FaUtensils className="me-1" style={{ fontSize: '0.8rem' }} />
                  All Items
                </NavLink>
              </NavItem>
              {categories.map(category => (
                <NavItem key={category._id}>
                  <NavLink
                    className={selectedCategory === category._id ? 'active' : ''}
                    onClick={() => setSelectedCategory(category._id)}
                    style={{ 
                      cursor: 'pointer', 
                      whiteSpace: 'nowrap',
                      fontSize: '0.85rem',
                      padding: '0.4rem 0.8rem'
                    }}
                  >
                    {category.name}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </div>

          {/* Menu Items Grid - Scrollable */}
          <div className="menu-items-container" style={{ 
            flex: 1, 
            overflowY: 'auto',
            paddingRight: '0.5rem',
            overflowX: 'hidden',
            maxHeight: 'calc(100vh - 200px)',
          }}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="mt-2">Loading menu items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <Alert color="info" className="text-center">
                <h5>No items found</h5>
                <p>Try adjusting your search or category filter.</p>
              </Alert>
            ) : (
              <Row className="g-3">
                {filteredItems.map(item => (
                  <Col key={item._id} sm={6} md={4} lg={4} xl={3} >
                    <ItemCard item={item} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Col>

        {/* Cart Sidebar - Right Side */}
        <Col lg={4} className="ps-3">
          <CartSidebar />
        </Col>
      </Row>

      {/* Item Details Modal */}
      <Modal 
        isOpen={showItemModal} 
        toggle={() => setShowItemModal(false)}
        size="lg"
      >
        <ModalHeader toggle={() => setShowItemModal(false)}>
          {selectedItem?.name}
        </ModalHeader>
        <ModalBody>
          {selectedItem && (
            <Row>
              <Col md={6}>
                {selectedItem.image && (
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name}
                    className="img-fluid rounded mb-3"
                  />
                )}
                <h5>{selectedItem.name}</h5>
                <p className="text-muted">{selectedItem.description}</p>
                <h4 className="text-primary">{formatPrice(selectedItem.price)}</h4>
                
                <div className="mt-3">
                  {selectedItem.isVegetarian && (
                    <Badge color="success" className="me-2">
                      <FaLeaf className="me-1" />
                      Vegetarian
                    </Badge>
                  )}
                  {selectedItem.isSpicy && (
                    <Badge color="danger" className="me-2">
                      <FaFire className="me-1" />
                      Spicy
                    </Badge>
                  )}
                  {selectedItem.preparationTime && (
                    <Badge color="info">
                      <FaUtensils className="me-1" />
                      {selectedItem.preparationTime} mins
                    </Badge>
                  )}
                </div>
              </Col>
              
              <Col md={6}>
                <Form>
                  <FormGroup>
                    <Label>Quantity</Label>
                    <div className="d-flex align-items-center">
                      <Button
                        size="sm"
                        color="outline-secondary"
                        onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                      >
                        <FaMinus />
                      </Button>
                      <Input
                        type="number"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="mx-2 text-center"
                        style={{ width: '80px' }}
                      />
                      <Button
                        size="sm"
                        color="outline-secondary"
                        onClick={() => setItemQuantity(itemQuantity + 1)}
                      >
                        <FaPlus />
                      </Button>
                    </div>
                  </FormGroup>

                  <FormGroup>
                    <Label>Spice Level</Label>
                    <Input
                      type="select"
                      value={itemCustomizations.spiceLevel}
                      onChange={(e) => setItemCustomizations(prev => ({
                        ...prev,
                        spiceLevel: e.target.value
                      }))}
                    >
                      <option value="mild">Mild</option>
                      <option value="medium">Medium</option>
                      <option value="hot">Hot</option>
                      <option value="extra-hot">Extra Hot</option>
                    </Input>
                  </FormGroup>

                  <FormGroup>
                    <Label>Special Instructions</Label>
                    <Input
                      type="textarea"
                      rows="3"
                      placeholder="Any special requests or modifications..."
                      value={itemCustomizations.specialInstructions}
                      onChange={(e) => setItemCustomizations(prev => ({
                        ...prev,
                        specialInstructions: e.target.value
                      }))}
                    />
                  </FormGroup>

                  <div className="mt-3">
                    <h6>Total: {formatPrice(selectedItem.price * itemQuantity)}</h6>
                  </div>
                </Form>
              </Col>
            </Row>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowItemModal(false)}>
            Cancel
          </Button>
          <Button 
            color="primary" 
            onClick={() => handleAddToCart(selectedItem, itemQuantity, itemCustomizations)}
          >
            <FaPlus className="me-2" />
            Add to Cart
          </Button>
        </ModalFooter>
      </Modal>


    </div>
  );
};

export default MenuSelection;
