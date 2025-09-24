const express = require('express');
const router = express.Router();
const { createOrder, getOrder, getOrderPayments } = require('../services/cashfreeService');

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

module.exports = router;
