/**
 * Tax API Test Utility
 * 
 * A simple command-line utility to test the tax API endpoints.
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5001';
const PUBLIC_API_PATH = '/api/public';

// Test countries
const TEST_COUNTRIES = [
  'US',      // United States
  'GB',      // United Kingdom
  'CA',      // Canada
  'AU',      // Australia
  'DEFAULT', // Default tax rate
  'UNKNOWN'  // Should use DEFAULT
];

/**
 * Test a tax endpoint for a specific country
 */
async function testTaxEndpoint(country) {
  console.log(`\n🔍 Testing tax endpoint for country: ${country}`);
  
  try {
    const url = `${API_BASE_URL}${PUBLIC_API_PATH}/taxes/${country}`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error('Error details:', JSON.stringify(errorData, null, 2));
      } else {
        const text = await response.text();
        console.error('Response text:', text);
      }
      
      return { country, success: false, error: response.statusText };
    }
    
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Expected JSON but got: ${contentType}`);
      const text = await response.text().substring(0, 100);
      console.error(`Response preview: ${text}...`);
      return { country, success: false, error: 'Invalid content type' };
    }
    
    const data = await response.json();
    console.log(`✅ Success: ${data.success ? 'true' : 'false'}`);
    console.log(`📊 Tax data: ${JSON.stringify(data.data || data, null, 2)}`);
    
    return { 
      country, 
      success: true, 
      data: data.data || data,
      isDefault: data.isDefault || false
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { country, success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Tax API Tests');
  
  // Test health endpoint first
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/`);
    console.log(`API health check: ${healthResponse.status} ${healthResponse.statusText}`);
    if (!healthResponse.ok) {
      console.error('❌ API appears to be down. Tests may fail.');
    }
  } catch (error) {
    console.error(`❌ Cannot connect to API: ${error.message}`);
    console.error('Please make sure the server is running.');
    return;
  }
  
  // Test each country
  const results = {
    success: [],
    failed: [],
    default: [],
    details: {}
  };
  
  for (const country of TEST_COUNTRIES) {
    const result = await testTaxEndpoint(country);
    
    if (result.success) {
      results.success.push(country);
      if (result.isDefault) {
        results.default.push(country);
      }
    } else {
      results.failed.push(country);
    }
    
    results.details[country] = result;
  }
  
  // Print summary
  console.log('\n📝 Test Summary:');
  console.log(`✅ Successful: ${results.success.length}/${TEST_COUNTRIES.length}`);
  console.log(`🔄 Using default tax: ${results.default.length}/${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${TEST_COUNTRIES.length}`);
  
  if (results.failed.length > 0) {
    console.log(`Failed countries: ${results.failed.join(', ')}`);
  }
  
  if (results.default.length > 0) {
    console.log(`Countries using default tax: ${results.default.join(', ')}`);
  }
  
  console.log('\nDetailed results:');
  console.log(JSON.stringify(results.details, null, 2));
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
});
