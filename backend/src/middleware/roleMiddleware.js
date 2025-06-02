/**
 * Role middleware for controlling access to routes based on user roles
 * This middleware should be used after the authMiddleware that sets req.user
 */

/**
 * Middleware to authorize based on user roles
 * @param {Array} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure req.user exists (should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user role is in the allowed roles array
    if (allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }
  };
};

module.exports = {
  authorize
};