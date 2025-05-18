const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'your-issuer';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-audience';   

// Middleware to check if the user is authenticated
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token not provided' });
    // Verify the token
    try {
        jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE }, (err, user) => {
            if (err) return res.status(403).json({ message: 'Token is not valid' });
            req.user = user;
            next();
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Middleware to check if the user is an admin
const authorizeAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, role, restaurantId } = req.body;
    try {
        console.log('Registration attempt:', { name, email, role }); // Log registration attempts
        
        const existingUser = await User.find({ email });
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Hash password with appropriate cost factor
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user object with optional restaurantId if provided
        const userData = {
            name,
            email,
            password: hashedPassword,
            role: role || 'Branch_Manager', // Use the default from your enum
        };
        
        // Add restaurantId if provided
        if (restaurantId) {
            userData.restaurantId = restaurantId;
        }
        
        const newUser = new User(userData);
        await newUser.save();
        
        // Generate token for auto-login after registration
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { 
            expiresIn: JWT_EXPIRATION, 
            issuer: JWT_ISSUER, 
            audience: JWT_AUDIENCE 
        });
        
        console.log('User registered successfully:', newUser._id);
        
        // Return token and user data for auto-login
        res.status(201).json({ 
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Registration failed', 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// User login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: existingUser._id, role: existingUser.role }, JWT_SECRET, { expiresIn: JWT_EXPIRATION, issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
        res.status(200).json({ token, user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user profile
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Protected route example
router.get('/profile', authenticateJWT, (req, res) => {
    res.json({ message: 'Protected profile data', user: req.user });
});

// Admin route example
router.get('/admin', authenticateJWT, authorizeAdmin, (req, res) => {
    res.json({ message: 'Admin dashboard data' });
});

module.exports = router;