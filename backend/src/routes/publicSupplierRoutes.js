const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper: wrap async
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/public/suppliers
// Query: restaurantId?, branchId?, q?, isActive?
router.get('/', asyncHandler(async (req, res) => {
  const { restaurantId, branchId, q, isActive } = req.query;
  const filter = {};
  if (restaurantId) filter.restaurantId = restaurantId;
  if (branchId) filter.branchId = branchId;
  if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { contactPerson: { $regex: q, $options: 'i' } },
      { gstNumber: { $regex: q, $options: 'i' } }
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ name: 1 }).lean();
  res.json({ suppliers });
}));

// GET /api/public/suppliers/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const sup = await Supplier.findById(req.params.id).lean();
  if (!sup) return res.status(404).json({ message: 'Supplier not found' });
  res.json({ supplier: sup });
}));

// POST /api/public/suppliers (create)
router.post(
  '/',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    // Enforce scope for Branch_Manager and POS_Operator
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      body.branchId = req.user.branchId || body.branchId;
      body.restaurantId = req.user.restaurantId || body.restaurantId;
    }

    // For admin/Super_Admin, default to their scope if present
    if (req.user.role === 'admin' || req.user.role === 'Super_Admin') {
      body.restaurantId = body.restaurantId || req.user.restaurantId;
      body.branchId = body.branchId || req.user.branchId;
    }

    const created = await Supplier.create(body);
    res.status(201).json({ supplier: created });
  })
);

// PATCH /api/public/suppliers/:id (update)
router.patch(
  '/:id',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await Supplier.findById(id);
    if (!existing) return res.status(404).json({ message: 'Supplier not found' });

    // Branch_Manager and POS_Operator can only modify within their scope
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      if (
        (existing.branchId && req.user.branchId && existing.branchId.toString() !== req.user.branchId.toString()) ||
        (existing.restaurantId && req.user.restaurantId && existing.restaurantId.toString() !== req.user.restaurantId.toString())
      ) {
        return res.status(403).json({ message: 'Not allowed to modify suppliers outside your branch/restaurant' });
      }
    }

    // Prevent scope reassignment on update for non-admin roles
    const update = { ...req.body };
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      update.branchId = existing.branchId;
      update.restaurantId = existing.restaurantId;
    }

    const updated = await Supplier.findByIdAndUpdate(id, update, { new: true });
    res.json({ supplier: updated });
  })
);

// DELETE /api/public/suppliers/:id
router.delete(
  '/:id',
  protect,
  authorize('admin', 'Branch_Manager', 'POS_Operator', 'Super_Admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await Supplier.findById(id);
    if (!existing) return res.status(404).json({ message: 'Supplier not found' });

    // Scope check
    if (req.user.role === 'Branch_Manager' || req.user.role === 'POS_Operator') {
      if (
        (existing.branchId && req.user.branchId && existing.branchId.toString() !== req.user.branchId.toString()) ||
        (existing.restaurantId && req.user.restaurantId && existing.restaurantId.toString() !== req.user.restaurantId.toString())
      ) {
        return res.status(403).json({ message: 'Not allowed to delete suppliers outside your branch/restaurant' });
      }
    }

    await Supplier.findByIdAndDelete(id);
    res.json({ message: 'Supplier deleted' });
  })
);

// Local error handler
router.use((err, req, res, next) => {
  console.error('[PUBLIC SUPPLIERS] Error:', err);
  res.status(500).json({ message: 'Suppliers error', error: err.message });
});

module.exports = router;
