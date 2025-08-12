import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../utils/api';

const ConnectionStatusModal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [backendPort, setBackendPort] = useState('5001');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Define common server ports for Node.js apps
  const commonPorts = [5001, 3000, 8080, 4000, 9000];
  // Check the connection status only when component mounts
  useEffect(() => {
    // Initial connection check - only run once on component mount
    checkConnection();
    
    // No background interval checks anymore - only check on first load
    
    // Set up global error handler for network errors
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch(...args);
        
        // If we get a successful response from any endpoint
        if (response.ok) {
          // Check if this is a request to the health endpoint
          const url = args[0].toString();
          const isHealthCheck = url.includes('/health');
          
          // For successful health checks, always update status
          // For other requests, update if currently in error state
          if (isHealthCheck || connectionStatus === 'error') {
            setConnectionStatus('connected');
            setLastUpdated(new Date());
            setMessage('Connection restored successfully.');
              // Close modal immediately after successful connection
            if (isVisible) {
              setIsVisible(false);
            }
          }
        }
        
        return response;
      } catch (error) {
        // If the error is a network error, show the connection status modal
        if (error.message && (error.message.includes('Failed to fetch') || 
                            error.message.includes('Network Error'))) {
        
          handleConnectionError();
        }
        throw error;
      }
    };
      // Clean up
    return () => {
      window.fetch = originalFetch;
      // No interval to clear anymore
    };
    
    // We intentionally don't include dependencies like isVisible and connectionStatus
    // here because we don't want to recreate the fetch override when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
    // No longer periodically check connection - only retry on manual button press
  useEffect(() => {
    // Reset retry count when modal is hidden
    if (!isVisible) {
      setAutoRetryCount(0);
    }
  }, [isVisible]);
    // Handle connection error
  const handleConnectionError = () => {
    // Only update if we're not already showing an error
    // This prevents repeatedly setting the same error state
    if (connectionStatus !== 'error') { 
      setIsVisible(true);
      setConnectionStatus('error');
      setLastUpdated(new Date());
      setMessage('Connection to the server failed. The server might be down or incorrectly configured.');
      
      // No automatic reconnection attempt - wait for manual retry
    }
  };
    // Check connection to backend
  const checkConnection = async (silent = false) => {
    // Only update UI if not in silent mode
    if (!silent) {
      setConnectionStatus('checking');
      setLastUpdated(new Date());
    }
    
    try {
      // Direct fetch instead of using api client to bypass any interceptors
      // that might mask the true connection status
      const directResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:5001/api/public/health`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      // Check direct fetch response
      if (directResponse.ok) {
        const directResult = await directResponse.json();
        
        if (directResult && directResult.status === 'ok') {
          
          // Now try the api client version
          const apiResult = await api.public.health();
          
          // Update state to connected
          setConnectionStatus('connected');
          setLastUpdated(new Date());
          
          // Store successful port in localStorage
          const port = '5001'; // Use 5001 as the default port
          localStorage.setItem('apiPort', port);
          setBackendPort(port);
          
          // Update message to confirm connection
          setMessage('Successfully connected to the backend server.');
            // Close modal immediately after successful connection
          if (connectionStatus === 'error' || (connectionStatus === 'checking' && isVisible)) {
            // Set to false immediately without delay
            setIsVisible(false);
          }
          
          return true;
        }
      }
      
      // Fall back to api client if direct fetch failed
      const result = await api.public.health();
      if (result && result.status === 'ok') {
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        
        // Store successful port in localStorage
        const port = '5001'; // Use 5001 as the default port
        localStorage.setItem('apiPort', port);
        setBackendPort(port);
        
        // Update message to confirm connection
        setMessage('Successfully connected to the backend server.');
          // Update visibility - close modal immediately after success
        if (connectionStatus === 'error' || (connectionStatus === 'checking' && isVisible)) {
          // Close modal immediately on success
          setIsVisible(false);
        }
        return true;
      } else {
        throw new Error('Server not healthy');
      }
    } catch (error) {
      
      // Only update state if this isn't a silent check or if we're not already in error state
      if (connectionStatus !== 'error' || !silent) {
        setConnectionStatus('error');
        setLastUpdated(new Date());
      }
      
      // Only show the modal if not in silent mode
      if (!silent) {
        setIsVisible(true);
      }
      
      // Try to extract port from URL
      try {
        const url = window.location.href;
        const urlObj = new URL(url);
        setBackendPort(urlObj.port || '5001');
      } catch (e) {
        setBackendPort('5001');
      }
      
      return false;
    }
  };
  
  // Try a specific backend port
  const tryPort = async (port) => {
    setConnectionStatus('checking');
    setLastUpdated(new Date());
    setMessage(`Trying to connect on port ${port}...`);
    try {
      const response = await fetch(`http://${window.location.hostname}:${port}/api/public/health`, {
        method: 'GET', // Using GET to ensure we get response data
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      // Process the response to check if it's valid
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        // Continue with checking just the response.ok value
      }
      
      if (response.ok && (!responseData || responseData.status === 'ok')) {
        
        // Update the UI to show connected state
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        setMessage(`Connection successful on port ${port}!`);
        
        // Store the successful port
        localStorage.setItem('apiPort', port.toString());
        setBackendPort(port.toString());
          // Reload immediately
        window.location.reload();
        return true;
      } else {
        setConnectionStatus('error');
        setLastUpdated(new Date());
      }
    } catch (e) {
      setConnectionStatus('error');
      setLastUpdated(new Date());
    }
    return false;
  };
  
  // Try all common ports
  const tryAllPorts = async () => {
    setMessage('Trying to find the server on different ports...');
    setLastUpdated(new Date());
    let found = false;
    
    for (const port of commonPorts) {
      setMessage(`Checking port ${port}...`);
      found = await tryPort(port);
      if (found) break;
    }
    
    if (!found) {
      setMessage('Could not find the server on any common port. Make sure the backend server is running.');
      setLastUpdated(new Date());
    }
  };
  // Force the modal to reflect the current connection status accurately
  useEffect(() => {
    // If status changes to connected, immediately hide the modal
    if (connectionStatus === 'connected' && isVisible) {
      // Close immediately
      setIsVisible(false);
    }
  }, [connectionStatus, isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="oe-glass-surface oe-backdrop oe-glass-border oe-glass-shadow oe-promote"
          key={`status-${connectionStatus}-${lastUpdated.getTime()}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: connectionStatus === 'connected' ? '#d4edda' : 
                           connectionStatus === 'checking' ? '#fff3cd' : '#f8d7da',
            borderBottom: `1px solid ${connectionStatus === 'connected' ? '#c3e6cb' : 
                         connectionStatus === 'checking' ? '#ffeeba' : '#f5c6cb'}`,
            color: connectionStatus === 'connected' ? '#155724' : 
                  connectionStatus === 'checking' ? '#856404' : '#721c24',
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
              
              {/* Show the timestamp of the last status change */}
              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.7 }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
              
              {autoRetryCount > 0 && connectionStatus !== 'connected' && (
                <p style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                  Auto-retry attempts: {autoRetryCount}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {connectionStatus !== 'connected' && (
                <>                  <button
                    onClick={() => {
                      // Force a full refresh check
                      setConnectionStatus('checking');
                      setAutoRetryCount(prev => prev + 1);
                      checkConnection();
                    }}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Check Connection
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
                <li>Check if the backend is using a different port (default is 5001)</li>
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
