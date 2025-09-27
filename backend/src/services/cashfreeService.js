const axios = require('axios');

// Cashfree PG v2 service helpers
// Env vars required:
// - CASHFREE_APP_ID
// - CASHFREE_SECRET_KEY
// - CASHFREE_ENV (test|prod)
// - CASHFREE_RETURN_URL (optional)

const CF_API_VERSION = '2023-08-01'; // Updated to stable version with better UPI support

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

  // Generate unique order ID
  const orderId = orderMeta.orderId || `OE-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const returnUrl = orderMeta.returnUrl || process.env.CASHFREE_RETURN_URL || undefined;

  // Sanitize customer_id for Cashfree: only alphanumeric, underscore, hyphen
  let rawId = customer?.id || `guest_${Date.now()}`;
  let safeId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Validate and sanitize phone number for Cashfree
  let phone = customer?.phone || '';
  // Remove all non-digit characters
  phone = phone.replace(/\D/g, '');
  // If phone is empty or less than 10 digits, use valid default
  if (!phone || phone.length < 10) {
    phone = '9876543210'; // Valid 10-digit Indian number
  }
  
  // Validate amount
  const orderAmount = Number(amount);
  if (orderAmount < 1) {
    throw new Error('Amount must be at least ₹1 for UPI payments');
  }
  
  console.log('[CASHFREE] Creating order:', {
    orderId,
    amount: orderAmount,
    currency,
    customer: {
      id: safeId,
      phone,
      email: customer?.email || 'guest@example.com',
      name: customer?.name || 'Guest'
    },
    env: process.env.CASHFREE_ENV
  });
  
  const payload = {
    order_id: orderId,
    order_amount: orderAmount,
    order_currency: currency,
    customer_details: {
      customer_id: safeId,
      customer_email: customer?.email || 'guest@example.com',
      customer_phone: phone,
      customer_name: customer?.name || 'Guest'
    },
    order_meta: {
      return_url: returnUrl ? returnUrl.replace('{order_id}', orderId) : undefined,
      payment_methods: orderMeta.payment_methods || 'upi,nb,card',
      // Optimize UPI configuration for production
      payment_method_config: {
        upi: {
          capture_payment: true,
          intent_flow: 'intent', // Use intent for faster UPI app opening
          collect_timeout: 120 // 2 minutes timeout for UPI collect
        }
      },
      // Add notification URL for webhook
      notify_url: process.env.CASHFREE_WEBHOOK_URL || undefined
    }
  };

  // Clean undefineds
  Object.keys(payload.order_meta).forEach(k => payload.order_meta[k] === undefined && delete payload.order_meta[k]);

  try {
    console.log('[CASHFREE] Sending request to:', `${base}/orders`);
    console.log('[CASHFREE] Request payload:', JSON.stringify(payload, null, 2));
    
    const { data } = await axios.post(`${base}/orders`, payload, { headers });
    
    console.log('[CASHFREE] Order created successfully:', {
      order_id: data.order_id,
      order_status: data.order_status,
      payment_session_id: data.payment_session_id?.substring(0, 20) + '...'
    });
    
    // data contains: order_id, order_status, payment_session_id
    return data;
  } catch (error) {
    console.error('[CASHFREE] Order creation failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method
      }
    });
    
    // Re-throw with more specific error message
    if (error.response?.data?.message) {
      throw new Error(`Cashfree Error: ${error.response.data.message}`);
    }
    throw error;
  }
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
