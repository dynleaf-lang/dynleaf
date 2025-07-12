import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTax } from '../../context/TaxContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import ProtectedRoute from '../Utils/ProtectedRoute';
import { theme } from '../../data/theme';
import { api } from '../../utils/apiClient';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 } 
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
  exit: { opacity: 0, y: -20 }
};

// Order status badge component
const StatusBadge = memo(({ status, orderStatus }) => {
  // Use orderStatus if provided, otherwise fall back to status
  const currentStatus = orderStatus || status;
  
  // Define styles based on status
  const getStatusStyle = () => {
    switch(currentStatus?.toLowerCase()) {
      case 'pending':
        return {
          bg: theme.colors.warning + '15',
          color: theme.colors.warning,
          borderColor: theme.colors.warning + '30',
          icon: 'schedule'
        };
      case 'processing':
        return {
          bg: theme.colors.info + '15',
          color: theme.colors.info,
          borderColor: theme.colors.info + '30',
          icon: 'pending'
        };
      case 'completed':
        return {
          bg: theme.colors.success + '15',
          color: theme.colors.success,
          borderColor: theme.colors.success + '30',
          icon: 'check_circle'
        };
      case 'cancelled':
        return {
          bg: theme.colors.danger + '15',
          color: theme.colors.danger,
          borderColor: theme.colors.danger + '30',
          icon: 'cancel'
        };
      default:
        return {
          bg: theme.colors.text.muted + '15',
          color: theme.colors.text.muted,
          borderColor: theme.colors.text.muted + '30',
          icon: 'help_outline'
        };
    }
  };

  const style = getStatusStyle();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      backgroundColor: style.bg,
      color: style.color,
      borderRadius: theme.borderRadius.pill,
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.fontWeights.medium,
      border: `1px solid ${style.borderColor}`,
      gap: theme.spacing.xs
    }}>
      <span className="material-icons" style={{ fontSize: '14px' }}>
        {style.icon}
      </span>
      <span>{currentStatus}</span>
    </div>
  );
});

