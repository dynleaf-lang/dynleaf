import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Alert, Button } from 'reactstrap';

const GlobalToast = () => {
  const [toastData, setToastData] = useState(null);

  useEffect(() => {
    // Check for existing toast in localStorage on mount
    const checkStoredToast = () => {
      const stored = localStorage.getItem('otpSuccessToast');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          // Only show if toast is recent (within 10 seconds)
          if (data.show && Date.now() - data.timestamp < 10000) {
            console.log('🎉 Showing stored success toast:', data);
            setToastData(data);
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
              setToastData(null);
              localStorage.removeItem('otpSuccessToast');
            }, 4000);
          } else {
            // Clean up old toast data
            localStorage.removeItem('otpSuccessToast');
          }
        } catch (error) {
          console.error('Error parsing stored toast:', error);
          localStorage.removeItem('otpSuccessToast');
        }
      }
    };

    // Check on mount
    checkStoredToast();

    // Listen for custom toast events
    const handleToastEvent = (event) => {
      console.log('🎉 GlobalToast received event:', event.detail);
      setToastData(event.detail);
      
      // Auto-hide after 4 seconds
      setTimeout(() => {
        setToastData(null);
        localStorage.removeItem('otpSuccessToast');
      }, 4000);
    };

    window.addEventListener('showOTPSuccessToast', handleToastEvent);

    return () => {
      window.removeEventListener('showOTPSuccessToast', handleToastEvent);
    };
  }, []);

  const handleClose = () => {
    setToastData(null);
    localStorage.removeItem('otpSuccessToast');
  };

  if (!toastData || !toastData.show) {
    return null;
  }

  // Render toast using portal to document body
  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 99999,
        minWidth: '350px',
        maxWidth: '450px'
      }}
    >
      <Alert 
        color="success" 
        isOpen={true}
        toggle={handleClose}
        className="shadow-lg border-0 mb-0 notification-slide-in"
        style={{
          borderRadius: '12px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07)',
          border: '2px solid #2dce89'
        }}
      >
        <div className="d-flex align-items-start">
          <div 
            className="mr-3 mt-1 p-2 rounded-circle bg-white"
            style={{ color: '#2dce89' }}
          >
            <i className="fas fa-check-circle" />
          </div>
          <div className="flex-1">
            <h6 className="mb-1 font-weight-bold text-white">
              🎉 {toastData.message}
            </h6>
            <p className="mb-0 text-white" style={{ opacity: 0.9, fontSize: '0.875rem' }}>
              Your email has been verified and your account is now fully activated.
            </p>
          </div>
          <Button 
            close 
            onClick={handleClose}
            className="ml-2 text-white"
            style={{ 
              fontSize: '1.2rem', 
              opacity: 0.8,
              background: 'none',
              border: 'none'
            }}
          />
        </div>
        
        {/* Auto-close progress bar */}
        <div 
          className="progress mt-2"
          style={{ height: '2px', background: 'rgba(255,255,255,0.2)' }}
        >
          <div 
            className="progress-bar bg-white"
            style={{
              animation: 'shrinkWidth 4s linear',
              width: '100%'
            }}
          />
        </div>
      </Alert>

      {/* CSS for toast animations */}
      <style>
        {`
          @keyframes shrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
          .notification-slide-in {
            animation: slideInRight 0.4s ease-out;
          }
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>,
    document.body
  );
};

export default GlobalToast;
