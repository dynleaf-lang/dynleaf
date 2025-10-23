const axios = require('axios');
const { 
  cacheOrderStatus, 
  getCachedOrderStatus, 
  cachePaymentDetails, 
  getCachedPaymentDetails 
} = require('../utils/paymentCache');

// Cashfree PG v2 service helpers
// Env vars required:
// - CASHFREE_APP_ID
// - CASHFREE_SECRET_KEY
// - CASHFREE_ENV (test|prod)
// - CASHFREE_RETURN_URL (optional)

const CF_API_VERSION = '2023-08-01'; // Using latest stable version with better UPI support

function getBaseUrl() {
  const env = (process.env.CASHFREE_ENV || 'test').toLowerCase();
  return env === 'prod'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function getHeaders() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  
  console.log('[CASHFREE] Auth Debug:', {
    appId: appId ? `${appId.substring(0, 8)}...` : 'Missing',
    secret: secret ? `${secret.substring(0, 8)}...` : 'Missing',
    env: process.env.CASHFREE_ENV
  });
  
  if (!appId || !secret) {
    throw new Error('Cashfree credentials missing. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY');
  }
  
  // Trim whitespace from credentials (common issue)
  const cleanAppId = appId.trim();
  const cleanSecret = secret.trim();
  
  return {
    'x-client-id': cleanAppId,
    'x-client-secret': cleanSecret,
    'x-api-version': CF_API_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// Create a Cashfree order and return payment_session_id along with order_id
async function createOrder({ amount, currency = 'INR', customer, orderMeta = {} }) {
  const base = getBaseUrl();
  
  try {
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

    console.log('[CASHFREE] Sending request to:', `${base}/orders`);
    console.log('[CASHFREE] Request headers:', {
      'x-client-id': headers['x-client-id'] ? `${headers['x-client-id'].substring(0, 8)}...` : 'Missing',
      'x-client-secret': headers['x-client-secret'] ? 'Set' : 'Missing',
      'x-api-version': headers['x-api-version'],
      'Content-Type': headers['Content-Type']
    });
    console.log('[CASHFREE] Request payload:', JSON.stringify(payload, null, 2));
    
    // Make the API call with timeout and retry logic for auth issues
    const axiosConfig = {
      headers,
      timeout: 30000, // 30 second timeout
      validateStatus: function (status) {
        // Accept 2xx status codes, and handle specific errors manually
        return status >= 200 && status < 300;
      }
    };
    
    const { data } = await axios.post(`${base}/orders`, payload, axiosConfig);
    
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
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          'x-client-id': error.config?.headers?.['x-client-id'] ? 'Set' : 'Missing',
          'x-client-secret': error.config?.headers?.['x-client-secret'] ? 'Set' : 'Missing',
          'x-api-version': error.config?.headers?.['x-api-version']
        }
      }
    });
    
    // Handle specific authentication errors
    if (error.response?.status === 401) {
      const errorMsg = error.response?.data?.message || 'Authentication failed';
      console.error('[CASHFREE] Authentication Error Details:', {
        message: errorMsg,
        code: error.response?.data?.code,
        type: error.response?.data?.type,
        possibleCauses: [
          'Invalid APP_ID or SECRET_KEY',
          'Credentials have extra whitespace',
          'Wrong environment (test vs prod)',
          'API version mismatch',
          'Credentials expired or deactivated'
        ]
      });
      throw new Error(`Cashfree Authentication Error: ${errorMsg}. Please verify your credentials and environment settings.`);
    }
    
    // Re-throw with more specific error message
    if (error.response?.data?.message) {
      throw new Error(`Cashfree Error: ${error.response.data.message}`);
    }
    throw error;
  }
}

// Get order status from Cashfree with caching
async function getOrder(cfOrderId) {
  try {
    // Check cache first
    const cached = getCachedOrderStatus(cfOrderId);
    if (cached) {
      return cached;
    }

    // If not cached, fetch from Cashfree
    const base = getBaseUrl();
    const headers = getHeaders();
    const { data } = await axios.get(`${base}/orders/${cfOrderId}`, { headers });
    
    // Cache the result for future requests
    cacheOrderStatus(cfOrderId, data);
    
    return data;
  } catch (error) {
    console.error('[CASHFREE] Get order failed:', {
      orderId: cfOrderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

// Get payments for a CF order with caching
async function getOrderPayments(cfOrderId) {
  try {
    // Check cache first
    const cached = getCachedPaymentDetails(cfOrderId);
    if (cached) {
      return cached;
    }

    // If not cached, fetch from Cashfree
    const base = getBaseUrl();
    const headers = getHeaders();
    const { data } = await axios.get(`${base}/orders/${cfOrderId}/payments`, { headers });
    
    // Cache the result for future requests
    cachePaymentDetails(cfOrderId, data);
    
    return data; // array
  } catch (error) {
    console.error('[CASHFREE] Get order payments failed:', {
      orderId: cfOrderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

// Test credentials by making a simple API call
async function validateCredentials() {
  try {
    const base = getBaseUrl();
    const headers = getHeaders();
    
    // Create a test order to validate credentials (then immediately get it to verify auth works)
    const testOrderId = `TEST-VALIDATION-${Date.now()}`;
    const testPayload = {
      order_id: testOrderId,
      order_amount: 1,
      order_currency: 'INR',
      customer_details: {
        customer_id: 'test_customer',
        customer_email: 'test@example.com',
        customer_phone: '9876543210',
        customer_name: 'Test Customer'
      },
      order_meta: {
        payment_methods: 'upi'
      }
    };
    
    // Create test order
    await axios.post(`${base}/orders`, testPayload, { headers });
    
    // Try to get the order to validate credentials
    const { data } = await axios.get(`${base}/orders/${testOrderId}`, { headers });
    
    console.log('[CASHFREE] Credentials validation successful:', {
      order_id: data.order_id,
      order_status: data.order_status,
      environment: process.env.CASHFREE_ENV
    });
    
    return { valid: true, data };
  } catch (error) {
    console.error('[CASHFREE] Credentials validation failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    return { 
      valid: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

module.exports = {
  createOrder,
  getOrder,
  getOrderPayments,
  validateCredentials
};
