const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        // Making branchId optional
        required: false,
    },

    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: false,
        default: null,
    },

    level: {
        type: Number,
        default: 0, // 0 for root categories, 1 for first level children, etc.
    },

    categoryId: {
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
    imageUrl: {
        type: String,
        trim: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Add index for faster lookup of child categories
CategorySchema.index({ parentCategory: 1 });

module.exports = mongoose.model('Category', CategorySchema);