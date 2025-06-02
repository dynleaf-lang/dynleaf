const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Floor name is required'],
        trim: true
    },
    level: {
        type: Number,
        required: [true, 'Floor level is required'],
        default: 0 // 0 for ground floor, 1 for first floor, etc.
    },
    description: {
        type: String,
        trim: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Restaurant ID is required']
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: [true, 'Branch ID is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index to ensure floor levels are unique within a branch
floorSchema.index({ branchId: 1, level: 1 }, { unique: true });

const Floor = mongoose.model('Floor', floorSchema);

module.exports = Floor;