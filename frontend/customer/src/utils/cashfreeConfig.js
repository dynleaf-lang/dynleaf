/**
 * Cashfree Environment Configuration Fix
 * 
 * This file helps ensure proper environment detection for Cashfree
 * by providing runtime fallbacks and validation.
 */

// Environment variable detection with runtime fallbacks
export function getCashfreeEnvironment() {
  // Build-time environment variables (preferred)
  const buildTimeEnv = import.meta.env.VITE_CASHFREE_ENV;
  
  // Runtime environment detection  
  const isProductionDomain = window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1';
  const isBuildProduction = import.meta.env.PROD === true;
  
  // Priority logic for environment detection
  let environment = 'sandbox';
  let source = 'default';
  
  if (buildTimeEnv === 'production' || buildTimeEnv === 'prod') {
    environment = 'production';
    source = 'build-time variable';
  } else if (buildTimeEnv === 'sandbox' || buildTimeEnv === 'test') {
    environment = 'sandbox';
    source = 'build-time variable';
  } else if (isProductionDomain && isBuildProduction) {
    environment = 'production';
    source = 'runtime detection (production domain + production build)';
  } else if (!isProductionDomain) {
    environment = 'sandbox';
    source = 'runtime detection (localhost)';
  }
  
  console.log('[CASHFREE ENV] Environment Detection:', {
    buildTimeEnv,
    isProductionDomain,
    isBuildProduction,
    hostname: window.location.hostname,
    finalEnvironment: environment,
    source
  });
  
  return environment;
}

// Get API base URL with proper fallbacks
export function getApiBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 
                 import.meta.env.VITE_API_BASE_URL ||
                 import.meta.env.VITE_BACKEND_URL;
  
  // Runtime fallback for production
  if (!apiUrl) {
    const isProductionDomain = window.location.hostname !== 'localhost';
    const fallbackUrl = isProductionDomain 
      ? window.location.origin 
      : 'http://localhost:5001';
      
    console.warn('[CASHFREE ENV] No API URL found, using fallback:', fallbackUrl);
    return fallbackUrl;
  }
  
  return apiUrl;
}

// Validate configuration and log issues
export function validateCashfreeConfig() {
  const environment = getCashfreeEnvironment();
  const apiUrl = getApiBaseUrl();
  const isProductionDomain = window.location.hostname !== 'localhost';
  
  const issues = [];
  const warnings = [];
  
  // Check environment consistency
  if (isProductionDomain && environment === 'sandbox') {
    warnings.push('Using sandbox environment on production domain');
  }
  
  if (!isProductionDomain && environment === 'production') {
    warnings.push('Using production environment on localhost');
  }
  
  // Check API URL consistency
  if (isProductionDomain && apiUrl.includes('localhost')) {
    issues.push('API URL points to localhost on production domain');
  }
  
  // Check required environment variables
  if (!import.meta.env.VITE_CASHFREE_ENV) {
    warnings.push('VITE_CASHFREE_ENV not explicitly set');
  }
  
  const config = {
    environment,
    apiUrl,
    isValid: issues.length === 0,
    issues,
    warnings,
    buildVars: {
      VITE_CASHFREE_ENV: import.meta.env.VITE_CASHFREE_ENV,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD
    }
  };
  
  console.group('🏦 Cashfree Configuration Validation');
  console.log('Environment:', environment);
  console.log('API URL:', apiUrl);
  console.log('Build Variables:', config.buildVars);
  
  if (warnings.length > 0) {
    console.warn('⚠️ Warnings:', warnings);
  }
  
  if (issues.length > 0) {
    console.error('❌ Issues:', issues);
  } else {
    console.log('✅ Configuration is valid');
  }
  
  console.groupEnd();
  
  return config;
}

// Auto-validate in development mode
if (import.meta.env.DEV) {
  setTimeout(() => {
    validateCashfreeConfig();
  }, 500);
}