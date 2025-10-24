import { PaymentAnalytics } from './PaymentAnalytics';

/**
 * Enhanced Payment Service for Cashfree Integration
 * Handles payment processing with improved error handling and retry logic
 */
export class PaymentService {
  constructor() {
    this.cfMode = (import.meta.env.VITE_CASHFREE_ENV || 'sandbox') === 'prod' ? 'production' : 'sandbox';
    this.retryAttempts = 0;
    this.maxRetries = 2;
    this.paymentTimeout = 5 * 60 * 1000; // 5 minutes
    this.analytics = new PaymentAnalytics();
    this.paymentStartTime = null;
  }

  /**
   * Initialize Cashfree SDK with multiple fallback methods
   */
  async initializeCashfree() {
    if (!window.Cashfree) {
      throw new Error('Cashfree SDK not loaded');
    }

    try {
      console.log('[PAYMENT SERVICE] Initializing Cashfree with mode:', this.cfMode);
      
      // Method 1: Try constructor with new keyword
      try {
        const cashfree = new window.Cashfree({ mode: this.cfMode });
        console.log('[PAYMENT SERVICE] Initialized with constructor');
        return cashfree;
      } catch (constructorError) {
        console.log('[PAYMENT SERVICE] Constructor failed, trying direct call');
        
        // Method 2: Direct function call
        const cashfree = window.Cashfree({ mode: this.cfMode });
        console.log('[PAYMENT SERVICE] Initialized with direct call');
        return cashfree;
      }
    } catch (error) {
      console.error('[PAYMENT SERVICE] SDK initialization failed:', error);
      throw new Error('Failed to initialize payment system');
    }
  }

