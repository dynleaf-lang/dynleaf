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

// GET /api/public/inventory/reports/summary
// Query: branchId?, restaurantId?, daysUntilExpiry? (default 7)
router.get('/reports/summary', asyncHandler(async (req, res) => {
  const { branchId, restaurantId } = req.query;
  const daysUntilExpiry = parseInt(req.query.daysUntilExpiry || '7', 10) || 7;
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (restaurantId) filter.restaurantId = restaurantId;

  const items = await InventoryItem.find(filter).lean();

  let counts = { in_stock: 0, low: 0, critical: 0, out: 0, expired: 0 };
  let totalStockQty = 0;
  let totalStockValue = 0;
  const now = new Date();
  const soon = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  let expiringSoonCount = 0;

  for (const it of items) {
    const currentQty = it.currentQty ?? 0;
    const low = it.lowThreshold ?? 0;
    const critical = it.criticalThreshold ?? 0;
    let status = 'in_stock';
    if (it.expiryDate && currentQty > 0) {
      const exp = new Date(it.expiryDate);
      if (!isNaN(exp) && exp < now) status = 'expired';
      if (!isNaN(exp) && exp >= now && exp <= soon) expiringSoonCount += 1;
    }
    if (status !== 'expired') {
      status = currentQty <= 0 ? 'out' : (currentQty <= critical ? 'critical' : (currentQty <= low ? 'low' : 'in_stock'));
    }
    counts[status] = (counts[status] || 0) + 1;

    totalStockQty += currentQty;
    if (typeof it.costPrice === 'number') totalStockValue += (currentQty * it.costPrice);
  }

  // Today wastage (qty and value)
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const wastageReasons = ['waste', 'wastage', 'breakage'];
  const adjFilter = {
    reason: { $in: wastageReasons },
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  };
  if (branchId) adjFilter.branchId = branchId;
  if (restaurantId) adjFilter.restaurantId = restaurantId;

  const todaysAdjustments = await InventoryAdjustment.find(adjFilter).lean();
  let todayWastageQty = 0;
  let todayWastageValue = 0;
  // Build a cost map to avoid multiple lookups
  if (todaysAdjustments.length) {
    const ids = Array.from(new Set(todaysAdjustments.map(a => (a.itemId || '').toString()).filter(Boolean)));
    const costMap = new Map((await InventoryItem.find({ _id: { $in: ids } }, { costPrice: 1 }).lean()).map(it => [it._id.toString(), it.costPrice || 0]));
    for (const a of todaysAdjustments) {
      const qty = Math.abs(a.deltaQty || 0);
      todayWastageQty += qty;
      todayWastageValue += qty * (costMap.get((a.itemId || '').toString()) || 0);
    }
  }

  res.json({
    counts,
    totalStockQty,
    totalStockValue,
    expiringSoonCount,
    todayWastageQty,
    todayWastageValue
  });
}));

// GET /api/public/inventory/reports/wastage-trends
// Query: branchId?, restaurantId?, from?, to?, groupBy?(day|week)
router.get('/reports/wastage-trends', asyncHandler(async (req, res) => {
  const { branchId, restaurantId, from, to } = req.query;
  const groupBy = (req.query.groupBy === 'week') ? 'week' : 'day';
  const match = { reason: { $in: ['waste', 'wastage', 'breakage'] } };
  const { Types } = require('mongoose');
  if (branchId) {
    match.branchId = Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : branchId;
  }
  if (restaurantId) {
    match.restaurantId = Types.ObjectId.isValid(restaurantId) ? new Types.ObjectId(restaurantId) : restaurantId;
  }
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    match.createdAt = {};
    if (fromDate && !isNaN(fromDate)) match.createdAt.$gte = fromDate;
    if (toDate && !isNaN(toDate)) match.createdAt.$lte = toDate;
    if (Object.keys(match.createdAt).length === 0) delete match.createdAt;
  }

  const pipeline = [{ $match: match }];
  // Ensure createdAt is present and of date type to avoid $dateToString errors
  pipeline.push({ $match: { createdAt: { $exists: true } } });
  pipeline.push({ $match: { createdAt: { $type: 'date' } } });
  // Compute absolute qty first (coerce to number safely)
  pipeline.push({
    $addFields: {
      absQty: {
        $abs: {
          $convert: { input: '$deltaQty', to: 'double', onError: 0, onNull: 0 }
        }
      }
    }
  });

  let data;
  try {
    if (groupBy === 'week') {
    // Group by ISO week-year to avoid unsupported %G-%V tokens
      pipeline.push({ $addFields: { isoWeek: { $isoWeek: '$createdAt' }, isoYear: { $isoWeekYear: '$createdAt' } } });
      pipeline.push({ $group: { _id: { year: '$isoYear', week: '$isoWeek' }, totalQty: { $sum: '$absQty' } } });
      pipeline.push({ $sort: { '_id.year': 1, '_id.week': 1 } });
      data = await InventoryAdjustment.aggregate(pipeline);
      const points = data.map(d => {
        const w = d._id.week;
        const period = `${d._id.year}-W${String(w).padStart(2, '0')}`;
        return { period, qty: d.totalQty };
      });
      return res.json({ groupBy, points });
    } else {
    // Group by day
      pipeline.push({ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, totalQty: { $sum: '$absQty' } } });
      pipeline.push({ $sort: { _id: 1 } });
      data = await InventoryAdjustment.aggregate(pipeline);
      return res.json({ groupBy, points: data.map(d => ({ period: d._id, qty: d.totalQty })) });
    }
  } catch (err) {
    console.error('[PUBLIC INVENTORY] Wastage trends aggregation error:', err);
    return res.status(500).json({ message: 'Inventory error: wastage trends failed', error: err.message });
  }
}));

