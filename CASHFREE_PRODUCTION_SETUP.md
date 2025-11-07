# Cashfree Production Setup Guide

## Issues Fixed

This update resolves critical Cashfree payment integration issues:

1. ❌ **Backend hardcoded to production URLs** - Fixed environment detection
2. ❌ **Frontend hardcoded to sandbox mode** - Added dynamic mode selection  
3. ❌ **Sandbox URLs in production** - Proper environment switching
4. ❌ **Invalid payment_session_id errors** - Environment mismatch resolved

## Environment Configuration

### Development Environment

**Backend (.env):**
```bash
CASHFREE_ENV=sandbox
CASHFREE_APP_ID=your_sandbox_app_id
CASHFREE_SECRET_KEY=your_sandbox_secret_key
CASHFREE_WEBHOOK_URL=http://localhost:5001/api/payments/cashfree/webhook
```

**Frontend (.env):**
```bash
VITE_CASHFREE_ENV=sandbox
VITE_API_URL=http://localhost:5001
```

### Production Environment

**Backend (.env):**
```bash
CASHFREE_ENV=production
CASHFREE_APP_ID=your_production_app_id  
CASHFREE_SECRET_KEY=your_production_secret_key
CASHFREE_WEBHOOK_URL=https://yourdomain.com/api/payments/cashfree/webhook
```

**Frontend (.env):**
```bash
VITE_CASHFREE_ENV=production
VITE_API_URL=https://yourdomain.com
```

## Key Changes Made

### 1. Backend Service (`backend/src/services/cashfreeService.js`)

- ✅ **Dynamic API URL**: Switches between sandbox and production based on `CASHFREE_ENV`
- ✅ **Environment validation**: Prevents accidental production usage
- ✅ **Safety checks**: Validates environment consistency

```javascript
function getBaseUrl() { 
  const env = process.env.CASHFREE_ENV;
  
  if (env === 'prod' || env === 'production') {
    return 'https://api.cashfree.com/pg';      // Production
  } else {
    return 'https://sandbox.cashfree.com/pg';  // Sandbox
  }
}
```

### 2. Frontend SDK Hook (`frontend/customer/src/hooks/useCashfreeSDK.js`)

- ✅ **Auto-detection**: Automatically detects environment mode
- ✅ **Production safety**: Uses production mode on production domains
- ✅ **Explicit configuration**: Respects `VITE_CASHFREE_ENV` setting

### 3. Payment Service (`frontend/customer/src/services/PaymentService.js`)

- ✅ **Smart mode detection**: Environment-aware initialization
- ✅ **Production warnings**: Alerts about configuration issues

### 4. Validation Script (`scripts/cashfree-production-setup.js`)

- ✅ **Configuration checker**: Validates all environment variables
- ✅ **Production checklist**: Ensures proper production setup
- ✅ **Example generator**: Provides configuration templates

## Usage Instructions

### 1. Validate Configuration

Run the setup validation script:

```bash
# Check current configuration
node scripts/cashfree-production-setup.js

# Show configuration examples  
node scripts/cashfree-production-setup.js --example

# Strict validation (fails on warnings)
node scripts/cashfree-production-setup.js --strict
```

### 2. Development Setup

1. Copy frontend environment variables:
   ```bash
   cp frontend/customer/.env.example frontend/customer/.env
   ```

2. Set backend environment variables:
   ```bash
   # In backend/.env
   CASHFREE_ENV=sandbox
   CASHFREE_APP_ID=your_sandbox_app_id
   CASHFREE_SECRET_KEY=your_sandbox_secret_key
   ```

### 3. Production Deployment

1. **Set Production Environment Variables:**
   - `CASHFREE_ENV=production` (backend)
   - `VITE_CASHFREE_ENV=production` (frontend)
   - Use production credentials from Cashfree dashboard

2. **Update API URLs:**
   - `VITE_API_URL=https://yourdomain.com` (frontend)
   - `CASHFREE_WEBHOOK_URL=https://yourdomain.com/api/payments/cashfree/webhook` (backend)

3. **Validate Setup:**
   ```bash
   NODE_ENV=production node scripts/cashfree-production-setup.js --strict
   ```

## Environment Detection Logic

The system automatically detects the correct environment using this priority:

1. **Explicit Environment Variables**: `CASHFREE_ENV` / `VITE_CASHFREE_ENV`
2. **Domain Detection**: Production domains automatically use production mode
3. **Default Fallback**: Development environments default to sandbox

## Troubleshooting

### Common Issues

**❌ "payment_session_id is not present or is invalid"**
- **Cause**: Environment mismatch between frontend and backend
- **Solution**: Ensure both use same environment (sandbox or production)

**❌ "Sandbox URLs in production"**
- **Cause**: `VITE_CASHFREE_ENV` not set to `production`
- **Solution**: Set `VITE_CASHFREE_ENV=production` in frontend

**❌ "Authentication failed"**
- **Cause**: Wrong credentials for environment
- **Solution**: Use sandbox credentials for sandbox, production for production

### Debug Commands

```bash
# Check environment detection
node -e "console.log(process.env.CASHFREE_ENV)"

# Validate frontend environment
cd frontend/customer && npm run dev

# Test backend configuration
curl http://localhost:5001/api/debug/env
```

## Security Notes

- 🔒 **Never commit credentials** to version control
- 🔒 **Use environment variables** for all sensitive data
- 🔒 **Validate webhook signatures** in production
- 🔒 **Enable HTTPS** for production deployments
- 🔒 **Whitelist domains** in Cashfree dashboard

## Next Steps

1. Set up proper environment variables for your deployment
2. Test payments in sandbox environment
3. Obtain production credentials from Cashfree
4. Deploy with production configuration
5. Test live payments with small amounts

For support, refer to [Cashfree Documentation](https://docs.cashfree.com/docs/payment-gateway) or check the validation script output.