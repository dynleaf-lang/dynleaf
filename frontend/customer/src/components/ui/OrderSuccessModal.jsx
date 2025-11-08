import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../../data/theme';
import CurrencyDisplay from '../Utils/CurrencyFormatter';

/**
 * Professional Order Success Component
 * Displays after successful payment with comprehensive order details
 */
export const OrderSuccessModal = ({ 
  order, 
  onClose, 
  onContinueShopping, 
  onViewOrderHistory 
}) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTime] = useState(new Date());
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [autoTransitionTimer, setAutoTransitionTimer] = useState(8); // 8 second countdown

  useEffect(() => {
    // Complete animation after all elements are rendered
    const timer = setTimeout(() => setIsAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Auto transition to order confirmation after 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoTransitionTimer(prev => {
        if (prev <= 1) {
          // Transition to order confirmation
          onViewOrderHistory?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onViewOrderHistory]);

  // Clear auto transition timer when user interacts
  const handleUserInteraction = (callback) => {
    setAutoTransitionTimer(0); // Stop countdown
    callback?.();
  };

  // Calculate order summary
  const subtotal = order?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const tax = order?.tax || 0;
  const total = order?.total || (subtotal + tax);

  // Generate estimated time based on order type and items
  const getEstimatedTime = () => {
    if (order?.orderType === 'takeaway') {
      const itemCount = order?.items?.length || 0;
      const baseTime = 15; // Base 15 minutes
      const additionalTime = Math.min(itemCount * 2, 20); // Max 20 additional minutes
      return baseTime + additionalTime;
    }
    return null; // For dine-in, no estimated time
  };

  const estimatedTime = getEstimatedTime();

  return (
    <AnimatePresence>
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
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: theme.spacing.md
        }}
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: 0,
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header Section */}
          <div style={{
            background: '#28a745',
            padding: '32px 24px',
            textAlign: 'center',
            color: 'white',
            borderTopLeftRadius: theme.borderRadius.xl,
            borderTopRightRadius: theme.borderRadius.xl
          }}>
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
                className="material-icons"
                style={{ fontSize: '32px', color: 'white' }}
              >
                check
              </motion.span>
            </motion.div>

            {/* Success Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
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
                opacity: 0.9,
                margin: 0,
                fontWeight: '400'
              }}
            >
              Your order has been confirmed
            </motion.p>
          </div>

          {/* Content Section */}
          <div style={{
            padding: '24px',
            backgroundColor: 'white'
          }}>
            {/* Order Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#333',
                  letterSpacing: '-0.01em'
                }}>
                  Order #{order?.orderId || order?.order_id || order?.cfOrderId || order?.id || 'N/A'}
                </h3>
                
                <span style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Paid
                </span>
              </div>

              {/* Order Type & Time */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Order Type
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    textTransform: 'capitalize'
                  }}>
                    {order?.orderType || 'DineIn'}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    Order Time
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} AM
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ marginBottom: '20px' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Order Summary
                </h4>
                
                <button
                  onClick={() => setShowReceipt(!showReceipt)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500'
                  }}
                >
                  {showReceipt ? 'Hide' : 'Show'} Details
                  <span className="material-icons" style={{ fontSize: '16px' }}>
                    {showReceipt ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  </span>
                </button>
              </div>

              <AnimatePresence>
                {showReceipt && order?.items && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    {/* Items List */}
                    <div style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      marginBottom: '16px'
                    }}>
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '12px 16px',
                            borderBottom: index < order.items.length - 1 ? '1px solid #e9ecef' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#333',
                              marginBottom: '2px'
                            }}>
                              {item.name}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#666'
                            }}>
                              Qty: {item.quantity}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333'
                          }}>
                            <CurrencyDisplay amount={item.price * item.quantity} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Price Summary */}
              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ color: '#666', fontSize: '14px' }}>Subtotal</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    <CurrencyDisplay amount={subtotal} />
                  </span>
                </div>
                
                {tax > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>Tax</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                      <CurrencyDisplay amount={tax} />
                    </span>
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #dee2e6',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#333'
                }}>
                  <span>Total Paid</span>
                  <span><CurrencyDisplay amount={total} /></span>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column'
              }}
            >
              {/* Primary Action */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleUserInteraction(onContinueShopping)}
                style={{
                  padding: '16px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-icons">clear</span>
                Continue Shopping
              </motion.button>

              {/* Secondary Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleUserInteraction(onViewOrderHistory)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    fontWeight: '500',
                    fontSize: '14px',
                    border: '1px solid #dc3545',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>receipt_long</span>
                  View Details {autoTransitionTimer > 0 && `(${autoTransitionTimer})`}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleUserInteraction();
                    // Share order details
                    if (navigator.share) {
                      navigator.share({
                        title: 'Order Confirmation',
                        text: `Order #${order?.orderId || order?.order_id || order?.cfOrderId || order?.id || 'N/A'} confirmed - Total: ₹${total}`,
                        url: window.location.href
                      });
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#666',
                    fontWeight: '500',
                    fontSize: '14px',
                    border: '1px solid #dee2e6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>share</span>
                  Share
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              backgroundColor: '#f8f9fa',
              padding: '16px 24px',
              textAlign: 'center',
              borderTop: '1px solid #dee2e6',
              borderBottomLeftRadius: theme.borderRadius.xl,
              borderBottomRightRadius: theme.borderRadius.xl
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>🎉</span>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#666',
                lineHeight: 1.4
              }}>
                Thank you for choosing us! We're preparing your order with care.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderSuccessModal;