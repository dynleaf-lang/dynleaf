const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const InventoryItem = require('../models/InventoryItem');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const { protect, authorize } = require('../middleware/authMiddleware');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/public/purchases (list)
router.get('/', asyncHandler(async (req, res) => {
  const { branchId, restaurantId, limit = 50 } = req.query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (restaurantId) filter.restaurantId = restaurantId;
  const purchases = await Purchase.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
  res.json({ purchases });
}));

// POST /api/public/purchases (create & adjust inventory)
router.post('/', protect, authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one item is required' });
  }

  // Enforce scope for Branch_Manager/POS_Operator
  if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
    body.branchId = req.user.branchId || body.branchId;
    body.restaurantId = req.user.restaurantId || body.restaurantId;
  }
  if ((req.user.role === 'admin' || req.user.role === 'Super_Admin')) {
    body.restaurantId = body.restaurantId || req.user.restaurantId;
    body.branchId = body.branchId || req.user.branchId;
  }

  // Compute totals
  let subtotal = 0;
  const normalizedItems = [];
  for (const it of items) {
    if (!it.itemId || !mongoose.Types.ObjectId.isValid(it.itemId)) {
      return res.status(400).json({ message: 'Invalid itemId in items' });
    }
    const qty = Number(it.qty);
    if (!isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Each item must have qty > 0' });
    }
    const unitCost = Number(it.unitCost || 0);
    if (!isFinite(unitCost) || unitCost < 0) {
      return res.status(400).json({ message: 'Invalid unitCost' });
    }
    subtotal += qty * unitCost;
    normalizedItems.push({
      itemId: it.itemId,
      name: it.name,
      qty,
      unit: it.unit,
      unitCost,
      notes: it.notes,
    });
  }
  body.subtotal = Number(subtotal.toFixed(2));
  body.tax = Number((Number(body.tax) || 0).toFixed(2));
  body.total = Number((body.subtotal + body.tax).toFixed(2));
  body.createdBy = req.user?._id || req.user?.id;

  const purchase = await Purchase.create({ ...body, items: normalizedItems });

  // Apply inventory adjustments for each item (reason: purchase)
  for (const it of normalizedItems) {
    const invItem = await InventoryItem.findById(it.itemId);
    if (!invItem) continue;
    invItem.currentQty = (invItem.currentQty || 0) + it.qty;
    await invItem.save();

    await InventoryAdjustment.create({
      itemId: invItem._id,
      deltaQty: it.qty,
      reason: 'purchase',
      userId: body.createdBy,
      branchId: invItem.branchId || body.branchId,
      restaurantId: invItem.restaurantId || body.restaurantId,
      notes: body.notes || `Restock via purchase ${purchase._id}`,
    });
  }

  res.status(201).json({ purchase });
}));

// Local error handler
router.use((err, req, res, next) => {
  console.error('[PUBLIC PURCHASE] Error:', err);
  res.status(500).json({ message: 'Purchase error', error: err.message });
});

module.exports = router;