  /**
   * Process payment using Cashfree Modal Checkout
   */
  async processPayment(sessionData, options = {}) {
    const { sessionId, amount, cfOrderId } = sessionData;
    this.paymentStartTime = Date.now();
    
    if (!sessionId) {
      const error = new Error('Payment session ID is required');
      this.analytics.trackPaymentFailure(error, amount, this.retryAttempts);
      throw error;
    }

    console.log('[PAYMENT SERVICE] Starting payment process for session:', sessionId);
    this.analytics.trackPaymentInitiated(sessionId, amount, cfOrderId);

    try {
      // Initialize Cashfree SDK
      const cashfree = await this.initializeCashfree();
      
      // Configure checkout options
      const checkoutOptions = {
        paymentSessionId: sessionId,
        redirectTarget: '_modal', // Force modal mode
        appearance: {
          primaryColor: options.primaryColor || '#e74c3c',
          backgroundColor: options.backgroundColor || '#ffffff',
        },
        theme: options.theme || 'light'
      };

      console.log('[PAYMENT SERVICE] Starting checkout with options:', checkoutOptions);
      this.analytics.trackModalInteraction('opened', { options: checkoutOptions });

      // Launch checkout modal
      const result = await cashfree.checkout(checkoutOptions);
      
      console.log('[PAYMENT SERVICE] Checkout completed, full result structure:', JSON.stringify(result, null, 2));

      const finalResult = this.handleCheckoutResult(result, cfOrderId);
      
      // Track final result
      if (finalResult.success) {
        const duration = Date.now() - this.paymentStartTime;
        this.analytics.trackPaymentSuccess(finalResult.orderId, amount, duration);
      } else if (finalResult.cancelled) {
        this.analytics.trackPaymentCancelled('user_modal_close');
      }
      
      return finalResult;

    } catch (error) {
      console.error('[PAYMENT SERVICE] Payment processing error:', error);
      this.analytics.trackPaymentFailure(error, amount, this.retryAttempts);
      
      // Retry logic for specific errors
      if (this.retryAttempts < this.maxRetries && this.shouldRetry(error)) {
        this.retryAttempts++;
        this.analytics.trackRetryAttempt(this.retryAttempts, error.message, 'automatic');
        console.log(`[PAYMENT SERVICE] Retrying payment (attempt ${this.retryAttempts}/${this.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryAttempts));
        
        return this.processPayment(sessionData, options);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Handle and normalize checkout results
   */
  handleCheckoutResult(result, cfOrderId) {
    if (!result) {
      return {
        success: false,
        cancelled: true,
        message: 'Payment cancelled by user',
        cfOrderId: cfOrderId
      };
    }

    // Handle error results
    if (result.error) {
      console.error('[PAYMENT SERVICE] Payment error:', result.error);
      throw new Error(result.error.message || 'Payment failed');
    }

    // Handle successful payment
    if (result.paymentDetails) {
      console.log('[PAYMENT SERVICE] Payment successful, full result structure:', JSON.stringify(result, null, 2));
      console.log('[PAYMENT SERVICE] PaymentDetails structure:', JSON.stringify(result.paymentDetails, null, 2));
      
      // Log all possible payment ID locations
      console.log('[PAYMENT SERVICE] Checking for payment ID in multiple locations:');
      console.log('  - result.paymentId:', result.paymentId);
      console.log('  - result.paymentDetails.paymentId:', result.paymentDetails.paymentId);
      console.log('  - result.paymentDetails.payment_id:', result.paymentDetails.payment_id);
      console.log('  - result.payment_id:', result.payment_id);
      console.log('  - result.paymentDetails.cf_payment_id:', result.paymentDetails.cf_payment_id);
      console.log('  - result.paymentDetails.txnId:', result.paymentDetails.txnId);
      console.log('  - result.paymentDetails.transaction_id:', result.paymentDetails.transaction_id);
      console.log('  - result.paymentDetails.transactionId:', result.paymentDetails.transactionId);
      
      // Extract IDs from various possible locations in the result
      const orderId = result.orderId || 
                     result.paymentDetails.orderId || 
                     result.paymentDetails.order_id ||
                     result.order_id ||
                     cfOrderId; // Use passed cfOrderId as final fallback
                     
      const paymentId = result.paymentId || 
                       result.paymentDetails.paymentId || 
                       result.paymentDetails.payment_id ||
                       result.payment_id ||
                       result.paymentDetails.cf_payment_id ||
                       result.paymentDetails.txnId ||
                       result.paymentDetails.transaction_id ||
                       result.paymentDetails.transactionId ||
                       `payment_${Date.now()}`; // Generate fallback payment ID

      console.log('[PAYMENT SERVICE] Extracted IDs - orderId:', orderId, 'paymentId:', paymentId);
      console.log('[PAYMENT SERVICE] Available properties in result:', Object.keys(result));
      console.log('[PAYMENT SERVICE] Available properties in paymentDetails:', Object.keys(result.paymentDetails));
      console.log('[PAYMENT SERVICE] Passed cfOrderId:', cfOrderId);
      
      return {
        success: true,
        paymentDetails: result.paymentDetails,
        orderId: orderId,
        paymentId: paymentId,
        cfOrderId: cfOrderId, // Always include the cfOrderId we know
        paymentMessage: result.paymentDetails.paymentMessage
      };
    }

    // Handle modal closure without payment
    return {
      success: false,
      cancelled: true,
      message: 'Payment cancelled by user',
      cfOrderId: cfOrderId
    };
  }

  /**
   * Determine if error should trigger a retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'network error',
      'timeout',
      'connection failed',
      'sdk initialization failed'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Normalize errors for consistent handling
   */
  normalizeError(error) {
    const errorMessage = error.message || 'Payment failed';
    
    // Map common errors to user-friendly messages
    const errorMappings = {
      'sdk not loaded': 'Payment system not ready. Please refresh the page and try again.',
      'network error': 'Network connection issue. Please check your internet and try again.',
      'timeout': 'Payment request timed out. Please try again.',
      'insufficient funds': 'Insufficient balance in your account. Please try a different payment method.',
      'transaction declined': 'Payment was declined by your bank. Please try a different payment method.',
      'invalid session': 'Payment session expired. Please start over.',
      'user cancelled': 'Payment cancelled by user'
    };

    for (const [key, message] of Object.entries(errorMappings)) {
      if (errorMessage.toLowerCase().includes(key)) {
        return new Error(message);
      }
    }

    return error;
  }

  /**
   * Validate payment session data
   */
  validateSessionData(sessionData) {
    const { sessionId, amount, cfOrderId } = sessionData;

    if (!sessionId) {
      throw new Error('Payment session ID is missing');
    }

    // Enhanced amount validation (consistent with CheckoutForm)
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      throw new Error('Invalid payment amount: must be a valid number');
    }

    if (amount <= 0) {
      throw new Error('Invalid payment amount: must be greater than 0');
    }

    // Payment limits validation (consistent with CheckoutForm)
    const MIN_PAYMENT_AMOUNT = 1;
    const MAX_PAYMENT_AMOUNT = 100000;

    if (amount < MIN_PAYMENT_AMOUNT) {
      throw new Error(`Payment amount too low: minimum ₹${MIN_PAYMENT_AMOUNT}, received ₹${amount}`);
    }

    if (amount > MAX_PAYMENT_AMOUNT) {
      throw new Error(`Payment amount too high: maximum ₹${MAX_PAYMENT_AMOUNT.toLocaleString()}, received ₹${amount}`);
    }

    if (!cfOrderId) {
      throw new Error('Order ID is missing');
    }

    // Validate session ID format (basic check)
    if (typeof sessionId !== 'string' || sessionId.length < 10) {
      throw new Error('Invalid payment session format');
    }

    console.log('[PAYMENT SERVICE] Session data validation passed:', {
      sessionId: sessionId.substring(0, 10) + '...',
      amount,
      cfOrderId,
      limits: { min: MIN_PAYMENT_AMOUNT, max: MAX_PAYMENT_AMOUNT }
    });

    return true;
  }

  /**
   * Reset retry counter (call this for new payment attempts)
   */
  resetRetries() {
    this.retryAttempts = 0;
    this.paymentStartTime = null;
    // Create new analytics session for new payment
    this.analytics = new PaymentAnalytics();
  }

  /**
   * Get payment configuration
   */
  getPaymentConfig() {
    return {
      mode: this.cfMode,
      retryAttempts: this.retryAttempts,
      maxRetries: this.maxRetries,
      paymentTimeout: this.paymentTimeout
    };
  }

  /**
   * Get analytics instance for external tracking
   */
  getAnalytics() {
    return this.analytics;
  }

  /**
   * Export analytics data for debugging
   */
  exportAnalytics() {
    return this.analytics.exportEvents();
  }
}