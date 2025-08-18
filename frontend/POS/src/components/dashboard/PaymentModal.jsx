import React, { useState, useEffect } from 'react';
import { 
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
  Badge,
  Card,
  CardBody
} from 'reactstrap';
import { 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaMobile,
  FaReceipt,
  FaPrint,
  FaCheck,
  FaTimes,
  FaCalculator,
  FaEye,
  FaTable,
  FaUser,
  FaUtensils
} from 'react-icons/fa';
import axios from 'axios';
import { useOrder } from '../../context/OrderContext';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useSocket } from '../../context/SocketContext';
import { useCurrency } from '../../context/CurrencyContext';
import ReceiptPreview from '../receipt/ReceiptPreview';
import { generateHTMLReceipt, printHTMLReceipt, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';
import toast from 'react-hot-toast';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

const PaymentModal = ({ isOpen, toggle, cartItems, customerInfo, selectedTable, orderTotal }) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amountReceived: '',
    cardNumber: '',
    cardHolder: '',
    upiId: '',
    transactionId: ''
  });
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSettling, setIsSettling] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [printerConfig, setPrinterConfig] = useState(() => {
    const saved = localStorage.getItem('pos_printer_config');
    return saved ? JSON.parse(saved) : { printerType: 'browser' };
  });

  const { createOrder, updatePaymentStatus } = useOrder();
  const { clearCart, replaceCart, updateCustomerInfo } = useCart();
  const { updateTableStatus, clearSelectedTable } = usePOS();
  const { emitNewOrder } = useSocket();
  const { formatCurrency: formatCurrencyDynamic, getCurrencySymbol, isReady: currencyReady } = useCurrency();

  // Get batches for settlement
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
  const totalAmount = orderTotal + batchesTotal;

  // Payment method options
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: FaMoneyBillWave, color: 'success' },
    { id: 'card', label: 'Card', icon: FaCreditCard, color: 'primary' },
    { id: 'upi', label: 'UPI', icon: FaMobile, color: 'info' }
  ];

  // Quick tender buttons for cash payments
  const tenderButtons = [100, 200, 500];

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

  const parseReceived = () => parseFloat(paymentData.amountReceived) || 0;
  const calculateChange = () => Math.max(0, parseReceived() - totalAmount);
  const remainingBalance = () => Math.max(0, totalAmount - parseReceived());

  const handlePaymentMethodChange = (method) => {
    setSelectedPaymentMethod(method);
    setPaymentData(prev => ({ ...prev, method }));
    setErrors({});
    
    // Set default amount for non-cash payments
    if (method !== 'cash') {
      setPaymentData(prev => ({ ...prev, amountReceived: totalAmount.toString() }));
    }
  };

  const handleQuickAmount = (amount) => {
    // Set absolute amount (used for Exact)
    setPaymentData(prev => ({ ...prev, amountReceived: amount.toString() }));
    setErrors(prev => ({ ...prev, amountReceived: null }));
  };

  const handleAddAmount = (delta) => {
    const current = parseReceived();
    const next = current + delta;
    setPaymentData(prev => ({ ...prev, amountReceived: next.toString() }));
    setErrors(prev => ({ ...prev, amountReceived: null }));
  };

  // Helpers to normalize phone and resolve/create customer
  const normalizePhone = (phone) => (phone || '').replace(/\D/g, '');

  const findOrCreateCustomer = async () => {
    try {
      const name = (customerInfo?.name || '').trim();
      const phoneRaw = customerInfo?.phone || '';
      const phone = normalizePhone(phoneRaw);

      // If we already have a selected customerId, return it
      if (customerInfo?.customerId) {
        return customerInfo.customerId;
      }

      // If no phone/name provided, skip
      if (!phone && !name) return null;

      // Prefer search by phone if present
      if (phone) {
        const resp = await axios.get(`${API_BASE_URL}/customers`, { params: { search: phone } });
        const list = Array.isArray(resp.data) ? resp.data : [];
        // Try exact phone match first (normalize comparison)
        const exact = list.find(c => normalizePhone(c.phone) === phone);
        if (exact && exact._id) {
          updateCustomerInfo({ customerId: exact._id, name: exact.name || name, phone: exact.phone || phone });
          return exact._id;
        }
      }

      // Fallback: search by name if provided
      if (!phone && name) {
        const resp = await axios.get(`${API_BASE_URL}/customers`, { params: { search: name } });
        const list = Array.isArray(resp.data) ? resp.data : [];
        const byName = list.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
        if (byName && byName._id) {
          updateCustomerInfo({ customerId: byName._id, name: byName.name, phone: byName.phone || '' });
          return byName._id;
        }
      }

      // Create new customer if we have at least a phone or name
      const payload = { name: name || 'Walk-in', phone };
      const createResp = await axios.post(`${API_BASE_URL}/customers`, payload);
      const created = createResp.data || {};
      if (created && created._id) {
        updateCustomerInfo({ customerId: created._id, name: created.name || name, phone: created.phone || phone });
        return created._id;
      }

      return null;
    } catch (err) {
      console.warn('Customer resolve/create failed:', err?.response?.data || err?.message);
      return null;
    }
  };

  const validatePayment = () => {
    const newErrors = {};
    
    switch (paymentData.method) {
      case 'cash':
        const received = parseFloat(paymentData.amountReceived);
        if (paymentData.amountReceived === '' || paymentData.amountReceived === null || isNaN(received) || received < 0) {
          newErrors.amountReceived = 'Enter a valid amount';
        }
        break;
      case 'card':
        if (!paymentData.cardNumber?.trim()) {
          newErrors.cardNumber = 'Card number is required';
        }
        if (!paymentData.cardHolder?.trim()) {
          newErrors.cardHolder = 'Card holder name is required';
        }
        break;
      case 'upi':
        if (!paymentData.upiId?.trim()) {
          newErrors.upiId = 'UPI ID is required';
        }
        if (!paymentData.transactionId?.trim()) {
          newErrors.transactionId = 'Transaction ID is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProcessPayment = async () => {
    if (!validatePayment()) return;

    setLoading(true);
    setIsSettling(batchCount > 0);
    setGeneralError('');
    
    try {
      let orderData = null;
      // Ensure customer is resolved/created before creating order
      let resolvedCustomerId = null;
      try {
        resolvedCustomerId = await findOrCreateCustomer();
      } catch (_) {}
      
      // If there are current cart items, create a new order
      if (cartItems && cartItems.length > 0) {
        orderData = {
          tableId: selectedTable?._id,
          tableName: selectedTable?.name || selectedTable?.TableName,
          orderType: customerInfo?.orderType || 'dine-in',
          customer: {
            name: customerInfo?.name || '',
            phone: customerInfo?.phone || '',
            customerId: resolvedCustomerId || customerInfo?.customerId || null
          },
          specialInstructions: customerInfo?.specialInstructions || '',
          items: cartItems.map(item => ({
            menuItemId: item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            customizations: item.customizations || {},
            subtotal: item.price * item.quantity
          })),
          customerInfo: {
            name: customerInfo?.name || 'Walk-in',
            phone: customerInfo?.phone || '',
            orderType: customerInfo?.orderType || 'dine-in',
            deliveryAddress: customerInfo?.deliveryAddress || '',
            customerId: resolvedCustomerId || customerInfo?.customerId || null
          },
          customerId: resolvedCustomerId || customerInfo?.customerId || null,
          totalAmount: orderTotal,
          paymentMethod: paymentData.method,
          paymentStatus: 'paid'
        };
        
        const result = await createOrder(orderData);
        if (!result.success) {
          throw new Error(result.error || 'Failed to create order');
        }
        
        orderData = result.order;
        
        // Update table status for dine-in orders
        if (selectedTable?._id && (customerInfo?.orderType || 'dine-in') === 'dine-in') {
          try {
            await updateTableStatus(selectedTable._id, 'occupied', orderData);
          } catch (e) {
            console.warn('Failed to set table occupied:', e);
          }
        }
        
        // Record batch for this table
        const tableId = selectedTable?._id || 'no-table';
        const batchesKey = 'pos_table_batches';
        const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
        const entry = batchesAll[tableId] || { nextOrderNumber: 1, batches: [] };
        const orderNumber = entry.nextOrderNumber;
        entry.batches = [
          {
            orderId: orderData._id,
            orderNumber,
            items: orderData.items,
            totalAmount: orderData.totalAmount,
            createdAt: new Date().toISOString()
          },
          ...entry.batches
        ];
        entry.nextOrderNumber = orderNumber + 1;
        batchesAll[tableId] = entry;
        localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
        
        // Clear current cart
        clearCart();
        
        // Emit socket event
        if (emitNewOrder) {
          emitNewOrder(orderData);
        }
      }
      
      // Handle table settlement if there are existing batches
      if (batchCount > 0) {
        const method = paymentData.method;
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
          throw new Error(`Settlement failed: ${msg} (${failures.length}/${ordersToPay.length} failed)`);
        }
        
        // Clear table batches from localStorage
        const tableId = selectedTable._id;
        const batchesKey = 'pos_table_batches';
        const batchesAll = JSON.parse(localStorage.getItem(batchesKey) || '{}');
        delete batchesAll[tableId];
        localStorage.setItem(batchesKey, JSON.stringify(batchesAll));
        
        // Clear table carts
        try {
          const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
          delete carts[selectedTable._id];
          localStorage.setItem('pos_table_carts', JSON.stringify(carts));
        } catch {}
        
        // Free the table
        try {
          await updateTableStatus(selectedTable._id, 'available');
        } catch (e) {
          console.warn('Failed to free table:', e);
        }
        
        // Reset cart UI
        replaceCart([], { orderType: 'dine-in' });
        
        toast.success(`Table settled! ${ordersToPay.length} orders marked as paid.`);
      } else {
        toast.success('Payment processed successfully!');
      }
      
      // Close modal and go back to Table Selection
      try { clearSelectedTable && clearSelectedTable(); } catch {}
      handleClose();
      // Notify dashboard to switch to Tables tab
      try { window.dispatchEvent(new Event('pos:navigateToTables')); } catch {}
      
    } catch (error) {
      console.error('Payment processing error:', error);
      const msg = error.message || 'Failed to process payment';
      setGeneralError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setIsSettling(false);
    }
  };

  const handlePrintReceipt = async (printType = 'auto') => {
    if (!orderCreated) {
      toast.error('No order available for printing');
      return;
    }

    try {
      // Prepare order data for receipt
      const orderData = {
        order: orderCreated,
        paymentDetails: {
          method: paymentData.method,
          amountReceived: paymentData.method === 'cash' ? parseFloat(paymentData.amountReceived) : orderTotal,
          change: paymentData.method === 'cash' ? calculateChange() : 0,
          cardNumber: paymentData.method === 'card' ? paymentData.cardNumber : null,
          cardHolder: paymentData.method === 'card' ? paymentData.cardHolder : null,
          upiId: paymentData.method === 'upi' ? paymentData.upiId : null,
          transactionId: paymentData.method === 'upi' ? paymentData.transactionId : null
        },
        customerInfo,
        tableInfo: selectedTable
      };

      const restaurantInfo = {
        name: 'OrderEase Restaurant',
        address: '123 Main Street, City, State 12345',
        phone: '+91 98765 43210',
        email: 'info@orderease.com',
        gst: 'GST123456789'
      };

      let result;
      if (printType === 'thermal' || (printType === 'auto' && printerConfig.printerType === 'network')) {
        // Print to thermal printer
        const thermalReceipt = generateThermalReceipt(orderData, restaurantInfo);
        result = await printThermalReceipt(thermalReceipt, printerConfig);
      } else {
        // Print using browser
        const htmlReceipt = generateHTMLReceipt(orderData, restaurantInfo);
        result = printHTMLReceipt(htmlReceipt);
      }

      if (result.success) {
        toast.success(result.message);
        
        // Auto-open cash drawer if configured
        if (printerConfig.autoOpenDrawer && paymentData.method === 'cash') {
          toast.info('Cash drawer opened');
        }
      } else {
        toast.error(result.error || 'Failed to print receipt');
      }
    } catch (error) {
      console.error('Print receipt error:', error);
      toast.error('Failed to print receipt: ' + error.message);
    }
  };

  const handleShowReceiptPreview = () => {
    if (!orderCreated) {
      toast.error('No order available for preview');
      return;
    }
    setShowReceiptPreview(true);
  };

  const handleClose = () => {
    if (loading) {
      toast.warning('Please wait for the current operation to complete');
      return;
    }
    
    // Reset modal state
    setOrderCreated(null);
    setSelectedPaymentMethod('cash');
    setPaymentData({
      method: 'cash',
      amountReceived: '',
      cardNumber: '',
      cardHolder: '',
      upiId: '',
      transactionId: ''
    });
    setErrors({});
    setIsSettling(false);
    toggle();
  };

  // Set default amount when modal opens
  useEffect(() => {
    if (isOpen && selectedPaymentMethod === 'cash') {
      setPaymentData(prev => ({ ...prev, amountReceived: totalAmount.toString() }));
    }
  }, [isOpen, totalAmount, selectedPaymentMethod]);

  // No receipt preview modal rendering; flow will close and navigate after settlement
  
  // Main payment modal
  return (
    <>
    <Modal
      isOpen={isOpen}
      toggle={handleClose}
      size="md"
      centered
      scrollable
      backdrop="static"
      keyboard={false}
      unmountOnClose
    >
      <ModalHeader toggle={!loading ? handleClose : undefined} className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <FaCreditCard className="me-2" />
          {isSettling ? 'Settle Table Payment' : 'Process Payment'}
          {batchCount > 0 && (
            <Badge color="warning" className="ms-2">
              {batchCount} batch{batchCount > 1 ? 'es' : ''} + current order
            </Badge>
          )}
        </div>
      </ModalHeader>
      
      <ModalBody className="p-0">
        {/* Inline status & error indicators */}
        {loading && (
          <Alert color="info" className="rounded-0 d-flex align-items-center m-0 py-2">
            <Spinner size="sm" className="me-2" />
            {isSettling ? 'Settling table, please wait...' : 'Processing payment...'}
          </Alert>
        )}
        {!!generalError && !loading && (
          <Alert color="danger" className="rounded-0 m-0 py-2">
            {generalError}
          </Alert>
        )}
        {/* Order Summary Card */}
        <Card className="border-0 border-bottom">
          <CardBody className="bg-light py-3">
            <div className="row">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-2">
                  <FaTable className="text-primary me-2" />
                  <span><strong>Table:</strong> {selectedTable?.name || selectedTable?.TableName || 'N/A'}</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <FaUser className="text-primary me-2" />
                  <span><strong>Customer:</strong> {customerInfo?.name || 'Walk-in'}</span>
                </div>
                <div className="d-flex align-items-center">
                  <FaUtensils className="text-primary me-2" />
                  <span><strong>Type:</strong> {customerInfo?.orderType || 'dine-in'}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="text-end">
                  {cartItems && cartItems.length > 0 && (
                    <div className="mb-1">
                      <small className="text-muted">Current Order:</small>
                      <div className="fw-bold">{formatPrice(orderTotal)}</div>
                    </div>
                  )}
                  {batchCount > 0 && (
                    <div className="mb-1">
                      <small className="text-muted">Existing Batches:</small>
                      <div className="fw-bold">{formatPrice(batchesTotal)}</div>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="fs-4 fw-bold text-primary">
                    <small className="text-muted d-block fs-6">Total Amount:</small>
                    {formatPrice(totalAmount)}
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Payment Method Selection */}
        <div className="p-3">
          <h6 className="mb-3">Select Payment Method</h6>
          <div className="row g-3 mb-4">
            {paymentMethods.map(method => (
              <div key={method.id} className="col-4">
                <Button
                  color={selectedPaymentMethod === method.id ? method.color : 'outline-secondary'}
                  className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-2"
                  onClick={() => handlePaymentMethodChange(method.id)}
                  disabled={loading}
                >
                  <method.icon size={20} className="mb-1" />
                  <span>{method.label}</span>
                </Button>
              </div>
            ))}
          </div>
          
          {/* Payment Details Form */}
          <Card className="border">
            <CardBody className="py-3">
              {selectedPaymentMethod === 'cash' && (
                <>
                  <FormGroup>
                    <Label>Amount Received <span className="text-danger">*</span></Label>
                    <Input
                      type="number"
                      placeholder="Enter amount received"
                      value={paymentData.amountReceived}
                      onChange={(e) => {
                        setPaymentData(prev => ({ ...prev, amountReceived: e.target.value }));
                        setErrors(prev => ({ ...prev, amountReceived: null }));
                      }}
                      invalid={!!errors.amountReceived}
                      disabled={loading}
                      step="0.01"
                      min="0"
                      aria-label="Amount received"
                    />
                    {errors.amountReceived && (
                      <div className="invalid-feedback d-block">{errors.amountReceived}</div>
                    )}
                  </FormGroup>

                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Quick Tender</small>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="secondary"
                        outline
                        onClick={() => handleQuickAmount(totalAmount)}
                        disabled={loading}
                      >
                        {`Exact (${formatPrice(totalAmount)})`}
                      </Button>
                      {tenderButtons.map((amt) => (
                        <Button
                          key={amt}
                          size="sm"
                          color="secondary"
                          outline
                          onClick={() => handleAddAmount(amt)}
                          disabled={loading}
                        >
                          {formatPrice(amt)}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        color="light"
                        onClick={() => handleQuickAmount(0)}
                        disabled={loading}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  {/* Change Calculation */}
                  {paymentData.amountReceived && parseReceived() < totalAmount && (
                    <Alert color="warning" className="d-flex justify-content-between align-items-center">
                      <span><FaCalculator className="me-2" />Remaining Balance:</span>
                      <strong className="fs-6">{formatPrice(remainingBalance())}</strong>
                    </Alert>
                  )}
                  {paymentData.amountReceived && parseReceived() > totalAmount && (
                    <Alert color="info" className="d-flex justify-content-between align-items-center">
                      <span><FaCalculator className="me-2" />Change to Return:</span>
                      <strong className="fs-6">{formatPrice(calculateChange())}</strong>
                    </Alert>
                  )}
                </>
              )}

              {selectedPaymentMethod === 'card' && (
                <>
                  <FormGroup>
                    <Label>Card Number <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Enter card number"
                      value={paymentData.cardNumber}
                      onChange={(e) => {
                        setPaymentData(prev => ({ ...prev, cardNumber: e.target.value }));
                        setErrors(prev => ({ ...prev, cardNumber: null }));
                      }}
                      invalid={!!errors.cardNumber}
                      disabled={loading}
                      aria-label="Card number"
                    />
                    {errors.cardNumber && (
                      <div className="invalid-feedback d-block">{errors.cardNumber}</div>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label>Card Holder <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Enter card holder name"
                      value={paymentData.cardHolder}
                      onChange={(e) => {
                        setPaymentData(prev => ({ ...prev, cardHolder: e.target.value }));
                        setErrors(prev => ({ ...prev, cardHolder: null }));
                      }}
                      invalid={!!errors.cardHolder}
                      disabled={loading}
                      aria-label="Card holder name"
                    />
                    {errors.cardHolder && (
                      <div className="invalid-feedback d-block">{errors.cardHolder}</div>
                    )}
                  </FormGroup>
                  <Alert color="success" className="py-2">
                    <strong>Amount:</strong> {formatPrice(totalAmount)}
                  </Alert>
                </>
              )}

              {selectedPaymentMethod === 'upi' && (
                <>
                  <FormGroup>
                    <Label>UPI ID <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      placeholder="customer@upi"
                      value={paymentData.upiId}
                      onChange={(e) => {
                        setPaymentData(prev => ({ ...prev, upiId: e.target.value }));
                        setErrors(prev => ({ ...prev, upiId: null }));
                      }}
                      invalid={!!errors.upiId}
                      disabled={loading}
                      aria-label="UPI ID"
                    />
                    {errors.upiId && (
                      <div className="invalid-feedback d-block">{errors.upiId}</div>
                    )}
                  </FormGroup>
                  <FormGroup>
                    <Label>Transaction ID <span className="text-danger">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Enter transaction reference"
                      value={paymentData.transactionId}
                      onChange={(e) => {
                        setPaymentData(prev => ({ ...prev, transactionId: e.target.value }));
                        setErrors(prev => ({ ...prev, transactionId: null }));
                      }}
                      invalid={!!errors.transactionId}
                      disabled={loading}
                      aria-label="Transaction ID"
                    />
                    {errors.transactionId && (
                      <div className="invalid-feedback d-block">{errors.transactionId}</div>
                    )}
                  </FormGroup>
                  <Alert color="success" className="py-2">
                    <strong>Amount:</strong> {formatPrice(totalAmount)}
                  </Alert>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </ModalBody>
      
      <ModalFooter className="bg-light">
        <div className="d-flex justify-content-between w-100 align-items-center">
          <div>
            <Button color="secondary" onClick={handleClose} disabled={loading}>
              <FaTimes className="me-2" />
              Cancel
            </Button>
          </div>
          
          <div className="d-flex gap-2">
            {orderCreated && (
              <>
                <Button 
                  color="info" 
                  onClick={() => setShowReceiptPreview(true)}
                  disabled={loading}
                >
                  <FaEye className="me-1" />
                  Preview Receipt
                </Button>
                <Button 
                  color="primary" 
                  onClick={() => handlePrintReceipt('auto')}
                  disabled={loading}
                >
                  <FaPrint className="me-1" />
                  Print Receipt
                </Button>
              </>
            )}
            
            {!orderCreated && (
              <Button 
                color="success" 
                size="md"
                onClick={handleProcessPayment}
                disabled={loading || (selectedPaymentMethod === 'cash' && parseReceived() < totalAmount)}
                className="px-4"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    {isSettling ? 'Settling Table...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <FaCheck className="me-2" />
                    {isSettling ? `Settle Table - ${formatPrice(totalAmount)}` : `Settle - ${formatPrice(totalAmount)}`}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
    </>
  );
};

export default PaymentModal;