// Order Item component
const OrderItem = memo(({ order, onClick, isDesktop }) => {
  const { currencySymbol, formatCurrency } = useCurrency();
  const { taxRate, taxName, formattedTaxRate } = useTax();
  const formattedDate = new Date(order.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Calculate total items
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01, boxShadow: theme.shadows.md }}
      onClick={() => onClick(order)}
      style={{
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        cursor: 'pointer',
        boxShadow: theme.shadows.sm,
        border: `1px solid ${theme.colors.border}`,
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm
      }}>
        <div>
          <div style={{ 
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs
          }}>
            Order #{order._id.substring(0, 8).toUpperCase()}
          </div>
          <div style={{ 
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs
          }}>
            <span className="material-icons" style={{ fontSize: '14px' }}>calendar_today</span>
            {formattedDate}
          </div>
        </div>
        <StatusBadge status={order.status} orderStatus={order.orderStatus} />
      </div>

      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${theme.spacing.sm} 0`,
        borderTop: `1px dashed ${theme.colors.border}`,
        borderBottom: `1px dashed ${theme.colors.border}`,
        marginBottom: theme.spacing.sm
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}>
          <div style={{
            backgroundColor: theme.colors.backgroundAlt,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.text.primary
          }}>
            <span className="material-icons">shopping_bag</span>
          </div>
          <div>
            <div style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary
            }}>
              Items
            </div>
            <div style={{
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.primary
            }}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        {order.orderType && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <div style={{
              backgroundColor: theme.colors.primaryLight + '20',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.xs,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.primary
            }}>
              <span className="material-icons">
                {order.orderType === 'delivery' ? 'delivery_dining' : 
                 order.orderType === 'takeaway' ? 'takeout_dining' : 
                 'restaurant'}
              </span>
            </div>
            <div>
              <div style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary
              }}>
                Order Type
              </div>
              <div style={{
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.medium,
                color: theme.colors.text.primary,
                textTransform: 'capitalize'
              }}>
                {order.orderType}
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}>
          <div style={{
            backgroundColor: theme.colors.success + '15',
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.xs,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.success
          }}>
            <span className="material-icons">paid</span>
          </div>
          <div>
            <div style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary
            }}>
              Total
            </div>
            <div style={{
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary
            }}>
              <CurrencyDisplay amount={order.totalAmount || 0} />
            </div>
          </div>
        </div>
      </div>

      {isDesktop && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.sm
        }}>
          {order.items.slice(0, 3).map((item, index) => (
            <div key={index} style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              backgroundColor: theme.colors.backgroundAlt,
              borderRadius: theme.borderRadius.md,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                color: theme.colors.primary,
                fontWeight: theme.typography.fontWeights.medium,
                marginRight: theme.spacing.xs
              }}>
                {item.quantity}x
              </span>
              {item.name}
            </div>
          ))}
          {order.items.length > 3 && (
            <div style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              backgroundColor: theme.colors.backgroundAlt,
              borderRadius: theme.borderRadius.md,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`
            }}>
              +{order.items.length - 3} more
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: theme.spacing.sm
      }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.primary,
            border: `1px solid ${theme.colors.primary}30`,
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs
          }}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>visibility</span>
          View Details
        </motion.button>
        
        {(order.orderStatus === 'completed' || order.status === 'completed') && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              backgroundColor: theme.colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>restart_alt</span>
            Order Again
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

// Order Detail Modal Component
const OrderDetailModal = ({ order, onClose }) => {
  const { currencySymbol, formatCurrency } = useCurrency();
  const { taxRate, taxName, formattedTaxRate } = useTax();
  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
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
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 500 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.xl,
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <span className="material-icons" style={{ 
              color: theme.colors.primary,
              fontSize: '24px'
            }}>receipt_long</span>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: theme.typography.sizes.lg,
                fontWeight: theme.typography.fontWeights.semibold,
                color: theme.colors.text.primary
              }}>Order Details</h3>
              <p style={{
                margin: 0,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary
              }}>#{order._id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: theme.colors.text.secondary,
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div style={{
          padding: theme.spacing.lg,
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Order summary and status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: theme.spacing.md
          }}>
            <div>
              <div style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.xs
              }}>
                <span className="material-icons" style={{ 
                  fontSize: '16px',
                  verticalAlign: 'text-bottom',
                  marginRight: theme.spacing.xs
                }}>calendar_today</span>
                Ordered on {formattedDate}
              </div>
              {order.orderType && (
                <div style={{
                  display: 'inline-block',
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.primary,
                  backgroundColor: theme.colors.primary + '10',
                  padding: `${theme.spacing.xxs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.md,
                  marginRight: theme.spacing.sm,
                  textTransform: 'capitalize'
                }}>
                  <span className="material-icons" style={{ 
                    fontSize: '14px',
                    verticalAlign: 'text-bottom',
                    marginRight: theme.spacing.xs
                  }}>
                    {order.orderType === 'delivery' ? 'delivery_dining' : 
                     order.orderType === 'takeaway' ? 'takeout_dining' : 
                     'restaurant'}
                  </span>
                  {order.orderType}
                </div>
              )}
            </div>
            
            <StatusBadge status={order.status} orderStatus={order.orderStatus} />
          </div>

          {/* Customer info if available */}
          {order.customerInfo && (
            <div style={{
              backgroundColor: theme.colors.backgroundAlt,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg
            }}>
              <h4 style={{
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.medium,
                marginTop: 0,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>person</span>
                Customer Information
              </h4>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.md }}>
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.xxs
                  }}>
                    Name
                  </div>
                  <div style={{
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.medium,
                    color: theme.colors.text.primary
                  }}>
                    {order.customerInfo.name || 'Not provided'}
                  </div>
                </div>
                
                {order.customerInfo.phone && (
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xxs
                    }}>
                      Phone
                    </div>
                    <div style={{
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: theme.colors.text.primary
                    }}>
                      {order.customerInfo.phone}
                    </div>
                  </div>
                )}
                
                {order.customerInfo.email && (
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xxs
                    }}>
                      Email
                    </div>
                    <div style={{
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: theme.colors.text.primary
                    }}>
                      {order.customerInfo.email}
                    </div>
                  </div>
                )}
                
                {order.customerInfo.address && (
                  <div style={{ flex: '1 1 100%' }}>
                    <div style={{
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xxs
                    }}>
                      Address
                    </div>
                    <div style={{
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: theme.colors.text.primary
                    }}>
                      {order.customerInfo.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order items */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <h4 style={{
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              marginTop: 0,
              marginBottom: theme.spacing.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span className="material-icons" style={{ fontSize: '18px' }}>shopping_bag</span>
              Order Items
            </h4>
            
            {/* Individual items */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md
            }}>
              {order.items.map((item, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    padding: `${theme.spacing.sm} 0`,
                    borderBottom: index < order.items.length - 1 ? `1px solid ${theme.colors.border}` : 'none'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.md,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: theme.typography.sizes.lg,
                    fontWeight: theme.typography.fontWeights.bold,
                    color: theme.colors.primary,
                    marginRight: theme.spacing.md
                  }}>
                    {item.quantity}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: theme.typography.sizes.md,
                      fontWeight: theme.typography.fontWeights.medium,
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.xxs
                    }}>
                      {item.name}
                    </div>
                    
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div style={{
                        fontSize: theme.typography.sizes.sm,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        {item.selectedOptions.map(opt => opt.name).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    fontSize: theme.typography.sizes.md,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.text.primary,
                    minWidth: '80px',
                    textAlign: 'right'
                  }}>
                    <CurrencyDisplay amount={item.price * item.quantity} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order note if available */}
          {order.note && (
            <div style={{
              backgroundColor: theme.colors.warning + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
              borderLeft: `4px solid ${theme.colors.warning}`
            }}>
              <h4 style={{
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.medium,
                margin: 0,
                marginBottom: theme.spacing.xs,
                color: theme.colors.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}>
                <span className="material-icons" style={{ fontSize: '18px', color: theme.colors.warning }}>
                  sticky_note_2
                </span>
                Order Notes
              </h4>
              <p style={{
                fontSize: theme.typography.sizes.sm,
                margin: 0,
                color: theme.colors.text.primary
              }}>
                {order.note}
              </p>
            </div>
          )}

          {/* Order summary */}
          <div style={{
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            boxShadow: theme.shadows.sm,
            border: `1px solid ${theme.colors.border}`
          }}>
            <h4 style={{
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.medium,
              margin: 0,
              marginBottom: theme.spacing.md,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span className="material-icons" style={{ fontSize: '18px' }}>
                receipt
              </span>
              Order Summary
            </h4>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.sm
            }}>              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary
              }}>
                <span>Subtotal</span>
                <span><CurrencyDisplay amount={order.subtotal || (order.totalAmount ? order.totalAmount - (order.taxAmount || order.totalAmount * taxRate) : 0)} /></span>
              </div>
                <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary
              }}>
                <span>{order.taxDetails?.taxName || taxName} ({order.taxDetails?.percentage ? `${order.taxDetails.percentage}%` : formattedTaxRate})</span>
                <span><CurrencyDisplay amount={order.taxAmount || ((order.totalAmount || 0) * taxRate)} /></span>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.semibold,
                color: theme.colors.text.primary,
                borderTop: `1px solid ${theme.colors.border}`,
                paddingTop: theme.spacing.sm,
                marginTop: theme.spacing.xs
              }}>
                <span>Total</span>
                <span><CurrencyDisplay amount={order.totalAmount || 0} /></span>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          padding: theme.spacing.md,
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.backgroundAlt
        }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              cursor: 'pointer',
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}
          >
            <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
            Close
          </motion.button>
          
          {(order.orderStatus === 'completed' || order.status === 'completed') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs
              }}
            >
              <span className="material-icons" style={{ fontSize: '18px' }}>restart_alt</span>
              Order Again
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Filter Tabs Component
const FilterTabs = memo(({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All Orders', icon: 'receipt_long' },
    { id: 'pending', label: 'Pending', icon: 'schedule' },
    { id: 'processing', label: 'Processing', icon: 'pending' },
    { id: 'completed', label: 'Completed', icon: 'check_circle' }
  ];
  
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      style={{
        display: 'flex',
        overflowX: 'auto',
        gap: theme.spacing.md,
        padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
        marginBottom: theme.spacing.md,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
        '::WebkitScrollbar': { display: 'none' } // Chrome/Safari/Opera
      }}
    >
      {filters.map(filter => (
        <motion.div
          key={filter.id}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onFilterChange(filter.id)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: activeFilter === filter.id ? theme.colors.primary : 'white',
            color: activeFilter === filter.id ? 'white' : theme.colors.text.primary,
            borderRadius: theme.borderRadius.lg,
            cursor: 'pointer',
            fontWeight: theme.typography.fontWeights.medium,
            fontSize: theme.typography.sizes.sm,
            boxShadow: theme.shadows.sm,
            border: `1px solid ${activeFilter === filter.id ? theme.colors.primary : theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            minWidth: 'fit-content'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>
            {filter.icon}
          </span>
          {filter.label}
        </motion.div>
      ))}
    </motion.div>
  );
});

