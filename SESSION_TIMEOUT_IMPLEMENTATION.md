# Session Timeout and User Activity Management Implementation

## Overview
I have implemented a comprehensive session timeout and user activity monitoring system for the OrderEase customer application. This system ensures that logged-in customers who become inactive are automatically logged out with proper and professional session timeout handling.

## Components Implemented

### 1. SessionTimeoutManager Component
**Location**: `frontend/customer/src/components/Utils/SessionTimeoutManager.jsx`

**Features**:
- **Activity Monitoring**: Tracks user activity through mouse movements, clicks, keyboard inputs, touch events, and scrolling
- **Configurable Timeouts**: 
  - Warning shown after 25 minutes of inactivity
  - Automatic logout after 30 minutes of inactivity
  - 5-minute countdown warning period
- **Backend Verification**: Checks user status with backend every 5 minutes
- **Professional UI**: Beautiful modal with countdown timer and progress bar
- **User Actions**: Allows users to extend session or logout manually

**Session Configuration**:
```javascript
const SESSION_CONFIG = {
  WARNING_TIME: 25 * 60 * 1000, // 25 minutes
  TIMEOUT_TIME: 30 * 60 * 1000, // 30 minutes
  WARNING_COUNTDOWN: 5 * 60 * 1000, // 5 minutes
  BACKEND_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  ACTIVITY_CHECK_INTERVAL: 1000, // 1 second
};
```

### 2. Backend Session Verification
**Location**: `backend/src/controllers/customerAuthController.js`

**New Endpoint**: `GET /api/customers/auth/verify-session`
- Validates customer authentication
- Checks if customer account is active
- Updates last activity timestamp
- Returns customer status and session validity

### 3. Customer Authentication Middleware
**Location**: `backend/src/middleware/authMiddleware.js`

**Enhanced Features**:
- Customer-specific token validation
- Account status verification
- Proper error handling with descriptive messages

### 4. Updated Customer Model
**Location**: `backend/src/models/Customer.js`

**New Fields**:
- `isActive`: Boolean field to control customer account status (default: true)
- `lastActivity`: Timestamp of last user activity (default: current date)

### 5. Enhanced AuthContext
**Location**: `frontend/customer/src/context/AuthContext.jsx`

**New Method**: `checkSession()`
- Validates current user session with backend
- Handles automatic logout for invalid sessions
- Integrated with SessionTimeoutManager

## How It Works

### 1. Activity Tracking
- Monitors user interactions across the application
- Resets session timers when activity is detected
- Tracks last activity timestamp

### 2. Warning System
- Shows professional warning modal 5 minutes before timeout
- Displays countdown timer with progress bar
- Provides options to extend session or logout

### 3. Backend Verification
- Periodic checks with backend to verify user status
- Validates JWT token and customer account status
- Updates last activity in database

### 4. Automatic Logout
- Logs out inactive users automatically
- Shows appropriate notification messages
- Clears all session data and timers

## Security Features

### 1. Token Validation
- JWT token verification on each backend request
- Customer-specific token type checking
- Proper error handling for expired/invalid tokens

### 2. Account Status Monitoring
- Real-time checking of customer account status
- Immediate logout for deactivated accounts
- Professional error messages

### 3. Session Management
- Secure session cleanup on logout
- Multiple timer management for different scenarios
- Prevention of session hijacking

## User Experience

### 1. Professional Warning Modal
- Clean, modern design with animations
- Clear countdown display
- Easy-to-understand action buttons
- Security notice for user awareness

### 2. Notifications
- Toast notifications for session events
- Different notification types (warning, success, info)
- Non-intrusive user feedback

### 3. Seamless Integration
- No impact on normal user workflow
- Background monitoring without user awareness
- Smooth transitions and animations

## Implementation Details

### 1. Timer Management
- Multiple coordinated timers for different functions
- Proper cleanup to prevent memory leaks
- Background and foreground activity monitoring

### 2. Error Handling
- Comprehensive error catching and handling
- Graceful degradation for network issues
- User-friendly error messages

### 3. Performance Optimization
- Efficient event listeners
- Minimal API calls
- Optimized re-rendering

## Admin Features (Future Enhancement)

The system is prepared for admin control features:
- Customer account activation/deactivation
- Session timeout configuration
- Activity monitoring dashboard
- Bulk customer management

## Configuration

### Frontend Configuration
Session timeouts can be easily adjusted in the `SESSION_CONFIG` object:
- `WARNING_TIME`: Time before showing warning
- `TIMEOUT_TIME`: Total session timeout
- `WARNING_COUNTDOWN`: Warning period duration
- `BACKEND_CHECK_INTERVAL`: Backend verification frequency

### Backend Configuration
- JWT token expiration (currently 30 days)
- Customer status checking
- Activity timestamp updates

## Security Considerations

1. **JWT Security**: Tokens are validated on every protected request
2. **Account Status**: Real-time verification of customer status
3. **Session Cleanup**: Proper cleanup of all session data
4. **Activity Tracking**: Secure monitoring without privacy concerns
5. **Error Messages**: Informative but not revealing sensitive information

## Testing

To test the session timeout system:

1. **Inactivity Test**: 
   - Login as a customer
   - Wait 25 minutes without interaction
   - Warning modal should appear

2. **Activity Reset Test**:
   - When warning appears, interact with the page
   - Session should be extended automatically

3. **Backend Status Test**:
   - Change customer `isActive` status in database
   - Should automatically logout on next verification

4. **Manual Logout Test**:
   - Use logout button in warning modal
   - Should properly clear session and redirect

## Files Modified/Created

### Created:
- `frontend/customer/src/components/Utils/SessionTimeoutManager.jsx`

### Modified:
- `frontend/customer/src/App.jsx` (added SessionTimeoutManager)
- `frontend/customer/src/context/AuthContext.jsx` (added checkSession method)
- `backend/src/controllers/customerAuthController.js` (added verifySession endpoint)
- `backend/src/routes/customerAuthRoutes.js` (added verify-session route)
- `backend/src/middleware/authMiddleware.js` (added customerProtect middleware)
- `backend/src/models/Customer.js` (added isActive and lastActivity fields)

## Conclusion

This implementation provides a robust, secure, and user-friendly session timeout system that:
- Protects user accounts from unauthorized access
- Provides clear warning before timeout
- Maintains good user experience
- Includes professional UI/UX design
- Handles all edge cases gracefully
- Is easily configurable and maintainable

The system is production-ready and follows security best practices while maintaining excellent user experience.
