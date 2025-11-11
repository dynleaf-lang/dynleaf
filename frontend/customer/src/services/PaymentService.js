import { PaymentAnalytics } from './PaymentAnalytics';

/**
 * Enhanced Payment Service for Cashfree Integration
 * Handles payment processing with improved error handling and retry logic
 */
export class PaymentService {
  constructor() {
    // TEMPORARY: Force production mode for Vercel deployment
    // Remove this override once environment variables are working correctly
    if (window.location.hostname.includes('dynleaf-customer.vercel.app') || 
        window.location.hostname.includes('vercel.app')) {
      this.cfMode = 'production';
      console.log('[PAYMENT SERVICE] 🔧 TEMPORARY OVERRIDE: Forced production mode for Vercel');
      console.log('[PAYMENT SERVICE] Remove this override once VITE_CASHFREE_ENV works correctly');
    } else {
      // Smart Cashfree mode detection
      this.cfMode = this.detectCashfreeMode();
    }
    
    this.retryAttempts = 0;
    this.maxRetries = 2;
    this.paymentTimeout = 5 * 60 * 1000; // 5 minutes
    this.analytics = new PaymentAnalytics();
    this.paymentStartTime = null;
    
    // Debug environment configuration
    console.log('[PAYMENT SERVICE] Environment Configuration:', {
      VITE_CASHFREE_ENV: import.meta.env.VITE_CASHFREE_ENV,
      MODE: import.meta.env.MODE,
      NODE_ENV: import.meta.env.NODE_ENV,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV,
      hostname: window.location.hostname,
      detectedMode: this.cfMode,
      allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('CASHFREE') || k.includes('API')),
      buildTimeCheck: typeof import.meta.env.VITE_CASHFREE_ENV !== 'undefined' ? 'FOUND' : 'NOT_FOUND',
      rawCashfreeEnvValue: import.meta.env.VITE_CASHFREE_ENV
    });
    
