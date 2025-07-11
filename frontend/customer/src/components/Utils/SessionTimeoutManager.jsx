import React, { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { theme } from '../../data/theme';

// Session configuration
const SESSION_CONFIG = {
  // Time before showing warning (in milliseconds)
  WARNING_TIME: 25 * 60 * 1000, // 25 minutes
  // Total session timeout (in milliseconds)
  TIMEOUT_TIME: 30 * 60 * 1000, // 30 minutes
  // Warning countdown duration (in milliseconds)
  WARNING_COUNTDOWN: 5 * 60 * 1000, // 5 minutes
  // Backend check interval (in milliseconds)
  BACKEND_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  // Activity check interval (in milliseconds)
  ACTIVITY_CHECK_INTERVAL: 1000, // 1 second
};

const SessionTimeoutManager = () => {
  const { isAuthenticated, user, logout, checkSession } = useAuth();
  const { addNotification } = useNotifications();
  
  // State management
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Refs for timers and activity tracking
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const backendCheckTimerRef = useRef(null);
  const activityCheckTimerRef = useRef(null);

  // Activity tracking events
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  // Update last activity time
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // If warning is showing and user is active, reset the session
    if (showWarning) {
      resetSession();
    }
  }, [showWarning]);

  // Check user status with backend
  const checkUserStatus = useCallback(async () => {
    if (!isAuthenticated || !user || isCheckingStatus) return;

    try {
      setIsCheckingStatus(true);
      
      // Use the checkSession method from AuthContext
      const { valid, error } = await checkSession();
      
      if (!valid) {
        // User session is invalid or user is inactive
        handleSessionExpired(error || 'Your account status has changed. Please log in again.');
        return;
      }
      
    } catch (error) {
      console.error('Error checking user status:', error);
      handleSessionExpired('Unable to verify session. Please log in again.');
    } finally {
      setIsCheckingStatus(false);
    }
  }, [isAuthenticated, user, isCheckingStatus, checkSession]);

  // Handle session expiration
  const handleSessionExpired = useCallback((message) => {
    // Clear all timers
    clearAllTimers();
    
    // Show notification
    addNotification({
      type: 'warning',
      title: 'Session Expired',
      message: message || 'Your session has timed out for security reasons.',
      duration: 5000
    });
    
    // Logout user
    logout();
    
    // Reset states
    setShowWarning(false);
    setCountdown(0);
  }, [addNotification, logout]);

  // Show timeout warning
  const showTimeoutWarning = useCallback(() => {
    setShowWarning(true);
    setCountdown(SESSION_CONFIG.WARNING_COUNTDOWN);
    
    // Start countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          // Time's up, logout
          handleSessionExpired('Session timed out due to inactivity.');
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
    
    if (isAuthenticated) {
      // Start warning timer
      warningTimerRef.current = setTimeout(() => {
        showTimeoutWarning();
      }, SESSION_CONFIG.WARNING_TIME);
      
      // Start timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        handleSessionExpired('Session timed out due to inactivity.');
      }, SESSION_CONFIG.TIMEOUT_TIME);
    }
  }, [isAuthenticated, showTimeoutWarning, handleSessionExpired]);

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

  // Extend session when user chooses to continue
  const extendSession = useCallback(() => {
    updateActivity();
    addNotification({
      type: 'success',
      title: 'Session Extended',
      message: 'Your session has been extended successfully.',
      duration: 3000
    });
  }, [updateActivity, addNotification]);

  // Manual logout from warning modal
  const handleManualLogout = useCallback(() => {
    handleSessionExpired('You have been logged out.');
  }, [handleSessionExpired]);

  // Check for user activity periodically
  const checkActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    
    // If user has been inactive for warning time and no warning is shown
    if (timeSinceLastActivity >= SESSION_CONFIG.WARNING_TIME && !showWarning) {
      showTimeoutWarning();
    }
    
    // If user has been inactive for timeout time
    if (timeSinceLastActivity >= SESSION_CONFIG.TIMEOUT_TIME) {
      handleSessionExpired('Session timed out due to inactivity.');
    }
  }, [isAuthenticated, showWarning, showTimeoutWarning, handleSessionExpired]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) {
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

  // Don't render if user is not authenticated
  if (!isAuthenticated) {
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
