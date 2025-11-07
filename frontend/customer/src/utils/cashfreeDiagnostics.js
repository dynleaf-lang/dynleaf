/**
 * Cashfree Environment Diagnostics
 * This utility helps debug Cashfree configuration issues
 */

export function diagnoseCashfreeConfig() {
  const config = {
    // Environment Variables
    env: {
      VITE_CASHFREE_ENV: import.meta.env.VITE_CASHFREE_ENV,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      DEV: import.meta.env.DEV
    },
    
    // Runtime Detection
    runtime: {
      hostname: window.location.hostname,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      protocol: window.location.protocol,
      origin: window.location.origin
    },
    
    // Cashfree SDK Status
    sdk: {
      loaded: !!window.Cashfree,
      version: window.Cashfree?.version || 'unknown'
    },
    
    // Configuration Analysis
    analysis: {}
  };
  
  // Analyze environment
  const viteEnv = config.env.VITE_CASHFREE_ENV;
  const isProductionDomain = !config.runtime.isLocalhost;
  
  // Determine expected mode
  let expectedMode = 'sandbox';
  let modeReason = 'default';
  
  if (viteEnv === 'prod' || viteEnv === 'production') {
    expectedMode = 'production';
    modeReason = 'explicit environment variable';
  } else if (isProductionDomain && (!viteEnv || viteEnv === 'sandbox')) {
    expectedMode = 'production';
    modeReason = 'production domain detected';
  } else if (viteEnv === 'sandbox' || viteEnv === 'test') {
    expectedMode = 'sandbox';
    modeReason = 'explicit environment variable';
  }
  
  config.analysis = {
    expectedMode,
    modeReason,
    configurationIssues: [],
    recommendations: []
  };
  
  // Check for configuration issues
  if (!config.env.VITE_CASHFREE_ENV) {
    config.analysis.configurationIssues.push('VITE_CASHFREE_ENV not set');
    config.analysis.recommendations.push('Set VITE_CASHFREE_ENV to "production" or "sandbox"');
  }
  
  if (!config.env.VITE_API_URL && !config.env.VITE_API_BASE_URL) {
    config.analysis.configurationIssues.push('No API URL configured');
    config.analysis.recommendations.push('Set VITE_API_URL or VITE_API_BASE_URL');
  }
  
  if (isProductionDomain && config.env.VITE_CASHFREE_ENV === 'sandbox') {
    config.analysis.configurationIssues.push('Using sandbox on production domain');
    config.analysis.recommendations.push('Set VITE_CASHFREE_ENV=production for production deployment');
  }
  
  if (!isProductionDomain && config.env.VITE_CASHFREE_ENV === 'production') {
    config.analysis.configurationIssues.push('Using production on localhost');
    config.analysis.recommendations.push('Set VITE_CASHFREE_ENV=sandbox for local development');
  }
  
  const apiUrl = config.env.VITE_API_URL || config.env.VITE_API_BASE_URL;
  if (isProductionDomain && apiUrl?.includes('localhost')) {
    config.analysis.configurationIssues.push('API URL points to localhost on production domain');
    config.analysis.recommendations.push('Update API URL to production backend');
  }
  
  return config;
}

export function logCashfreeConfig() {
  const config = diagnoseCashfreeConfig();
  
  console.group('🏦 Cashfree Configuration Diagnosis');
  
  console.log('📊 Environment Variables:', config.env);
  console.log('🌐 Runtime Info:', config.runtime);
  console.log('📦 SDK Status:', config.sdk);
  console.log('🔍 Analysis:', config.analysis);
  
  if (config.analysis.configurationIssues.length > 0) {
    console.warn('⚠️ Configuration Issues:', config.analysis.configurationIssues);
    console.log('💡 Recommendations:', config.analysis.recommendations);
  } else {
    console.log('✅ Configuration looks good!');
  }
  
  console.groupEnd();
  
  return config;
}

// Auto-run diagnostics in development
if (import.meta.env.DEV) {
  // Run diagnostics after a short delay to ensure DOM is ready
  setTimeout(() => {
    logCashfreeConfig();
  }, 1000);
}