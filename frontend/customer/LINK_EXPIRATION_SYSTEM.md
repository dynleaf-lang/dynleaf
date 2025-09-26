# Link Expiration System Documentation

This documentation explains how to use the professional link expiration system implemented in OrderEase.

## Overview

The link expiration system provides:
- Professional error page for expired links
- Automatic cleanup of expired data
- Easy-to-use hooks and utilities
- Type-specific expiration handling (payment, session, order, etc.)
- Consistent user experience

## Components

### 1. LinkExpiredPage Component

**Location**: `src/components/pages/LinkExpiredPage.jsx`

A professional, animated page that displays when users access expired links.

**Features**:
- Responsive design matching app theme
- Context-specific messaging based on expiration reason
- Clear call-to-action buttons
- Loading states and smooth animations
- Support contact integration

**URL Parameters**:
- `reason`: Type of expiration (payment, session, order, magic-token)
- `return`: URL to return to after resolving the issue

**Example URLs**:
```
/link-expired
/link-expired?reason=payment
/link-expired?reason=session&return=%2Fcheckout
```

### 2. Utility Functions

**Location**: `src/utils/linkExpiration.js`

#### `redirectToLinkExpired(reason, options)`
Redirects user to the link expired page with proper cleanup.

```javascript
import { redirectToLinkExpired } from '../utils/linkExpiration';

// Basic usage
redirectToLinkExpired('payment');

// With options
redirectToLinkExpired('session', {
  returnUrl: '/checkout',
  apiError: true
});
```

#### `isExpired(timestamp, maxAge)`
Checks if a timestamp has expired.

```javascript
import { isExpired } from '../utils/linkExpiration';

const tokenTime = localStorage.getItem('tokenTime');
if (isExpired(tokenTime, 15 * 60 * 1000)) { // 15 minutes
  // Handle expiration
}
```

#### `checkAndHandleExpiredData()`
Automatically checks and cleans expired data from localStorage.

```javascript
import { checkAndHandleExpiredData } from '../utils/linkExpiration';

// Call on app start or route changes
checkAndHandleExpiredData();
```

#### `handleApiExpiredError(error)`
Middleware for handling API errors that indicate expiration.

```javascript
import { handleApiExpiredError } from '../utils/linkExpiration';

try {
  const response = await api.post('/orders', data);
} catch (error) {
  if (!handleApiExpiredError(error)) {
    // Handle other types of errors
    console.error('API Error:', error);
  }
}
```

### 3. React Hook

**Location**: `src/hooks/useLinkExpiration.js`

Custom hook for handling link expiration in React components.

```javascript
import { useLinkExpiration } from '../hooks/useLinkExpiration';

const MyComponent = () => {
  const { 
    handleExpired, 
    checkExpiredData, 
    checkAndRedirectIfExpired,
    handleApiError 
  } = useLinkExpiration();

  useEffect(() => {
    // Check for expired data on mount
    checkExpiredData();
  }, [checkExpiredData]);

  const handleSubmit = async () => {
    try {
      const response = await api.post('/submit', data);
    } catch (error) {
      if (!handleApiError(error)) {
        // Handle non-expiration errors
      }
    }
  };

  return (
    // Component JSX
  );
};
```

### 4. Higher-Order Component (HOC)

**Location**: `src/components/hoc/withLinkExpirationCheck.jsx`

Wraps components with automatic expiration checking.

```javascript
import { withLinkExpirationCheck } from '../components/hoc/withLinkExpirationCheck';

const ProtectedComponent = () => {
  return <div>Protected content</div>;
};

// Wrap with expiration checking
const ProtectedComponentWithCheck = withLinkExpirationCheck(ProtectedComponent, {
  requireAuth: true,
  requireValidOrder: false,
  maxAge: 30 * 60 * 1000, // 30 minutes
  checkInterval: 60 * 1000 // Check every minute
});

export default ProtectedComponentWithCheck;
```

### 5. Link Expiration Guard Component

Use as a wrapper component for conditional rendering based on expiration status.

```javascript
import { LinkExpirationGuard } from '../components/hoc/withLinkExpirationCheck';

const App = () => {
  return (
    <LinkExpirationGuard
      requireAuth={true}
      requireValidPayment={true}
      maxAge={15 * 60 * 1000} // 15 minutes
      fallback={<LoadingSpinner />}
    >
      <PaymentForm />
    </LinkExpirationGuard>
  );
};
```

## Usage Examples

### 1. Basic Payment Expiration

