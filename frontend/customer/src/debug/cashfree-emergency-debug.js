/**
 * Emergency Cashfree Environment Debugger
 * 
 * Copy this code and run it in your browser console on the production site
 * to diagnose why sandbox URLs are still being used despite VITE_CASHFREE_ENV=production
 */

console.group('🔍 Cashfree Environment Emergency Debug');

// 1. Check build-time environment variables
console.log('=== BUILD-TIME ENVIRONMENT VARIABLES ===');
console.log('VITE_CASHFREE_ENV (raw):', import.meta.env.VITE_CASHFREE_ENV);
console.log('VITE_CASHFREE_ENV (type):', typeof import.meta.env.VITE_CASHFREE_ENV);
console.log('VITE_CASHFREE_ENV (JSON):', JSON.stringify(import.meta.env.VITE_CASHFREE_ENV));

// 2. Check all Vite environment variables
console.log('=== ALL VITE ENVIRONMENT VARIABLES ===');
const viteEnvs = Object.keys(import.meta.env)
  .filter(key => key.startsWith('VITE_'))
  .reduce((obj, key) => {
    obj[key] = import.meta.env[key];
    return obj;
  }, {});
console.table(viteEnvs);

// 3. Check runtime environment detection
console.log('=== RUNTIME ENVIRONMENT DETECTION ===');
const hostname = window.location.hostname;
const isProductionDomain = hostname !== 'localhost' && hostname !== '127.0.0.1';
const isBuildProduction = import.meta.env.PROD === true;
const buildMode = import.meta.env.MODE;

console.log('hostname:', hostname);
console.log('isProductionDomain:', isProductionDomain);
console.log('isBuildProduction:', isBuildProduction);
console.log('buildMode:', buildMode);

// 4. Simulate the exact logic from PaymentService
console.log('=== SIMULATING PAYMENTSERVICE LOGIC ===');
const viteEnv = import.meta.env.VITE_CASHFREE_ENV;

let detectedMode = 'sandbox';
let detectionReason = 'default';

if (viteEnv === 'prod' || viteEnv === 'production') {
  detectedMode = 'production';
  detectionReason = 'explicit VITE_CASHFREE_ENV';
} else if (viteEnv === 'sandbox' || viteEnv === 'test') {
  detectedMode = 'sandbox';
  detectionReason = 'explicit VITE_CASHFREE_ENV';
} else if (isProductionDomain && isBuildProduction) {
  detectedMode = 'production';
  detectionReason = 'auto-detection (production domain + production build)';
}

console.log('Final detected mode:', detectedMode);
console.log('Detection reason:', detectionReason);

// 5. Check for common issues
console.log('=== ISSUE DIAGNOSIS ===');
const issues = [];

if (viteEnv === undefined) {
  issues.push('❌ VITE_CASHFREE_ENV is undefined - not set at build time');
}

if (viteEnv === null) {
  issues.push('❌ VITE_CASHFREE_ENV is null');
}

if (viteEnv === '') {
  issues.push('❌ VITE_CASHFREE_ENV is empty string');
}

if (typeof viteEnv === 'string' && viteEnv.trim() !== viteEnv) {
  issues.push('⚠️ VITE_CASHFREE_ENV has whitespace: "' + JSON.stringify(viteEnv) + '"');
}

if (viteEnv && viteEnv !== 'production' && viteEnv !== 'prod' && viteEnv !== 'sandbox' && viteEnv !== 'test') {
  issues.push('⚠️ VITE_CASHFREE_ENV has unexpected value: ' + JSON.stringify(viteEnv));
}

if (detectedMode === 'sandbox' && isProductionDomain) {
  issues.push('🚨 Production domain but sandbox mode detected');
}

if (issues.length === 0) {
  console.log('✅ No obvious configuration issues found');
} else {
  console.error('🚨 Issues found:');
  issues.forEach(issue => console.error('  ' + issue));
}

// 6. Check if SDK is using correct mode
console.log('=== SDK INITIALIZATION CHECK ===');
if (window.Cashfree) {
  console.log('✅ Cashfree SDK is loaded');
  
  // Try to check what mode was used to initialize
  try {
    const testCashfree = new window.Cashfree({ mode: detectedMode });
    console.log('✅ SDK can be initialized with detected mode:', detectedMode);
  } catch (error) {
    console.error('❌ Failed to initialize SDK with detected mode:', error);
  }
} else {
  console.log('❌ Cashfree SDK not yet loaded');
}

// 7. Deployment verification
console.log('=== DEPLOYMENT VERIFICATION ===');
console.log('Build timestamp check:', import.meta.env.VITE_BUILD_TIME || 'Not available');
console.log('Is this the latest deployment?', 'Check Vercel dashboard for confirmation');

console.groupEnd();

// Export results for further inspection
window.cashfreeDebugResults = {
  viteEnv,
  detectedMode,
  detectionReason,
  issues,
  buildVars: viteEnvs,
  runtime: {
    hostname,
    isProductionDomain,
    isBuildProduction,
    buildMode
  }
};

console.log('💾 Results saved to window.cashfreeDebugResults');
console.log('🔧 Run this script in browser console on your production site');