# Backend Authentication Flow Correction

## Issue Identified
The frontend authentication flow was not matching the backend API endpoints correctly, causing "Please provide identifier and OTP" errors.

## Root Cause Analysis

### Backend API Endpoints:
1. **Registration Flow**:
   - `/api/customers/auth/register` → Returns `otpId`
   - `/api/customers/auth/verify-otp` → Expects `otpId` + `otp`

2. **Login Flow**:
   - `/api/customers/auth/request-otp` → Returns `otpId` 
   - `/api/customers/auth/login` → Expects `identifier` + `otp` + optional `otpId`

### Frontend Issues:
- Login flow was calling `/login` directly instead of `/request-otp` first
- VerifyOTP was using wrong endpoint for login vs registration
- Missing distinction between login and registration verification flows

## Solution Applied

### 1. Updated AuthContext (`AuthContext.jsx`)

#### Fixed Login Flow:
```javascript
// Before: Direct call to login endpoint
const response = await api.post('/api/customers/auth/login', credentials);

// After: First request OTP, then verify with login endpoint
const response = await api.post('/api/customers/auth/request-otp', credentials);
```

#### Fixed VerifyOTP Function:
```javascript
const verifyOTP = async (otp, identifier = null, isRegistration = false) => {
  let response;
  
  if (isRegistration) {
    // Registration: Use verify-otp endpoint with otpId
    response = await api.post('/api/customers/auth/verify-otp', { 
      otpId: user.otpId,
      otp 
    });
  } else {
    // Login: Use login endpoint with identifier and OTP
    response = await api.post('/api/customers/auth/login', {
      identifier: identifier || user.identifier,
      otp,
      otpId: user.otpId // Include for additional verification
    });
  }
}
```

### 2. Updated SignupModal (`SignupModal.jsx`)
```javascript
// Added registration flag to distinguish flow
const result = await verifyOTP(otp, identifier, true);
```

### 3. LoginModal (`LoginModal.jsx`)
```javascript
// Continues to use login flow (isRegistration = false)
const result = await verifyOTP(otp, identifier);
```

## Correct Flow Summary

### Registration Process:
1. User fills registration form
2. Frontend calls `/register` with user data
3. Backend sends OTP and returns `otpId`
4. User enters OTP
5. Frontend calls `/verify-otp` with `otpId` + `otp`
6. Backend creates user account and returns user data

### Login Process:
1. User enters identifier
2. Frontend calls `/request-otp` with identifier + restaurant info
3. Backend sends OTP and returns `otpId`
4. User enters OTP
5. Frontend calls `/login` with `identifier` + `otp` + `otpId`
6. Backend verifies and returns user data with token

## Expected Results
- ✅ "Please provide identifier and OTP" error resolved
- ✅ Both login and registration flows work correctly
- ✅ Proper OTP verification for both flows
- ✅ Correct backend endpoint usage

## Files Modified
1. `frontend/customer/src/context/AuthContext.jsx`
2. `frontend/customer/src/components/auth/SignupModal.jsx`
3. Documentation: `BACKEND_AUTH_FLOW_CORRECTION.md`

This fix ensures the frontend properly follows the backend's expected authentication flow patterns.
