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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;