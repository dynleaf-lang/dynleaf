import React, { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useOrderType } from '../ui/EnhancedCart';
import { theme } from '../../data/theme';

// Enhanced CheckoutForm component with better validation and user feedback
const CheckoutForm = memo(() => {
  const { cartItems, cartTotal, orderNote, setOrderNote } = useCart();
  const { orderType } = useOrderType();
  
  // Form state
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
  
  // Update address field when order type changes
  useEffect(() => {
    if (orderType === 'takeaway') {
      setCustomerInfo(prev => ({
        ...prev,
        address: prev.address || ''
      }));
    }
  }, [orderType]);
  
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
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reset error messages
    setErrorMessage('');
    
    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.form-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Set loading state
    setIsSubmitting(true);
    
    // Prepare order data
    const orderData = {
      customerInfo,
      orderType,
      note: orderNote
    };
    
    try {
      // Dispatch custom event to be handled by parent component
      document.dispatchEvent(
        new CustomEvent('placeOrder', { detail: orderData })
      );
      
      // Show success message (usually this would be after API response)
      setShowSuccessMessage(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccessMessage(false);
      }, 1500);
    } catch (error) {
      console.error('Error in order processing:', error);
      setErrorMessage('There was an error placing your order. We can still proceed to the confirmation page.');
      setIsSubmitting(false);
      
      // Even if there's an error, we'll allow proceeding after a delay
      setTimeout(() => {
        document.dispatchEvent(
          new CustomEvent('forceConfirmation')
        );
      }, 2000);
    }
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
              onClick={() => setErrorMessage('')}
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
        {/* Customer information fields */}
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
        
        {/* Address field for takeaway orders */}
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
            backgroundColor: theme.colors.background,
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
                <span>${(item.price * item.quantity).toFixed(2)}</span>
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
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            <span>Tax</span>
            <span>${(cartTotal * 0.1).toFixed(2)}</span>
          </div>
          
          <div style={{ 
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
            <span>${(cartTotal * 1.1).toFixed(2)}</span>
          </div>
        </motion.div>
        
        {/* Buttons container with back and submit buttons */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl
        }}>
          {/* Back button */}
          <motion.button
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
          </motion.button>
        
          {/* Enhanced submit button with loading state */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={!isSubmitting ? { scale: 1.01 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            style={{
              flex: 1,
              backgroundColor: isSubmitting ? theme.colors.primary + 'aa' : theme.colors.primary,
              color: theme.colors.text.light,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: theme.transitions.fast,
              boxShadow: theme.shadows.md
            }}
          >
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite',
                }} />
                Processing Order...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                <span className="material-icons">shopping_cart_checkout</span>
                {`Place Order • $${(cartTotal * 1.1).toFixed(2)}`}
              </div>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
});

export default CheckoutForm;
