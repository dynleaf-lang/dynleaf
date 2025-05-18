const mongoose = require('mongoose');

const diningTableSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    tableId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    }, 
    TableName: {
        type: String,
        required: true,
        trim: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    isOccupied: {
        type: Boolean,
        default: false,
    },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
}, {
    timestamps: true,
});

const DiningTable = mongoose.model('DiningTable', diningTableSchema);

module.exports = DiningTable;