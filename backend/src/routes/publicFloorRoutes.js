const express = require('express');
const router = express.Router();
const Floor = require('../models/Floor');
const { publicAccess } = require('../middleware/authMiddleware');

// Make all routes in this file public
router.use(publicAccess);

// Get floors by branch ID
router.get('/branch/:branchId', async (req, res) => {
    try {
        const { branchId } = req.params;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: 'Branch ID is required'
            });
        }

        // Find floors for the branch, sorted by level
        const floors = await Floor.find({ 
            branchId: branchId,
            isActive: true // Only return active floors
        }).sort({ level: 1 });

        res.json(floors);
    } catch (error) {
        console.error('[PUBLIC FLOORS] Error fetching floors by branch:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching floors',
            error: error.message 
        });
    }
});

// Get floors by restaurant ID
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID is required'
            });
        }

        // Find floors for the restaurant, sorted by level
        const floors = await Floor.find({ 
            restaurantId: restaurantId,
            isActive: true // Only return active floors
        }).sort({ level: 1 });

        res.json(floors);
    } catch (error) {
        console.error('[PUBLIC FLOORS] Error fetching floors by restaurant:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching floors',
            error: error.message 
        });
    }
});

// Get all floors (with optional filtering)
router.get('/', async (req, res) => {
    try {
        // Extract query parameters
        const { branchId, restaurantId, isActive } = req.query;
        
        // Build query object based on parameters
        let query = {};
        if (branchId) query.branchId = branchId;
        if (restaurantId) query.restaurantId = restaurantId;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        // Find floors that match the query, sorted by level
        const floors = await Floor.find(query).sort({ level: 1 });
        res.json(floors);
    } catch (error) {
        console.error('[PUBLIC FLOORS] Error fetching floors:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching floors',
            error: error.message 
        });
    }
});

module.exports = router;
