import React, { useState, useEffect, memo, useCallback, createContext, useContext } from 'react';
import React, { useState, useEffect, memo, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';

// Import enhanced components
import EmptyCart from './EmptyCart';
import OrderTypeSelector from './OrderTypeSelector';

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

// Create a context for order type
const OrderTypeContext = createContext({
  orderType: 'dineIn',
  setOrderType: () => {}
});

// Hook to use order type
export const useOrderType = () => useContext(OrderTypeContext);

// OrderTypeProvider component to provide order type state to nested components
const OrderTypeProvider = ({ children }) => {
  const [orderType, setOrderType] = useState('dineIn');
  
  return (
    <OrderTypeContext.Provider value={{ orderType, setOrderType }}>
      {children}
    </OrderTypeContext.Provider>
  );
};

// CheckoutForm component for the checkout step
const CheckoutForm = memo(() => {
  const { cartItems, cartTotal, orderNote, setOrderNote } = useCart();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  // Handle form submission through a custom event
  const handleSubmit = (e) => {
    e.preventDefault();
    // Dispatch custom event to be handled by parent component
    document.dispatchEvent(
      new CustomEvent('placeOrder', { 
        detail: { customerInfo, orderNote }
      })
    );
  };
  
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <form onSubmit={handleSubmit}>
        {/* Customer information fields */}
        <div style={{ marginBottom: theme.spacing.lg }}>
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
            value={customerInfo.name}
            onChange={handleInputChange}
            placeholder="Your Name"
            required
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${formErrors.name ? theme.colors.danger : theme.colors.border}`,
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
        
        <div style={{ marginBottom: theme.spacing.lg }}>
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
            value={customerInfo.phone}
            onChange={handleInputChange}
            placeholder="Your Phone Number"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${formErrors.phone ? theme.colors.danger : theme.colors.border}`,
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
        
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label 
            htmlFor="orderNote" 
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
            id="orderNote"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Special instructions for your order"
            style={{
              width: '100%',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: 'white',
              outline: 'none',
              transition: theme.transitions.fast,
              resize: 'vertical',
              minHeight: '100px',
              fontFamily: 'inherit',
              fontSize: theme.typography.sizes.sm
            }}
          />
        </div>
        
        {/* Order summary section */}
        <div style={{
          backgroundColor: theme.colors.background,
          padding: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.xl,
          boxShadow: theme.shadows.sm
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0',
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary
          }}>
            Order Summary
          </h4>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            <span>Items ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: theme.spacing.md,
            paddingTop: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary
          }}>
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <button
          type="submit"
          style={{
            width: '100%',
            backgroundColor: theme.colors.primary,
            color: theme.colors.text.light,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
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
      </form>
    </motion.div>
  );
});

// OrderConfirmation component for the confirmation step
const OrderConfirmation = memo(() => {
  const { cartItems, cartTotal, orderNote, clearCart, currentOrder } = useCart();
  const { restaurant, branch, table } = useRestaurant();
  const { orderType } = useOrderType();
  
  // Function to get a formatted order ID for display
  const getFormattedOrderId = () => {
    if (currentOrder && currentOrder._id) {
      return currentOrder._id.substring(0, 8).toUpperCase();
    }
    return 'PENDING';
  };
  
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: theme.spacing.xl,
        textAlign: 'center'
      }}
    >
      <div style={{
        backgroundColor: theme.colors.success + '20',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
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
        Your order #{getFormattedOrderId()} has been received
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
          <strong>Restaurant:</strong> {restaurant?.name || 'Your Restaurant'}
        </p>
        <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
          <strong>Branch:</strong> {branch?.name || 'Main Branch'}
        </p>
        {table && (
          <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
            <strong>Table:</strong> {table?.name || 'Table'}
          </p>
        )}
        <p style={{ margin: `${theme.spacing.xs} 0`, fontSize: theme.typography.sizes.md, color: theme.colors.text.secondary }}>
          <strong>Order Type:</strong> {orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}
        </p>
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
            // Dispatch event to set checkout step back to cart
            document.dispatchEvent(new CustomEvent('resetCart'));
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
            clearCart();
            // Dispatch event to set checkout step back to cart
            document.dispatchEvent(new CustomEvent('resetCart'));
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
});