// GET /api/public/inventory/reports/adjustments/summary
// Query: branchId?, restaurantId?, from?, to?
router.get('/reports/adjustments/summary', asyncHandler(async (req, res) => {
  const { branchId, restaurantId, from, to } = req.query;
  const match = {};
  const { Types } = require('mongoose');
  if (branchId) match.branchId = Types.ObjectId.isValid(branchId) ? new Types.ObjectId(branchId) : branchId;
  if (restaurantId) match.restaurantId = Types.ObjectId.isValid(restaurantId) ? new Types.ObjectId(restaurantId) : restaurantId;
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    match.createdAt = {};
    if (fromDate && !isNaN(fromDate)) match.createdAt.$gte = fromDate;
    if (toDate && !isNaN(toDate)) match.createdAt.$lte = toDate;
    if (Object.keys(match.createdAt).length === 0) delete match.createdAt;
  }
  let reasonsAgg = [];
  let topItemsAgg = [];
  try {
    reasonsAgg = await InventoryAdjustment.aggregate([
      { $match: match },
      { $addFields: { absQty: { $abs: { $convert: { input: '$deltaQty', to: 'double', onError: 0, onNull: 0 } } } } },
      { $group: { _id: '$reason', qty: { $sum: '$absQty' }, count: { $sum: 1 } } },
      { $sort: { qty: -1 } }
    ]);

    topItemsAgg = await InventoryAdjustment.aggregate([
      { $match: match },
      { $addFields: { absQty: { $abs: { $convert: { input: '$deltaQty', to: 'double', onError: 0, onNull: 0 } } } } },
      { $group: { _id: '$itemId', qty: { $sum: '$absQty' }, count: { $sum: 1 } } },
      { $sort: { qty: -1 } },
      { $limit: 10 }
    ]);
  } catch (err) {
    console.error('[PUBLIC INVENTORY] Adjustments summary aggregation error:', err);
    return res.status(500).json({ message: 'Inventory error: adjustments summary failed', error: err.message });
  }

  // Enrich top items with names/units
  const itemIds = topItemsAgg.map(t => t._id).filter(Boolean);
  const { Types: _Types } = require('mongoose');
  const itemIdsSafe = itemIds
    .filter(id => _Types.ObjectId.isValid(id))
    .map(id => new _Types.ObjectId(id));
  const items = itemIdsSafe.length
    ? await InventoryItem.find({ _id: { $in: itemIdsSafe } }, { name: 1, unit: 1 }).lean()
    : [];
  const nameMap = new Map(items.map(it => [it._id.toString(), { name: it.name, unit: it.unit || null }]));
  const topItems = topItemsAgg.map(t => ({
    itemId: t._id,
    qty: t.qty,
    count: t.count,
    name: nameMap.get((t._id || '').toString())?.name || null,
    unit: nameMap.get((t._id || '').toString())?.unit || null,
  }));

  res.json({ reasons: reasonsAgg.map(r => ({ reason: r._id, qty: r.qty, count: r.count })), topItems });
}));

// GET /api/public/inventory/reports/expiring-soon
// Query: branchId?, restaurantId?, daysUntilExpiry? (default 7)
router.get('/reports/expiring-soon', asyncHandler(async (req, res) => {
  const { branchId, restaurantId } = req.query;
  const daysUntilExpiry = parseInt(req.query.daysUntilExpiry || '7', 10) || 7;
  const now = new Date();
  const soon = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  const filter = { currentQty: { $gt: 0 }, expiryDate: { $gte: now, $lte: soon } };
  if (branchId) filter.branchId = branchId;
  if (restaurantId) filter.restaurantId = restaurantId;

  const items = await InventoryItem.find(filter, { name: 1, unit: 1, currentQty: 1, expiryDate: 1, lowThreshold: 1, criticalThreshold: 1 }).sort({ expiryDate: 1 }).lean();
  const enriched = items.map(it => ({
    ...it,
    status: (it.currentQty <= 0) ? 'out' : (it.currentQty <= (it.criticalThreshold ?? 0)) ? 'critical' : (it.currentQty <= (it.lowThreshold ?? 0)) ? 'low' : 'in_stock'
  }));

  res.json({ items: enriched });
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
