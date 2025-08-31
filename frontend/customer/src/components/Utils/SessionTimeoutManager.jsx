import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useCart } from '../../context/CartContext';
import { theme } from '../../data/theme';

// Session configuration
const SESSION_CONFIG = {
  // Enable/disable session timeout (set to false to disable completely)
  ENABLED: true, // Re-enabled with proper logic
  // Time before showing warning (in milliseconds)
  WARNING_TIME: 55 * 60 * 1000, // 55 minutes
  // Total session timeout (in milliseconds)
  TIMEOUT_TIME: 60 * 60 * 1000, // 60 minutes (1 hour)
  // Warning countdown duration (in milliseconds)
  WARNING_COUNTDOWN: 5 * 60 * 1000, // 5 minutes
  // Backend check interval (in milliseconds) - reduced frequency
  BACKEND_CHECK_INTERVAL: 15 * 60 * 1000, // 15 minutes (less aggressive)
  // Activity check interval (in milliseconds)
  ACTIVITY_CHECK_INTERVAL: 60 * 1000, // 1 minute (much less aggressive)
  // Max failed backend checks before forcing logout
  MAX_FAILED_CHECKS: 3, // More tolerant
  // Debug mode
  DEBUG: process.env.NODE_ENV === 'development',
};

const SessionTimeoutManager = () => {
  const { isAuthenticated, user, logout, checkSession } = useAuth();
  const { addNotification, clearAllNotifications } = useNotifications();
  const { clearCart, resetCartAndOrder } = useCart();
  
  // State management
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [failedChecks, setFailedChecks] = useState(0);
  
  // Refs for timers and activity tracking
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const backendCheckTimerRef = useRef(null);
  const activityCheckTimerRef = useRef(null);

  // Activity tracking events - more comprehensive
  const activityEvents = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 
    'click', 'focus', 'blur', 'resize', 'keydown'
  ];

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (backendCheckTimerRef.current) {
      clearInterval(backendCheckTimerRef.current);
      backendCheckTimerRef.current = null;
    }
    if (activityCheckTimerRef.current) {
      clearInterval(activityCheckTimerRef.current);
      activityCheckTimerRef.current = null;
    }
  }, []);

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Reset failed checks on user activity
    if (failedChecks > 0) {
      setFailedChecks(0);
    }
    
    // If warning is showing and user is active, reset the session
    if (showWarning) {
      clearAllTimers();
      setShowWarning(false);
      setCountdown(0);
      setFailedChecks(0);
      
      // Restart session timers if authenticated
      if (isAuthenticated) {
        // This will be handled by the main effect
        setTimeout(() => {
          // Trigger a re-initialization of timers
          lastActivityRef.current = Date.now();
        }, 10);
      }
    }
  }, [showWarning, failedChecks, isAuthenticated, clearAllTimers]);

  // Check user status with backend
  const checkUserStatus = useCallback(async () => {
    if (!isAuthenticated || !user || isCheckingStatus) return;

    // Skip check if user has been recently active (within last 5 minutes)
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    if (timeSinceLastActivity < 5 * 60 * 1000) {
      // User is active, reset failed checks and skip this check
      if (failedChecks > 0) {
        setFailedChecks(0);
        if (SESSION_CONFIG.DEBUG) {
          console.log('User is active, resetting failed checks');
        }
      }
      return;
    }

    if (SESSION_CONFIG.DEBUG) {
      console.log('Performing backend session check...');
    }

    try {
      setIsCheckingStatus(true);
      
      // Use the checkSession method from AuthContext
      const { valid, error } = await checkSession();
      
      if (!valid) {
        // Increment failed checks instead of immediately logging out
        setFailedChecks(prev => {
          const newCount = prev + 1;
          
          if (SESSION_CONFIG.DEBUG) {
            console.warn(`Session check failed (${newCount}/${SESSION_CONFIG.MAX_FAILED_CHECKS}):`, error);
          }
          
          // Only logout after MAX_FAILED_CHECKS consecutive failures
          if (newCount >= SESSION_CONFIG.MAX_FAILED_CHECKS) {
            handleSessionExpired(error || 'Your account status has changed. Please log in again.', true);
          }
          
          return newCount;
        });
        return;
      } else {
        // Session is valid, reset failed checks
        if (failedChecks > 0) {
          setFailedChecks(0);
          if (SESSION_CONFIG.DEBUG) {
            console.log('Session check passed, resetting failed checks');
          }
        }
      }
      
    } catch (error) {
      console.error('Error checking user status:', error);
      
      // Only increment failed checks for network/server errors
      setFailedChecks(prev => {
        const newCount = prev + 1;
        
        if (SESSION_CONFIG.DEBUG) {
          console.warn(`Session check error (${newCount}/${SESSION_CONFIG.MAX_FAILED_CHECKS}):`, error.message);
        }
        
        if (newCount >= SESSION_CONFIG.MAX_FAILED_CHECKS) {
          handleSessionExpired('Unable to verify session. Please log in again.', true);
        }
        
        return newCount;
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [isAuthenticated, user, isCheckingStatus, checkSession, failedChecks]);

  // Handle session expiration with proper cleanup
  const handleSessionExpired = useCallback((message, isAutomatic = true) => {
    // Clear all timers first
    clearAllTimers();
    
    if (SESSION_CONFIG.DEBUG) {
      console.log('Starting session cleanup...', { isAutomatic, message });
    }
    
    // Professional cleanup process
    try {
      // 1. Clear sensitive cart and order data
      if (resetCartAndOrder) {
        resetCartAndOrder();
        if (SESSION_CONFIG.DEBUG) console.log('Cart and order data cleared');
      }
      
      // 2. Clear notifications that might contain sensitive info
      if (clearAllNotifications) {
        clearAllNotifications();
        if (SESSION_CONFIG.DEBUG) console.log('Notifications and tracked orders cleared');
      }
      
      // 3. Clear any cached order data from session storage
      try {
        sessionStorage.clear();
        if (SESSION_CONFIG.DEBUG) console.log('Session storage cleared');
      } catch (storageError) {
        console.warn('Failed to clear session storage:', storageError);
      }
      
      // 4. Show appropriate notification based on logout type
      const notificationMessage = isAutomatic 
        ? message || 'Your session has expired for security reasons. Please log in again to continue.'
        : message || 'You have been logged out successfully.';
        
      addNotification({
        type: isAutomatic ? 'warning' : 'info',
        title: isAutomatic ? 'Session Expired' : 'Logged Out',
        message: notificationMessage,
        duration: isAutomatic ? 6000 : 4000
      });
      
      // 5. Logout user (this will clear localStorage and auth state)
      logout();
      if (SESSION_CONFIG.DEBUG) console.log('User logged out');
      
      // 6. Navigate to public area and show login prompt
      setTimeout(() => {
        // Dispatch custom event to navigate to login
        window.dispatchEvent(new CustomEvent('session-expired', {
          detail: { 
            reason: isAutomatic ? 'timeout' : 'manual',
            message: notificationMessage 
          }
        }));
        if (SESSION_CONFIG.DEBUG) console.log('Session expired event dispatched');
      }, 100);
      
    } catch (error) {
      console.error('Error during session cleanup:', error);
      // Fallback: still logout even if cleanup fails
      logout();
      // Still dispatch the event for navigation
      window.dispatchEvent(new CustomEvent('session-expired', {
        detail: { 
          reason: 'error',
          message: 'Session cleanup failed. You have been logged out for security.'
        }
      }));
    }
    
    // 7. Reset component states
    setShowWarning(false);
    setCountdown(0);
    setFailedChecks(0);
    
    if (SESSION_CONFIG.DEBUG) {
      console.log('Session cleanup completed:', { isAutomatic, message });
    }
  }, [clearAllTimers, resetCartAndOrder, clearAllNotifications, addNotification, logout]);

  // Show timeout warning
  const showTimeoutWarning = useCallback(() => {
    setShowWarning(true);
    setCountdown(SESSION_CONFIG.WARNING_COUNTDOWN);
    
    // Start countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          // Time's up, logout
          handleSessionExpired('Session timed out due to inactivity.', true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    
    // Add notification
    addNotification({
      type: 'warning',
      title: 'Session Timeout Warning',
      message: 'Your session will expire soon due to inactivity.',
      duration: 8000
    });
  }, [addNotification, handleSessionExpired]);

  // Reset session timers
  const resetSession = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setCountdown(0);
    setFailedChecks(0);
    
    if (isAuthenticated) {
      // Start warning timer
      warningTimerRef.current = setTimeout(() => {
        showTimeoutWarning();
      }, SESSION_CONFIG.WARNING_TIME);
      
      // Start timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        handleSessionExpired('Session timed out due to inactivity.', true);
      }, SESSION_CONFIG.TIMEOUT_TIME);
    }
  }, [isAuthenticated, showTimeoutWarning, handleSessionExpired]);

  // Extend session when user chooses to continue
  const extendSession = useCallback(() => {
    // Update activity and reset timers
    lastActivityRef.current = Date.now();
    clearAllTimers();
    setShowWarning(false);
    setCountdown(0);
    setFailedChecks(0);
    
    // Restart session timers if authenticated
    if (isAuthenticated) {
      // Start warning timer
      warningTimerRef.current = setTimeout(() => {
        showTimeoutWarning();
      }, SESSION_CONFIG.WARNING_TIME);
      
      // Start timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        handleSessionExpired('Session timed out due to inactivity.', true);
      }, SESSION_CONFIG.TIMEOUT_TIME);
    }
    
    addNotification({
      type: 'success',
      title: 'Session Extended',
      message: 'Your session has been extended successfully.',
      duration: 3000
    });
  }, [isAuthenticated, clearAllTimers, showTimeoutWarning, handleSessionExpired, addNotification]);

  // Manual logout from warning modal
  const handleManualLogout = useCallback(() => {
    handleSessionExpired('You have been logged out.', false);
  }, [handleSessionExpired]);

  // Check for user activity periodically
  const checkActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    // Only check if user has been inactive for a significant time
    // and no warning is currently shown
    if (timeSinceLastActivity >= SESSION_CONFIG.WARNING_TIME && !showWarning) {
      showTimeoutWarning();
    }
    
    // Only timeout after the full timeout period
    if (timeSinceLastActivity >= SESSION_CONFIG.TIMEOUT_TIME) {
      handleSessionExpired('Session timed out due to inactivity.', true);
    }
  }, [isAuthenticated, showWarning, showTimeoutWarning, handleSessionExpired]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated || !SESSION_CONFIG.ENABLED) {
      clearAllTimers();
      return;
    }

    // Add activity event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Start session timers
    resetSession();
    
    // Start backend status checking
    backendCheckTimerRef.current = setInterval(checkUserStatus, SESSION_CONFIG.BACKEND_CHECK_INTERVAL);
    
    // Start activity checking
    activityCheckTimerRef.current = setInterval(checkActivity, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearAllTimers();
    };
  }, [isAuthenticated, updateActivity, resetSession, checkUserStatus, checkActivity, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Format countdown time
  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Don't render if user is not authenticated or if session timeout is disabled
  if (!isAuthenticated || !SESSION_CONFIG.ENABLED) {
    return null;
  }

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            style={{
              backgroundColor: '#fff',
              borderRadius: theme.borderRadius.xl,
              padding: theme.spacing.xl,
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: `2px solid ${theme.colors.warning}`,
            }}
          >
            {/* Warning Icon */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: `${theme.colors.warning}15`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                marginBottom: theme.spacing.lg,
              }}
            >
              <span 
                className="material-icons" 
                style={{
                  fontSize: '32px',
                  color: theme.colors.warning,
                }}
              >
                schedule
              </span>
            </motion.div>

            {/* Title */}
            <h2 style={{
              margin: 0,
              marginBottom: theme.spacing.md,
              fontSize: theme.typography.sizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary,
            }}>
              Session Timeout Warning
            </h2>

            {/* Message */}
            <p style={{
              margin: 0,
              marginBottom: theme.spacing.lg,
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.secondary,
              lineHeight: 1.5,
            }}>
              Your session will expire in <strong style={{ color: theme.colors.warning }}>
                {formatTime(countdown)}
              </strong> due to inactivity. Do you want to continue?
            </p>

            {/* Countdown Progress Bar */}
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#f0f0f0',
              borderRadius: '3px',
              marginBottom: theme.spacing.lg,
              overflow: 'hidden',
            }}>
              <motion.div
                style={{
                  height: '100%',
                  backgroundColor: theme.colors.warning,
                  borderRadius: '3px',
                }}
                animate={{
                  width: `${(countdown / SESSION_CONFIG.WARNING_COUNTDOWN) * 100}%`
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: theme.spacing.md,
              justifyContent: 'center',
            }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={extendSession}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: '#fff',
                  border: 'none',
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.sizes.md,
                  fontWeight: theme.typography.fontWeights.semibold,
                  cursor: 'pointer',
                  minWidth: '120px',
                  transition: 'all 0.2s ease',
                }}
              >
                Continue Session
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleManualLogout}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.colors.text.secondary,
                  border: `1px solid ${theme.colors.border?.light || '#e0e0e0'}`,
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.sizes.md,
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: 'pointer',
                  minWidth: '120px',
                  transition: 'all 0.2s ease',
                }}
              >
                Logout
              </motion.button>
            </div>

            {/* Security Notice */}
            <p style={{
              margin: 0,
              marginTop: theme.spacing.lg,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.tertiary,
              fontStyle: 'italic',
            }}>
              This timeout helps protect your account security
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionTimeoutManager;
