import React, { useState, useEffect, useContext, useRef } from 'react';
import { Modal, Button } from 'reactstrap';
import { AuthContext } from '../../context/AuthContext';

// Time before showing the warning (25 minutes in ms)
const WARNING_TIME = 25 * 60 * 1000;

// Time given to the user to respond (5 minutes in ms)
const WARNING_DURATION = 5 * 60 * 1000;

// Total session time is 30 minutes (WARNING_TIME + WARNING_DURATION)

const SessionTimeoutModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { token, logout } = useContext(AuthContext);
  const warningTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Start the warning timer
  useEffect(() => {
    const resetWarningTimer = () => {
      // Clear any existing timers
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      // Only set timers if user is logged in
      if (token) {
        // Set timer for showing the warning
        warningTimerRef.current = setTimeout(() => {
          setIsOpen(true);
          setCountdown(Math.floor(WARNING_DURATION / 1000));
          
          // Update countdown every second
          countdownIntervalRef.current = setInterval(() => {
            setCountdown(prevCount => {
              if (prevCount <= 1) {
                clearInterval(countdownIntervalRef.current);
                return 0;
              }
              return prevCount - 1;
            });
          }, 1000);

          // Set timer for actual logout
          countdownTimerRef.current = setTimeout(() => {
            setIsOpen(false);
            logout();
          }, WARNING_DURATION);
        }, WARNING_TIME);
      }
    };

    // Array of events to listen for
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress',
      'scroll', 'touchstart', 'click', 'keydown'
    ];
    
    // Event handler to reset the warning timer
    const handleUserActivity = () => {
      resetWarningTimer();
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // Initialize the timer
    resetWarningTimer();
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [token, logout]);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Extend the session
  const extendSession = () => {
    setIsOpen(false);
    // No need to do anything else as the activity event listeners 
    // will reset the timers automatically
  };

  return (
    <Modal isOpen={isOpen} centered>
      <div className="modal-header">
        <h5 className="modal-title">Session Timeout Warning</h5>
      </div>
      <div className="modal-body">
        <p>Your session is about to expire due to inactivity.</p>
        <p>You will be logged out in <strong>{formatTime(countdown)}</strong>.</p>
      </div>
      <div className="modal-footer">
        <Button color="primary" onClick={extendSession}>
          Stay Logged In
        </Button>
        <Button color="secondary" onClick={() => logout()}>
          Logout Now
        </Button>
      </div>
    </Modal>
  );
};

export default SessionTimeoutModal;