#!/usr/bin/env node

/**
 * Environment Variable Verification Script
 * Checks if server has picked up the latest environment variables
 */

const axios = require('axios');

async function checkEnvironmentSync() {
  console.log('🔄 Checking Environment Variable Synchronization\n');

  const backends = [
    { name: 'Production', url: 'https://dynleaf.onrender.com' }
  ];

  for (const backend of backends) {
    console.log(`🌐 Testing ${backend.name}: ${backend.url}`);
    
    try {
      const response = await axios.get(`${backend.url}/api/public/payments/cashfree/config-check`, {
        timeout: 10000
      });

      const config = response.data.configuration;
      
      console.log(`📊 ${backend.name} Environment Status:`);
      console.log(`   Environment: ${config.environment} ${config.environment === 'prod' ? '✅' : '❌'}`);
      console.log(`   Webhook URL: ${config.webhookUrl}`);
      console.log(`   API Base: ${config.baseUrl}`);
      console.log(`   Connectivity: ${response.data.connectivity}`);
      
      // Check if environment matches expected production values
      const isProduction = config.environment === 'prod';
      const correctWebhook = config.webhookUrl.includes('dynleaf.onrender.com');
      const productionAPI = config.baseUrl.includes('api.cashfree.com');
      
      console.log(`\n📈 ${backend.name} Status:`);
      console.log(`   Production Mode: ${isProduction ? '✅ Yes' : '❌ No (using ' + config.environment + ')'}`);
      console.log(`   Correct Webhook: ${correctWebhook ? '✅ Yes' : '❌ No'}`);
      console.log(`   Production API: ${productionAPI ? '✅ Yes' : '❌ No (using sandbox)'}`);
      
      if (isProduction && correctWebhook && productionAPI) {
        console.log(`\n🎉 ${backend.name} is correctly configured for production UPI payments!`);
        
        // Test a simple order creation
        try {
          const testOrder = await axios.post(`${backend.url}/api/public/payments/cashfree/order`, {
            amount: 5,
            currency: 'INR',
            customer: {
              name: 'Env Test User',
              email: 'envtest@dynleaf.com',
              phone: '9876543210',
              id: 'env_test_' + Date.now()
            },
            orderMeta: {
              payment_methods: 'upi',
              orderId: `ENV-TEST-${Date.now()}`
            }
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          
          if (testOrder.data.success) {
            console.log(`✅ Production UPI order created successfully!`);
            console.log(`   Order ID: ${testOrder.data.data.order_id}`);
            console.log(`   Amount: ₹${testOrder.data.data.order_amount}`);
          }
        } catch (orderError) {
          console.log(`❌ Order creation test failed:`, orderError.response?.data || orderError.message);
        }
        
      } else {
        console.log(`\n⚠️  ${backend.name} needs environment variable updates`);
        console.log(`\nTo fix:`);
        if (!isProduction) console.log(`   • Set CASHFREE_ENV=prod in your deployment`);
        if (!correctWebhook) console.log(`   • Set CASHFREE_WEBHOOK_URL=https://dynleaf.onrender.com/api/public/payments/cashfree/webhook`);
        if (!productionAPI) console.log(`   • Ensure production environment is being read correctly`);
        console.log(`   • Restart your backend service after making changes`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to check ${backend.name}:`, {
        message: error.message,
        status: error.response?.status,
        url: backend.url
      });
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 ${backend.name} backend appears to be down or unreachable`);
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

checkEnvironmentSync().catch(console.error);