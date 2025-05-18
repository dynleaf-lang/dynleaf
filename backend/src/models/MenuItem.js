const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    itemId: {
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
    description: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    categoryId  : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    imageUrl: {
        type: String,
        trim: true,
    }, 
    isVegetarian: {
        type: Boolean,
        required: true,
        default: false,
    },
    tags: {
        type: [String],
        default: [],
    },   
    featured: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },

}, {
    timestamps: true,
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);