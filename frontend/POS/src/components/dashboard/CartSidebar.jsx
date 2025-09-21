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
  FaStickyNote,
  FaPrint,
  FaRedo
} from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useOrder } from '../../context/OrderContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import PaymentModal from './PaymentModal';
import toast from '../../utils/notify';
import playPosSound from '../../utils/sound';
import './CartSidebar.css';
import axios from 'axios';
import { generateHTMLReceipt, generateHTMLReceiptReference, printHTMLReceipt, printThermalReceipt, generateThermalReceipt, generateThermalKOT, generateHTMLKOT } from '../../utils/thermalPrinter';
import { printTableBill } from '../../utils/printTableBill';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api`;

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
  
  const { selectedTable, updateTableStatus, restaurant, branch } = usePOS();
  const { createOrder, updatePaymentStatus, getOrdersByTable } = useOrder();
  const { user } = useAuth();
  const { formatCurrency: formatCurrencyDynamic, getCurrencySymbol, isReady: currencyReady } = useCurrency();

  // Price formatter (fallbacks if currency context not ready)
  const formatPrice = (value) => {
    try {
      const num = Number(value) || 0;
      if (currencyReady && typeof formatCurrencyDynamic === 'function') {
        return formatCurrencyDynamic(num);
      }
      return num.toFixed(2);
    } catch {
      return (Number(value) || 0).toFixed(2);
    }
  };

  // Format non-size variant group selections for display next to item names
  const formatVariantSelections = (customizations) => {
    try {
      const vsel = (customizations && customizations.variantSelections) || null;
      if (!vsel || typeof vsel !== 'object') return '';
      const parts = [];
      Object.entries(vsel).forEach(([groupName, value]) => {
        if (!groupName) return;
        const g = String(groupName).trim();
        if (!g || g.toLowerCase() === 'size') return; // size shown separately
        if (Array.isArray(value)) {
          const names = value.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
          if (names.length) parts.push(`${g}: ${names.join(', ')}`);
        } else if (typeof value === 'string') {
          const s = value.trim();
          if (s) parts.push(`${g}: ${s}`);
        }
      });
      return parts.join(' • ');
    } catch {
      return '';
    }
  };

  // Derive displayable size/variant name from customizations
  const getVariantName = (customizations) => {
    try {
      if (!customizations || typeof customizations !== 'object') return null;
      // Prefer explicit fields
      const direct = customizations.selectedVariant || customizations.selectedSize || customizations.sizeVariant || customizations.size || customizations.variant || customizations.variantName;
      if (direct && String(direct).trim()) return String(direct).trim();
      // Fallback: look into variantSelections for a group named "size"
      const vsel = customizations.variantSelections || null;
      if (vsel && typeof vsel === 'object') {
        const entries = Object.entries(vsel);
        for (const [k, v] of entries) {
          const key = String(k).trim().toLowerCase();
          const looksLikeSize = key === 'size' || key === 'sizes' || key.includes('size') || key.includes('variant');
          if (!looksLikeSize) continue;
          if (Array.isArray(v)) {
            const names = v.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
            if (names.length) return names.join(', ');
          } else if (typeof v === 'string' && v.trim()) {
            return v.trim();
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Autocomplete state for customers
  const [custQueryName, setCustQueryName] = useState('');
  const [custQueryPhone, setCustQueryPhone] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  // Tick to force recompute of memoized table batches when localStorage mutations occur
  const [batchesTick, setBatchesTick] = useState(0);
  const [kotSentItems, setKotSentItems] = useState({}); // { cartItemId: sentQty }
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

  // Load KOT sent quantities per table
  useEffect(() => {
    const tableId = selectedTable?._id;
    if (!tableId) { setKotSentItems({}); return; }
    try {
      const all = JSON.parse(localStorage.getItem('pos_table_kot_sent') || '{}');
      setKotSentItems(all[tableId] || {});
    } catch { setKotSentItems({}); }
  }, [selectedTable && selectedTable._id]);

  // Initialize notes draft from context when opening instructions modal or when context changes externally
  useEffect(() => {
    setNotesDraft(customerInfo?.specialInstructions || '');
  }, [customerInfo?.specialInstructions, showInstructionsModal]);

  // Retrieve current table batches from localStorage
  const getCurrentTableBatches = () => {
    const tableId = selectedTable?._id || selectedTable?.tableId;
    if (!tableId) return null;
    try {
      const map = JSON.parse(localStorage.getItem('pos_table_batches') || '{}');
      return map[tableId] || null;
    } catch {
      return null;
    }
  };

  const tableBatches = useMemo(
    () => getCurrentTableBatches(),
    [selectedTable && selectedTable._id, selectedTable && selectedTable.tableId, batchesTick]
  );
  const batchCount = useMemo(() => tableBatches?.batches?.length || 0, [tableBatches]);
  const batchesTotal = useMemo(() => (
    tableBatches?.batches?.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) || 0
  ), [tableBatches]);

  // When cart is empty but there are existing batches for the table (e.g., from customer portal),
  // adopt order meta (orderType, customer info, instructions, deliveryAddress) from the latest batch.
  useEffect(() => {
    try {
      const hasCart = Array.isArray(cartItems) && cartItems.length > 0;
  const batches = tableBatches?.batches || [];
      if (hasCart || !Array.isArray(batches) || batches.length === 0) return;
  // Prefer the most recent batch (now stored at the end when appending)
  const latest = batches[batches.length - 1];
      if (!latest) return;
      const next = {};
      if (latest.orderType && latest.orderType !== customerInfo.orderType) next.orderType = latest.orderType;
      const cust = latest.customer || {};
      if (cust.name && cust.name !== customerInfo.name) next.name = cust.name;
      if (cust.phone && cust.phone !== customerInfo.phone) next.phone = cust.phone;
      if (cust.customerId && cust.customerId !== customerInfo.customerId) next.customerId = cust.customerId;
      if (typeof latest.specialInstructions === 'string' && latest.specialInstructions !== customerInfo.specialInstructions) {
        next.specialInstructions = latest.specialInstructions;
      }
      if (latest.deliveryAddress && latest.deliveryAddress !== customerInfo.deliveryAddress) {
        next.deliveryAddress = latest.deliveryAddress;
      }
      if (Object.keys(next).length) {
        updateCustomerInfo(next);
      }
    } catch (_) {}
  }, [tableBatches, cartItems]);

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
  // Split bill states
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitAllocations, setSplitAllocations] = useState({}); // { cartItemId: [q1,q2,...] }
  const [splitPayerIndex, setSplitPayerIndex] = useState(null); // for sequential payments
  const [currentSplitCart, setCurrentSplitCart] = useState([]); // cart for current payer
  const [splitSelectedIndex, setSplitSelectedIndex] = useState(0); // chosen person to pay now
  const [splitSingleMode, setSplitSingleMode] = useState(false);   // pay only one person, not all
  // When true, display per-person totals as equal shares of the total amount,
  // regardless of the quantity allocations table.
  const [splitEqualMode, setSplitEqualMode] = useState(false);
  // Billing-time split: use table batches instead of cart
  const [billingSplitMode, setBillingSplitMode] = useState(false);
  const [splitSourceItems, setSplitSourceItems] = useState([]);
  const [billingPaidCents, setBillingPaidCents] = useState(0);

  // Compute equal allocations using a global round-robin across items.
  // This ensures single-qty items get distributed between people (item1->P1, item2->P2, ...).
  const computeEqualAllocations = (items, people) => {
    const allocations = {};
    let person = 0;
    for (const item of items) {
      const totalQty = Math.max(1, Number(item.quantity) || 1);
      const arr = new Array(people).fill(0);
      for (let i = 0; i < totalQty; i++) {
        arr[person] += 1;
        person = (person + 1) % people;
      }
      allocations[item.cartItemId] = arr;
    }
    return allocations;
  };

  // Build synthetic items list from table batches (merged similar lines)
  const buildItemsFromBatches = () => {
    const list = [];
    const map = new Map();
    try {
      const batches = tableBatches?.batches || [];
      for (const b of batches) {
        for (const it of (b.items || [])) {
          const variant = getVariantName(it?.customizations) || '';
          const key = JSON.stringify({ n: it.name || '', p: Number(it.price)||0, v: variant });
          const prev = map.get(key) || { name: it.name, price: Number(it.price)||0, quantity: 0, customizations: { selectedVariant: variant }, cartItemId: key };
          prev.quantity += Number(it.quantity)||0;
          map.set(key, prev);
        }
      }
      map.forEach(v => list.push(v));
    } catch {}
    return list;
  };

  const personTotal = (items, allocations, idx) => {
    return items.reduce((sum, it) => {
      const arr = allocations[it.cartItemId] || [];
      const qty = Number(arr[idx]) || 0;
      return sum + qty * (Number(it.price)||0);
    }, 0);
  };

  const settleExistingBatchesLocal = async (method = 'cash') => {
    try {
      if (!selectedTable?._id) return;
      const batches = tableBatches?.batches?.filter(b => b.orderId) || [];
      if (!batches.length) return;
      const results = await Promise.allSettled(
        batches.map(b => updatePaymentStatus(b.orderId, 'paid', method))
      );
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success));
      if (failures.length) throw new Error('Some orders failed to mark as paid');
      // Clear batches and carts
      try {
        const batchesKey = 'pos_table_batches';
        const all = JSON.parse(localStorage.getItem(batchesKey) || '{}');
        delete all[selectedTable._id];
        localStorage.setItem(batchesKey, JSON.stringify(all));
  try { setBatchesTick(t => t + 1); } catch {}
      } catch {}
      try {
        const cartsKey = 'pos_table_carts';
        const allc = JSON.parse(localStorage.getItem(cartsKey) || '{}');
        delete allc[selectedTable._id];
        localStorage.setItem(cartsKey, JSON.stringify(allc));
      } catch {}
      try { await updateTableStatus(selectedTable._id, 'available'); } catch {}
      replaceCart([], { orderType: 'dine-in' });
      toast.success('Table settled');
      // notify UI
      try { window.dispatchEvent(new Event('batchesUpdated')); } catch {}
    } catch (e) {
      console.warn('Settlement error:', e);
      toast.error('Failed to settle table');
    }
  };

  // Inline quantity edit drafts
  const [qtyDrafts, setQtyDrafts] = useState({}); // { [cartItemId]: string|number }
  const [batchQtyDrafts, setBatchQtyDrafts] = useState({}); // { [`${orderId}:${itemIdx}`]: string|number }

  // Keep draft values in sync when cart items change
  useEffect(() => {
    // Always reflect the latest cart quantities to avoid stale values when items are re-added
    setQtyDrafts(() => {
      const next = {};
      for (const ci of cartItems || []) {
        const key = ci.cartItemId;
        next[key] = ci.quantity ?? 1;
      }
      return next;
    });
  }, [cartItems]);

  const handleQtyInputChange = (cartItemId, value) => {
    const cleaned = String(value).replace(/[^0-9]/g, '');
    setQtyDrafts((prev) => ({ ...prev, [cartItemId]: cleaned }));
  };

  const commitQtyChange = (cartItemId, fallbackQuantity = 1) => {
    const raw = qtyDrafts[cartItemId];
    let parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 1) parsed = Math.max(1, fallbackQuantity || 1);
    try {
      // updateQuantity is used elsewhere in this component
      updateQuantity(cartItemId, parsed);
    } finally {
      setQtyDrafts((prev) => ({ ...prev, [cartItemId]: parsed }));
    }
  };

  const handleBatchQtyInputChange = (key, value) => {
    const cleaned = String(value).replace(/[^0-9]/g, '');
    setBatchQtyDrafts((prev) => ({ ...prev, [key]: cleaned }));
  };

  const commitBatchQtyChange = (orderId, itemIdx, fallbackQuantity = 1) => {
    const key = `${orderId}:${itemIdx}`;
    const raw = batchQtyDrafts[key];
    let parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 1) parsed = Math.max(1, fallbackQuantity || 1);
    try {
      updateBatchItemQuantity(orderId, itemIdx, parsed);
    } finally {
      setBatchQtyDrafts((prev) => ({ ...prev, [key]: parsed }));
    }
  };

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
  try { setBatchesTick(t => t + 1); } catch {}
        
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
  try { setBatchesTick(t => t + 1); } catch {}
        
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
      const defaultCount = Math.max(2, splitCount || 2);
      let items = cartItems;
      let billingMode = false;
      if (items.length === 0 && batchCount > 0) {
        // Billing-time split from batches
        items = buildItemsFromBatches();
        billingMode = true;
      }
      if (items.length === 0) {
        toast.error('Nothing to split');
        return;
      }
      setBillingSplitMode(billingMode);
      setSplitSourceItems(items);
      const initial = computeEqualAllocations(items, defaultCount);
      setSplitCount(defaultCount);
      setSplitAllocations(initial);
      setSplitEqualMode(true);
      setShowSplitModal(true);
      toast.info(billingMode ? 'Split bill for existing orders' : 'Split bill mode activated');
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
      // Build only unsent quantities for this KOT
      const pendingItems = [];
      cartItems.forEach(item => {
        const total = Number(item.quantity) || 0;
        const sent = Number(kotSentItems[item.cartItemId] || 0);
        const pending = total - sent;
        if (pending > 0) {
          const price = Number(item.price) || 0;
          pendingItems.push({
            menuItemId: item.menuItemId,
            name: item.name,
            price,
            quantity: pending,
            subtotal: price * pending,
            customizations: item.customizations || {}
          });
        }
      });

      if (pendingItems.length === 0) {
        toast.error('No new items to send to kitchen');
        return;
      }

      const orderData = {
        tableId: selectedTable?._id || null,
        tableName: selectedTable?.TableName || selectedTable?.name || null,
        orderType: customerInfo.orderType || 'dine-in',
        customer: {
          name: customerInfo.name || '',
          phone: customerInfo.phone || ''
        },
        specialInstructions: customerInfo.specialInstructions || '',
  items: pendingItems,
        totalAmount: getTotal()
      };

      // Attempt create with stock enforcement; on insufficiency ask for override
      let result = await createOrder(orderData, { enforceStock: true, allowInsufficientOverride: false });
      if (!result?.success && result?.insufficient) {
        const msg = result.message || 'Insufficient stock for some ingredients';
        const proceed = window.confirm(`${msg}\n\nProceed and override stock check?`);
        if (!proceed) {
          throw new Error(msg);
        }
        result = await createOrder(orderData, { enforceStock: true, allowInsufficientOverride: true });
      }
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

  // Do not write batches locally here to avoid duplication.
  // OrderContext will upsert the batch into pos_table_batches on socket events.

      // If print requested generate professional KOT slip
      if (withPrint) {
        try {
          const restaurantInfo = {
            name: 'OrderEase Restaurant'
          };
          const kotPayload = {
            order: createdOrder,
            items: pendingItems,
            tableInfo: selectedTable,
            customerInfo,
            batchNumber: (tableBatches?.batches?.length || 0) + 1
          };
          if (printerConfig?.printerType === 'network') {
            const kotDestination = printerConfig?.kotDestination || 'kitchen';
            const wantDuplicate = !!printerConfig?.kotDuplicate;
            const iterations = wantDuplicate ? 2 : 1;
            for (let i=0;i<iterations;i++) {
              const duplicate = i===1; // second copy marked duplicate
              let escpos = generateThermalKOT(kotPayload, restaurantInfo, { duplicate });
              escpos = Object.assign(new String(escpos), { _meta: { destination: kotDestination, type: duplicate? 'kot-duplicate':'kot' } });
              const res = await printThermalReceipt(escpos, printerConfig, { destination: kotDestination });
              if (!res?.success) {
                console.warn('Thermal KOT print failed, falling back to HTML (copy '+(i+1)+')');
                const html = generateHTMLKOT(kotPayload, restaurantInfo, { duplicate });
                printHTMLReceipt(html);
              }
            }
          } else {
            const wantDuplicate = !!printerConfig?.kotDuplicate;
            const iterations = wantDuplicate ? 2 : 1;
            for (let i=0;i<iterations;i++) {
              const duplicate = i===1;
              const html = generateHTMLKOT(kotPayload, restaurantInfo, { duplicate });
              printHTMLReceipt(html);
            }
          }
        } catch (e) {
          console.error('KOT print error', e);
        }
      }

      // Update sent quantity map (persist per table) and keep items
      const updatedSent = { ...kotSentItems };
      pendingItems.forEach(pi => {
        const match = cartItems.find(ci => ci.menuItemId === pi.menuItemId && ci.name === pi.name && ci.customizations === pi.customizations && ci.cartItemId);
        const id = match ? match.cartItemId : null;
        if (id) updatedSent[id] = (updatedSent[id] || 0) + pi.quantity;
      });
      setKotSentItems(updatedSent);
      try {
        const tableId = selectedTable?._id;
        if (tableId) {
          const all = JSON.parse(localStorage.getItem('pos_table_kot_sent') || '{}');
          all[tableId] = updatedSent;
          localStorage.setItem('pos_table_kot_sent', JSON.stringify(all));
        }
      } catch {}
      setKotSent(true);
      playPosSound('success');
      
    } catch (error) {
      console.error('KOT Error:', error);
  playPosSound('error');
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

      // Attempt create with stock enforcement; on insufficiency prompt and retry with override
      let result = await createOrder(orderPayload, { enforceStock: true, allowInsufficientOverride: false });
      if (!result?.success && result?.insufficient) {
        const msg = result.message || 'Insufficient stock for some ingredients';
        const proceed = window.confirm(`${msg}\n\nProceed and override stock check?`);
        if (!proceed) {
          throw new Error(msg);
        }
        result = await createOrder(orderPayload, { enforceStock: true, allowInsufficientOverride: true });
      }
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

  // Do not write batches locally here to avoid duplication.
  // OrderContext will upsert the batch into pos_table_batches on socket events.
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
            country: 'India',
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

  // Reprint last KOT for the selected table
  const handleReprintKOT = async () => {
    if (!batchCount) {
      toast.error('No previous KOT to reprint');
      return;
    }
    try {
      setIsProcessing(true);
      setProcessingAction('reprint-kot');
      const lastBatch = tableBatches.batches[tableBatches.batches.length - 1];
      if (!lastBatch || !Array.isArray(lastBatch.items) || lastBatch.items.length === 0) {
        toast.error('Last batch has no items');
        return;
      }
      const restaurantInfo = {
        name: (restaurant?.brandName || restaurant?.name || user?.restaurantName || 'Restaurant'),
        brandName: restaurant?.brandName || restaurant?.name || user?.restaurantName || undefined,
        branchName: branch?.name || branch?.branchName || user?.branchName || undefined,
        logo: restaurant?.logo || user?.restaurantLogo || undefined,
        address: branch?.address || branch?.addressLine || 'Address',
        phone: branch?.phone || branch?.contactNumber || '',
        email: restaurant?.email || '',
        state: restaurant?.state || undefined,
        gstRegistrations: Array.isArray(restaurant?.gstRegistrations) ? restaurant.gstRegistrations : undefined,
        gst: (branch?.gst || branch?.gstNumber || restaurant?.gstNumber) || undefined,
        fssaiLicense: branch?.fssaiLicense || undefined
      };
      const kotPayload = {
        order: { _id: lastBatch.orderId, orderNumber: lastBatch.orderNumber },
        items: lastBatch.items,
        tableInfo: selectedTable,
        customerInfo: {
          name: lastBatch.customer?.name || customerInfo.name || '',
          phone: lastBatch.customer?.phone || customerInfo.phone || '',
          specialInstructions: lastBatch.specialInstructions || customerInfo.specialInstructions || ''
        },
        batchNumber: lastBatch.orderNumber || tableBatches.batches.length
      };
      // Print (duplicate flag false, but allow duplicate if config)
      try {
        if (printerConfig?.printerType === 'network') {
          const kotDestination = printerConfig?.kotDestination || 'kitchen';
          const wantDuplicate = !!printerConfig?.kotDuplicate; 
          const iterations = wantDuplicate ? 2 : 1;
          for (let i = 0; i < iterations; i++) {
            const duplicate = i === 1;
            let escpos = generateThermalKOT(kotPayload, restaurantInfo, { duplicate });
            escpos = Object.assign(new String(escpos), { _meta: { destination: kotDestination, type: duplicate ? 'kot-duplicate' : 'kot' } });
            const res = await printThermalReceipt(escpos, printerConfig, { destination: kotDestination });
            if (!res?.success) {
              const html = generateHTMLKOT(kotPayload, restaurantInfo, { duplicate });
              printHTMLReceipt(html);
            }
          }
        } else {
          const wantDuplicate = !!printerConfig?.kotDuplicate; 
          const iterations = wantDuplicate ? 2 : 1;
          for (let i = 0; i < iterations; i++) {
            const duplicate = i === 1;
            const html = generateHTMLKOT(kotPayload, restaurantInfo, { duplicate });
            printHTMLReceipt(html);
          }
        }
        toast.success('KOT reprinted');
      } catch (e) {
        console.error('Reprint KOT error', e);
        toast.error('Failed to reprint KOT');
      }
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  // Print Bill using shared utility (was duplicated, now centralized)
  const handlePrintBill = async () => {
    if (!selectedTable?._id) {
      toast.error('Select a table to print bill');
      return;
    }
    try {
      setIsProcessing(true);
      setProcessingAction('print-bill');
      await printTableBill({
        table: selectedTable,
        getOrdersByTable,
        restaurant,
        branch,
        user,
        customerInfo
      });
    } catch (e) {
      console.error('Print bill error', e);
      toast.error('Failed to print bill');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
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
          const hasBatches = batchCount > 0;

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
                        className="position-absolute top-0 start-100 translate-middle badge-indicator mt-2 ms-3  p-1"
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
                        className="position-absolute top-0 start-100 translate-middle badge-indicator mt-2 ms-3  p-1"
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
            const hasBatches = batchCount > 0;
            
            // Always show content if there are cart items OR batch items
            if (cartItems.length > 0 || hasBatches) {
              return (
            <>
              {/* Customer Information and Special Instructions moved to modals */}

              {/* Batch Summary for this table */}
              {hasBatches && (
                <div className="batch-summary mb-2">
                  {/* <h6>Batches for this Table</h6> */}
                  {tableBatches.batches
                    .slice() // preserve stored order
                    .map((batch, batchIdx) => (
                    <div key={`${batch.orderId || batchIdx}`} className="batch-section">
                      {/* Batch Header */}
                      <div className="batch-headers">
                        <small className="text-decoration-underline fst-italic">Batch #{batch.orderNumber || (batchIdx + 1)}</small>
                      </div>
                      
                      {/* Batch Items */}
                      {batch.items?.map((item, itemIdx) => (
                        <div key={`${batch.orderId}-${itemIdx}`} className="cart-item-row d-flex justify-content-between align-items-center">
                          <div className="item-info">
                            <div className="item-name">
                              {item.name}
                              {(() => {
                                const variantName = getVariantName(item && item.customizations);
                                const extra = formatVariantSelections(item && item.customizations);
                                if (variantName && extra) {
                                  return (
                                    <small className="text-muted ms-1">({variantName} • {extra})</small>
                                  );
                                }
                                if (variantName) {
                                  return <small className="text-muted ms-1">({variantName})</small>;
                                }
                                if (extra) {
                                  return <small className="text-muted ms-1">({extra})</small>;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="item-controls d-flex align-items-center">
                            <button 
                              className="qty-btn"
                              onClick={() => updateBatchItemQuantity(batch.orderId, itemIdx, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="qty-display form-control form-control-sm text-center rounded-0"
                              style={{ width: 40, height: 26 }}
                              value={batchQtyDrafts[`${batch.orderId}:${itemIdx}`] ?? (item.quantity ?? 1)}
                              onChange={(e) => handleBatchQtyInputChange(`${batch.orderId}:${itemIdx}`, e.target.value)}
                              onBlur={() => commitBatchQtyChange(batch.orderId, itemIdx, item.quantity)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setBatchQtyDrafts((prev) => ({ ...prev, [`${batch.orderId}:${itemIdx}`]: item.quantity }));
                                  e.currentTarget.blur();
                                }
                                e.stopPropagation();
                              }}
                            />
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

              {/* Cart Items (current, new batch) rendered after existing batches */}
              <div className="cart-items mb-1">
                {/* <h6>Order Items</h6> */}
                <>
                  {/* Batch Header display only if there any item added */}
                  {cartItems.length > 0 && (
                    <div className="batch-headers">
                      <small className="text-decoration-underline fst-italic">Batch #{batchCount + 1}</small>
                    </div>
                  )}

                  {/* Cart Items List */}
                  {cartItems.length > 0 && (
                    <>
                      {cartItems.map((item) => (
                        <div key={item.cartItemId} className="cart-item-row d-flex justify-content-between align-items-center">
                          <div className="item-info">
                            <div className="item-name">
                              {item.name}
                              {(() => {
                                const variantName = getVariantName(item && item.customizations);
                                const extra = formatVariantSelections(item && item.customizations);
                                if (variantName && extra) {
                                  return (
                                    <small className="text-muted ms-1">({variantName} • {extra})</small>
                                  );
                                }
                                if (variantName) {
                                  return <small className="text-muted ms-1">({variantName})</small>;
                                }
                                if (extra) {
                                  return <small className="text-muted ms-1">({extra})</small>;
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="item-controls d-flex align-items-center">
                            <button 
                              className="qty-btn"
                              onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*" 
                              maxLength={3}
                              className="qty-display form-control form-control-sm text-center rounded-0"
                              style={{ width: 40, height: 26 }} 
                              value={qtyDrafts[item.cartItemId] ?? item.quantity}
                              onChange={(e) => handleQtyInputChange(item.cartItemId, e.target.value)}
                              onBlur={() => commitQtyChange(item.cartItemId, item.quantity)}
                              onKeyDown={(e) => {
                                // Commit on Enter, revert on Escape
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setQtyDrafts((prev) => ({ ...prev, [item.cartItemId]: item.quantity }));
                                  e.currentTarget.blur();
                                }
                                e.stopPropagation();
                              }}
                            />
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

          {/* Show Saved Orders Button - Only show when there are saved orders but section is hidden and cart is empty */}
          {!showSavedOrders && savedOrders.length > 0 && cartItems.length === 0 && (
            <div className="text-center mt-3">
              <Button
                color="outline-primary"
                size="sm"
                onClick={() => setShowSavedOrders(true)} 
              >
                <FaClipboardList className="me-2" />
                View Saved Orders ({savedOrders.length})
              </Button>
            </div>
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
                
                <div className="total-display">
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatPrice(getTotal() + batchesTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

         

          
            {/* Action Buttons Grid */}
            <div className="action-buttons-grid">
              <div className="row g-2 mb-2 d-none">
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
                <div className="col-4">
                  <Button
                    color="outline-secondary"
                    size="sm"
                    onClick={handleReprintKOT}
                    disabled={isProcessing || batchCount === 0}
                    className="w-100 pos-action-btn"
                    title={batchCount === 0 ? 'No KOT batches yet' : 'Reprint last KOT'}
                  >
                    {isProcessing && processingAction === 'reprint-kot' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Reprinting...
                      </>
                    ) : (
                      <>
                        <FaRedo className="me-1" />
                        Reprint KOT
                      </>
                    )}
                  </Button>
                </div>
                <div className="col-4">
                  <Button
                    color="outline-primary"
                    size="sm"
                    onClick={handlePrintBill}
                    disabled={isProcessing || (batchCount === 0 && cartItems.length === 0)}
                    className="w-100 pos-action-btn"
                    title={(batchCount === 0 && cartItems.length === 0) ? 'No items to bill' : 'Print provisional bill'}
                  >
                    {isProcessing && processingAction === 'print-bill' ? (
                      <>
                        <Spinner size="sm" className="me-1" />
                        Printing...
                      </>
                    ) : (
                      <>
                        <FaPrint className="me-1" />
                        Print Bill
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
                      // Immediately save the instructions
                      updateCustomerInfo({ specialInstructions: newInstructions.slice(0, 500).trim() });
                      toast.success(`Added "${tag.label}" to instructions`);
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
          <Button color="secondary" onClick={() => {
            // Save any pending changes before closing
            const val = (notesDraft || '').slice(0, 500).trim();
            if (val !== (customerInfo?.specialInstructions || '')) {
              updateCustomerInfo({ specialInstructions: val });
            }
            setShowInstructionsModal(false);
          }}>
            Close
          </Button>
          <Button color="primary" onClick={() => {
            // Save any pending changes before closing
            const val = (notesDraft || '').slice(0, 500).trim();
            if (val !== (customerInfo?.specialInstructions || '')) {
              updateCustomerInfo({ specialInstructions: val });
            }
            setShowInstructionsModal(false);
          }}>
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

  {/* Split Bill Modal */}
      <Modal isOpen={showSplitModal} toggle={() => setShowSplitModal(false)} size="lg" centered scrollable>
        <ModalHeader toggle={() => setShowSplitModal(false)}>Split Bill</ModalHeader>
        <ModalBody>
          {/* Split controls */}
          <div className="d-flex align-items-center mb-3 gap-2">
            <Label className="mb-0">Number of people</Label>
            <Input
              type="number"
              min={2}
              max={8}
              value={splitCount}
              onChange={(e) => {
                const next = Math.min(8, Math.max(2, parseInt(e.target.value || '2', 10)));
                setSplitCount(next);
                setSplitEqualMode(false);
        const items = splitSourceItems.length ? splitSourceItems : cartItems;
        setSplitAllocations(computeEqualAllocations(items, next));
                setSplitSelectedIndex(0);
              }}
              style={{ width: 120 }}
            />
            <Button
              size="sm"
              color="secondary"
              outline
              onClick={() => {
        const items = splitSourceItems.length ? splitSourceItems : cartItems;
        setSplitAllocations(computeEqualAllocations(items, splitCount));
                setSplitEqualMode(true);
              }}
            >Split equally</Button>
          </div>

          {/* Allocation table */}
          <div className="table-responsive">
            <table className="table table-sm align-middle split-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-center qty-col">Qty</th>
                  {[...Array(splitCount)].map((_, i) => (
                    <th key={i} className="text-center payer-col">P{i+1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
        {(splitSourceItems.length ? splitSourceItems : cartItems).map((item) => {
                  const arr = splitAllocations[item.cartItemId] || new Array(splitCount).fill(0);
                  const totalQty = Math.max(1, Number(item.quantity)||1);
                  const sum = arr.reduce((a,b)=>a+(Number(b)||0),0);
                  return (
                    <tr key={item.cartItemId}>
                      <td>
                        <div className="fw-medium">{item.name}</div>
                        {item.customizations?.selectedVariant && (
                          <small className="text-muted">({item.customizations.selectedVariant})</small>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge color={sum===totalQty? 'success' : 'warning'}>{totalQty}</Badge>
                      </td>
                      {arr.map((val, idx) => (
                        <td key={idx} className="text-end">
                          <Input
                            type="number"
                            min={0}
                            max={totalQty}
                            value={val}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(totalQty, parseInt(e.target.value || '0', 10)));
                              setSplitEqualMode(false);
                              setSplitAllocations((prev) => {
                                const next = { ...prev };
                                const a = (next[item.cartItemId] || new Array(splitCount).fill(0)).slice();
                                a[idx] = v;
                                // ensure total equals original quantity by redistributing
                                let diff = totalQty - a.reduce((s,n)=>s+(Number(n)||0),0);
                                if (diff !== 0) {
                                  if (diff > 0) {
                                    for (let j=0; j<a.length && diff>0; j++) {
                                      if (j===idx) continue;
                                      a[j] += 1; diff -= 1; j = (j===a.length-1 && diff>0) ? -1 : j; // wrap
                                    }
                                  } else {
                                    diff = -diff;
                                    for (let j=0; j<a.length && diff>0; j++) {
                                      if (j===idx) continue;
                                      const take = Math.min(a[j], diff);
                                      a[j] -= take; diff -= take;
                                    }
                                    if (diff>0) {
                                      const take = Math.min(a[idx], diff);
                                      a[idx] -= take;
                                    }
                                  }
                                }
                                next[item.cartItemId] = a;
                                return next;
                              });
                            }}
                            style={{ width: 50, textAlign: 'right' }}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Per-payer totals */}
          <div className="mt-3">
            <h6 className="mb-2">Per Person Totals</h6>
            <div className="d-flex flex-wrap gap-2">
              {(() => {
                if (splitEqualMode) {
                  const src = splitSourceItems.length ? splitSourceItems : cartItems;
                  const grandTotal = src.reduce((s,it)=> s + (Number(it.price)||0)*(Number(it.quantity)||0), 0);
                  const cents = Math.round(grandTotal * 100);
                  const base = Math.floor(cents / splitCount);
                  const remainder = cents - base * splitCount;
                  const shares = Array.from({ length: splitCount }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
                  return shares.map((amt, i) => (
                    <Badge key={i} color="info" className="me-1">P{i+1}: {formatPrice(amt)}</Badge>
                  ));
                }
                const src = splitSourceItems.length ? splitSourceItems : cartItems;
                return [...Array(splitCount)].map((_, i) => {
                  const total = src.reduce((sum,item) => {
                    const arr = splitAllocations[item.cartItemId] || new Array(splitCount).fill(0);
                    const qty = Number(arr[i])||0;
                    return sum + qty * (Number(item.price)||0);
                  }, 0);
                  return (
                    <Badge key={i} color="info" className="me-1">P{i+1}: {formatPrice(total)}</Badge>
                  );
                });
              })()}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="me-auto d-flex align-items-center gap-2">
            <Label className="mb-0">Pay person</Label>
            <Input
              type="select"
              style={{ width: 120 }}
              value={splitSelectedIndex}
              onChange={(e)=> setSplitSelectedIndex(parseInt(e.target.value,10) || 0)}
            >
              {[...Array(splitCount)].map((_,i)=> (
                <option key={i} value={i}>P{i+1}</option>
              ))}
            </Input>
            <Button
              color="info"
              outline
              onClick={() => {
                // Validate each row sums to original qty
                const src = splitSourceItems.length ? splitSourceItems : cartItems;
                for (const item of src) {
                  const arr = splitAllocations[item.cartItemId] || [];
                  const totalQty = Math.max(1, Number(item.quantity)||1);
                  const sum = arr.reduce((a,b)=>a+(Number(b)||0),0);
                  if (sum !== totalQty) {
                    toast.error(`Allocation mismatch for ${item.name}`);
                    return;
                  }
                }
                // Ensure selected person has items
                const hasItems = (splitSourceItems.length ? splitSourceItems : cartItems).some(it => ((splitAllocations[it.cartItemId] || [])[splitSelectedIndex] || 0) > 0);
                if (!hasItems) {
                  toast.error('Selected person has no items assigned');
                  return;
                }
                // Start single payment flow
                setShowSplitModal(false);
                setSplitSingleMode(true);
                setSplitPayerIndex(splitSelectedIndex);
                if (!billingSplitMode) {
                  const slice = cartItems
                    .map((it)=> ({ ...it, quantity: (splitAllocations[it.cartItemId] || [])[splitSelectedIndex] || 0 }))
                    .filter(it=>it.quantity>0);
                  setCurrentSplitCart(slice);
                } else {
                  setCurrentSplitCart([]);
                }
              }}
            >Pay Selected</Button>
          </div>
          <Button color="secondary" onClick={() => setShowSplitModal(false)}>Close</Button>
          <Button
            color="primary"
            onClick={() => {
              // Validate each row sums to original qty
              const src = splitSourceItems.length ? splitSourceItems : cartItems;
              for (const item of src) {
                const arr = splitAllocations[item.cartItemId] || [];
                const totalQty = Math.max(1, Number(item.quantity)||1);
                const sum = arr.reduce((a,b)=>a+(Number(b)||0),0);
                if (sum !== totalQty) {
                  toast.error(`Allocation mismatch for ${item.name}`);
                  return;
                }
              }
              // start sequential payments, payer 0
              setShowSplitModal(false);
              setSplitPayerIndex(0);
              setSplitSingleMode(false);
              if (!billingSplitMode) {
                const slice = cartItems.map((it)=>({
                  ...it,
                  quantity: (splitAllocations[it.cartItemId] || [])[0] || 0
                })).filter(it=>it.quantity>0);
                setCurrentSplitCart(slice);
              } else {
                setCurrentSplitCart([]);
              }
            }}
          >Proceed to Payment</Button>
        </ModalFooter>
      </Modal>

      {/* Split Payment Modal (reusing PaymentModal) */}
      {splitPayerIndex !== null && (
        <PaymentModal
          isOpen={true}
          toggle={() => {
            // cancel split flow
            setSplitPayerIndex(null);
            setCurrentSplitCart([]);
          }}
          cartItems={currentSplitCart}
          customerInfo={customerInfo}
          selectedTable={selectedTable}
          orderTotal={billingSplitMode ? personTotal((splitSourceItems.length?splitSourceItems:cartItems), splitAllocations, splitPayerIndex) : currentSplitCart.reduce((s,i)=>s + (Number(i.price)||0)*(Number(i.quantity)||0), 0)}
          isPartialSettlement={billingSplitMode}
          partialAmount={billingSplitMode ? personTotal((splitSourceItems.length?splitSourceItems:cartItems), splitAllocations, splitPayerIndex) : 0}
          disableTableSettlement={true}
          suppressPostActions={true}
          onProcessed={(result) => {
            // subtract this payer's quantities from the main cart so remaining items stay
            const payerIdx = splitPayerIndex;
            if (!billingSplitMode) {
              const nextItems = [];
              for (const it of cartItems) {
                const paid = (splitAllocations[it.cartItemId] || [])[payerIdx] || 0;
                const newQty = Math.max(0, (Number(it.quantity)||0) - paid);
                if (newQty > 0) nextItems.push({ ...it, quantity: newQty });
              }
              replaceCart(nextItems, { ...customerInfo });
            } else {
              const amount = result?.amount ?? personTotal((splitSourceItems.length?splitSourceItems:cartItems), splitAllocations, payerIdx);
              setBillingPaidCents((c) => c + Math.round((amount||0)*100));
            }

            if (splitSingleMode) {
              // stop after single payment
              setSplitPayerIndex(null);
              setCurrentSplitCart([]);
              if (!billingSplitMode) {
                toast.success('Split paid. Remaining items kept in cart');
              } else {
                const totalCents = Math.round((batchesTotal || 0) * 100);
                if (billingPaidCents + Math.round((result?.amount||0)*100) >= totalCents) {
                  // fully paid, settle
                  settleExistingBatchesLocal(result?.method || 'cash');
                } else {
                  const remaining = (totalCents - (billingPaidCents + Math.round((result?.amount||0)*100)))/100;
                  toast.success(`Collected. Remaining: ${formatPrice(remaining)}`);
                }
              }
              return;
            }
            // advance to next payer (sequential all)
            const nextIdx = payerIdx + 1;
            if (nextIdx >= splitCount) {
              // finished all
              setSplitPayerIndex(null);
              setCurrentSplitCart([]);
              if (!billingSplitMode) {
                toast.success('All splits paid');
                // cart already reduced progressively; ensure empty if all covered
              } else {
                const totalCents = Math.round((batchesTotal || 0) * 100);
                const collected = billingPaidCents + Math.round((result?.amount||0)*100);
                if (collected >= totalCents) {
                  settleExistingBatchesLocal(result?.method || 'cash');
                } else {
                  const remaining = (totalCents - collected)/100;
                  toast.success(`Collected. Remaining: ${formatPrice(remaining)}`);
                }
              }
              return;
            }
            setSplitPayerIndex(nextIdx);
            if (!billingSplitMode) {
              const slice = cartItems.map((it)=>({
                ...it,
                quantity: (splitAllocations[it.cartItemId] || [])[nextIdx] || 0
              })).filter(it=>it.quantity>0);
              setCurrentSplitCart(slice);
            } else {
              setCurrentSplitCart([]);
            }
          }}
        />
      )}
    </>
  );
};

export default CartSidebar;
