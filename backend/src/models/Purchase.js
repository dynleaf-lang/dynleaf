const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    name: { type: String },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String },
    unitCost: { type: Number, required: false, min: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const PurchaseSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    supplierContact: { type: String },

    referenceNo: { type: String, index: true },
    invoiceNumber: { type: String },
    purchaseDate: { type: Date, default: Date.now },

    items: { type: [PurchaseItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    notes: { type: String },
    status: { type: String, enum: ['draft', 'received', 'cancelled'], default: 'received' },

    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', PurchaseSchema);
