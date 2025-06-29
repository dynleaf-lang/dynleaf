const mongoose = require('mongoose');

// Create a schema for size variants
const SizeVariantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false }); // No need for separate IDs for each variant

const MenuItemSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        // Not required, as items can be available at all branches
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
        min: 0,
        // Price is not strictly required if we have size variants
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
    },    sizeVariants: {
        type: [SizeVariantSchema],
        default: []
    }
}, {
    timestamps: true,
});

// Add a custom pre-validate hook to enforce our business logic
MenuItemSchema.pre('validate', function(next) {
    // Check if we have a valid price (not undefined, null, or zero)
    const hasValidPrice = this.price !== undefined && this.price !== null && this.price > 0;
    
    // Check if we have size variants
    const hasSizeVariants = this.sizeVariants && this.sizeVariants.length > 0;
    
    // If we don't have a valid price and no size variants, throw a validation error
    if (!hasValidPrice && !hasSizeVariants) {
        this.invalidate('sizeVariants', 'Either a valid price or at least one size variant is required');
        return next(new Error('Either a valid price or at least one size variant is required'));
    }
    
    // Everything is valid
    return next();
});

// Import debug middleware
const { menuItemSchemaDebug } = require('../middleware/menuItemDebugMiddleware');

// Apply debug middleware to schema
menuItemSchemaDebug(MenuItemSchema);

module.exports = mongoose.model('MenuItem', MenuItemSchema);