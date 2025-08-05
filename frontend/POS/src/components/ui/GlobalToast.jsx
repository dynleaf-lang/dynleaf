import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toast, ToastBody, ToastHeader } from 'reactstrap';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const GlobalToast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Listen for global toast events
    const handleGlobalToast = (event) => {
      const { type, title, message, duration = 4000 } = event.detail;
      
      const newToast = {
        id: Date.now() + Math.random(),
        type,
        title,
        message,
        duration,
        timestamp: new Date()
      };

      setToasts(prev => [...prev, newToast]);

      // Auto remove after duration
      setTimeout(() => {
        removeToast(newToast.id);
      }, duration);
    };

    window.addEventListener('showGlobalToast', handleGlobalToast);

    return () => {
      window.removeEventListener('showGlobalToast', handleGlobalToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-success" />;
      case 'warning':
        return <FaExclamationTriangle className="text-warning" />;
      case 'error':
        return <FaTimes className="text-danger" />;
      default:
        return <FaInfoCircle className="text-info" />;
    }
  };

  const getToastColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'info';
    }
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px'
      }}
    >
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          isOpen={true}
          className={`mb-2 border-${getToastColor(toast.type)}`}
          style={{
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: `2px solid var(--bs-${getToastColor(toast.type)})`
          }}
        >
          <ToastHeader
            icon={getToastIcon(toast.type)}
            toggle={() => removeToast(toast.id)}
            className={`bg-${getToastColor(toast.type)} text-white`}
          >
            {toast.title}
          </ToastHeader>
          <ToastBody>
            {toast.message}
          </ToastBody>
        </Toast>
      ))}
    </div>,
    document.body
  );
};

// Helper function to trigger global toasts
export const showGlobalToast = (type, title, message, duration = 4000) => {
  window.dispatchEvent(new CustomEvent('showGlobalToast', {
    detail: { type, title, message, duration }
  }));
};

export default GlobalToast;
