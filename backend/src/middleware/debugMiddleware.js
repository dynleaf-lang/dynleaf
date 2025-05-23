/**
 * Debug Middleware
 * 
 * This middleware provides enhanced debugging and error handling for API requests.
 * It's especially useful for tracking down issues with database queries and model errors.
 */

const mongoose = require('mongoose');

const debugMiddleware = (req, res, next) => {
  // Check if this is a debug request
  const isDebugMode = req.headers['x-debug-mode'] === 'true';
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  if (isDebugMode) {
    console.log(`[DEBUG] Request ${requestId}: ${req.method} ${req.originalUrl}`);
    console.log(`[DEBUG] Request ${requestId}: Headers:`, req.headers);
    
    if (Object.keys(req.query).length > 0) {
      console.log(`[DEBUG] Request ${requestId}: Query params:`, req.query);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[DEBUG] Request ${requestId}: Body:`, req.body);
    }
    
    // Log Mongoose connection state
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    
    console.log(`[DEBUG] Request ${requestId}: MongoDB connection state: ${stateMap[connectionState] || connectionState}`);
    
    // Intercept the response to log it
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`[DEBUG] Response ${requestId}: Status ${res.statusCode}`);
      
      try {
        if (typeof data === 'string') {
          const parsedData = JSON.parse(data);
          // Log a sample of the response data to avoid console flooding
          console.log(`[DEBUG] Response ${requestId}: Sample data:`, 
            typeof parsedData === 'object' ? 
              (Array.isArray(parsedData.data) ? 
                { ...parsedData, data: `Array with ${parsedData.data?.length || 0} items` } : 
                parsedData) : 
              'Non-object data'
          );
        }
      } catch (e) {
        console.log(`[DEBUG] Response ${requestId}: Non-JSON data`);
      }
      
      originalSend.apply(res, arguments);
    };
  }
  
  // Add error handling wrapper around the next middleware
  try {
    next();
  } catch (error) {
    console.error(`[ERROR] Request ${requestId}: Uncaught error`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        message: 'An unexpected error occurred',
        error: isDebugMode ? error.message : 'Internal Server Error'
      });
    }
  }
};

module.exports = debugMiddleware;