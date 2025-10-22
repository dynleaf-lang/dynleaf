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

  useEffect(() => {
    // Complete animation after all elements are rendered
    const timer = setTimeout(() => setIsAnimationComplete(true), 1000);
    return () => clearTimeout(timer);
  }, []);

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
            borderRadius: theme.borderRadius.xl,
            padding: 0,
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}
        >
          {/* Header Section */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.colors.success}, ${theme.colors.success}dd)`,
            padding: theme.spacing.xl,
            textAlign: 'center',
            color: 'white'
          }}>
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto ' + theme.spacing.lg,
                backdropFilter: 'blur(10px)'
              }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
                className="material-icons"
                style={{ fontSize: '40px', color: 'white' }}
              >
                check_circle
              </motion.span>
            </motion.div>

            {/* Success Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: theme.typography.sizes.xl,
                fontWeight: theme.typography.fontWeights.bold,
                margin: `0 0 ${theme.spacing.sm} 0`
              }}
            >
              Payment Successful!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                fontSize: theme.typography.sizes.md,
                opacity: 0.9,
                margin: 0
              }}
            >
              Your order has been confirmed
            </motion.p>
          </div>

          {/* Content Section */}
          <div style={{
            padding: theme.spacing.xl,
            maxHeight: '60vh',
            overflow: 'auto'
          }}>
            {/* Order Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.md
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: theme.typography.sizes.lg,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: theme.colors.text.primary
                }}>
                  Order #{order?.orderId || order?.order_id || order?.cfOrderId || order?.id || 'N/A'}
                </h3>
                
                <span style={{
                  backgroundColor: theme.colors.success + '20',
                  color: theme.colors.success,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.fontWeights.medium
                }}>
                  Paid
                </span>
              </div>

              {/* Order Type & Time */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.md
              }}>
                <div>
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.xs
                  }}>
                    Order Type
                  </div>
                  <div style={{
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.medium,
                    color: theme.colors.text.primary,
                    textTransform: 'capitalize'
                  }}>
                    {order?.orderType || 'Takeaway'}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.xs
                  }}>
                    Order Time
                  </div>
                  <div style={{
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.medium,
                    color: theme.colors.text.primary
                  }}>
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Estimated Time for Takeaway */}
              {estimatedTime && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    backgroundColor: theme.colors.primary + '10',
                    border: `1px solid ${theme.colors.primary}30`,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm
                  }}
                >
                  <span className="material-icons" style={{ 
                    color: theme.colors.primary, 
                    fontSize: '20px' 
                  }}>
                    schedule
                  </span>
                  <div>
                    <div style={{
                      fontSize: theme.typography.sizes.sm,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: theme.colors.primary
                    }}>
                      Ready in ~{estimatedTime} minutes
                    </div>
                    <div style={{
                      fontSize: theme.typography.sizes.xs,
                      color: theme.colors.text.secondary
                    }}>
                      We'll notify you when it's ready
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ marginBottom: theme.spacing.lg }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.md
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: theme.typography.sizes.md,
                  fontWeight: theme.typography.fontWeights.semibold,
                  color: theme.colors.text.primary
                }}>
                  Order Summary
                </h4>
                
                <button
                  onClick={() => setShowReceipt(!showReceipt)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.primary,
                    fontSize: theme.typography.sizes.sm,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs
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
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      marginBottom: theme.spacing.md
                    }}>
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: theme.spacing.md,
                            borderBottom: index < order.items.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: theme.typography.sizes.md,
                              fontWeight: theme.typography.fontWeights.medium,
                              color: theme.colors.text.primary,
                              marginBottom: theme.spacing.xs
                            }}>
                              {item.name}
                            </div>
                            <div style={{
                              fontSize: theme.typography.sizes.sm,
                              color: theme.colors.text.secondary
                            }}>
                              Qty: {item.quantity}
                            </div>
                          </div>
                          <div style={{
                            fontSize: theme.typography.sizes.md,
                            fontWeight: theme.typography.fontWeights.semibold,
                            color: theme.colors.text.primary
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
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.sm
                }}>
                  <span style={{ color: theme.colors.text.secondary }}>Subtotal</span>
                  <span><CurrencyDisplay amount={subtotal} /></span>
                </div>
                
                {tax > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: theme.spacing.sm
                  }}>
                    <span style={{ color: theme.colors.text.secondary }}>Tax</span>
                    <span><CurrencyDisplay amount={tax} /></span>
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: theme.spacing.sm,
                  borderTop: `1px solid ${theme.colors.border}`,
                  fontSize: theme.typography.sizes.lg,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.text.primary
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
                gap: theme.spacing.md,
                flexDirection: 'column'
              }}
            >
              {/* Primary Action */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContinueShopping}
                style={{
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.sizes.md,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.sm,
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="material-icons">restaurant_menu</span>
                Continue Shopping
              </motion.button>

              {/* Secondary Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing.sm
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onViewOrderHistory}
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.primary,
                    fontWeight: theme.typography.fontWeights.medium,
                    fontSize: theme.typography.sizes.sm,
                    border: `1px solid ${theme.colors.primary}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>receipt_long</span>
                  View Orders
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
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
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: 'transparent',
                    color: theme.colors.text.secondary,
                    fontWeight: theme.typography.fontWeights.medium,
                    fontSize: theme.typography.sizes.sm,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.xs
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
              backgroundColor: theme.colors.background,
              padding: theme.spacing.lg,
              textAlign: 'center',
              borderTop: `1px solid ${theme.colors.border}`
            }}
          >
            <p style={{
              margin: 0,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              lineHeight: 1.5
            }}>
              🎉 Thank you for choosing us! We're preparing your order with care.
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderSuccessModal;