const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');

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
            return mongoose.Types.ObjectId(id);
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

module.exports = {
    protect,
    authorize,
    authenticateJWT,
    authorizeAdmin
};