const express = require('express');
const router = express.Router();
const Branch = require('../models/Branches'); 
const mongoose = require('mongoose'); 
const Restaurant = require('../models/Restaurant'); 
const { publicAccess } = require('../middleware/authMiddleware');

// Make all routes in this file public
router.use(publicAccess);

// Debug middleware for this router
router.use((req, res, next) => {
    console.log(`[PUBLIC BRANCHES DEBUG] ${req.method} ${req.originalUrl}`);
    next();
});

// Sample data route for testing
router.get('/sample', async (req, res) => {
    console.log('[DEBUG] Branch sample data route accessed');
    return res.json([
        {
            _id: '60d21b4667d0d8992e610c90',
            name: 'Downtown Branch',
            address: '123 Main St, Downtown',
            location: {
                type: 'Point',
                coordinates: [-73.9857, 40.7484]
            },
            contactNumber: '+1234567890',
            email: 'downtown@example.com',
            restaurantId: '60d21b4667d0d8992e610c70',
            isActive: true,
            isDeleted: false
        },
        {
            _id: '60d21b4667d0d8992e610c91',
            name: 'Uptown Branch',
            address: '456 Park Ave, Uptown',
            location: {
                type: 'Point',
                coordinates: [-73.9627, 40.7725]
            },
            contactNumber: '+1987654321',
            email: 'uptown@example.com',
            restaurantId: '60d21b4667d0d8992e610c70',
            isActive: true,
            isDeleted: false
        }
    ]);
});

// Get all active branches for a restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid restaurant ID format' });
        }        console.log(`[DEBUG] Searching for branches with restaurantId: ${restaurantId}`);
        
        // First check if any branches exist regardless of filters
        const allBranchesCount = await Branch.countDocuments({ restaurantId });
        console.log(`[DEBUG] Total branches found for restaurant (no filters): ${allBranchesCount}`);
        
        // Try to find all branches without any filters first
        const allBranches = await Branch.find({ restaurantId }).lean();
        console.log(`[DEBUG] All branches without filters: ${allBranches.length}`);
        console.log(`[DEBUG] First branch fields:`, allBranches.length > 0 ? Object.keys(allBranches[0]) : 'No branches');
        
        // Check if the branches have different field names for active/deleted status
        if (allBranches.length > 0) {
            const firstBranch = allBranches[0];
            console.log(`[DEBUG] Branch status fields:`, {
                isActive: firstBranch.isActive,
                active: firstBranch.active,
                isDeleted: firstBranch.isDeleted,
                deleted: firstBranch.deleted
            });
        }
          // Now try with more flexible filters
        const branches = await Branch.find({
            restaurantId,
            $and: [
                // Check if active (using different possible field names)
                { $or: [
                    { isActive: true },
                    { active: true },
                    { isActive: { $exists: false } } // Allow if field doesn't exist
                ]},
                // Check if not deleted (using different possible field names)
                { $or: [
                    { isDeleted: false },
                    { deleted: false },
                    { isDeleted: { $exists: false } } // Allow if field doesn't exist
                ]}
            ]
        })
        .select('name address location contactNumber email openingHours')
        .sort({ name: 1 })
        .lean();

        console.log(`[DEBUG] Branches returned after filtering: ${branches.length}`);
        
        // Return results
        res.json(branches);
    } catch (error) {
        console.error('Error fetching restaurant branches:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get branch details by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`[DEBUG] Fetching branch with ID: ${id}`);
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }
        
        // First try to find the branch without any filters to check if it exists at all
        const branchExists = await Branch.findById(id).lean();
        if (!branchExists) {
            console.log(`[DEBUG] Branch with ID ${id} does not exist in database`);
            return res.status(404).json({ message: 'Branch not found in database' });
        }
        
        console.log(`[DEBUG] Branch exists, checking active status:`, {
            isActive: branchExists.isActive,
            isDeleted: branchExists.isDeleted
        });        // Now find with filters and populate the restaurant
        const branch = await Branch.findOne({
            _id: id,
            $and: [
                // Check if active (using different possible field names)
                { $or: [
                    { isActive: true },
                    { active: true },
                    { isActive: { $exists: false } } // Allow if field doesn't exist
                ]},
                // Check if not deleted (using different possible field names)
                { $or: [
                    { isDeleted: false },
                    { deleted: false },
                    { isDeleted: { $exists: false } } // Allow if field doesn't exist
                ]}
            ]
        })
        .lean();

        if (!branch) {
            console.log(`[DEBUG] Branch found but filtered out due to inactive/deleted status`);
            return res.status(404).json({ message: 'Branch not found or inactive' });
        }
        
        // Get the complete restaurant details for this branch
        let restaurant = null;
        try {
            if (branch.restaurantId) {
                console.log(`[DEBUG] Looking up restaurant with ID: ${branch.restaurantId}`);
                restaurant = await Restaurant.findOne({
                    _id: branch.restaurantId
                })
                .lean(); // Get all fields, not just name and logo
                
                if (!restaurant) {
                    console.log(`[DEBUG] Restaurant with ID ${branch.restaurantId} not found`);
                } else {
                    console.log(`[DEBUG] Restaurant found:`, restaurant.name);
                }
            } else {
                console.log(`[DEBUG] Branch has no restaurantId field`);
            }
        } catch (restaurantError) {
            console.error('Error fetching restaurant details:', restaurantError);
            // Continue execution even if restaurant lookup fails
        }        // Return branch data with complete restaurant info
        res.json({
            ...branch,
            restaurant: restaurant || null
        });
    } catch (error) {
        console.error('Error fetching branch details:', error);
        res.status(500).json({ message: error.message });
    }
});

// Search nearby branches based on location
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 10 } = req.query; // radius in km, default 10km
        
        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusInKm = parseFloat(radius);
        
        if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusInKm)) {
            return res.status(400).json({ message: 'Invalid location or radius values' });
        }        // Find branches near the specified location with more flexible filters
        const branches = await Branch.find({
            $and: [
                // Check if active (using different possible field names)
                { $or: [
                    { isActive: true },
                    { active: true },
                    { isActive: { $exists: false } } // Allow if field doesn't exist
                ]},
                // Check if not deleted (using different possible field names)
                { $or: [
                    { isDeleted: false },
                    { deleted: false },
                    { isDeleted: { $exists: false } } // Allow if field doesn't exist
                ]}
            ],
            'location.coordinates': {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInKm / 6371] // Earth's radius in km is 6371
                }
            }
        })
        .select('name address location restaurantId')
        .lean();

        // Get restaurant details for the branches
        const restaurantIds = [...new Set(branches.map(branch => branch.restaurantId))];
        const restaurants = await Restaurant.find({
            _id: { $in: restaurantIds },
            isActive: true
        })
        .select('name logo')
        .lean();

        const restaurantMap = restaurants.reduce((map, restaurant) => {
            map[restaurant._id.toString()] = restaurant;
            return map;
        }, {});

        // Add restaurant details to each branch
        const branchesWithRestaurants = branches.map(branch => ({
            ...branch,
            restaurant: restaurantMap[branch.restaurantId.toString()] || {}
        }));

        res.json(branchesWithRestaurants);
    } catch (error) {
        console.error('Error searching nearby branches:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 