const Customer = require('../models/Customer');
const Restaurant = require('../models/Restaurant');
const Branch = require('../models/Branches');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const otpGenerator = require('otp-generator');
const { verifyToken } = require('../utils/tokenUtils');

// Store OTPs in memory for development (should use Redis or another cache in production)
const otpStore = new Map();

// @desc    Login existing customer with identifier (email/phone) and OTP
// @route   POST /api/customers/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, otp, otpId } = req.body;
    
    // Validate input
    if (!identifier || !otp) {
      return res.status(400).json({ message: 'Please provide identifier and OTP' });
    }
    
    // If otpId is provided, verify against the stored OTP
    if (otpId) {
      // Check if OTP exists and is valid
      if (!otpStore.has(otpId)) {
        return res.status(400).json({ message: 'Invalid or expired OTP request' });
      }
      
      const otpData = otpStore.get(otpId);
      
      // Check if OTP is expired
      if (otpData.expiresAt < Date.now()) {
        otpStore.delete(otpId);
        return res.status(400).json({ message: 'OTP has expired' });
      }
      
      // Check if OTP matches
      if (otp !== otpData.otp || identifier !== otpData.identifier) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
    }
    
    // Find the customer based on identifier
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };
    const customer = await Customer.findOne(query);
    
    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found. Please register first.',
        shouldRegister: true 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: customer._id, type: 'customer' },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '30d' }
    );
    
    // Return customer data with token
    return res.status(200).json({
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      token,
      isVerified: true
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Request OTP for login/registration
// @route   POST /api/customers/auth/request-otp
// @access  Public
exports.requestOTP = async (req, res) => {
  try {
    const { identifier, restaurantId, branchId } = req.body;
    
    if (!identifier || (!restaurantId && !branchId)) {
      return res.status(400).json({ message: 'Please provide identifier and restaurant/branch ID' });
    }
    
    // Check if customer exists first
    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: identifier };
    const customer = await Customer.findOne(query);
    
    if (!customer) {
      return res.status(404).json({ 
        message: 'Customer not found. Please register first.',
        shouldRegister: true 
      });
    }
    
    // Generate 6-digit numeric OTP
    let otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false, 
      specialChars: false,
      digits: true
    });
    
    // Fallback: Ensure we only have digits (in case otp-generator has issues)
    if (!/^\d{6}$/.test(otp)) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Store OTP with expiry (5 minutes)
    const otpData = {
      otp,
      identifier,
      restaurantId,
      branchId,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    
    const otpId = uuidv4();
    otpStore.set(otpId, otpData);
    
    // In production, send OTP via SMS or email
    console.log(`OTP for ${identifier}: ${otp} (Length: ${otp.length}, Type: ${typeof otp}, All digits: ${/^\d+$/.test(otp)})`);
    
    // Return success but don't include OTP in response (for security)
    return res.status(200).json({ 
      message: 'OTP sent successfully',
      otpId // This ID will be used when verifying
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return res.status(500).json({ message: 'Server error while requesting OTP' });
  }
};

// @desc    Verify OTP and register or login customer
// @route   POST /api/customers/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { otpId, otp } = req.body;
    
    // Check if OTP exists and is valid
    if (!otpStore.has(otpId)) {
      return res.status(400).json({ message: 'Invalid or expired OTP request' });
    }
    
    const otpData = otpStore.get(otpId);
    
    // Check if OTP is expired
    if (otpData.expiresAt < Date.now()) {
      otpStore.delete(otpId);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Check if OTP matches
    if (otp !== otpData.otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // OTP is valid, determine if this is a login or registration
    const { identifier, restaurantId, branchId } = otpData;
    
    // Check if user exists
    const isEmail = identifier.includes('@');
    let customer;
    
    if (isEmail) {
      customer = await Customer.findOne({ email: identifier.toLowerCase(), restaurantId });
    } else {
      customer = await Customer.findOne({ phone: identifier, restaurantId });
    }
    
    // If customer doesn't exist, register new customer
    if (!customer) {
      // Use name from stored OTP data (from registration)
      const customerName = otpData.name;
      
      if (!customerName) {
        return res.status(400).json({ message: 'Name is required for new registrations' });
      }
      
      // Validate restaurantId and branchId are valid ObjectIds
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: 'Invalid restaurant ID' });
      }
      
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return res.status(400).json({ message: 'Invalid branch ID' });
      }
      
      const customerId = `CUST-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      const customerData = {
        restaurantId,
        branchId,
        customerId,
        name: customerName,
        ...(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier })
      };
      
      try {
        customer = await Customer.create(customerData);
      } catch (createError) {
        console.error('Error creating customer:', createError.message);
        if (createError.name === 'ValidationError') {
          const validationErrors = Object.keys(createError.errors).join(', ');
          return res.status(400).json({ 
            message: `Validation error: ${validationErrors}` 
          });
        }
        return res.status(500).json({ message: 'Failed to create customer account' });
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: customer._id, restaurantId, branchId },
      process.env.JWT_SECRET || 'devsecretshouldbereplaced',
      { expiresIn: '30d' }
    );
    
    // Remove the OTP from store
    otpStore.delete(otpId);
    
    // Return customer data and token
    res.status(200).json({
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      restaurantId: customer.restaurantId,
      branchId: customer.branchId,
      token
    });
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ message: 'Server error while verifying OTP' });
  }
};

// @desc    Sync cart with user account
// @route   POST /api/customers/auth/sync-cart
// @access  Public
exports.syncCart = async (req, res) => {
  try {
    const { customerId, cartItems } = req.body;
    
    if (!customerId || !cartItems) {
      return res.status(400).json({ message: 'Customer ID and cart items are required' });
    }
    
    // In a production app, you would store the cart in a database
    // For now, we'll just acknowledge the sync
    console.log(`Syncing cart for customer ${customerId} with ${cartItems.length} items`);
    
    // Return success response
    return res.status(200).json({ message: 'Cart synced successfully' });
    
  } catch (error) {
    console.error('Cart sync error:', error);
    return res.status(500).json({ message: 'Server error during cart sync' });
  }
};

// @desc    Get stored cart for user
// @route   GET /api/customers/auth/:id/cart
// @access  Private
exports.getStoredCart = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, you would retrieve cart items from a database
    // For now, we'll just return an empty array
    
    return res.status(200).json([]);
  } catch (error) {
    console.error('Error retrieving stored cart:', error);
    return res.status(500).json({ message: 'Server error while retrieving cart' });
  }
};

// @desc    Register new customer
// @route   POST /api/customers/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, phone, restaurantId, branchId } = req.body;
    
    if (!name || (!email && !phone) || (!restaurantId && !branchId)) {
      return res.status(400).json({ 
        message: 'Please provide name, identifier (email or phone), and restaurant/branch ID' 
      });
    }
    
    // Check if customer already exists
    let existingCustomer = null;
    if (email) {
      existingCustomer = await Customer.findOne({ 
        email: email.toLowerCase(),
        restaurantId: restaurantId || { $exists: true }
      });
    } else if (phone) {
      existingCustomer = await Customer.findOne({ 
        phone,
        restaurantId: restaurantId || { $exists: true }
      });
    }
    
    if (existingCustomer) {
      return res.status(400).json({
        message: 'Customer already exists with this email or phone'
      });
    }
    
    // Generate 6-digit numeric OTP for verification
    let otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false, 
      specialChars: false,
      digits: true
    });
    
    // Fallback: Ensure we only have digits (in case otp-generator has issues)
    if (!/^\d{6}$/.test(otp)) {
      otp = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Store OTP with expiry (5 minutes)
    const otpId = uuidv4();
    const identifier = email || phone;
    
    otpStore.set(otpId, {
      otp,
      identifier,
      restaurantId,
      branchId,
      name,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    });
    
    // In production, send OTP via SMS or email
    console.log(`Registration OTP for ${identifier}: ${otp} (Length: ${otp.length}, Type: ${typeof otp}, All digits: ${/^\d+$/.test(otp)})`);
    
    // Return partial user data with otpId for verification
    return res.status(200).json({
      name,
      email: email || undefined,
      phone: phone || undefined,
      otpId,
      message: 'OTP sent successfully. Please verify to complete registration.'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Verify customer session status
// @route   GET /api/customers/auth/verify-session
// @access  Private (Customer)
exports.verifySession = async (req, res) => {
  try {
    // Check if user is authenticated (middleware should handle this)
    if (!req.user || req.user.type !== 'customer') {
      return res.status(401).json({ 
        isValid: false, 
        isActive: false,
        message: 'Invalid session' 
      });
    }
    
    // Find the customer in database
    const customer = await Customer.findById(req.user.id);
    
    if (!customer) {
      return res.status(404).json({ 
        isValid: false, 
        isActive: false,
        message: 'Customer not found' 
      });
    }
    
    // Check if customer account is active
    const isActive = customer.isActive !== false;
    
    if (!isActive) {
      return res.status(401).json({
        isValid: false,
        isActive: false,
        message: 'Customer account has been deactivated'
      });
    }
    
    // Update last activity timestamp
    try {
      await Customer.findByIdAndUpdate(req.user.id, { 
        lastActivity: new Date() 
      });
    } catch (updateError) {
      console.error('Error updating last activity:', updateError);
      // Don't fail the entire request for this
    }
    
    // Return session status
    return res.status(200).json({
      isValid: true,
      isActive: isActive,
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        lastActivity: customer.lastActivity
      }
    });
    
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ 
      isValid: false, 
      isActive: false,
      message: 'Server error during session verification' 
    });
  }
};

// @desc    Verify a magic token (e.g., from WhatsApp) and mint a customer session
// @route   POST /api/customers/auth/verify-magic
// @access  Public
exports.verifyMagic = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Magic token is required' });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid or expired magic token' });
    }

    // Build a lightweight guest identity without OTP
    // If customer exists by phone, attach it; otherwise, return guest profile
    const { phone, restaurantId, branchId, tableId, name } = decoded;

    let customer = null;
    if (phone) {
      customer = await Customer.findOne({ phone, restaurantId: restaurantId || { $exists: true } });
    }

    if (!customer) {
      // Guest session (no DB create). Client can still place public orders with phone captured.
      const guestPayload = {
        id: `guest_${phone || 'anon'}_${Date.now()}`,
        type: 'customer',
        isGuest: true,
        phone: phone || null,
        restaurantId: restaurantId || null,
        branchId: branchId || null,
        tableId: tableId || null,
      };
      const jwt = require('jsonwebtoken');
      const tokenOut = jwt.sign(guestPayload, process.env.JWT_SECRET || 'devsecretshouldbereplaced', { expiresIn: '2h' });
      return res.status(200).json({
        _id: guestPayload.id,
        name: name || 'Guest',
        phone: guestPayload.phone,
        restaurantId: guestPayload.restaurantId,
        branchId: guestPayload.branchId,
        tableId: guestPayload.tableId,
        isGuest: true,
        token: tokenOut,
      });
    }

    // Existing customer: issue normal customer token
    const realToken = jwt.sign(
      { id: customer._id, type: 'customer', restaurantId, branchId, tableId, phone },
      process.env.JWT_SECRET || 'devsecretshouldbereplaced',
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      _id: customer._id,
      customerId: customer.customerId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      restaurantId: customer.restaurantId,
      branchId: customer.branchId,
      tableId: tableId || null,
      isGuest: false,
      token: realToken,
    });
  } catch (error) {
    console.error('Magic verify error:', error);
    return res.status(500).json({ message: 'Server error during magic verification' });
  }
};

// @desc    Debug: verify/decode a magic token using server JWT settings
// @route   GET /api/customers/auth/debug-verify-magic?token=...
// @access  Public (use only for local debugging)
exports.debugVerifyMagic = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(400).json({ ok: false, message: 'token query param required' });
    try {
      const decoded = verifyToken(token);
      return res.status(200).json({ ok: true, decoded });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e.message, name: e.name });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'debug verify failed' });
  }
};
