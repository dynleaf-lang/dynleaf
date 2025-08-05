import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SessionManager = () => {
  const { isAuthenticated, logout, user } = useAuth();

  // Session timeout configuration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes warning

  const handleLogout = useCallback(() => {
    toast.error('Session expired. Please login again.');
    logout();
  }, [logout]);

  const showWarning = useCallback(() => {
    toast((t) => (
      <div>
        <strong>Session Warning</strong>
        <p>Your session will expire in 5 minutes due to inactivity.</p>
        <div className="mt-2">
          <button
            className="btn btn-sm btn-primary me-2"
            onClick={() => {
              toast.dismiss(t.id);
              // Reset activity timer by making a simple API call
              resetActivity();
            }}
          >
            Stay Logged In
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              toast.dismiss(t.id);
              handleLogout();
            }}
          >
            Logout Now
          </button>
        </div>
      </div>
    ), {
      duration: WARNING_TIME,
      id: 'session-warning'
    });
  }, [handleLogout]);

  const resetActivity = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem('pos_last_activity', Date.now().toString());
    }
  }, [isAuthenticated]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetActivityHandler = () => {
      resetActivity();
    };

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, resetActivityHandler, true);
    });

    // Set initial activity time
    resetActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivityHandler, true);
      });
    };
  }, [isAuthenticated, resetActivity]);

  // Check session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      const lastActivity = localStorage.getItem('pos_last_activity');
      if (!lastActivity) {
        resetActivity();
        return;
      }

      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        handleLogout();
      } else if (timeSinceActivity >= SESSION_TIMEOUT - WARNING_TIME) {
        // Show warning if within 5 minutes of timeout
        const existingToast = toast.getToasts().find(t => t.id === 'session-warning');
        if (!existingToast) {
          showWarning();
        }
      }
    };

    // Check session every minute
    const interval = setInterval(checkSession, 60000);

    // Initial check
    checkSession();

    return () => clearInterval(interval);
  }, [isAuthenticated, handleLogout, showWarning, resetActivity]);

  // Clear activity tracking on logout
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem('pos_last_activity');
    }
  }, [isAuthenticated]);

  return null; // This component doesn't render anything
};

export default SessionManager;
