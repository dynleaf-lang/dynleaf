const axios = require('axios');

// Cashfree PG v2 service helpers
// Env vars required:
// - CASHFREE_APP_ID
// - CASHFREE_SECRET_KEY
// - CASHFREE_ENV (test|prod)
// - CASHFREE_RETURN_URL (optional)

const CF_API_VERSION = '2022-09-01';

function getBaseUrl() {
  const env = (process.env.CASHFREE_ENV || 'test').toLowerCase();
  return env === 'prod'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function getHeaders() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new Error('Cashfree credentials missing. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY');
  }
  return {
    'x-client-id': appId,
    'x-client-secret': secret,
    'x-api-version': CF_API_VERSION,
    'Content-Type': 'application/json'
  };
}

// Create a Cashfree order and return payment_session_id along with order_id
async function createOrder({ amount, currency = 'INR', customer, orderMeta = {} }) {
  const base = getBaseUrl();
  const headers = getHeaders();

  const orderId = orderMeta.orderId || `OE-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const returnUrl = orderMeta.returnUrl || process.env.CASHFREE_RETURN_URL || undefined;

  // Sanitize customer_id for Cashfree: only alphanumeric, underscore, hyphen
  let rawId = customer?.id || `guest_${Date.now()}`;
  let safeId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const payload = {
    order_id: orderId,
    order_amount: Number(amount),
    order_currency: currency,
    customer_details: {
      customer_id: safeId,
      customer_email: customer?.email || 'guest@example.com',
      customer_phone: customer?.phone || '9999999999',
      customer_name: customer?.name || 'Guest'
    },
    order_meta: {
      return_url: returnUrl ? returnUrl.replace('{order_id}', orderId) : undefined,
      payment_methods: orderMeta.payment_methods || 'upi',
      // Prefer UPI intent first for quick app selection
      payment_method_config: {
        upi: {
          capture_payment: true,
          intent_flow: 'intent'
        }
      }
    }
  };

  // Clean undefineds
  Object.keys(payload.order_meta).forEach(k => payload.order_meta[k] === undefined && delete payload.order_meta[k]);

  const { data } = await axios.post(`${base}/orders`, payload, { headers });
  // data contains: order_id, order_status, payment_session_id
  return data;
}

// Get order status from Cashfree
async function getOrder(cfOrderId) {
  const base = getBaseUrl();
  const headers = getHeaders();
  const { data } = await axios.get(`${base}/orders/${cfOrderId}`, { headers });
  return data;
}

// Get payments for a CF order
async function getOrderPayments(cfOrderId) {
  const base = getBaseUrl();
  const headers = getHeaders();
  const { data } = await axios.get(`${base}/orders/${cfOrderId}/payments`, { headers });
  return data; // array
}

module.exports = {
  createOrder,
  getOrder,
  getOrderPayments
};