```javascript
// In a payment component
import { useLinkExpiration } from '../hooks/useLinkExpiration';

const PaymentComponent = () => {
  const { handleExpired, checkAndRedirectIfExpired } = useLinkExpiration();

  useEffect(() => {
    // Check if payment session is still valid
    const isExpired = checkAndRedirectIfExpired({
      requireValidPayment: true,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    if (isExpired) return; // Component won't render if redirected
  }, [checkAndRedirectIfExpired]);

  const handlePaymentError = (error) => {
    if (error.message.includes('expired')) {
      handleExpired('payment');
      return;
    }
    // Handle other errors...
  };

  return (
    // Payment form JSX
  );
};
```

### 2. Session Timeout Handling

```javascript
// In a user profile component
import { withLinkExpirationCheck } from '../components/hoc/withLinkExpirationCheck';

const ProfileComponent = () => {
  return (
    <div>
      <h1>User Profile</h1>
      {/* Profile content */}
    </div>
  );
};

// Wrap with session checking
export default withLinkExpirationCheck(ProfileComponent, {
  requireAuth: true,
  maxAge: 60 * 60 * 1000, // 1 hour
  checkInterval: 5 * 60 * 1000 // Check every 5 minutes
});
```

### 3. Order Link Validation

```javascript
// In an order confirmation component
import { useEffect } from 'react';
import { useLinkExpiration } from '../hooks/useLinkExpiration';

const OrderConfirmation = ({ orderId }) => {
  const { checkAndRedirectIfExpired } = useLinkExpiration();

  useEffect(() => {
    // Validate order link on mount
    if (!orderId) {
      checkAndRedirectIfExpired({
        requireValidOrder: true
      });
    }
  }, [orderId, checkAndRedirectIfExpired]);

  return (
    // Order confirmation JSX
  );
};
```

### 4. API Error Handling

```javascript
// In an API service
import { handleApiExpiredError } from '../utils/linkExpiration';

class ApiService {
  async makeRequest(url, options) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Check if it's an expiration error
      if (handleApiExpiredError(error)) {
        return null; // User will be redirected
      }
      
      // Re-throw for other error handling
      throw error;
    }
  }
}
```

## Configuration

### Expiration Times

Default expiration times used in the system:

- **Magic Tokens**: 10 minutes
- **Payment Sessions**: 15 minutes
- **Order Data**: 30 minutes
- **User Sessions**: 1 hour

### localStorage Keys

Keys that are monitored and cleaned up:

- `magicToken`, `magicTokenTime`
- `paymentSession`, `paymentSessionTime`, `paymentIntent`
- `tempOrderData`, `tempOrderTime`, `orderHash`
- `sessionToken`, `sessionTime`
- `tempCart`, `quickOrderData`

## Best Practices

1. **Use the hook in React components** for consistent handling
2. **Wrap protected routes** with the HOC or Guard component
3. **Check expiration on component mount** and before API calls
4. **Provide specific expiration reasons** for better user experience
5. **Clean up data immediately** when expiration is detected
6. **Use appropriate expiration times** based on security needs

## Integration with Existing Code

### Router Integration

The link expired page is already integrated into the router:

```javascript
// In router.jsx
{
  path: '/link-expired',
  element: <LinkExpiredPage />,
},
{
  path: '/expired',
  element: <LinkExpiredPage />, // Alternative shorter URL
}
```

### Context Integration

The system works alongside existing contexts:

- **AuthContext**: For session management
- **CartContext**: For temporary cart data
- **RestaurantContext**: For app-wide state

### Error Boundary Integration

Works with the existing ErrorBoundary component for comprehensive error handling.

## Testing

### Manual Testing

1. Navigate to `/link-expired` to see the default page
2. Test with parameters: `/link-expired?reason=payment`
3. Test API error handling by triggering 401/403 errors
4. Test automatic cleanup by manually expiring localStorage data

### Automated Testing

```javascript
// Example test
describe('Link Expiration System', () => {
  it('should redirect on expired payment session', () => {
    // Set expired payment session
    localStorage.setItem('paymentSession', 'test-session');
    localStorage.setItem('paymentSessionTime', Date.now() - (20 * 60 * 1000)); // 20 minutes ago
    
    // Test component behavior
    const { checkAndRedirectIfExpired } = renderHook(() => useLinkExpiration());
    
    const result = checkAndRedirectIfExpired({ requireValidPayment: true });
    expect(result).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

1. **Page not loading**: Check if framer-motion is installed
2. **Styles not applying**: Verify theme import path
3. **Redirects not working**: Check router configuration
4. **Data not clearing**: Verify localStorage key names

### Debug Mode

Enable debug logging by setting:

```javascript
localStorage.setItem('debug-link-expiration', 'true');
```

This will provide detailed console logs about expiration checks and redirects.