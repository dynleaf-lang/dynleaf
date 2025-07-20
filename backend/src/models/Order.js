const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
    orderId: {
        type: String,
        unique: true,
        trim: true,
    },
    tableId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DiningTable',
        required: false,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false,
    },
    // Customer information for guest orders
    customerName: {
        type: String,
        required: false,
        trim: true,
        default: 'Guest'
    },
    customerPhone: {
        type: String,
        required: false,
        trim: true,
    },
    customerEmail: {
        type: String,
        required: false,
        trim: true,
    },
    items: [
        {    
            menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MenuItem',
                required: true,
            },
            name: {
                type: String,
                required: true,
                trim: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true,
                min: 0,
            },
            notes: {
                type: String,
                trim: true,
                default: ''
            },
            subtotal: {
                type: Number,
                required: true,
                min: 0,
            },
            // Legacy field for backward compatibility
            specialInstructions: {
                type: String,
                trim: true,
                default: ''
            },
            // Legacy fields
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MenuItem',
                required: false,
            },
            categoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
                required: false,
            },
        },
    ],
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    // Tax fields (new schema)
    taxAmount: {
        type: Number,
        required: false,
        default: 0,
        min: 0,
    },
    taxDetails: {
        taxName: {
            type: String,
            required: false,
            default: 'Tax'
        },
        percentage: {
            type: Number,
            required: false,
            default: 0
        },
        countryCode: {
            type: String,
            required: false,
            default: 'US'
        },
        isCompound: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    // Legacy tax field
    tax: {
        type: Number,
        required: false,
        default: 0,
        min: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    // Order type (new schema)
    orderType: {
        type: String,
        enum: ['dine-in', 'takeaway', 'delivery'],
        default: 'takeaway',
    },
    // Legacy order type field
    OrderType: {
        type: String,
        enum: ['Dine-In', 'Takeout', 'Delivery'],
        required: false,
    },
    // Order status (new schema)
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
        default: 'pending',
    },
    // Legacy order status field
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
        required: false,
    },
    // Payment information
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'online', 'other'],
        default: 'cash',
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'pending', 'failed', 'refunded', 'partial'],
        default: 'unpaid',
    },
    // Order notes
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

// Pre-save middleware to generate orderId
orderSchema.pre('save', function(next) {
    if (!this.orderId) {
        // Generate a unique order ID like ORD-20241213-001
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderId = `ORD-${today}-${randomNum}`;
    }
    this.updatedAt = new Date();
    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;