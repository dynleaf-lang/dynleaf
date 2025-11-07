/**
 * Payment Analytics Service
 * Tracks payment events, success rates, and user behavior
 */
export class PaymentAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.startTime = Date.now();
    this.apiUrl = this.getProductionApiUrl();
    
    // Smart analytics enablement logic
    this.enabled = this.shouldEnableAnalytics();
    
    // Debug logging for configuration
    console.log('[PAYMENT ANALYTICS] Configuration:', {
      apiUrl: this.apiUrl,
      enabled: this.enabled,
      environment: import.meta.env.NODE_ENV,
      mode: import.meta.env.MODE,
      isProduction: import.meta.env.PROD,
      hasProductionUrl: this.hasProductionUrl()
    });
    
    // Enhanced environment debugging
    console.log('[PAYMENT ANALYTICS] Environment Variables Debug:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_CASHFREE_ENV: import.meta.env.VITE_CASHFREE_ENV,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV,
      allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')),
      buildTimeCheck: 'VITE_API_URL' in import.meta.env ? 'FOUND' : 'NOT_FOUND',
      fallbackUsed: this.apiUrl === 'http://localhost:5001' ? 'YES' : 'NO',
      cashfreeEnvValue: import.meta.env.VITE_CASHFREE_ENV || 'NOT_SET'
    });
    
    // Runtime environment detection
    console.log('[PAYMENT ANALYTICS] Runtime Environment:', {
      origin: window.location.origin,
      hostname: window.location.hostname,
      isLocalhost: window.location.hostname === 'localhost',
      isProduction: window.location.hostname !== 'localhost',
      userAgent: navigator.userAgent.substring(0, 50)
    });
  }

  /**
   * Get the correct API URL with fallback logic for production
   */
  getProductionApiUrl() {
    // First try environment variables
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    
    if (envUrl && envUrl !== 'http://localhost:5001') {
      console.log('[PAYMENT ANALYTICS] Using environment URL:', envUrl);
      return envUrl;
    }
    
    // Runtime detection for production
    const hostname = window.location.hostname;
    
    // If we're on a production domain but env var is missing/localhost
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const productionUrl = 'https://dynleaf.onrender.com';
      console.warn('[PAYMENT ANALYTICS] Environment variable missing, using hardcoded production URL:', productionUrl);
      console.warn('[PAYMENT ANALYTICS] Please set VITE_API_URL in your deployment environment');
      return productionUrl;
    }
    
    // Default to localhost for local development
    console.log('[PAYMENT ANALYTICS] Using localhost for development');
    return 'http://localhost:5001';
  }

  /**
   * Determine if analytics should be enabled based on environment and configuration
   */
  shouldEnableAnalytics() {
    // Disable analytics in development by default
    if (import.meta.env.DEV) {
      return false;
    }
    
    // In production, only enable if we have a proper production API URL
    if (import.meta.env.PROD) {
      return this.hasProductionUrl();
    }
    
    // Default to disabled
    return false;
  }

  /**
   * Check if we have a production API URL (not localhost)
   */
  hasProductionUrl() {
    return this.apiUrl && 
           !this.apiUrl.includes('localhost') && 
           !this.apiUrl.includes('127.0.0.1') &&
           !this.apiUrl.includes('0.0.0.0') &&
           this.apiUrl.startsWith('http');
  }

  generateSessionId() {
    return `pay_analytics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[PAYMENT ANALYTICS] Analytics ${enabled ? 'enabled' : 'disabled'} manually`);
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Force enable analytics for testing (bypasses URL checks)
   */
  forceEnable() {
    this.enabled = true;
    console.log('[PAYMENT ANALYTICS] Analytics force enabled for testing');
  }

  /**
   * Update API URL and re-evaluate enablement
   */
  updateApiUrl(newUrl) {
    this.apiUrl = newUrl;
    this.enabled = this.shouldEnableAnalytics();
    console.log('[PAYMENT ANALYTICS] API URL updated:', {
      apiUrl: this.apiUrl,
      enabled: this.enabled
    });
  }

  /**
   * Auto-fix production URL if environment variable is missing
   */
  autoFixProductionUrl() {
    if (window.location.hostname !== 'localhost' && this.apiUrl.includes('localhost')) {
      const productionUrl = 'https://dynleaf.onrender.com';
      console.log('[PAYMENT ANALYTICS] Auto-fixing production URL to:', productionUrl);
      this.updateApiUrl(productionUrl);
      return true;
    }
    return false;
  }

  /**
   * Track a payment event with context
   */
  trackEvent(eventName, data = {}) {
    const event = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      event: eventName,
      data: {
        ...data,
        // Browser context
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Performance context
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576),
          total: Math.round(performance.memory.totalJSHeapSize / 1048576),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null,
        connectionType: navigator.connection?.effectiveType || 'unknown'
      }
    };

    this.events.push(event);
    
    // Send to analytics service
    this.sendToAnalytics(event);
    
    console.log('[PAYMENT ANALYTICS]', eventName, event.data);
  }

  /**
   * Send analytics data to backend or external service
   */
  async sendToAnalytics(event) {
    try {
      // Only send analytics if enabled
      if (!this.enabled) {
        console.log('[PAYMENT ANALYTICS] Analytics disabled, skipping event:', {
          event: event.event,
          reason: this.hasProductionUrl() ? 'Manual disable' : 'No production URL',
          apiUrl: this.apiUrl,
          environment: import.meta.env.MODE
        });
        return;
      }

      // Additional validation
      if (!this.apiUrl) {
        console.warn('[PAYMENT ANALYTICS] No API URL configured, skipping event:', event.event);
        return;
      }

      const url = `${this.apiUrl}/api/analytics/payment`;
      console.log('[PAYMENT ANALYTICS] Sending event to:', url);

      // Send to backend analytics endpoint using the correct API URL
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Analytics API responded with status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json().catch(() => null);
      console.log('[PAYMENT ANALYTICS] Event sent successfully:', {
        event: event.event,
        response: result
      });
    } catch (error) {
      console.warn('[PAYMENT ANALYTICS] Failed to send event:', {
        event: event.event,
        error: error.message,
        apiUrl: this.apiUrl,
        enabled: this.enabled
      });
      // Don't throw error - analytics failure shouldn't break payment flow
    }
  }

  // Specific tracking methods
  trackPaymentFlowStarted(amount, paymentMethod = 'upi') {
    this.trackEvent('payment_flow_started', {
      amount,
      paymentMethod,
      cartItems: this.getCartSummary()
    });
  }

  trackSDKLoaded(loadTime) {
    this.trackEvent('sdk_loaded', {
      loadTime,
      loadTimeFromStart: Date.now() - this.startTime
    });
  }

  trackSDKError(error, retryCount = 0) {
    this.trackEvent('sdk_error', {
      error: error.message || error,
      retryCount,
      errorType: this.categorizeError(error)
    });
  }

  trackPaymentInitiated(sessionId, amount, cfOrderId) {
    this.trackEvent('payment_initiated', {
      sessionId: sessionId?.substring(0, 20) + '...',
      amount,
      cfOrderId,
      timeFromStart: Date.now() - this.startTime
    });
  }

  trackUpiAppSelected(appKey, appLabel) {
    this.trackEvent('upi_app_selected', {
      appKey,
      appLabel,
      selectionTime: Date.now() - this.startTime
    });
  }

  trackPaymentSuccess(orderId, amount, paymentDuration) {
    this.trackEvent('payment_success', {
      orderId,
      amount,
      paymentDuration,
      totalFlowDuration: Date.now() - this.startTime
    });
  }

  trackPaymentFailure(error, amount, retryCount = 0) {
    this.trackEvent('payment_failure', {
      error: error.message || error,
      errorType: this.categorizeError(error),
      amount,
      retryCount,
      failureTime: Date.now() - this.startTime
    });
  }

  trackPaymentCancelled(reason = 'user_cancelled') {
    this.trackEvent('payment_cancelled', {
      reason,
      cancellationTime: Date.now() - this.startTime
    });
  }

  trackRetryAttempt(attempt, reason, method = 'manual') {
    this.trackEvent('payment_retry', {
      attempt,
      reason,
      method, // manual | automatic
      retryTime: Date.now() - this.startTime
    });
  }

  trackPaymentMethodChanged(fromMethod, toMethod) {
    this.trackEvent('payment_method_changed', {
      fromMethod,
      toMethod,
      changeTime: Date.now() - this.startTime
    });
  }

  trackModalInteraction(action, data = {}) {
    this.trackEvent('modal_interaction', {
      action, // opened | closed | minimized | focus_lost | focus_gained
      ...data,
      interactionTime: Date.now() - this.startTime
    });
  }

  trackNetworkCondition(condition) {
    this.trackEvent('network_condition', {
      condition, // online | offline | slow | fast
      timestamp: Date.now()
    });
  }

  /**
   * Categorize errors for better analytics
   */
  categorizeError(error) {
    const errorMessage = (error.message || error).toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'network';
    }
    if (errorMessage.includes('timeout')) {
      return 'timeout';
    }
    if (errorMessage.includes('sdk') || errorMessage.includes('script')) {
      return 'sdk';
    }
    if (errorMessage.includes('session') || errorMessage.includes('expired')) {
      return 'session';
    }
    if (errorMessage.includes('amount') || errorMessage.includes('invalid')) {
      return 'validation';
    }
    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return 'insufficient_funds';
    }
    if (errorMessage.includes('declined') || errorMessage.includes('blocked')) {
      return 'payment_declined';
    }
    
    return 'unknown';
  }

  /**
   * Get cart summary for analytics
   */
  getCartSummary() {
    try {
      const cartData = localStorage.getItem('cart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        return {
          itemCount: cart.items?.length || 0,
          totalAmount: cart.total || 0,
          categories: this.getCartCategories(cart.items || [])
        };
      }
    } catch (error) {
      console.warn('[PAYMENT ANALYTICS] Failed to get cart summary:', error);
    }
    
    return {
      itemCount: 0,
      totalAmount: 0,
      categories: []
    };
  }

  /**
   * Extract categories from cart items
   */
  getCartCategories(items) {
    const categories = new Set();
    items.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Get analytics summary for debugging
   */
  getSummary() {
    const eventTypes = {};
    this.events.forEach(event => {
      eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
    });

    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      sessionDuration: Date.now() - this.startTime,
      eventTypes,
      firstEvent: this.events[0]?.event,
      lastEvent: this.events[this.events.length - 1]?.event
    };
  }

  /**
   * Export all events for debugging
   */
  exportEvents() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      events: this.events,
      summary: this.getSummary()
    };
  }
}