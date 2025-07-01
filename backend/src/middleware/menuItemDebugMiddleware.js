const mongoose = require('mongoose');

/**
 * Schema middleware for MenuItem operations (with debugging removed)
 */
const menuItemDebugMiddleware = (schema) => {
  // Add pre-find hook (debug logs removed)
  schema.pre('find', function() {
    // Hook preserved for potential future use
  });

  // Add pre-distinct hook (debug logs removed)
  schema.pre('distinct', function() {
    // Hook preserved for potential future use
  });

  // Add post-find hook (debug logs removed)
  schema.post('find', function(docs) {
    // Hook preserved for potential future use
  });

  // Add post-distinct hook (debug logs removed)
  schema.post('distinct', function(result) {
    // Hook preserved for potential future use
  });
}

/**
 * Express middleware for menu item and category responses (with debugging removed)
 */
const menuResponseDebugger = (req, res, next) => {
  // Store original res.json method
  const originalJson = res.json;
  
  // Override res.json (debug logs removed but structure preserved)
  res.json = function(data) {
      // Original debug logic has been removed
      // while preserving the middleware structure
      
      // Call the original res.json with the original data
      return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  menuItemSchemaDebug: menuItemDebugMiddleware,
  menuResponseDebugger
};
