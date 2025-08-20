const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    address: { type: String, trim: true },
    gstNumber: { type: String, trim: true }, // GST/VAT or tax id
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },

    // Business scoping
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: 1, restaurantId: 1, branchId: 1 }, { unique: false });

module.exports = mongoose.model('Supplier', SupplierSchema);
