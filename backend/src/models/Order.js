const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    tableId: {
        type: String,
        required: true,
        trim: true,
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    items: [
        {    
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MenuItem',
                required: true,
            },
            categoryId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Category',
                required: true,
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
            specialInstructions: {
                type: String,
                trim: true,
            },
            
        },
    ],
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    tax: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    taxDetails: {
        country: {
            type: String,
            required: true,
            default: 'US'
        },
        taxName: {
            type: String,
            required: true,
            default: 'Sales Tax'
        },
        percentage: {
            type: Number,
            required: true,
            default: 0
        }
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    OrderType: {
        type: String,
        enum: ['Dine-In', 'Takeout', 'Delivery'],
        default: 'Dine-In',
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
        default: 'Pending',
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
   
    

});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;