import { api } from './apiClient';

/**
 * API endpoint test configuration
 * Provides utilities for testing and comparing API endpoints
 */

/**
 * Test if an API endpoint is reachable
 * @param {string} url - The URL to test
 * @param {number} timeout - The timeout in milliseconds
 * @returns {Promise<Object>} - Test results
 */
export const testApiEndpoint = async (url, timeout = 5000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = performance.now();
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    let data;
    let isJson = false;
    
    // Try to parse as JSON
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        isJson = true;
      } else {
        data = await response.text();
      }
    } catch (e) {
      data = await response.text();
    }
    
    return {
      url,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      success: response.ok,
      isJson,
      data,
      headers: Object.fromEntries([...response.headers])
    };
  } catch (error) {
    // Handle network errors, timeout, etc.
    return {
      url,
      success: false,
      error: error.name === 'AbortError' ? 'Request timed out' : error.message,
      status: 0
    };
  }
};

/**
 * Update the API client base URL for testing different environments
 * @param {string} baseUrl - New base URL to use
 */
export const updateApiBaseUrl = (baseUrl) => {
  // This is not a permanent change - it's only for testing
  if (!baseUrl) {
    console.error('Invalid base URL provided');
    return false;
  }
  
  try {
    // Test format
    new URL(baseUrl);
    
    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Update axios baseURL (this is a test-only feature)
    api._updateBaseUrl(baseUrl);
    
    console.log(`API base URL updated to: ${baseUrl}`);
    return true;
  } catch (error) {
    console.error('Invalid base URL format:', error);
    return false;
  }
};

/**
 * Compare responses from two different API endpoints
 * @param {string} endpoint - The API endpoint to test (e.g., '/restaurants')
 * @param {string} primaryUrl - Primary API base URL
 * @param {string} secondaryUrl - Secondary API base URL to compare against
 * @returns {Promise<Object>} - Comparison results
 */
export const compareApiEndpoints = async (endpoint, primaryUrl, secondaryUrl) => {
  // Ensure endpoint starts with a slash
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  try {
    // Test both endpoints in parallel
    const [primaryResult, secondaryResult] = await Promise.all([
      testApiEndpoint(`${primaryUrl}${endpoint}`),
      testApiEndpoint(`${secondaryUrl}${endpoint}`)
    ]);
    
    // Compare results
    const fieldsMatch = compareResponseFields(primaryResult.data, secondaryResult.data);
    
    return {
      endpoint,
      primaryUrl,
      secondaryUrl,
      primaryResult,
      secondaryResult,
      comparison: {
        statusMatch: primaryResult.status === secondaryResult.status,
        fieldsMatch,
        primaryFields: getTopLevelFields(primaryResult.data),
        secondaryFields: getTopLevelFields(secondaryResult.data),
        responseTimeDiff: Math.abs(primaryResult.responseTime - secondaryResult.responseTime)
      }
    };
  } catch (error) {
    return {
      endpoint,
      error: error.message,
      success: false
    };
  }
};

/**
 * Helper function to compare JSON response fields
 * @param {Object} data1 - First response data
 * @param {Object} data2 - Second response data
 * @returns {boolean} - Whether the field structures match
 */
function compareResponseFields(data1, data2) {
  // If either is not an object, compare directly
  if (typeof data1 !== 'object' || typeof data2 !== 'object' || 
      data1 === null || data2 === null) {
    return data1 === data2;
  }
  
  // For arrays, check length and call recursively for each item
  if (Array.isArray(data1) && Array.isArray(data2)) {
    if (data1.length === 0 && data2.length === 0) return true;
    if (data1.length === 0 || data2.length === 0) return false;
    
    // Just check the first item's structure for arrays
    return compareResponseFields(data1[0], data2[0]);
  }
  
  // For objects, compare keys
  const keys1 = Object.keys(data1);
  const keys2 = Object.keys(data2);
  
  // Check if same keys exist
  if (keys1.length !== keys2.length) return false;
  
  // Check key by key (only structure, not values)
  return keys1.every(key => keys2.includes(key));
}

/**
 * Get top-level fields from an object or array
 * @param {Object|Array} data - The data to analyze
 * @returns {Array} - List of top-level fields
 */
function getTopLevelFields(data) {
  if (!data || typeof data !== 'object') return [];
  
  if (Array.isArray(data)) {
    if (data.length === 0) return ['[] (empty array)'];
    if (typeof data[0] === 'object' && data[0] !== null) {
      return Object.keys(data[0]).map(key => `[].${key}`);
    }
    return ['[] (array of primitives)'];
  }
  
  return Object.keys(data);
}
