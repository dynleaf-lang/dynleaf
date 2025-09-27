#!/usr/bin/env node

/**
 * UPI Payment Test Script
 * Tests the complete UPI payment flow to identify issues
 */

const axios = require('axios');

// Configuration - Update these URLs based on your deployment
const BACKEND_URL = process.env.BACKEND_URL || 'https://dynleaf.onrender.com';
const LOCAL_URL = 'http://localhost:5001';

// Test endpoints
const endpoints = {
  config: '/api/public/payments/cashfree/config-check',
  createOrder: '/api/public/payments/cashfree/order',
  testUPI: '/api/public/payments/cashfree/test-upi',
  webhook: '/api/public/payments/cashfree/webhook'
};

async function testEndpoint(baseUrl, endpoint, method = 'GET', data = null) {
  try {
    const url = `${baseUrl}${endpoint}`;
    console.log(`\n🔍 Testing ${method} ${url}`);
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, { timeout: 10000 });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { 
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Success:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (response.data) {
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    
    if (error.response?.data) {
      console.error('📄 Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, error: error.message, data: error.response?.data };
  }
}

async function runTests(baseUrl) {
  console.log(`\n🚀 Running UPI Payment Tests against: ${baseUrl}`);
  console.log('=' .repeat(60));
  
  // Test 1: Configuration Check
  console.log('\n1️⃣ Testing Configuration...');
  const configResult = await testEndpoint(baseUrl, endpoints.config, 'GET');
  
  if (!configResult.success) {
    console.log('\n❌ Configuration test failed. Stopping tests.');
    return;
  }
  
  // Test 2: Webhook Endpoint
  console.log('\n2️⃣ Testing Webhook Endpoint...');
  await testEndpoint(baseUrl, endpoints.webhook, 'GET');
  
  // Test 3: UPI Test Order
  console.log('\n3️⃣ Testing UPI Order Creation...');
  const upiResult = await testEndpoint(baseUrl, endpoints.testUPI, 'POST', {});
  
  // Test 4: Regular Order Creation
  console.log('\n4️⃣ Testing Regular Order Creation...');
  const orderData = {
    amount: 50,
    currency: 'INR',
    customer: {
      name: 'Test Customer',
      email: 'test@dynleaf.com',
      phone: '9876543210',
      id: 'test_customer_123'
    },
    orderMeta: {
      payment_methods: 'upi',
      orderId: `TEST-${Date.now()}`
    }
  };
  
  const orderResult = await testEndpoint(baseUrl, endpoints.createOrder, 'POST', orderData);
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('=' .repeat(60));
  console.log(`Configuration: ${configResult.success ? '✅ Pass' : '❌ Fail'}`);
  console.log(`UPI Test: ${upiResult?.success ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Order Creation: ${orderResult?.success ? '✅ Pass' : '❌ Fail'}`);
  
  if (orderResult?.success && orderResult?.data?.data?.payment_session_id) {
    console.log('\n🎉 UPI Payment Setup Success!');
    console.log('Next Steps:');
    console.log('1. Use payment_session_id with Cashfree Drop Checkout');
    console.log('2. Complete payment in UPI app');
    console.log('3. Check webhook logs for payment confirmation');
    console.log('\nPayment Session ID:', orderResult.data.data.payment_session_id.substring(0, 50) + '...');
  } else {
    console.log('\n⚠️  Issues detected. Check the error messages above.');
  }
}

async function main() {
  console.log('🔧 UPI Payment Diagnostic Tool');
  console.log('This tool will test your UPI payment configuration and identify issues.');
  
  // Test production first
  console.log('\n🌐 Testing Production Environment...');
  await runTests(BACKEND_URL);
  
  // Test local if available
  try {
    console.log('\n🏠 Testing Local Environment...');
    await axios.get(`${LOCAL_URL}/api/public/payments/cashfree/config-check`, { timeout: 3000 });
    await runTests(LOCAL_URL);
  } catch (error) {
    console.log('\n⚠️  Local server not available, skipping local tests.');
  }
  
  console.log('\n✨ Diagnostic complete!');
  console.log('\nIf issues persist:');
  console.log('1. Check Cashfree merchant dashboard for API keys');
  console.log('2. Verify webhook URL is publicly accessible');
  console.log('3. Check server logs for detailed error messages');
  console.log('4. Test with smaller amounts (₹1-₹10) first');
}

// Run the test
main().catch(console.error);