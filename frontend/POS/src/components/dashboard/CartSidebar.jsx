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
  FaTimes
} from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useCurrency } from '../../context/CurrencyContext';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';

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

  const CartItem = ({ item }) => (
    <ListGroupItem className="d-flex justify-content-between align-items-center p-3">
      <div className="flex-grow-1">
        <h6 className="mb-1">{item.name}</h6>
        <small className="text-muted">{formatPrice(item.price)} each</small>
        
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
        
        <div className="text-end">
          <div className="fw-bold">{formatPrice(item.price * item.quantity)}</div>
          <Button
            size="sm"
            color="outline-danger"
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
      <Card className="cart-sidebar h-100" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <CardHeader className="bg-primary text-white">
          <div className="d-flex align-items-center">
            <FaShoppingCart className="me-2" />
            <span>Cart ({getItemCount()} items)</span>
          </div>
        </CardHeader>
        <CardBody className="p-3" style={{ overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <Alert color="info" className="text-center" fade={false}>
              <FaShoppingCart size={48} className="text-muted mb-3" />
              <h5>Your cart is empty</h5>
              <p>Add some items from the menu to get started!</p>
            </Alert>
          ) : (
            <>
              {/* Customer Information */}
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
                  <FormGroup>
                    <Label size="sm">Order Type</Label>
                    <Input
                      size="sm"
                      type="select"
                      value={customerInfo.orderType}
                      onChange={(e) => updateCustomerInfo({ orderType: e.target.value })}
                    >
                      <option value="dine-in">Dine In</option>
                      <option value="takeaway">Takeaway</option>
                      <option value="delivery">Delivery</option>
                    </Input>
                  </FormGroup>
                </Form>
              </div>

              {/* Cart Items */}
              <div className="cart-items mb-4">
                <h6>Order Items</h6>
                <ListGroup flush>
                  {cartItems.map(item => (
                    <CartItem key={item.cartItemId} item={item} />
                  ))}
                </ListGroup>
              </div>

              {/* Order Summary */}
              <div className="order-summary mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax (10%):</span>
                  <span>{formatPrice(getTax())}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatPrice(getTotal())}</span>
                </div>
              </div>

              {/* Special Instructions */}
              <FormGroup className="mb-4">
                <Label size="sm">Special Instructions</Label>
                <Input
                  type="textarea"
                  rows="2"
                  placeholder="Any special requests for the kitchen..."
                  value={customerInfo.specialInstructions}
                  onChange={(e) => updateCustomerInfo({ specialInstructions: e.target.value })}
                />
              </FormGroup>

              {/* Action Buttons */}
              <div className="cart-actions">
                <div className="d-grid gap-2">
                  <Button
                    color="success"
                    size="lg"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!selectedTable}
                  >
                    <FaCreditCard className="me-2" />
                    Proceed to Payment
                  </Button>
                  
                  <div className="d-flex gap-2">
                    <Button
                      color="outline-primary"
                      onClick={() => setShowSaveModal(true)}
                      className="flex-fill"
                    >
                      <FaSave className="me-2" />
                      Save Order
                    </Button>
                    <Button
                      color="outline-info"
                      onClick={() => setShowSavedOrders(true)}
                      className="flex-fill"
                    >
                      <FaEdit className="me-2" />
                      Load Saved
                    </Button>
                  </div>
                  
                  <Button
                    color="outline-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear the cart?')) {
                        clearCart();
                      }
                    }}
                  >
                    <FaTimes className="me-2" />
                    Clear Cart
                  </Button>
                </div>
              </div>

              {!selectedTable && (
                <Alert color="warning" className="mt-3" fade={false}>
                  <small>Please select a table to proceed with payment</small>
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
