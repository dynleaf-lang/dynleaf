const mongoose = require('mongoose');

const PosSessionSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: false, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openAt: { type: Date, default: Date.now },
    closeAt: { type: Date },
    openingFloat: { type: Number, default: 0 },
    closingCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    cashVariance: { type: Number, default: 0 },
    totals: {
      ordersCount: { type: Number, default: 0 },
      grossSales: { type: Number, default: 0 },
      netSales: { type: Number, default: 0 },
      discounts: { type: Number, default: 0 },
      refunds: { type: Number, default: 0 },
      byPayment: {
        cash: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        online: { type: Number, default: 0 }
      }
    },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PosSession', PosSessionSchema);
