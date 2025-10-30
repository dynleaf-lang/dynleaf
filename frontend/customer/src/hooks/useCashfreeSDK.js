import { useState, useEffect, useRef } from 'react';
import { PaymentAnalytics } from '../services/PaymentAnalytics';

/**
 * Custom hook for managing Cashfree SDK loading and initialization
 * Provides SDK availability, error handling, and retry functionality
 */
export const useCashfreeSDK = () => {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const loadTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const analytics = useRef(new PaymentAnalytics());
  const loadStartTime = useRef(null);

  const loadSDK = () => {
    return new Promise((resolve, reject) => { 
      loadStartTime.current = Date.now();
      
      // Check if already loaded
      if (window.Cashfree) { 
        const loadTime = Date.now() - loadStartTime.current;
        analytics.current.trackSDKLoaded(loadTime);
        setSdkLoaded(true);
        setSdkError(null);
        setIsLoading(false);
        resolve(window.Cashfree);
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="cashfree.com"]');
      if (existingScript) { 
        
        const checkSDK = () => {
          if (window.Cashfree) {
            console.log('[CASHFREE SDK] SDK available after wait');
            const loadTime = Date.now() - loadStartTime.current;
            analytics.current.trackSDKLoaded(loadTime);
            setSdkLoaded(true);
            setSdkError(null);
            setIsLoading(false);
            resolve(window.Cashfree);
          } else {
            setTimeout(checkSDK, 100);
          }
        };
        
        // Set timeout for existing script
        loadTimeoutRef.current = setTimeout(() => {
          const error = 'SDK load timeout - script exists but SDK not available';
          analytics.current.trackSDKError(error, retryCount);
          setSdkError(error);
          setIsLoading(false);
          reject(new Error('SDK load timeout'));
        }, 15000); // 15 seconds timeout
        
        checkSDK();
        return;
      }

      // Create new script element
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v2/cashfree.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        console.log('[CASHFREE SDK] Script loaded successfully');
        
        // Clear any existing timeout
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        
        // Wait for SDK to be available
        const checkSDK = () => {
          if (window.Cashfree) {
            console.log('[CASHFREE SDK] SDK available after script load');
            const loadTime = Date.now() - loadStartTime.current;
            analytics.current.trackSDKLoaded(loadTime);
            setSdkLoaded(true);
            setSdkError(null);
            setIsLoading(false);
            resolve(window.Cashfree);
          } else {
            setTimeout(checkSDK, 100);
          }
        };
        
        checkSDK();
      };

      script.onerror = (error) => {
        console.error('[CASHFREE SDK] Failed to load script:', error);
        const errorMessage = 'Failed to load payment SDK from CDN';
        analytics.current.trackSDKError(errorMessage, retryCount);
        setSdkError(errorMessage);
        setIsLoading(false);
        reject(new Error('SDK script load failed'));
      };

      // Set timeout for script loading
      loadTimeoutRef.current = setTimeout(() => {
        if (!window.Cashfree) {
          console.error('[CASHFREE SDK] Load timeout reached');
          const errorMessage = 'Payment SDK load timeout - check network connection';
          analytics.current.trackSDKError(errorMessage, retryCount);
          setSdkError(errorMessage);
          setIsLoading(false);
          reject(new Error('SDK load timeout'));
        }
      }, 15000); // 15 seconds timeout

      // Add to document
      document.head.appendChild(script);
      console.log('[CASHFREE SDK] Script tag added to document');
    });
  };

  const retryLoad = () => {
    if (retryCount < maxRetries) {
      console.log(`[CASHFREE SDK] Retrying load (attempt ${retryCount + 1}/${maxRetries})`);
      setRetryCount(prev => prev + 1);
      setSdkError(null);
      setIsLoading(true);
      
      // Track retry attempt
      analytics.current.trackRetryAttempt(retryCount + 1, 'SDK load failed', 'manual');
      
      // Clear any existing timeouts
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Remove existing script if any
      const existingScript = document.querySelector('script[src*="cashfree.com"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Retry after a short delay
      retryTimeoutRef.current = setTimeout(() => {
        loadSDK().catch(error => {
          console.error('[CASHFREE SDK] Retry failed:', error);
        });
      }, 1000 * retryCount); // Exponential backoff: 1s, 2s, 3s
    }
  };

  const initializeSDK = (mode = 'sandbox') => {
    if (!window.Cashfree) {
      throw new Error('Cashfree SDK not loaded');
    }

    try {
      console.log('[CASHFREE SDK] Initializing with mode:', mode);
      
      // Try different initialization methods
      let cashfree;
      
      try {
        // Method 1: Constructor with new keyword
        cashfree = new window.Cashfree({ mode });
        console.log('[CASHFREE SDK] Initialized with constructor');
      } catch (constructorError) {
        console.log('[CASHFREE SDK] Constructor failed, trying direct call');
        
        try {
          // Method 2: Direct function call
          cashfree = window.Cashfree({ mode });
          console.log('[CASHFREE SDK] Initialized with direct call');
        } catch (directError) {
          console.error('[CASHFREE SDK] Both initialization methods failed');
          throw new Error('Failed to initialize Cashfree SDK');
        }
      }
      
      return cashfree;
    } catch (error) {
      console.error('[CASHFREE SDK] Initialization error:', error);
      throw error;
    }
  };

  // Load SDK on mount
  useEffect(() => {
    loadSDK().catch(error => {
      console.error('[CASHFREE SDK] Initial load failed:', error);
    });

    // Cleanup timeouts on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  return {
    sdkLoaded,
    sdkError,
    isLoading,
    retryLoad,
    canRetry: retryCount < maxRetries,
    retryCount,
    maxRetries,
    initializeSDK,
    getAnalytics: () => analytics.current
  };
};