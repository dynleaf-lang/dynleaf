import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';

const ServerStatusCheck = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
    useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setIsChecking(true);
        // Use the public API health endpoint instead of the generic one
        const response = await api.public.health();
        
        if (response && response.status === 'ok') {
          setServerStatus('connected'); 
        } else {
          throw new Error(response?.error || 'Failed to connect to backend');
        }
      } catch (error) {
        console.error('Backend connection error:', error);
        setServerStatus('error');
        setErrorMessage(
          error.message || 'Unable to connect to the backend server. Please check if the server is running.'
        );
        
        // Retry up to 3 times
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setServerStatus('checking');
          }, 5000); // Wait 5 seconds before retrying
        }
      } finally {
        setIsChecking(false);
      }
    };
    
    if (serverStatus === 'checking') {
      checkServerStatus();
    }
  }, [serverStatus, retryCount]);
  
  // Render conditionally instead of early return
  return (
    <>
      {serverStatus !== 'connected' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: serverStatus === 'checking' ? '#FEF3C7' : '#FEE2E2',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold',
              color: serverStatus === 'checking' ? '#92400E' : '#B91C1C' 
            }}>
              {serverStatus === 'checking' 
                ? `Connecting to backend server${retryCount > 0 ? ` (Retry ${retryCount}/3)` : ''}...` 
                : 'Connection Error'}
            </p>
            {serverStatus === 'error' && (
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B91C1C' }}>
                {errorMessage}
              </p>
            )}
          </div>
          
          {serverStatus === 'error' && (
            <button 
              onClick={() => {
                setServerStatus('checking');
                setRetryCount(0);
              }}
              style={{
                backgroundColor: '#FECACA',
                border: '1px solid #B91C1C',
                color: '#B91C1C',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Retry Connection
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ServerStatusCheck;