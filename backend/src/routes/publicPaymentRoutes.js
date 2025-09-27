const express = require('express');
const router = express.Router();
const { createOrder, getOrder, getOrderPayments } = require('../services/cashfreeService');
const { cashfreeWebhook } = require('../controllers/cashfreeWebhookController');

// Create Cashfree order and return payment_session_id for Drop-in/SDK
router.post('/cashfree/order', async (req, res) => {
  try {
    const { amount, currency = 'INR', customer = {}, orderMeta = {} } = req.body || {};
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const data = await createOrder({ amount, currency, customer, orderMeta });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('[PAYMENTS] Cashfree create order error:', err?.response?.data || err?.message);
    return res.status(500).json({ message: err?.response?.data?.message || err?.message || 'Payment init failed' });
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

module.exports = router;
