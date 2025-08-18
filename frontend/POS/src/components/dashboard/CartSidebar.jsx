import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
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
  Spinner,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
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
  FaClipboardList,
  FaPhone,
  FaMapMarkerAlt,
  FaStickyNote
} from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useOrder } from '../../context/OrderContext';
import { useCurrency } from '../../context/CurrencyContext';
import PaymentModal from './PaymentModal';
import toast from 'react-hot-toast';
import './CartSidebar.css';
import axios from 'axios';
import { generateHTMLReceipt, printHTMLReceipt, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

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

  // Autocomplete state for customers
  const [custQueryName, setCustQueryName] = useState('');
  const [custQueryPhone, setCustQueryPhone] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);
  
  // Local draft state for order notes (special instructions)
  const [notesDraft, setNotesDraft] = useState('');
  const notesInputRef = useRef(null);
  
  // Modal visibility states
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastSavedOrder, setLastSavedOrder] = useState(null);
  const [printerConfig, setPrinterConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_printer_config');
      return saved ? JSON.parse(saved) : { printerType: 'browser' };
    } catch {
      return { printerType: 'browser' };
    }
  });

  const normalizePhone = (phone) => (phone || '').replace(/\D/g, '');

  const triggerCustomerSearch = (query) => {
    if (!query || query.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    setIsSearchingCustomers(true);
    axios
      .get(`${API_BASE_URL}/customers`, { params: { search: query.trim() } })
      .then((resp) => {
        const list = Array.isArray(resp.data) ? resp.data : [];
        setCustomerSuggestions(list.slice(0, 8));
      })
      .catch(() => setCustomerSuggestions([]))
      .finally(() => setIsSearchingCustomers(false));
  };

  // Resolve or create customer prior to save actions (for held orders)
  const findOrCreateCustomerLocal = async () => {
    try {
      const name = (customerInfo?.name || '').trim();
      const phoneRaw = customerInfo?.phone || '';
      const phone = normalizePhone(phoneRaw);
      if (customerInfo?.customerId) return customerInfo.customerId;
      if (!phone && !name) return null;

      if (phone) {
        const resp = await axios.get(`${API_BASE_URL}/customers`, { params: { search: phone } });
        const list = Array.isArray(resp.data) ? resp.data : [];
        const exact = list.find(c => normalizePhone(c.phone) === phone);
        if (exact && exact._id) {
          updateCustomerInfo({ customerId: exact._id, name: exact.name || name, phone: exact.phone || phone });
          return exact._id;
        }
      }

      if (!phone && name) {
        const resp = await axios.get(`${API_BASE_URL}/customers`, { params: { search: name } });
        const list = Array.isArray(resp.data) ? resp.data : [];
        const byName = list.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
        if (byName && byName._id) {
          updateCustomerInfo({ customerId: byName._id, name: byName.name, phone: byName.phone || '' });
          return byName._id;
        }
      }

      const payload = { name: name || 'Walk-in', phone };
      const createResp = await axios.post(`${API_BASE_URL}/customers`, payload);
      const created = createResp.data || {};
      if (created && created._id) {
        updateCustomerInfo({ customerId: created._id, name: created.name || name, phone: created.phone || phone });
        return created._id;
      }
      return null;
    } catch (err) {
      console.warn('findOrCreateCustomerLocal error:', err?.response?.data || err?.message);
      return null;
    }
  };

  const debouncedSearch = (query) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => triggerCustomerSearch(query), 300);
  };

  const handleNameInputChange = (val) => {
    setCustQueryName(val);
    setShowNameSuggestions(true);
    debouncedSearch(val);
  };

  const handlePhoneInputChange = (val) => {
    const cleaned = normalizePhone(val);
    setCustQueryPhone(cleaned);
    setShowPhoneSuggestions(true);
    if (cleaned.length >= 3) {
      debouncedSearch(cleaned);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (cust) => {

    updateCustomerInfo({
      name: cust.name || customerInfo.name || 'Walk-in',
      phone: cust.phone || customerInfo.phone || '',
      customerId: cust._id || null,
    });
    setCustQueryName(cust.name || '');
    setCustQueryPhone(normalizePhone(cust.phone || ''));
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    setCustomerSuggestions([]);
    toast.success('Customer selected');
  };

  // Initialize query fields from context on open/mount
  useEffect(() => {
    setCustQueryName(customerInfo?.name || '');
    setCustQueryPhone(customerInfo?.phone || '');
  }, [customerInfo?.name, customerInfo?.phone]);

  // Initialize notes draft from context when opening instructions modal or when context changes externally
  useEffect(() => {
    setNotesDraft(customerInfo?.specialInstructions || '');
  }, [customerInfo?.specialInstructions, showInstructionsModal]);

  // Strong event isolation for notes textarea to prevent global listeners from triggering rerenders
  useEffect(() => {
    const el = notesInputRef.current;
    if (!el) return;
    const stopAll = (e) => {
      e.stopPropagation();
      if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
        e.nativeEvent.stopImmediatePropagation();
      }
    };
    const handlers = [
      ['keydown', stopAll, true],
      ['keyup', stopAll, true],
      ['keypress', stopAll, true],
      ['input', stopAll, true],
      ['click', stopAll, true],
      ['focus', stopAll, true]
    ];
    handlers.forEach(([type, fn, cap]) => el.addEventListener(type, fn, { capture: cap }));
    return () => handlers.forEach(([type, fn, cap]) => el.removeEventListener(type, fn, { capture: cap }));
  }, [notesInputRef.current]);

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

  // Debug function to clear persistent batch data
  const clearTableBatchData = (tableId) => {
    try {
      const batchesKey = 'pos_table_batches';
      const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
      delete batchesAll[tableId];
      localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
      
      // Also clear cart data
      const cartsKey = 'pos_table_carts';
      const cartsAll = JSON.parse(localStorage.getItem(cartsKey) || '{}');
      delete cartsAll[tableId];
      localStorage.setItem(cartsKey, JSON.stringify(cartsAll));
      
      toast.success(`Cleared persistent data for table ${tableId}`);
      
      // Force re-render
      setIsProcessing(false);
    } catch (error) {
      console.error('Error clearing table data:', error);
      toast.error('Failed to clear table data');
    }
  };

  // Sync to context on blur to avoid frequent re-renders while typing
  const syncNameToContext = () => {
    const val = (custQueryName || '').trim();
    const shouldClearId = !!customerInfo?.customerId && val !== (customerInfo?.name || '');
    updateCustomerInfo({ name: val, ...(shouldClearId ? { customerId: null } : {}) });
  };
  const syncPhoneToContext = () => {
    const val = normalizePhone(custQueryPhone || '');
    const shouldClearId = !!customerInfo?.customerId && val !== normalizePhone(customerInfo?.phone || '');
    updateCustomerInfo({ phone: val, ...(shouldClearId ? { customerId: null } : {}) });
  };

  // Hide suggestions with a slight delay to allow onMouseDown selection
  const hideNameSuggestions = () => setTimeout(() => setShowNameSuggestions(false), 100);
  const hidePhoneSuggestions = () => setTimeout(() => setShowPhoneSuggestions(false), 100);

  const tableBatches = getCurrentTableBatches();
  const batchCount = tableBatches?.batches?.length || 0;
  const batchesTotal = tableBatches?.batches?.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) || 0;

  // Settle: open payment modal for table settlement
  const handleSettleTable = async () => {
    if (!selectedTable?._id) {
      toast.error('No table selected');
      return;
    }
    if (!batchCount) {
      toast.error('No batches to settle for this table');
      return;
    }
    
    // Open payment modal for settlement
    try { await findOrCreateCustomerLocal(); } catch {}
    setShowPaymentModal(true);
    toast.info('Complete payment to settle the table');
  };
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveOrderName, setSaveOrderName] = useState('');
  const [showSavedOrders, setShowSavedOrders] = useState(false); 
  const [showCustomerModal, setShowCustomerModal] = useState(false);

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

  // Reset KOT sent flag when cart gets new items (new batch) or when table changes
  useEffect(() => {
    if (cartItems.length > 0) {
      setKotSent(false);
    }
  }, [cartItems]);

  useEffect(() => {
    setKotSent(false);
  }, [selectedTable && selectedTable._id]);

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
      // Ensure we have customerId if details provided
      try {
        await findOrCreateCustomerLocal();
      } catch {}
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
    
    // Allow multiple KOT batches within the same table session.
    // Duplicate prevention is handled by processing state and cart emptiness.
    
    // For dine-in, customer name is NOT mandatory
    if (customerInfo.orderType !== 'dine-in' && !customerInfo.name.trim()) {
      errors.push('Customer name is required');
    }
    
    return errors;
  };

  // Handle proceed to payment with validation
  const handleProceedToPayment = async () => {
    const validationErrors = validateOrderForPayment();
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    try { await findOrCreateCustomerLocal(); } catch {}
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
      // Resolve or create customer to obtain a customerId
      let resolvedCustomerId = null;
      try { resolvedCustomerId = await findOrCreateCustomerLocal(); } catch {}

      // Build order items
      const orderItems = cartItems.map(item => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        return {
          menuItemId: item.menuItemId,
          name: item.name,
          price,
          quantity,
          subtotal: price * quantity,
          customizations: item.customizations || {}
        };
      });

      // Build backend order payload (explicit unpaid)
      const orderPayload = {
        tableId: selectedTable?._id || null,
        tableName: selectedTable?.name || selectedTable?.TableName || null,
        orderType: customerInfo?.orderType || 'dine-in',
        customer: {
          name: customerInfo?.name || '',
          phone: customerInfo?.phone || '',
          customerId: resolvedCustomerId || customerInfo?.customerId || null
        },
        specialInstructions: customerInfo?.specialInstructions || '',
        items: orderItems,
        totalAmount: getTotal(),
        paymentMethod: selectedPaymentMethod,
        paymentStatus: 'unpaid'
      };

      const result = await createOrder(orderPayload);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create order');
      }

      const createdOrder = result.order;

      // For dine-in: mark table occupied and store batch in localStorage
      if (selectedTable?._id && (customerInfo?.orderType || 'dine-in') === 'dine-in') {
        try {
          await updateTableStatus(selectedTable._id, 'occupied', createdOrder);
        } catch (e) {
          console.warn('Failed to set table occupied:', e);
        }

        try {
          const tableId = selectedTable._id;
          const batchesKey = 'pos_table_batches';
          const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
          const entry = batchesAll[tableId] || { nextOrderNumber: 1, batches: [] };
          const orderNumberSeq = entry.nextOrderNumber;
          entry.batches = [
            {
              orderId: createdOrder._id,
              orderNumber: orderNumberSeq,
              items: orderItems,
              totalAmount: orderPayload.totalAmount,
              createdAt: new Date().toISOString()
            },
            ...entry.batches
          ];
          entry.nextOrderNumber = orderNumberSeq + 1;
          batchesAll[tableId] = entry;
          localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
        } catch (e) {
          console.warn('Failed to persist batch entry:', e);
        }
      }

      // Save last order for UI context
      setLastSavedOrder(createdOrder);

      // Optional print
      if (withPrint) {
        try {
          const restaurantInfo = {
            name: 'OrderEase Restaurant',
            address: '123 Main Street, City, State 12345',
            phone: '+91 98765 43210',
            email: 'info@orderease.com',
            gst: 'GST123456789'
          };

          const receiptData = {
            order: createdOrder,
            paymentDetails: {
              method: selectedPaymentMethod,
              amountReceived: 0,
              change: 0
            },
            customerInfo,
            tableInfo: selectedTable
          };

          if (printerConfig?.printerType === 'network') {
            const payload = generateThermalReceipt(receiptData, restaurantInfo);
            const res = await printThermalReceipt(payload, printerConfig);
            if (!res?.success) throw new Error(res?.error || 'Thermal print failed');
            toast.success(res?.message || 'Printed to thermal printer');
          } else {
            const html = generateHTMLReceipt(receiptData, restaurantInfo);
            const res = printHTMLReceipt(html);
            if (!res?.success) throw new Error(res?.error || 'Browser print failed');
            toast.success(res?.message || 'Sent to printer');
          }
        } catch (printErr) {
          console.error('Save & Print error:', printErr);
          toast.error(`Print failed: ${printErr?.message || 'Unknown error'}`);
        }
      }

      const displayNumber = createdOrder.orderNumber || createdOrder._id || '';
      toast.success(`Order #${displayNumber} saved${withPrint ? ' & printed' : ''}`);

      // Ask user via modal if they want to clear cart
      setShowClearConfirm(true);
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

  // Global keyboard shortcuts for faster POS actions
  useEffect(() => {
    const isTypingContext = (target) => {
      if (!target) return false;
      const tag = (target.tagName || '').toUpperCase();
      const editable = target.isContentEditable;
      return editable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (e) => {
      // Ignore if any modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // Avoid triggering inside inputs or when a modal expects text input
      if (isTypingContext(e.target)) return;

      const key = (e.key || '').toLowerCase();
      // Map 1/2/3 to order type selection
      if (key === '1') {
        e.preventDefault();
        handleOrderTypeChange('dine-in');
        return;
      }
      if (key === '2') {
        e.preventDefault();
        handleOrderTypeChange('takeaway');
        return;
      }
      if (key === '3') {
        e.preventDefault();
        handleOrderTypeChange('delivery');
        return;
      }

      // P -> proceed to payment (if valid)
      if (key === 'p') {
        e.preventDefault();
        const errs = validateOrderForPayment();
        if (errs.length) {
          toast.error(errs[0]);
          return;
        }
        handleProceedToPayment();
        return;
      }

      // S -> save/hold order
      if (key === 's') {
        e.preventDefault();
        handleHoldOrder();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customerInfo?.orderType, cartItems, selectedTable, showPaymentModal]);

  const CartItem = memo(({ item }) => (
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
  ));

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

        {/* Enhanced Customer Info & Special Instructions Section */}
        {(() => {
          const tableId = selectedTable?._id;
          const batchesMap = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
          const tableBatches = tableId ? batchesMap[tableId] : null;
          const hasBatches = !!(tableBatches && Array.isArray(tableBatches.batches) && tableBatches.batches.length);

          // Hide section when "No items added to cart" state (no cart items AND no batches)
          if (cartItems.length === 0 && !hasBatches) return null;

          return (
            <div className="customer-section-container">
              {/* Quick Access Buttons Row */}
              <div className="info-quick-access d-flex">
                {/* Customer Information Button */}
                <Button
                  color={(customerInfo.name || customerInfo.phone) ? 'primary' : 'outline-secondary'}
                  size="sm"
                  className={`flex-fill customer-info-toggle ${(customerInfo.name || customerInfo.phone) ? 'active' : ''}`}
                  onClick={() => setShowCustomerModal(true)}
                >
                  <div className="d-flex align-items-center justify-content-center position-relative">
                    <FaUser size={16} className="me-2" />
                    <span className="fw-medium">Customer</span>
                    {(customerInfo.name || customerInfo.phone) && (
                      <Badge 
                        color="success" 
                        className="position-absolute top-0 start-100 translate-middle badge-indicator"
                      >
                        ✓
                      </Badge>
                    )}
                  </div>
                </Button>
                
                {/* Special Instructions Button */}
                <Button
                  color={customerInfo.specialInstructions ? 'primary' : 'outline-secondary'}
                  size="sm"
                  className={`flex-fill special-instructions-toggle ms-2 ${customerInfo.specialInstructions ? 'active' : ''}`}
                  onClick={() => setShowInstructionsModal(true)}
                >
                  <div className="d-flex align-items-center justify-content-center position-relative">
                    <FaClipboardList size={16} className="me-2" />
                    <span className="fw-medium">Instructions</span>
                    {customerInfo.specialInstructions && (
                      <Badge 
                        color="success" 
                        className="position-absolute top-0 start-100 translate-middle badge-indicator"
                      >
                        ✓
                      </Badge>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          );
        })()}
        <CardBody className="p-3" style={{ overflowY: 'auto', height: 'calc(100% - 280px)' }}>
          {(() => {
            const tableId = selectedTable?._id;
            const batchesMap = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
            const tableBatches = tableId ? batchesMap[tableId] : null;
            const hasBatches = !!(tableBatches && Array.isArray(tableBatches.batches) && tableBatches.batches.length);
            
            // Always show content if there are cart items OR batch items
            if (cartItems.length > 0 || hasBatches) {
              return (
            <>
              {/* Customer Information and Special Instructions moved to modals */}

              {/* Cart Items */}
              <div className="cart-items mb-1">
                {/* <h6>Order Items</h6> */}
                <>
                  {/* Batch Header */}
                  <div className="batch-headers">
                    <small className="text-decoration-underline fst-italic">Batch #{batchCount + 1}</small>
                  </div>
                  
                  {/* Cart Items List */}
                  {cartItems.length > 0 && (
                    <>
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
                </>
              </div>

              {/* Debug: Clear persistent data button (temporary) */}
              {batchCount > 0 && selectedTable?.name === 'Table 01' && (
                <div className="mb-2">
                  <Button
                    size="sm"
                    color="warning"
                    onClick={() => clearTableBatchData(selectedTable._id)}
                    className="w-100"
                  >
                    🗑️ Clear Persistent Data for {selectedTable.name}
                  </Button>
                </div>
              )}

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
                  <small>Customer will pick up this order</small>
                </Alert>
              )}
            </>
              );
            } else {
              // Show placeholder when no cart items and no batches
              return (
                <Alert color="info" className="text-center shadow-none bg-white" fade={false}>
                  <FaShoppingCart size={48} className="text-muted mb-3" />
                  <h5>No items added to cart</h5>
                  <p>Add some items from the menu to get started!</p>
                </Alert>
              );
            }
          })()}

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

      {/* Clear Cart Confirmation Modal */}
      <Modal isOpen={showClearConfirm} toggle={() => setShowClearConfirm(false)}>
        <ModalHeader toggle={() => setShowClearConfirm(false)}>
          Clear Cart?
        </ModalHeader>
        <ModalBody>
          {lastSavedOrder ? (
            <>
              <p className="mb-2">
                Order <strong>#{lastSavedOrder.orderNumber || lastSavedOrder._id}</strong> has been saved{processingAction === 'save-print' ? ' & printed' : ''}.
              </p>
              <p className="mb-0">Do you want to clear the cart for the next order? Customer details will be preserved.</p>
            </>
          ) : (
            <p className="mb-0">Order saved. Do you want to clear the cart? Customer details will be preserved.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowClearConfirm(false)}>
            Keep Cart
          </Button>
          <Button
            color="danger"
            onClick={() => {
              // Preserve customer info but clear items and POS flags
              replaceCart([], { ...customerInfo });
              setKotSent(false);
              setActiveOffer(null);
              setOrderStatus({
                isPaid: false,
                isLoyalty: false,
                sendFeedbackSMS: false,
                isComplimentary: false
              });
              setShowClearConfirm(false);
              toast.success('Cart cleared');
            }}
          >
            Clear Cart
          </Button>
        </ModalFooter>
      </Modal>

      {/* Customer Info Modal */}
      <Modal isOpen={showCustomerModal} toggle={() => setShowCustomerModal(false)}>
        <ModalHeader toggle={() => setShowCustomerModal(false)}>Customer Information</ModalHeader>
        <ModalBody>
          <Form>
            <Row>
              <Col xs={12} className="mb-3">
                <Label className="form-label-enhanced">
                  <FaUser size={14} className="me-2 text-muted" />
                  Customer Name
                </Label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="text"
                    className="form-input-enhanced"
                    placeholder="Search or enter customer name"
                    value={custQueryName}
                    onChange={(e) => handleNameInputChange(e.target.value)}
                    onFocus={() => setShowNameSuggestions(true)}
                    onKeyDown={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyDownCapture={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyUp={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyUpCapture={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyPress={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onInput={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onBlur={() => { syncNameToContext(); hideNameSuggestions(); }}
                    autoFocus
                  />
                  {showNameSuggestions && (customerSuggestions.length > 0 || isSearchingCustomers) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050 }} className="bg-white border rounded shadow-sm">
                      {isSearchingCustomers && (
                        <div className="p-2 text-muted small">Searching...</div>
                      )}
                      {customerSuggestions.map((c) => (
                        <div
                          key={c._id}
                          className="p-2 suggestion-item"
                          style={{ cursor: 'pointer' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(c);
                          }}
                        >
                          <div className="d-flex justify-content-between">
                            <span>{c.name || 'Unnamed'}</span>
                            <small className="text-muted">{c.customerId || ''}</small>
                          </div>
                          <small className="text-muted">{c.phone || '—'}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Col>
              <Col xs={12} className="mb-3">
                <Label className="form-label-enhanced">
                  <FaPhone size={14} className="me-2 text-muted" />
                  Phone Number
                </Label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="tel"
                    className="form-input-enhanced"
                    placeholder="Search or enter phone number"
                    value={custQueryPhone}
                    onChange={(e) => handlePhoneInputChange(e.target.value)}
                    onFocus={() => setShowPhoneSuggestions(true)}
                    onKeyDown={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyDownCapture={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyUp={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyUpCapture={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onKeyPress={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onInput={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
                    onBlur={() => { syncPhoneToContext(); hidePhoneSuggestions(); }}
                  />
                  {showPhoneSuggestions && (customerSuggestions.length > 0 || isSearchingCustomers) && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050 }} className="bg-white border rounded shadow-sm">
                      {isSearchingCustomers && (
                        <div className="p-2 text-muted small">Searching...</div>
                      )}
                      {customerSuggestions.map((c) => (
                        <div
                          key={c._id}
                          className="p-2 suggestion-item"
                          style={{ cursor: 'pointer' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCustomer(c);
                          }}
                        >
                          <div className="d-flex justify-content-between">
                            <span>{c.name || 'Unnamed'}</span>
                            <small className="text-muted">{c.customerId || ''}</small>
                          </div>
                          <small className="text-muted">{c.phone || '—'}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Col>
              {customerInfo.orderType === 'delivery' && (
                <Col xs={12} className="mb-2">
                  <Label className="form-label-enhanced">
                    <FaMapMarkerAlt size={14} className="me-2 text-muted" />
                    Delivery Address <span className="text-danger">*</span>
                  </Label>
                  <Input
                    type="textarea"
                    rows="3"
                    className="form-input-enhanced"
                    placeholder="Enter complete delivery address with landmarks"
                    value={customerInfo.deliveryAddress || ''}
                    onChange={(e) => updateCustomerInfo({ deliveryAddress: e.target.value })}
                  />
                  <small className="text-muted d-block mt-1">Include building name, floor, and nearby landmarks</small>
                </Col>
              )}
            </Row>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            color="warning"
            outline
            onClick={() => {
              setCustQueryName('');
              setCustQueryPhone('');
              setCustomerSuggestions([]);
              setShowNameSuggestions(false);
              setShowPhoneSuggestions(false);
              updateCustomerInfo({ name: '', phone: '', customerId: null });
              toast.success('Customer fields cleared');
            }}
          >
            Clear
          </Button>
          <Button color="secondary" onClick={() => setShowCustomerModal(false)}>
            Close
          </Button>
          <Button color="primary" onClick={() => setShowCustomerModal(false)}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

      {/* Special Instructions Modal */}
      <Modal isOpen={showInstructionsModal} toggle={() => setShowInstructionsModal(false)}>
        <ModalHeader toggle={() => setShowInstructionsModal(false)}>Special Instructions</ModalHeader>
        <ModalBody>
          <Form>
            <Label className="form-label-enhanced">
              <FaStickyNote size={14} className="me-2 text-muted" />
              Order Notes
            </Label>
            <Input
              type="textarea"
              rows="4"
              className="form-input-enhanced instructions-textarea"
              placeholder="e.g., Extra spicy, No onions, Less oil, Separate packaging..."
              value={notesDraft}
              innerRef={notesInputRef}
              onKeyDownCapture={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
              onKeyUpCapture={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
              onInputCapture={(e) => { e.stopPropagation(); if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation(); }}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                const val = (notesDraft || '').slice(0, 500).trim();
                if (val !== (customerInfo?.specialInstructions || '')) {
                  updateCustomerInfo({ specialInstructions: val });
                }
              }}
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">Be specific to help kitchen staff prepare your order perfectly</small>
              <small className="text-muted">{(notesDraft || '').length}/500</small>
            </div>
            <div className="quick-tags mt-3">
              <small className="text-muted mb-2 d-block">Quick tags:</small>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { label: 'Extra Spicy', icon: '🌶️' },
                  { label: 'Less Oil', icon: '🫒' },
                  { label: 'No Onions', icon: '🧅' },
                  { label: 'Extra Cheese', icon: '🧀' },
                  { label: 'Well Done', icon: '🔥' },
                  { label: 'Separate Pack', icon: '📦' }
                ].map((tag, index) => (
                  <Button
                    key={index}
                    size="sm"
                    color="outline-secondary"
                    className="quick-tag-btn"
                    onClick={() => {
                      const currentInstructions = notesDraft || '';
                      const newInstructions = currentInstructions
                        ? `${currentInstructions}, ${tag.label}`
                        : tag.label;
                      setNotesDraft(newInstructions);
                    }}
                  >
                    <span className="me-1">{tag.icon}</span>
                    {tag.label}
                  </Button>
                ))}
              </div>
            </div>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button
            color="warning"
            outline
            onClick={() => {
              setNotesDraft('');
              updateCustomerInfo({ specialInstructions: '' });
              notesInputRef.current?.focus?.();
              toast.success('Instructions cleared');
            }}
          >
            Clear
          </Button>
          <Button color="secondary" onClick={() => setShowInstructionsModal(false)}>
            Close
          </Button>
          <Button color="primary" onClick={() => setShowInstructionsModal(false)}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

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