// StepsIndicator component for showing checkout progress
const StepsIndicator = memo(({ checkoutStep = 'cart' }) => {
  // Define steps configuration
  const steps = [
    { id: 'cart', label: 'Cart', number: 1, icon: 'shopping_cart' },
    { id: 'checkout', label: 'Checkout', number: 2, icon: 'credit_card' },
    { id: 'confirmation', label: 'Confirmation', number: 3, icon: 'check_circle' }
  ];
  
  // Helper function to determine step status
  const getStepStatus = (stepId) => {
    const stepOrder = { cart: 1, checkout: 2, confirmation: 3 };
    const currentStepOrder = stepOrder[checkoutStep];
    const thisStepOrder = stepOrder[stepId];
    
    if (stepId === checkoutStep) return 'active';
    if (thisStepOrder < currentStepOrder) return 'completed';
    return 'upcoming';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        margin: `${theme.spacing.lg} 0`,
        position: 'relative',
        padding: `0 ${theme.spacing.sm}`
      }}
    >
      {/* Line connecting steps */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '10%',
        right: '10%',
        height: '3px',
        background: `linear-gradient(to right, 
          ${theme.colors.success}, 
          ${checkoutStep === 'cart' ? theme.colors.border : 
            checkoutStep === 'checkout' ? `${theme.colors.success} 50%, ${theme.colors.border} 50%` : 
            theme.colors.success}
        )`,
        zIndex: 0
      }}/>
      
      {/* Render all steps */}
      {steps.map((step) => {
        const status = getStepStatus(step.id);
        
        return (
          <div key={step.id} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            zIndex: 1,
            width: '33.333%'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: status === 'active' ? theme.colors.primary : 
                               status === 'completed' ? theme.colors.success : 
                               theme.colors.background,
              border: `2px solid ${status === 'active' ? theme.colors.primary : 
                                  status === 'completed' ? theme.colors.success : 
                                  theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.xs,
              color: (status === 'active' || status === 'completed') ? theme.colors.text.light : theme.colors.text.secondary,
              fontWeight: theme.typography.fontWeights.semibold,
              boxShadow: status === 'active' ? theme.shadows.md : 'none',
              transition: 'all 0.3s ease'
            }}>
              {status === 'completed' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <span className="material-icons" style={{ fontSize: '18px' }}>
                  {step.icon}
                </span>
              )}
            </div>
            <div style={{ 
              fontSize: theme.typography.sizes.sm, 
              color: status === 'active' ? theme.colors.primary : 
                     status === 'completed' ? theme.colors.success : 
                     theme.colors.text.secondary,
              fontWeight: status === 'active' ? theme.typography.fontWeights.semibold : theme.typography.fontWeights.medium,
              transition: 'all 0.3s ease',
              textAlign: 'center'
            }}>
              {step.label}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
});

// Import enhanced OrderTypeSelector component
import EnhancedOrderTypeSelector from './OrderTypeSelector';

// Standalone OrderTypeSelector component that uses the context (using the enhanced version)
const StandaloneOrderTypeSelector = memo(() => <EnhancedOrderTypeSelector />);

// Original OrderTypeSelector (keeping for backward compatibility)
const OrderTypeSelector = memo(({ orderType, setOrderType }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: `${theme.spacing.md} 0`,
      marginBottom: theme.spacing.md,
    }}>
      <button
        onClick={() => setOrderType('dineIn')}
        style={{
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          border: 'none',
          background: orderType === 'dineIn' ? theme.colors.primary : theme.colors.background,
          color: orderType === 'dineIn' ? theme.colors.text.light : theme.colors.text.primary,
          cursor: 'pointer',
          fontWeight: theme.typography.fontWeights.medium,
          boxShadow: orderType === 'dineIn' ? theme.shadows.md : theme.shadows.sm,
          transition: theme.transitions.fast
        }}
      >
        Dine In
      </button>
      
      <button
        onClick={() => setOrderType('takeaway')}
        style={{
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          border: 'none',
          background: orderType === 'takeaway' ? theme.colors.primary : theme.colors.background,
          color: orderType === 'takeaway' ? theme.colors.text.light : theme.colors.text.primary,
          cursor: 'pointer',
          fontWeight: theme.typography.fontWeights.medium,
          boxShadow: orderType === 'takeaway' ? theme.shadows.md : theme.shadows.sm,
          transition: theme.transitions.fast
        }}
      >
        Takeaway
      </button>
    </div>
  );
});

// Import enhanced EmptyCart component
import EmptyCart from './EmptyCart';

// CartItem component - represents a single item in the cart
const CartItem = memo(({ item, updateQuantity, removeFromCart }) => {
  // State for handling quantity update loading
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  // Handle quantity change with loading state
  const handleQuantityChange = async (newQuantity) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    try {
      await updateQuantity(item.id, newQuantity, item.selectedOptions);
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Could implement error feedback here
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle item removal with loading state
  const handleRemove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    
    try {
      await removeFromCart(item.id, item.selectedOptions);
    } catch (error) {
      console.error('Error removing item:', error);
      setIsRemoving(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      style={{
        display: 'flex',
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.md,
        overflow: 'hidden',
        position: 'relative',
        border: `1px solid ${theme.colors.border}`,
        transition: 'all 0.2s ease'
      }}
      whileHover={{ 
        boxShadow: theme.shadows.lg, 
        translateY: -2
      }}
    >
      {/* Item image with gradient overlay */}
      <div style={{ 
        width: '90px',
        height: '90px',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        flexShrink: 0,
        marginRight: theme.spacing.md,
        position: 'relative',
        boxShadow: theme.shadows.sm,
        border: `1px solid ${theme.colors.border}`
      }}>
        <img 
          src={item.image || 'https://via.placeholder.com/150'} 
          alt={item.title || item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease'
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/150?text=Food';
          }}
        />
        {/* Price badge */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
          fontSize: theme.typography.sizes.xs,
          fontWeight: theme.typography.fontWeights.semibold,
          textAlign: 'center'
        }}>
          ${item.price.toFixed(2)}
        </div>
      </div>
      
      {/* Item details */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Conditional rendering for active updating indicator */}
        {isUpdating && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: theme.colors.warning + '30',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2
          }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              border: `2px solid ${theme.colors.warning}`,
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <h4 style={{ 
            margin: '0 0 6px 0',
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary,
            paddingRight: theme.spacing.md
          }}>
            {item.title || item.name}
          </h4>
          
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            aria-label="Remove item"
            style={{
              background: isRemoving ? 'rgba(255,71,87,0.1)' : 'transparent',
              border: 'none',
              padding: '6px',
              cursor: isRemoving ? 'not-allowed' : 'pointer',
              color: isRemoving ? theme.colors.danger : theme.colors.text.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: '-4px',
              marginRight: '-4px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!isRemoving) e.currentTarget.style.backgroundColor = 'rgba(255,71,87,0.1)';
            }}
            onMouseOut={(e) => {
              if (!isRemoving) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isRemoving ? (
              <div style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                border: `2px solid ${theme.colors.danger}`,
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
        
        {/* Item options if any */}
        {item.selectedOptions && item.selectedOptions.length > 0 && (
          <div style={{ 
            margin: '0 0 8px',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary,
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs
          }}>
            {item.selectedOptions.map((option, index) => (
              <span key={`${option.category}-${option.name}-${option.value}`} style={{
                backgroundColor: theme.colors.background,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
                fontSize: theme.typography.sizes.xs,
                border: `1px solid ${theme.colors.border}`
              }}>
                {option.name}: <strong>{option.value}</strong>
              </span>
            ))}
          </div>
        )}
        
        {/* Price and quantity controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: theme.spacing.md
        }}>
          <div style={{ 
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.primary
          }}>
            <span style={{ fontSize: theme.typography.sizes.sm, opacity: 0.8 }}>Total: </span>
            ${(item.price * item.quantity).toFixed(2)}
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            overflow: 'hidden',
            boxShadow: theme.shadows.sm
          }}>
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={item.quantity <= 1 || isUpdating}
              aria-label="Decrease quantity"
              style={{
                background: theme.colors.background,
                border: 'none',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item.quantity > 1 && !isUpdating ? 'pointer' : 'not-allowed',
                opacity: item.quantity > 1 && !isUpdating ? 1 : 0.5,
                transition: 'all 0.2s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            
            <div style={{
              padding: '0 12px',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary,
              backgroundColor: isUpdating ? theme.colors.background : 'white'
            }}>
              {isUpdating ? (
                <div style={{ 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '50%', 
                  border: `2px solid ${theme.colors.border}`,
                  borderTopColor: theme.colors.primary,
                  animation: 'spin 1s linear infinite'
                }} />
              ) : item.quantity}
            </div>
            
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdating}
              aria-label="Increase quantity"
              style={{
                background: theme.colors.background,
                border: 'none',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isUpdating ? 0.7 : 1,
                 color: theme.colors.danger
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// CartContent component - uses CartItem component which is defined above
const CartContent = memo(({ checkoutStep = 'cart' }) => {const { 
    cartItems, 
    cartTotal,
    updateQuantity: handleQuantityChange, 
    removeFromCart: handleRemoveFromCart,
    clearCart: handleClearCart,
    setCheckoutStep
  } = useCart();
  
  const { orderType, setOrderType } = useOrderType();
    // Local cart total calculation to fix "calculateCartTotal is not defined" error
  const calculateCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);
  
  // Local handleProceedToCheckout function
  const handleProceedToCheckout = useCallback(() => {
    if (cartItems.length > 0) {
      // Use hook from parent context to set checkout step
      // This is a simplified version that works with Cart.jsx context
      useCart().setCheckoutStep?.('checkout');
    }
  }, [cartItems]);
  
  return (
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
      {/* Order Type Selector */}
      {cartItems.length > 0 && <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} />}      {/* Show steps indicator only if cart has items */}
      {cartItems.length > 0 && <StepsIndicator checkoutStep={checkoutStep} />}
      
      <div style={{ 
        overflowY: 'auto',
        flex: 1, 
        paddingRight: theme.spacing.sm
      }}>
        <AnimatePresence>
          {cartItems.map((item) => (
            <CartItem 
              key={`${item.id}-${JSON.stringify(item.selectedOptions)}`} 
              item={item} 
              updateQuantity={handleQuantityChange}
              removeFromCart={handleRemoveFromCart}
            />
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
              onClick={handleClearCart}
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
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Clear Cart
            </button>
          </motion.div>
        )}
      </div>
      
      {/* Bottom section with subtotal and checkout button */}
      {cartItems.length > 0 && (
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          marginTop: 'auto',
          padding: `${theme.spacing.md} 0`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <span style={{ 
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.secondary
            }}>
              Subtotal
            </span>
            <span style={{ 
              fontSize: theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary
            }}>
              ${cartTotal.toFixed(2)}
            </span>
          </div>
            <button
            onClick={() => {
              // Inline handler to trigger checkout step change
              document.dispatchEvent(new CustomEvent('proceedToCheckout'));
            }}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: theme.transitions.fast
            }}
          >
            Proceed to Checkout
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginLeft: theme.spacing.sm }}
            >
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
});

// Wrap the cart with OrderTypeProvider to isolate state
const CartWithProvider = ({ isOpen, onClose }) => {
  return (
    <OrderTypeProvider>
      <CartComponent isOpen={isOpen} onClose={onClose} />
    </OrderTypeProvider>
  );
};

// Main Cart component
const CartComponent = ({ isOpen, onClose }) => {
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
    setOrderPlaced,
    currentOrder,
    setCurrentOrder
  } = useCart();
  const { orderType, setOrderType } = useOrderType();
  const { restaurant, branch, table } = useRestaurant();
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset checkout step when cart is opened
  useEffect(() => {
    if (isOpen) {
      if (cartItems.length === 0) {
        setCheckoutStep('cart');
      }
    }
  }, [isOpen, cartItems.length]);
    // Reset to cart step when all items are removed
  useEffect(() => {
    if (cartItems.length === 0 && checkoutStep !== 'confirmation') {
      setCheckoutStep('cart');
    }
  }, [cartItems.length, checkoutStep]);
    // Listen for the custom events from child components
  useEffect(() => {
    // Handler for proceeding to checkout step
    const handleProceedToCheckout = () => {
      if (cartItems.length > 0) {
        setCheckoutStep('checkout');
      }
    };
      // Handler for placing an order
    const handlePlaceOrderEvent = async (event) => {
      if (cartItems.length > 0) {
        try {
          // Start loading state
          setIsSubmitting(true);
          
          // Extract data from the event
          const { customerInfo, orderNote } = event.detail;
          
          // Call the placeOrder function from the context
          const orderResponse = await placeOrder({
            customerInfo,
            orderType,
            note: orderNote
          });
          
          if (orderResponse && orderResponse._id) {
            setCheckoutStep('confirmation');
            setOrderPlaced(true);
            setCurrentOrder(orderResponse);
            
            // Reset form fields for next use
            setCustomerInfo({
              name: '',
              phone: '',
              email: '',
            });
            setFormErrors({});
          }
        } catch (error) {
          console.error('Error placing order:', error);
          // Could show error to user here
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    
    // Handler for resetting the cart
    const handleResetCart = () => {
      setCheckoutStep('cart');
    };
      // Add event listeners
    document.addEventListener('proceedToCheckout', handleProceedToCheckout);
    document.addEventListener('placeOrder', handlePlaceOrderEvent);
    document.addEventListener('resetCart', handleResetCart);
    
    // Clean up when component unmounts
    return () => {
      document.removeEventListener('proceedToCheckout', handleProceedToCheckout);
      document.removeEventListener('placeOrder', handlePlaceOrderEvent);
      document.removeEventListener('resetCart', handleResetCart);
    };
  }, [cartItems, placeOrder, orderType, setCurrentOrder, setOrderPlaced, setCheckoutStep, setIsSubmitting]);
  
  // Helper functions
  const calculateCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);
  
  const handleProceedToCheckout = useCallback(() => {
    if (cartItems.length > 0) {
      setCheckoutStep('checkout');
    }
  }, [cartItems.length]);
  
  const handleQuantityChange = useCallback((id, newQuantity, selectedOptions) => {
    updateQuantity(id, newQuantity, selectedOptions);
  }, [updateQuantity]);
  
  const handleRemoveFromCart = useCallback((id, selectedOptions) => {
    removeFromCart(id, selectedOptions);
  }, [removeFromCart]);
  
  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);
  
  const handleInputChange = useCallback((e) => {
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
  }, [formErrors]);
  
  // Form validation
  const validateForm = useCallback(() => {
    let errors = {};
    let isValid = true;
    
    // Name is required
    if (!customerInfo.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    }
    
    // Phone validation if provided
    if (customerInfo.phone && !/^[0-9+\s()-]{10,15}$/.test(customerInfo.phone)) {
      errors.phone = "Please enter a valid phone number";
      isValid = false;
    }
    
    // Email validation if provided
    if (customerInfo.email && !/\S+@\S+\.\S+/.test(customerInfo.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  }, [customerInfo]);
  
  // Handle form submission
  const handlePlaceOrder = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
        const orderResponse = await placeOrder({
        customerInfo,
        orderType, // Use the orderType we get from useOrderType() hook at the component level
        note: orderNote
      });
      
      if (orderResponse && orderResponse._id) {
        setCheckoutStep('confirmation');
        setOrderPlaced(true);
        setCurrentOrder(orderResponse);
        
        // Optionally reset form fields for next use
        setCustomerInfo({
          name: '',
          phone: '',
          email: '',
        });
        setFormErrors({});
      }
    } catch (error) {
      console.error('Error placing order:', error);
      // Show error to user    } finally {
      setIsSubmitting(false);
    }
  }, [customerInfo, orderNote, orderType, placeOrder, setCurrentOrder, setOrderPlaced, validateForm]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              backdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
          />          <motion.div
            variants={slideIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="cart-container"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'white',
              boxShadow: theme.shadows.lg,
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
              borderTopLeftRadius: theme.borderRadius.lg,
              borderBottomLeftRadius: theme.borderRadius.lg
            }}
          >            {/* Cart header with improved styling */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderBottom: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {checkoutStep === 'cart' && (
                  <span className="material-icons" style={{ 
                    marginRight: theme.spacing.sm, 
                    fontSize: '24px',
                    color: theme.colors.primary 
                  }}>
                    shopping_cart
                  </span>
                )}
                {checkoutStep === 'checkout' && (
                  <span className="material-icons" style={{ 
                    marginRight: theme.spacing.sm, 
                    fontSize: '24px',
                    color: theme.colors.primary 
                  }}>
                    credit_card
                  </span>
                )}
                {checkoutStep === 'confirmation' && (
                  <span className="material-icons" style={{ 
                    marginRight: theme.spacing.sm, 
                    fontSize: '24px',
                    color: theme.colors.success
                  }}>
                    check_circle
                  </span>
                )}
                <h2 style={{ 
                  margin: 0, 
                  fontSize: theme.typography.sizes.xl,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: theme.colors.text.primary
                }}>
                  {checkoutStep === 'cart' && 'Your Cart'}
                  {checkoutStep === 'checkout' && 'Checkout'}
                  {checkoutStep === 'confirmation' && 'Order Confirmation'}
                </h2>
              </div>
                {/* Enhanced close button with hover effects */}
              {checkoutStep !== 'confirmation' && (
                <button
                  onClick={onClose}
                  aria-label="Close cart"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: theme.transitions.fast,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    color: theme.colors.text.secondary,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.background;
                    const svg = e.currentTarget.querySelector('svg');
                    if (svg) svg.style.stroke = theme.colors.danger;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    const svg = e.currentTarget.querySelector('svg');
                    if (svg) svg.style.stroke = theme.colors.text.secondary;
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.colors.text.secondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: theme.transitions.fast }}
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
              {/* Enhanced content container with better scrolling and visual styling */}
            <div style={{ 
              padding: `0 ${theme.spacing.lg}`, 
              flex: 1, 
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100% - 80px)', // Subtract header height
              overflowY: 'auto',
              backgroundColor: theme.colors.background,
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.colors.border} transparent`,
              borderTop: `1px solid ${theme.colors.border}10`,
              borderBottom: `1px solid ${theme.colors.border}10`
            }}>
              {/* Steps indicator only shown at the top of the content */}
              {checkoutStep && (
                <div style={{ 
                  paddingTop: theme.spacing.md, 
                  position: 'sticky', 
                  top: 0, 
                  backgroundColor: theme.colors.background,
                  zIndex: 5
                }}>
                  <StepsIndicator checkoutStep={checkoutStep} />
                </div>
              )}
              
              {/* Loading state */}
              {isLoading && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: `${theme.spacing.xl} 0`,
                  height: '200px'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: theme.spacing.md
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%',
                      border: `3px solid ${theme.colors.border}`,
                      borderTopColor: theme.colors.primary,
                      animation: 'spin 1s linear infinite',
                    }} />
                    <p style={{ color: theme.colors.text.secondary }}>Loading your cart...</p>
                  </div>
                </div>
              )}
              
              {/* Content with transitions */}
              <AnimatePresence mode="wait">
                {!isLoading && cartItems.length === 0 && checkoutStep === 'cart' && <EmptyCart key="empty" />}
                {!isLoading && cartItems.length > 0 && checkoutStep === 'cart' && <CartContent key="cart" checkoutStep={checkoutStep} />}
                {!isLoading && checkoutStep === 'checkout' && <CheckoutForm key="checkout" />}
                {!isLoading && checkoutStep === 'confirmation' && <OrderConfirmation key="confirmation" />}
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

// Export the wrapped component with isolated state
export default CartWithProvider;
