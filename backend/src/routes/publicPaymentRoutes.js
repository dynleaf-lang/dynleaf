const express = require('express');
const router = express.Router();
const { createOrder, getOrder, getOrderPayments, validateCredentials } = require('../services/cashfreeService');
const { cashfreeWebhook } = require('../controllers/cashfreeWebhookController');
const { getCacheStats, clearCache } = require('../utils/paymentCache');

// Debug route to validate Cashfree credentials
router.get('/cashfree/validate', async (req, res) => {
  try {
    console.log('[PAYMENTS] Validating Cashfree credentials...');
    
    const result = await validateCredentials();
    
    return res.status(result.valid ? 200 : 401).json({
      success: result.valid,
      message: result.valid ? 'Credentials are valid' : 'Credentials validation failed',
      error: result.error,
      status: result.status,
      environment: {
        env: process.env.CASHFREE_ENV,
        hasAppId: !!process.env.CASHFREE_APP_ID,
        hasSecret: !!process.env.CASHFREE_SECRET_KEY,
        appIdLength: process.env.CASHFREE_APP_ID?.length,
        secretLength: process.env.CASHFREE_SECRET_KEY?.length,
        nodeEnv: process.env.NODE_ENV,
        detectedUrl: process.env.CASHFREE_ENV === 'prod' || process.env.CASHFREE_ENV === 'production' 
          ? 'https://api.cashfree.com/pg' 
          : 'https://sandbox.cashfree.com/pg'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PAYMENTS] Validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Validation failed with exception',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create Cashfree order and return payment_session_id for Drop-in/SDK
router.post('/cashfree/order', async (req, res) => {
  try {
    console.log('[PAYMENTS] Creating Cashfree order:', req.body);
    console.log('[PAYMENTS] Request headers:', {
      'content-type': req.get('content-type'),
      'user-agent': req.get('user-agent'),
      'origin': req.get('origin'),
      'host': req.get('host')
    });
    
    const { amount, currency = 'INR', customer = {}, orderMeta = {} } = req.body || {};
    
    // Enhanced validation
    if (!amount || Number(amount) <= 0) {
      console.error('[PAYMENTS] Invalid amount received:', { amount, type: typeof amount });
      return res.status(400).json({ 
        success: false,
        message: 'Invalid amount. Must be greater than 0',
        received: amount
      });
    }

    // Log environment info for debugging
    console.log('[PAYMENTS] Environment check:', {
      appId: process.env.CASHFREE_APP_ID ? 'Set' : 'Missing',
      secretKey: process.env.CASHFREE_SECRET_KEY ? 'Set' : 'Missing',
      env: process.env.CASHFREE_ENV,
      webhookUrl: process.env.CASHFREE_WEBHOOK_URL,
      returnUrl: process.env.CASHFREE_RETURN_URL,
      nodeEnv: process.env.NODE_ENV
    });

    const data = await createOrder({ amount, currency, customer, orderMeta });
    
    console.log('[PAYMENTS] Order created successfully:', {
      order_id: data.order_id,
      order_status: data.order_status,
      hasSessionId: !!data.payment_session_id,
      sessionIdLength: data.payment_session_id?.length,
      sessionIdPrefix: data.payment_session_id?.substring(0, 10),
      fullDataKeys: Object.keys(data)
    });
    
    // Validate the response before sending
    if (!data.payment_session_id) {
      console.error('[PAYMENTS] Critical: No payment_session_id in response from Cashfree service');
      return res.status(500).json({
        success: false,
        message: 'Payment session creation failed - no session ID received',
        debug: {
          receivedKeys: Object.keys(data),
          orderId: data.order_id,
          status: data.order_status
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data,
      debug: {
        timestamp: new Date().toISOString(),
        env: process.env.CASHFREE_ENV,
        apiVersion: '2023-08-01',
        sessionIdPresent: !!data.payment_session_id
      }
    });
  } catch (err) {
    console.error('[PAYMENTS] Cashfree create order error:', {
      message: err?.message,
      status: err?.response?.status,
      data: err?.response?.data,
      stack: err?.stack
    });
    
    return res.status(500).json({ 
      success: false,
      message: err?.response?.data?.message || err?.message || 'Payment init failed',
      error: {
        type: err?.response?.data?.type || 'unknown',
        code: err?.response?.status || 500
      }
    });
  }
});

// Get CF order details
router.get('/cashfree/order/:id', async (req, res) => {
  try {
    const data = await getOrder(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[PAYMENTS] Cashfree get order error:', err?.response?.data || err?.message);
    return res.status(500).json({ message: 'Failed to fetch payment order' });
  }
});

// Get CF payments list for an order
router.get('/cashfree/order/:id/payments', async (req, res) => {
  try {
    const data = await getOrderPayments(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[PAYMENTS] Cashfree get payments error:', err?.response?.data || err?.message);
    return res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

// Cashfree webhook endpoint for payment notifications
// This endpoint receives notifications from Cashfree about payment status changes
// Also handles GET requests for endpoint testing
router.get('/cashfree/webhook', (req, res) => {
  console.log('[WEBHOOK GET] Cashfree endpoint test request received');
  res.status(200).json({
    status: 'success',
    message: 'Cashfree webhook endpoint is active and ready',
    endpoint: '/api/public/payments/cashfree/webhook',
    methods: ['GET', 'POST'],
    supportedVersions: ['2023-08-01', '2025-01-01'],
    timestamp: new Date().toISOString(),
    server: 'OrderEase Backend'
  });
});

router.post('/cashfree/webhook', cashfreeWebhook);

// UPI Payment Test Endpoint (for debugging production issues)
router.post('/cashfree/test-upi', async (req, res) => {
  try {
    console.log('[UPI TEST] Testing UPI payment flow...');
    
    const testPayload = {
      amount: 10, // Minimum test amount
      currency: 'INR',
      customer: {
        name: 'Test User',
        email: 'test@dynleaf.com',
        phone: '9876543210',
        id: 'test_user_001'
      },
      orderMeta: {
        payment_methods: 'upi',
        orderId: `TEST-UPI-${Date.now()}`
      }
    };
    
    console.log('[UPI TEST] Creating test order with:', testPayload);
    
    const data = await createOrder(testPayload);
    
    return res.status(200).json({
      success: true,
      message: 'UPI test order created successfully',
      data,
      instructions: {
        next_steps: [
          '1. Use the payment_session_id with Cashfree SDK',
          '2. Complete payment in UPI app',
          '3. Check webhook logs for payment confirmation',
          '4. Verify order status via GET /cashfree/order/{order_id}'
        ]
      }
    });
  } catch (err) {
    console.error('[UPI TEST] Test failed:', err);
    return res.status(500).json({
      success: false,
      message: 'UPI test failed',
      error: err.message,
      troubleshooting: {
        check_credentials: 'Verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY',
        check_environment: 'Ensure CASHFREE_ENV is set to "prod" for production',
        check_webhook: 'Verify CASHFREE_WEBHOOK_URL is accessible',
        common_issues: [
          'Invalid credentials',
          'Network connectivity issues', 
          'Webhook URL not reachable',
          'Amount validation failed'
        ]
      }
    });
  }
});

// Test webhook endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/cashfree/webhook/test', async (req, res) => {
    console.log('[WEBHOOK TEST] Received test webhook:', req.body);
    
    // Simulate different webhook events for testing
    const testEvents = {
      success: {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order_id: req.body.order_id || 'OE-TEST-001',
          order_amount: req.body.amount || 100,
          payment_status: 'SUCCESS',
          payment_method: 'UPI',
          payment_time: new Date().toISOString(),
          cf_payment_id: 'CF_TEST_' + Date.now(),
          payment_message: 'Transaction Successful'
        }
      },
      failed: {
        type: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order_id: req.body.order_id || 'OE-TEST-001',
          payment_status: 'FAILED',
          payment_method: 'UPI',
          payment_message: 'Transaction Failed',
          error_details: { code: 'PAYMENT_DECLINED', message: 'Insufficient Balance' }
        }
      },
      dropped: {
        type: 'PAYMENT_USER_DROPPED_WEBHOOK',
        data: {
          order_id: req.body.order_id || 'OE-TEST-001',
          payment_method: 'UPI'
        }
      }
    };

    const eventType = req.body.event_type || 'success';
    const webhookData = testEvents[eventType];
    
    if (!webhookData) {
      return res.status(400).json({ error: 'Invalid event_type. Use: success, failed, or dropped' });
    }

    // Process the webhook
    req.body = webhookData;
    return await cashfreeWebhook(req, res);
  });
}

// Payment Configuration Diagnostic Endpoint
router.get('/cashfree/config-check', async (req, res) => {
  try {
    const config = {
      environment: process.env.CASHFREE_ENV || 'Not Set',
      appId: process.env.CASHFREE_APP_ID ? 'Configured' : 'Missing',
      secretKey: process.env.CASHFREE_SECRET_KEY ? 'Configured' : 'Missing',
      webhookUrl: process.env.CASHFREE_WEBHOOK_URL || 'Not Set',
      webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET ? 'Configured' : 'Missing',
      returnUrl: process.env.CASHFREE_RETURN_URL || 'Not Set',
      apiVersion: '2023-08-01',
      baseUrl: process.env.CASHFREE_ENV === 'prod' 
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg'
    };
    
    // Test basic connectivity to Cashfree
    let connectivityTest = 'Not Tested';
    try {
      const axios = require('axios');
      await axios.get(config.baseUrl, { timeout: 5000 });
      connectivityTest = 'Success';
    } catch (err) {
      connectivityTest = `Failed: ${err.message}`;
    }
    
    const issues = [];
    if (!process.env.CASHFREE_APP_ID) issues.push('CASHFREE_APP_ID not configured');
    if (!process.env.CASHFREE_SECRET_KEY) issues.push('CASHFREE_SECRET_KEY not configured');
    if (!process.env.CASHFREE_WEBHOOK_URL) issues.push('CASHFREE_WEBHOOK_URL not configured');
    if (process.env.CASHFREE_ENV !== 'prod' && process.env.CASHFREE_ENV !== 'test') {
      issues.push('CASHFREE_ENV should be either "prod" or "test"');
    }
    
    return res.status(200).json({
      status: issues.length === 0 ? 'healthy' : 'issues_detected',
      timestamp: new Date().toISOString(),
      configuration: config,
      connectivity: connectivityTest,
      issues: issues,
      recommendations: issues.length === 0 ? [
        'Configuration looks good!',
        'Test UPI payment using /cashfree/test-upi endpoint'
      ] : [
        'Fix the issues listed above',
        'Verify credentials from Cashfree merchant dashboard',
        'Ensure webhook URL is publicly accessible'
      ]
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check configuration',
      error: err.message
    });
  }
});

// Payment cache statistics (for monitoring and debugging)
router.get('/cashfree/cache/stats', (req, res) => {
  try {
    const stats = getCacheStats();
    return res.status(200).json({
      success: true,
      cache: {
        ...stats,
        hitRatePercentage: Math.round(stats.hitRate * 100),
        enabled: true,
        ttl: '30 seconds'
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get cache stats',
      error: err.message 
    });
  }
});

// Clear payment cache (for development/testing)
if (process.env.NODE_ENV !== 'production') {
  router.post('/cashfree/cache/clear', (req, res) => {
    try {
      clearCache();
      return res.status(200).json({
        success: true,
        message: 'Payment cache cleared',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to clear cache',
        error: err.message 
      });
    }
  });
}

module.exports = router;
