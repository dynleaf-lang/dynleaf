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
    },
    sizeVariants: {
        type: [SizeVariantSchema],
        default: [],
        validate: {
            validator: function(variants) {
                // If there's no base price, at least one size variant is required
                if (this.price === undefined || this.price === null) {
                    return variants.length > 0;
                }
                return true;
            },
            message: "At least one size variant is required if no base price is provided"
        }
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);