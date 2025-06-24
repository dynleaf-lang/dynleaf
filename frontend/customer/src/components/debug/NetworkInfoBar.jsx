import React, { useState, useEffect } from 'react';

/**
 * A debug component that displays network information for mobile device testing
 * Only appears in development mode
 */
const NetworkInfoBar = () => {
  const [ipAddress, setIpAddress] = useState('');
  const [urlInfo, setUrlInfo] = useState({});
  const [isVisible, setIsVisible] = useState(true);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Extract URL parameters
    const params = new URLSearchParams(window.location.search);
    const paramObject = {};
    
    // Convert URL params to object
    for (const [key, value] of params.entries()) {
      paramObject[key] = value;
    }
    
    setUrlInfo(paramObject);
  }, []);

  useEffect(() => {
    // Get hostname information
    const hostname = window.location.hostname;
    const port = window.location.port;
    setIpAddress(`${hostname}:${port}`);
  }, []);

  // Use conditional rendering instead of early return
  return (
    <>
      {isDevelopment && isVisible && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 16px',
          fontSize: '12px',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'monospace'
        }}>
          <div>
            <div>
              <strong>Network:</strong> {ipAddress}
            </div>
            <div>
              <strong>Params:</strong> {Object.keys(urlInfo).length > 0 ? 
                Object.entries(urlInfo).map(([key, value]) => `${key}=${value.substring(0, 8)}...`).join(', ') : 
                'None'}
            </div>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            Hide
          </button>
        </div>
      )}
    </>
  );
};

export default NetworkInfoBar;