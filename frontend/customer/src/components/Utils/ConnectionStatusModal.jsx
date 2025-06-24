import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';

const ConnectionStatusModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [backendPort, setBackendPort] = useState('5000');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  
  // Define common server ports for Node.js apps
  const commonPorts = [5000, 3000, 8080, 4000, 9000];
  
  // Check the connection status when component mounts
  useEffect(() => {
    checkConnection();
    
    // Set up global error handler for network errors
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        // If we get a response, reset the connection status modal
        if (response.ok && isVisible) {
          setIsVisible(false);
        }
        return response;
      } catch (error) {
        // If the error is a network error, show the connection status modal
        if (error.message && error.message.includes('Failed to fetch') || 
            error.message && error.message.includes('Network Error')) {
          handleConnectionError();
        }
        throw error;
      }
    };
    
    // Clean up
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  // Periodically check connection if modal is visible
  useEffect(() => {
    let interval;
    if (isVisible) {
      interval = setInterval(() => {
        checkConnection(true);
        setAutoRetryCount(prev => prev + 1);
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible]);
  
  // Handle connection error
  const handleConnectionError = () => {
    setIsVisible(true);
    setConnectionStatus('error');
    setMessage('Connection to the server failed. The server might be down or incorrectly configured.');
    checkConnection(true);
  };
  
  // Check connection to backend
  const checkConnection = async (silent = false) => {
    if (!silent) {
      setConnectionStatus('checking');
    }
    
    try {
      const result = await api.health.check();
      if (result.status === 'ok') {
        setConnectionStatus('connected');
        // Store successful port in localStorage
        const port = window.location.port || '3000';
        localStorage.setItem('apiPort', port);
        setBackendPort(port);
        
        // Close modal after a short delay if connection is restored
        setTimeout(() => setIsVisible(false), 1500);
        return true;
      } else {
        throw new Error('Server not healthy');
      }
    } catch (error) {
      setConnectionStatus('error');
      if (!silent) {
        setIsVisible(true);
      }
      
      // Try to extract port from URL
      try {
        const url = window.location.href;
        const urlObj = new URL(url);
        setBackendPort(urlObj.port || '3000');
      } catch (e) {
        setBackendPort('5000');
      }
      
      return false;
    }
  };
  
  // Try a specific backend port
  const tryPort = async (port) => {
    setMessage(`Trying to connect on port ${port}...`);
    try {
      const response = await fetch(`http://${window.location.hostname}:${port}/api/health`, {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 2000
      });
      
      if (response.ok) {
        setMessage(`Connection successful on port ${port}!`);
        localStorage.setItem('apiPort', port.toString());
        setTimeout(() => window.location.reload(), 1000);
        return true;
      }
    } catch (e) {
      console.log(`Port ${port} connection failed:`, e.message);
    }
    return false;
  };
  
  // Try all common ports
  const tryAllPorts = async () => {
    setMessage('Trying to find the server on different ports...');
    let found = false;
    
    for (const port of commonPorts) {
      setMessage(`Checking port ${port}...`);
      found = await tryPort(port);
      if (found) break;
    }
    
    if (!found) {
      setMessage('Could not find the server on any common port. Make sure the backend server is running.');
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: connectionStatus === 'connected' ? '#d4edda' : '#f8d7da',
            borderBottom: `1px solid ${connectionStatus === 'connected' ? '#c3e6cb' : '#f5c6cb'}`,
            color: connectionStatus === 'connected' ? '#155724' : '#721c24',
            padding: '15px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%',
                  backgroundColor: connectionStatus === 'checking' ? '#ffc107' : 
                                  connectionStatus === 'connected' ? '#28a745' : '#dc3545',
                  animation: connectionStatus === 'checking' ? 'pulse 1.5s infinite' : 'none'
                }}></div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {connectionStatus === 'checking' ? 'Checking connection...' : 
                   connectionStatus === 'connected' ? 'Connected to server!' : 
                   'Connection Failed'}
                </h4>
              </div>
              
              <p style={{ margin: 0, fontSize: '14px' }}>
                {message || (connectionStatus === 'checking' ? 'Testing connection to the backend server...' : 
                           connectionStatus === 'connected' ? 'Successfully connected to the backend server.' :
                           `Unable to connect to the backend server (port ${backendPort}). Check if the server is running.`)}
              </p>
              
              {autoRetryCount > 0 && connectionStatus !== 'connected' && (
                <p style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                  Auto-retry attempts: {autoRetryCount}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {connectionStatus !== 'connected' && (
                <>
                  <button
                    onClick={() => checkConnection()}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Try Again
                  </button>
                  
                  <button
                    onClick={tryAllPorts}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Try Different Ports
                  </button>
                </>
              )}
              
              <button
                onClick={() => setIsVisible(false)}
                style={{
                  padding: '8px 15px',
                  backgroundColor: connectionStatus === 'connected' ? '#28a745' : 'transparent',
                  color: connectionStatus === 'connected' ? 'white' : '#721c24',
                  border: connectionStatus === 'connected' ? 'none' : '1px solid #721c24',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {connectionStatus === 'connected' ? 'Close' : 'Dismiss'}
              </button>
            </div>
          </div>
          
          {connectionStatus === 'error' && (
            <div style={{ 
              marginTop: '15px',
              padding: '10px',
              fontSize: '13px',
              backgroundColor: 'rgba(255,255,255,0.4)',
              borderRadius: '4px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>Troubleshooting tips:</strong>
              <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                <li>Make sure the backend server (Node.js) is running</li>
                <li>Check if the backend is using a different port (default is 5000)</li>
                <li>Verify that CORS is properly configured on the server</li>
                <li>Check for any firewall or network restrictions</li>
              </ul>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
                Developer note: The app is trying to connect to {window.location.protocol}//{window.location.hostname}:{backendPort}/api
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatusModal;