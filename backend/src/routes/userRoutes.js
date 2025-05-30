const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { generateOTP, generateToken, sendVerificationEmail } = require('../utils/emailUtils');

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
        
        // Return user object with all profile fields
        res.status(200).json({ 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                restaurantId: user.restaurantId || null,
                branchId: user.branchId || null,
                username: user.username || null,
                firstName: user.firstName || null,
                lastName: user.lastName || null,
                address: user.address || null,
                city: user.city || null,
                country: user.country || null,
                postalCode: user.postalCode || null,
                aboutMe: user.aboutMe || null,
                profilePhoto: user.profilePhoto || null,
                isEmailVerified: user.isEmailVerified || false
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

// Update user profile
router.put('/profile', authenticateJWT, userController.updateUserProfile);

// Upload profile photo
router.post('/profile-photo', authenticateJWT, userController.uploadProfilePhoto);

// Delete profile photo
router.delete('/profile-photo', authenticateJWT, userController.deleteProfilePhoto);

// Change password route (for authenticated users)
router.put('/change-password', authenticateJWT, userController.changePassword);

// Forgot password routes (no authentication required)
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-reset-otp', userController.verifyResetOTP);
router.post('/reset-password', userController.resetPassword);

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
        const { firstName, lastName, username, email, password, role, restaurantId, branchId } = req.body;
        
        // Build update object
        const updateData = { email, role };
        
        // Add firstName, lastName, username if provided
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (username) {
            // Check if username is already taken by another user
            const existingUser = await User.findOne({ username, _id: { $ne: req.params.id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            updateData.username = username;
        }
        
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
    console.log('Registration request received with body:', JSON.stringify(req.body, null, 2));
    
    // Check if payload exists
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error('Missing payload in registration request');
        return res.status(400).json({ message: 'Error: payload is required' });
    }
    
    const { firstName, lastName, username, email, password, role, restaurantId, branchId, name, phoneNumber } = req.body;
    
    // Validate required fields
    if (!email || !password) {
        console.error('Missing required fields:', { email: !!email, password: !!password });
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        console.log('Registration attempt:', { firstName, lastName, username, email, role });
        
        const existingUser = await User.find({ email });
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Check if username is already taken (if provided)
        if (username) {
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }
        
        // Hash password with appropriate cost factor
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate verification token and OTP
        const otp = generateOTP();
        const tokenExpiry = new Date();
        tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 10); // Token expires in 10 minutes
        
        // Create user object with optional restaurantId if provided
        const userData = {
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
            role: role || 'Branch_Manager', // Use the default from your enum
            isEmailVerified: false, // Default to unverified
            emailVerificationOTP: otp, // Match the schema field name
            emailVerificationOTPExpires: tokenExpiry, // Match the schema field name
            phoneNumber: phoneNumber || null // Include the phone number if provided
        };

        // Generate name from firstName and lastName if not provided directly
        userData.name = name || `${firstName} ${lastName}`.trim();
        
        // Add restaurantId if provided
        if (restaurantId) {
            userData.restaurantId = restaurantId;
        }

        // Add branchId if provided
        if (branchId) {
            userData.branchId = branchId;
        } 
        
        // Save the new user to the database
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
        
        // Try to send verification email, but don't fail registration if it fails
        let emailSent = false;
        try {
            await sendVerificationEmail(email, otp);
            emailSent = true;
        } catch (emailError) {
            console.error('Failed to send verification email, but user was created:', emailError);
            // Don't throw the error - we still want to return success for the user creation
        }
        
        // Return token and user data for auto-login
        res.status(201).json({ 
            message: emailSent 
                ? 'User registered successfully. Please verify your email.'
                : 'User registered successfully. Email verification is currently unavailable.',
            token,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                role: newUser.role,
                isEmailVerified: newUser.isEmailVerified
            },
            requiresVerification: emailSent
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

// Debug registration endpoint - bypasses email verification
router.post('/register-debug', async (req, res) => {
    console.log('[DEBUG] Registration request received with body:', JSON.stringify(req.body, null, 2));
    
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'Error: payload is required' });
    }
    
    const { firstName, lastName, username, email, password, role, restaurantId, branchId, name, phoneNumber } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    try {
        // Check if user exists
        const existingUser = await User.find({ email });
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Check username uniqueness
        if (username) {
            const existingUsername = await User.findOne({ username });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate OTP for verification (but don't send email)
        const otp = generateOTP();
        const tokenExpiry = new Date();
        tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 10); // Token expires in 10 minutes
        
        // Simple user object
        const userData = {
            firstName,
            lastName,
            username,
            email,
            password: hashedPassword,
            role: role || 'Branch_Manager',
            isEmailVerified: false, // Mark as unverified by default
            emailVerificationOTP: otp, // Store OTP for later use
            emailVerificationOTPExpires: tokenExpiry,
            phoneNumber: phoneNumber || null
        };

        userData.name = name || `${firstName} ${lastName}`.trim();
        if (restaurantId) userData.restaurantId = restaurantId;
        if (branchId) userData.branchId = branchId;
        
        console.log('[DEBUG] Creating user with:', {
            ...userData,
            password: '[HIDDEN]',
            emailVerificationOTP: otp // Log OTP for testing purposes
        });
        
        // Create and save user
        const newUser = new User(userData);
        const savedUser = await newUser.save();
        
        console.log('[DEBUG] User saved successfully:', savedUser._id);
        
        // Generate token
        const token = jwt.sign({ 
            id: savedUser._id, 
            role: savedUser.role,
            restaurantId: savedUser.restaurantId || null,
            branchId: savedUser.branchId || null
        }, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
        
        // Return success with verification info
        res.status(201).json({ 
            message: 'User registered successfully (debug mode). User needs to be verified.',
            token,
            user: {
                id: savedUser._id,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                username: savedUser.username,
                email: savedUser.email,
                phoneNumber: savedUser.phoneNumber,
                role: savedUser.role,
                isEmailVerified: savedUser.isEmailVerified
            },
            debug: true,
            verificationInfo: {
                needsVerification: true,
                otp: otp, // Include OTP in response for testing
                expiresAt: tokenExpiry
            }
        });
    }
    catch (error) {
        console.error('[DEBUG] Registration error:', error);
        res.status(500).json({ 
            message: 'Registration failed (debug route)', 
            error: error.message,
            stack: error.stack
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
                firstName: existingUser.firstName || null,
                lastName: existingUser.lastName || null,
                username: existingUser.username || null,
                name: existingUser.name, // Keep for backward compatibility
                email: existingUser.email, 
                role: existingUser.role,
                restaurantId: existingUser.restaurantId || null,
                branchId: existingUser.branchId || null,
                isEmailVerified: existingUser.isEmailVerified || false
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

// Verify email with OTP
router.post('/verify-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Find the user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Generate OTP
        const otp = generateOTP();
        
        // Set OTP expiration (10 minutes)
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        // Update user with OTP
        user.emailVerificationOTP = otp;
        user.emailVerificationOTPExpires = otpExpires;
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(email, otp);
        
        res.status(200).json({ 
            message: 'Verification email sent successfully',
            email
        });
    } catch (error) {
        console.error('Error sending verification email:', error);
        res.status(500).json({ 
            message: 'Failed to send verification email', 
            error: error.message 
        });
    }
});

// Confirm email verification with OTP
router.post('/confirm-verification', async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!otp) {
            return res.status(400).json({ message: 'OTP is required' });
        }
        
        // Find user with this OTP
        const user = await User.findOne({ 
            emailVerificationOTP: otp,
            emailVerificationOTPExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ 
                message: 'Invalid or expired verification code' 
            });
        }
        
        // Mark email as verified and clear OTP
        user.isEmailVerified = true;
        user.emailVerificationOTP = null;
        user.emailVerificationOTPExpires = null;
        await user.save();
        
        // Generate token for auto-login
        const token = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { 
                expiresIn: JWT_EXPIRATION,
                issuer: JWT_ISSUER,
                audience: JWT_AUDIENCE 
            }
        );
        
        res.status(200).json({
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error('Error confirming verification:', error);
        res.status(500).json({ 
            message: 'Failed to verify email', 
            error: error.message 
        });
    }
});

// Resend OTP for email verification
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }
        
        // Generate new OTP
        const otp = generateOTP();
        
        // Set OTP expiration (10 minutes)
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        
        // Update user with new OTP
        user.emailVerificationOTP = otp;
        user.emailVerificationOTPExpires = otpExpires;
        await user.save();
        
        // Send verification email
        await sendVerificationEmail(email, otp);
        
        res.status(200).json({ 
            message: 'Verification email resent successfully' 
        });
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({ 
            message: 'Failed to resend verification email', 
            error: error.message 
        });
    }
});

// Check if user account is still active
router.get('/check-status', authenticateJWT, userController.checkAccountStatus);

// New endpoint with a clearer path name that won't be confused with an ID parameter
router.get('/account-status', authenticateJWT, userController.checkAccountStatus);

// Test endpoint for debugging payload issues
router.post('/test-payload', (req, res) => {
    console.log('Test payload received:', JSON.stringify(req.body));
    res.status(200).json({ 
        success: true,
        receivedPayload: req.body,
        hasPayload: !!req.body && Object.keys(req.body).length > 0
    });
});

module.exports = router;