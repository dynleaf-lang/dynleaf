import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/apiClient';
import { theme } from '../../data/theme';

/**
 * PaymentReturn Component
 * Handles the return flow from Cashfree payment gateway
 * Verifies payment status and updates order accordingly
 */
const PaymentReturn = () => {
  const [status, setStatus] = useState('verifying'); // verifying | success | failed | error
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Extract parameters from URL
        const url = new URL(window.location.href);
        const cfOrderId = url.searchParams.get('order_id');
        const paymentReturn = url.searchParams.get('payment_return');

        console.log('[PAYMENT RETURN] Verifying payment:', { cfOrderId, paymentReturn });

        if (!cfOrderId || !paymentReturn) {
          // Not a payment return, do nothing
          return;
        }

        // Check payment status with Cashfree
        const response = await api.public.payments.cashfree.getOrder(cfOrderId);
        
        console.log('[PAYMENT RETURN] Payment status:', response);

        const { order_status, payment } = response || {};
        const paymentStatus = payment?.payment_status;

        if (paymentStatus === 'SUCCESS' || order_status === 'PAID') {
          setStatus('success');
          setMessage('Payment successful! Creating your order...');
          
          // Get order data from sessionStorage
          const orderDataStr = sessionStorage.getItem('pendingOrderData');
          if (orderDataStr) {
            try {
              const orderData = JSON.parse(orderDataStr);
              
              // Create order in database
              console.log('[PAYMENT RETURN] Creating order:', orderData);
              const orderResp = await api.public.orders.create({
                ...orderData,
                paymentStatus: 'paid',
                cfOrderId: cfOrderId
              });
              
              setOrderDetails(orderResp.data);
              setMessage('Payment successful! Your order has been confirmed.');
              
              // Clear session storage
              sessionStorage.removeItem('pendingOrderData');
              
            } catch (orderErr) {
              console.error('[PAYMENT RETURN] Error creating order:', orderErr);
              setMessage('Payment successful but order creation failed. Please contact support with reference: ' + cfOrderId);
            }
          }

          // Clear URL parameters after 2 seconds
          setTimeout(() => {
            const cleanUrl = url.origin + url.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Redirect to orders page
            setTimeout(() => {
              // Trigger navigation to orders tab
              document.dispatchEvent(new CustomEvent('navigateToOrders'));
            }, 2000);
          }, 2000);

        } else if (paymentStatus === 'FAILED' || order_status === 'ACTIVE') {
          setStatus('failed');
          setMessage('Payment was not completed. Please try again or choose a different payment method.');
          
          // Clear URL after 3 seconds
          setTimeout(() => {
            const cleanUrl = url.origin + url.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }, 3000);

        } else {
          setStatus('verifying');
          setMessage('Payment status is being confirmed. Please wait...');
          
          // Retry after 3 seconds
          setTimeout(() => verifyPayment(), 3000);
        }

      } catch (error) {
        console.error('[PAYMENT RETURN] Verification error:', error);
        setStatus('error');
        setMessage('Unable to verify payment status. Please check your orders or contact support.');
      }
    };

    // Check if we have payment return parameters
    const url = new URL(window.location.href);
    if (url.searchParams.has('payment_return') && url.searchParams.has('order_id')) {
      verifyPayment();
    }
  }, []);

  // If no payment parameters, don't show anything
  const url = new URL(window.location.href);
  if (!url.searchParams.has('payment_return') || !url.searchParams.has('order_id')) {
    return null;
  }

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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: theme.spacing.lg
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          backgroundColor: 'white',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: theme.shadows.xl
        }}
      >
        {/* Status Icon */}
        <div style={{ marginBottom: theme.spacing.lg }}>
          {status === 'verifying' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                display: 'inline-block',
                fontSize: '48px',
                color: theme.colors.primary
              }}
              className="material-icons"
            >
              sync
            </motion.div>
          )}
          
          {status === 'success' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              style={{
                display: 'inline-block',
                fontSize: '64px',
                color: theme.colors.success
              }}
              className="material-icons"
            >
              check_circle
            </motion.div>
          )}
          
          {status === 'failed' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              style={{
                display: 'inline-block',
                fontSize: '64px',
                color: theme.colors.danger
              }}
              className="material-icons"
            >
              error
            </motion.div>
          )}
          
          {status === 'error' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              style={{
                display: 'inline-block',
                fontSize: '64px',
                color: theme.colors.warning
              }}
              className="material-icons"
            >
              warning
            </motion.div>
          )}
        </div>

        {/* Status Title */}
        <h2 style={{
          marginBottom: theme.spacing.md,
          color: theme.colors.text.primary,
          fontSize: theme.typography.sizes.xl,
          fontWeight: theme.typography.fontWeights.bold
        }}>
          {status === 'verifying' && 'Verifying Payment'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'failed' && 'Payment Failed'}
          {status === 'error' && 'Verification Error'}
        </h2>

        {/* Message */}
        <p style={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.md,
          marginBottom: theme.spacing.lg,
          lineHeight: 1.6
        }}>
          {message}
        </p>

        {/* Order Details */}
        {orderDetails && status === 'success' && (
          <div style={{
            backgroundColor: theme.colors.background,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginTop: theme.spacing.md,
            textAlign: 'left'
          }}>
            <div style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              marginBottom: theme.spacing.xs
            }}>
              Order ID
            </div>
            <div style={{
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fontFamily.mono
            }}>
              {orderDetails.orderId}
            </div>
          </div>
        )}

        {/* Loading indicator for verifying state */}
        {status === 'verifying' && (
          <div style={{
            marginTop: theme.spacing.lg,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            Please do not close this window...
          </div>
        )}

        {/* Redirect message for success */}
        {status === 'success' && (
          <div style={{
            marginTop: theme.spacing.lg,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            Redirecting to your orders...
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PaymentReturn;
