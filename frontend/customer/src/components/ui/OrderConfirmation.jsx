import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTax } from '../../context/TaxContext';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import { useOrderType } from '../ui/EnhancedCart';
import { theme } from '../../data/theme';
import TaxInfo from './TaxInfo';

// Enhanced OrderConfirmation component with better visuals and functionality
const OrderConfirmation = memo(() => {  const { 
    cartItems, 
    cartTotal, 
    orderNote, 
    clearCart, 
    resetCartAndOrder,
    currentOrder, 
    orderError 
  } = useCart();
  const { restaurant, branch, table } = useRestaurant();
  const { orderType } = useOrderType();
  const { taxName, taxRate, formattedTaxRate, calculateTax } = useTax();
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Only show error banner if there's an error AND no valid order was created
  const shouldShowErrorBanner = orderError && (!currentOrder || !currentOrder._id);
  const [showErrorBanner, setShowErrorBanner] = useState(shouldShowErrorBanner);
  
  // Update error banner visibility when dependencies change
  useEffect(() => {
    console.log('[ORDER CONFIRMATION] Error state check:', {
      orderError,
      currentOrder: currentOrder?._id,
      shouldShowErrorBanner,
      showErrorBanner
    });
    setShowErrorBanner(shouldShowErrorBanner);
  }, [shouldShowErrorBanner, orderError, currentOrder]);
  
  // Function to get a formatted order ID for display
  const getFormattedOrderId = () => {
    if (currentOrder && currentOrder._id) {
      return currentOrder._id.substring(0, 8).toUpperCase();
    }
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };
  
  // Function to get formatted date
  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle print receipt button
  const handlePrintReceipt = () => {
    setIsPrinting(true);
    
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };
    // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = calculateTax(subtotal); // Dynamic tax calculation based on country
  const total = subtotal + tax;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="print-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 0
      }}
    >
      {/* Warning banner - only show if there's an error AND no successful order */}
      {shouldShowErrorBanner && showErrorBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: theme.colors.warning + '15',
            borderLeft: `4px solid ${theme.colors.warning}`,
            color: theme.colors.warning,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.lg,
            fontSize: theme.typography.sizes.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>info</span>
              <span>
                {currentOrder && currentOrder._id ? (
                  <>
                    Your order was processed successfully, but there may have been minor issues during submission.
                    <br />Your order #{getFormattedOrderId()} is confirmed and being prepared.
                  </>
                ) : (
                  <>
                    There was an issue processing your order, but we've created a temporary order record.
                    <br />Please save your order details or contact support if needed.
                  </>
                )}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: theme.spacing.md,
              marginTop: theme.spacing.xs,
              paddingLeft: theme.spacing.xl
            }}>
              <motion.button
                onClick={handlePrintReceipt}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  backgroundColor: theme.colors.primary + '15',
                  color: theme.colors.primary,
                  border: `1px solid ${theme.colors.primary}30`,
                  borderRadius: theme.borderRadius.sm,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  fontSize: theme.typography.sizes.xs,
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>print</span>
                Print Receipt
              </motion.button>
              <motion.button
                onClick={() => {
                  clearCart();
                  document.dispatchEvent(new CustomEvent('goToMenu'));
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  backgroundColor: theme.colors.success + '15',
                  color: theme.colors.success,
                  border: `1px solid ${theme.colors.success}30`,
                  borderRadius: theme.borderRadius.sm,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  fontSize: theme.typography.sizes.xs,
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>restaurant_menu</span>
                Return to Menu
              </motion.button>
            </div>
          </div>
          
          <button 
            onClick={() => setShowErrorBanner(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.text.secondary,
              display: 'flex',
              padding: theme.spacing.xs,
              marginLeft: theme.spacing.md
            }}
          >
            <span className="material-icons">close</span>
          </button>
        </motion.div>
      )}
      
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 15
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: theme.spacing.xl
        }}
      >
        <div style={{
          backgroundColor: theme.colors.success + '20',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.md,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            <span className="material-icons" style={{ fontSize: '50px', color: theme.colors.success }}>
              check_circle
            </span>
          </motion.div>
          
          {/* Circle animation for the checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `1px solid ${theme.colors.success}50`
            }}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <h2 style={{ 
            fontSize: theme.typography.sizes['3xl'], 
            fontWeight: theme.typography.fontWeights.bold, 
            margin: `${theme.spacing.sm} 0`,
            color: theme.colors.text.primary,
            letterSpacing: '-0.01em'
          }}>
            Order Placed Successfully!
          </h2>
          
          <p style={{ 
            fontSize: theme.typography.sizes.lg, 
            color: theme.colors.text.secondary,
            margin: `${theme.spacing.sm} 0 ${theme.spacing.lg} 0`
          }}>
            Your order #{getFormattedOrderId()} has been received
          </p>
        </motion.div>
      </motion.div>
      
      {/* Order details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          backgroundColor: 'white',
          padding: theme.spacing.xl,
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          border: `1px solid ${theme.colors.border}`,
          className: "receipt"
        }}
      >
        {/* Restaurant details in header */}
        <div style={{
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h3 style={{ 
              margin: 0,
              fontSize: theme.typography.sizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary
            }}>
              {restaurant?.name || 'Restaurant Name'}
            </h3>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}>
              {branch?.name || 'Main Branch'}
            </p>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <p style={{ 
              margin: 0,
              color: theme.colors.text.primary,
              fontWeight: theme.typography.fontWeights.semibold
            }}>
              Order #{getFormattedOrderId()}
            </p>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}>
              {getFormattedDate()}
            </p>
          </div>
        </div>
        
        {/* Order type and status badges */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.primary + '15',
            color: theme.colors.primary,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.pill,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>
              {orderType === 'dineIn' ? 'restaurant' : 'takeout_dining'}
            </span>
            {orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}
          </div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: '#d1f5d3',
            color: theme.colors.success,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.pill,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>
              pending
            </span>
            {currentOrder?.status || 'Processing'}
          </div>
          
          {table && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.pill,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              border: `1px solid ${theme.colors.border}`
            }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>
                table_bar
              </span>
              Table: {table?.name || 'Table'}
            </div>
          )}
        </div>
        
        {/* Customer details */}
        <div style={{
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg
        }}>
          <h4 style={{ 
            margin: 0, 
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary
          }}>
            Customer Details:
          </h4>
          
          {currentOrder?.customerInfo && (
            <div style={{ fontSize: theme.typography.sizes.sm }}>
              <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>person</span>
                <strong>Name:</strong> {currentOrder.customerInfo.name}
              </p>
              
              {currentOrder.customerInfo.phone && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>phone</span>
                  <strong>Phone:</strong> {currentOrder.customerInfo.phone}
                </p>
              )}
              
              {currentOrder.customerInfo.email && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>email</span>
                  <strong>Email:</strong> {currentOrder.customerInfo.email}
                </p>
              )}
              
              {orderType === 'takeaway' && currentOrder.customerInfo.address && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>location_on</span>
                  <strong>Address:</strong> {currentOrder.customerInfo.address}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Order items table */}
        <h4 style={{ 
          margin: 0, 
          marginBottom: theme.spacing.md,
          fontSize: theme.typography.sizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.text.primary
        }}>
          Order Items:
        </h4>
        
        <div style={{
          marginBottom: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden'
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr auto auto',
            gap: theme.spacing.md,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.background,
            borderBottom: `1px solid ${theme.colors.border}`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.secondary
          }}>
            <div>Qty</div>
            <div>Item</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
          </div>
          
          {/* Table rows */}
          {cartItems.map((item) => (
            <div 
              key={`${item.id}-${JSON.stringify(item.selectedOptions)}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1fr auto auto',
                gap: theme.spacing.md,
                padding: theme.spacing.sm,
                borderBottom: `1px solid ${theme.colors.border}10`,
                fontSize: theme.typography.sizes.md,
              }}
            >
              <div style={{ color: theme.colors.text.primary, fontWeight: theme.typography.fontWeights.semibold }}>{item.quantity}</div>
              <div>
                <div style={{ color: theme.colors.text.primary }}>{item.title || item.name}</div>
                
                {/* Item options */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, marginTop: '2px' }}>
                    {item.selectedOptions.map((option, index) => (
                      <span key={`${option.category}-${index}`}>
                        {option.name}: {option.value}
                        {index < item.selectedOptions.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>              <div style={{ color: theme.colors.text.secondary, textAlign: 'right' }}>
                <CurrencyDisplay amount={item.price} />
              </div>
              <div style={{ fontWeight: theme.typography.fontWeights.semibold, textAlign: 'right' }}>
                <CurrencyDisplay amount={item.price * item.quantity} />
              </div>
            </div>
          ))}
        </div>
        
        {/* Order Notes */}
        {orderNote && (
          <div style={{
            marginBottom: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.sizes.sm
          }}>
            <h4 style={{ 
              margin: 0, 
              marginBottom: theme.spacing.sm,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span className="material-icons" style={{ fontSize: '18px', color: theme.colors.warning }}>note</span>
              Order Notes:
            </h4>
            <p style={{ 
              margin: 0,
              fontStyle: 'italic',
              color: theme.colors.text.secondary
            }}>
              "{orderNote}"
            </p>
          </div>
        )}
        
        {/* Order Total Summary */}
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: theme.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: theme.spacing.xs
        }}>          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            <span>Subtotal:</span>
            <span><CurrencyDisplay amount={subtotal} /></span>
          </div>
            <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>            
            <TaxInfo subtotal={subtotal} />
          </div>
          
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.text.primary,
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            borderTop: `1px solid ${theme.colors.border}20`
          }}>
            <span>Total:</span>
            <span><CurrencyDisplay amount={total} /></span>
          </div>
        </div>
      </motion.div>
      
      {/* Footer buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="no-print"
        style={{ 
          display: 'flex', 
          gap: theme.spacing.md, 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Use resetCartAndOrder to properly reset everything
            resetCartAndOrder();
            // Dispatch event to close the cart modal and return to menu
            document.dispatchEvent(new CustomEvent('resetCart', { 
              detail: { action: 'closeModal' } 
            }));
          }}
          style={{
            flex: 1,
            maxWidth: '180px',
            backgroundColor: theme.colors.primary,
            color: theme.colors.text.light,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast,
            boxShadow: theme.shadows.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span className="material-icons">restaurant_menu</span>
          Back to Menu
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePrintReceipt}
          disabled={isPrinting}
          style={{
            flex: 1,
            maxWidth: '180px',
            backgroundColor: isPrinting ? theme.colors.background : 'white',
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: isPrinting ? 'not-allowed' : 'pointer',
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm
          }}
        >
          {isPrinting ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.1)',
                borderTopColor: theme.colors.text.primary,
                animation: 'spin 1s linear infinite',
              }} />
              Printing...
            </>
          ) : (
            <>
              <span className="material-icons">print</span>
              Print Receipt
            </>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Use resetCartAndOrder to completely reset for a new order
            resetCartAndOrder();
            // Dispatch event to set checkout step back to cart but keep modal open
            document.dispatchEvent(new CustomEvent('resetCart', { 
              detail: { action: 'newOrder' } 
            }));
          }}
          style={{
            flex: 1,
            maxWidth: '180px',
            backgroundColor: theme.colors.background,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span className="material-icons">add_shopping_cart</span>
          Start New Order
        </motion.button>
      </motion.div>
      
      {/* Add print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
});

export default OrderConfirmation;
