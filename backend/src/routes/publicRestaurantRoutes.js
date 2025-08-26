const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

// GET /api/public/restaurants/:id - Get restaurant details for currency/country info
router.get('/:id', async (req, res) => {
  try {
    console.log(`[PUBLIC RESTAURANTS] Fetching restaurant: ${req.params.id}`);
    
  const restaurant = await Restaurant.findById(req.params.id).select('name brandName logo country address phone email');
    
    if (!restaurant) {
      console.log(`[PUBLIC RESTAURANTS] Restaurant not found: ${req.params.id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Restaurant not found' 
      });
    }

    console.log(`[PUBLIC RESTAURANTS] Restaurant found: ${restaurant.name}, Country: ${restaurant.country}`);
    
    res.json({
      success: true,
      restaurant: {
        _id: restaurant._id,
  name: restaurant.name,
  brandName: restaurant.brandName || undefined,
  logo: restaurant.logo || undefined,
        country: restaurant.country,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email
      }
    });
  } catch (error) {
    console.error('[PUBLIC RESTAURANTS] Error fetching restaurant:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