// Empty State Component
const EmptyOrdersState = memo(({ message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        textAlign: 'center',
        backgroundColor: theme.colors.backgroundAlt,
        borderRadius: theme.borderRadius.lg,
        margin: `${theme.spacing.lg} 0`,
        minHeight: '300px'
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: theme.colors.background,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
        boxShadow: theme.shadows.md
      }}>
        <span className="material-icons" style={{
          fontSize: '40px',
          color: theme.colors.text.secondary
        }}>
          receipt_long
        </span>
      </div>
      
      <h3 style={{
        margin: `${theme.spacing.md} 0`,
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.fontWeights.semibold,
        color: theme.colors.text.primary
      }}>
        No Orders Found
      </h3>
      
      <p style={{
        color: theme.colors.text.secondary,
        maxWidth: '400px',
        marginBottom: theme.spacing.lg
      }}>
        {message || "You don't have any orders yet. Browse our menu and place your first order!"}
      </p>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          backgroundColor: theme.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: theme.borderRadius.md,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          fontSize: theme.typography.sizes.md,
          fontWeight: theme.typography.fontWeights.medium,
          cursor: 'pointer',
          boxShadow: theme.shadows.md,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}
      >
        <span className="material-icons">restaurant_menu</span>
        Browse Menu
      </motion.button>
    </motion.div>
  );
});

