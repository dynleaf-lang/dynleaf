# OTP Verification Backend Integration Fix

## Issue Fixed
**Error**: "Please provide identifier and OTP"

## Root Cause
The backend API expects both `identifier` and `otp` in the verification request, but the frontend was sending `otpId` and `otp` instead.

## Solution Applied

### 1. Updated AuthContext (`AuthContext.jsx`)
Modified the `verifyOTP` function to accept and send the identifier:

```javascript
// Before
const verifyOTP = async (otp) => {
  const response = await api.post('/api/customers/auth/verify-otp', { 
    otpId: user.otpId,
    otp 
  });
}

// After
const verifyOTP = async (otp, identifier = null) => {
  const response = await api.post('/api/customers/auth/verify-otp', { 
    identifier: identifier || user.identifier || user.email || user.phone,
    otp 
  });
}
```

### 2. Updated LoginModal (`LoginModal.jsx`)
Modified the verifyOTP call to pass the identifier:

```javascript
// Before
const result = await verifyOTP(otp);

// After
const result = await verifyOTP(otp, identifier);
```

### 3. Updated SignupModal (`SignupModal.jsx`)
Modified the verifyOTP call to pass the identifier:

```javascript
// Before
const result = await verifyOTP(otp);

// After
const result = await verifyOTP(otp, identifier);
```

## Expected Behavior
- OTP verification now sends the correct parameters to the backend
- Both login and signup flows will work properly
- Error "Please provide identifier and OTP" should be resolved

## Files Modified
1. `frontend/customer/src/context/AuthContext.jsx`
2. `frontend/customer/src/components/auth/LoginModal.jsx`
3. `frontend/customer/src/components/auth/SignupModal.jsx`

This fix ensures compatibility with the backend API requirements while maintaining backward compatibility through fallback logic in the AuthContext.
