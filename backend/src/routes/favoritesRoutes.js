const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');

// Get customer's favorites
router.get('/:identifier', favoritesController.getFavorites);

// Check if a product is favorite
router.get('/:identifier/:productId', favoritesController.isFavorite);

// Add product to favorites
router.post('/:identifier', favoritesController.addToFavorites);

// Remove product from favorites
router.delete('/:identifier/:productId', favoritesController.removeFromFavorites);

module.exports = router;
