import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../utils/api';

const ConnectionStatusModal = () => {
  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [backendPort, setBackendPort] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [failureStreak, setFailureStreak] = useState(0);

  // Refs and env/config
  const showTimerRef = useRef(null);
  const destroyedRef = useRef(false);
  const IS_PROD = import.meta.env.PROD;
  const SHOW_DELAY_MS = Number(import.meta.env.VITE_CONNECTION_MODAL_DELAY_MS) || 3000;
  const FAILURE_THRESHOLD = Number(import.meta.env.VITE_CONNECTION_MODAL_FAILURES) || 2;
  
  // Resolve API base URL consistently with apiClient
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '');
  const normalizedBase = apiBaseUrl.replace(/\/$/, '');
  const apiBaseHasSuffix = /\/api$/i.test(normalizedBase);
  const apiRoot = apiBaseHasSuffix ? normalizedBase : `${normalizedBase}/api`;
  const healthUrl = `${apiRoot}/public/health`;
  const commonPorts = [5001, 5000, 3000, 8080, 4000, 9000]; // dev helper only

  // Helpers
  const clearScheduledShow = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setFailureStreak(0);
  };

  const scheduleShowOnFailure = (msg) => {
    setFailureStreak((prev) => {
      const next = prev + 1;
      setConnectionStatus('error');
      setLastUpdated(new Date());
      if (msg) setMessage(msg);
      if (next >= FAILURE_THRESHOLD && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          if (destroyedRef.current) return;
          if (connectionStatus === 'connected') return;
          setIsVisible(true);
        }, SHOW_DELAY_MS);
      }
      return next;
    });
  };

  // Network intercept (only our API)
  useEffect(() => {
    // Initial silent check
    checkConnection(true);

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const response = await originalFetch(...args);
        if (response?.ok) {
          const url = (args?.[0] ?? '').toString();
          const isOurApi = url.startsWith(apiBaseUrl);
          const isHealth = isOurApi && url.includes('/api/public/health');
          if (isOurApi && (isHealth || connectionStatus === 'error')) {
            setConnectionStatus('connected');
            setLastUpdated(new Date());
            setMessage('Connection restored successfully.');
            clearScheduledShow();
            if (isVisible) setIsVisible(false);
          }
        }
        return response;
      } catch (error) {
        const url = (args?.[0] ?? '').toString();
        const isOurApi = url.startsWith(apiBaseUrl);
        if (isOurApi && error?.message && (error.message.includes('Failed to fetch') || error.message.includes('Network Error'))) {
          scheduleShowOnFailure('Network error while contacting server. Will retry…');
        }
        throw error;
      }
    };

    return () => {
      destroyedRef.current = true;
      window.fetch = originalFetch;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset retry display when modal hidden
  useEffect(() => {
    if (!isVisible) setAutoRetryCount(0);
  }, [isVisible]);

  // Manual/silent health check
  const checkConnection = async (silent = false) => {
    if (!silent) {
      setConnectionStatus('checking');
      setLastUpdated(new Date());
    }
    try {
      const directResponse = await fetch(healthUrl, { method: 'GET', cache: 'no-cache', headers: { Accept: 'application/json' } });
      if (directResponse.ok) {
        const directResult = await directResponse.json();
        if (directResult?.status === 'ok') {
          try { await api.public.health(); } catch (_) { /* ignore axios layer variations */ }
          setConnectionStatus('connected');
          setLastUpdated(new Date());
          try {
            const u = new URL(apiBaseUrl);
            setBackendPort(u.port || (u.protocol === 'https:' ? '443' : '80'));
          } catch {
            setBackendPort('');
          }
          setMessage('Successfully connected to the backend server.');
          clearScheduledShow();
          if (isVisible) setIsVisible(false);
          return true;
        }
      }
      // Fallback via axios client
      const result = await api.public.health();
      if (result?.status === 'ok') {
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        try {
          const u = new URL(apiBaseUrl);
          setBackendPort(u.port || (u.protocol === 'https:' ? '443' : '80'));
        } catch {
          setBackendPort('');
        }
        setMessage('Successfully connected to the backend server.');
        clearScheduledShow();
        if (isVisible) setIsVisible(false);
        return true;
      }
      throw new Error('Server not healthy');
    } catch (_) {
      scheduleShowOnFailure('Unable to reach the server. We will keep trying in the background.');
      try {
        const u = new URL(apiBaseUrl);
        setBackendPort(u.port || (u.protocol === 'https:' ? '443' : '80'));
      } catch {
        setBackendPort('');
      }
      return false;
    }
  };

  // Dev-only helpers
  const tryPort = async (port) => {
    setConnectionStatus('checking');
    setLastUpdated(new Date());
    setMessage(`Trying to connect on port ${port}...`);
    try {
      const base = `${window.location.protocol}//${window.location.hostname}:${port}`;
      const response = await fetch(`${base}/api/public/health`, { method: 'GET', cache: 'no-cache', headers: { Accept: 'application/json' } });
      let responseData = null;
      try { responseData = await response.json(); } catch {}
      if (response.ok && (!responseData || responseData.status === 'ok')) {
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        setMessage(`Connection successful on port ${port}!`);
        localStorage.setItem('apiPort', String(port));
        setBackendPort(String(port));
        clearScheduledShow();
        if (!IS_PROD) {
          window.location.reload();
        } else {
          setIsVisible(false);
        }
        return true;
      }
      setConnectionStatus('error');
      setLastUpdated(new Date());
    } catch {
      setConnectionStatus('error');
      setLastUpdated(new Date());
    }
    return false;
  };

  const tryAllPorts = async () => {
    setMessage('Trying to find the server on different ports...');
    setLastUpdated(new Date());
    for (const port of commonPorts) {
      setMessage(`Checking port ${port}...`);
      // eslint-disable-next-line no-await-in-loop
      const found = await tryPort(port);
      if (found) return;
    }
    setMessage('Could not find the server on any common port. Make sure the backend server is running.');
    setLastUpdated(new Date());
  };

  // Auto-hide on recovery
  useEffect(() => {
    if (connectionStatus === 'connected' && isVisible) {
      setIsVisible(false);
      clearScheduledShow();
    }
  }, [connectionStatus, isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="oe-glass-surface oe-backdrop oe-glass-border oe-glass-shadow oe-promote oe-conn-modal"
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
            backgroundColor:
              connectionStatus === 'connected' ? '#d4edda' : connectionStatus === 'checking' ? '#fff3cd' : '#f8d7da',
            borderBottom: `1px solid ${
              connectionStatus === 'connected' ? '#c3e6cb' : connectionStatus === 'checking' ? '#ffeeba' : '#f5c6cb'
            }`,
            color:
              connectionStatus === 'connected' ? '#155724' : connectionStatus === 'checking' ? '#856404' : '#721c24',
            padding: '15px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          <div className="oe-conn-modal__inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div className="oe-conn-modal__content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor:
                      connectionStatus === 'checking' ? '#ffc107' : connectionStatus === 'connected' ? '#28a745' : '#dc3545',
                    animation: connectionStatus === 'checking' ? 'pulse 1.5s infinite' : 'none'
                  }}
                />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  {connectionStatus === 'checking'
                    ? 'Checking connection...'
                    : connectionStatus === 'connected'
                    ? 'Connected to server!'
                    : 'Having trouble reaching the server'}
                </h4>
              </div>

              <p style={{ margin: 0, fontSize: '14px' }}>
                {message ||
                  (connectionStatus === 'checking'
                    ? 'Testing connection to the backend server...'
                    : connectionStatus === 'connected'
                    ? 'Successfully connected to the backend server.'
                    : `Unable to connect to ${apiBaseUrl}.`)}
              </p>

              <p style={{ margin: '5px 0 0', fontSize: '12px', opacity: 0.7 }}>Last updated: {lastUpdated.toLocaleTimeString()}</p>

              {autoRetryCount > 0 && connectionStatus !== 'connected' && (
                <p style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>Auto-retry attempts: {autoRetryCount}</p>
              )}
            </div>

            <div className="oe-conn-modal__actions" style={{ display: 'flex', gap: '10px' }}>
              {connectionStatus !== 'connected' && (
                <>
                  <button
                    onClick={() => {
                      setConnectionStatus('checking');
                      setAutoRetryCount((prev) => prev + 1);
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

                  {!IS_PROD && (
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
                  )}
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
            <div
              style={{
                marginTop: '15px',
                padding: '10px',
                fontSize: '13px',
                backgroundColor: 'rgba(255,255,255,0.4)',
                borderRadius: '4px',
                border: '1px solid #f5c6cb'
              }}
            >
              <strong>Troubleshooting tips:</strong>
              <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                <li>Make sure the backend server is running and reachable</li>
                {!IS_PROD && <li>Check if the backend is using a different port (commonly 5001/5000)</li>}
                <li>Verify that CORS is properly configured on the server</li>
                <li>Check for any firewall or network restrictions</li>
              </ul>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
                Developer note: The app is trying to connect to {apiRoot}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatusModal;
