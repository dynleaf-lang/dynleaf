import React, { useState, memo, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrderType } from '../ui/EnhancedCart';
import { useTax } from '../../context/TaxContext';
import { useSocket } from '../../context/SocketContext';
import { theme } from '../../data/theme';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import TaxInfo from './TaxInfo';
import { useNotifications } from '../../context/NotificationContext';
import api from '../../utils/apiClient';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCashfreeSDK } from '../../hooks/useCashfreeSDK';
import { PaymentService } from '../../services/PaymentService';
import PaymentSDKLoader from './PaymentSDKLoader';
import OrderSuccessModal from './OrderSuccessModal';
import OrderConfirmation from './OrderConfirmation';
import PaymentSuccessToast from './PaymentSuccessToast';
import PaymentStatusTracker from './PaymentStatusTracker';
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
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

// Inject spinner styles
if (typeof document !== 'undefined' && !document.querySelector('#payment-spinner-styles')) {
  const style = document.createElement('style');
  style.id = 'payment-spinner-styles';
  style.textContent = spinnerStyles;
  document.head.appendChild(style);
}

// Enhanced Loading Components
const SkeletonLoader = ({ width = '100%', height = '20px', borderRadius = '4px' }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: '#f0f0f0',
      borderRadius,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }}
  />
);

