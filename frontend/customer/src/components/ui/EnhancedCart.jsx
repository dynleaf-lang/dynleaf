import React, { useState, useEffect, memo, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { theme } from '../../data/theme';

// Import enhanced components
import EmptyCart from './EmptyCart';
import OrderTypeSelector from './OrderTypeSelector';
import CheckoutForm from './CheckoutForm';
import OrderConfirmation from './OrderConfirmation';

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

// OrderTypeProvider component
const OrderTypeProvider = ({ children }) => {
  const [orderType, setOrderType] = useState('dineIn');
  
  return (
    <OrderTypeContext.Provider value={{ orderType, setOrderType }}>
      {children}
    </OrderTypeContext.Provider>
  );
};

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
      }}>        <img 
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
        }}>          <h4 style={{ 
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
              <span className="material-icons" style={{ fontSize: '18px',  color: theme.colors.primary }}>remove</span>
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
                opacity: isUpdating ? 0.7 : 1
              }}
            >
               <span className="material-icons" style={{ fontSize: '18px',  color: theme.colors.primary }}>add</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// CartContent component
const CartContent = memo(({ checkoutStep = 'cart' }) => {
  const { 
    cartItems, 
    cartTotal,
    updateQuantity: handleQuantityChange, 
    removeFromCart: handleRemoveFromCart,
    clearCart: handleClearCart,
    setCheckoutStep
  } = useCart();
  
  const { orderType } = useOrderType();
  const [isClearing, setIsClearing] = useState(false);
  
  // Handle clear cart with loading state
  const clearCartWithLoading = async () => {
    setIsClearing(true);
    
    try {
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      handleClearCart();
    } finally {
      setIsClearing(false);
    }
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
        height: '100%'
      }}
    >
      {/* Order Type Selector */}
      {cartItems.length > 0 && <OrderTypeSelector />}
      
      <div style={{ 
        overflowY: 'auto',
        flex: 1, 
        paddingRight: theme.spacing.sm,
        marginTop: theme.spacing.md
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
              onClick={clearCartWithLoading}
              disabled={isClearing}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.colors.danger,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                cursor: isClearing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                transition: theme.transitions.fast,
                opacity: isClearing ? 0.7 : 1
              }}
            >
              {isClearing ? (
                <>
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%',
                    border: `2px solid ${theme.colors.danger}40`,
                    borderTopColor: theme.colors.danger,
                    animation: 'spin 1s linear infinite',
                  }} />
                  Clearing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                  Clear Cart
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
      
      {/* Bottom section with subtotal and checkout button */}
      {cartItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            marginTop: 'auto',
            padding: `${theme.spacing.md} 0`,
            backgroundColor: 'white',
            boxShadow: '0 -4px 10px rgba(0,0,0,0.03)',
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <div>
              <span style={{ 
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                display: 'block',
                marginBottom: theme.spacing.xs
              }}>
                Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
              <span style={{ 
                fontSize: theme.typography.sizes.xl,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.text.primary
              }}>
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                document.dispatchEvent(new CustomEvent('proceedToCheckout'));
              }}
              disabled={cartItems.length === 0}
              style={{
                backgroundColor: theme.colors.primary,
                opacity: cartItems.length === 0 ? 0.7 : 1,
                color: theme.colors.text.light,
                border: 'none',
                borderRadius: theme.borderRadius.md,
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.semibold,
                cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: theme.transitions.fast,
                boxShadow: theme.shadows.md,
                minWidth: '180px'
              }}
            >
              Checkout
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
            </motion.button>
          </div>
        </motion.div>
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
  
  // State
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Reset checkout step when cart is opened
  useEffect(() => {
    if (isOpen) {
      if (cartItems.length === 0) {
        setCheckoutStep('cart');
      }
      
      // Simulate loading state for better UX
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
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
        setIsLoading(true);
        
        // Simulate loading for better UX
        setTimeout(() => {
          setCheckoutStep('checkout');
          setIsLoading(false);
        }, 300);
      }
    };
    
    // Handler for placing an order
    const handlePlaceOrderEvent = async (event) => {
      if (cartItems.length > 0) {        try {
          setIsLoading(true);
          setError(null);
          
          // Extract data from the event
          const { orderData } = event.detail;
          
          // Call the placeOrder function from the context
          const orderResponse = await placeOrder({
            customerInfo: orderData.customerInfo,
            orderType: orderData.orderType,
            note: orderData.note
          });
          
          if (orderResponse && orderResponse._id) {
            setCurrentOrder(orderResponse);
            setOrderPlaced(true);
            
            // Delay to show loading state and make transition smoother
            setTimeout(() => {
              setCheckoutStep('confirmation');
              setIsLoading(false);
            }, 1000);
          } else {
            throw new Error('Failed to process order');
          }
        } catch (error) {
          console.error('Error placing order:', error);
          setError('There was an error processing your order. You can try again or continue with a temporary order.');
          
          // Instead of automatically proceeding to confirmation, we'll let the user decide
          // The fallback order will only be created when the user chooses to proceed
          setIsLoading(false);
          
          // Display on screen options - handled by the ErrorRecoveryDialog component in CheckoutForm          // When user clicks "Continue Anyway" in the error message, forceConfirmation event will trigger
        }
      }
    };
    
    // Handler for resetting the cart
    const handleResetCart = () => {
      setCheckoutStep('cart');
    };
      // Handler for going to menu
    const handleGoToMenu = () => {
      onClose();
    };
    
    // Handler for forcing confirmation screen even with errors
    const handleForceConfirmation = () => {
      // Create a fallback order object to allow continued navigation
      const fallbackOrder = {
        _id: 'temp-' + Date.now(),
        items: cartItems.map(item => ({
          menuItemId: item.id,
          name: item.title || item.name,
          quantity: item.quantity,
          price: item.price
        })),
        orderType: orderType,
        totalAmount: cartTotal,
        note: orderNote,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      setCurrentOrder(fallbackOrder);
      setError('There was an issue processing your order, but we\'ve created a temporary order record.');
      
      // Move to confirmation screen
      setIsLoading(true);
      setTimeout(() => {
        setCheckoutStep('confirmation');
        setIsLoading(false);
      }, 500);
    };
    
    // Add event listeners
    document.addEventListener('proceedToCheckout', handleProceedToCheckout);
    document.addEventListener('placeOrder', handlePlaceOrderEvent);
    document.addEventListener('resetCart', handleResetCart);
    document.addEventListener('goToMenu', handleGoToMenu);
    document.addEventListener('forceConfirmation', handleForceConfirmation);
    
    // Clean up when component unmounts
    return () => {
      document.removeEventListener('proceedToCheckout', handleProceedToCheckout);
      document.removeEventListener('placeOrder', handlePlaceOrderEvent);
      document.removeEventListener('resetCart', handleResetCart);
      document.removeEventListener('goToMenu', handleGoToMenu);
      document.removeEventListener('forceConfirmation', handleForceConfirmation);
    };
  }, [cartItems, placeOrder, orderType, orderNote, cartTotal, setCurrentOrder, setOrderPlaced, onClose]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
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
              WebkitBackdropFilter: 'blur(3px)'
            }}
            onClick={onClose}
          />
          
          {/* Cart container */}
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
              maxWidth: '480px',
              backgroundColor: theme.colors.background,
              boxShadow: theme.shadows.lg,
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'hidden',
              borderTopLeftRadius: theme.borderRadius.lg,
              borderBottomLeftRadius: theme.borderRadius.lg
            }}
          >
            {/* Cart header with improved styling */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderBottom: `1px solid ${theme.colors.border}10`,
              backgroundColor: 'white',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}>            <div style={{ display: 'flex', alignItems: 'center' }}>
                {checkoutStep === 'checkout' && (
                  <button
                    onClick={() => setCheckoutStep('cart')}
                    aria-label="Go back to cart"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      marginRight: theme.spacing.sm,
                      padding: theme.spacing.xs,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50%',
                      transition: theme.transitions.fast
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className="material-icons" style={{ 
                      fontSize: '24px',
                      color: theme.colors.text.secondary
                    }}>
                      arrow_back
                    </span>
                  </button>
                )}
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
                    overflow: 'hidden'
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
                  <span className="material-icons" style={{ fontSize: '25px', color: theme.colors.text.secondary }}>close</span>
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
              WebkitOverflowScrolling: 'touch'
            }}>              {/* Error message if there is one */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    backgroundColor: theme.colors.danger + '15',
                    color: theme.colors.danger,
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    marginTop: theme.spacing.md,
                    fontSize: theme.typography.sizes.sm
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.md
                  }}>
                    <span className="material-icons" style={{ fontSize: '20px' }}>error_outline</span>
                    {error}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: theme.spacing.md
                  }}>
                    <button
                      onClick={() => setCheckoutStep('checkout')}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.borderRadius.sm,
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: 'transparent',
                        color: theme.colors.text.secondary,
                        cursor: 'pointer',
                        fontSize: theme.typography.sizes.sm
                      }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setCheckoutStep('confirmation')}
                      style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.borderRadius.sm,
                        border: 'none',
                        backgroundColor: theme.colors.primary,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: theme.typography.sizes.sm,
                        fontWeight: theme.typography.fontWeights.medium
                      }}
                    >
                      Continue Anyway
                    </button>
                  </div>
                </motion.div>
              )}
              
              {/* Loading state */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    padding: `${theme.spacing.xl} 0`,
                    height: '300px'
                  }}
                >
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
                    <p style={{ color: theme.colors.text.secondary }}>
                      {checkoutStep === 'cart' ? 'Loading your cart...' :
                       checkoutStep === 'checkout' ? 'Preparing checkout...' : 
                       'Processing your order...'}
                    </p>
                  </div>
                </motion.div>
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