// Error State Component
const ErrorState = memo(({ error, onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        textAlign: 'center',
        backgroundColor: `${theme.colors.danger}10`,
        border: `1px solid ${theme.colors.danger}30`,
        borderRadius: theme.borderRadius.lg,
        margin: `${theme.spacing.lg} 0`,
        minHeight: '300px'
      }}
    >
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: `${theme.colors.danger}20`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md
      }}>
        <span className="material-icons" style={{
          fontSize: '40px',
          color: theme.colors.danger
        }}>
          error_outline
        </span>
      </div>
      
      <h3 style={{
        margin: `${theme.spacing.md} 0`,
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.fontWeights.semibold,
        color: theme.colors.text.primary
      }}>
        Error Loading Orders
      </h3>
      
      <p style={{
        color: theme.colors.text.secondary,
        maxWidth: '400px',
        marginBottom: theme.spacing.lg
      }}>
        {error?.message || "Something went wrong while loading your orders. Please try again."}
      </p>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRetry}
        style={{
          backgroundColor: theme.colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: theme.borderRadius.md,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          fontSize: theme.typography.sizes.md,
          fontWeight: theme.typography.fontWeights.medium,
          cursor: 'pointer',
          boxShadow: theme.shadows.md,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm
        }}
      >
        <span className="material-icons">refresh</span>
        Try Again
      </motion.button>
    </motion.div>
  );
});

