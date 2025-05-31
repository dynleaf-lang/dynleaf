const express = require('express');
const router = express.Router();
const { 
  getAllTaxes, 
  getTaxByCountry, 
  createTax, 
  updateTax, 
  deleteTax 
} = require('../controllers/taxController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes
router.route('/')
  .get(protect, getAllTaxes)
  .post(protect, authorize('admin', 'Super_Admin'), createTax);

router.route('/:country')
  .get(protect, getTaxByCountry)
  .put(protect, authorize('admin', 'Super_Admin'), updateTax)
  .delete(protect, authorize('admin', 'Super_Admin'), deleteTax);

module.exports = router;