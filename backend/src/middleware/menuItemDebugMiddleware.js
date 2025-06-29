const mongoose = require('mongoose');

/**
 * Debug logging middleware for MenuItem operations (Schema middleware)
 */
const menuItemDebugMiddleware = (schema) => {
  // Add pre-find hook to log queries being executed
  schema.pre('find', function() {
    console.log(`[DEBUG] MenuItem find query:`, JSON.stringify(this.getQuery(), null, 2));
  });

  // Add pre-distinct hook to log distinct operations
  schema.pre('distinct', function() {
    console.log(`[DEBUG] MenuItem distinct query:`, JSON.stringify(this.getQuery(), null, 2));
    console.log(`[DEBUG] MenuItem distinct field:`, this._distinct);
  });

  // Add post-find hook to log results for debugging
  schema.post('find', function(docs) {
    console.log(`[DEBUG] MenuItem find returned ${docs ? docs.length : 0} documents`);
    if (docs && docs.length > 0) {
      // Log sample of categoryIds to help debug category issues
      const categoryIds = docs.slice(0, 5).map(doc => doc.categoryId).filter(Boolean);
      console.log(`[DEBUG] Sample categoryIds: ${JSON.stringify(categoryIds)}`);
    }
  });

  // Add post-distinct hook to log results
  schema.post('distinct', function(result) {
    console.log(`[DEBUG] MenuItem distinct returned ${result ? result.length : 0} values`);
    console.log(`[DEBUG] Distinct values: ${JSON.stringify(result)}`);
  });
}

/**
 * Express middleware for debugging menu item and category responses
 */
const menuResponseDebugger = (req, res, next) => {
  // Store original res.json method
  const originalJson = res.json;
  
  // Override res.json to add debugging info for menu item endpoints
  res.json = function(data) {
      // Only add debug info for menu item and category endpoints
      if (req.originalUrl.includes('/branch/') && 
          (req.originalUrl.includes('/categories') || req.method === 'GET')) {
          
          console.log(`[MENU DEBUG] Endpoint: ${req.originalUrl}`);
          
          // Check if response is an array
          if (Array.isArray(data)) {
              console.log(`[MENU DEBUG] Response contains ${data.length} items`);
              
              if (data.length === 0) {
                  console.log(`[MENU DEBUG] WARNING: Empty array response from ${req.originalUrl}`);
              } else {
                  // Check if these look like category objects
                  if (data[0].name !== undefined) {
                      console.log(`[MENU DEBUG] Categories returned: ${data.map(c => c.name).join(', ')}`);
                  }
              }
          } else if (data && typeof data === 'object') {
              console.log(`[MENU DEBUG] Response is an object with keys: ${Object.keys(data).join(', ')}`);
          }
      }
      
      // Call the original res.json with the original data
      return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  menuItemSchemaDebug: menuItemDebugMiddleware,
  menuResponseDebugger
};