// Loading State Component
const LoadingState = memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        minHeight: '300px'
      }}
    >
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '50%',
        border: `3px solid ${theme.colors.border}`,
        borderTopColor: theme.colors.primary,
        animation: 'spin 1s linear infinite',
        marginBottom: theme.spacing.md
      }} />
      
      <p style={{
        color: theme.colors.text.secondary,
        fontSize: theme.typography.sizes.md
      }}>
        Loading your orders...
      </p>
      
      {/* Skeleton loading items */}
      <div style={{ 
        width: '100%', 
        maxWidth: '800px', 
        marginTop: theme.spacing.xl,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md
      }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              backgroundColor: 'white',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              boxShadow: theme.shadows.sm,
              height: '160px',
              opacity: 0.7,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(
                90deg, 
                ${theme.colors.background}00, 
                ${theme.colors.background}40,
                ${theme.colors.background}00
              )`,
              backgroundSize: '200% 100%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            
            <div style={{ 
              height: '20px', 
              width: '60%', 
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.md
            }} />
            
            <div style={{ 
              height: '15px', 
              width: '40%', 
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.xl
            }} />
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <div style={{ 
                height: '30px', 
                width: '30%', 
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md
              }} />
              <div style={{ 
                height: '30px', 
                width: '20%', 
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md
              }} />
              <div style={{ 
                height: '30px', 
                width: '20%', 
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.md
              }} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

// Main OrdersView component
const OrdersView = ({ isDesktop = false }) => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { currentOrder } = useCart();
  const { branch, table } = useRestaurant();
  const { trackCustomerOrder } = useNotifications();
  const { user } = useAuth();
  const { 
    socket,
    isConnected, 
    joinCustomerRooms, 
    onOrderUpdate, 
    offOrderUpdate
  } = useSocket();

  // Get customer orders
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call with a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let orders = [];
        
        // Only fetch orders if user is authenticated and has an identifier
        if (user && (user.phone || user.email || user.identifier)) {
          try {
            // Determine the customer identifier - prioritize phone, then email, then identifier
            const customerIdentifier = user.phone || user.email || user.identifier;
            
            // Fetch orders for this specific customer by identifier (phone or email)
            console.log('[ORDERS VIEW] Fetching orders for customer identifier:', customerIdentifier);
            orders = await api.public.orders.getByCustomerIdentifier(customerIdentifier);
            console.log('[ORDERS VIEW] Fetched customer orders:', orders);
          } catch (apiError) {
            console.error('API error fetching customer orders:', apiError);
            orders = []; // Use empty array if API fails
          }
        } else {
          console.log('[ORDERS VIEW] No user or identifier available:', { 
            hasPhone: !!user?.phone, 
            hasEmail: !!user?.email, 
            hasIdentifier: !!user?.identifier,
            isAuthenticated: !!user 
          });
        }
        
        // If we have a currentOrder in cart context, add it to the orders list
        let allOrders = [...orders];
        if (currentOrder) {
          // Check if the order already exists in the orders
          const orderExists = allOrders.some(order => order._id === currentOrder._id);
          if (!orderExists) {
            allOrders = [currentOrder, ...allOrders];
          }
        }
        
        setOrders(allOrders);
        
        // Track all orders for notifications
        allOrders.forEach(order => {
          if (order._id) {
            trackCustomerOrder(order._id);
          }
        });
        
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err || new Error('Failed to load orders'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [currentOrder, user]);

  // Setup real-time socket listeners
  useEffect(() => {
    if (!isConnected || !table?._id || !branch?._id || !user || !(user.phone || user.email || user.identifier)) return;

    // Join customer rooms for real-time updates
    joinCustomerRooms(table._id, branch._id);

    // Handle order updates (for refreshing the order list)
    const handleOrderUpdate = (data) => {
      const { order, eventType } = data;
      
      // Determine the customer identifier
      const customerIdentifier = user.phone || user.email || user.identifier;
      
      // If this update is for our customer (by phone or email), refresh orders
      if (order.customerPhone === customerIdentifier || order.customerEmail === customerIdentifier) {
        // Re-fetch orders to get latest data
        const fetchOrders = async () => {
          try {
            const updatedOrders = await api.public.orders.getByCustomerIdentifier(customerIdentifier);
            setOrders(updatedOrders || []);
            
            // Track any new orders for notifications
            if (updatedOrders && updatedOrders.length > 0) {
              updatedOrders.forEach(order => {
                if (order._id) {
                  trackCustomerOrder(order._id);
                }
              });
            }
          } catch (error) {
            console.error('Error refreshing customer orders after socket update:', error);
          }
        };
        fetchOrders();
      }
    };

    // Register event listeners (statusUpdate is now handled globally in NotificationContext)
    onOrderUpdate(handleOrderUpdate);

    // Cleanup listeners when component unmounts or dependencies change
    return () => {
      offOrderUpdate();
    };
  }, [isConnected, table?._id, branch?._id, user?.phone, user?.email, user?.identifier, trackCustomerOrder]);

  // Listen for status updates to update the local order state
  useEffect(() => {
    if (!socket || !isConnected || !user || !(user.phone || user.email || user.identifier)) return;

    const handleStatusUpdate = (data) => {
      const { orderId, newStatus, order } = data;
      
      // Determine the customer identifier
      const customerIdentifier = user.phone || user.email || user.identifier;
      
      // Update the specific order in our orders list if it belongs to this customer
      setOrders(prevOrders => 
        prevOrders.map(existingOrder => 
          existingOrder._id === orderId && 
          (existingOrder.customerPhone === customerIdentifier || 
           existingOrder.customerEmail === customerIdentifier ||
           (order && (order.customerPhone === customerIdentifier || order.customerEmail === customerIdentifier)))
            ? { ...existingOrder, orderStatus: newStatus, status: newStatus.toLowerCase() }
            : existingOrder
        )
      );
    };

    // Register status update listener for UI updates only
    socket.on('statusUpdate', handleStatusUpdate);

    return () => {
      socket.off('statusUpdate', handleStatusUpdate);
    };
  }, [socket, isConnected, user?.phone, user?.email, user?.identifier]);

  // Filter orders based on the active filter
  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'all') return true;
    // Check both status and orderStatus fields for compatibility
    const orderStatus = order.orderStatus || order.status;
    return orderStatus?.toLowerCase() === activeFilter;
  });

  // Handle opening order details
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  // Handle closing order details
  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  // Handle filter change
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  // Handle retry on error
  const handleRetry = () => {
    // Re-fetch orders
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate API call with a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let orders = [];
        
        // Only fetch orders if user is authenticated and has an identifier
        if (user && (user.phone || user.email || user.identifier)) {
          try {
            // Determine the customer identifier - prioritize phone, then email, then identifier
            const customerIdentifier = user.phone || user.email || user.identifier;
            
            // Fetch orders for this specific customer by identifier (phone or email)
            console.log('[ORDERS VIEW] Fetching orders for customer identifier:', customerIdentifier);
            orders = await api.public.orders.getByCustomerIdentifier(customerIdentifier);
            console.log('[ORDERS VIEW] Fetched customer orders:', orders);
          } catch (apiError) {
            console.error('API error fetching customer orders:', apiError);
            orders = []; // Use empty array if API fails
          }
        } else {
          console.log('[ORDERS VIEW] No user or identifier available:', { 
            hasPhone: !!user?.phone, 
            hasEmail: !!user?.email, 
            hasIdentifier: !!user?.identifier,
            isAuthenticated: !!user 
          });
        }
        
        setOrders(orders);
        
        // Track all orders for notifications
        orders.forEach(order => {
          if (order._id) {
            trackCustomerOrder(order._id);
            console.log('[ORDERS VIEW] Tracked order for notifications (retry):', order._id);
          }
        });
        
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err || new Error('Failed to load orders'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      style={{
        padding: isDesktop ? theme.spacing.lg : theme.spacing.md,
        maxWidth: isDesktop ? '1200px' : '100%',
        margin: '0 auto'
      }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg
        }}
      >
        <h2 style={{
          fontSize: isDesktop ? theme.typography.sizes["2xl"] : theme.typography.sizes.xl,
          fontWeight: theme.typography.fontWeights.semibold,
          margin: 0,
          color: theme.colors.text.primary
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <span className="material-icons" style={{ 
              fontSize: isDesktop ? '32px' : '24px',
              color: theme.colors.primary 
            }}>
              receipt_long
            </span>
            My Orders
          </span>
        </h2>
      </motion.div>
        
      {/* Filter tabs */}
      <FilterTabs 
        activeFilter={activeFilter} 
        onFilterChange={handleFilterChange} 
      />

      {/* Conditional rendering based on state */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingState key="loading" />
        ) : error ? (
          <ErrorState key="error" error={error} onRetry={handleRetry} />
        ) : filteredOrders.length === 0 ? (
          <EmptyOrdersState 
            key="empty-orders-state" 
            message={
              activeFilter === 'all' 
                ? "You don't have any orders yet. Browse our menu and place your first order!"
                : `You don't have any ${activeFilter} orders.`
            } 
          />
        ) : (
          <motion.div
            key="orders"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md
            }}
          >
            {filteredOrders.map(order => (
              <OrderItem 
                key={order._id}
                order={order}
                onClick={handleOrderClick}
                isDesktop={isDesktop}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order details modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal 
            order={selectedOrder}
            onClose={handleCloseDetails}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Create protected wrapper component
const ProtectedOrdersView = () => {
  return (
    <ProtectedRoute>
      <OrdersView />
    </ProtectedRoute>
  );
};

export default ProtectedOrdersView;
