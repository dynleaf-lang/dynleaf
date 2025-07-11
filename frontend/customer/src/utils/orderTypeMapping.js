/**
 * Utility for mapping order types between frontend UI and backend API
 */

// Frontend UI uses camelCase, backend expects kebab-case
export const ORDER_TYPE_MAPPING = {
  // Frontend -> Backend
  'dineIn': 'dine-in',
  'takeaway': 'takeaway',
  'delivery': 'delivery'
};

// Backend -> Frontend (for reverse mapping if needed)
export const REVERSE_ORDER_TYPE_MAPPING = {
  'dine-in': 'dineIn',
  'takeaway': 'takeaway',
  'delivery': 'delivery'
};

/**
 * Convert frontend orderType to backend format
 * @param {string} frontendOrderType - The order type from frontend UI
 * @returns {string} The order type in backend format
 */
export const mapOrderTypeToBackend = (frontendOrderType) => {
  if (!frontendOrderType) {
    console.warn('[ORDER TYPE MAPPING] No orderType provided, defaulting to takeaway');
    return 'takeaway';
  }
  
  const mapped = ORDER_TYPE_MAPPING[frontendOrderType];
  if (!mapped) {
    console.warn(`[ORDER TYPE MAPPING] Unknown orderType: ${frontendOrderType}, defaulting to takeaway`);
    return 'takeaway';
  }
  
  return mapped;
};

/**
 * Convert backend orderType to frontend format
 * @param {string} backendOrderType - The order type from backend API
 * @returns {string} The order type in frontend format
 */
export const mapOrderTypeToFrontend = (backendOrderType) => {
  return REVERSE_ORDER_TYPE_MAPPING[backendOrderType] || backendOrderType;
};
