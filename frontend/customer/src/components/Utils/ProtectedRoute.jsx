import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { theme } from '../../data/theme';

const ProtectedRoute = ({ 
  children, 
  fallback = null, 
  showLoginPrompt = true,
  redirectToLogin = false 
}) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        flexDirection: 'column',
        gap: theme.spacing.md
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${theme.colors.primary}20`,
            borderTop: `3px solid ${theme.colors.primary}`,
            borderRadius: '50%'
          }}
        />
        <span style={{
          color: theme.colors.text.secondary,
          fontSize: theme.typography.sizes.sm
        }}>
          Checking authentication...
        </span>
      </div>
    );
  }

  // If not authenticated, show fallback or login prompt
  if (!isAuthenticated) {
    if (fallback) {
      return fallback;
    }

    if (showLoginPrompt) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
            textAlign: 'center',
            minHeight: '300px',
            backgroundColor: theme.colors.background?.light || '#f8f9fa',
            borderRadius: theme.borderRadius.lg,
            margin: theme.spacing.md
          }}
        >
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: `${theme.colors.primary}15`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg
            }}
          >
            <span 
              className="material-icons" 
              style={{
                fontSize: '40px',
                color: theme.colors.primary
              }}
            >
              lock
            </span>
          </motion.div>

          {/* Title */}
          <h2 style={{
            margin: 0,
            marginBottom: theme.spacing.md,
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.text.primary
          }}>
            Authentication Required
          </h2>

          {/* Message */}
          <p style={{
            margin: 0,
            marginBottom: theme.spacing.lg,
            fontSize: theme.typography.sizes.md,
            color: theme.colors.text.secondary,
            lineHeight: 1.5,
            maxWidth: '400px'
          }}>
            Please log in to access this content. Your session may have expired for security reasons.
          </p>

          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // Navigate to profile/login section
              window.dispatchEvent(new CustomEvent('navigate-to-login'));
            }}
            style={{
              backgroundColor: theme.colors.primary,
              color: '#fff',
              border: 'none',
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>
              login
            </span>
            Log In
          </motion.button>
        </motion.div>
      );
    }

    return null;
  }

  // User is authenticated, render children
  return children;
};

export default ProtectedRoute;
