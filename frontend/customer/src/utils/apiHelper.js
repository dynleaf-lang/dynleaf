// apiHelper.js - Helper functions for API interactions

/**
 * Ensures that the API path is correctly formatted
 * @param {string} path - The API path to format
 * @returns {string} - The formatted API path
 */
export const formatApiPath = (path) => {
  // Remove leading slash if present as the baseURL already has it
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  return path;
};

/**
 * Creates a debug message for API requests
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @param {string} path - The API path
 * @param {Object} params - Query parameters
 * @returns {string} - A formatted debug message
 */
export const createApiDebugMessage = (method, path, params = null) => {
  let message = `${method} ${path}`;
  
  if (params) {
    message += ` with params: ${JSON.stringify(params)}`;
  }
  
  return message;
};

/**
 * Adds proper error handling to API responses
 * @param {Promise} promise - The promise returned by an API call
 * @param {string} errorContext - Context for the error message
 * @returns {Promise} - A promise with enhanced error handling
 */
export const withErrorHandling = async (promise, errorContext) => {
  try {
    return await promise;
  } catch (error) {
    console.error(`${errorContext}:`, error);
    
    // Enhance error with context
    const enhancedError = new Error(error.message || 'Unknown API error');
    enhancedError.originalError = error;
    enhancedError.context = errorContext;
    
    throw enhancedError;
  }
};

export default {
  formatApiPath,
  createApiDebugMessage,
  withErrorHandling
};
