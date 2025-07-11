const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Customer = require('../models/Customer');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only';
const JWT_ISSUER = process.env.JWT_ISSUER || 'your-issuer';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-audience';   

// Helper function to ensure IDs are properly formatted
const formatId = (id) => {
    if (!id) return null;
    
    try {
        // If already an ObjectId, return it
        if (id instanceof mongoose.Types.ObjectId) return id;
        
        // Convert to ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
        }
        
        // Return original for logging
        return id;
    } catch (error) {
        console.error("Error formatting ID:", error);
        return id;
    }
};

// Authentication middleware - primary function for verifying tokens
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.log('Missing Authorization header');
        return res.status(401).json({ message: 'Authorization header not provided' });
    }
    
    // Handle both "Bearer token" and just "token" formats
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];
    
    if (!token) {
        console.log('Token not provided in header:', authHeader);
        return res.status(401).json({ message: 'Token not provided' });
    }
    
    // Verify the token with simpler callback handling
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });
        
        // Ensure restaurantId and branchId are properly formatted if they exist
        if (decoded.restaurantId) {
            decoded.restaurantId = formatId(decoded.restaurantId);
        }
        
        if (decoded.branchId) {
            decoded.branchId = formatId(decoded.branchId);
        }
        
        // For consistency, add _id property if it doesn't exist but id does
        if (!decoded._id && decoded.id) {
            decoded._id = decoded.id;
        }
        
        // Check if the user still exists in the database
        const userExists = await User.findById(decoded.id);
        if (!userExists) {
            console.log('User no longer exists in the database:', decoded.id);
            return res.status(401).json({ 
                message: 'Your account has been suspended by admin',
                reason: 'account_suspended'
            });
        }
        
        // Check if the user is active
        if (userExists.status === 'inactive' || userExists.isDeleted) {
            console.log('User account is deactivated:', decoded.id);
            return res.status(401).json({ 
                message: 'Your account has been suspended by admin',
                reason: 'account_suspended'
            });
        }
        
        console.log('Authenticated user:', {
            id: decoded.id, 
            role: decoded.role,
            restaurantId: decoded.restaurantId,
            branchId: decoded.branchId
        });
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        
        // Provide more specific error messages based on error type
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                message: 'Token has expired', 
                error: 'expired_token'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                message: 'Invalid token', 
                error: 'invalid_token'
            });
        }
        
        return res.status(403).json({ 
            message: 'Token is not valid: ' + error.message,
            error: error.name
        });
    }
};

// Alias for authenticateJWT to maintain backward compatibility
// For the new routes that use 'protect'
const protect = authenticateJWT;

// Middleware to check if the user is an admin
const authorizeAdmin = (req, res, next) => {
    console.log('User role check:', req.user.role);
    if (req.user.role !== 'admin' && req.user.role !== 'Super_Admin') {
        return res.status(403).json({ message: 'Access denied. Role required: admin or Super_Admin' });
    }
    next();
};

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required for this route'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Role required: ${roles.join(' or ')}`
            });
        }
        next();
    };
};

// Middleware for public access (skips authentication)
const publicAccess = (req, res, next) => {
    // Add empty user object to avoid undefined errors in routes
    req.user = {
        role: 'public',
        isPublic: true
    };
    next();
};

// Customer authentication middleware for customer-specific routes
const customerProtect = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.log('Missing Authorization header for customer');
        return res.status(401).json({ message: 'Authorization header not provided' });
    }
    
    // Handle both "Bearer token" and just "token" formats
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];
    
    if (!token) {
        console.log('Token not provided in header:', authHeader);
        return res.status(401).json({ message: 'Token not provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });
        
        // Verify this is a customer token
        if (decoded.type !== 'customer') {
            console.log('Invalid token type for customer route:', decoded.type);
            return res.status(403).json({ 
                message: 'Invalid token type. Customer access required.' 
            });
        }
        
        // Check if the customer still exists in the database
        const customer = await Customer.findById(decoded.id);
        if (!customer) {
            console.log('Customer no longer exists in the database:', decoded.id);
            return res.status(401).json({ 
                message: 'Customer account not found',
                reason: 'account_not_found'
            });
        }
        
        // Check if customer account is active
        if (customer.isActive === false) {
            console.log('Customer account is deactivated:', decoded.id);
            return res.status(401).json({ 
                message: 'Customer account has been deactivated',
                reason: 'account_inactive'
            });
        }
        
        console.log('Authenticated customer:', {
            id: decoded.id, 
            customerId: customer.customerId,
            name: customer.name
        });
        
        req.user = decoded;
        req.customer = customer; // Add customer data to request
        next();
    } catch (error) {
        console.error('Customer JWT verification error:', error.message);
        
        // Provide more specific error messages based on error type
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                message: 'Session has expired. Please log in again.', 
                error: 'expired_token'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                message: 'Invalid session. Please log in again.', 
                error: 'invalid_token'
            });
        }
        
        return res.status(403).json({ 
            message: 'Session is not valid: ' + error.message,
            error: error.name
        });
    }
};

module.exports = {
    protect,
    authorize,
    authenticateJWT,
    authorizeAdmin,
    publicAccess,
    customerProtect
};