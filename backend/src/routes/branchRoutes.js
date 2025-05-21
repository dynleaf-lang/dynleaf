const express = require('express');
const router = express.Router();
const Branch = require('../models/Branches');
const { authenticateJWT } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Get all branches with restaurant filtering
router.get('/', authenticateJWT, async (req, res) => {
    try {
        let query = {};
        
        // Filter by restaurant if user is not Super_Admin
        if (req.user && req.user.role !== 'Super_Admin' && req.user.restaurantId) {
            query.restaurantId = req.user.restaurantId;
        }
        
        const branches = await Branch.find(query);
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get branches by restaurant ID
router.get('/restaurant/:restaurantId', authenticateJWT, async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        if (!restaurantId) {
            return res.status(400).json({ message: 'Restaurant ID is required' });
        }
        
        // Convert restaurantIds to strings for comparison to avoid ObjectId vs String issues
        const userRestaurantIdStr = req.user.restaurantId ? req.user.restaurantId.toString() : '';
        const requestedRestaurantIdStr = restaurantId ? restaurantId.toString() : '';
        
        // For Super_Admin, allow access to any restaurant's branches
        if (req.user.role === 'Super_Admin') {
            // Super_Admin can view any branches
            const branches = await Branch.find({ restaurantId });
            return res.json(branches);
        }

        // For all other users, allow access without restriction
        // You may want to add more granular permissions in the future
        const branches = await Branch.find({ restaurantId });
        
        // Log access by non-matching restaurant users for security auditing
        if (userRestaurantIdStr && userRestaurantIdStr !== requestedRestaurantIdStr) {
            console.log(`User ${req.user.email || req.user.id} (${req.user.role}) with restaurant ID ${userRestaurantIdStr} is accessing branches for restaurant ${requestedRestaurantIdStr}`);
        }
        
        return res.json(branches);
    } catch (error) {
        console.error('Error in GET /branches/restaurant/:restaurantId:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get a single branch by ID
router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        
        // Check if branch exists
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        
        // Convert IDs to strings for proper comparison
        const userRestaurantIdStr = req.user.restaurantId ? req.user.restaurantId.toString() : '';
        const branchRestaurantIdStr = branch.restaurantId ? branch.restaurantId.toString() : '';
        
        // Check if user has access to this branch's restaurant
        if (req.user.role !== 'Super_Admin' && userRestaurantIdStr && 
            branchRestaurantIdStr !== userRestaurantIdStr) {
            return res.status(403).json({ message: 'Access denied to this branch' });
        }
        
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new branch
router.post('/', authenticateJWT, async (req, res) => {
    try {
        const { name, address, phone, email, openingHours } = req.body;
        
        // Set restaurant ID based on user's context if not Super_Admin
        let restaurantId;
        if (req.user.role === 'Super_Admin') {
            // Super_Admin can specify any restaurant
            restaurantId = req.body.restaurantId;
            if (!restaurantId) {
                return res.status(400).json({ message: 'Restaurant ID is required' });
            }
        } else {
            // Non-Super_Admin users can only create branches for their restaurant
            restaurantId = req.user.restaurantId;
            
            if (!restaurantId) {
                return res.status(400).json({ 
                    message: 'User does not have a restaurantId assigned. Cannot create branch.' 
                });
            }
        }
        
        const branch = new Branch({
            restaurantId,
            name,
            address,
            phone,
            email,
            openingHours
        });
        
        const newBranch = await branch.save();
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a branch
router.put('/:id', authenticateJWT, async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        
        // Convert IDs to strings for proper comparison
        const userRestaurantIdStr = req.user.restaurantId ? req.user.restaurantId.toString() : '';
        const branchRestaurantIdStr = branch.restaurantId ? branch.restaurantId.toString() : '';
        
        // Check if user has permission to update this branch
        if (req.user.role !== 'Super_Admin' && 
            (!userRestaurantIdStr || branchRestaurantIdStr !== userRestaurantIdStr)) {
            return res.status(403).json({ message: 'Access denied to modify this branch' });
        }
        
        // Get the fields to update
        const { name, address, phone, email, openingHours } = req.body;
        
        // Update the branch
        const updatedBranch = await Branch.findByIdAndUpdate(req.params.id, {
            name,
            address,
            phone,
            email,
            openingHours
        }, { new: true });
        
        res.json(updatedBranch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a branch
router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        
        // Convert IDs to strings for proper comparison
        const userRestaurantIdStr = req.user.restaurantId ? req.user.restaurantId.toString() : '';
        const branchRestaurantIdStr = branch.restaurantId ? branch.restaurantId.toString() : '';
        
        // Check if user has permission to delete this branch
        if (req.user.role !== 'Super_Admin' && 
            (!userRestaurantIdStr || branchRestaurantIdStr !== userRestaurantIdStr)) {
            return res.status(403).json({ message: 'Access denied to delete this branch' });
        }
        
        await Branch.findByIdAndDelete(req.params.id);
        res.json({ message: 'Branch deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;