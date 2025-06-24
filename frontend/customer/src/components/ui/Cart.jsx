import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';

// Animation variants
const slideIn = {
  hidden: { x: '100%' },
  visible: { 
    x: '0%',
    transition: { 
      type: 'spring', 
      damping: 25,
      stiffness: 300
    } 
  },
  exit: { 
    x: '100%',
    transition: { 
      type: 'spring', 
      damping: 30,
      stiffness: 300
    } 
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 } 
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 } 
  }
};

const Cart = ({ isOpen, onClose }) => {
  const { 
    cartItems, 
    cartTotal, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    placeOrder,
    orderNote,
    setOrderNote,
    orderPlaced,
    currentOrder,
    orderLoading,
    orderError
  } = useCart();
  
  const { restaurant, branch, table } = useRestaurant();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'checkout', 'confirmation'
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset checkout step when cart is opened
  useEffect(() => {
    if (isOpen) {
      // Only reset to cart if we don't have a confirmed order
      if (checkoutStep === 'confirmation' && !currentOrder) {
        setCheckoutStep('cart');
      }
    }
  }, [isOpen, currentOrder]);
  
  // Handle input change for customer info form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear the specific error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Validate customer form
  const validateForm = () => {
    const errors = {};
    
    if (!customerInfo.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (customerInfo.phone && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(customerInfo.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (customerInfo.email && !/\S+@\S+\.\S+/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle order submission
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const order = await placeOrder(customerInfo);
      if (order) {
        setCheckoutStep('confirmation');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get subtotal (before any taxes or fees)
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  // Empty cart message
  const EmptyCart = () => (
    <motion.div 
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ 
        textAlign: 'center', 
        padding: theme.spacing['2xl'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh'
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: theme.borderRadius.pill,
        backgroundColor: `${theme.colors.background}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.lg
      }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={theme.colors.text.secondary}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </div>
      
      <h3 style={{ 
        fontSize: theme.typography.sizes['2xl'], 
        fontWeight: theme.typography.fontWeights.bold, 
        margin: `${theme.spacing.sm} 0`,
        color: theme.colors.text.primary
      }}>
        Your cart is empty
      </h3>
      
      <p style={{ 
        fontSize: theme.typography.sizes.md, 
        color: theme.colors.text.secondary,
        maxWidth: '280px',
        margin: `${theme.spacing.md} 0`
      }}>
        Add some delicious items from the menu to get started!
      </p>
      
      <button
        onClick={onClose}
        style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.text.light,
          border: 'none',
          borderRadius: theme.borderRadius.md,
          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
          fontSize: theme.typography.sizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          marginTop: theme.spacing.lg,
          cursor: 'pointer',
          transition: theme.transitions.fast,
          boxShadow: theme.shadows.sm
        }}
      >
        Browse Menu
      </button>
    </motion.div>
  );

  // Order confirmation display
  const OrderConfirmation = () => (
    <motion.div 
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ 
        textAlign: 'center', 
        padding: `${theme.spacing.xl} ${theme.spacing.md}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: theme.borderRadius.pill,
        backgroundColor: '#d1f5d3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
        boxShadow: theme.shadows.sm
      }}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="40" 
          height="40" 
          viewBox="0 0 24 24" 
          fill="none"
          stroke={theme.colors.success}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      
      <h2 style={{ 
        fontSize: theme.typography.sizes['3xl'], 
        fontWeight: theme.typography.fontWeights.bold, 
        margin: `${theme.spacing.sm} 0`,
        color: theme.colors.text.primary
      }}>
        Order Placed Successfully!
      </h2>
      
      <p style={{ 
        fontSize: theme.typography.sizes.lg, 
        color: theme.colors.text.secondary,
        margin: `${theme.spacing.sm} 0 ${theme.spacing.xl} 0`
      }}>
        Your order #{currentOrder?._id?.substring(0, 8)} has been received
      </p>
      
      <div style={{
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        width: '100%',
        textAlign: 'left',
        marginBottom: theme.spacing.xl,
        boxShadow: theme.shadows.sm
      }}>
        <h4 style={{ 
          marginBottom: theme.spacing.md, 
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.semibold 
        }}>
          Order Details:
        </h4>
        
        <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
          <strong>Restaurant:</strong> {restaurant?.name}
        </p>
        <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
          <strong>Branch:</strong> {branch?.name}
        </p>
        {table && (
          <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
            <strong>Table:</strong> {table?.name}
          </p>
        )}
        <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
          <strong>Total Amount:</strong> ${cartTotal.toFixed(2)}
        </p>
        <p style={{ 
          margin: `${theme.spacing.xs} 0`, 
          fontSize: theme.typography.sizes.md, 
          color: theme.colors.text.secondary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}>
          <strong>Status:</strong> 
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#d1f5d3',
            color: theme.colors.success,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.pill,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}>
            {currentOrder?.status || 'Pending'}
          </span>
        </p>

        {/* Only show if customer provided information */}
        {(customerInfo.name || customerInfo.phone || customerInfo.email) && (
          <>
            <h4 style={{ 
              margin: `${theme.spacing.lg} 0 ${theme.spacing.sm} 0`, 
              color: theme.colors.text.primary,
              fontSize: theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.semibold 
            }}>
              Customer Information:
            </h4>
            
            <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
              <strong>Name:</strong> {customerInfo.name}
            </p>
            
            {customerInfo.phone && (
              <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
                <strong>Phone:</strong> {customerInfo.phone}
              </p>
            )}
            
            {customerInfo.email && (
              <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
                <strong>Email:</strong> {customerInfo.email}
              </p>
            )}
          </>
        )}
        
        {/* Show order notes if provided */}
        {orderNote && (
          <>
            <h4 style={{ 
              margin: `${theme.spacing.lg} 0 ${theme.spacing.sm} 0`, 
              color: theme.colors.text.primary,
              fontSize: theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.semibold 
            }}>
              Order Notes:
            </h4>
            <p style={{ 
              margin: `${theme.spacing.xs} 0`, 
              fontSize: theme.typography.sizes.md, 
              color: theme.colors.text.secondary,
              fontStyle: 'italic'
            }}>
              "{orderNote}"
            </p>
          </>
        )}
      </div>
      
      <div style={{ width: '100%', display: 'flex', gap: theme.spacing.md }}>
        <button
          onClick={() => {
            clearCart();
            setCheckoutStep('cart');
            onClose();
          }}
          style={{
            flex: 1,
            backgroundColor: theme.colors.primary,
            color: theme.colors.text.light,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast,
            boxShadow: theme.shadows.sm
          }}
        >
          Back to Menu
        </button>
        
        <button
          onClick={() => {
            // Start a new order
            clearCart();
            setCheckoutStep('cart');
          }}
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast
          }}
        >
          New Order
        </button>
      </div>
    </motion.div>
  );
  
  // Cart item component
  const CartItem = ({ item }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: `${theme.spacing.md} 0`,
        borderBottom: `1px solid ${theme.colors.border}`
      }}
    >
      <div style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <h4 style={{ 
          margin: `0 0 ${theme.spacing.xs} 0`, 
          fontSize: theme.typography.sizes.lg, 
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.text.primary 
        }}>
          {item.title}
        </h4>
        
        {item.selectedOptions && item.selectedOptions.length > 0 && (
          <div style={{ margin: `${theme.spacing.xs} 0` }}>
            {item.selectedOptions.map((option, index) => (
              <span 
                key={index} 
                style={{ 
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.secondary,
                  backgroundColor: theme.colors.background,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.pill,
                  marginRight: theme.spacing.xs,
                  marginBottom: theme.spacing.xs,
                  display: 'inline-block'
                }}
              >
                {option.name}: {option.value}
              </span>
            ))}
          </div>
        )}
        
        <div style={{ 
          fontSize: theme.typography.sizes.lg,  
          marginTop: theme.spacing.xs,
          color: theme.colors.primary,
          fontWeight: theme.typography.fontWeights.semibold
        }}>
          ${item.price.toFixed(2)}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.sm,
          overflow: 'hidden',
          boxShadow: theme.shadows.sm
        }}>
          <button 
            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.selectedOptions)}
            style={{
              backgroundColor: theme.colors.background,
              border: 'none',
              padding: theme.spacing.sm,
              cursor: 'pointer',
              fontSize: theme.typography.sizes.lg,
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px'
            }}
          >
            −
          </button>
          
          <span style={{ 
            padding: `0 ${theme.spacing.md}`,
            fontWeight: theme.typography.fontWeights.semibold,
            fontSize: theme.typography.sizes.md
          }}>
            {item.quantity}
          </span>
          
          <button 
            onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedOptions)}
            style={{
              backgroundColor: theme.colors.background,
              border: 'none',
              padding: theme.spacing.sm,
              cursor: 'pointer',
              fontSize: theme.typography.sizes.lg,
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px'
            }}
          >
            +
          </button>
        </div>
        
        <button 
          onClick={() => removeFromCart(item.id, item.selectedOptions)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: theme.colors.danger,
            padding: theme.spacing.sm,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium,
            cursor: 'pointer',
            marginTop: theme.spacing.xs,
            transition: theme.transitions.fast
          }}
        >
          Remove
        </button>
      </div>
    </motion.div>
  );

  // Checkout summary
  const CheckoutSummary = () => {
    const subtotal = getSubtotal();
    const tax = subtotal * 0.08; // Example tax calculation (8%)
    
    return (
      <div style={{
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg
      }}>
        <h3 style={{ 
          marginBottom: theme.spacing.md, 
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.lg,
          fontWeight: theme.typography.fontWeights.semibold
        }}>
          Order Summary
        </h3>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm
        }}>
          <span style={{ color: theme.colors.text.secondary }}>Subtotal</span>
          <span style={{ fontWeight: theme.typography.fontWeights.medium }}>${subtotal.toFixed(2)}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.sm
        }}>
          <span style={{ color: theme.colors.text.secondary }}>Tax</span>
          <span style={{ fontWeight: theme.typography.fontWeights.medium }}>${tax.toFixed(2)}</span>
        </div>
        
        {restaurant && restaurant.deliveryFee > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm
          }}>
            <span style={{ color: theme.colors.text.secondary }}>Delivery Fee</span>
            <span style={{ fontWeight: theme.typography.fontWeights.medium }}>${restaurant.deliveryFee.toFixed(2)}</span>
          </div>
        )}
        
        <div style={{
          borderTop: `1px dashed ${theme.colors.border}`,
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.md,
          display: 'flex', 
          justifyContent: 'space-between',
          fontWeight: theme.typography.fontWeights.bold,
          fontSize: theme.typography.sizes.lg
        }}>
          <span>Total</span>
          <span style={{ color: theme.colors.primary }}>${cartTotal.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  // Steps indicator component
  const StepsIndicator = () => {
    const steps = [
      { key: 'cart', label: 'Cart' },
      { key: 'checkout', label: 'Checkout' },
      { key: 'confirmation', label: 'Confirmation' }
    ];
    
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        position: 'relative'
      }}>
        {/* Progress line */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '10%',
          right: '10%',
          height: '2px',
          backgroundColor: theme.colors.border,
          zIndex: 0
        }}/>
        
        {/* Active progress */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '10%',
          width: checkoutStep === 'cart' ? '0%' : checkoutStep === 'checkout' ? '50%' : '100%',
          height: '2px',
          backgroundColor: theme.colors.primary,
          zIndex: 1,
          transition: 'width 0.3s ease'
        }}/>
        
        {steps.map((step, index) => (
          <div 
            key={step.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2
            }}
          >
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: checkoutStep === step.key || 
                                steps.findIndex(s => s.key === checkoutStep) > index 
                                ? theme.colors.primary 
                                : theme.colors.background,
              border: `2px solid ${checkoutStep === step.key || 
                                    steps.findIndex(s => s.key === checkoutStep) > index 
                                    ? theme.colors.primary 
                                    : theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.xs,
              color: checkoutStep === step.key || 
                      steps.findIndex(s => s.key === checkoutStep) > index 
                      ? theme.colors.text.light 
                      : theme.colors.text.secondary,
              fontWeight: theme.typography.fontWeights.bold,
              fontSize: theme.typography.sizes.sm,
              transition: theme.transitions.fast
            }}>
              {steps.findIndex(s => s.key === checkoutStep) > index ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span style={{
              fontSize: theme.typography.sizes.xs,
              color: checkoutStep === step.key ? theme.colors.text.primary : theme.colors.text.secondary,
              fontWeight: checkoutStep === step.key ? theme.typography.fontWeights.medium : theme.typography.fontWeights.regular
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Checkout form component
  const CheckoutForm = () => (
    <motion.div 
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ padding: `${theme.spacing.md} 0` }}
    >
      <StepsIndicator />
      
      <div style={{ marginBottom: theme.spacing.lg }}>
        <h3 style={{ 
          marginBottom: theme.spacing.md, 
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.xl,
          fontWeight: theme.typography.fontWeights.semibold 
        }}>
          Customer Information
        </h3>
        
        <div style={{ marginBottom: theme.spacing.md }}>
          <label 
            htmlFor="name" 
            style={{ 
              display: 'block', 
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.secondary
            }}
          >
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={customerInfo.name}
            onChange={handleInputChange}
            placeholder="Your Name"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${formErrors.name ? theme.colors.danger : theme.colors.border}`,
              fontSize: theme.typography.sizes.md,
              backgroundColor: formErrors.name ? 'rgba(255,71,87,0.05)' : 'white',
              outline: 'none',
              transition: theme.transitions.fast
            }}
          />
          {formErrors.name && (
            <p style={{ 
              color: theme.colors.danger, 
              fontSize: theme.typography.sizes.sm,
              marginTop: theme.spacing.xs 
            }}>
              {formErrors.name}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: theme.spacing.md }}>
          <label 
            htmlFor="phone" 
            style={{ 
              display: 'block', 
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.secondary
            }}
          >
            Phone Number (optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={customerInfo.phone}
            onChange={handleInputChange}
            placeholder="Your Phone Number"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${formErrors.phone ? theme.colors.danger : theme.colors.border}`,
              fontSize: theme.typography.sizes.md,
              backgroundColor: formErrors.phone ? 'rgba(255,71,87,0.05)' : 'white',
              outline: 'none',
              transition: theme.transitions.fast
            }}
          />
          {formErrors.phone && (
            <p style={{ 
              color: theme.colors.danger, 
              fontSize: theme.typography.sizes.sm,
              marginTop: theme.spacing.xs 
            }}>
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
              color: theme.colors.text.secondary
            }}
          >
            Email (optional)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={customerInfo.email}
            onChange={handleInputChange}
            placeholder="Your Email Address"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${formErrors.email ? theme.colors.danger : theme.colors.border}`,
              fontSize: theme.typography.sizes.md,
              backgroundColor: formErrors.email ? 'rgba(255,71,87,0.05)' : 'white',
              outline: 'none',
              transition: theme.transitions.fast
            }}
          />
          {formErrors.email && (
            <p style={{ 
              color: theme.colors.danger, 
              fontSize: theme.typography.sizes.sm,
              marginTop: theme.spacing.xs 
            }}>
              {formErrors.email}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: theme.spacing.xl }}>
          <label 
            htmlFor="note" 
            style={{ 
              display: 'block', 
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.secondary
            }}
          >
            Order Notes (optional)
          </label>
          <textarea
            id="note"
            name="note"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Special instructions for your order..."
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              fontSize: theme.typography.sizes.md,
              minHeight: '80px',
              resize: 'vertical',
              outline: 'none',
              transition: theme.transitions.fast
            }}
          />
        </div>
      </div>
      
      <CheckoutSummary />
      
      {orderError && (
        <div style={{
          padding: theme.spacing.md,
          backgroundColor: 'rgba(255,71,87,0.1)',
          borderRadius: theme.borderRadius.md,
          color: theme.colors.danger,
          marginBottom: theme.spacing.lg,
          fontSize: theme.typography.sizes.sm,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {orderError}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: theme.spacing.md }}>
        <button
          onClick={() => setCheckoutStep('cart')}
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text.primary,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast
          }}
        >
          Back to Cart
        </button>
        
        <button
          onClick={handleSubmitOrder}
          disabled={isSubmitting || !customerInfo.name}
          style={{
            flex: 2,
            backgroundColor: theme.colors.primary,
            opacity: isSubmitting || !customerInfo.name ? 0.7 : 1,
            color: theme.colors.text.light,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: isSubmitting || !customerInfo.name ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: theme.transitions.fast
          }}
        >
          {isSubmitting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                animation: 'spin 1s linear infinite',
              }} />
              Processing...
            </div>
          ) : (
            `Place Order • $${cartTotal.toFixed(2)}`
          )}
        </button>
      </div>
    </motion.div>
  );

  const CartContent = () => (
    <motion.div 
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Show steps indicator only if cart has items */}
      {cartItems.length > 0 && <StepsIndicator />}
      
      <div style={{ 
        overflowY: 'auto',
        flex: 1, 
        paddingRight: theme.spacing.sm
      }}>
        <AnimatePresence>
          {cartItems.map((item, index) => (
            <CartItem key={`${item.id}-${JSON.stringify(item.selectedOptions)}`} item={item} />
          ))}
        </AnimatePresence>
        
        {cartItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: theme.spacing.md
            }}
          >
            <button
              onClick={clearCart}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.danger,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                transition: theme.transitions.fast
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Clear Cart
            </button>
          </motion.div>
        )}
      </div>
      
      {cartItems.length > 0 && (
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          padding: `${theme.spacing.lg} 0`,
          marginTop: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.fontWeights.bold,
            marginBottom: theme.spacing.lg
          }}>
            <span>Total</span>
            <span style={{ color: theme.colors.primary }}>${cartTotal.toFixed(2)}</span>
          </div>
          
          <button
            onClick={() => setCheckoutStep('checkout')}
            disabled={cartItems.length === 0}
            style={{
              width: '100%',
              backgroundColor: theme.colors.primary,
              opacity: cartItems.length === 0 ? 0.7 : 1,
              color: theme.colors.text.light,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: theme.shadows.sm,
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm
            }}
          >
            Proceed to Checkout
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              backdropFilter: 'blur(2px)'
            }}
            onClick={onClose}
          />
          
          <motion.div
            variants={slideIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '450px',
              backgroundColor: 'white',
              boxShadow: theme.shadows.xl,
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              borderTopLeftRadius: theme.borderRadius.lg,
              borderBottomLeftRadius: theme.borderRadius.lg,
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: theme.spacing.lg,
              borderBottom: `1px solid ${theme.colors.border}`,
              backgroundColor: 'white'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: theme.typography.sizes['2xl'], 
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.text.primary
              }}>
                {checkoutStep === 'cart' && 'Your Cart'}
                {checkoutStep === 'checkout' && 'Checkout'}
                {checkoutStep === 'confirmation' && 'Order Confirmation'}
              </h2>
              
              {checkoutStep !== 'confirmation' && (
                <button
                  onClick={onClose}
                  style={{
                    backgroundColor: theme.colors.background,
                    border: 'none',
                    borderRadius: theme.borderRadius.pill,
                    cursor: 'pointer',
                    padding: theme.spacing.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: theme.transitions.fast
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.colors.text.secondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            
            <div style={{ 
              padding: theme.spacing.lg, 
              flex: 1, 
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100% - 80px)', // Subtract header height
              overflowY: 'auto',
              backgroundColor: 'white'
            }}>
              <AnimatePresence mode="wait">
                {cartItems.length === 0 && checkoutStep === 'cart' && <EmptyCart key="empty" />}
                {cartItems.length > 0 && checkoutStep === 'cart' && <CartContent key="cart" />}
                {checkoutStep === 'checkout' && <CheckoutForm key="checkout" />}
                {checkoutStep === 'confirmation' && <OrderConfirmation key="confirmation" />}
              </AnimatePresence>
            </div>
            
            {/* Add a global keyframe for spinner animation */}
            <style jsx global>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Cart;