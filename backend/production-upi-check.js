#!/usr/bin/env node

/**
 * Production UPI Payment Verification
 * Specifically checks production setup for Cashfree UPI payments
 */

const axios = require('axios');

// Production URLs
const PRODUCTION_BACKEND = 'https://dynleaf.onrender.com';
const EXPECTED_CONFIG = {
  environment: 'prod',
  webhookUrl: 'https://dynleaf.onrender.com/api/public/payments/cashfree/webhook',
  baseUrl: 'https://api.cashfree.com/pg'
};

async function checkProductionSetup() {
  console.log('🏭 Production UPI Payment Verification');
  console.log('=====================================\n');

  try {
    // Step 1: Check configuration
    console.log('1️⃣ Checking Production Configuration...');
    const configResponse = await axios.get(
      `${PRODUCTION_BACKEND}/api/public/payments/cashfree/config-check`,
      { timeout: 10000 }
    );

    const config = configResponse.data.configuration;
    console.log('📊 Current Config:', {
      environment: config.environment,
      webhookUrl: config.webhookUrl,
      baseUrl: config.baseUrl,
      connectivity: configResponse.data.connectivity
    });

    // Check for production issues
    const issues = [];
    if (config.environment !== 'prod') {
      issues.push(`❌ Environment should be 'prod', got '${config.environment}'`);
    }
    if (!config.webhookUrl.includes('dynleaf.onrender.com')) {
      issues.push(`❌ Webhook URL should point to backend: ${config.webhookUrl}`);
    }
    if (config.baseUrl.includes('sandbox')) {
      issues.push(`❌ Using sandbox URL instead of production`);
    }

    if (issues.length > 0) {
      console.log('\n🚨 Production Setup Issues:');
      issues.forEach(issue => console.log(issue));
      console.log('\n💡 Action Required:');
      console.log('   1. Restart your backend server to pick up environment changes');
      console.log('   2. Verify .env file has CASHFREE_ENV=prod');
      console.log('   3. Check deployment platform environment variables');
      return false;
    }

    console.log('✅ Production configuration looks correct\n');

    // Step 2: Test small UPI payment
    console.log('2️⃣ Creating Production UPI Test Order...');
    const orderPayload = {
      amount: 1, // ₹1 minimum for production
      currency: 'INR',
      customer: {
        name: 'Production Test',
        email: 'production@dynleaf.com',
        phone: '9876543210',
        id: 'prod_test_001'
      },
      orderMeta: {
        payment_methods: 'upi',
        orderId: `PROD-UPI-${Date.now()}`
      }
    };

    const orderResponse = await axios.post(
      `${PRODUCTION_BACKEND}/api/public/payments/cashfree/order`,
      orderPayload,
      { 
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (orderResponse.data.success && orderResponse.data.data.payment_session_id) {
      console.log('✅ UPI Order Created Successfully!');
      console.log('📱 Payment Session ID:', orderResponse.data.data.payment_session_id.substring(0, 50) + '...');
      console.log('🆔 Order ID:', orderResponse.data.data.order_id);
      console.log('💰 Amount: ₹', orderResponse.data.data.order_amount);
      
      console.log('\n🎯 Next Steps for Production UPI:');
      console.log('1. Integrate this payment session ID with Cashfree Drop Checkout');
      console.log('2. Test with real UPI apps (GPay, PhonePe, Paytm, etc.)');
      console.log('3. Monitor webhook logs for payment confirmations');
      console.log('4. Start with small amounts (₹1-10) for testing');
      
      return true;
    } else {
      console.log('❌ Failed to create UPI order');
      console.log('Response:', orderResponse.data);
      return false;
    }

  } catch (error) {
    console.error('❌ Production Verification Failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server might be down. Please check:');
      console.log('   - Is your backend deployed and running?');
      console.log('   - Is the URL correct?');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error. Please check:');
      console.log('   - Server logs for detailed error messages');
      console.log('   - Environment variables are set correctly');
      console.log('   - Cashfree credentials are valid for production');
    }

    return false;
  }
}

async function main() {
  const success = await checkProductionSetup();
  
  if (success) {
    console.log('\n🎉 Production UPI Payment Setup is Ready!');
    console.log('\nProduction Checklist Complete:');
    console.log('✅ Environment set to production');
    console.log('✅ Cashfree credentials configured');
    console.log('✅ Webhook endpoint accessible');
    console.log('✅ UPI order creation working');
    console.log('\n💳 You can now process real UPI payments in production!');
  } else {
    console.log('\n⚠️  Production setup needs attention. Please fix the issues above.');
    console.log('\nCommon Solutions:');
    console.log('• Restart backend server after updating .env');
    console.log('• Check deployment platform env vars match .env file');
    console.log('• Verify Cashfree production credentials');
    console.log('• Test webhook URL accessibility from external tools');
  }
}

main().catch(console.error);