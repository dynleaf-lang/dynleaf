import React, { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrderType } from '../ui/EnhancedCart';
import { useTax } from '../../context/TaxContext';
import { theme } from '../../data/theme';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import TaxInfo from './TaxInfo';
import { useNotifications } from '../../context/NotificationContext';
import api from '../../utils/apiClient';
import { useRestaurant } from '../../context/RestaurantContext';
import amazonLogo from '../../assets/Payments-Icons/Amazon-Pay-icon.png';
import googlePay from '../../assets/Payments-Icons/google-pay.png';
import phonePe from '../../assets/Payments-Icons/phonepe-icon.png';
import paytmLogo from '../../assets/Payments-Icons/paytm.png';
import credLogo from '../../assets/Payments-Icons/credApp.jpg';
import upiLogo from '../../assets/Payments-Icons/upi-ar21~bgwhite.svg';

// Add CSS animation for spinner
const spinnerStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject spinner styles
if (typeof document !== 'undefined' && !document.querySelector('#payment-spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'payment-spinner-styles';
  style.textContent = spinnerStyles;
  document.head.appendChild(style);
}

// Enhanced CheckoutForm component with better validation and user feedback
const CheckoutForm = memo(() => {
  
  const { cartItems, cartTotal, orderNote, setOrderNote, placeOrder } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { orderType } = useOrderType();
  const { branch } = useRestaurant();
  const { taxRate, taxName, formattedTaxRate, calculateTax } = useTax();
  
  // Form state - only needed for non-authenticated users
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: orderType === 'takeaway' ? '' : undefined,
  });   
  
  // Form validation and UI state
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTouched, setFormTouched] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registerClosed, setRegisterClosed] = useState(false);
  const { addNotification } = useNotifications();
  // Payment selection (UPI only) and app preference
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay'); // gpay | phonepe | paytm | other
  const [showUpiDropdown, setShowUpiDropdown] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // Payment status tracking
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'pending' | 'success' | 'failed' | 'cancelled'
  const [currentOrder, setCurrentOrder] = useState(null); // Store current order details
  const [paymentRetryCount, setPaymentRetryCount] = useState(0);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState('');
  const [lastPaymentAmount, setLastPaymentAmount] = useState(0);
  const [orderCreationAttempted, setOrderCreationAttempted] = useState(false);
  
  // Order confirmation state
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  
  // Debug logging for UPI app selection
  useEffect(() => {
    console.log('[CHECKOUT FORM] Selected UPI App changed to:', selectedUpiApp);
  }, [selectedUpiApp]);

  // Handle user returning from UPI app (visibility change detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && paymentInProgress && currentOrder) {
        console.log('[CHECKOUT FORM] User returned from UPI app, checking payment status...');
        checkPaymentStatus();
      }
    };

    const handleFocus = () => {
      if (paymentInProgress && currentOrder) {
        console.log('[CHECKOUT FORM] Window focused, user likely returned from UPI app');
        setTimeout(() => checkPaymentStatus(), 1000); // Small delay to allow payment processing
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [paymentInProgress, currentOrder]);
  
  // For authenticated users, use their account info
  const effectiveCustomerInfo = isAuthenticated && user ? {
    name: user.name,
    phone: user.phone || '',
    email: user.email || '',
    address: orderType === 'takeaway' ? customerInfo.address || '' : undefined
  } : customerInfo;
  
  // Update address field when order type changes
  useEffect(() => {
    if (orderType === 'takeaway') {
      setCustomerInfo(prev => ({
        ...prev,
        address: prev.address || ''
      }));
    }
  }, [orderType]);

  // On mount: check register status once to initialize disabled state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (branch?._id) {
          const status = await api.public.orders.getRegisterStatus(branch._id);
          if (!cancelled && status && status.open === false) {
            setRegisterClosed(true);
            addNotification?.({
              type: 'system',
              title: 'Ordering Paused',
              message: 'We are not accepting orders right now. Please try again shortly.',
              icon: 'pause_circle',
              priority: 'high'
            });
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [branch?._id]);

  // Listen for order placement results from parent component
  useEffect(() => {
    const handleOrderError = (event) => {
      console.log('[CHECKOUT FORM] Order error received:', event.detail);
      const { message, isRegisterClosed } = event.detail || {};
      // For register-closed, don't show the inline error banner; we use toast + disabled button
      const msg = message || '';
      const looksClosed = /not accepting orders|register closed|423/i.test(msg);
      if (!isRegisterClosed && !looksClosed) {
        setErrorMessage(msg || 'There was an error processing your order. You can try again or continue with a temporary order.');
      } else {
        setErrorMessage('');
      }
      if (isRegisterClosed || looksClosed) {
        setRegisterClosed(true);
        try {
          if (typeof addNotification === 'function') {
            addNotification({
              type: 'system',
              title: 'Ordering Paused',
              message: message || 'We are not accepting orders right now. Please try again shortly.',
              icon: 'pause_circle',
              priority: 'high'
            });
          }
        } catch (_) {}
      }
      setIsSubmitting(false);
    };

    const handleOrderSuccess = (event) => {
      console.log('[CHECKOUT FORM] Order success received:', event.detail);
      setShowSuccessMessage(true);
      setIsSubmitting(false);
  setRegisterClosed(false);
      
      // Reset form after successful submission
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 1500);
    };

    document.addEventListener('orderError', handleOrderError);
    document.addEventListener('orderSuccess', handleOrderSuccess);

    return () => {
      document.removeEventListener('orderError', handleOrderError);
      document.removeEventListener('orderSuccess', handleOrderSuccess);
    };
  }, []);

  // When registerClosed, poll backend every 30s to re-enable button once register opens
  useEffect(() => {
    if (!registerClosed || !branch?._id) return;
    let cancelled = false;
    const check = async () => {
      try {
        const status = await api.public.orders.getRegisterStatus(branch._id);
        if (!cancelled && status?.open) {
          setRegisterClosed(false);
          addNotification?.({
            type: 'system',
            title: 'Ordering Resumed',
            message: 'Register is now open. You can place your order.',
            icon: 'play_circle',
            priority: 'medium'
          });
        }
      } catch (_) {}
    };
    // immediate check + interval
    check();
    const t = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [registerClosed, branch?._id]);

  // Payment status checking function
  const checkPaymentStatus = async () => {
    if (!currentOrder?.cfOrderId) return;

    try {
      console.log('[CHECKOUT FORM] Checking payment status for order:', currentOrder.cfOrderId);
      
      // Call backend to check payment status using existing API method
      const response = await api.public.payments.cashfree.getOrder(currentOrder.cfOrderId);
      
      // Response structure: { success: true, data: { order_status, payment_status, ... } }
      const orderData = response?.data || response;
      const { order_status, payment_status } = orderData;
      
      console.log('[CHECKOUT FORM] Payment status response:', { order_status, payment_status, fullResponse: orderData });

      // Handle different payment statuses
      switch (payment_status) {
        case 'SUCCESS':
        case 'PAID':
          handlePaymentSuccess();
          break;
        case 'FAILED':
        case 'CANCELLED':
          handlePaymentFailure('Payment failed. Please try again.');
          break;
        case 'USER_DROPPED':
          handlePaymentCancellation();
          break;
        case 'PENDING':
        case 'ACTIVE':
          handlePaymentPending();
          break;
        default:
          // Check if order status indicates completion
          if (order_status === 'PAID') {
            handlePaymentSuccess();
          } else if (order_status === 'CANCELLED' || order_status === 'TERMINATED') {
            handlePaymentFailure('Payment was not completed.');
          } else {
            // If status is unclear, wait a bit more then check again
            console.log('[CHECKOUT FORM] Payment status unclear, will retry...', { order_status, payment_status });
            setTimeout(() => checkPaymentStatus(), 3000);
          }
      }
    } catch (error) {
      console.error('[CHECKOUT FORM] Error checking payment status:', error);
      // If we can't check status, assume payment failed after some retries
      if (paymentRetryCount >= 3) {
        handlePaymentFailure('Unable to verify payment status. Please contact support if payment was deducted.');
      } else {
        // Retry after a delay
        setTimeout(() => checkPaymentStatus(), 2000);
      }
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    console.log('[CHECKOUT FORM] Payment successful!');
    setPaymentInProgress(false);
    setShowPaymentStatusModal(true);
    setPaymentStatus('pending');
    setPaymentStatusMessage('Payment received. Finalizing your order...');

    if (orderCreationAttempted) {
      console.log('[CHECKOUT FORM] Order creation already attempted, skipping duplicate call.');
      setPaymentStatus('success');
      setPaymentStatusMessage('Payment successful! Your order has been placed.');
      return;
    }

    setOrderCreationAttempted(true);

    const cfOrderId = currentOrder?.cfOrderId;
    const orderData = currentOrder?.orderData;

    if (!orderData) {
      console.error('[CHECKOUT FORM] No order data found in currentOrder');
      setPaymentStatus('error');
      setPaymentStatusMessage('Order data not found. Please contact support.');
      return;
    }

    try {
      console.log('[CHECKOUT FORM] Creating order in database after successful payment...');
      const createdOrder = await placeOrder({
        ...orderData,
        paymentStatus: 'paid', // Mark as paid since payment succeeded
        cfOrderId
      });

      if (!createdOrder) {
        throw new Error('Order creation returned no data');
      }

      console.log('[CHECKOUT FORM] Order created successfully:', createdOrder.orderId);
      
      // Store confirmed order details
      setConfirmedOrder({
        ...createdOrder,
        orderType,
        items: cartItems,
        total: totalAmount,
        paymentMethod: 'UPI',
        cfOrderId
      });
      
      setPaymentStatus('success');
      setPaymentStatusMessage('Payment successful! Your order has been placed.');
      setCurrentOrder(null);
      setIsSubmitting(false);
      setPaymentInProgress(false);

      // Trigger success event
      document.dispatchEvent(new CustomEvent('orderSuccess', { 
        detail: { 
          message: 'Order placed successfully!',
          order: createdOrder
        }
      }));

      // Close payment status modal and show order confirmation
      setTimeout(() => {
        setShowPaymentStatusModal(false);
        setShowOrderConfirmation(true); // Show professional confirmation screen
        // Reset payment states but keep order confirmation visible
        setPaymentStatus('idle');
        setCurrentOrder(null);
        setOrderCreationAttempted(false);
      }, 1500);

    } catch (error) {
      console.error('[CHECKOUT FORM] Order creation after payment failed:', error);
      setPaymentStatus('success');
      setPaymentStatusMessage(
        `Payment received successfully. We could not finalize the order automatically. Please contact support with reference ${cfOrderId || 'N/A'}.`
      );
      setIsSubmitting(false);
      
      try {
        addNotification?.({
          type: 'system',
          title: 'Order confirmation pending',
          message: `Payment captured but order confirmation is pending. Reference: ${cfOrderId || 'N/A'}. Please contact support if you do not receive a confirmation shortly.`,
          icon: 'info',
          priority: 'high'
        });
      } catch (_) {}
    }
  };

  // Handle failed payment
  const handlePaymentFailure = (message = 'Payment failed. Please try again.') => {
    console.log('[CHECKOUT FORM] Payment failed:', message);
    setPaymentStatus('failed');
    setPaymentInProgress(false);
    setPaymentStatusMessage(message);
    setShowPaymentStatusModal(true);
    setIsSubmitting(false);
    setOrderCreationAttempted(false);
    
    // Increment retry count
    setPaymentRetryCount(prev => prev + 1);
  };

  // Handle cancelled payment
  const handlePaymentCancellation = () => {
    console.log('[CHECKOUT FORM] Payment cancelled by user');
    setPaymentStatus('cancelled');
    setPaymentInProgress(false);
    setPaymentStatusMessage('Payment was cancelled. You can try again or choose a different payment method.');
    setShowPaymentStatusModal(true);
    setIsSubmitting(false);
  };

  // Handle pending payment
  const handlePaymentPending = () => {
    console.log('[CHECKOUT FORM] Payment is still pending');
    setPaymentStatus('pending');
    setPaymentStatusMessage('Payment is being processed. Please wait...');
    
    // Show modal if not already shown
    if (!showPaymentStatusModal) {
      setShowPaymentStatusModal(true);
    }
    
    // Continue checking status, but with timeout
    setTimeout(() => {
      if (paymentStatus === 'pending') {
        checkPaymentStatus();
      }
    }, 5000);
    
    // Auto-timeout after 2 minutes of pending status
    setTimeout(() => {
      if (paymentStatus === 'pending') {
        handlePaymentFailure('Payment verification timed out. Please check your bank statement and contact support if amount was deducted.');
      }
    }, 120000);
  };

  // Retry payment function
  const retryPayment = () => {
    setShowPaymentStatusModal(false);
    setPaymentStatus(null);
    setPaymentError('');
    setPaymentStatusMessage('');
    setOrderCreationAttempted(false);
    
    // Re-trigger the form submission
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 500);
  };

  // Try different payment method
  const tryDifferentPaymentMethod = () => {
    setShowPaymentStatusModal(false);
    setPaymentStatus(null);
    setPaymentError('');
    setPaymentStatusMessage('');
    setCurrentOrder(null);
    setIsSubmitting(false);
    setPaymentInProgress(false);
    setOrderCreationAttempted(false);
    
    // Show UPI dropdown to let user select different app
    setShowUpiDropdown(true);
  };
  
  // UPI Apps Configuration
  const upiApps = [
    { 
      key: 'gpay', 
      label: 'Google Pay UPI',
      icon: googlePay,
      recommended: true
    },
    { 
      key: 'phonepe', 
      label: 'PhonePe UPI',
      icon: phonePe
    },
    { 
      key: 'paytm', 
      label: 'Paytm UPI',
      icon: paytmLogo
    },
    { 
      key: 'cred', 
      label: 'CRED UPI',
      icon: credLogo
    },
    { 
      key: 'amazonpay', 
      label: 'Amazon Pay UPI',
      icon: amazonLogo
    }
  ];

  const getSelectedUpiApp = () => upiApps.find(app => app.key === selectedUpiApp) || upiApps[0];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUpiDropdown && !event.target.closest('[data-upi-dropdown]')) {
        setShowUpiDropdown(false);
      }
    };

    if (showUpiDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUpiDropdown]);
  
  // Handle input changes and validation on blur
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if any
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Real-time validation on blur
  const handleBlur = (e) => {
    const { name } = e.target;
    setFormTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    validateField(name, customerInfo[name]);
  };
  
  // Validate a single field
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = "Name is required";
        } else if (value.trim().length < 2) {
          error = "Name must be at least 2 characters";
        }
        break;
      case 'phone':
        if (value && !/^[0-9+\s()-]{10,15}$/.test(value)) {
          error = "Please enter a valid phone number";
        }
        break;
      case 'email':
        if (value && !/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case 'address':
        if (orderType === 'takeaway' && value.trim() === '') {
          error = "Address is required for takeaway orders";
        }
        break;
      default:
        break;
    }
    
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    return !error;
  };
  
  // Validate all form fields
  const validateForm = () => {
    // For authenticated users, only validate address if it's takeaway
    if (isAuthenticated && user) {
      if (orderType === 'takeaway') {
        if (!customerInfo.address || !customerInfo.address.trim()) {
          setFormErrors({ address: "Address is required for takeaway orders" });
          setFormTouched({ address: true });
          return false;
        }
      }
      return true;
    }
    
    // For non-authenticated users, validate all fields as before
    let isValid = true;
    let newFormTouched = {};
    let newErrors = {};
    
    // Validate name (always required)
    if (!customerInfo.name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
    } else if (customerInfo.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
      isValid = false;
    }
    
    // Validate phone if provided
    if (customerInfo.phone && !/^[0-9+\s()-]{10,15}$/.test(customerInfo.phone)) {
      newErrors.phone = "Please enter a valid phone number";
      isValid = false;
    }
    
    // Validate email if provided
    if (customerInfo.email && !/\S+@\S+\.\S+/.test(customerInfo.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }
    
    // Validate address for takeaway orders
    if (orderType === 'takeaway') {
      if (!customerInfo.address || !customerInfo.address.trim()) {
        newErrors.address = "Address is required for takeaway orders";
        isValid = false;
      }
    }
    
    // Mark all fields as touched when submitting
    Object.keys(customerInfo).forEach(key => {
      newFormTouched[key] = true;
    });
    
    setFormErrors(newErrors);
    setFormTouched(newFormTouched);
    return isValid;
  };
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
  // Reset error messages
  setErrorMessage('');
  setShowSuccessMessage(false);
    
    console.log('[CHECKOUT FORM] Starting form submission...');
    console.log('[CHECKOUT FORM] Cart items:', cartItems);
    console.log('[CHECKOUT FORM] Cart total:', cartTotal);
    console.log('[CHECKOUT FORM] Order note:', orderNote);
    console.log('[CHECKOUT FORM] Order type:', orderType);
    console.log('[CHECKOUT FORM] Authenticated:', isAuthenticated);
    console.log('[CHECKOUT FORM] User:', user);
    console.log('[CHECKOUT FORM] Customer info:', customerInfo);
    console.log('[CHECKOUT FORM] Effective customer info:', effectiveCustomerInfo);
    
    // Validate form
    if (!validateForm()) {
      console.log('[CHECKOUT FORM] Form validation failed');
      // Scroll to first error
      const firstErrorField = document.querySelector('.form-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    console.log('[CHECKOUT FORM] Form validation passed');
    
    // Preflight: if register might be closed, check status before setting submitting state to avoid spinner UX
    try {
      if (branch?._id) {
        const status = await api.public.orders.getRegisterStatus(branch._id);
        if (!status?.open) {
          setRegisterClosed(true);
          if (typeof addNotification === 'function') {
            addNotification({
              type: 'system',
              title: 'Ordering Paused',
              message: 'We are not accepting orders right now. Please try again shortly.',
              icon: 'pause_circle',
              priority: 'high'
            });
          }
          return; // Don't proceed or show spinner
        }
      }
    } catch (_) {
      // If the status check fails, fall through; backend will still guard and we handle the event
    }
    
    // Set loading state; if register is closed (set by an earlier event), keep disabled and show toast
    if (registerClosed) {
      if (typeof addNotification === 'function') {
        addNotification({
          type: 'system',
          title: 'Ordering Paused',
          message: 'We are not accepting orders right now. Please try again shortly.',
          icon: 'pause_circle',
          priority: 'high'
        });
      }
      return;
    }
    setIsSubmitting(true);
    
    // Prepare order data
    const orderData = {
      customerInfo: effectiveCustomerInfo,
      orderType,
      note: orderNote
    };
    
    console.log('[CHECKOUT FORM] Submitting order with data:', orderData);

    // Create Cashfree payment session FIRST (before creating order)
    try {
      setPaymentError('');
      setPaymentInProgress(true);
      const totalAmount = cartTotal + calculateTax(cartTotal);
      
      // Step 1: Create Cashfree payment session
      console.log('[CHECKOUT FORM] Creating Cashfree payment session...');
      const rawId = `${effectiveCustomerInfo.email || effectiveCustomerInfo.phone || 'guest'}_${Date.now()}`;
      const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const cfResp = await api.public.payments.cashfree.createOrder({
        amount: Number(totalAmount.toFixed(2)),
        currency: 'INR',
        customer: {
          name: effectiveCustomerInfo.name,
          email: effectiveCustomerInfo.email || 'guest@example.com',
          phone: effectiveCustomerInfo.phone || '9999999999',
          id: safeId
        },
        orderMeta: {
          return_url: `${window.location.origin}/?payment_return=true&order_id={order_id}`,
          notify_url: `${import.meta.env.VITE_API_URL}/api/payments/cashfree/webhook`,
          payment_methods: 'upi'
        }
      });

      const sessionId = cfResp?.data?.payment_session_id;
      const cfOrderId = cfResp?.data?.order_id;
      
      if (!sessionId) {
        throw new Error('Payment session not created');
      }

      console.log('[CHECKOUT FORM] Cashfree session created:', cfOrderId);

      // Store order details for creating order after payment
      setCurrentOrder({
        cfOrderId,
        sessionId,
        amount: totalAmount,
        orderData: {
          customerInfo: effectiveCustomerInfo,
          orderType,
          note: orderNote,
          paymentMethod: 'upi',
          cfOrderId: cfOrderId
        }
      });
      setOrderCreationAttempted(false); // Not created yet
      setLastPaymentAmount(totalAmount);
      setPaymentStatus('pending');

      // Step 2: Launch Cashfree SDK payment
      console.log('[CHECKOUT FORM] Checking for Cashfree SDK...');
      console.log('[CHECKOUT FORM] window.Cashfree exists:', !!window.Cashfree);
      console.log('[CHECKOUT FORM] SDK type:', typeof window.Cashfree);
      console.log('[CHECKOUT FORM] SDK constructor:', window.Cashfree?.name);
      console.log('[CHECKOUT FORM] Session ID to use:', sessionId);
      
      if (window.Cashfree) {
        console.log('[CHECKOUT FORM] ✅ SDK LOADED - Launching Cashfree Drop Checkout (v2)');
        
        try {
          // Determine environment mode
          const cfMode = (import.meta.env.VITE_CASHFREE_ENV || 'sandbox') === 'prod' ? 'production' : 'sandbox';
          
          console.log('[CHECKOUT FORM] Initializing Cashfree with mode:', cfMode);
          
          // Initialize Cashfree SDK v2 - Try with 'new' keyword
          let cashfree;
          try {
            // Method 1: With 'new' keyword (for class-based SDK)
            cashfree = new window.Cashfree({
              mode: cfMode
            });
            console.log('[CHECKOUT FORM] Initialized with new keyword');
          } catch (classError) {
            console.log('[CHECKOUT FORM] Class initialization failed, trying direct call');
            // Method 2: Direct function call
            cashfree = window.Cashfree({
              mode: cfMode
            });
            console.log('[CHECKOUT FORM] Initialized with direct call');
          }

          console.log('[CHECKOUT FORM] Cashfree instance created:', !!cashfree);
          console.log('[CHECKOUT FORM] Session ID:', sessionId);

          // Checkout configuration for v2 SDK
          const checkoutOptions = {
            paymentSessionId: sessionId,
            redirectTarget: '_modal', // Force modal mode
            appearance: {
              primaryColor: theme.colors.primary,
            }
          };

          console.log('[CHECKOUT FORM] Starting checkout with options:', checkoutOptions);

          // Launch checkout modal
          const result = await cashfree.checkout(checkoutOptions);

          console.log('[CHECKOUT FORM] Cashfree checkout completed, result:', result);

          // Handle the result
          if (result && result.error) {
            console.error('[CHECKOUT FORM] Payment error:', result.error);
            setPaymentInProgress(false);
            setIsSubmitting(false);
            handlePaymentFailure(result.error.message || 'Payment failed');
          } else if (result && result.paymentDetails) {
            console.log('[CHECKOUT FORM] Payment successful:', result.paymentDetails);
            // Verify and create order
            setTimeout(() => checkPaymentStatus(), 1000);
          } else {
            // User closed modal without completing payment
            console.log('[CHECKOUT FORM] Payment cancelled or closed by user');
            setPaymentStatus('idle');
            setPaymentInProgress(false);
            setIsSubmitting(false);
            setCurrentOrder(null);
          }

        } catch (sdkError) {
          console.error('[CHECKOUT FORM] Cashfree SDK error:', sdkError);
          console.error('[CHECKOUT FORM] Error details:', {
            message: sdkError.message,
            name: sdkError.name,
            stack: sdkError.stack
          });
          setPaymentInProgress(false);
          setIsSubmitting(false);
          handlePaymentFailure('Payment modal failed. Please try again.');
        }

      } else {
        // Fallback: SDK not loaded - show error instead of redirect
        console.error('[CHECKOUT FORM] ❌ SDK NOT LOADED!');
        console.error('[CHECKOUT FORM] window.Cashfree is:', window.Cashfree);
        console.error('[CHECKOUT FORM] Possible reasons:');
        console.error('  1. Script tag not loaded from CDN');
        console.error('  2. Content Security Policy blocking script');
        console.error('  3. Network error downloading SDK');
        console.error('  4. Ad blocker blocking Cashfree domain');
        
        // Show error to user instead of redirect
        handlePaymentFailure('Payment system not ready. Please refresh the page and try again.');
        setPaymentStatus('idle');
        return;
        
        /* Disabled redirect fallback - should use modal
        const checkoutUrl = `https://${(import.meta.env.VITE_CASHFREE_ENV || 'sandbox') === 'prod' ? 'payments' : 'sandbox'}.cashfree.com/pay/${sessionId}`;
        
        // Store order data in sessionStorage for after return
        sessionStorage.setItem('pendingOrderData', JSON.stringify({
          customerInfo: effectiveCustomerInfo,
          orderType,
          note: orderNote,
          paymentMethod: 'upi',
          cfOrderId: cfOrderId,
          amount: totalAmount
        }));
        
        window.location.href = checkoutUrl;
        */
      }

    } catch (err) {
      console.error('[CHECKOUT FORM] Payment initialization error:', err);
      setPaymentError(err?.message || 'Failed to start payment');
      handlePaymentFailure(err?.message || 'Failed to start payment');
      setIsSubmitting(false);
      setPaymentInProgress(false);
      return;
    }
    
    // Note: Success/error handling is done by the parent component (EnhancedCart)
    // We don't set success message here because we don't know if the API call succeeded yet
  };

  // If order confirmation should be shown, render that instead of checkout form
  if (showOrderConfirmation && confirmedOrder) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: theme.spacing.xl,
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: theme.colors.success + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto ' + theme.spacing.xl,
          }}
        >
          <span 
            className="material-icons" 
            style={{ 
              fontSize: '60px', 
              color: theme.colors.success 
            }}
          >
            check_circle
          </span>
        </motion.div>

        {/* Success Message */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Payment Successful!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            fontSize: '16px',
            color: theme.colors.textLight,
            marginBottom: theme.spacing.xl,
            lineHeight: '1.6'
          }}
        >
          Your order has been confirmed and is being prepared.
        </motion.p>

        {/* Order Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.xl,
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'left'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
            borderBottom: `1px solid ${theme.colors.border}`
          }}>
            <div>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                marginBottom: '4px'
              }}>
                Order ID
              </div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '600',
                color: theme.colors.text,
                fontFamily: 'monospace'
              }}>
                {confirmedOrder.orderId || confirmedOrder.order_id}
              </div>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: theme.borderRadius.md,
              backgroundColor: orderType === 'dine-in' ? theme.colors.primary + '15' : theme.colors.warning + '15',
              color: orderType === 'dine-in' ? theme.colors.primary : theme.colors.warning,
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>
                {orderType === 'dine-in' ? 'restaurant' : 'takeout_dining'}
              </span>
              {orderType === 'dine-in' ? 'Dine In' : 'Takeaway'}
            </div>
          </div>

          {/* Payment Info */}
          <div style={{ marginBottom: theme.spacing.md }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: theme.spacing.sm,
              fontSize: '14px'
            }}>
              <span style={{ color: theme.colors.textLight }}>Payment Method</span>
              <span style={{ 
                fontWeight: '600',
                color: theme.colors.text,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <img src={upiLogo} alt="UPI" style={{ height: '16px' }} />
                UPI
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span style={{ color: theme.colors.textLight }}>Amount Paid</span>
              <span style={{ fontWeight: '700', fontSize: '18px', color: theme.colors.success }}>
                <CurrencyDisplay amount={confirmedOrder.total} />
              </span>
            </div>
          </div>

          {/* Expected Time (if dine-in) */}
          {orderType === 'dine-in' && (
            <div style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.primary + '08',
              borderRadius: theme.borderRadius.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm
            }}>
              <span className="material-icons" style={{ color: theme.colors.primary }}>schedule</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: theme.colors.textLight }}>
                  Estimated Preparation Time
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: theme.colors.primary }}>
                  15-20 minutes
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* What's Next Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.xl,
            border: `1px solid ${theme.colors.border}`,
            textAlign: 'left'
          }}
        >
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <span className="material-icons">info</span>
            What's Next?
          </div>
          
          {orderType === 'dine-in' ? (
            <>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.primary }}>•</span>
                <span>Your order is being prepared by our kitchen</span>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.primary }}>•</span>
                <span>Your food will be served to your table</span>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.primary }}>•</span>
                <span>Enjoy your meal!</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.warning }}>•</span>
                <span>Your order is being prepared</span>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.warning }}>•</span>
                <span>Please wait at the counter</span>
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: theme.colors.textLight,
                display: 'flex',
                gap: theme.spacing.sm
              }}>
                <span style={{ color: theme.colors.warning }}>•</span>
                <span>Show your order ID when collecting</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            display: 'flex',
            gap: theme.spacing.md,
            flexDirection: window.innerWidth < 480 ? 'column' : 'row'
          }}
        >
          <button
            onClick={() => {
              setShowOrderConfirmation(false);
              setConfirmedOrder(null);
              // Cart should already be cleared by the placeOrder function
            }}
            style={{
              flex: 1,
              padding: '16px 24px',
              borderRadius: theme.borderRadius.md,
              backgroundColor: theme.colors.primary,
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = theme.colors.primaryDark}
            onMouseOut={(e) => e.target.style.backgroundColor = theme.colors.primary}
          >
            <span className="material-icons">home</span>
            Continue Browsing
          </button>
          
          <button
            onClick={() => {
              window.location.href = '/orders'; // Navigate to orders page if you have one
            }}
            style={{
              flex: 1,
              padding: '16px 24px',
              borderRadius: theme.borderRadius.md,
              backgroundColor: 'transparent',
              color: theme.colors.primary,
              fontWeight: '600',
              fontSize: '16px',
              border: `2px solid ${theme.colors.primary}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = theme.colors.primary + '10';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-icons">receipt_long</span>
            View Order
          </button>
        </motion.div>

        {/* Thank You Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: theme.spacing.xl,
            fontSize: '14px',
            color: theme.colors.textLight,
            fontStyle: 'italic'
          }}
        >
          Thank you for your order! We hope you enjoy your meal. 🍽️
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Error message for overall form errors */}      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: theme.colors.danger + '15',
            color: theme.colors.danger,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.sm,            fontSize: theme.typography.sizes.sm
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: theme.spacing.sm 
          }}>
            <span className="material-icons" style={{ fontSize: '20px' }}>error_outline</span>
            {errorMessage}
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: theme.spacing.md,
            marginTop: theme.spacing.sm 
          }}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setErrorMessage(''); setRegisterClosed(false); }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                backgroundColor: 'transparent',
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                cursor: 'pointer'
              }}
            >
              Try Again
            </motion.button>
            
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                document.dispatchEvent(new CustomEvent('forceConfirmation'));
                setErrorMessage('');
              }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.text.light,
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                cursor: 'pointer'
              }}
            >
              Continue Anyway
            </motion.button>
          </div>
        </motion.div>
      )}
      
      {/* Success message */}
      {showSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: theme.colors.success + '15',
            color: theme.colors.success,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            fontSize: theme.typography.sizes.sm,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span className="material-icons" style={{ fontSize: '20px' }}>check_circle</span>
          Order submitted successfully!
        </motion.div>
      )}
      
      {/* Payment Status Modal */}
      {showPaymentStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: theme.spacing.md
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              backgroundColor: 'white',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: theme.shadows.xl
            }}
          >
            {/* Status Icon */}
            <div style={{ marginBottom: theme.spacing.lg }}>
              {paymentStatus === 'success' && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: theme.colors.success + '20',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: theme.spacing.md
                }}>
                  <span className="material-icons" style={{ 
                    fontSize: '40px', 
                    color: theme.colors.success 
                  }}>
                    check_circle
                  </span>
                </div>
              )}
              
              {paymentStatus === 'failed' && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: theme.colors.danger + '20',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: theme.spacing.md
                }}>
                  <span className="material-icons" style={{ 
                    fontSize: '40px', 
                    color: theme.colors.danger 
                  }}>
                    error
                  </span>
                </div>
              )}
              
              {paymentStatus === 'cancelled' && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: theme.colors.warning + '20',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: theme.spacing.md
                }}>
                  <span className="material-icons" style={{ 
                    fontSize: '40px', 
                    color: theme.colors.warning 
                  }}>
                    cancel
                  </span>
                </div>
              )}
              
              {paymentStatus === 'pending' && (
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: theme.colors.primary + '20',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: theme.spacing.md
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid rgba(0,0,0,0.1)',
                    borderTopColor: theme.colors.primary,
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              )}
            </div>

            {/* Status Title */}
            <h3 style={{
              margin: `0 0 ${theme.spacing.sm} 0`,
              fontSize: theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary
            }}>
              {paymentStatus === 'success' && 'Payment Successful!'}
              {paymentStatus === 'failed' && `Payment of ₹${lastPaymentAmount.toFixed(2)} failed`}
              {paymentStatus === 'cancelled' && 'Payment Cancelled'}
              {paymentStatus === 'pending' && 'Processing Payment...'}
            </h3>

            {/* Status Message */}
            <p style={{
              margin: `0 0 ${theme.spacing.lg} 0`,
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.secondary,
              lineHeight: 1.5
            }}>
              {paymentStatus === 'failed' && (
                <>
                  {paymentStatusMessage}
                  <br />
                  <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.tertiary }}>
                    If amount was deducted from {getSelectedUpiApp().label}, refund will be processed within 2 hours
                  </span>
                </>
              )}
              {paymentStatus !== 'failed' && paymentStatusMessage}
            </p>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: theme.spacing.md,
              flexDirection: paymentStatus === 'failed' ? 'column' : 'row',
              justifyContent: 'center'
            }}>
              {paymentStatus === 'success' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPaymentStatusModal(false)}
                  style={{
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    backgroundColor: theme.colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  Continue
                </motion.button>
              )}

              {paymentStatus === 'failed' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={retryPayment}
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                      backgroundColor: theme.colors.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Retry payment
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={tryDifferentPaymentMethod}
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.danger,
                      border: 'none',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      width: '100%'
                    }}
                  >
                    Try another payment method
                  </motion.button>
                </>
              )}

              {paymentStatus === 'cancelled' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={retryPayment}
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                      backgroundColor: theme.colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.semibold,
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    Try Again
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={tryDifferentPaymentMethod}
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.text.secondary,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    Change Method
                  </motion.button>
                </>
              )}

              {paymentStatus === 'pending' && (
                <p style={{
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.tertiary,
                  fontStyle: 'italic'
                }}>
                  Please wait while we verify your payment...
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} noValidate>
        {/* Payment selection moved near the Place Order button; UPI apps only */}
        {paymentError && (
          <div style={{ 
            background: 'white',
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.danger}30`,
            color: theme.colors.danger,
            marginBottom: theme.spacing.md,
            fontSize: theme.typography.sizes.sm
          }}>
            {paymentError}
          </div>
        )}
        {/* Show customer info for authenticated users */}
        {isAuthenticated && user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: 'white',
              padding: theme.spacing.lg,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
              marginTop: theme.spacing.md,
              border: `1px solid ${theme.colors.border}`
            }}
          >
            <h4 style={{ 
              margin: `0 0 ${theme.spacing.md} 0`,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm
            }}>
              <span className="material-icons" style={{ fontSize: '20px', color: theme.colors.success }}>
                account_circle
              </span>
              Ordering as: {user.name}
            </h4>
            
            <div style={{ 
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xs
            }}>
              {user.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>email</span>
                  {user.email}
                </div>
              )}
              {user.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>phone</span>
                  {user.phone}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Customer information fields - only for non-authenticated users */}
        {!isAuthenticated && (
          <>
            <div style={{ marginBottom: theme.spacing.lg, marginTop: theme.spacing.md }}>
              <label 
                htmlFor="name" 
                style={{ 
                  display: 'block', 
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.fontWeights.medium,
                  color: theme.colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                Name <span style={{ color: theme.colors.danger }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="name"
                  name="name"
                  value={customerInfo.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Your Name"
                  required
                  className={formErrors.name ? 'form-error' : ''}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xl}`,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${formErrors.name && formTouched.name ? theme.colors.danger : theme.colors.border}`,
                    backgroundColor: formErrors.name && formTouched.name ? 'rgba(255,71,87,0.05)' : 'white',
                    outline: 'none',
                    transition: theme.transitions.fast,
                    fontSize: theme.typography.sizes.md,
                    color: theme.colors.secondary
                  }}
                />
                <span 
                  className="material-icons"
                  style={{ 
                    position: 'absolute', 
                    left: theme.spacing.sm, 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: formErrors.name && formTouched.name ? theme.colors.danger : theme.colors.text.secondary,
                    fontSize: '18px'
                  }}
                >
                  person
                </span>
              </div>
              {formErrors.name && formTouched.name && (
                <p style={{ 
                  color: theme.colors.danger, 
                  fontSize: theme.typography.sizes.sm,
                  marginTop: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>error_outline</span>
                  {formErrors.name}
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label 
                htmlFor="phone" 
                style={{ 
                  display: 'block', 
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.fontWeights.medium,
                  color: theme.colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="phone"
                  name="phone"
                  value={customerInfo.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Your Phone Number"
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xl}`,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${formErrors.phone && formTouched.phone ? theme.colors.danger : theme.colors.border}`,
                    backgroundColor: formErrors.phone && formTouched.phone ? 'rgba(255,71,87,0.05)' : 'white',
                    outline: 'none',
                    transition: theme.transitions.fast,
                    fontSize: theme.typography.sizes.md,
                    color: theme.colors.secondary
                  }}
                />
                <span 
                  className="material-icons"
                  style={{ 
                    position: 'absolute', 
                    left: theme.spacing.sm, 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: formErrors.phone && formTouched.phone ? theme.colors.danger : theme.colors.text.secondary,
                    fontSize: '18px'
                  }}
                >
                  smartphone
                </span>
              </div>
              {formErrors.phone && formTouched.phone && (
                <p style={{ 
                  color: theme.colors.danger, 
                  fontSize: theme.typography.sizes.sm,
                  marginTop: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>error_outline</span>
                  {formErrors.phone}
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: theme.spacing.lg }}>
              <label 
                htmlFor="email" 
                style={{ 
                  display: 'block', 
                  marginBottom: theme.spacing.xs,
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.fontWeights.medium,
                  color: theme.colors.text.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Your Email Address"
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xl}`,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${formErrors.email && formTouched.email ? theme.colors.danger : theme.colors.border}`,
                    backgroundColor: formErrors.email && formTouched.email ? 'rgba(255,71,87,0.05)' : 'white',
                    outline: 'none',
                    transition: theme.transitions.fast,
                    fontSize: theme.typography.sizes.md,
                    color: theme.colors.secondary
                  }}
                />
                <span 
                  className="material-icons"
                  style={{ 
                    position: 'absolute', 
                    left: theme.spacing.sm, 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: formErrors.email && formTouched.email ? theme.colors.danger : theme.colors.text.secondary,
                    fontSize: '18px'
                  }}
                >
                  email
                </span>
              </div>
              {formErrors.email && formTouched.email && (
                <p style={{ 
                  color: theme.colors.danger, 
                  fontSize: theme.typography.sizes.sm,
                  marginTop: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}>
                  <span className="material-icons" style={{ fontSize: '14px' }}>error_outline</span>
                  {formErrors.email}
                </p>
              )}
            </div>
          </>
        )}
        
        {/* Address field for takeaway orders - shown for all users */}
        {orderType === 'takeaway' && (
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label 
              htmlFor="address" 
              style={{ 
                display: 'block', 
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                color: theme.colors.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}
            >
              Delivery Address <span style={{ color: theme.colors.danger }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                id="address"
                name="address"
                value={customerInfo.address || ''}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Your Delivery Address"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xl}`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${formErrors.address && formTouched.address ? theme.colors.danger : theme.colors.border}`,
                  backgroundColor: formErrors.address && formTouched.address ? 'rgba(255,71,87,0.05)' : 'white',
                  outline: 'none',
                  transition: theme.transitions.fast,
                  resize: 'vertical',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                  fontSize: theme.typography.sizes.md,
                    color: theme.colors.secondary
                }}
              />
              <span 
                className="material-icons"
                style={{ 
                  position: 'absolute', 
                  left: theme.spacing.sm, 
                  top: '24px',
                  color: formErrors.address && formTouched.address ? theme.colors.danger : theme.colors.text.secondary,
                  fontSize: '18px'
                }}
              >
                location_on
              </span>
            </div>
            {formErrors.address && formTouched.address && (
              <p style={{ 
                color: theme.colors.danger, 
                fontSize: theme.typography.sizes.sm,
                marginTop: theme.spacing.xs,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                <span className="material-icons" style={{ fontSize: '14px' }}>error_outline</span>
                {formErrors.address}
              </p>
            )}
          </div>
        )}
        
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label 
            htmlFor="orderNote" 
            style={{ 
              display: 'block', 
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}
          >
            Order Notes
          </label>
          <div style={{ position: 'relative' }}>
            <textarea
              id="orderNote"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Special instructions for your order"
              style={{
                width: '100%',
                padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.xl}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: 'white',
                outline: 'none',
                transition: theme.transitions.fast,
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit',
                fontSize: theme.typography.sizes.md,
                color: theme.colors.secondary
              }}
            />
            <span 
              className="material-icons"
              style={{ 
                position: 'absolute', 
                left: theme.spacing.sm, 
                top: '24px',
                color: theme.colors.text.secondary,
                fontSize: '18px'
              }}
            >
              note
            </span>
          </div>
        </div>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            backgroundColor: '#f0f0f0',
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.sm,
            marginBottom: theme.spacing.md,
            fontSize: theme.typography.sizes.sm,
            fontFamily: 'monospace'
          }}>
            <div><strong>Payment Debug Info:</strong></div>
            <div>Selected UPI App: {selectedUpiApp}</div>
            <div>Total Amount: ₹{(cartTotal + calculateTax(cartTotal)).toFixed(2)}</div>
            <div>User Agent: {navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iOS' : 'Desktop'}</div>
            <div>Payment Status: {paymentStatus || 'none'}</div>
            <div>Current Order ID: {currentOrder?.cfOrderId || 'none'}</div>
            <div>Retry Count: {paymentRetryCount}</div>
            <div>Cashfree SDK: {window.Cashfree ? 'Loaded' : 'Not Loaded'}</div>
          </div>
        )}
        
        {/* Order summary section with enhanced styling */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            backgroundColor: 'white',
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.xl,
            boxShadow: theme.shadows.sm
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <h4 style={{ 
              margin: 0,
              fontSize: theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary
            }}>
              Order Summary
            </h4>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.primary + '15',
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.pill,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.primary
            }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>
                {orderType === 'dineIn' ? 'restaurant' : 'takeout_dining'}
              </span>
              {orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}
            </div>
          </div>
          
          {/* Item list summary */}
          <div style={{ 
            maxHeight: '200px',
            overflowY: 'auto',
            marginBottom: theme.spacing.md,
          }}>
            {cartItems.map((item) => (
              <div 
                key={`${item.id}-${JSON.stringify(item.selectedOptions)}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `${theme.spacing.xs} 0`,
                  borderBottom: `1px solid ${theme.colors.border}20`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <span style={{ color: theme.colors.primary, fontWeight: theme.typography.fontWeights.semibold }}>
                    {item.quantity}×
                  </span>
                  <span>{item.title || item.name}</span>
                </div>
                <span><CurrencyDisplay amount={item.price * item.quantity} /></span>
              </div>
            ))}
          </div>
          
          {/* Total amount with tax and subtotals */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            <span>Subtotal</span>
            <span><CurrencyDisplay amount={cartTotal} /></span>
          </div>          {/* Tax information with loading and error states */}
          <TaxInfo subtotal={cartTotal} /><div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.text.primary
          }}>
            <span>Total</span>
            <span><CurrencyDisplay amount={cartTotal + calculateTax(cartTotal)} /></span>
          </div>
        </motion.div>
        
        {/* Buttons container with back and submit buttons */}
       
          
          {/* Back button */}
          {/* <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => document.dispatchEvent(new CustomEvent('resetCart'))}
            style={{
              flex: '0 0 auto',
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: theme.transitions.fast,
              boxShadow: theme.shadows.sm,
              width: '120px'
            }}
          >
            <span className="material-icons" style={{ marginRight: theme.spacing.xs }}>arrow_back</span>
            Back
          </motion.button> */}
        
          {/* Pay using (left) + Place Order (right) */}
          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            alignItems: 'stretch',
            marginBottom: theme.spacing.lg,
            flexWrap: 'wrap'
          }}>
            {/* Left: UPI Payment Selection */}
            <div 
              data-upi-dropdown
              style={{
                flex: '1 1 45%',
                minWidth: '240px',
                position: 'relative'
              }}
            >
              {/* Pay Using Dropdown */}
              <div 
                onClick={() => setShowUpiDropdown(!showUpiDropdown)}
                style={{
                  backgroundColor: 'white',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  boxShadow: theme.shadows.sm,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <div style={{ 
                    fontSize: theme.typography.sizes.sm, 
                    color: theme.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 500
                  }}>
                    PAY USING
                  </div> 
                  {selectedUpiApp && (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: theme.colors.success,
                      borderRadius: '50%',
                      marginLeft: theme.spacing.xs
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <img 
                    src={getSelectedUpiApp().icon} 
                    alt={getSelectedUpiApp().label}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }} 
                  />
                  <span style={{ fontWeight: 600, fontSize: theme.typography.sizes.md }}>
                    {getSelectedUpiApp().label}
                  </span>
                  <span 
                    className="material-icons" 
                    style={{ 
                      fontSize: '20px', 
                      color: theme.colors.text.secondary,
                      transform: showUpiDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    expand_more
                  </span>
                </div>
              </div>

              {/* UPI Apps Dropdown */}
              {showUpiDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  boxShadow: theme.shadows.lg,
                  zIndex: 1000,
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  {/* Recommended Section */}
                  <div style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                    backgroundColor: '#f8f9fa',
                    borderBottom: `1px solid ${theme.colors.border}`,
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: 500
                  }}>
                    RECOMMENDED
                  </div>
                  
                  {/* UPI Apps List */}
                  {upiApps.map(app => (
                    <div
                      key={app.key}
                      onClick={() => {
                        console.log('[CHECKOUT FORM] User selected UPI app:', app.key);
                        setSelectedUpiApp(app.key);
                        setShowUpiDropdown(false);
                        
                        // Clear any previous payment errors when user changes app
                        if (paymentError) {
                          setPaymentError('');
                        }
                      }}
                      style={{
                        padding: theme.spacing.md,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: selectedUpiApp === app.key ? theme.colors.primary + '10' : 'white',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUpiApp !== app.key) {
                          e.target.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedUpiApp !== app.key) {
                          e.target.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                        <img 
                          src={app.icon} 
                          alt={app.label}
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            objectFit: 'contain',
                            borderRadius: '6px'
                          }} 
                        />
                        <span style={{ 
                          fontWeight: 500, 
                          fontSize: theme.typography.sizes.md,
                          color: theme.colors.text.primary
                        }}>
                          {app.label}
                        </span>
                      </div>
                      {selectedUpiApp === app.key && (
                        <span className="material-icons" style={{ color: theme.colors.primary, fontSize: '20px' }}>
                          check
                        </span>
                      )}
                      <span 
                        className="material-icons" 
                        style={{ 
                          color: theme.colors.text.secondary, 
                          fontSize: '18px' 
                        }}
                      >
                        chevron_right
                      </span>
                    </div>
                  ))}
                  
                  {/* Add new UPI ID option */}
                  <div
                    style={{
                      padding: theme.spacing.md,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'white',
                      color: theme.colors.primary
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'white';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
                      <img src={upiLogo} alt="UPI" style={{ width: 24, height: 24 }} />
                      <span style={{ 
                        fontWeight: 500, 
                        fontSize: theme.typography.sizes.md 
                      }}>
                        Add new UPI ID
                      </span>
                    </div>
                    <span className="material-icons" style={{ fontSize: '24px', color: theme.colors.primary }}>
                      add
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Payment instruction */}
            {selectedUpiApp && (
              <div style={{
                backgroundColor: theme.colors.primary + '10',
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.sm,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.primary,
                textAlign: 'center',
                marginTop: theme.spacing.sm,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.xs
              }}>
                <span className="material-icons" style={{ fontSize: '16px' }}>info</span>
                {getSelectedUpiApp().label} will open for payment when you place your order
              </div>
            )}

            {/* Right: Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting || registerClosed || paymentInProgress}
              whileHover={!isSubmitting ? { scale: 1.01 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
              style={{
                flex: '1 1 50%',
                minWidth: '260px',
                backgroundColor: (isSubmitting || registerClosed) ? theme.colors.primary + 'aa' : theme.colors.primary,
                color: theme.colors.text.light,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.lg,
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.semibold,
                cursor: (isSubmitting || registerClosed || paymentInProgress) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: theme.transitions.fast,
                boxShadow: theme.shadows.md,
                width: '100%'
              }}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  <>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      animation: 'spin 1s linear infinite',
                    }} />
                    {paymentInProgress ? 'Starting Payment...' : 'Processing Order...'}
                  </>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                  {registerClosed ? (
                    <>
                      <span className="material-icons">pause_circle</span>
                      Ordering paused
                    </>
                  ) : (
                    <>
                      <span className="material-icons">shopping_cart_checkout</span>
                      {'Pay & Place Order • '}<CurrencyDisplay amount={cartTotal + calculateTax(cartTotal)} />
                    </>
                  )}
                </div>
              )}
            </motion.button>
          </div>
         
      </form>
    </motion.div>
  );
});

export default CheckoutForm;
