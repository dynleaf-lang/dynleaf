# Session Timeout Testing Guide

## Overview
This guide provides step-by-step instructions to test the professional session timeout implementation and verify that customer orders and notifications are properly protected after session expiration.

## Prerequisites
- Application running (both backend and frontend)
- Browser developer tools open for console monitoring
- Test user account available

## Test Scenarios

### 1. Basic Session Timeout Test

#### Steps:
1. **Login** to the application with a test account
2. **Place an order** or add items to cart
3. **Navigate to Orders tab** - verify you can see your orders
4. **Navigate to Profile tab** - verify you can see your profile
5. **Wait for session timeout** (30 minutes) OR **force timeout** (see below)
6. **Verify cleanup**:
   - Orders tab should show login prompt
   - Profile tab should show login prompt
   - Cart should be empty
   - Notifications should be cleared

#### Force Timeout (for quick testing):
```javascript
// In browser console:
window.dispatchEvent(new CustomEvent('session-expired', {
  detail: { reason: 'test', message: 'Test session expiration' }
}));
```

### 2. Session Warning Test

#### Steps:
1. **Login** to the application
2. **Modify timeout** for quick testing (in SessionTimeoutManager.jsx):
   ```javascript
   WARNING_TIME: 5 * 1000, // 5 seconds
   TIMEOUT_TIME: 10 * 1000, // 10 seconds
   ```
3. **Wait for warning** modal to appear
4. **Test "Continue Session"** button - should reset timer
5. **Test "Logout"** button - should logout immediately
6. **Test automatic timeout** - wait without clicking buttons

### 3. Navigation Protection Test

#### Steps:
1. **Login** and navigate to Orders/Profile
2. **Trigger session expiration** (wait or force)
3. **Try to access protected content**:
   - Click Orders tab → Should show login prompt
   - Click Profile tab → Should show login prompt
   - Manually navigate to `/orders` → Should redirect to home
4. **Check URL** - should not stay on protected routes

### 4. Data Persistence Test

#### Steps:
1. **Login** and add items to cart
2. **Place an order** and check notifications
3. **Check browser storage**:
   - localStorage should have cart data
   - SessionStorage should have session data
4. **Trigger session expiration**
5. **Check storage again**:
   - localStorage should be cleared of sensitive data
   - SessionStorage should be empty
6. **Check application state**:
   - Cart count should be 0
   - No orders visible
   - No notifications visible

### 5. Backend Session Validation Test

#### Steps:
1. **Login** to the application
2. **Monitor console** for session check logs
3. **Simulate backend failure**:
   - Stop backend server temporarily
   - Wait for failed session checks
   - Should see tolerance (3 failed checks before logout)
4. **Restart backend** and verify recovery

### 6. Cross-Tab Session Test

#### Steps:
1. **Open application** in multiple browser tabs
2. **Login** in one tab
3. **Trigger session expiration** in one tab
4. **Check other tabs** - should also be logged out
5. **Verify state consistency** across all tabs

## Console Monitoring

### Expected Debug Messages:
```
[SESSION] Session cleanup completed
[APP] Session expired: { reason: "timeout", message: "..." }
[APP] Sensitive localStorage data cleared
[APP] Redirecting from protected page: /orders
[NOTIFICATION CONTEXT] Tracked X existing orders for notifications
[CART CONTEXT] Cart and order data cleared
```

### Error Monitoring:
Watch for any errors during:
- Session cleanup process
- Navigation handling
- Storage operations
- Context state updates

## Expected Behaviors

### Successful Session Timeout:
1. ✅ Warning modal appears before timeout
2. ✅ User can extend session or logout manually
3. ✅ Automatic logout after inactivity
4. ✅ Cart data completely cleared
5. ✅ Order history not accessible
6. ✅ Notifications cleared
7. ✅ Profile information protected
8. ✅ Automatic redirect from protected pages
9. ✅ Clean localStorage and sessionStorage
10. ✅ Professional notification messages

### Failed Session Timeout:
❌ Orders still visible after timeout
❌ Cart data persists after timeout
❌ Notifications remain after timeout
❌ Profile accessible without authentication
❌ No redirect from protected pages
❌ Storage not cleared
❌ Error messages in console

## Performance Considerations

### Efficiency Checks:
- Session checks should not be too frequent (15-minute intervals)
- Activity detection should be lightweight
- Cleanup should be fast and non-blocking
- No memory leaks from timers or listeners

### User Experience:
- Warning should appear with enough time to respond (5 minutes)
- Transitions should be smooth
- Messages should be clear and professional
- No data loss before proper warning

## Troubleshooting

### Common Issues:

1. **Session not timing out**:
   - Check if ENABLED is true in SESSION_CONFIG
   - Verify timer configuration
   - Check for activity preventing timeout

2. **Data not cleared**:
   - Verify context functions are available
   - Check for errors in cleanup process
   - Ensure proper function dependencies

3. **Navigation not working**:
   - Check event listener registration
   - Verify protected routes are properly wrapped
   - Test ProtectedRoute component

4. **Backend session checks failing**:
   - Check API endpoint availability
   - Verify authentication token validity
   - Test network connectivity

### Debug Mode:
Set `DEBUG: true` in SESSION_CONFIG for detailed logging:
```javascript
const SESSION_CONFIG = {
  DEBUG: true, // Enable debug logging
  // ... other config
};
```

## Production Considerations

### Before Production:
1. **Set appropriate timeouts** (30 minutes warning, 35 minutes total)
2. **Disable debug logging** (DEBUG: false)
3. **Test on multiple devices** and browsers
4. **Verify HTTPS requirements** for secure storage
5. **Test with actual user workflows**
6. **Monitor performance impact**

### Security Validation:
- No sensitive data in localStorage after logout
- No API calls with expired tokens
- Proper session validation on backend
- No client-side storage of passwords or sensitive tokens

This testing guide ensures the session timeout implementation is robust, secure, and provides an excellent user experience while protecting sensitive customer data.
