const mongoose = require('mongoose');

// Counter doc to generate atomic per-branch per-day token numbers
const OrderTokenCounterSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYYMMDD
  seq: { type: Number, default: 0 }
}, { timestamps: true });

OrderTokenCounterSchema.index({ branchId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('OrderTokenCounter', OrderTokenCounterSchema);
