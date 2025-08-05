const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant', 
        required: false,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch', 
        required: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    // Additional profile fields
    username: {
        type: String,
        trim: true,
        unique: true,
        sparse: true, // Allow null values to avoid unique constraint issues
    },
    firstName: {
        type: String,
        trim: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    profilePhoto: {
        type: String, // URL to the profile photo
    },
    address: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    phoneNumber: {
        type: String,
        trim: true,
    },
    postalCode: {
        type: String,
        trim: true,
    },
    aboutMe: {
        type: String,
        trim: true,
    },
    // Auth fields
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['Super_Admin', 'admin', 'Branch_Manager', 'Kitchen', 'Delivery', 'POS_Operator', 'Staff', 'Waiter', 'Chef'],
        default: 'Branch_Manager',
    },
    // Email verification fields
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationOTP: {
        type: String,
        default: null
    },
    emailVerificationOTPExpires: {
        type: Date,
        default: null
    },
    // Password reset fields
    resetPasswordOTP: {
        type: String,
        default: null
    },
    resetPasswordOTPExpiry: {
        type: Date,
        default: null
    },
    passwordUpdatedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;