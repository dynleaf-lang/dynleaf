/**
 * Link Expiration Utilities
 * Helper functions for managing expired links and redirections
 */

/**
 * Redirect user to the link expired page
 * @param {string} reason - Optional reason for the expiration
 * @param {Object} options - Additional options
 */
export const redirectToLinkExpired = (reason = 'unknown', options = {}) => {
  try {
    // Log the expiration event for debugging
    console.warn('[LinkExpired] Redirecting due to expired link:', {
      reason,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
      ...options
    });

    // Clear any potentially expired data based on the reason
    clearExpiredData(reason);

    // Build the URL with optional parameters
    let expiredUrl = '/link-expired';
    const params = new URLSearchParams();
    
    if (reason && reason !== 'unknown') {
      params.set('reason', reason);
    }
    
    if (options.returnUrl) {
      params.set('return', encodeURIComponent(options.returnUrl));
    }
    
    if (params.toString()) {
      expiredUrl += `?${params.toString()}`;
    }

    // Use replace to prevent going back to the expired link
    window.location.replace(expiredUrl);
  } catch (error) {
    console.error('[LinkExpired] Error redirecting to expired page:', error);
    // Fallback to home page if there's an error
    window.location.replace('/');
  }
};

/**
 * Clear expired data from localStorage based on reason
 * @param {string} reason - The reason for expiration
 */
const clearExpiredData = (reason) => {
  try {
    const clearAll = () => {
      const expiredKeys = [
        'tempOrderData',
        'paymentSession',
        'checkoutData',
        'magicToken',
        'tempUserToken',
        'orderHash',
        'paymentIntent',
        'sessionToken',
        'tempCart',
        'quickOrderData'
      ];
      
      expiredKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    };

    switch (reason) {
      case 'payment':
      case 'payment-expired':
        // Clear payment-related data
        ['paymentSession', 'paymentIntent', 'checkoutData', 'orderHash'].forEach(key => {
          localStorage.removeItem(key);
        });
        break;
        
      case 'session':
      case 'session-timeout':
        // Clear session-related data
        ['sessionToken', 'tempUserToken', 'magicToken'].forEach(key => {
          localStorage.removeItem(key);
        });
        break;
        
      case 'order':
      case 'order-expired':
        // Clear order-related data
        ['tempOrderData', 'orderHash', 'quickOrderData', 'tempCart'].forEach(key => {
          localStorage.removeItem(key);
        });
        break;
        
      default:
        // Clear all expired data for unknown reasons
        clearAll();
        break;
    }
    
    console.log(`[LinkExpired] Cleared expired data for reason: ${reason}`);
  } catch (error) {
    console.warn('[LinkExpired] Error clearing expired data:', error);
  }
};

/**
 * Check if a timestamp or token has expired
 * @param {string|number} timestamp - Timestamp or expiry time
 * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns {boolean} - True if expired
 */
export const isExpired = (timestamp, maxAge = 60 * 60 * 1000) => {
  if (!timestamp) return true;
  
  try {
    const now = Date.now();
    const time = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
    
    return (now - time) > maxAge;
  } catch (error) {
    console.warn('[LinkExpired] Error checking expiration:', error);
    return true; // Assume expired on error
  }
};

/**
 * Check for expired magic tokens or session data and redirect if needed
 * Should be called on app initialization or route changes
 */
export const checkAndHandleExpiredData = () => {
  try {
    // Check for expired magic token
    const magicToken = localStorage.getItem('magicToken');
    const magicTokenTime = localStorage.getItem('magicTokenTime');
    
    if (magicToken && isExpired(magicTokenTime, 10 * 60 * 1000)) { // 10 minutes for magic tokens
      localStorage.removeItem('magicToken');
      localStorage.removeItem('magicTokenTime');
      console.log('[LinkExpired] Removed expired magic token');
    }

    // Check for expired payment sessions
    const paymentSession = localStorage.getItem('paymentSession');
    const paymentSessionTime = localStorage.getItem('paymentSessionTime');
    
    if (paymentSession && isExpired(paymentSessionTime, 15 * 60 * 1000)) { // 15 minutes for payment
      localStorage.removeItem('paymentSession');
      localStorage.removeItem('paymentSessionTime');
      localStorage.removeItem('paymentIntent');
      console.log('[LinkExpired] Removed expired payment session');
    }

    // Check for expired order data
    const tempOrderData = localStorage.getItem('tempOrderData');
    const tempOrderTime = localStorage.getItem('tempOrderTime');
    
    if (tempOrderData && isExpired(tempOrderTime, 30 * 60 * 1000)) { // 30 minutes for temp orders
      localStorage.removeItem('tempOrderData');
      localStorage.removeItem('tempOrderTime');
      localStorage.removeItem('orderHash');
      console.log('[LinkExpired] Removed expired order data');
    }

  } catch (error) {
    console.warn('[LinkExpired] Error checking expired data:', error);
  }
};

/**
 * Middleware to check for expired links in API responses
 * @param {Object} error - Error object from API call
 * @returns {boolean} - True if handled as expired link
 */
export const handleApiExpiredError = (error) => {
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
      
      redirectToLinkExpired(reason, {
        apiError: true,
        status: status,
        message: message
      });
      
      return true; // Handled
    }
    
    return false; // Not handled
  } catch (handlerError) {
    console.error('[LinkExpired] Error in API expiration handler:', handlerError);
    return false;
  }
};

/**
 * Enhanced version of redirectToLinkExpired that can be used in React components
 * @param {string} reason - Reason for expiration
 * @param {Object} options - Additional options
 * @param {Function} navigate - React Router navigate function (optional)
 */
export const handleLinkExpiration = (reason, options = {}, navigate = null) => {
  // Clear expired data first
  clearExpiredData(reason);
  
  if (navigate) {
    // Use React Router navigation if available
    let path = '/link-expired';
    const params = new URLSearchParams();
    
    if (reason && reason !== 'unknown') {
      params.set('reason', reason);
    }
    
    if (options.returnUrl) {
      params.set('return', encodeURIComponent(options.returnUrl));
    }
    
    if (params.toString()) {
      path += `?${params.toString()}`;
    }
    
    navigate(path, { replace: true });
  } else {
    // Fallback to direct redirect
    redirectToLinkExpired(reason, options);
  }
};

export default {
  redirectToLinkExpired,
  isExpired,
  checkAndHandleExpiredData,
  handleApiExpiredError,
  handleLinkExpiration
};