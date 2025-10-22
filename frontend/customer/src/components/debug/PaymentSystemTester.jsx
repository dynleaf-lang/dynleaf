import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCashfreeSDK } from '../../hooks/useCashfreeSDK';
import { PaymentService } from '../../services/PaymentService';
import { theme } from '../../data/theme';
import api from '../../utils/apiClient';

/**
 * Payment System Testing Component
 * Used for debugging and validating payment integration
 */
export const PaymentSystemTester = ({ onClose }) => {
  const {
    sdkLoaded,
    sdkError,
    isLoading: sdkLoading,
    retryLoad,
    canRetry,
    initializeSDK,
    getAnalytics
  } = useCashfreeSDK();

  const [paymentService] = useState(() => new PaymentService());
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testConfig, setTestConfig] = useState({
    amount: 10, // Minimum test amount
    customer: {
      name: 'Test User',
      email: 'test@dynleaf.com',
      phone: '9876543210'
    }
  });

  const addTestResult = (test, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      status, // 'pass' | 'fail' | 'info'
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Backend Connectivity
  const testBackendConnectivity = async () => {
    try {
      addTestResult('Backend Connectivity', 'info', 'Testing API connection...');
      
      const response = await fetch('/api/public/payments/cashfree/config-check');
      const data = await response.json();
      
      if (response.ok) {
        addTestResult('Backend Connectivity', 'pass', 'Backend API is accessible', data);
      } else {
        addTestResult('Backend Connectivity', 'fail', `API returned ${response.status}: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      addTestResult('Backend Connectivity', 'fail', `Network error: ${error.message}`);
    }
  };

  // Test 2: Cashfree Credentials
  const testCashfreeCredentials = async () => {
    try {
      addTestResult('Cashfree Credentials', 'info', 'Validating Cashfree credentials...');
      
      const response = await api.public.payments.cashfree.getOrder('TEST-VALIDATION-123');
      addTestResult('Cashfree Credentials', 'pass', 'Credentials are valid (or test order exists)');
    } catch (error) {
      if (error.response?.status === 404) {
        addTestResult('Cashfree Credentials', 'pass', 'Credentials are valid (test order not found as expected)');
      } else if (error.response?.status === 401) {
        addTestResult('Cashfree Credentials', 'fail', 'Cashfree authentication failed - check credentials');
      } else {
        addTestResult('Cashfree Credentials', 'fail', `Unexpected error: ${error.message}`);
      }
    }
  };

  // Test 3: SDK Loading
  const testSDKLoading = async () => {
    addTestResult('SDK Loading', 'info', 'Checking Cashfree SDK status...');
    
    if (sdkLoaded) {
      addTestResult('SDK Loading', 'pass', 'Cashfree SDK is loaded and ready');
    } else if (sdkError) {
      addTestResult('SDK Loading', 'fail', `SDK failed to load: ${sdkError}`);
    } else if (sdkLoading) {
      addTestResult('SDK Loading', 'info', 'SDK is currently loading...');
    }
  };

  // Test 4: Payment Session Creation
  const testPaymentSessionCreation = async () => {
    try {
      addTestResult('Payment Session', 'info', 'Creating test payment session...');
      
      const sessionData = await api.public.payments.cashfree.createOrder({
        amount: testConfig.amount,
        currency: 'INR',
        customer: {
          ...testConfig.customer,
          id: `test_${Date.now()}`
        },
        orderMeta: {
          payment_methods: 'upi',
          return_url: window.location.origin + '/test-return'
        }
      });

      if (sessionData.success && sessionData.data?.payment_session_id) {
        addTestResult('Payment Session', 'pass', 'Payment session created successfully', {
          sessionId: sessionData.data.payment_session_id.substring(0, 20) + '...',
          orderId: sessionData.data.order_id,
          amount: testConfig.amount
        });
        return sessionData.data;
      } else {
        addTestResult('Payment Session', 'fail', 'Failed to create payment session', sessionData);
      }
    } catch (error) {
      addTestResult('Payment Session', 'fail', `Session creation failed: ${error.message}`);
    }
    return null;
  };

  // Test 5: SDK Initialization
  const testSDKInitialization = async () => {
    try {
      addTestResult('SDK Initialization', 'info', 'Testing SDK initialization...');
      
      if (!sdkLoaded) {
        addTestResult('SDK Initialization', 'fail', 'SDK not loaded - cannot test initialization');
        return;
      }

      const mode = import.meta.env.VITE_CASHFREE_ENV === 'prod' ? 'production' : 'sandbox';
      const cashfree = initializeSDK(mode);
      
      if (cashfree) {
        addTestResult('SDK Initialization', 'pass', `SDK initialized successfully in ${mode} mode`);
        return cashfree;
      } else {
        addTestResult('SDK Initialization', 'fail', 'SDK initialization returned null/undefined');
      }
    } catch (error) {
      addTestResult('SDK Initialization', 'fail', `SDK initialization failed: ${error.message}`);
    }
    return null;
  };

  // Test 6: Payment Service Configuration
  const testPaymentServiceConfig = () => {
    addTestResult('Payment Service', 'info', 'Checking payment service configuration...');
    
    const config = paymentService.getPaymentConfig();
    addTestResult('Payment Service', 'pass', 'Payment service configured', config);
  };

  // Test 7: Analytics System
  const testAnalyticsSystem = () => {
    addTestResult('Analytics System', 'info', 'Testing analytics tracking...');
    
    try {
      const analytics = paymentService.getAnalytics();
      analytics.trackEvent('test_event', { test: true });
      
      const summary = analytics.getSummary();
      addTestResult('Analytics System', 'pass', 'Analytics system working', summary);
    } catch (error) {
      addTestResult('Analytics System', 'fail', `Analytics error: ${error.message}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    clearResults();

    try {
      addTestResult('Test Suite', 'info', 'Starting comprehensive payment system tests...');
      
      // Run tests in sequence
      await testBackendConnectivity();
      await testCashfreeCredentials();
      await testSDKLoading();
      await testSDKInitialization();
      await testPaymentServiceConfig();
      await testAnalyticsSystem();
      await testPaymentSessionCreation();

      addTestResult('Test Suite', 'info', 'All tests completed. Check individual results above.');
    } catch (error) {
      addTestResult('Test Suite', 'fail', `Test suite error: ${error.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Export test results
  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      environment: {
        cashfreeEnv: import.meta.env.VITE_CASHFREE_ENV,
        apiUrl: import.meta.env.VITE_API_URL,
        nodeEnv: import.meta.env.NODE_ENV
      },
      sdkStatus: {
        loaded: sdkLoaded,
        error: sdkError,
        loading: sdkLoading
      },
      testResults,
      analytics: paymentService.exportAnalytics()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-system-test-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return theme.colors.success;
      case 'fail': return theme.colors.danger;
      case 'info': return theme.colors.primary;
      default: return theme.colors.text.secondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: theme.spacing.md
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: 'white',
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xl,
          maxWidth: '800px',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg
        }}>
          <h2 style={{
            margin: 0,
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.fontWeights.bold
          }}>
            Payment System Tester
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: theme.typography.sizes.xl,
              cursor: 'pointer',
              color: theme.colors.text.secondary
            }}
          >
            ×
          </button>
        </div>

        {/* Test Configuration */}
        <div style={{
          marginBottom: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md
        }}>
          <h4 style={{ margin: `0 0 ${theme.spacing.sm} 0` }}>Test Configuration</h4>
          <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <label>
              Amount: 
              <input
                type="number"
                value={testConfig.amount}
                onChange={(e) => setTestConfig(prev => ({ ...prev, amount: Number(e.target.value) }))}
                style={{
                  marginLeft: theme.spacing.sm,
                  padding: theme.spacing.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.sm,
                  width: '80px'
                }}
              />
            </label>
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          flexWrap: 'wrap'
        }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runAllTests}
            disabled={isRunningTests}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              cursor: isRunningTests ? 'not-allowed' : 'pointer',
              opacity: isRunningTests ? 0.6 : 1
            }}
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={clearResults}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.text.secondary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer'
            }}
          >
            Clear Results
          </motion.button>

          {testResults.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={exportResults}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.success,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer'
              }}
            >
              Export Results
            </motion.button>
          )}
        </div>

        {/* Test Results */}
        <div style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.md,
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {testResults.length === 0 ? (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              color: theme.colors.text.secondary
            }}>
              No test results yet. Click "Run All Tests" to start.
            </div>
          ) : (
            testResults.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  padding: theme.spacing.md,
                  borderBottom: index < testResults.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: theme.spacing.md
                }}
              >
                <span style={{ fontSize: theme.typography.sizes.lg }}>
                  {getStatusIcon(result.status)}
                </span>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: getStatusColor(result.status),
                    marginBottom: theme.spacing.xs
                  }}>
                    {result.test}
                  </div>
                  
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    marginBottom: result.data ? theme.spacing.xs : 0
                  }}>
                    {result.message}
                  </div>
                  
                  {result.data && (
                    <details style={{
                      fontSize: theme.typography.sizes.xs,
                      color: theme.colors.text.tertiary
                    }}>
                      <summary style={{ cursor: 'pointer' }}>View Data</summary>
                      <pre style={{
                        marginTop: theme.spacing.xs,
                        padding: theme.spacing.sm,
                        backgroundColor: theme.colors.background,
                        borderRadius: theme.borderRadius.sm,
                        overflow: 'auto',
                        fontSize: theme.typography.sizes.xs
                      }}>
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                
                <div style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.tertiary
                }}>
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* System Status */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.sizes.sm
        }}>
          <strong>Current Status:</strong> {' '}
          SDK: {sdkLoaded ? '✅ Loaded' : sdkError ? '❌ Error' : '⏳ Loading'} | {' '}
          Environment: {import.meta.env.VITE_CASHFREE_ENV || 'sandbox'} | {' '}
          API: {import.meta.env.VITE_API_URL || 'default'}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentSystemTester;