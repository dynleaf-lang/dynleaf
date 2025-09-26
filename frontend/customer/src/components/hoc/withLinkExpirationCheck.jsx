import React, { useEffect } from 'react';
import { useLinkExpiration } from '../hooks/useLinkExpiration';

/**
 * Higher-Order Component that wraps components with automatic link expiration checking
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {Object} options - Configuration options
 * @returns {React.Component} - Wrapped component with expiration checking
 */
export const withLinkExpirationCheck = (WrappedComponent, options = {}) => {
  const WithLinkExpirationCheck = (props) => {
    const { checkExpiredData, checkAndRedirectIfExpired } = useLinkExpiration();
    
    const {
      requireAuth = false,
      requireValidOrder = false,
      requireValidPayment = false,
      maxAge = 60 * 60 * 1000, // 1 hour default
      checkOnMount = true,
      checkInterval = null // Optional periodic checking
    } = options;

    useEffect(() => {
      if (checkOnMount) {
        // Clean up any expired data first
        checkExpiredData();
        
        // Check if current component requires validation
        const shouldRedirect = checkAndRedirectIfExpired({
          requireAuth,
          requireValidOrder,
          requireValidPayment,
          maxAge
        });

        // If redirected, don't continue with component mounting
        if (shouldRedirect) {
          return;
        }
      }
    }, [checkExpiredData, checkAndRedirectIfExpired, requireAuth, requireValidOrder, requireValidPayment, maxAge, checkOnMount]);

    // Optional periodic checking
    useEffect(() => {
      if (checkInterval && typeof checkInterval === 'number') {
        const interval = setInterval(() => {
          checkAndRedirectIfExpired({
            requireAuth,
            requireValidOrder,
            requireValidPayment,
            maxAge
          });
        }, checkInterval);

        return () => clearInterval(interval);
      }
    }, [checkInterval, checkAndRedirectIfExpired, requireAuth, requireValidOrder, requireValidPayment, maxAge]);

    return <WrappedComponent {...props} />;
  };

  WithLinkExpirationCheck.displayName = `WithLinkExpirationCheck(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithLinkExpirationCheck;
};

/**
 * React component that provides link expiration checking for its children
 * @param {Object} props - Component props
 */
export const LinkExpirationGuard = ({ 
  children, 
  requireAuth = false,
  requireValidOrder = false, 
  requireValidPayment = false,
  maxAge = 60 * 60 * 1000,
  checkInterval = null,
  fallback = null
}) => {
  const { checkExpiredData, checkAndRedirectIfExpired } = useLinkExpiration();
  const [shouldRender, setShouldRender] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  useEffect(() => {
    const performCheck = async () => {
      try {
        setIsChecking(true);
        
        // Clean up expired data
        checkExpiredData();
        
        // Check if redirect is needed
        const shouldRedirect = checkAndRedirectIfExpired({
          requireAuth,
          requireValidOrder,
          requireValidPayment,
          maxAge
        });

        if (!shouldRedirect) {
          setShouldRender(true);
        }
      } catch (error) {
        console.error('[LinkExpirationGuard] Error during check:', error);
        setShouldRender(true); // Render on error to avoid blocking
      } finally {
        setIsChecking(false);
      }
    };

    performCheck();
  }, [checkExpiredData, checkAndRedirectIfExpired, requireAuth, requireValidOrder, requireValidPayment, maxAge]);

  // Optional periodic checking
  useEffect(() => {
    if (checkInterval && typeof checkInterval === 'number' && shouldRender) {
      const interval = setInterval(() => {
        checkAndRedirectIfExpired({
          requireAuth,
          requireValidOrder,
          requireValidPayment,
          maxAge
        });
      }, checkInterval);

      return () => clearInterval(interval);
    }
  }, [checkInterval, checkAndRedirectIfExpired, requireAuth, requireValidOrder, requireValidPayment, maxAge, shouldRender]);

  if (isChecking) {
    return fallback || (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: '#666'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid #ddd',
          borderTop: '2px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ marginLeft: '10px' }}>Checking authentication...</span>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return shouldRender ? children : null;
};

export default withLinkExpirationCheck;