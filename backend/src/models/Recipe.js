const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    name: { type: String },
    qty: { type: Number, required: true, min: 0 },
    unit: { type: String },
    wastePct: { type: Number, min: 0, max: 100, default: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const RecipeSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true, unique: true, index: true },
    ingredients: { type: [IngredientSchema], default: [] },
    totalQty: { type: Number, default: 1 },
    totalUnit: { type: String },
    notes: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', RecipeSchema);
