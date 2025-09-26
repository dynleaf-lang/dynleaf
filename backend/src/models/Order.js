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
    // Link order to a POS session (cashier shift) when created from POS
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PosSession',
        required: false,
        index: true,
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
            // Full customizations payload (size/variants/addons/notes, etc.)
            // This preserves selection details for KOT and billing displays
            customizations: {
                type: mongoose.Schema.Types.Mixed,
                required: false,
                default: {}
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
    // Token/KOT number for quick pickup identification
    tokenNumber: {
        type: String,
        required: false,
        trim: true,
        index: true
    },
    // POS staff responsible for the order (denormalized for quick display)
    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    cashierName: {
        type: String,
        required: false,
        trim: true
    },
    // Creator metadata (compatible with existing frontends expecting createdBy fields)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },
    createdByName: {
        type: String,
        required: false,
        trim: true
    },
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
        enum: ['cash', 'card', 'online', 'upi', 'netbanking', 'wallet', 'emi', 'paylater', 'other'],
        default: 'cash',
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'pending', 'failed', 'refunded', 'partial', 'refund_pending'],
        default: 'unpaid',
    },
    // Payment details (for webhook and transaction tracking)
    paymentDetails: {
        cfOrderId: { type: String }, // Cashfree order ID
        cfPaymentId: { type: String }, // Cashfree payment ID
        paymentTime: { type: Date },
        amount: { type: Number },
        status: { type: String },
        method: { type: String },
        message: { type: String },
        errorDetails: { type: mongoose.Schema.Types.Mixed },
        webhookProcessedAt: { type: Date },
        failedAt: { type: Date },
        lastAttempt: {
            method: { type: String },
            status: { type: String },
            droppedAt: { type: Date }
        }
    },
    // Refund details (for refund tracking)
    refundDetails: {
        refundId: { type: String },
        status: { type: String },
        amount: { type: Number },
        note: { type: String },
        processedAt: { type: Date }
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

// Notifications preferences per order (opt-out)
orderSchema.add({
    notifyWhatsApp: {
        type: Boolean,
        default: true,
    }
});

// Pre-save middleware to generate orderId
orderSchema.pre('save', function(next) {
    // Ensure cashier and POS user (createdBy) are the same when one side is provided
    try {
        if (!this.cashierId && this.createdBy) this.cashierId = this.createdBy;
        if (!this.cashierName && this.createdByName) this.cashierName = this.createdByName;
        if (!this.createdBy && this.cashierId) this.createdBy = this.cashierId;
        if (!this.createdByName && this.cashierName) this.createdByName = this.cashierName;
    } catch (_) {}
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