// Global error logger for tracking console issues
export function setupGlobalErrorHandlers() {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Track if logging works
  console.log = function(...args) {
    try {
      originalConsoleLog('%c INTERCEPTED LOG', 'background: #4CAF50; color: white;', ...args);
    } catch (err) {
      originalConsoleLog('Error in intercepted log:', err);
    }
  };

  console.error = function(...args) {
    try {
      originalConsoleError('%c INTERCEPTED ERROR', 'background: #F44336; color: white;', ...args);
    } catch (err) {
      originalConsoleError('Error in intercepted error:', err);
    }
  };

  console.warn = function(...args) {
    try {
      originalConsoleWarn('%c INTERCEPTED WARNING', 'background: #FF9800; color: white;', ...args);
    } catch (err) {
      originalConsoleWarn('Error in intercepted warning:', err);
    }
  };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    originalConsoleError('UNHANDLED PROMISE REJECTION:', event.reason);
  });

  // Catch all JS errors
  window.addEventListener('error', (event) => {
    originalConsoleError('GLOBAL ERROR:', event.error);
  });
}
