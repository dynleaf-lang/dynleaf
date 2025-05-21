const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h'; // Increased to 24h from 1h
const JWT_ISSUER = process.env.JWT_ISSUER || 'your-issuer';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-audience';

// Get user profile - Fixed version that combines both approaches
router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        // Make sure we're using the right property from the JWT payload
        const userId = req.user.id;
        
        if (!userId) {
            console.error('User ID not found in JWT payload:', req.user);
            return res.status(400).json({ 
                message: 'Invalid user data in token',
                tokenPayload: req.user // For debugging
            });
        }
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            console.error(`User with ID ${userId} not found in database`);
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Return both full user object from DB and basic token info
        res.status(200).json({ 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId || null,
                branchId: user.branchId || null
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ 
            message: 'Failed to retrieve user profile', 
            error: error.message 
        });
    }
});

// Get all users 
router.get('/all', authenticateJWT, authorizeAdmin, async (req, res) => {
    try {
        // Query the database to get all users
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) { 
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user by ID
router.put('/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
    try {
        const { name, email, password, role, restaurantId, branchId } = req.body;
        
        // Build update object
        const updateData = { name, email, role };
        
        // If restaurantId is provided
        if (restaurantId) {
            updateData.restaurantId = restaurantId;
        }

        // If branchId is provided
        if (branchId) {
            updateData.branchId = branchId;
        }
        
        // If password is provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        
        // Find and update the user
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete user by ID
router.delete('/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ message: 'User deleted successfully', id: req.params.id });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: error.message });
    }
});

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, role, restaurantId, branchId } = req.body;
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

        // Add branchId if provided
        if (branchId) {
            userData.branchId = branchId;
        } 
        
        const newUser = new User(userData);
        await newUser.save();
        
        // Generate token for auto-login after registration
        const token = jwt.sign({ 
            id: newUser._id, 
            role: newUser.role,
            restaurantId: newUser.restaurantId || null,
            branchId: newUser.branchId || null
        }, JWT_SECRET, { 
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
        
        // Include restaurantId and branchId in the JWT token payload
        const token = jwt.sign({ 
            id: existingUser._id, 
            role: existingUser.role,
            restaurantId: existingUser.restaurantId || null,
            branchId: existingUser.branchId || null
        }, JWT_SECRET, { 
            expiresIn: JWT_EXPIRATION, 
            issuer: JWT_ISSUER, 
            audience: JWT_AUDIENCE 
        });
        
        res.status(200).json({ 
            token, 
            user: { 
                id: existingUser._id, 
                name: existingUser.name, 
                email: existingUser.email, 
                role: existingUser.role,
                restaurantId: existingUser.restaurantId || null,
                branchId: existingUser.branchId || null
            } 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin route example
router.get('/admin', authenticateJWT, authorizeAdmin, (req, res) => {
    res.json({ message: 'Admin dashboard data' });
});

module.exports = router;