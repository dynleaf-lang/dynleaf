const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: false, trim: true, index: true },
    unit: { type: String, required: true, enum: ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'custom'], default: 'pcs' },
    currentQty: { type: Number, required: true, default: 0, min: 0 },
    lowThreshold: { type: Number, required: true, default: 5, min: 0 },
    criticalThreshold: { type: Number, required: true, default: 1, min: 0 },
    isActive: { type: Boolean, default: true },
    category: { type: String, default: 'General' },
    // Descriptive fields
    description: { type: String },
    complianceNotes: { type: String },
    notes: { type: String },

    // Supplier and pricing
    supplierName: { type: String },
    supplierContact: { type: String },
    costPrice: { type: Number },
    salePrice: { type: Number },
    // Single-item expiry date (optional)
    expiryDate: { type: Date },

    // Relations
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
  },
  { timestamps: true }
);

InventoryItemSchema.virtual('status').get(function () {
  // Compute 'expired' if expiryDate is past and there is stock remaining
  const now = new Date();
  if (this.expiryDate && this.currentQty > 0) {
    const exp = new Date(this.expiryDate);
    if (!isNaN(exp) && exp < now) return 'expired';
  }
  if (this.currentQty <= 0) return 'out';
  if (this.currentQty <= (this.criticalThreshold ?? 0)) return 'critical';
  if (this.currentQty <= (this.lowThreshold ?? 0)) return 'low';
  return 'in_stock';
});

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
