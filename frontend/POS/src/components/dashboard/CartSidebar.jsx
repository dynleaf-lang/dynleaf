import React, { useState } from 'react';
import { 
  Card,
  CardHeader,
  CardBody,
  Button,
  ListGroup,
  ListGroupItem,
  Badge,
  Input,
  Form,
  FormGroup,
  Label,
  Alert,
  Spinner
} from 'reactstrap';
import { 
  FaShoppingCart, 
  FaPlus, 
  FaMinus, 
  FaTrash, 
  FaCreditCard,
  FaSave,
  FaEdit,
  FaTimes,
  FaUtensils,
  FaShoppingBag,
  FaTruck,
  FaUser,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList
} from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useCurrency } from '../../context/CurrencyContext';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';
import './CartSidebar.css';

const CartSidebar = () => {
  const { 
    cartItems, 
    customerInfo,
    updateCustomerInfo,
    updateQuantity, 
    removeFromCart, 
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
    getItemCount,
    saveOrder,
    savedOrders,
    loadSavedOrder,
    deleteSavedOrder
  } = useCart();
  
  const { selectedTable } = usePOS();
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
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveOrderName, setSaveOrderName] = useState('');
  const [showSavedOrders, setShowSavedOrders] = useState(false);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showSpecialInstructions, setShowSpecialInstructions] = useState(false);
  
  // POS functionality state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [orderStatus, setOrderStatus] = useState({
    isPaid: false,
    isLoyalty: false,
    sendFeedbackSMS: false,
    isComplimentary: false
  });
  const [activeOffer, setActiveOffer] = useState(null); // 'bogo', 'split', etc.
  const [isProcessing, setIsProcessing] = useState(false);

  // Order type options
  const orderTypes = [
    { 
      value: 'dine-in', 
      label: 'Dine In', 
      icon: FaUtensils, 
      color: 'primary',
      description: 'Table service'
    },
    { 
      value: 'takeaway', 
      label: 'Takeaway', 
      icon: FaShoppingBag, 
      color: 'warning',
      description: 'Pick up order'
    },
    { 
      value: 'delivery', 
      label: 'Delivery', 
      icon: FaTruck, 
      color: 'info',
      description: 'Home delivery'
    }
  ];

  // Handle order type change
  const handleOrderTypeChange = (orderType) => {
    updateCustomerInfo({ orderType });
    
    // Clear table selection for non-dine-in orders
    if (orderType !== 'dine-in' && selectedTable) {
      // Note: We would need to clear table selection here if we had access to the function
      console.log('Table selection should be cleared for non-dine-in orders');
    }
    
    const selectedType = orderTypes.find(type => type.value === orderType);
    toast.success(`Order type changed to ${selectedType?.label}`);
    
    // Show relevant information based on order type
    if (orderType === 'delivery') {
      toast.info('Delivery address will be required for this order');
    } else if (orderType === 'takeaway') {
      toast.info('Customer will pick up this order');
    } else if (orderType === 'dine-in') {
      toast.info('Please ensure a table is selected');
    }
  };

  const handleQuantityChange = (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartItemId);
    } else {
      updateQuantity(cartItemId, newQuantity);
    }
  };

  const handleSaveOrder = () => {
    if (!saveOrderName.trim()) {
      toast.error('Please enter a name for the saved order');
      return;
    }
    saveOrder(saveOrderName);
    setSaveOrderName('');
    setShowSaveModal(false);
  };

  const handleLoadSavedOrder = (orderId) => {
    loadSavedOrder(orderId);
    setShowSavedOrders(false);
    toast.success('Order loaded successfully');
  };

  // Validation function for order completion
  const validateOrderForPayment = () => {
    const errors = [];
    
    if (!customerInfo.name.trim()) {
      errors.push('Customer name is required');
    }
    
    if (!customerInfo.phone.trim()) {
      errors.push('Phone number is required');
    }
    
    if (customerInfo.orderType === 'dine-in' && !selectedTable) {
      errors.push('Table selection is required for dine-in orders');
    }
    
    if (customerInfo.orderType === 'delivery' && !customerInfo.deliveryAddress?.trim()) {
      errors.push('Delivery address is required for delivery orders');
    }
    
    return errors;
  };

  // Handle proceed to payment with validation
  const handleProceedToPayment = () => {
    const validationErrors = validateOrderForPayment();
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    setShowPaymentModal(true);
  };

  // Get payment button text based on order type
  const getPaymentButtonText = () => {
    switch (customerInfo.orderType) {
      case 'dine-in':
        return 'Proceed to Payment';
      case 'takeaway':
        return 'Process Takeaway Order';
      case 'delivery':
        return 'Process Delivery Order';
      default:
        return 'Proceed to Payment';
    }
  };

  // Check if payment button should be disabled
  const isPaymentDisabled = () => {
    const errors = validateOrderForPayment();
    return errors.length > 0;
  };

  // POS functionality handlers
  const handleOfferToggle = (offerType) => {
    setActiveOffer(activeOffer === offerType ? null : offerType);
    if (offerType === 'bogo') {
      toast.success('BOGO offer applied to cart');
    } else if (offerType === 'split') {
      toast.info('Split bill mode activated');
    }
  };

  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
    toast.success(`Payment method changed to ${method.toUpperCase()}`);
  };

  const handleStatusToggle = (statusKey) => {
    setOrderStatus(prev => ({
      ...prev,
      [statusKey]: !prev[statusKey]
    }));
  };

  const handleComplimentaryToggle = () => {
    setOrderStatus(prev => ({
      ...prev,
      isComplimentary: !prev.isComplimentary
    }));
    toast.success(orderStatus.isComplimentary ? 'Complimentary removed' : 'Order marked as complimentary');
  };

  const handleKOT = async (withPrint = false) => {
    setIsProcessing(true);
    try {
      // KOT (Kitchen Order Ticket) functionality
      toast.success(withPrint ? 'KOT sent to kitchen and printed' : 'KOT sent to kitchen');
      // Add actual KOT API call here
    } catch (error) {
      toast.error('Failed to send KOT');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePOSSaveOrder = async (withPrint = false, withEBill = false) => {
    setIsProcessing(true);
    try {
      // Save order functionality
      const action = withEBill ? 'saved with e-bill' : withPrint ? 'saved and printed' : 'saved';
      toast.success(`Order ${action} successfully`);
      // Add actual save API call here
    } catch (error) {
      toast.error('Failed to save order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldOrder = () => {
    // Hold order functionality (similar to existing save functionality)
    if (cartItems.length === 0) {
      toast.error('Cannot hold empty cart');
      return;
    }
    setShowSaveModal(true);
  };

  const CartItem = ({ item }) => (
    <ListGroupItem className="d-flex justify-content-between align-items-center px-0">
      <div className="flex-grow-1">
        <h6 className="mb-1">{item.name}</h6>
        {/* <small className="text-muted">{formatPrice(item.price)} each</small> */}
        
        {/* Customizations */}
        {item.customizations && (
          <div className="mt-1">
            {item.customizations.spiceLevel && item.customizations.spiceLevel !== 'medium' && (
              <Badge color="warning" className="me-1" size="sm">
                {item.customizations.spiceLevel} spice
              </Badge>
            )}
            {item.customizations.specialInstructions && (
              <small className="d-block text-info">
                Note: {item.customizations.specialInstructions}
              </small>
            )}
          </div>
        )}
      </div>
      
      <div className="d-flex align-items-center">
        <div className="quantity-controls me-3">
          <Button
            size="sm"
            color="outline-secondary"
            onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
          >
            <FaMinus size={10} />
          </Button>
          <span className="mx-2 fw-bold">{item.quantity}</span>
          <Button
            size="sm"
            color="outline-secondary"
            onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
          >
            <FaPlus size={10} />
          </Button>
        </div>
        
        <div className="text-end d-flex">
          <div className="fw-bold">{formatPrice(item.price * item.quantity)}</div>
          <Button
            size="sm"
            color="outline-danger"
            className="px-2 ms-3"
            onClick={() => removeFromCart(item.cartItemId)}
          >
            <FaTrash size={10} />
          </Button>
        </div>
      </div>
    </ListGroupItem>
  );

  return (
    <>
      <Card className="cart-sidebar" style={{ height: 'calc(100vh - 100px)', maxHeight: 'calc(100vh - 100px)' }}>
        {/* <CardHeader className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaShoppingCart className="me-2" />
            <span className="fw-bold">Cart</span>
            {getItemCount() > 0 && (
              <Badge color="primary" className="ms-2">
                {getItemCount()}
              </Badge>
            )}
          </div>
          {cartItems.length > 0 && (
            <Button
              size="sm"
              color="outline-danger"
              onClick={clearCart}
              title="Clear Cart"
            >
              <FaTrash size={12} />
            </Button>
          )}
        </CardHeader> */}

        {/* Order Type Selection */}
        <div className="order-type-selection p-3 border-bottom">
          
          <div className="d-flex gap-2">
            {orderTypes.map((type) => {
              const IconComponent = type.icon;
              const isSelected = customerInfo.orderType === type.value;
              
              return (
                <Button
                  key={type.value}
                  size="sm"
                  color={isSelected ? type.color : 'outline-secondary'}
                  className={`flex-fill d-flex flex-column align-items-center py-2 order-type-btn ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => handleOrderTypeChange(type.value)}
                  title={type.description}
                >
                  <IconComponent size={16} className="mb-1" />
                  <small className="fw-bold">{type.label}</small>
                </Button>
              );
            })}
          </div>
          {/* {customerInfo.orderType && (
            <div className="mt-2">
              <small className="text-muted">
                {orderTypes.find(type => type.value === customerInfo.orderType)?.description}
              </small>
            </div>
          )} */}
        </div>

        {/* Customer Info & Special Instructions Icons Row */}
        <div className="info-icons-row d-flex border-bottom">
          {/* Customer Information Icon */}
          <Button
            color="link"
            className="flex-fill d-flex justify-content-center align-items-center p-3 text-decoration-none border-end"
            onClick={() => setShowCustomerInfo(!showCustomerInfo)}
            title="Customer Information"
          >
            <div className="position-relative">
              <FaUser size={20} className={showCustomerInfo ? 'text-primary' : 'text-muted'} />
              {(customerInfo.name || customerInfo.phone) && (
                <Badge 
                  color="success" 
                  className="position-absolute top-0 start-100 translate-middle badge-sm"
                  style={{ fontSize: '0.6rem', padding: '0.2em 0.4em' }}
                >
                  ✓
                </Badge>
              )}
            </div>
          </Button>
          
          {/* Special Instructions Icon */}
          <Button
            color="link"
            className="flex-fill d-flex justify-content-center align-items-center p-3 text-decoration-none"
            onClick={() => setShowSpecialInstructions(!showSpecialInstructions)}
            title="Special Instructions"
          >
            <div className="position-relative">
              <FaClipboardList size={20} className={showSpecialInstructions ? 'text-primary' : 'text-muted'} />
              {customerInfo.specialInstructions && (
                <Badge 
                  color="success" 
                  className="position-absolute top-0 start-100 translate-middle badge-sm"
                  style={{ fontSize: '0.6rem', padding: '0.2em 0.4em' }}
                >
                  ✓
                </Badge>
              )}
            </div>
          </Button>
        </div>
        <CardBody className="p-3" style={{ overflowY: 'auto', height: 'calc(100% - 280px)' }}>
          {cartItems.length === 0 ? (
            <Alert color="info" className="text-center" fade={false}>
              <FaShoppingCart size={48} className="text-muted mb-3" />
              <h5>Your cart is empty</h5>
              <p>Add some items from the menu to get started!</p>
            </Alert>
          ) : (
            <>
              {/* Customer Information - Collapsible */}
              {showCustomerInfo && (
                <div className="customer-info mb-4">
                  <h6>Customer Information</h6>
                <Form>
                  <FormGroup>
                    <Label size="sm">Customer Name</Label>
                    <Input
                      size="sm"
                      type="text"
                      placeholder="Enter customer name"
                      value={customerInfo.name}
                      onChange={(e) => updateCustomerInfo({ name: e.target.value })}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label size="sm">Phone Number</Label>
                    <Input
                      size="sm"
                      type="tel"
                      placeholder="Enter phone number"
                      value={customerInfo.phone}
                      onChange={(e) => updateCustomerInfo({ phone: e.target.value })}
                    />
                  </FormGroup>
                  {/* Conditional fields based on order type */}
                  {customerInfo.orderType === 'delivery' && (
                    <FormGroup>
                      <Label size="sm">Delivery Address</Label>
                      <Input
                        size="sm"
                        type="textarea"
                        rows="2"
                        placeholder="Enter delivery address"
                        value={customerInfo.deliveryAddress || ''}
                        onChange={(e) => updateCustomerInfo({ deliveryAddress: e.target.value })}
                      />
                    </FormGroup>
                  )}
                </Form>
                </div>
              )}

              {/* Special Instructions - Collapsible */}
              {showSpecialInstructions && (
                <div className="special-instructions mb-4">
                  <h6>Special Instructions</h6>
                  <Form>
                    <FormGroup>
                      <Label size="sm">Order Notes</Label>
                      <Input
                        size="sm"
                        type="textarea"
                        rows="3"
                        placeholder="Enter any special instructions for this order..."
                        value={customerInfo.specialInstructions || ''}
                        onChange={(e) => updateCustomerInfo({ specialInstructions: e.target.value })}
                      />
                    </FormGroup>
                  </Form>
                </div>
              )}

              {/* Cart Items */}
              <div className="cart-items mb-4">
                <h6>Order Items</h6>
                <ListGroup flush>
                  {cartItems.map(item => (
                    <CartItem key={item.cartItemId} item={item} />
                  ))}
                </ListGroup>
              </div>

             

             



              {/* Conditional alerts based on order type and validation */}
              {customerInfo.orderType === 'dine-in' && !selectedTable && (
                <Alert color="warning" className="mt-3" fade={false}>
                  <small>Please select a table for dine-in orders</small>
                </Alert>
              )}
              
              {customerInfo.orderType === 'delivery' && !customerInfo.deliveryAddress?.trim() && (
                <Alert color="info" className="mt-3" fade={false}>
                  <small>Delivery address is required for delivery orders</small>
                </Alert>
              )}
              
              {customerInfo.orderType === 'takeaway' && (
                <Alert color="success" className="mt-3" fade={false}>
                  <small>Customer will pick up this order at the restaurant</small>
                </Alert>
              )}
            </>
          )}

          {/* Saved Orders Section */}
          {showSavedOrders && savedOrders.length > 0 && (
            <div className="saved-orders mt-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6>Saved Orders</h6>
                <Button
                  size="sm"
                  color="outline-secondary"
                  onClick={() => setShowSavedOrders(false)}
                >
                  Hide
                </Button>
              </div>
              <ListGroup>
                {savedOrders.map(order => (
                  <ListGroupItem 
                    key={order.id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="fw-bold">{order.name}</div>
                      <small className="text-muted">
                        {order.items.length} items • {formatPrice(order.total)}
                      </small>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        color="outline-primary"
                        className="me-2"
                        onClick={() => handleLoadSavedOrder(order.id)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        color="outline-danger"
                        onClick={() => {
                          if (window.confirm('Delete this saved order?')) {
                            deleteSavedOrder(order.id);
                          }
                        }}
                      >
                        <FaTrash size={10} />
                      </Button>
                    </div>
                  </ListGroupItem>
                ))}
              </ListGroup>
            </div>
          )}
        </CardBody>
        
        {/* Fixed POS Action Buttons Footer */}
        <div className="pos-actions-footer">
          <div className="pos-actions">
            {/* Offer Buttons Row */}
            <div className="offer-buttons mb-2">
              <div className="d-flex gap-2 align-items-center justify-content-between">
                <Button
                  color={activeOffer === 'split' ? 'danger' : 'outline-danger'}
                  size="sm"
                  onClick={() => handleOfferToggle('split')} 
                >
                  Split
                </Button>
                <div className="d-flex align-items-center">
                  <Input
                    type="checkbox"
                    id="complimentary"
                    checked={orderStatus.isComplimentary}
                    onChange={handleComplimentaryToggle}
                    className="me-2"
                  />
                  <Label for="complimentary" className="mb-0 small">
                    Complimentary
                  </Label>
                </div>
                <div className="total-display">
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatPrice(getTotal())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="payment-methods mb-2">
              <div className="d-flex gap-1">
                {['cash', 'card', 'due', 'other', 'part'].map(method => (
                  <Button
                    key={method}
                    color={selectedPaymentMethod === method ? 'dark' : 'outline-secondary'}
                    size="sm"
                    onClick={() => handlePaymentMethodChange(method)}
                    className="flex-fill text-capitalize"
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status Checkboxes */}
            <div className="status-checkboxes mb-2">
              <div className="d-flex gap-3 justify-content-center">
                <div className="d-flex align-items-center">
                  <Input
                    type="checkbox"
                    id="isPaid"
                    checked={orderStatus.isPaid}
                    onChange={() => handleStatusToggle('isPaid')}
                    className="me-1"
                  />
                  <Label for="isPaid" className="mb-0 small">
                    It's Paid
                  </Label>
                </div>
                <div className="d-flex align-items-center">
                  <Input
                    type="checkbox"
                    id="isLoyalty"
                    checked={orderStatus.isLoyalty}
                    onChange={() => handleStatusToggle('isLoyalty')}
                    className="me-1"
                  />
                  <Label for="isLoyalty" className="mb-0 small">
                    Loyalty
                  </Label>
                </div>
                <div className="d-flex align-items-center">
                  <Input
                    type="checkbox"
                    id="sendFeedbackSMS"
                    checked={orderStatus.sendFeedbackSMS}
                    onChange={() => handleStatusToggle('sendFeedbackSMS')}
                    className="me-1"
                  />
                  <Label for="sendFeedbackSMS" className="mb-0 small">
                    Send Feedback SMS
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="action-buttons-grid">
              <div className="row g-2 mb-2">
                <div className="col-4">
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handlePOSSaveOrder(false, false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    {isProcessing ? <Spinner size="sm" /> : 'Save'}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handlePOSSaveOrder(true, false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    Save & Print
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handlePOSSaveOrder(false, true)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    Save & eBill
                  </Button>
                </div>
              </div>
              <div className="row g-2">
                <div className="col-4">
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={() => handleKOT(false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    KOT
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="secondary"
                    size="sm"
                    onClick={() => handleKOT(true)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    KOT & Print
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="outline-secondary"
                    size="sm"
                    onClick={handleHoldOrder}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100"
                  >
                    Hold
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Order Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" style={{ zIndex: 1060 }}>
          <div className="modal d-block" style={{ zIndex: 1061 }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5>Save Order</h5>
                  <button 
                    className="btn-close"
                    onClick={() => setShowSaveModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <FormGroup>
                    <Label>Order Name</Label>
                    <Input
                      type="text"
                      placeholder="Enter a name for this order"
                      value={saveOrderName}
                      onChange={(e) => setSaveOrderName(e.target.value)}
                      autoFocus
                    />
                  </FormGroup>
                </div>
                <div className="modal-footer">
                  <Button color="secondary" onClick={() => setShowSaveModal(false)}>
                    Cancel
                  </Button>
                  <Button color="primary" onClick={handleSaveOrder}>
                    Save Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        toggle={() => setShowPaymentModal(false)}
        cartItems={cartItems}
        customerInfo={customerInfo}
        selectedTable={selectedTable}
        orderTotal={getTotal()}
      />
    </>
  );
};

export default CartSidebar;
