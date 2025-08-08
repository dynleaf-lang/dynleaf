import React, { useState } from 'react';
import { 
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner,
  Badge,
  ListGroup,
  ListGroupItem
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
  FaEye
} from 'react-icons/fa';
import { useOrder } from '../../context/OrderContext';
import { useCart } from '../../context/CartContext';
import { usePOS } from '../../context/POSContext';
import { useSocket } from '../../context/SocketContext';
import { useCurrency } from '../../context/CurrencyContext';
import ReceiptPreview from '../receipt/ReceiptPreview';
import { generateHTMLReceipt, printHTMLReceipt, printThermalReceipt, generateThermalReceipt } from '../../utils/thermalPrinter';
import toast from 'react-hot-toast';

const PaymentModal = ({ isOpen, toggle, cartItems, customerInfo, selectedTable, orderTotal }) => {
  const [activeTab, setActiveTab] = useState('cash');
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    amountReceived: '',
    cardNumber: '',
    cardHolder: '',
    upiId: '',
    transactionId: '',
    splitPayments: []
  });
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [printerConfig, setPrinterConfig] = useState(() => {
    const saved = localStorage.getItem('pos_printer_config');
    return saved ? JSON.parse(saved) : { printerType: 'browser' };
  });

  const { createOrder } = useOrder();
  const { clearCart } = useCart();
  const { updateTableStatus } = usePOS();
  const { emitNewOrder } = useSocket();
  const { formatCurrency: formatCurrencyDynamic, getCurrencySymbol, isReady: currencyReady } = useCurrency();

  const formatPrice = (price) => {
    // Use dynamic currency formatting based on branch country
    if (currencyReady && formatCurrencyDynamic) {
      return formatCurrencyDynamic(price, { minimumFractionDigits: 0 });
    }
    // Fallback to USD if currency context not ready
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const calculateChange = () => {
    const received = parseFloat(paymentData.amountReceived) || 0;
    return Math.max(0, received - orderTotal);
  };

  const handlePaymentMethodChange = (method) => {
    setActiveTab(method);
    setPaymentData(prev => ({ ...prev, method }));
  };

  const validatePayment = () => {
    switch (paymentData.method) {
      case 'cash':
        const received = parseFloat(paymentData.amountReceived) || 0;
        if (received < orderTotal) {
          toast.error('Amount received cannot be less than order total');
          return false;
        }
        break;
      case 'card':
        if (!paymentData.cardNumber || !paymentData.cardHolder) {
          toast.error('Please enter card details');
          return false;
        }
        break;
      case 'upi':
        if (!paymentData.upiId || !paymentData.transactionId) {
          toast.error('Please enter UPI details');
          return false;
        }
        break;
    }
    return true;
  };

  const handleProcessPayment = async () => {
    if (!validatePayment()) return;

    setLoading(true);
    try {
      // Prepare order data
      const orderData = {
        tableId: selectedTable._id,
        tableName: selectedTable.name,
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          customizations: item.customizations,
          subtotal: item.price * item.quantity
        })),
        customerInfo: {
          name: customerInfo.name || 'Walk-in Customer',
          phone: customerInfo.phone || '',
          orderType: customerInfo.orderType || 'dine-in'
        },
        specialInstructions: customerInfo.specialInstructions || '',
        subtotal: orderTotal - (orderTotal * 0.1),
        tax: orderTotal * 0.1,
        totalAmount: orderTotal,
        paymentMethod: paymentData.method,
        paymentStatus: 'paid',
        paymentDetails: {
          method: paymentData.method,
          amountReceived: paymentData.method === 'cash' ? parseFloat(paymentData.amountReceived) : orderTotal,
          change: paymentData.method === 'cash' ? calculateChange() : 0,
          cardNumber: paymentData.method === 'card' ? `****${paymentData.cardNumber.slice(-4)}` : null,
          cardHolder: paymentData.method === 'card' ? paymentData.cardHolder : null,
          upiId: paymentData.method === 'upi' ? paymentData.upiId : null,
          transactionId: paymentData.method === 'upi' ? paymentData.transactionId : null
        }
      };

      // Create order
      const result = await createOrder(orderData);
      
      if (result.success) {
        // Update table status to occupied
        await updateTableStatus(selectedTable._id, 'occupied', result.order);
        
        // Clear cart
        clearCart();
        
        // Set order created for receipt
        setOrderCreated(result.order);
        setShowReceipt(true);
        
        toast.success('Order created and payment processed successfully!');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
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
    if (orderCreated) {
      // Reset modal state
      setOrderCreated(null);
      setShowReceipt(false);
      setPaymentData({
        method: 'cash',
        amountReceived: '',
        cardNumber: '',
        cardHolder: '',
        upiId: '',
        transactionId: '',
        splitPayments: []
      });
    }
    toggle();
  };

  if (showReceipt && orderCreated) {
    return (
      <Modal isOpen={isOpen} toggle={handleClose} size="lg">
        <ModalHeader toggle={handleClose}>
          <FaReceipt className="me-2 text-success" />
          Order Confirmation
        </ModalHeader>
        <ModalBody>
          <div className="receipt-content" id="receipt-print">
            <div className="text-center mb-4">
              <h4>Order Receipt</h4>
              <p className="text-muted">Order #{orderCreated.orderNumber}</p>
              <p className="text-muted">{new Date(orderCreated.createdAt).toLocaleString()}</p>
            </div>

            <div className="order-details mb-4">
              <div className="row">
                <div className="col-md-6">
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {orderCreated.customerInfo?.name || 'N/A'}</p>
                  <p><strong>Phone:</strong> {orderCreated.customerInfo?.phone || 'N/A'}</p>
                  <p><strong>Type:</strong> {orderCreated.customerInfo?.orderType || orderCreated.orderType || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <h6>Table Information</h6>
                  <p><strong>Table:</strong> {orderCreated.tableName}</p>
                  <p><strong>Status:</strong> <Badge color="success">Confirmed</Badge></p>
                </div>
              </div>
            </div>

            <div className="order-items mb-4">
              <h6>Order Items</h6>
              <ListGroup flush>
                {orderCreated.items.map((item, index) => (
                  <ListGroupItem key={index} className="d-flex justify-content-between">
                    <div>
                      <strong>{item.name}</strong>
                      <div className="text-muted small">
                        {item.quantity} × {formatPrice(item.price)}
                        {item.customizations?.spiceLevel && (
                          <Badge color="warning" size="sm" className="ms-2">
                            {item.customizations.spiceLevel} spice
                          </Badge>
                        )}
                      </div>
                      {item.customizations?.specialInstructions && (
                        <div className="text-info small">
                          Note: {item.customizations.specialInstructions}
                        </div>
                      )}
                    </div>
                    <strong>{formatPrice(item.subtotal)}</strong>
                  </ListGroupItem>
                ))}
              </ListGroup>
            </div>

            <div className="order-summary mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatPrice(orderCreated.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>{formatPrice(orderCreated.tax)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total:</span>
                <span className="text-primary">{formatPrice(orderCreated.totalAmount)}</span>
              </div>
            </div>

            <div className="payment-details mb-4">
              <h6>Payment Details</h6>
              <p><strong>Method:</strong> {orderCreated.paymentMethod.toUpperCase()}</p>
              <p><strong>Status:</strong> <Badge color="success">PAID</Badge></p>
              {orderCreated.paymentDetails?.amountReceived && (
                <p><strong>Amount Received:</strong> {formatPrice(orderCreated.paymentDetails.amountReceived)}</p>
              )}
              {orderCreated.paymentDetails?.change > 0 && (
                <p><strong>Change:</strong> {formatPrice(orderCreated.paymentDetails.change)}</p>
              )}
            </div>

            {orderCreated.specialInstructions && (
              <div className="special-instructions mb-4">
                <h6>Special Instructions</h6>
                <p className="text-info">{orderCreated.specialInstructions}</p>
              </div>
            )}

            <div className="text-center">
              <p className="text-muted">Thank you for your order!</p>
              <p className="text-muted small">Please keep this receipt for your records</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={handlePrintReceipt}>
            <FaPrint className="me-2" />
            Print Receipt
          </Button>
          <Button color="success" onClick={handleClose}>
            <FaCheck className="me-2" />
            Complete Order
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <>
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>
        <FaCreditCard className="me-2" />
        Process Payment - {formatPrice(orderTotal)}
      </ModalHeader>
      <ModalBody>
        {/* Payment Method Tabs */}
        <Nav tabs className="mb-4">
          <NavItem>
            <NavLink
              className={activeTab === 'cash' ? 'active' : ''}
              onClick={() => handlePaymentMethodChange('cash')}
              style={{ cursor: 'pointer' }}
            >
              <FaMoneyBillWave className="me-2" />
              Cash
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'card' ? 'active' : ''}
              onClick={() => handlePaymentMethodChange('card')}
              style={{ cursor: 'pointer' }}
            >
              <FaCreditCard className="me-2" />
              Card
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={activeTab === 'upi' ? 'active' : ''}
              onClick={() => handlePaymentMethodChange('upi')}
              style={{ cursor: 'pointer' }}
            >
              <FaMobile className="me-2" />
              UPI
            </NavLink>
          </NavItem>
        </Nav>

        <TabContent activeTab={activeTab}>
          {/* Cash Payment */}
          <TabPane tabId="cash">
            <Form>
              <FormGroup>
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  placeholder="Enter amount received"
                  value={paymentData.amountReceived}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    amountReceived: e.target.value
                  }))}
                  step="0.01"
                  min={orderTotal}
                />
              </FormGroup>
              
              {paymentData.amountReceived && (
                <Alert color={calculateChange() >= 0 ? 'success' : 'danger'} fade={false}>
                  <div className="d-flex justify-content-between">
                    <span>Order Total:</span>
                    <strong>{formatPrice(orderTotal)}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Amount Received:</span>
                    <strong>{formatPrice(parseFloat(paymentData.amountReceived) || 0)}</strong>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <span>Change:</span>
                    <strong className={calculateChange() >= 0 ? 'text-success' : 'text-danger'}>
                      {formatPrice(calculateChange())}
                    </strong>
                  </div>
                </Alert>
              )}

              <div className="quick-amounts mt-3">
                <Label>Quick Amounts</Label>
                <div className="d-flex gap-2 flex-wrap">
                  {[orderTotal, orderTotal + 50, orderTotal + 100, orderTotal + 200, orderTotal + 500].map(amount => (
                    <Button
                      key={amount}
                      size="sm"
                      color="outline-primary"
                      onClick={() => setPaymentData(prev => ({
                        ...prev,
                        amountReceived: amount.toString()
                      }))}
                    >
                      {formatPrice(amount)}
                    </Button>
                  ))}
                </div>
              </div>
            </Form>
          </TabPane>

          {/* Card Payment */}
          <TabPane tabId="card">
            <Form>
              <FormGroup>
                <Label>Card Number</Label>
                <Input
                  type="text"
                  placeholder="Enter card number"
                  value={paymentData.cardNumber}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    cardNumber: e.target.value
                  }))}
                  maxLength="16"
                />
              </FormGroup>
              <FormGroup>
                <Label>Card Holder Name</Label>
                <Input
                  type="text"
                  placeholder="Enter card holder name"
                  value={paymentData.cardHolder}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    cardHolder: e.target.value
                  }))}
                />
              </FormGroup>
              <Alert color="info" fade={false}>
                <FaCalculator className="me-2" />
                Amount to be charged: <strong>{formatPrice(orderTotal)}</strong>
              </Alert>
            </Form>
          </TabPane>

          {/* UPI Payment */}
          <TabPane tabId="upi">
            <Form>
              <FormGroup>
                <Label>UPI ID</Label>
                <Input
                  type="text"
                  placeholder="Enter UPI ID (e.g., user@paytm)"
                  value={paymentData.upiId}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    upiId: e.target.value
                  }))}
                />
              </FormGroup>
              <FormGroup>
                <Label>Transaction ID</Label>
                <Input
                  type="text"
                  placeholder="Enter transaction ID"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData(prev => ({
                    ...prev,
                    transactionId: e.target.value
                  }))}
                />
              </FormGroup>
              <Alert color="info" fade={false}>
                <FaMobile className="me-2" />
                Amount to be paid: <strong>{formatPrice(orderTotal)}</strong>
              </Alert>
            </Form>
          </TabPane>
        </TabContent>

        {/* Order Summary */}
        <div className="order-summary mt-4 p-3 bg-light rounded">
          <h6>Order Summary</h6>
          <div className="d-flex justify-content-between">
            <span>Table: {selectedTable?.name}</span>
            <span>Items: {cartItems.length}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span>Customer: {customerInfo.name || 'Walk-in'}</span>
            <span>Type: {customerInfo.orderType}</span>
          </div>
          <hr />
          <div className="d-flex justify-content-between fw-bold">
            <span>Total Amount:</span>
            <span className="text-primary">{formatPrice(orderTotal)}</span>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="d-flex justify-content-between w-100">
          <div>
            <Button color="secondary" onClick={toggle} disabled={loading}>
              <FaTimes className="me-2" />
              Cancel
            </Button>
          </div>
          
          <div>
            {/* Receipt Options - Show after order is created */}
            {orderCreated && (
              <>
                <Button 
                  color="info" 
                  onClick={handleShowReceiptPreview}
                  disabled={loading}
                  className="me-2"
                >
                  <FaEye className="me-1" />
                  Preview Receipt
                </Button>
                <Button 
                  color="primary" 
                  onClick={() => handlePrintReceipt('auto')}
                  disabled={loading}
                  className="me-2"
                >
                  <FaPrint className="me-1" />
                  Print Receipt
                </Button>
              </>
            )}
            
            {/* Process Payment Button */}
            {!orderCreated && (
              <Button 
                color="success" 
                onClick={handleProcessPayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheck className="me-2" />
                    Process Payment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
    
    {/* Receipt Preview Modal */}
    {orderCreated && (
      <ReceiptPreview
        isOpen={showReceiptPreview}
        toggle={() => setShowReceiptPreview(false)}
        orderData={{
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
        }}
        restaurantInfo={{
          name: 'OrderEase Restaurant',
          address: '123 Main Street, City, State 12345',
          phone: '+91 98765 43210',
          email: 'info@orderease.com',
          gst: 'GST123456789'
        }}
        printerConfig={printerConfig}
        onPrintSuccess={() => {
          toast.success('Receipt printed successfully');
          setShowReceiptPreview(false);
        }}
      />
    )}
    </>
  );
};

export default PaymentModal;
