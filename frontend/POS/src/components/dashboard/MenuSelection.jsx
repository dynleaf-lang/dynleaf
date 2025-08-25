  import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
 
  
  
  const { addToCart } = useCart();
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
  const searchInputRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemCustomizations, setItemCustomizations] = useState({
    spiceLevel: 'medium',
    specialInstructions: '',
    selectedVariant: null,
    selectedPrice: null,
    selectedAddons: []
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

  // Global key handler: F -> focus menu search (with guards)
  useEffect(() => {
    const isTypingContext = (target) => {
      if (!target) return false;
      const tag = (target.tagName || '').toUpperCase();
      const editable = target.isContentEditable;
      return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTypingContext(e.target)) return;
      const key = (e.key || '').toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          try { searchInputRef.current.select?.(); } catch {}
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
 

  // Filter menu items based on category and search
  const filteredItems = useMemo(() => {
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

  // Stable handlers to avoid recreations in memoized grids
  // Stable click handler reference so item grid doesn't re-render on unrelated state changes
  const onSmartCardClick = useCallback((item) => {
    handleSmartCardClick(item);
  }, []);
  
  // Memoized wrapper to prevent re-renders when parent re-renders without props changes
  // Defined before first usage in itemsGrid to avoid temporal dead zone errors
  const MemoItemCard = React.memo(ItemCard);

  // Memoized grid of items to prevent re-rendering when unrelated POS actions occur
  const itemsGrid = useMemo(() => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="mt-2">Loading menu items...</p>
        </div>
      );
    }
    if (filteredItems.length === 0) {
      return (
        <Alert color="info" className="text-center">
          <h5>No items found</h5>
          <p>Try adjusting your search or category filter.</p>
        </Alert>
      );
    }
    return (
      <Row className="g-3">
        {filteredItems.map(item => (
          <Col key={item._id} sm={4} md={3} lg={3} xl={2} >
            {/* Pass through item; ItemCard uses internal click guard */}
            <MemoItemCard item={item} onSmartClick={onSmartCardClick} />
          </Col>
        ))}
      </Row>
    );
  }, [filteredItems, loading, menuSettings, onSmartCardClick]);
  
 
  


  // Calculate total price including variants and addons
  const calculateItemTotal = () => {
    if (!selectedItem) return 0;
    
    let basePrice = selectedItem.price;
    
    // Use selected variant price if available
    if (itemCustomizations.selectedPrice) {
      basePrice = itemCustomizations.selectedPrice;
    }
    
    // Add addon prices
    let addonTotal = 0;
    if (itemCustomizations.selectedAddons && selectedItem.addons) {
      itemCustomizations.selectedAddons.forEach(addonName => {
        const addon = selectedItem.addons.find(a => a.name === addonName);
        if (addon) {
          addonTotal += addon.price || 0;
        }
      });
    }
    
    return (basePrice + addonTotal) * itemQuantity;
  };

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

  const resetItemModal = () => {
    setSelectedItem(null);
    setItemQuantity(1);
    setItemCustomizations({
      spiceLevel: 'medium',
      specialInstructions: '',
      selectedVariant: null,
      selectedPrice: null,
      selectedAddons: []
    });
  };

  const handleItemClick = (item) => {
    // Initialize modal with item and default selections
    setSelectedItem(item);
    setItemQuantity(1);
    
    // Initialize with default variant/size if available
    let defaultVariant = null;
    let defaultPrice = item.price;
    
    if (item.sizeVariants && item.sizeVariants.length > 0) {
      defaultVariant = item.sizeVariants[0].size;
      defaultPrice = item.sizeVariants[0].price;
    } else if (item.variants && item.variants.length > 0) {
      defaultVariant = item.variants[0].name;
      defaultPrice = item.variants[0].price || item.price;
    }
    
    setItemCustomizations({
      spiceLevel: 'medium',
      specialInstructions: '',
      selectedVariant: defaultVariant,
      selectedPrice: defaultPrice,
      selectedAddons: []
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
    if (item.sizeVariants && item.sizeVariants.length > 1) {
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

  // Tiny badge component that subscribes to cart context; only this re-renders on cart changes
  const ItemCountBadge = React.memo(({ itemId }) => {
    const { getItemCount } = useCart();
    const itemCount = getItemCount ? getItemCount(itemId) : 0;
    if (!itemCount) return null;
    return (
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
    );
  });

  function ItemCard({ item, onSmartClick }) {
    const hasVariants = hasVariantsOrSizes(item);
    const { getInventoryStatusForMenuItem } = usePOS();
    const inv = getInventoryStatusForMenuItem(item?._id);
    const invBadge = (() => {
      if (!inv) return null;
      const map = {
        in_stock: { color: 'success', text: 'In Stock' },
        low: { color: 'warning', text: 'Low' },
        critical: { color: 'danger', text: 'Critical' },
        out: { color: 'secondary', text: 'Out' }
      };
      const cfg = map[inv.status] || map.in_stock;
      return (
        <Badge color={cfg.color} className="badge-sm" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: '8px' }}>
          {cfg.text}
        </Badge>
      );
    })();
    
    const cardHeight = menuSettings.compactView ? '60px' : '80px';
    const imageHeight = menuSettings.showCardImages ? `${menuSettings.cardImageHeight}px` : '0px';
    
    const handleCardClick = (e) => {
      // Only respond to primary mouse button
      if (e && typeof e.button === 'number' && e.button !== 0) return;
      // If any reactstrap/Bootstrap modal is open, ignore card clicks
      if (typeof document !== 'undefined' && document.querySelector('.modal.show')) return;
      onSmartClick ? onSmartClick(item) : handleSmartCardClick(item);
    };

    return (
      <Card 
        className={`menu-item-card h-100 shadow-sm border-0`}
        style={{
          cursor: 'pointer',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        onClick={handleCardClick}
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
            <ItemCountBadge itemId={item._id} />
            
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
          <div className="text-left">
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
              <div className="d-flex justify-content-end align-items-center flex-wrap gap-1">
                {/* Inventory status badge (non-blocking) */}
                {invBadge}
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
        
        
      </Card>
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
                  innerRef={searchInputRef}
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
            {itemsGrid}
          </div>
        </Col>

        {/* Cart Sidebar - Right Side */}
        <Col lg={4} className="ps-3 pos-right-col">
          <CartSidebar />
        </Col>
      </Row>

      {/* Variant Selection Modal */}
      <Modal 
        isOpen={showItemModal} 
        toggle={() => setShowItemModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowItemModal(false)}>
          Select Options - {selectedItem?.name}
        </ModalHeader>
        <ModalBody>
          {selectedItem && (
            <div>
              {/* Size/Variant Selection */}
              {selectedItem.sizeVariants && selectedItem.sizeVariants.length > 0 && (
                <div className="mb-4">
                  <Label className="fw-bold mb-3">Size Options</Label>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedItem.sizeVariants.map((variant, index) => (
                      <Button
                        key={index}
                        color={itemCustomizations.selectedVariant === variant.size ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setItemCustomizations(prev => ({
                          ...prev,
                          selectedVariant: variant.size,
                          selectedPrice: variant.price
                        }))}
                        className="rounded-pill"
                      >
                        {variant.size} - {formatPrice(variant.price)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants Selection */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div className="mb-4">
                  <Label className="fw-bold mb-3">Variants</Label>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedItem.variants.map((variant, index) => (
                      <Button
                        key={index}
                        color={itemCustomizations.selectedVariant === variant.name ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setItemCustomizations(prev => ({
                          ...prev,
                          selectedVariant: variant.name,
                          selectedPrice: variant.price || selectedItem.price
                        }))}
                        className="rounded-pill"
                      >
                        {variant.name}
                        {variant.price && variant.price !== selectedItem.price && (
                          <span className="ms-1">+{formatPrice(variant.price - selectedItem.price)}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons Selection */}
              {selectedItem.addons && selectedItem.addons.length > 0 && (
                <div className="mb-4">
                  <Label className="fw-bold mb-3">Add-ons</Label>
                  <div className="d-flex flex-column gap-2">
                    {selectedItem.addons.map((addon, index) => (
                      <div key={index} className="d-flex justify-content-between align-items-center p-2 border rounded">
                        <div className="d-flex align-items-center">
                          <Input
                            type="checkbox"
                            id={`addon-${index}`}
                            checked={itemCustomizations.selectedAddons?.includes(addon.name) || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setItemCustomizations(prev => {
                                const currentAddons = prev.selectedAddons || [];
                                const updatedAddons = isChecked 
                                  ? [...currentAddons, addon.name]
                                  : currentAddons.filter(name => name !== addon.name);
                                return {
                                  ...prev,
                                  selectedAddons: updatedAddons
                                };
                              });
                            }}
                            className="me-2"
                          />
                          <Label for={`addon-${index}`} className="mb-0">
                            {addon.name}
                          </Label>
                        </div>
                        <span className="text-primary fw-bold">+{formatPrice(addon.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Price Display */}
              <div className="text-center mt-4 p-3 bg-light rounded">
                <h5 className="mb-0 text-primary">
                  Total: {formatPrice(calculateItemTotal())}
                </h5>
              </div>
            </div>
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
            Save & Add to Cart
          </Button>
        </ModalFooter>
      </Modal>


    </div>
  );
};

export default MenuSelection;
