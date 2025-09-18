const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    // Optional brand display name (if different from legal name)
    brandName: {
        type: String,
        required: false,
        trim: true,
    },
    // Optional logo image URL (served from /uploads or external URL)
    logo: {
        type: String,
        required: false,
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
    // State/Province (important for country-specific tax rules like India)
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
        default: 'US',
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
    // GST registrations per state (India). One restaurant brand may have multiple outlets across states.
    gstRegistrations: [{
        state: { type: String, trim: true },
        gstin: { type: String, trim: true },
        legalName: { type: String, trim: true },
        tradeName: { type: String, trim: true },
        effectiveFrom: { type: Date },
        active: { type: Boolean, default: true }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;