#!/usr/bin/env node

/**
 * Cashfree Production Setup Script
 * 
 * This script helps configure Cashfree for production deployment
 * and validates that all necessary environment variables are set.
 */

const path = require('path');
const fs = require('fs');

console.log('🏦 Cashfree Production Setup & Validation\n');

// Environment variables to check
const requiredEnvVars = {
  backend: [
    'CASHFREE_APP_ID',
    'CASHFREE_SECRET_KEY', 
    'CASHFREE_ENV',
    'CASHFREE_WEBHOOK_URL'
  ],
  frontend: [
    'VITE_CASHFREE_ENV',
    'VITE_API_URL'
  ]
};

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.argv.includes('--production') ||
                    process.argv.includes('--prod');

console.log('Environment Detection:');
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`📍 Production Mode: ${isProduction}`);
console.log();

// Function to check backend environment
function checkBackendEnvironment() {
  console.log('🔧 Backend Environment Check:');
  
  const missing = [];
  const warnings = [];
  
  requiredEnvVars.backend.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
      console.log(`  ❌ ${envVar}: Missing`);
    } else {
      // Mask sensitive values
      const displayValue = envVar.includes('SECRET') || envVar.includes('APP_ID') 
        ? `${value.substring(0, 8)}...` 
        : value;
      console.log(`  ✅ ${envVar}: ${displayValue}`);
      
      // Validation warnings
      if (envVar === 'CASHFREE_ENV') {
        if (isProduction && value !== 'production' && value !== 'prod') {
          warnings.push(`CASHFREE_ENV should be 'production' in production (current: ${value})`);
        }
        if (!isProduction && (value === 'production' || value === 'prod')) {
          warnings.push(`CASHFREE_ENV is set to production in development environment`);
        }
      }
    }
  });
  
  if (warnings.length > 0) {
    console.log('\n  ⚠️  Warnings:');
    warnings.forEach(warning => console.log(`     ${warning}`));
  }
  
  console.log();
  return { missing, warnings };
}

// Function to check frontend environment 
function checkFrontendEnvironment() {
  console.log('🎨 Frontend Environment Check:');
  
  const frontendPath = path.join(__dirname, '..', 'frontend', 'customer');
  const envFiles = ['.env', '.env.local', '.env.production'];
  
  let envFound = false;
  const frontendEnv = {};
  
  // Try to read env files
  envFiles.forEach(filename => {
    const filePath = path.join(frontendPath, filename);
    if (fs.existsSync(filePath)) {
      envFound = true;
      console.log(`  📄 Found: ${filename}`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              frontendEnv[key.trim()] = valueParts.join('=').trim();
            }
          }
        });
      } catch (error) {
        console.log(`  ⚠️  Error reading ${filename}: ${error.message}`);
      }
    }
  });
  
  if (!envFound) {
    console.log('  ❌ No .env files found in frontend/customer/');
    console.log('  💡 Create .env file with required variables');
  }
  
  // Check required variables
  console.log('\n  Environment Variables:');
  const missing = [];
  const warnings = [];
  
  requiredEnvVars.frontend.forEach(envVar => {
    const value = frontendEnv[envVar];
    if (!value) {
      missing.push(envVar);
      console.log(`  ❌ ${envVar}: Missing`);
    } else {
      console.log(`  ✅ ${envVar}: ${value}`);
      
      // Validation warnings
      if (envVar === 'VITE_CASHFREE_ENV') {
        if (isProduction && value !== 'production' && value !== 'prod') {
          warnings.push(`VITE_CASHFREE_ENV should be 'production' in production (current: ${value})`);
        }
      }
      
      if (envVar === 'VITE_API_URL') {
        if (isProduction && value.includes('localhost')) {
          warnings.push(`VITE_API_URL points to localhost in production environment`);
        }
      }
    }
  });
  
  if (warnings.length > 0) {
    console.log('\n  ⚠️  Warnings:');
    warnings.forEach(warning => console.log(`     ${warning}`));
  }
  
  console.log();
  return { missing, warnings };
}

// Function to generate example configuration
function generateExampleConfig() {
  console.log('📝 Example Production Configuration:\n');
  
  console.log('Backend (.env):');
  console.log('CASHFREE_ENV=production');
  console.log('CASHFREE_APP_ID=your_production_app_id');
  console.log('CASHFREE_SECRET_KEY=your_production_secret_key');
  console.log('CASHFREE_WEBHOOK_URL=https://yourdomain.com/api/payments/cashfree/webhook');
  console.log();
  
  console.log('Frontend (.env):');
  console.log('VITE_CASHFREE_ENV=production');
  console.log('VITE_API_URL=https://yourdomain.com');
  console.log();
  
  console.log('Development (.env):');
  console.log('CASHFREE_ENV=sandbox');
  console.log('VITE_CASHFREE_ENV=sandbox');
  console.log('VITE_API_URL=http://localhost:5001');
  console.log();
}

// Function to run validation
async function runValidation() {
  const backendResults = checkBackendEnvironment();
  const frontendResults = checkFrontendEnvironment();
  
  console.log('🎯 Validation Summary:');
  
  const allMissing = [...backendResults.missing, ...frontendResults.missing];
  const allWarnings = [...backendResults.warnings, ...frontendResults.warnings];
  
  if (allMissing.length === 0 && allWarnings.length === 0) {
    console.log('✅ All environment variables are properly configured!');
  } else {
    if (allMissing.length > 0) {
      console.log(`❌ Missing variables: ${allMissing.join(', ')}`);
    }
    if (allWarnings.length > 0) {
      console.log(`⚠️  ${allWarnings.length} warning(s) found`);
    }
  }
  
  console.log();
  
  if (isProduction) {
    console.log('🔒 Production Checklist:');
    console.log('  □ Cashfree production credentials obtained');
    console.log('  □ CASHFREE_ENV=production set');
    console.log('  □ VITE_CASHFREE_ENV=production set');
    console.log('  □ Production webhook URL configured');
    console.log('  □ SSL certificates installed');
    console.log('  □ Domain whitelist updated in Cashfree dashboard');
    console.log();
  }
  
  return allMissing.length === 0;
}

// Main execution
async function main() {
  try {
    const isValid = await runValidation();
    
    if (process.argv.includes('--example') || process.argv.includes('--help')) {
      generateExampleConfig();
    }
    
    if (!isValid && (process.argv.includes('--strict') || isProduction)) {
      console.log('❌ Validation failed. Please fix the issues above.');
      process.exit(1);
    }
    
    console.log('✅ Setup validation complete!');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkBackendEnvironment,
  checkFrontendEnvironment,
  runValidation,
  generateExampleConfig
};