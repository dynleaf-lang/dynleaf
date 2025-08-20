const mongoose = require('mongoose');

const InventoryAdjustmentSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    deltaQty: { type: Number, required: true },
    reason: { type: String, enum: ['purchase', 'waste', 'wastage', 'breakage', 'manual', 'correction', 'transfer', 'sale'], default: 'correction' },
    refOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    notes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryAdjustment', InventoryAdjustmentSchema);
