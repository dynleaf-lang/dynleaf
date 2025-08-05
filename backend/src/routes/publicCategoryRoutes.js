const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { publicAccess } = require('../middleware/authMiddleware');

// Make all routes in this file public
router.use(publicAccess);

// Get all categories for a specific restaurant (for POS system)
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        console.log(`[DEBUG] Fetching categories for restaurant: ${restaurantId}`);
        
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid restaurant ID format' });
        }
        
        // Get all categories for this restaurant (across all branches)
        const categories = await Category.find({
            restaurantId,
            isDeleted: { $ne: true }
        })
        .populate('parentCategory', 'name categoryId')
        .sort({ displayOrder: 1, name: 1 })
        .lean();
        
        console.log(`[DEBUG] Found ${categories.length} categories for restaurant`);
        
        // Return in the format expected by POS frontend
        res.json({ categories });
        
    } catch (error) {
        console.error('[PUBLIC API ERROR] Error fetching categories for restaurant:', error);
        res.status(500).json({ 
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Get categories for a specific branch (fallback endpoint)
router.get('/branch/:branchId', async (req, res) => {
    try {
        const { branchId } = req.params;
        
        console.log(`[DEBUG] Fetching categories for branch: ${branchId}`);
        
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }
        
        // Get branch info to find restaurant
        const Branch = mongoose.model('Branch');
        const branch = await Branch.findById(branchId).lean();
        
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        // Get categories for this branch or restaurant-wide categories
        const categories = await Category.find({
            restaurantId: branch.restaurantId,
            isDeleted: { $ne: true },
            $or: [
                { branchId },
                { branchId: { $exists: false } },
                { branchId: null }
            ]
        })
        .populate('parentCategory', 'name categoryId')
        .sort({ displayOrder: 1, name: 1 })
        .lean();
        
        console.log(`[DEBUG] Found ${categories.length} categories for branch`);
        
        // Return in the format expected by frontend
        res.json({ categories });
        
    } catch (error) {
        console.error('[PUBLIC API ERROR] Error fetching categories for branch:', error);
        res.status(500).json({ 
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

module.exports = router;
