const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const { protect, authorize } = require('../middleware/authMiddleware');
const { notifyInventory } = require('../utils/notifier');

// Helper: wrap async
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/public/inventory
// Query: branchId?, restaurantId?, q?, category?, status? (in_stock|low|critical|out|expired), isActive?
router.get('/', asyncHandler(async (req, res) => {
  const { branchId, restaurantId, q, category, status, isActive } = req.query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (restaurantId) filter.restaurantId = restaurantId;
  if (category) filter.category = category;
  if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { sku: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } }
    ];
  }

  let items = await InventoryItem.find(filter).sort({ name: 1 }).lean();

  // status filter (computed)
  if (status) {
    items = items.filter(it => {
      const currentQty = it.currentQty ?? 0;
      const low = it.lowThreshold ?? 0;
      const critical = it.criticalThreshold ?? 0;
      // Compute expired when expiryDate past and stock available
      let computed = 'in_stock';
      const now = new Date();
      if (it.expiryDate && currentQty > 0) {
        const exp = new Date(it.expiryDate);
        if (!isNaN(exp) && exp < now) {
          computed = 'expired';
        }
      }
      if (computed !== 'expired') {
        computed = currentQty <= 0 ? 'out' : (currentQty <= critical ? 'critical' : (currentQty <= low ? 'low' : 'in_stock'));
      }
      return computed === status;
    });
  }

  res.json({ items });
}))
;

// GET /api/public/inventory/adjustments/recent
// Query: branchId?, restaurantId?, reason? (e.g., 'sale'), limit?
router.get('/adjustments/recent', asyncHandler(async (req, res) => {
  const { branchId, restaurantId, reason, limit } = req.query;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (restaurantId) filter.restaurantId = restaurantId;
  if (reason) filter.reason = reason;

  const lim = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 200);

  // Pull recent adjustments
  const adjustments = await InventoryAdjustment.find(filter)
    .sort({ createdAt: -1 })
    .limit(lim)
    .lean();

  // Map item names
  const ids = Array.from(new Set(adjustments.map(a => a.itemId).filter(Boolean)));
  const items = await InventoryItem.find({ _id: { $in: ids } }, { name: 1, unit: 1 }).lean();
  const nameMap = new Map(items.map(it => [it._id.toString(), { name: it.name, unit: it.unit || null }]));

  const withNames = adjustments.map(a => ({
    ...a,
    item: {
      _id: a.itemId,
      name: nameMap.get((a.itemId || '').toString())?.name || null,
      unit: nameMap.get((a.itemId || '').toString())?.unit || null,
    }
  }));

  res.json({ adjustments: withNames });
}));

// POST /api/public/inventory  (create item)
router.post(
  '/',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const allowedUnits = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'custom'];

    // Normalize/validate expiryDate
    if (typeof body.expiryDate === 'string') {
      if (body.expiryDate.trim() === '') {
        delete body.expiryDate;
      } else {
        const d = new Date(body.expiryDate);
        if (isNaN(d)) {
          return res.status(400).json({ message: 'Invalid expiryDate' });
        }
        body.expiryDate = d;
      }
    }

    // Validate unit when provided
    if (body.unit && !allowedUnits.includes(body.unit)) {
      return res.status(400).json({ message: `Invalid unit. Allowed: ${allowedUnits.join(', ')}` });
    }

    // Enforce scoping for Branch_Manager and POS_Operator: must set to their branch/restaurant
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      body.branchId = req.user.branchId || body.branchId;
      body.restaurantId = req.user.restaurantId || body.restaurantId;
    }

    // For admin/Super_Admin, if not provided, default to their scope when present
    if ((req.user.role === 'admin' || req.user.role === 'Super_Admin')) {
      body.restaurantId = body.restaurantId || req.user.restaurantId;
      body.branchId = body.branchId || req.user.branchId;
    }

    const item = await InventoryItem.create(body);
    res.status(201).json({ item });
  })
);

// PATCH /api/public/inventory/:id  (update item)
router.patch(
  '/:id',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    const allowedUnits = ['pcs', 'kg', 'g', 'L', 'ml', 'pack', 'box', 'custom'];

    // Normalize/validate expiryDate
    if (typeof body.expiryDate === 'string') {
      if (body.expiryDate.trim() === '') {
        body.expiryDate = undefined;
      } else {
        const d = new Date(body.expiryDate);
        if (isNaN(d)) {
          return res.status(400).json({ message: 'Invalid expiryDate' });
        }
        body.expiryDate = d;
      }
    }

    // Validate unit when provided
    if (body.unit && !allowedUnits.includes(body.unit)) {
      return res.status(400).json({ message: `Invalid unit. Allowed: ${allowedUnits.join(', ')}` });
    }

    // Load existing item to enforce scope
    const existing = await InventoryItem.findById(id);
    if (!existing) return res.status(404).json({ message: 'Inventory item not found' });

    // Branch manager and POS operator can only modify within their branch/restaurant
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      if (
        (existing.branchId && req.user.branchId && existing.branchId.toString() !== req.user.branchId.toString()) ||
        (existing.restaurantId && req.user.restaurantId && existing.restaurantId.toString() !== req.user.restaurantId.toString())
      ) {
        return res.status(403).json({ message: 'Not allowed to modify items outside your branch/restaurant' });
      }
      // Prevent reassigning to another branch/restaurant
      body.branchId = existing.branchId;
      body.restaurantId = existing.restaurantId;
    }

    const item = await InventoryItem.findByIdAndUpdate(id, body, { new: true });
    res.json({ item });
  })
);

