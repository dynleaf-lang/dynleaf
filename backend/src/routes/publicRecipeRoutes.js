const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const { protect, authorize } = require('../middleware/authMiddleware');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/public/recipes/:menuItemId
router.get('/:menuItemId', asyncHandler(async (req, res) => {
  const { menuItemId } = req.params;
  const { branchId, restaurantId } = req.query;
  const filter = { menuItemId };
  if (restaurantId) filter.restaurantId = restaurantId;
  if (branchId) filter.branchId = branchId;
  const recipe = await Recipe.findOne(filter).lean();
  res.json({ recipe: recipe || null });
}));

// PUT /api/public/recipes/:menuItemId
router.put('/:menuItemId', protect, authorize('admin', 'Branch_Manager', 'Super_Admin'), asyncHandler(async (req, res) => {
  const { menuItemId } = req.params;
  const body = req.body || {};

  // enforce scope for non-super roles
  if (req.user?.role === 'Branch_Manager') {
    body.branchId = req.user.branchId || body.branchId;
    body.restaurantId = req.user.restaurantId || body.restaurantId;
  } else if (req.user?.role === 'admin') {
    body.restaurantId = body.restaurantId || req.user.restaurantId;
    body.branchId = body.branchId || req.user.branchId;
  }

  body.menuItemId = menuItemId;
  body.updatedBy = req.user?._id || req.user?.id;
  if (!body.createdBy) body.createdBy = body.updatedBy;

  const upsert = await Recipe.findOneAndUpdate(
    { menuItemId },
    body,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.json({ recipe: upsert });
}));

router.use((err, req, res, next) => {
  console.error('[PUBLIC RECIPES] Error:', err);
  res.status(500).json({ message: 'Recipe error', error: err.message });
});

module.exports = router;
