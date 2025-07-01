/**
 * Public Tax Routes
 * These routes provide tax information for the customer frontend
 * without requiring authentication
 */

const express = require('express');
const router = express.Router();
const { getTaxByCountry } = require('../controllers/taxController');

// Public route to get tax by country code
router.route('/:country').get(getTaxByCountry);

module.exports = router;
