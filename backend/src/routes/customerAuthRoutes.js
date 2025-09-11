const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { customerProtect } = require('../middleware/authMiddleware');

// Public routes (no authentication required)

// Request OTP for login/registration
router.post('/request-otp', customerAuthController.requestOTP);

// Verify OTP and register/login customer
router.post('/verify-otp', customerAuthController.verifyOTP);

// Login with identifier and OTP
router.post('/login', customerAuthController.login);

// Verify magic link/token (WhatsApp/direct)
router.post('/verify-magic', customerAuthController.verifyMagic);

// Debug: decode/verify magic token server-side
router.get('/debug-verify-magic', customerAuthController.debugVerifyMagic);

// Register new customer
router.post('/register', customerAuthController.register);

// Sync cart with user account
router.post('/sync-cart', customerAuthController.syncCart);

// Protected routes (require customer authentication)

// Verify customer session status
router.get('/verify-session', customerProtect, customerAuthController.verifySession);

// Public endpoint to get user's cart (dummy implementation)
router.get('/:id/cart', (req, res) => {
    res.status(200).json([]);
});

module.exports = router;
