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
    return cartItems.find(cartItem => cartItem.menuItemId === itemId);
  };

  const ItemCard = ({ item }) => {
    const cartItem = getItemInCart(item._id);
    const isInCart = !!cartItem;
 
    

    return (
      <Card className="menu-item-card h-100">
        <div onClick={() => handleItemClick(item)} style={{ cursor: 'pointer' }}>
          <CardImg 
            top 
            src={item.imageUrl || "https://png.pngtree.com/png-clipart/20231003/original/pngtree-tasty-burger-png-ai-generative-png-image_13245897.png"} 
            alt={item.name}
            style={{ height: '150px', objectFit: 'contain' }}
          />
          <CardBody className="p-3">
            <div className="d-flex justify-content-between align-items-start">
              <h6 className="item-name mb-0">{item.name}</h6>
              {item.isVegetarian && (
                <Badge color="success" className="ms-2">
                  <FaLeaf size={10} />
                </Badge>
              )}
              {item.isSpicy && (
                <Badge color="danger" className="ms-1">
                  <FaFire size={10} />
                </Badge>
              )}
            </div>
            
            {/* <p className="item-description text-muted small mb-2">
              {item.description?.substring(0, 80)}
              {item.description?.length > 80 && '...'}
            </p> */}
            
            {/* <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="item-price fw-bold text-primary">
                {formatPrice(item.price)}
              </span>
              {item.rating && (
                <div className="d-flex align-items-center">
                  <FaStar className="text-warning me-1" size={12} />
                  <small>{item.rating}</small>
                </div>
              )}
            </div> */}
            
            {item.preparationTime && (
              <small className="text-muted">
                <FaUtensils className="me-1" size={10} />
                {item.preparationTime} mins
              </small>
            )}
          </CardBody>
        </div>
        
        <div className="card-footer bg-transparent p-3 pt-0" onClick={(e) => e.stopPropagation()}>
          {isInCart ? (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <Button
                size="sm"
                color="outline-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Edit button clicked for:', item.name);
                  handleEditItem(item);
                }}
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              >
                <FaEdit className="me-1" />
                Edit
              </Button>
              <Badge color="primary" pill>
                In Cart: {cartItem.quantity}
              </Badge>
            </div>
          ) : (
            <Button
              size="sm"
              color="primary"
              className="mt-3"
              block
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add button clicked for:', item.name);
                handleDirectAddToCart(item);
              }}
              style={{ pointerEvents: 'auto', zIndex: 10 }}
            >
              <FaPlus className="me-2" />
              Add
            </Button>
          )}
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
    <div className="menu-selection">
      <Row className="h-100">
        {/* Menu Section - Left Side */}
        <Col lg={8} className="pe-3">
          {/* Header with Search */}
          <div className="d-flex justify-content-between align-items-center mb-4">
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
            <InputGroup style={{ width: '300px' }}>
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button color="outline-secondary">
                <FaSearch />
              </Button>
            </InputGroup>
          </div>

          {/* Categories Navigation */}
          <Nav pills className="mb-4 flex-nowrap" style={{ overflowX: 'auto' }}>
            <NavItem>
              <NavLink
                className={selectedCategory === 'all' ? 'active' : ''}
                onClick={() => setSelectedCategory('all')}
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <FaUtensils className="me-2" />
                All Items
              </NavLink>
            </NavItem>
            {categories.map(category => (
              <NavItem key={category._id}>
                <NavLink
                  className={selectedCategory === category._id ? 'active' : ''}
                  onClick={() => setSelectedCategory(category._id)}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {category.name}
                </NavLink>
              </NavItem>
            ))}
          </Nav>

          {/* Menu Items Grid */}
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
            <Row>
              {filteredItems.map(item => (
                <Col key={item._id} sm={4} md={4} lg={3} className="mb-4">
                  <ItemCard item={item} />
                </Col>
              ))}
            </Row>
          )}
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
                    src={selectedItem.image} 
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
