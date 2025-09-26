import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleLinkExpiration, checkAndHandleExpiredData } from '../utils/linkExpiration';

/**
 * Custom hook for handling link expiration in React components
 * Provides easy-to-use methods for detecting and handling expired links
 */
export const useLinkExpiration = () => {
  const navigate = useNavigate();

  /**
   * Handle expired link with navigation
   * @param {string} reason - Reason for expiration
   * @param {Object} options - Additional options
   */
  const handleExpired = useCallback((reason = 'unknown', options = {}) => {
    handleLinkExpiration(reason, options, navigate);
  }, [navigate]);

  /**
   * Check and clean up expired data
   * Call this on component mount or when needed
   */
  const checkExpiredData = useCallback(() => {
    checkAndHandleExpiredData();
  }, []);

  /**
   * Check if user should be redirected based on current conditions
   * @param {Object} conditions - Conditions to check
   * @returns {boolean} - True if user was redirected
   */
  const checkAndRedirectIfExpired = useCallback((conditions = {}) => {
    try {
      const {
        requireAuth = false,
        requireValidOrder = false,
        requireValidPayment = false,
        maxAge = 60 * 60 * 1000 // 1 hour default
      } = conditions;

      // Check authentication expiration
      if (requireAuth) {
        const sessionToken = localStorage.getItem('sessionToken');
        const sessionTime = localStorage.getItem('sessionTime');
        
        if (!sessionToken || !sessionTime) {
          handleExpired('session', { reason: 'missing_session' });
          return true;
        }

        const now = Date.now();
        const time = parseInt(sessionTime);
        if ((now - time) > maxAge) {
          handleExpired('session', { reason: 'session_timeout' });
          return true;
        }
      }

      // Check order validity
      if (requireValidOrder) {
        const orderHash = localStorage.getItem('orderHash');
        const orderTime = localStorage.getItem('orderTime');
        
        if (!orderHash) {
          handleExpired('order', { reason: 'missing_order' });
          return true;
        }

        if (orderTime) {
          const now = Date.now();
          const time = parseInt(orderTime);
          if ((now - time) > (30 * 60 * 1000)) { // 30 minutes for orders
            handleExpired('order', { reason: 'order_timeout' });
            return true;
          }
        }
      }

      // Check payment validity
      if (requireValidPayment) {
        const paymentSession = localStorage.getItem('paymentSession');
        const paymentTime = localStorage.getItem('paymentSessionTime');
        
        if (!paymentSession) {
          handleExpired('payment', { reason: 'missing_payment_session' });
          return true;
        }

        if (paymentTime) {
          const now = Date.now();
          const time = parseInt(paymentTime);
          if ((now - time) > (15 * 60 * 1000)) { // 15 minutes for payments
            handleExpired('payment', { reason: 'payment_timeout' });
            return true;
          }
        }
      }

      return false; // No redirection needed
    } catch (error) {
      console.error('[useLinkExpiration] Error checking conditions:', error);
      return false;
    }
  }, [handleExpired]);

  /**
   * Handle API errors that might indicate expiration
   * @param {Object} error - Error from API call
   * @returns {boolean} - True if handled as expiration
   */
  const handleApiError = useCallback((error) => {
    try {
      const response = error.response;
      const status = response?.status;
      const message = response?.data?.message || error.message || '';
      
      // Check for common expiration indicators
      const isExpiredError = (
        status === 401 ||
        status === 403 ||
        message.toLowerCase().includes('expired') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('session')
      );
      
      if (isExpiredError) {
        let reason = 'session';
        
        if (message.toLowerCase().includes('payment')) reason = 'payment';
        else if (message.toLowerCase().includes('order')) reason = 'order';
        else if (message.toLowerCase().includes('magic')) reason = 'magic-token';
        
        handleExpired(reason, {
          apiError: true,
          status: status,
          message: message
        });
        
        return true; // Handled
      }
      
      return false; // Not handled
    } catch (handlerError) {
      console.error('[useLinkExpiration] Error in API error handler:', handlerError);
      return false;
    }
  }, [handleExpired]);

  return {
    handleExpired,
    checkExpiredData,
    checkAndRedirectIfExpired,
    handleApiError
  };
};

export default useLinkExpiration;