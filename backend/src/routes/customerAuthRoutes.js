const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');

// Public routes (no authentication required)

// Request OTP for login/registration
router.post('/request-otp', customerAuthController.requestOTP);

// Verify OTP and register/login customer
router.post('/verify-otp', customerAuthController.verifyOTP);

// Login with identifier and OTP
router.post('/login', customerAuthController.login);

// Register new customer
router.post('/register', customerAuthController.register);

// Sync cart with user account
router.post('/sync-cart', customerAuthController.syncCart);

// Public endpoint to get user's cart (dummy implementation)
router.get('/:id/cart', (req, res) => {
    res.status(200).json([]);
});

module.exports = router;
