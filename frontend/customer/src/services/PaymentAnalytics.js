/**
 * Payment Analytics Service
 * Tracks payment events, success rates, and user behavior
 */
export class PaymentAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.startTime = Date.now();
  }

  generateSessionId() {
    return `pay_analytics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
      // Only send in production to avoid cluttering dev logs
      if (import.meta.env.PROD) {
        // Send to backend analytics endpoint
        await fetch('/api/analytics/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });
      }
    } catch (error) {
      console.warn('[PAYMENT ANALYTICS] Failed to send event:', error);
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