    // Additional validation for production environments
    if (this.cfMode === 'sandbox' && import.meta.env.PROD) {
      console.error('[PAYMENT SERVICE] 🚨 CRITICAL CONFIGURATION ERROR:');
      console.error('[PAYMENT SERVICE] Using sandbox mode in production build!');
      console.error('[PAYMENT SERVICE] This WILL cause payment_session_id errors.');
      console.error('[PAYMENT SERVICE] 🔧 FIX: Set VITE_CASHFREE_ENV=production in Vercel environment variables');
      console.error('[PAYMENT SERVICE] Current hostname:', window.location.hostname);
      console.error('[PAYMENT SERVICE] Current VITE_CASHFREE_ENV:', import.meta.env.VITE_CASHFREE_ENV || 'NOT_SET');
      
      // Show user-friendly alert in production
      if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app')) {
        setTimeout(() => {
          alert('⚠️ Payment Configuration Error\n\nThe payment system is misconfigured for production.\nPlease contact support or check the browser console for details.');
        }, 3000);
      }
    }
    
    // Verify environment consistency
    const isProductionDomain = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProductionDomain && this.cfMode === 'sandbox') {
      console.error('[PAYMENT SERVICE] 🚨 Environment Mismatch Detected:');
      console.error('[PAYMENT SERVICE] Production domain but using sandbox Cashfree mode');
      console.error('[PAYMENT SERVICE] Domain:', window.location.hostname);
      console.error('[PAYMENT SERVICE] Mode:', this.cfMode);
    }
  }

  /**
   * Detect the correct Cashfree mode based on environment
   */
  detectCashfreeMode() {
    const viteEnv = import.meta.env.VITE_CASHFREE_ENV;
    const isProductionEnvironment = window.location.hostname !== 'localhost' && 
                                   window.location.hostname !== '127.0.0.1';
    const isBuildProduction = import.meta.env.PROD === true;
    
    console.log('[PAYMENT SERVICE] Environment Detection Details:', {
      viteEnv,
      isProductionEnvironment,
      isBuildProduction,
      hostname: window.location.hostname,
      rawViteEnv: JSON.stringify(viteEnv)
    });
    
    // Check if API URL issue exists and try to fix it
    this.checkAndFixApiUrl();
    
    // Priority logic:
    // 1. If VITE_CASHFREE_ENV is explicitly set to 'prod' or 'production', use production
    // 2. If we're on a production domain AND it's a production build, use production
    // 3. If explicitly set to sandbox/test, use sandbox
    // 4. Otherwise use sandbox as safe default
    
    if (viteEnv === 'prod' || viteEnv === 'production') {
      console.log('[PAYMENT SERVICE] ✅ Using production mode (explicit env var)');
      return 'production';
    }
    
    if (viteEnv === 'sandbox' || viteEnv === 'test') {
      console.log('[PAYMENT SERVICE] ✅ Using sandbox mode (explicit env var)');
      return 'sandbox';
    }
    
    // Auto-detection for production environments
    if (isProductionEnvironment && isBuildProduction) {
      console.log('[PAYMENT SERVICE] ⚡ Production environment detected, auto-switching to production mode');
      console.warn('[PAYMENT SERVICE] 💡 Consider setting VITE_CASHFREE_ENV=production explicitly in your deployment for better control');
      return 'production';
    }
    
    // Safe default for all other cases
    console.log('[PAYMENT SERVICE] 🔧 Using sandbox mode (safe default for development)');
    if (isProductionEnvironment) {
      console.warn('[PAYMENT SERVICE] ⚠️ Production domain detected but using sandbox mode. Set VITE_CASHFREE_ENV=production if this is a production deployment.');
    }
    
    return 'sandbox';
  }

  /**
   * Check and fix API URL if needed
   */
  checkAndFixApiUrl() {
    // Try multiple environment variable names in priority order
    const currentApiUrl = import.meta.env.VITE_API_URL || 
                         import.meta.env.VITE_API_BASE_URL ||
                         import.meta.env.VITE_BACKEND_URL || 
                         import.meta.env.VITE_SERVER_URL;
    const isProductionEnvironment = window.location.hostname !== 'localhost' && 
                                   window.location.hostname !== '127.0.0.1';
    
    console.log('[PAYMENT SERVICE] Environment Variable Check:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL,
      resolvedApiUrl: currentApiUrl,
      isProduction: isProductionEnvironment
    });
    
    if (isProductionEnvironment && currentApiUrl?.includes('localhost')) {
      console.warn('[PAYMENT SERVICE] Production environment detected but API URL points to localhost');
      console.warn('[PAYMENT SERVICE] Current API URL:', currentApiUrl);
      console.warn('[PAYMENT SERVICE] No valid production URL found in environment variables');
      console.warn('[PAYMENT SERVICE] Please verify VITE_API_URL or VITE_API_BASE_URL is set correctly in deployment');
    }
    
    // Store the resolved API URL for other parts of the application to use
    if (currentApiUrl && window.api && typeof window.api.updateBaseUrl === 'function') {
      console.log('[PAYMENT SERVICE] Updating API client with resolved URL:', currentApiUrl);
      window.api.updateBaseUrl(currentApiUrl);
    }
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

      // Launch checkout modal - this will block until user completes or cancels
      console.log('[PAYMENT SERVICE] Opening Cashfree modal - waiting for user interaction...');
      const result = await cashfree.checkout(checkoutOptions);
      
      console.log('[PAYMENT SERVICE] Cashfree modal closed - processing result');
      console.log('[PAYMENT SERVICE] Raw result:', result);
      console.log('[PAYMENT SERVICE] Result type:', typeof result);
      console.log('[PAYMENT SERVICE] Result is null/undefined:', result == null);
      console.log('[PAYMENT SERVICE] Checkout completed, full result structure:', JSON.stringify(result, null, 2));

      const finalResult = this.handleCheckoutResult(result, cfOrderId);
      
      console.log('[PAYMENT SERVICE] Final processed result:', {
        success: finalResult.success,
        cancelled: finalResult.cancelled,
        reason: finalResult.reason,
        message: finalResult.message
      });
      
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
    // Case 1: Result is null or undefined - user closed modal without completing payment
    if (!result) {
      console.log('[PAYMENT SERVICE] Payment result is null - user closed modal without payment');
      this.analytics.trackPaymentCancelled('modal_closed_null_result');
      return {
        success: false,
        cancelled: true,
        message: 'Payment window was closed',
        reason: 'user_closed_modal',
        cfOrderId: cfOrderId
      };
    }

    // Case 2: Explicit error in result
    if (result.error) {
      console.error('[PAYMENT SERVICE] Payment error:', result.error);
      
      // Check if it's a user cancellation error
      const errorMsg = (result.error.message || '').toLowerCase();
      if (errorMsg.includes('cancel') || errorMsg.includes('abort') || errorMsg.includes('closed')) {
        console.log('[PAYMENT SERVICE] User cancelled payment via error');
        this.analytics.trackPaymentCancelled('error_cancellation');
        return {
          success: false,
          cancelled: true,
          message: 'Payment was cancelled',
          reason: 'user_cancelled',
          cfOrderId: cfOrderId
        };
      }
      
      throw new Error(result.error.message || 'Payment failed');
    }

    // Case 3: Successful payment with payment details
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

    // Case 4: Result exists but no payment details - likely user closed modal or cancelled
    console.log('[PAYMENT SERVICE] Payment result has no paymentDetails - treating as cancellation');
    console.log('[PAYMENT SERVICE] Full result:', JSON.stringify(result, null, 2));
    
    // Check for any indicators of cancellation in the result object
    const resultStr = JSON.stringify(result).toLowerCase();
    const isCancellation = resultStr.includes('cancel') || 
                          resultStr.includes('abort') || 
                          resultStr.includes('close') ||
                          result.cancelled === true ||
                          result.status === 'cancelled';
    
    if (isCancellation) {
      this.analytics.trackPaymentCancelled('explicit_cancellation');
    } else {
      this.analytics.trackPaymentCancelled('modal_closed_no_details');
    }
    
    return {
      success: false,
      cancelled: true,
      message: isCancellation ? 'Payment was cancelled' : 'Payment window was closed',
      reason: isCancellation ? 'user_cancelled' : 'modal_closed',
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
   * Manually set Cashfree mode (for testing/debugging)
   */
  setCashfreeMode(mode) {
    const validModes = ['production', 'sandbox'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
    }
    
    console.log(`[PAYMENT SERVICE] Manually setting mode from ${this.cfMode} to ${mode}`);
    this.cfMode = mode;
    return this.cfMode;
  }

  /**
   * Force production mode
   */
  forceProductionMode() {
    console.log('[PAYMENT SERVICE] Forcing production mode');
    return this.setCashfreeMode('production');
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