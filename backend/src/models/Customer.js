const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
    },
    customerId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: false,
        unique: false,
        lowercase: true,
        sparse: true, // Added sparse index to allow multiple null/undefined values
    },
    phone: {
        type: String,
        required: false, // Changed to false since either email OR phone is required, not both
    },
    address: {
        type: String,
        required: false, // Changed from true to false to make it optional
    },
    isActive: {
        type: Boolean,
        default: true, // Customer is active by default
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;