// POST /api/public/inventory/:id/adjust  (adjust quantity)
router.post(
  '/:id/adjust',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { deltaQty, reason, refOrderId, notes } = req.body || {};
    if (typeof deltaQty !== 'number' || !isFinite(deltaQty)) {
      return res.status(400).json({ message: 'deltaQty (number) is required' });
    }
    // Validate reason against allowed values (must match model enum)
    const allowedReasons = ['purchase', 'waste', 'wastage', 'breakage', 'manual', 'correction', 'transfer', 'sale'];
    let sanitizedReason = reason || 'correction';
    if (!allowedReasons.includes(sanitizedReason)) {
      return res.status(400).json({ message: `Invalid reason. Allowed: ${allowedReasons.join(', ')}` });
    }

    // Validate refOrderId if provided
    let orderId = undefined;
    if (refOrderId) {
      const isValid = require('mongoose').Types.ObjectId.isValid(refOrderId);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid refOrderId' });
      }
      orderId = refOrderId;
    }
    const item = await InventoryItem.findById(id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    // Scope check for Branch_Manager and POS_Operator
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      if (
        (item.branchId && req.user.branchId && item.branchId.toString() !== req.user.branchId.toString()) ||
        (item.restaurantId && req.user.restaurantId && item.restaurantId.toString() !== req.user.restaurantId.toString())
      ) {
        return res.status(403).json({ message: 'Not allowed to adjust items outside your branch/restaurant' });
      }
    }

    const prevQty = item.currentQty || 0;
    item.currentQty = (item.currentQty || 0) + deltaQty;
    await item.save();

    const adj = await InventoryAdjustment.create({
      itemId: item._id,
      deltaQty,
      reason: sanitizedReason,
      refOrderId: orderId,
      userId: req.user?._id || req.user?.id || undefined,
      branchId: item.branchId,
      restaurantId: item.restaurantId,
      notes
    });

    if (global.io) {
      try {
        if (item.branchId) {
          global.io.to(`pos_branch_${item.branchId}`).emit('inventoryUpdate', {
            itemId: item._id.toString(),
            currentQty: item.currentQty,
            status: (item.currentQty <= 0) ? 'out' : (item.currentQty <= (item.criticalThreshold ?? 0)) ? 'critical' : (item.currentQty <= (item.lowThreshold ?? 0)) ? 'low' : 'in_stock'
          });

          // Emit inventory notification for wastage and status thresholds
          const statusNow = (item.currentQty <= 0) ? 'out' : (item.currentQty <= (item.criticalThreshold ?? 0)) ? 'critical' : (item.currentQty <= (item.lowThreshold ?? 0)) ? 'low' : 'in_stock';
          const statusPrev = (prevQty <= 0) ? 'out' : (prevQty <= (item.criticalThreshold ?? 0)) ? 'critical' : (prevQty <= (item.lowThreshold ?? 0)) ? 'low' : 'in_stock';

          if (sanitizedReason === 'wastage' || sanitizedReason === 'waste' || sanitizedReason === 'breakage') {
            notifyInventory(global.io, {
              type: 'wastage',
              item,
              qty: deltaQty,
              reason: sanitizedReason,
              notes,
            });
          }

          if (statusNow !== statusPrev && (statusNow === 'low' || statusNow === 'critical' || statusNow === 'out')) {
            notifyInventory(global.io, {
              type: 'status',
              item,
              status: statusNow,
            });
          }
        }
      } catch (e) {
        console.warn('[INVENTORY] Socket broadcast error', e.message);
      }
    }

    res.json({ item, adjustment: adj });
  })
);

// GET /api/public/inventory/:id/adjustments (history)
router.get('/:id/adjustments', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const adjustments = await InventoryAdjustment.find({ itemId: id }).sort({ createdAt: -1 }).lean();
  res.json({ adjustments });
}));

// Error handler (local to this router)
router.use((err, req, res, next) => {
  console.error('[PUBLIC INVENTORY] Error:', err);
  res.status(500).json({ message: 'Inventory error', error: err.message });
});

module.exports = router;
