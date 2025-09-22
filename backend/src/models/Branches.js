const mongoose = require('mongoose');
const branchSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    // State/Province (useful for countries like India with state-specific taxes)
    state: {
        type: String,
        required: false,
        trim: true,
    },
    postalCode: {
        type: String,
        required: false,
    },
    country: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    }, 
    openingHours: {
        type: String,
        required: true,
    }, 
    // Compliance fields
    // Optional FSSAI license number for India (branch/outlet specific)
    fssaiLicense: {
        type: String,
        required: false,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Settings
    settings: {
        whatsappUpdatesEnabled: { type: Boolean, default: false },
        printerConfig: {
            paymentUPIVPA: { type: String, default: '' },
            paymentUPIName: { type: String, default: '' },
            showQRCode: { type: Boolean, default: true },
            showFooterMessage: { type: Boolean, default: true },
        },
    },
});

module.exports = mongoose.model('Branch', branchSchema);