const PaymentProcessingIndicator = ({ step, progress }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      border: '3px solid rgba(0,0,0,0.1)',
      borderTopColor: '#007bff',
      animation: 'spin 1s linear infinite'
    }} />
    
    <div style={{ textAlign: 'center' }}>
      <p style={{
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
      }}>
        {step || 'Processing payment...'}
      </p>
      
      {progress !== undefined && (
        <div style={{
          width: '200px',
          height: '4px',
          backgroundColor: '#e0e0e0',
          borderRadius: '2px',
          marginTop: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#007bff',
            borderRadius: '2px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}
    </div>
  </div>
);

// Enhanced CheckoutForm component with better validation and user feedback
const CheckoutForm = memo(({ checkoutStep, setCheckoutStep }) => {
  
  const { cartItems, cartTotal, orderNote, setOrderNote, placeOrder, currentOrder: cartCurrentOrder, setCurrentOrder: setCartCurrentOrder } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { orderType } = useOrderType();
  const { branch } = useRestaurant();
  const { taxRate, taxName, formattedTaxRate, calculateTax } = useTax();
  const { addNotification } = useNotifications();
  const { socket, isConnected } = useSocket();
  
  // Cashfree SDK management
  const { 
    sdkLoaded, 
    sdkError, 
    isLoading: sdkLoading, 
    retryLoad, 
    canRetry,
    retryCount,
    maxRetries,
    initializeSDK,
    getAnalytics: getSDKAnalytics
  } = useCashfreeSDK();
  
  // Payment service instance
  const [paymentService] = useState(() => new PaymentService());
  
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
  
  // Consolidated payment state for better organization
  const [paymentState, setPaymentState] = useState({
    selectedUpiApp: 'gpay',
    inProgress: false,
    error: '',
    status: null, // null | 'pending' | 'success' | 'failed' | 'cancelled'
    retryCount: 0,
    statusMessage: '',
    amount: 0,
    statusFinalized: false,
    orderCreationAttempted: false
  });
  
  // Consolidated verification state
  const [verificationState, setVerificationState] = useState({
    isVerifying: false,
    progress: 0,
    step: '',
    attempts: 0
  });
  
  // Consolidated UI state
  const [uiState, setUiState] = useState({
    showUpiDropdown: false,
    showPaymentStatusModal: false,
    showSuccessToast: false,
    showSuccessModal: false,
    showOrderConfirmation: false
  });
  
  // Order state
  const [currentOrder, setCurrentOrder] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  
  // Helper functions for state updates
  const updatePaymentState = useCallback((updates) => {
    setPaymentState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const updateVerificationState = useCallback((updates) => {
    setVerificationState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const updateUIState = useCallback((updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Backward compatibility accessors (to maintain existing functionality)
  const selectedUpiApp = paymentState.selectedUpiApp;
  const setSelectedUpiApp = useCallback((value) => updatePaymentState({ selectedUpiApp: value }), [updatePaymentState]);
  const showUpiDropdown = uiState.showUpiDropdown;
  const setShowUpiDropdown = useCallback((value) => updateUIState({ showUpiDropdown: value }), [updateUIState]);
  const paymentInProgress = paymentState.inProgress;
  const setPaymentInProgress = useCallback((value) => updatePaymentState({ inProgress: value }), [updatePaymentState]);
  const paymentError = paymentState.error;
  const setPaymentError = useCallback((value) => updatePaymentState({ error: value }), [updatePaymentState]);
  const paymentStatus = paymentState.status;
  const setPaymentStatus = useCallback((value) => updatePaymentState({ status: value }), [updatePaymentState]);
  const paymentRetryCount = paymentState.retryCount;
  const setPaymentRetryCount = useCallback((value) => updatePaymentState({ retryCount: value }), [updatePaymentState]);
  const showPaymentStatusModal = uiState.showPaymentStatusModal;
  const setShowPaymentStatusModal = useCallback((value) => updateUIState({ showPaymentStatusModal: value }), [updateUIState]);
  const paymentStatusMessage = paymentState.statusMessage;
  const setPaymentStatusMessage = useCallback((value) => updatePaymentState({ statusMessage: value }), [updatePaymentState]);
  const lastPaymentAmount = paymentState.amount;
  const setLastPaymentAmount = useCallback((value) => updatePaymentState({ amount: value }), [updatePaymentState]);
  const orderCreationAttempted = paymentState.orderCreationAttempted;
  const setOrderCreationAttempted = useCallback((value) => updatePaymentState({ orderCreationAttempted: value }), [updatePaymentState]);
  const showOrderConfirmation = uiState.showOrderConfirmation;
  const setShowOrderConfirmation = useCallback((value) => updateUIState({ showOrderConfirmation: value }), [updateUIState]);
  const showSuccessToast = uiState.showSuccessToast;
  const setShowSuccessToast = useCallback((value) => updateUIState({ showSuccessToast: value }), [updateUIState]);
  const showSuccessModal = uiState.showSuccessModal;
  const setShowSuccessModal = useCallback((value) => updateUIState({ showSuccessModal: value }), [updateUIState]);
  const isVerifyingPayment = verificationState.isVerifying;
  const setIsVerifyingPayment = useCallback((value) => updateVerificationState({ isVerifying: value }), [updateVerificationState]);
  const verificationProgress = verificationState.progress;
  const setVerificationProgress = useCallback((value) => updateVerificationState({ progress: value }), [updateVerificationState]);
  const verificationStep = verificationState.step;
  const setVerificationStep = useCallback((value) => updateVerificationState({ step: value }), [updateVerificationState]);
  const verificationAttempts = verificationState.attempts;
  const setVerificationAttempts = useCallback((value) => updateVerificationState({ attempts: value }), [updateVerificationState]);
  const paymentStatusFinalized = paymentState.statusFinalized;
  const setPaymentStatusFinalized = useCallback((value) => updatePaymentState({ statusFinalized: value }), [updatePaymentState]);
  const maxVerificationAttempts = 4; // Reduced from 6 to 4 for faster timeout
  
  // Enhanced error handling with categorization and user-friendly messages
  const handleError = useCallback((error, context = 'general') => {
    console.error(`[CHECKOUT FORM] Error in ${context}:`, error);
    
    // Categorize errors for better user experience
    const errorCategories = {
      network: /network|timeout|fetch|connection|ECONNREFUSED|NETWORK_ERROR/i,
      validation: /validation|invalid|required|format/i,
      payment: /payment|cashfree|upi|PAYMENT_FAILED|INSUFFICIENT_FUNDS/i,
      server: /server|500|503|502|INTERNAL_SERVER_ERROR/i,
      authentication: /auth|unauthorized|401|403|token/i,
      order: /order|ORDER_NOT_FOUND|DUPLICATE_ORDER/i
    };
    
    let userMessage = 'An unexpected error occurred. Please try again.';
    let errorType = 'general';
    
    // Determine error type
    const errorString = error.message || error.toString() || '';
    for (const [type, pattern] of Object.entries(errorCategories)) {
      if (pattern.test(errorString)) {
        errorType = type;
        break;
      }
    }
    
    // Generate user-friendly messages
    switch (errorType) {
      case 'network':
        userMessage = 'Connection issue detected. Please check your internet and try again.';
        break;
      case 'validation':
        userMessage = error.message || 'Please check your information and try again.';
        break;
      case 'payment':
        userMessage = 'Payment processing issue. Your money is safe. Please try again or contact support.';
        break;
      case 'server':
        userMessage = 'Server is temporarily busy. Please try again in a moment.';
        break;
      case 'authentication':
        userMessage = 'Authentication issue. Please refresh the page and try again.';
        break;
      case 'order':
        userMessage = 'Order processing issue. Please refresh and try again.';
        break;
      default:
        userMessage = 'Something went wrong. Please try again or contact support if the issue persists.';
    }
    
    setErrorMessage(userMessage);
    
    // Track errors for analytics (safely)
    try {
      if (paymentService?.getAnalytics) {
        const analytics = paymentService.getAnalytics();
        analytics?.trackError?.(context, errorType, errorString);
      }
    } catch (analyticsError) {
      console.warn('[CHECKOUT FORM] Analytics tracking failed:', analyticsError);
    }
    
    return { errorType, userMessage, originalError: error };
  }, [paymentService, setErrorMessage]);
  
  // Payment Status State Machine for safer state transitions
  const PaymentStatusMachine = {
    IDLE: 'idle',
    INITIALIZING: 'initializing',
    PROCESSING: 'processing',
    VERIFYING: 'verifying',
    SUCCESS: 'success',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMEOUT: 'timeout'
  };

  const paymentStatusTransitions = {
    [PaymentStatusMachine.IDLE]: [PaymentStatusMachine.INITIALIZING],
    [PaymentStatusMachine.INITIALIZING]: [
      PaymentStatusMachine.PROCESSING, 
      PaymentStatusMachine.FAILED
    ],
    [PaymentStatusMachine.PROCESSING]: [
      PaymentStatusMachine.VERIFYING,
      PaymentStatusMachine.SUCCESS,
      PaymentStatusMachine.FAILED,
      PaymentStatusMachine.CANCELLED
    ],
    [PaymentStatusMachine.VERIFYING]: [
      PaymentStatusMachine.SUCCESS,
      PaymentStatusMachine.FAILED,
      PaymentStatusMachine.TIMEOUT
    ],
    [PaymentStatusMachine.FAILED]: [PaymentStatusMachine.INITIALIZING], // Allow retry
    [PaymentStatusMachine.TIMEOUT]: [PaymentStatusMachine.INITIALIZING], // Allow retry
    [PaymentStatusMachine.CANCELLED]: [PaymentStatusMachine.INITIALIZING] // Allow retry
  };

  const isValidStatusTransition = useCallback((from, to) => {
    return paymentStatusTransitions[from]?.includes(to) ?? false;
  }, []);

  const updatePaymentStatusSafely = useCallback((newStatus, context = '') => {
    const currentStatus = paymentState.status || PaymentStatusMachine.IDLE;
    
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      console.warn(
        `[CHECKOUT FORM] Invalid payment status transition from ${currentStatus} to ${newStatus} in context: ${context}`
      );
      return false;
    }
    
    console.log(`[CHECKOUT FORM] Payment status: ${currentStatus} → ${newStatus} (${context})`);
    updatePaymentState({ status: newStatus });
    return true;
  }, [paymentState.status, isValidStatusTransition, updatePaymentState]);
  
  // Performance optimizations - memoize expensive calculations
  const orderSummary = useMemo(() => {
    const subtotal = cartTotal || 0;
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    const itemCount = cartItems?.length || 0;
    
    return {
      subtotal,
      tax,
      total,
      itemCount,
      hasItems: itemCount > 0,
      isValidOrder: itemCount > 0 && total > 0
    };
  }, [cartTotal, calculateTax, cartItems?.length]);

  // Memoize customer info for authenticated users to prevent unnecessary re-renders
  const memoizedCustomerInfo = useMemo(() => 
    isAuthenticated && user ? {
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: orderType === 'takeaway' ? customerInfo.address || '' : undefined
    } : customerInfo,
    [isAuthenticated, user?.name, user?.phone, user?.email, customerInfo, orderType]
  );

  // Debounced validation for better UX
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  const debouncedValidation = useMemo(
    () => debounce((fieldName, value) => {
      validateField(fieldName, value);
    }, 300),
    []
  );

  // Memoize UPI apps to prevent unnecessary re-renders
  const memoizedUpiApps = useMemo(() => [
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
  ], []);

  const getSelectedUpiApp = useCallback(() => 
    memoizedUpiApps.find(app => app.key === selectedUpiApp) || memoizedUpiApps[0],
    [memoizedUpiApps, selectedUpiApp]
  );
  
  // Debug logging for UPI app selection
  useEffect(() => {
    console.log('[CHECKOUT FORM] Selected UPI App changed to:', selectedUpiApp);
  }, [selectedUpiApp]);

  // WebSocket integration for instant payment confirmations
  useEffect(() => {
    if (!socket || !isConnected || !currentOrder?.cfOrderId) {
      return;
    }

    const handlePaymentConfirmation = (data) => {
      console.log('[CHECKOUT FORM] WebSocket payment confirmation received:', data);
      
      // Check if this confirmation is for our current order
      if (data.cfOrderId === currentOrder.cfOrderId || 
          data.order?.paymentDetails?.cfOrderId === currentOrder.cfOrderId) {
        
        console.log('[CHECKOUT FORM] Payment confirmed via WebSocket - instant response!');
        
        // Cancel any ongoing polling since we got instant confirmation
        if (paymentInProgress) {
          handlePaymentSuccess();
        }
      }
    };

    const handlePaymentFailure = (data) => {
      console.log('[CHECKOUT FORM] WebSocket payment failure received:', data);
      
      // Check if this failure is for our current order
      if (data.cfOrderId === currentOrder.cfOrderId || 
          data.order?.paymentDetails?.cfOrderId === currentOrder.cfOrderId) {
        
        console.log('[CHECKOUT FORM] Payment failed via WebSocket');
        
        if (paymentInProgress) {
          handlePaymentFailure(data.message || 'Payment failed via bank notification');
        }
      }
    };

    // Listen for payment events
    socket.on('payment_success', handlePaymentConfirmation);
    socket.on('payment_confirmed', handlePaymentConfirmation);
    socket.on('payment_failed', handlePaymentFailure);
    socket.on('orderUpdate', (data) => {
      // Handle generic order updates that might include payment status
      if (data.eventType === 'payment_success' && 
          data.order?.paymentDetails?.cfOrderId === currentOrder.cfOrderId) {
        handlePaymentConfirmation(data);
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('payment_success', handlePaymentConfirmation);
      socket.off('payment_confirmed', handlePaymentConfirmation);
      socket.off('payment_failed', handlePaymentFailure);
      socket.off('orderUpdate');
    };
  }, [socket, isConnected, currentOrder, paymentInProgress]);

  // Handle user returning from UPI app (optimized visibility change detection)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && paymentInProgress && currentOrder) {
        console.log('[CHECKOUT FORM] User returned from UPI app, checking payment status immediately...');
        // Check immediately instead of waiting
        checkPaymentStatus();
      }
    };

    const handleFocus = () => {
      if (paymentInProgress && currentOrder) {
        console.log('[CHECKOUT FORM] Window focused, user likely returned from UPI app');
        // Reduced delay for faster response
        setTimeout(() => checkPaymentStatus(), 500); // Reduced from 1000ms
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

  // Enhanced payment status checking with connection error handling
  const checkPaymentStatus = async () => {
    // If payment status is already finalized, don't attempt further verification
    if (paymentStatusFinalized) {
      console.log('[CHECKOUT FORM] Payment status already finalized, skipping verification');
      return;
    }
    
    if (!currentOrder?.cfOrderId) return;

    const startTime = Date.now();

    try {
      console.log('[CHECKOUT FORM] Checking payment status for order:', currentOrder.cfOrderId);
      
      // Quick order status check first (usually faster than detailed payment info)
      const response = await api.public.payments.cashfree.getOrder(currentOrder.cfOrderId);
      
      // Measure response time for connection quality assessment
      const responseTime = Date.now() - startTime;
      console.log(`[CHECKOUT FORM] API response time: ${responseTime}ms`);
      
      // Response structure: { success: true, data: { order_status, payment_status, ... } }
      const orderData = response?.data || response;
      const { order_status, payment_status } = orderData;
      
      console.log('[CHECKOUT FORM] Payment status response:', { order_status, payment_status, fullResponse: orderData });

      // Prioritize order_status check for faster confirmation
      if (order_status === 'PAID') {
        console.log('[CHECKOUT FORM] Payment confirmed via order status check');
        handlePaymentSuccess();
        return;
      }

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
          // Check if order status indicates failure
          if (order_status === 'CANCELLED' || order_status === 'TERMINATED') {
            handlePaymentFailure('Payment was not completed.');
          } else {
            // If status is unclear, wait less time then check again (faster retry)
            console.log('[CHECKOUT FORM] Payment status unclear, will retry in 2s...', { order_status, payment_status });
            // Only retry if payment status hasn't been finalized
            if (!paymentStatusFinalized) {
              setTimeout(() => checkPaymentStatus(), 2000); // Reduced from 3000ms
            }
          }
      }
    } catch (error) {
      const { errorType } = handleError(error, 'payment status check');
      
      // Enhanced error handling with network-aware retry logic
      const isNetworkError = errorType === 'network' || !navigator.onLine;
      
      if (isNetworkError) {
        console.log('[CHECKOUT FORM] Network error detected, adjusting retry strategy');
        
        // Show network error message
        try {
          addNotification?.({
            type: 'system',
            title: 'Connection Issue',
            message: 'Having trouble connecting. Retrying...',
            icon: 'wifi_off',
            priority: 'medium',
            duration: 5000
          });
        } catch (_) {}
        
        // Only retry for network issues if payment status hasn't been finalized
        if (!paymentStatusFinalized) {
          // Longer delay for network issues
          setTimeout(() => checkPaymentStatus(), 5000);
        }
      } else {
        // If we can't check status, assume payment failed after fewer retries (faster fail)
        if (paymentRetryCount >= 2) { // Reduced from 3 to 2
          handlePaymentFailure('Unable to verify payment status. Please contact support if payment was deducted.');
        } else {
          // Only retry if payment status hasn't been finalized
          if (!paymentStatusFinalized) {
            // Retry after shorter delay
            setTimeout(() => checkPaymentStatus(), 1500); // Reduced from 2000ms
          }
        }
      }
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async () => {
    console.log('[CHECKOUT FORM] Payment successful!');
    
    // Set payment status as finalized to prevent further verification attempts
    setPaymentStatusFinalized(true);
    
    // Start the professional success flow
    setPaymentInProgress(false);
    setShowPaymentStatusModal(false); // Hide payment status modal
    setShowSuccessToast(true); // Show success toast first
    updatePaymentStatusSafely(PaymentStatusMachine.SUCCESS, 'payment successful');
    setPaymentStatusMessage('Payment received. Finalizing your order...');

    if (orderCreationAttempted) {
      console.log('[CHECKOUT FORM] Order creation already attempted, skipping duplicate call.');
      updatePaymentStatusSafely(PaymentStatusMachine.SUCCESS, 'order already created');
      setPaymentStatusMessage('Payment successful! Your order has been placed.');
      return;
    }

    setOrderCreationAttempted(true);

    const cfOrderId = currentOrder?.cfOrderId;
    const orderData = currentOrder?.orderData;
    const totalAmount = currentOrder?.amount || 0;

    if (!orderData) {
      console.error('[CHECKOUT FORM] No order data found in currentOrder');
      setPaymentStatus('error');
      setPaymentStatusMessage('Order data not found. Please contact support.');
      return;
    }

    // Try to get more payment information from Cashfree
    console.log('[CHECKOUT FORM] Attempting to verify payment details...');
    const verifiedPaymentId = await verifyPaymentStatus(cfOrderId);
    
    if (verifiedPaymentId) {
      console.log('[CHECKOUT FORM] Successfully verified payment ID:', verifiedPaymentId);
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
      
      // Store confirmed order details with all necessary info
      const confirmedOrderData = {
        ...createdOrder,
        orderId: createdOrder.orderId || createdOrder.order_id || cfOrderId,
        order_id: createdOrder.orderId || createdOrder.order_id || cfOrderId,
        orderType,
        items: cartItems,
        total: totalAmount,
        paymentMethod: 'UPI',
        cfOrderId,
        paymentId: currentOrder?.paymentId || `payment_${cfOrderId}_${Date.now()}`,
        paymentReference: currentOrder?.paymentId || cfOrderId,
        orderTime: new Date().toISOString(),
        tax: calculateTax(cartTotal),
        subtotal: cartTotal
      };
      
      setConfirmedOrder(confirmedOrderData);
      setCartCurrentOrder(confirmedOrderData); // Update cart context as well
      setPaymentStatus('success');
      setCurrentOrder(null);
      setIsSubmitting(false);
      setPaymentInProgress(false);

      // Track successful payment in analytics
      const analytics = paymentService.getAnalytics();
      analytics.trackPaymentSuccess(createdOrder.orderId, totalAmount, Date.now() - paymentService.paymentStartTime);

      // Trigger success event for parent components
      document.dispatchEvent(new CustomEvent('orderSuccess', { 
        detail: { 
          message: 'Order placed successfully!',
          order: createdOrder
        }
      }));

      // Professional success flow: Toast → Modal
      setTimeout(() => {
        setShowSuccessToast(false);
        console.log('[CHECKOUT FORM] Setting showSuccessModal to true');
        console.log('[CHECKOUT FORM] confirmedOrderData:', confirmedOrderData);
        setShowSuccessModal(true);
      }, 2500); // Show toast for 2.5 seconds, then show modal

    } catch (error) {
      const { errorType, userMessage } = handleError(error, 'order creation after payment');
      
      setPaymentStatus('success');
      setPaymentStatusMessage(
        `Payment received successfully. We could not finalize the order automatically. Please contact support with reference ${cfOrderId || 'N/A'}.`
      );
      setIsSubmitting(false);
      
      // Show appropriate notification based on error type
      try {
        const notificationMessage = errorType === 'network' 
          ? `Payment captured but we're having connection issues. Your order will be processed. Reference: ${cfOrderId || 'N/A'}.`
          : `Payment captured but order confirmation is pending. Reference: ${cfOrderId || 'N/A'}. Please contact support if you do not receive a confirmation shortly.`;
          
        addNotification?.({
          type: 'system',
          title: 'Order confirmation pending',
          message: notificationMessage,
          icon: 'info',
          priority: 'high'
        });
      } catch (_) {}
      
      // Hide success toast and show error
      setShowSuccessToast(false);
    }
  };

  // Handle failed payment
  const handlePaymentFailure = (message = 'Payment failed. Please try again.') => {
    console.log('[CHECKOUT FORM] Payment failed:', message);
    
    // Set payment status as finalized to prevent further verification attempts
    setPaymentStatusFinalized(true);
    
    updatePaymentStatusSafely(PaymentStatusMachine.FAILED, 'payment failed');
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
    
    // Set payment status as finalized to prevent further verification attempts
    setPaymentStatusFinalized(true);
    
    updatePaymentStatusSafely(PaymentStatusMachine.CANCELLED, 'payment cancelled');
    setPaymentInProgress(false);
    setPaymentStatusMessage('Payment was cancelled. You can try again or choose a different payment method.');
    setShowPaymentStatusModal(true);
    setIsSubmitting(false);
  };

  // Handle pending payment
  const handlePaymentPending = () => {
    console.log('[CHECKOUT FORM] Payment is still pending');
    updatePaymentStatusSafely(PaymentStatusMachine.PROCESSING, 'payment pending');
    setPaymentStatusMessage('Payment is being processed. Please wait...');
    
    // Show modal if not already shown
    if (!showPaymentStatusModal) {
      setShowPaymentStatusModal(true);
    }
    
    // Continue checking status, but with faster timeout
    setTimeout(() => {
      if (paymentStatus === 'pending') {
        checkPaymentStatus();
      }
    }, 3000); // Reduced from 5000ms to 3000ms
    
    // Auto-timeout after 30 seconds instead of 2 minutes
    setTimeout(() => {
      if (paymentStatus === 'pending') {
        handlePaymentFailure('Payment verification timed out after 30 seconds. Please check your bank statement and contact support if amount was deducted.');
      }
    }, 30000); // Reduced from 120000ms to 30000ms
  };

  // Retry payment function
  const retryPayment = () => {
    setShowPaymentStatusModal(false);
    setPaymentStatus(null);
    setPaymentError('');
    setPaymentStatusMessage('');
    setOrderCreationAttempted(false);
    
    // Reset payment status finalized flag for retry
    setPaymentStatusFinalized(false);
    
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
    
    // Reset payment service for new attempt
    paymentService.resetRetries();
    
    // Show UPI dropdown to let user select different app preference
    setShowUpiDropdown(true);
  };

  // Handle success modal actions
  const handleContinueShopping = () => {
    setShowSuccessModal(false);
    setConfirmedOrder(null);
    setShowOrderConfirmation(false);
    // Reset all payment states
    setPaymentStatus('idle');
    setCurrentOrder(null);
    setOrderCreationAttempted(false);
    setPaymentRetryCount(0);
    setPaymentStatusFinalized(false); // Reset for next order
    // Cart should already be cleared by placeOrder function
  };

  const handleViewOrderHistory = () => {
    // Navigate to orders page or open orders modal
    if (window.location.pathname !== '/orders') {
      window.location.href = '/orders';
    } else {
      // If already on orders page, just close the modal
      handleContinueShopping();
    }
  };

  const handleViewOrderConfirmation = () => {
    console.log('[CHECKOUT FORM] Transitioning from Success Modal to Order Confirmation');
    if (setCheckoutStep) {
      setCheckoutStep('confirmation');
    } else {
      setShowSuccessModal(false);
      setShowOrderConfirmation(true);
    }
  };

  const handleToastComplete = () => {
    setShowSuccessToast(false);
  };

  const handlePaymentRetry = () => {
    setPaymentRetryCount(prev => prev + 1);
    setPaymentError('');
    setShowPaymentStatusModal(false);
    
    // Reset payment status finalized flag for retry
    setPaymentStatusFinalized(false);
    
    // Re-trigger payment process
    handleSubmit(new Event('submit'));
  };

  // Enhanced verification process with multiple fallback strategies
  const startVerificationProcess = async () => {
    // If payment status is already finalized, don't start verification
    if (paymentStatusFinalized) {
      console.log('[CHECKOUT FORM] Payment status already finalized, skipping verification process');
      return;
    }
    
    const startTime = Date.now();
    let attempts = 0;
    
    const verificationSteps = [
      'Confirming payment with bank...',
      'Verifying transaction details...',
      'Processing order confirmation...',
      'Finalizing your order...'
    ];
    
    const performVerification = async () => {
      // Check if payment status was finalized during verification
      if (paymentStatusFinalized) {
        console.log('[CHECKOUT FORM] Payment status finalized during verification, stopping');
        setIsVerifyingPayment(false);
        return true;
      }
      
      attempts++;
      setVerificationAttempts(attempts);
      
      const stepIndex = Math.min(Math.floor((attempts - 1) / 2), verificationSteps.length - 1);
      setVerificationStep(verificationSteps[stepIndex]);
      setVerificationProgress((attempts / maxVerificationAttempts) * 100);
      
      console.log(`[CHECKOUT FORM] Verification attempt ${attempts}/${maxVerificationAttempts}`);
      
      try {
        // Multi-strategy verification approach
        let verified = false;
        
        // Strategy 1: Check via WebSocket confirmation (if received)
        if (paymentStatus === 'success') {
          console.log('[CHECKOUT FORM] Payment verified via WebSocket');
          verified = true;
        }
        
        // Strategy 2: Direct order status check (fastest)
        if (!verified) {
          try {
            const orderResponse = await api.public.payments.cashfree.getOrder(currentOrder.cfOrderId);
            if (orderResponse?.data?.order_status === 'PAID') {
              console.log('[CHECKOUT FORM] Payment verified via order status');
              verified = true;
            }
          } catch (orderErr) {
            console.warn('[CHECKOUT FORM] Order status check failed:', orderErr.message);
          }
        }
        
        // Strategy 3: Payment details check (fallback)
        if (!verified) {
          try {
            const paymentsResponse = await api.public.payments.cashfree.getPayments(currentOrder.cfOrderId);
            const successPayment = paymentsResponse?.data?.find(p => 
              (p.payment_status || '').toLowerCase() === 'success'
            );
            if (successPayment) {
              console.log('[CHECKOUT FORM] Payment verified via payment details');
              verified = true;
            }
          } catch (paymentsErr) {
            console.warn('[CHECKOUT FORM] Payment details check failed:', paymentsErr.message);
          }
        }
        
        if (verified) {
          setVerificationProgress(100);
          setVerificationStep('Payment confirmed!');
          setIsVerifyingPayment(false);
          setShowPaymentStatusModal(false);
          handlePaymentSuccess();
          return true;
        }
        
        // If not verified and we haven't reached max attempts, try again with shorter intervals
        if (attempts < maxVerificationAttempts) {
          const timeElapsed = Date.now() - startTime;
          const remainingTime = Math.max(20000 - timeElapsed, 0); // Reduced from 30s to 20s max
          
          if (remainingTime > 0 && !paymentStatusFinalized) {
            console.log(`[CHECKOUT FORM] Retrying verification in 3 seconds... (${attempts}/${maxVerificationAttempts})`);
            setTimeout(performVerification, 3000); // Reduced from 5000ms to 3000ms
            return false;
          }
        }
        
        // Max attempts reached or timeout
        console.log('[CHECKOUT FORM] Verification timeout or max attempts reached');
        setIsVerifyingPayment(false);
        setVerificationStep('Verification taking longer than expected...');
        handleVerificationTimeout();
        return false;
        
      } catch (error) {
        console.error('[CHECKOUT FORM] Verification error:', error);
        
        if (attempts < maxVerificationAttempts && !paymentStatusFinalized) {
          setTimeout(performVerification, 3000); // Reduced from 5000ms
          return false;
        } else {
          setIsVerifyingPayment(false);
          handleVerificationTimeout();
          return false;
        }
      }
    };
    
    // Start the verification process
    performVerification();
  };

  // Enhanced verification timeout handler with fallback options
  const handleVerificationTimeout = () => {
    setPaymentStatus('pending_verification');
    setPaymentStatusMessage(
      'Payment verification is taking longer than expected. This could be due to high network traffic. Your payment may still be processing.'
    );
    
    // Show a comprehensive timeout modal with options
    setShowPaymentStatusModal(true);
    
    // Show a helpful message to the user with next steps
    try {
      addNotification?.({
        type: 'system',
        title: 'Payment Being Verified',
        message: 'Your payment is being processed. You will receive order confirmation within a few minutes. If you don\'t receive confirmation, please contact support.',
        icon: 'hourglass_empty',
        priority: 'high',
        duration: 15000 // Show longer for important message
      });
    } catch (_) {}
    
    // Set up background verification polling (less aggressive)
    let backgroundAttempts = 0;
    const maxBackgroundAttempts = 5;
    
    const backgroundVerification = async () => {
      // Stop background verification if payment status has been finalized or no current order
      if (paymentStatusFinalized || backgroundAttempts >= maxBackgroundAttempts || !currentOrder?.cfOrderId) {
        console.log('[CHECKOUT FORM] Background verification stopped - payment finalized, max attempts reached, or no current order');
        return;
      }
      
      backgroundAttempts++;
      console.log(`[CHECKOUT FORM] Background verification attempt ${backgroundAttempts}`);
      
      try {
        // Check if payment was confirmed while user was waiting
        const orderResponse = await api.public.payments.cashfree.getOrder(currentOrder.cfOrderId);
        
        if (orderResponse?.data?.order_status === 'PAID') {
          console.log('[CHECKOUT FORM] Payment confirmed during background verification');
          handlePaymentSuccess();
          return;
        }
      } catch (error) {
        console.warn('[CHECKOUT FORM] Background verification failed:', error);
      }
      
      // Continue background polling every 30 seconds only if not finalized and order still exists
      if (!paymentStatusFinalized && currentOrder?.cfOrderId) {
        setTimeout(backgroundVerification, 30000);
      }
    };
    
    // Start background verification after 1 minute, but only if not already finalized and order exists
    if (!paymentStatusFinalized && currentOrder?.cfOrderId) {
      setTimeout(backgroundVerification, 60000);
    }
  };

  const verifyPaymentStatus = async (cfOrderId) => {
    try {
      console.log('[CHECKOUT FORM] Verifying payment status for order:', cfOrderId);
      
      // Use existing getPayments endpoint to get payment details
      const response = await api.public.payments.cashfree.getPayments(cfOrderId);
      
      console.log('[CHECKOUT FORM] Payment verification response:', response);
      
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const paymentData = response.data[0]; // Get the first (latest) payment
        
        // Extract payment ID from verification response
        const verifiedPaymentId = paymentData.cf_payment_id || 
                                 paymentData.payment_id || 
                                 paymentData.txn_id ||
                                 paymentData.transaction_id ||
                                 paymentData.id;
        
        console.log('[CHECKOUT FORM] Verified payment ID:', verifiedPaymentId);
        console.log('[CHECKOUT FORM] Payment data:', paymentData);
        
        if (verifiedPaymentId) {
          // Update current order with verified payment ID
          setCurrentOrder(prev => ({
            ...prev,
            paymentId: verifiedPaymentId,
            verifiedPaymentData: paymentData
          }));
          
          return verifiedPaymentId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[CHECKOUT FORM] Payment verification failed:', error);
      return null;
    }
  };
  
  
  
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
  
  // Enhanced validation rules with comprehensive error messages
  const validationRules = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s'-]+$/,
      message: 'Name must contain only letters, spaces, hyphens, and apostrophes'
    },
    phone: {
      required: false,
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
      message: 'Please enter a valid phone number'
    },
    email: {
      required: false,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    address: {
      required: orderType === 'takeaway',
      minLength: 10,
      maxLength: 200,
      message: 'Address must be between 10-200 characters'
    }
  };

  // Enhanced validation function with better error messages
  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return true;
    
    // Required field validation
    if (rules.required && (!value || !value.toString().trim())) {
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`
      }));
      return false;
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rules.required) {
      setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
      return true;
    }
    
    const stringValue = value.toString().trim();
    
    // Length validations
    if (rules.minLength && stringValue.length < rules.minLength) {
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${rules.minLength} characters`
      }));
      return false;
    }
    
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must not exceed ${rules.maxLength} characters`
      }));
      return false;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      setFormErrors(prev => ({
        ...prev,
        [fieldName]: rules.message
      }));
      return false;
    }
    
    // Clear error if validation passes
    setFormErrors(prev => ({ ...prev, [fieldName]: '' }));
    return true;
  }, [orderType]);
  
  // Security enhancements - input sanitization and XSS prevention
  const sanitizeInput = useCallback((value, type = 'text') => {
    if (!value) return '';
    
    let sanitized = value.toString().trim();
    
    switch (type) {
      case 'name':
        // Remove any potentially harmful characters but allow international names
        sanitized = sanitized.replace(/[<>\"'&]/g, '');
        // Remove script tags and other dangerous content
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Allow letters, spaces, hyphens, apostrophes, and basic accented characters
        sanitized = sanitized.replace(/[^\w\s'-]/g, '');
        break;
      case 'phone':
        // Keep only numbers, +, -, (, ), and spaces
        sanitized = sanitized.replace(/[^\d\+\-\(\)\s]/g, '');
        break;
      case 'email':
        // Basic email sanitization - remove dangerous characters
        sanitized = sanitized.toLowerCase().replace(/[^\w@\.\-\+]/g, '');
        break;
      case 'address':
        // Remove script tags and potentially harmful content
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/[<>\"']/g, '');
        // Remove any SQL injection attempts
        sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '');
        break;
      default:
        // General sanitization for other fields
        sanitized = sanitized.replace(/[<>\"'&]/g, '');
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    return sanitized;
  }, []);
  
  // Enhanced input change handler with sanitization
  const handleInputChangeSanitized = useCallback((e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value, name);
    
    setCustomerInfo(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error for this field if any
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Debounced validation
    debouncedValidation(name, sanitizedValue);
  }, [formErrors, debouncedValidation, sanitizeInput]);
  
  // Validate a single field (legacy support)
  const validateFieldLegacy = (name, value) => {
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
    // For authenticated users, use their account info and only validate address if needed
    if (isAuthenticated && user) {
      if (orderType === 'takeaway') {
        const isAddressValid = validateField('address', customerInfo.address);
        if (!isAddressValid) {
          setFormTouched(prev => ({ ...prev, address: true }));
          return false;
        }
      }
      return true;
    }
    
    // For non-authenticated users, validate all required fields using enhanced validation
    let isValid = true;
    const newFormTouched = {};
    const fieldsToValidate = ['name'];
    
    // Add optional fields to validation if they have values
    if (customerInfo.phone) fieldsToValidate.push('phone');
    if (customerInfo.email) fieldsToValidate.push('email');
    
    // Always validate address for takeaway orders
    if (orderType === 'takeaway') {
      fieldsToValidate.push('address');
    }
    
    // Validate each field
    fieldsToValidate.forEach(fieldName => {
      const fieldValue = customerInfo[fieldName] || '';
      const fieldIsValid = validateField(fieldName, fieldValue);
      
      newFormTouched[fieldName] = true;
      
      if (!fieldIsValid) {
        isValid = false;
      }
    });
    
    // Update touched state
    setFormTouched(prev => ({ ...prev, ...newFormTouched }));
    
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
      
      // Initialize payment state machine
      updatePaymentStatusSafely(PaymentStatusMachine.INITIALIZING, 'payment process started');
      
      // Reset payment status finalized flag for new payment attempt
      setPaymentStatusFinalized(false);
      
      const totalAmount = orderSummary.total;
      
      // Payment amount validation before creating Cashfree session
      console.log('[CHECKOUT FORM] Validating payment amount:', totalAmount);
      
      // Payment validation constants
      const MIN_PAYMENT_AMOUNT = 1; // Minimum ₹1 as per payment gateway requirements
      const MAX_PAYMENT_AMOUNT = 100000; // UPI daily limit is ₹100,000
      
      // Validate cart using memoized order summary
      if (!orderSummary.hasItems) {
        throw new Error('Cart is empty. Please add items before proceeding to payment.');
      }
      
      // Validate cart total
      if (!orderSummary.isValidOrder) {
        throw new Error('Invalid cart total. Please refresh and try again.');
      }
      
      // Validate total amount is a valid number
      if (!totalAmount || isNaN(totalAmount) || !isFinite(totalAmount)) {
        throw new Error('Invalid payment amount calculated. Please refresh and try again.');
      }
      
      // Validate minimum amount
      if (totalAmount < MIN_PAYMENT_AMOUNT) {
        throw new Error(`Minimum payment amount is ₹${MIN_PAYMENT_AMOUNT}. Current amount: ₹${totalAmount.toFixed(2)}`);
      }
      
      // Validate maximum amount (UPI transaction limit)
      if (totalAmount > MAX_PAYMENT_AMOUNT) {
        throw new Error(`Maximum payment amount is ₹${MAX_PAYMENT_AMOUNT.toLocaleString()}. Current amount: ₹${totalAmount.toFixed(2)}. Please contact us for large orders.`);
      }
      
      // Validate amount precision (max 2 decimal places)
      const roundedAmount = Number(totalAmount.toFixed(2));
      if (Math.abs(totalAmount - roundedAmount) > 0.001) {
        console.warn('[CHECKOUT FORM] Amount precision issue, rounding:', totalAmount, '->', roundedAmount);
      }
      
      console.log('[CHECKOUT FORM] Payment amount validation passed:', {
        cartTotal: orderSummary.subtotal,
        taxAmount: orderSummary.tax,
        totalAmount: roundedAmount,
        itemCount: orderSummary.itemCount,
        validationLimits: {
          min: MIN_PAYMENT_AMOUNT,
          max: MAX_PAYMENT_AMOUNT
        }
      });
      
      // Step 1: Create Cashfree payment session
      console.log('[CHECKOUT FORM] Creating Cashfree payment session...');
      const rawId = `${effectiveCustomerInfo.email || effectiveCustomerInfo.phone || 'guest'}_${Date.now()}`;
      const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const cfResp = await api.public.payments.cashfree.createOrder({
        amount: roundedAmount, // Use validated and rounded amount
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
      
      console.log('[CHECKOUT FORM] Cashfree response:', cfResp?.data);
      console.log('[CHECKOUT FORM] Extracted cfOrderId:', cfOrderId);
      console.log('[CHECKOUT FORM] Extracted sessionId:', sessionId);
      
      if (!sessionId) {
        throw new Error('Payment session not created');
      }

      if (!cfOrderId) {
        console.warn('[CHECKOUT FORM] cfOrderId not found in response, this may cause issues');
      }

      // Generate a fallback order ID if cfOrderId is missing
      const finalOrderId = cfOrderId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[CHECKOUT FORM] Using order ID:', finalOrderId);

      // Store order details for creating order after payment
      setCurrentOrder({
        cfOrderId: finalOrderId,
        sessionId,
        amount: roundedAmount, // Use validated amount
        orderData: {
          customerInfo: effectiveCustomerInfo,
          orderType,
          note: orderNote,
          paymentMethod: 'upi',
          cfOrderId: finalOrderId
        }
      });
      setOrderCreationAttempted(false); // Not created yet
      setLastPaymentAmount(roundedAmount); // Use validated amount
      setPaymentStatus('pending');

      // Step 2: Process payment using enhanced PaymentService
      console.log('[CHECKOUT FORM] Processing payment with enhanced service...');
      
      // Reset payment service retry counter for new payment
      paymentService.resetRetries();
      
      // Validate session data
      paymentService.validateSessionData({ sessionId, amount: roundedAmount, cfOrderId: finalOrderId });
      
      try {
        const paymentResult = await paymentService.processPayment(
          {
            sessionId,
            amount: roundedAmount, // Use validated amount
            cfOrderId: finalOrderId
          },
          {
            primaryColor: theme.colors.primary,
            backgroundColor: '#ffffff',
            theme: 'light'
          }
        );

        console.log('[CHECKOUT FORM] Payment processing completed:', paymentResult);

        if (paymentResult.success) {
          console.log('[CHECKOUT FORM] Payment successful, starting verification...');
          
          // Store payment IDs if available
          if (paymentResult.orderId || paymentResult.paymentId) {
            setCurrentOrder(prev => ({
              ...prev,
              paymentId: paymentResult.paymentId,
              orderId: paymentResult.orderId || paymentResult.cfOrderId
            }));
          }
          
          // Start verification process with proper UI feedback
          setIsVerifyingPayment(true);
          setVerificationProgress(0);
          setVerificationStep('Confirming payment with bank...');
          setVerificationAttempts(0);
          setPaymentStatus('verifying');
          setShowPaymentStatusModal(true);
          
          // Start verification with progress tracking
          setTimeout(() => startVerificationProcess(), 1000);
        } else if (paymentResult.cancelled) {
          console.log('[CHECKOUT FORM] Payment cancelled by user');
          handlePaymentCancellation();
        } else {
          console.log('[CHECKOUT FORM] Payment failed:', paymentResult.message);
          handlePaymentFailure(paymentResult.message || 'Payment failed');
        }

      } catch (paymentError) {
        console.error('[CHECKOUT FORM] Payment processing error:', paymentError);
        handlePaymentFailure(paymentError.message || 'Payment processing failed');
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
      <>
        <OrderConfirmation />
      </>
    );
  }

  // If success modal should be shown (either via checkoutStep or local state), render that instead of checkout form  
  if ((checkoutStep === 'success' && (cartCurrentOrder || confirmedOrder)) || (showSuccessModal && confirmedOrder)) {
    console.log('[CHECKOUT FORM] Rendering OrderSuccessModal', { 
      checkoutStep, 
      showSuccessModal, 
      confirmedOrder: !!confirmedOrder,
      cartCurrentOrder: !!cartCurrentOrder
    });
    
    const orderToShow = confirmedOrder || cartCurrentOrder;
    return (
      <>
        <OrderSuccessModal
          order={orderToShow}
          orderType={orderType}
          onClose={handleContinueShopping}
          onContinueShopping={handleContinueShopping}
          onViewOrderHistory={handleViewOrderConfirmation}
        />
      </>
    );
  }

  // Debug logging for modal conditions
  if (showSuccessModal || showOrderConfirmation) {
    console.log('[CHECKOUT FORM] Modal states:', { 
      showSuccessModal, 
      showOrderConfirmation, 
      confirmedOrder: !!confirmedOrder 
    });
  }

  return (
    <PaymentSDKLoader
      sdkLoaded={sdkLoaded}
      sdkError={sdkError}
      isLoading={sdkLoading}
      retryLoad={retryLoad}
      canRetry={canRetry}
      retryCount={retryCount}
      maxRetries={maxRetries}
    >
      {/* Show skeleton loader when SDK is loading */}
      {sdkLoading && (
        <div style={{ padding: theme.spacing.lg }}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <SkeletonLoader height="24px" width="150px" />
            <div style={{ marginTop: theme.spacing.sm }}>
              <SkeletonLoader height="48px" />
            </div>
          </div>
          
          <div style={{ marginBottom: theme.spacing.lg }}>
            <SkeletonLoader height="20px" width="100px" />
            <div style={{ marginTop: theme.spacing.sm }}>
              <SkeletonLoader height="40px" />
            </div>
          </div>
          
          <div style={{ marginBottom: theme.spacing.lg }}>
            <SkeletonLoader height="20px" width="80px" />
            <div style={{ marginTop: theme.spacing.sm }}>
              <SkeletonLoader height="40px" />
            </div>
          </div>
          
          <div style={{ marginTop: theme.spacing.xl }}>
            <SkeletonLoader height="48px" />
          </div>
        </div>
      )}
      
      {/* Show form when SDK is ready */}
      {!sdkLoading && (
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
                  onChange={handleInputChangeSanitized}
                  onBlur={handleBlur}
                  placeholder="Your Name"
                  required
                  aria-required="true"
                  aria-describedby={formErrors.name && formTouched.name ? "name-error" : undefined}
                  aria-invalid={formErrors.name && formTouched.name ? "true" : "false"}
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
                  aria-hidden="true"
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
                <p 
                  id="name-error"
                  role="alert"
                  style={{ 
                    color: theme.colors.danger, 
                    fontSize: theme.typography.sizes.sm,
                    marginTop: theme.spacing.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '14px' }} aria-hidden="true">
                    error_outline
                  </span>
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
                  type="tel"
                  value={customerInfo.phone}
                  onChange={handleInputChangeSanitized}
                  onBlur={handleBlur}
                  placeholder="Your Phone Number"
                  aria-describedby={formErrors.phone && formTouched.phone ? "phone-error phone-help" : "phone-help"}
                  aria-invalid={formErrors.phone && formTouched.phone ? "true" : "false"}
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
                  aria-hidden="true"
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
              <p id="phone-help" style={{ 
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xs,
                marginBottom: 0
              }}>
                Optional: For order updates and delivery coordination
              </p>
              {formErrors.phone && formTouched.phone && (
                <p 
                  id="phone-error"
                  role="alert"
                  style={{ 
                    color: theme.colors.danger, 
                    fontSize: theme.typography.sizes.sm,
                    marginTop: theme.spacing.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '14px' }} aria-hidden="true">
                    error_outline
                  </span>
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
                  onChange={handleInputChangeSanitized}
                  onBlur={handleBlur}
                  placeholder="Your Email Address"
                  aria-describedby={formErrors.email && formTouched.email ? "email-error email-help" : "email-help"}
                  aria-invalid={formErrors.email && formTouched.email ? "true" : "false"}
                  autoComplete="email"
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
                  aria-hidden="true"
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
              <p id="email-help" style={{ 
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xs,
                marginBottom: 0
              }}>
                Optional: For order confirmation and receipts
              </p>
              {formErrors.email && formTouched.email && (
                <p 
                  id="email-error"
                  role="alert"
                  style={{ 
                    color: theme.colors.danger, 
                    fontSize: theme.typography.sizes.sm,
                    marginTop: theme.spacing.xs,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '14px' }} aria-hidden="true">
                    error_outline
                  </span>
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
                onChange={handleInputChangeSanitized}
                onBlur={handleBlur}
                placeholder="Your Delivery Address"
                required={orderType === 'takeaway'}
                aria-required={orderType === 'takeaway' ? "true" : "false"}
                aria-describedby={formErrors.address && formTouched.address ? "address-error address-help" : "address-help"}
                aria-invalid={formErrors.address && formTouched.address ? "true" : "false"}
                rows="3"
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
                aria-hidden="true"
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
            <p id="address-help" style={{ 
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xs,
              marginBottom: 0
            }}>
              Include street address, building/apartment number, and any delivery instructions
            </p>
            {formErrors.address && formTouched.address && (
              <p 
                id="address-error"
                role="alert"
                style={{ 
                  color: theme.colors.danger, 
                  fontSize: theme.typography.sizes.sm,
                  marginTop: theme.spacing.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }} aria-hidden="true">
                  error_outline
                </span>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowUpiDropdown(!showUpiDropdown);
                  }
                  if (e.key === 'Escape') {
                    setShowUpiDropdown(false);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={showUpiDropdown}
                aria-describedby="upi-dropdown-help"
                aria-label="Select UPI payment app"
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
                <div 
                  role="listbox"
                  aria-label="Select UPI payment app"
                  style={{
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
                  }}
                >
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
                  {upiApps.map((app, index) => (
                    <div
                      key={app.key}
                      role="option"
                      aria-selected={selectedUpiApp === app.key}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          console.log('[CHECKOUT FORM] User selected UPI app:', app.key);
                          setSelectedUpiApp(app.key);
                          setShowUpiDropdown(false);
                        }
                        if (e.key === 'Escape') {
                          setShowUpiDropdown(false);
                        }
                      }}
                      onClick={() => {
                        console.log('[CHECKOUT FORM] User selected UPI app:', app.key);
                        
                        // Track analytics for UPI app selection
                        const analytics = paymentService.getAnalytics();
                        analytics.trackUpiAppSelected(app.key, app.label);
                        
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
              
              <p id="upi-dropdown-help" style={{ 
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xs,
                marginBottom: 0
              }}>
                Select your preferred UPI app for secure payment
              </p>
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
              aria-describedby="submit-button-help"
              aria-label={`${registerClosed ? 'Ordering is currently paused' : `Pay and place order for ${orderSummary.total.toFixed(2)} rupees`}`}
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
                    {isVerifyingPayment 
                      ? `Verifying Payment... (${verificationAttempts}/${maxVerificationAttempts})`
                      : paymentInProgress 
                      ? 'Starting Payment...' 
                      : 'Processing Order...'
                    }
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
            <p id="submit-button-help" style={{ 
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xs,
              textAlign: 'center',
              marginBottom: 0
            }}>
              {registerClosed 
                ? 'We are currently not accepting new orders. Please try again later.'
                : `${getSelectedUpiApp().label} will open for secure payment when you place your order`
              }
            </p>
          </div>
         
      </form>

      {/* Payment Success Toast */}
      {showSuccessToast && confirmedOrder && (
        <PaymentSuccessToast
          orderId={confirmedOrder.orderId || confirmedOrder.order_id || confirmedOrder.cfOrderId || 'N/A'}
          amount={confirmedOrder.total}
          onComplete={() => {
            setShowSuccessToast(false);
            setShowSuccessModal(true);
          }}
        />
      )}

      {/* Payment Status Tracker */}
      {showPaymentStatusModal && (
        <PaymentStatusTracker
          status={paymentStatus}
          message={paymentStatusMessage}
          show={showPaymentStatusModal}
          onRetry={handlePaymentRetry}
          onClose={() => setShowPaymentStatusModal(false)}
          verificationProgress={verificationProgress}
          verificationStep={verificationStep}
          verificationAttempts={verificationAttempts}
          maxVerificationAttempts={maxVerificationAttempts}
        />
      )}
    </motion.div>
    )}
    </PaymentSDKLoader>
  );
});

export default CheckoutForm;
