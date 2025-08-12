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
import { useOrder } from '../../context/OrderContext';
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
    deleteSavedOrder,
    replaceCart
  } = useCart();
  
  const { selectedTable, updateTableStatus } = usePOS();
  const { createOrder, updatePaymentStatus } = useOrder();
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

  // Get batches for the currently selected table from localStorage
  const getCurrentTableBatches = () => {
    const tableId = selectedTable?._id;
    if (!tableId) return null;
    try {
      const map = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
      return map[tableId] || null;
    } catch {
      return null;
    }
  };

  const tableBatches = getCurrentTableBatches();
  const batchCount = tableBatches?.batches?.length || 0;
  const batchesTotal = tableBatches?.batches?.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) || 0;

  // Settle: mark all batch orders paid, clear storage, free the table
  const handleSettleTable = async () => {
    if (!selectedTable?._id) {
      toast.error('No table selected');
      return;
    }
    if (!batchCount) {
      toast.error('No batches to settle for this table');
      return;
    }
    if (!window.confirm('Settle this table and complete all batches?')) return;

    try {
      setIsProcessing(true);
      setProcessingAction('settle');

      // Pay all batch orders (default to selected payment method or cash)
      const method = (selectedPaymentMethod || 'cash');
      const ordersToPay = tableBatches.batches.filter(b => b.orderId);
      const results = await Promise.allSettled(
        ordersToPay.map(b => updatePaymentStatus(b.orderId, 'paid', method))
      );
      const failures = results
        .map((r, idx) => ({ r, b: ordersToPay[idx] }))
        .filter(({ r }) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success));
      if (failures.length) {
        const first = failures[0];
        const msg = (first.r.status === 'fulfilled' ? first.r.value?.error : first.r.reason?.message) || 'Failed to update payment status';
        // Show compact summary
        toast.error(`Failed to settle ${failures.length}/${ordersToPay.length} batch(es). ${msg}`);
        throw new Error(msg);
      }

      // Clear this table's cart and batches from localStorage
      try {
        const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
        delete carts[selectedTable._id];
        localStorage.setItem('pos_table_carts', JSON.stringify(carts));
      } catch {}
      try {
        const batches = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
        delete batches[selectedTable._id];
        localStorage.setItem('pos_table_batches', JSON.stringify(batches));
      } catch {}

      // Reset cart UI and free the table
      replaceCart([], { orderType: 'dine-in' });
      setKotSent(false);
      await updateTableStatus(selectedTable._id, 'available');

      toast.success('Table settled and freed');
    } catch (e) {
      console.error('Settle error:', e);
      toast.error(e.message || 'Failed to settle table');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
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
  const [processingAction, setProcessingAction] = useState(''); // Track which action is processing
  const [kotSent, setKotSent] = useState(false); // Track if KOT has been sent

  // Persist current table's cart and customer info to localStorage whenever they change
  React.useEffect(() => {
    try {
      if (!selectedTable?._id) return;
      const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
      carts[selectedTable._id] = {
        items: cartItems,
        customerInfo
      };
      localStorage.setItem('pos_table_carts', JSON.stringify(carts));
    } catch (e) {
      console.error('Failed to persist table cart:', e);
    }
  }, [cartItems, customerInfo, selectedTable && selectedTable._id]);

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

  // Update batch item quantity
  const updateBatchItemQuantity = (orderId, itemIndex, newQuantity) => {
    try {
      const tableId = selectedTable?._id || 'no-table';
      const batchesKey = 'pos_table_batches';
      const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
      const entry = batchesAll[tableId];
      
      if (!entry || !entry.batches) return;
      
      // Find the batch by orderId
      const batchIndex = entry.batches.findIndex(b => b.orderId === orderId);
      if (batchIndex === -1) return;
      
      // Update the item quantity
      if (entry.batches[batchIndex].items && entry.batches[batchIndex].items[itemIndex]) {
        entry.batches[batchIndex].items[itemIndex].quantity = newQuantity;
        
        // Recalculate batch total
        const batchTotal = entry.batches[batchIndex].items.reduce((sum, item) => {
          return sum + ((item.price || 0) * (item.quantity || 1));
        }, 0);
        entry.batches[batchIndex].totalAmount = batchTotal;
        
        // Save back to localStorage
        batchesAll[tableId] = entry;
        localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
        
        toast.success('Item quantity updated');
        
        // Force re-render by updating a state
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error updating batch item quantity:', error);
      toast.error('Failed to update item quantity');
    }
  };

  // Delete batch item
  const deleteBatchItem = (orderId, itemIndex) => {
    try {
      const tableId = selectedTable?._id || 'no-table';
      const batchesKey = 'pos_table_batches';
      const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
      const entry = batchesAll[tableId];
      
      if (!entry || !entry.batches) return;
      
      // Find the batch by orderId
      const batchIndex = entry.batches.findIndex(b => b.orderId === orderId);
      if (batchIndex === -1) return;
      
      // Remove the item
      if (entry.batches[batchIndex].items && entry.batches[batchIndex].items[itemIndex]) {
        entry.batches[batchIndex].items.splice(itemIndex, 1);
        
        // If no items left in batch, remove the entire batch
        if (entry.batches[batchIndex].items.length === 0) {
          entry.batches.splice(batchIndex, 1);
        } else {
          // Recalculate batch total
          const batchTotal = entry.batches[batchIndex].items.reduce((sum, item) => {
            return sum + ((item.price || 0) * (item.quantity || 1));
          }, 0);
          entry.batches[batchIndex].totalAmount = batchTotal;
        }
        
        // Save back to localStorage
        batchesAll[tableId] = entry;
        localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
        
        toast.success('Item removed from batch');
        
        // Force re-render by updating a state
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error deleting batch item:', error);
      toast.error('Failed to remove item');
    }
  };

  const handleSaveOrder = async () => {
    if (!saveOrderName.trim()) {
      toast.error('Please enter a name for the saved order');
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error('Cannot save empty cart');
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction('saving');
    
    try {
      await saveOrder(saveOrderName);
      setSaveOrderName('');
      setShowSaveModal(false);
      toast.success(`Order "${saveOrderName}" saved successfully`);
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleLoadSavedOrder = async (orderId) => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction('loading');
    
    try {
      await loadSavedOrder(orderId);
      setShowSavedOrders(false);
      toast.success('Order loaded successfully');
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  // Validation function for order completion
  const validateOrderForPayment = () => {
    const errors = [];
    
    if (cartItems.length === 0) {
      errors.push('Cart is empty. Add items before proceeding.');
    }
    
    // For dine-in, customer name/phone are NOT mandatory
    if (customerInfo.orderType !== 'dine-in') {
      if (!customerInfo.name.trim()) {
        errors.push('Customer name is required');
      }
      if (!customerInfo.phone.trim()) {
        errors.push('Phone number is required');
      }
    }
    
    if (customerInfo.orderType === 'dine-in' && !selectedTable) {
      errors.push('Table selection is required for dine-in orders');
    }
    
    if (customerInfo.orderType === 'delivery' && !customerInfo.deliveryAddress?.trim()) {
      errors.push('Delivery address is required for delivery orders');
    }
    
    return errors;
  };
  
  // Validation function for POS actions
  const validatePOSAction = (actionType) => {
    const errors = [];
    
    if (cartItems.length === 0) {
      errors.push('Cart is empty. Add items before proceeding.');
    }
    
    if (actionType === 'kot' && kotSent) {
      errors.push('KOT has already been sent for this order.');
    }
    
    // For dine-in, customer name is NOT mandatory
    if (customerInfo.orderType !== 'dine-in' && !customerInfo.name.trim()) {
      errors.push('Customer name is required');
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
    toast.info('Opening payment modal...');
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
    if (cartItems.length === 0) {
      toast.error('Cannot mark empty cart as complimentary');
      return;
    }
    
    const newComplimentaryStatus = !orderStatus.isComplimentary;
    
    setOrderStatus(prev => ({
      ...prev,
      isComplimentary: newComplimentaryStatus
    }));
    
    const message = newComplimentaryStatus 
      ? 'Order marked as complimentary' 
      : 'Complimentary status removed';
    toast.success(message);
    
    if (newComplimentaryStatus) {
      toast.info('This order will be processed as complimentary');
    }
  };

  const handleKOT = async (withPrint = false) => {
    // Validate before processing
    const validationErrors = validatePOSAction('kot');
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction(withPrint ? 'kot-print' : 'kot');
    
    try {
      // Build order data for this batch (send only current cart items)
      const orderItems = cartItems.map(item => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        const subtotal = price * quantity;
        return {
          menuItemId: item.menuItemId,
          name: item.name,
          price,
          quantity,
          subtotal,
          customizations: item.customizations || {}
        };
      });

      const orderData = {
        tableId: selectedTable?._id || null,
        tableName: selectedTable?.TableName || selectedTable?.name || null,
        orderType: customerInfo.orderType || 'dine-in',
        customer: {
          name: customerInfo.name || '',
          phone: customerInfo.phone || ''
        },
        specialInstructions: customerInfo.specialInstructions || '',
        items: orderItems,
        totalAmount: getTotal()
      };

      const result = await createOrder(orderData);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create order');
      }

      const createdOrder = result.order;

      // Update table status to occupied for dine-in tables and link current order
      if (selectedTable?._id && (customerInfo.orderType || 'dine-in') === 'dine-in') {
        try {
          await updateTableStatus(selectedTable._id, 'occupied', createdOrder);
        } catch (e) {
          console.warn('Failed to set table occupied:', e);
        }
      }

      // Record batch for this table with incremental order number
      const tableId = selectedTable?._id || 'no-table';
      const batchesKey = 'pos_table_batches';
      const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
      const entry = batchesAll[tableId] || { nextOrderNumber: 1, batches: [] };
      const orderNumber = entry.nextOrderNumber;
      entry.batches = [
        {
          orderId: createdOrder._id,
          orderNumber,
          items: orderItems,
          totalAmount: orderData.totalAmount,
          createdAt: new Date().toISOString()
        },
        ...entry.batches
      ];
      entry.nextOrderNumber = orderNumber + 1;
      batchesAll[tableId] = entry;
      localStorage.setItem(batchesKey, JSON.stringify(batchesAll));

      // Clear only current table's cart items but keep customer info
      replaceCart([], { ...customerInfo });

      setKotSent(true);
      const message = withPrint
        ? `KOT sent and printed (Order #${createdOrder.orderNumber || orderNumber})`
        : `KOT sent (Order #${createdOrder.orderNumber || orderNumber})`;
      toast.success(message);
      
    } catch (error) {
      console.error('KOT Error:', error);
      toast.error('Failed to send KOT. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handlePOSSaveOrder = async (withPrint = false, withEBill = false) => {
    // Validate before processing
    const validationErrors = validatePOSAction('save');
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    setIsProcessing(true);
    const actionType = withEBill ? 'save-ebill' : withPrint ? 'save-print' : 'save';
    setProcessingAction(actionType);
    
    try {
      // Prepare order data
      const orderData = {
        items: cartItems,
        customerInfo,
        tableInfo: selectedTable,
        orderType: customerInfo.orderType || 'dine-in',
        paymentMethod: selectedPaymentMethod,
        orderStatus,
        activeOffer,
        subtotal: getSubtotal(),
        tax: getTax(),
        total: getTotal(),
        timestamp: new Date().toISOString(),
        kotSent,
        specialInstructions: customerInfo.specialInstructions || ''
      };
      
      // TODO: Replace with actual API call
      // const response = await saveOrderToPOS(orderData, { withPrint, withEBill });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const action = withEBill ? 'saved with e-bill' : withPrint ? 'saved and printed' : 'saved';
      toast.success(`Order ${action} successfully`);
      
      // Log for debugging
      console.log('Order Data:', orderData);
      
      // Clear cart after successful save
      if (window.confirm('Order saved successfully. Clear cart?')) {
        clearCart();
        setKotSent(false);
        setActiveOffer(null);
        setOrderStatus({
          isPaid: false,
          isLoyalty: false,
          sendFeedbackSMS: false,
          isComplimentary: false
        });
      }
      
    } catch (error) {
      console.error('Save Order Error:', error);
      toast.error('Failed to save order. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleHoldOrder = () => {
    // Validate before processing
    const validationErrors = validatePOSAction('hold');
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    // Show confirmation dialog
    if (window.confirm('Hold this order? You can resume it later from saved orders.')) {
      setShowSaveModal(true);
      toast.info('Enter a name to hold this order');
    }
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
            (() => {
              const tableId = selectedTable?._id;
              const batchesMap = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
              const tableBatches = tableId ? batchesMap[tableId] : null;
              const hasBatches = !!(tableBatches && Array.isArray(tableBatches.batches) && tableBatches.batches.length);
              const nextOrderNumber = tableBatches?.nextOrderNumber || 1;
              const isOccupied = selectedTable?.status === 'occupied';
              const title = isOccupied || hasBatches ? 'No new items in cart' : 'No items added to cart';
              const subtitle = isOccupied || hasBatches
                ? `Table is occupied${hasBatches ? ` • ${tableBatches.batches.length} batch${tableBatches.batches.length>1?'es':''} sent` : ''}. Add items to create KOT #${nextOrderNumber}.`
                : 'Add some items from the menu to get started!';
              return (
                <Alert color="info" className="text-center shadow-none bg-white" fade={false}>
                  <FaShoppingCart size={48} className="text-muted mb-3" />
                  <h5>{title}</h5>
                  <p>{subtitle}</p>
                </Alert>
              );
            })()
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
              <div className="cart-items mb-1">
                {/* <h6>Order Items</h6> */}
                {cartItems.length === 0 ? (
                  <div className="text-center text-muted py-3">
                    <small>No items in cart</small>
                  </div>
                ) : (
                  <>
                    {/* Batch Header */}
                    <div className="batch-headers">
                      <small className="text-decoration-underline fst-italic">Batch #{batchCount + 1}</small>
                    </div>
                    
                    {/* Cart Items List */}
                    {cartItems.map((item) => (
                      <div key={item.cartItemId} className="cart-item-row d-flex justify-content-between align-items-center">
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                        </div>
                        <div className="item-controls d-flex align-items-center">
                          <button 
                            className="qty-btn"
                            onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="qty-display">{item.quantity}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          >
                            +
                          </button>
                          <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                          <button 
                            className="delete-btn"
                            onClick={() => removeFromCart(item.cartItemId)}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Batch Summary for this table */}
              {batchCount > 0 && (
                <div className="batch-summary mb-2">
                  {/* <h6>Batches for this Table</h6> */}
                  {tableBatches.batches.map((batch, batchIdx) => (
                    <div key={`${batch.orderId || batchIdx}`} className="batch-section">
                      {/* Batch Header */}
                      <div className="batch-headers">
                        <small className="text-decoration-underline fst-italic">Batch #{batch.orderNumber || (batchCount - batchIdx)}</small>
                      </div>
                      
                      {/* Batch Items */}
                      {batch.items?.map((item, itemIdx) => (
                        <div key={`${batch.orderId}-${itemIdx}`} className="cart-item-row d-flex justify-content-between align-items-center">
                          <div className="item-info">
                            <div className="item-name">{item.name}</div>
                          </div>
                          <div className="item-controls d-flex align-items-center">
                            <button 
                              className="qty-btn"
                              onClick={() => updateBatchItemQuantity(batch.orderId, itemIdx, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                            >
                              −
                            </button>
                            <span className="qty-display">{item.quantity}</span>
                            <button 
                              className="qty-btn"
                              onClick={() => updateBatchItemQuantity(batch.orderId, itemIdx, item.quantity + 1)}
                            >
                              +
                            </button>
                            <span className="item-price">{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                            <button 
                              className="delete-btn"
                              onClick={() => deleteBatchItem(batch.orderId, itemIdx)}
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  
                </div>
              )}

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
                    <span className="text-primary">{formatPrice(getTotal() + batchesTotal)}</span>
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
                    className="w-100 pos-action-btn"
                    title={cartItems.length === 0 ? 'Add items to cart first' : 'Save order'}
                  >
                    {isProcessing && processingAction === 'save' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-1" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handlePOSSaveOrder(true, false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100 pos-action-btn"
                    title={cartItems.length === 0 ? 'Add items to cart first' : 'Save and print order'}
                  >
                    {isProcessing && processingAction === 'save-print' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Printing...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-1" />
                        Save & Print
                      </>
                    )}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="success"
                    size="sm"
                    onClick={handleSettleTable}
                    disabled={isProcessing || batchCount === 0}
                    className="w-100 pos-action-btn"
                    title={batchCount === 0 ? 'No batches to settle' : 'Settle all table batches and free table'}
                  >
                    {isProcessing && processingAction === 'settle' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Settling...
                      </>
                    ) : (
                      <>
                        <FaCreditCard className="me-1" />
                        Settle Table
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="row g-2">
                <div className="col-4">
                  <Button
                    color={kotSent ? "success" : "secondary"}
                    size="sm"
                    onClick={() => handleKOT(false)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100 pos-action-btn"
                    title={cartItems.length === 0 ? 'Add items to cart first' : kotSent ? 'KOT already sent' : 'Send Kitchen Order Ticket'}
                  >
                    {isProcessing && processingAction === 'kot' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaClipboardList className="me-1" />
                        {kotSent ? 'KOT Sent' : 'KOT'}
                      </>
                    )}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color={kotSent ? "success" : "secondary"}
                    size="sm"
                    onClick={() => handleKOT(true)}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100 pos-action-btn"
                    title={cartItems.length === 0 ? 'Add items to cart first' : kotSent ? 'KOT already sent and printed' : 'Send KOT and print'}
                  >
                    {isProcessing && processingAction === 'kot-print' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Printing...
                      </>
                    ) : (
                      <>
                        <FaClipboardList className="me-1" />
                        {kotSent ? 'KOT Printed' : 'KOT & Print'}
                      </>
                    )}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="outline-secondary"
                    size="sm"
                    onClick={handleHoldOrder}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-100 pos-action-btn"
                    title={cartItems.length === 0 ? 'Add items to cart first' : 'Hold order for later'}
                  >
                    {isProcessing && processingAction === 'hold' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Holding...
                      </>
                    ) : (
                      <>
                        <FaEdit className="me-1" />
                        Hold
                      </>
                    )}
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
                  <Button 
                    color="secondary" 
                    onClick={() => setShowSaveModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    color="primary" 
                    onClick={handleSaveOrder}
                    disabled={isProcessing || !saveOrderName.trim()}
                  >
                    {isProcessing && processingAction === 'saving' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="me-1" />
                        Save Order
                      </>
                    )}
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
