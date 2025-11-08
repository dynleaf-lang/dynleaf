/**
 * Production Environment Verification Script
 * Add this temporarily to your frontend to debug environment variables
 */

// Run this in browser console to check current configuration
console.group('🏦 Cashfree Environment Debug');

console.log('Build-time Environment Variables:');
console.log('VITE_CASHFREE_ENV:', import.meta.env.VITE_CASHFREE_ENV);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('PROD:', import.meta.env.PROD);

console.log('\nRuntime Environment:');
console.log('hostname:', window.location.hostname);
console.log('origin:', window.location.origin);

// Determine what mode should be used
const viteEnv = import.meta.env.VITE_CASHFREE_ENV;
const isProductionDomain = window.location.hostname !== 'localhost' && 
                          window.location.hostname !== '127.0.0.1';
const isBuildProduction = import.meta.env.PROD === true;

let expectedMode = 'sandbox';
let reason = 'default';

if (viteEnv === 'prod' || viteEnv === 'production') {
  expectedMode = 'production';
  reason = 'explicit VITE_CASHFREE_ENV';
} else if (isProductionDomain && isBuildProduction) {
  expectedMode = 'production';
  reason = 'production domain + production build (auto-detected)';
} else if (viteEnv === 'sandbox' || viteEnv === 'test') {
  expectedMode = 'sandbox';
  reason = 'explicit VITE_CASHFREE_ENV';
}

console.log('\nConfiguration Analysis:');
console.log('Expected Mode:', expectedMode);
console.log('Reason:', reason);

// Check for issues
const issues = [];
if (isProductionDomain && expectedMode === 'sandbox') {
  issues.push('❌ Using sandbox on production domain');
  issues.push('💡 Set VITE_CASHFREE_ENV=production in Vercel');
}

if (expectedMode === 'sandbox' && window.location.hostname.includes('vercel.app')) {
  issues.push('❌ Vercel deployment using sandbox mode');
  issues.push('💡 This will cause payment_session_id errors');
}

if (!import.meta.env.VITE_CASHFREE_ENV) {
  issues.push('⚠️ VITE_CASHFREE_ENV not set explicitly');
}

if (issues.length > 0) {
  console.error('\n🚨 Issues Found:');
  issues.forEach(issue => console.error(issue));
} else {
  console.log('\n✅ Configuration looks correct');
}

console.groupEnd();

// Export for easy access
window.cashfreeDebug = {
  viteEnv,
  isProductionDomain,
  isBuildProduction,
  expectedMode,
  reason,
  issues
};