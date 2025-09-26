import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { theme } from '../../data/theme';

/**
 * Professional Link Expired Page
 * Displays when users access expired or invalid links
 * Provides clear guidance and navigation options to get back to the app
 */
const LinkExpiredPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState('unknown');
  const [returnUrl, setReturnUrl] = useState('/');

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const reasonParam = urlParams.get('reason') || 'unknown';
    const returnParam = urlParams.get('return') || '/';
    
    setReason(reasonParam);
    setReturnUrl(decodeURIComponent(returnParam));

    // Simulate a brief loading state for professional appearance
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Get reason-specific content
  const getReasonContent = () => {
    switch (reason) {
      case 'payment':
      case 'payment-expired':
        return {
          title: 'Payment Link Expired',
          subtitle: 'Your payment session has expired for security reasons.',
          icon: '💳',
          details: [
            'Payment links expire after 15 minutes',
            'This protects your financial information',
            'You can start a new order safely'
          ]
        };
      case 'session':
      case 'session-timeout':
        return {
          title: 'Session Expired',
          subtitle: 'Your login session has timed out.',
          icon: '🔒',
          details: [
            'Sessions expire after periods of inactivity',
            'This keeps your account secure',
            'Simply start a new session'
          ]
        };
      case 'order':
      case 'order-expired':
        return {
          title: 'Order Link Expired',
          subtitle: 'This order link is no longer valid.',
          icon: '📋',
          details: [
            'Order links have time limits',
            'Menu items or prices may have changed',
            'Create a fresh order with current menu'
          ]
        };
      case 'magic-token':
        return {
          title: 'Access Link Expired',
          subtitle: 'This quick access link has expired.',
          icon: '✨',
          details: [
            'Quick access links expire after 10 minutes',
            'This ensures secure access to your account',
            'Use the regular login process'
          ]
        };
      default:
        return {
          title: 'Link Expired',
          subtitle: 'The link you clicked has expired or is no longer valid.',
          icon: '⏰',
          details: [
            'Payment or order links expire for security',
            'Email links may have time limits',
            'The session may have timed out'
          ]
        };
    }
  };

  const content = getReasonContent();

  const handleBackToOrder = () => {
    // Clear any expired data from localStorage
    try {
      const expiredKeys = [
        'tempOrderData',
        'paymentSession',
        'checkoutData',
        'magicToken',
        'tempUserToken',
        'orderHash',
        'paymentIntent',
        'sessionToken',
        'tempCart',
        'quickOrderData'
      ];
      
      expiredKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Error clearing expired data:', error);
    }

    // Navigate to return URL or main ordering page
    window.location.href = returnUrl === '/link-expired' ? '/' : returnUrl;
  };

  const handleContactSupport = () => {
    // Open support contact (could be phone, email, or chat)
    // This could be configured based on restaurant settings
    const supportEmail = 'support@orderease.com';
    const subject = encodeURIComponent('Help with Expired Link');
    const body = encodeURIComponent('I clicked on a link that appears to be expired. Could you please help me access my order?');
    
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: theme.colors.background,
          fontFamily: theme.typography.fontFamily.primary
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: theme.colors.text.secondary
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: `3px solid ${theme.colors.primary}`,
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ fontSize: theme.typography.sizes.lg }}>
            Checking link status...
          </span>
        </motion.div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: theme.colors.background,
        fontFamily: theme.typography.fontFamily.primary,
        position: 'relative'
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${theme.colors.primary}08 0%, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius?.xl || '16px',
          padding: '48px 32px',
          boxShadow: `0 20px 40px ${theme.colors.shadow?.medium || 'rgba(0, 0, 0, 0.1)'}`,
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Expired Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            fontSize: '4rem',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: `${theme.colors.warning}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem'
            }}
          >
            {content.icon}
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            color: theme.colors.text.primary,
            fontSize: theme.typography.sizes['3xl'],
            fontWeight: theme.typography.fontWeights.bold,
            marginBottom: '16px',
            fontFamily: theme.typography.fontFamily.display || theme.typography.fontFamily.primary,
            lineHeight: 1.2
          }}
        >
          {content.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            color: theme.colors.text.secondary,
            fontSize: theme.typography.sizes.lg,
            marginBottom: '32px',
            lineHeight: 1.5,
            fontWeight: theme.typography.fontWeights.medium
          }}
        >
          {content.subtitle}
        </motion.p>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            backgroundColor: `${theme.colors.info}08`,
            border: `1px solid ${theme.colors.info}20`,
            borderRadius: theme.borderRadius?.md || '8px',
            padding: '20px',
            marginBottom: '32px',
            textAlign: 'left'
          }}
        >
          <h3
            style={{
              color: theme.colors.text.primary,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
            What happened?
          </h3>
          <ul
            style={{
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm,
              lineHeight: 1.6,
              margin: 0,
              paddingLeft: '20px'
            }}
          >
            {content.details.map((detail, index) => (
              <li key={index} style={{ marginBottom: '6px' }}>{detail}</li>
            ))}
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}
        >
          {/* Primary Action - Back to Order */}
          <button
            onClick={handleBackToOrder}
            style={{
              background: theme.colors.primaryGradient || theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius?.md || '8px',
              padding: '14px 28px',
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: '160px',
              boxShadow: `0 4px 12px ${theme.colors.primary}30`,
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = `0 6px 20px ${theme.colors.primary}40`;
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 4px 12px ${theme.colors.primary}30`;
            }}
          >
            🍽️ Start New Order
          </button>

          {/* Secondary Action - Refresh */}
          <button
            onClick={handleRefreshPage}
            style={{
              backgroundColor: 'transparent',
              color: theme.colors.primary,
              border: `2px solid ${theme.colors.primary}`,
              borderRadius: theme.borderRadius?.md || '8px',
              padding: '12px 24px',
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: '140px',
              fontFamily: 'inherit'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = theme.colors.primary;
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = theme.colors.primary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🔄 Try Again
          </button>
        </motion.div>

        {/* Support Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: '24px',
            textAlign: 'center'
          }}
        >
          <p
            style={{
              color: theme.colors.text.muted,
              fontSize: theme.typography.sizes.sm,
              marginBottom: '12px'
            }}
          >
            Still having trouble?
          </p>
          <button
            onClick={handleContactSupport}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.primary,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'inherit',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.color = theme.colors.primaryDark;
            }}
            onMouseOut={(e) => {
              e.target.style.color = theme.colors.primary;
            }}
          >
            💬 Contact Support
          </button>
        </motion.div>
      </motion.div>

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          marginTop: '32px',
          textAlign: 'center',
          color: theme.colors.text.muted,
          fontSize: theme.typography.sizes.xs,
          maxWidth: '400px'
        }}
      >
        <p style={{ margin: 0 }}>
          For your security, links expire automatically. 
          <br />
          Start a fresh order or contact us for assistance.
        </p>
      </motion.div>
    </div>
  );
};

export default LinkExpiredPage;