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

// Enhanced CheckoutForm component with better validation and user feedback
const CheckoutForm = memo(() => {
  const { cartItems, cartTotal, orderNote, setOrderNote } = useCart();
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
    
    // Dispatch custom event to be handled by parent component
    document.dispatchEvent(
      new CustomEvent('placeOrder', { 
        detail: { 
          orderData: orderData 
        } 
      })
    );
    
    // Note: Success/error handling is done by the parent component (EnhancedCart)
    // We don't set success message here because we don't know if the API call succeeded yet
  };

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
      
      <form onSubmit={handleSubmit} noValidate>
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
        
          {/* Enhanced submit button with loading state */}
          <motion.button
            type="submit"
            disabled={isSubmitting || registerClosed}
            whileHover={!isSubmitting ? { scale: 1.01 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            style={{
              flex: 1,
              backgroundColor: (isSubmitting || registerClosed) ? theme.colors.primary + 'aa' : theme.colors.primary,
              color: theme.colors.text.light,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: (isSubmitting || registerClosed) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: theme.transitions.fast,
              boxShadow: theme.shadows.md,
              width: '100%',
              marginBottom: theme.spacing.lg,
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
                  Processing Order...
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
                    {`Place Order • `}<CurrencyDisplay amount={cartTotal + calculateTax(cartTotal)} />
                  </>
                )}
              </div>
            )}
          </motion.button>
         
      </form>
    </motion.div>
  );
});

export default CheckoutForm;
