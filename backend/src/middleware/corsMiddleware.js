// File: d:\NodeJs\food-menu-order-managment\backend\src\middleware\corsMiddleware.js

/**
 * Advanced CORS middleware for handling cross-origin requests
 * This middleware adds additional CORS headers for public API routes
 */
const corsMiddleware = (req, res, next) => {
    // Add additional CORS headers to ensure proper cross-domain access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Debug-Mode, X-Request-ID');
    res.header('Access-Control-Expose-Headers', 'X-Request-Time, X-API-Version');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Add a request timestamp header
    res.header('X-Request-Time', new Date().toISOString());
    
    next();
};

module.exports = corsMiddleware;
