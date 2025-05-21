const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Get all menu items with restaurant and branch filtering
router.get('/', authenticateJWT, async (req, res) => {
    try {
        let query = {};
        
        // Filter by restaurant if user is not Super_Admin
        if (req.user && req.user.role !== 'Super_Admin' && req.user.restaurantId) {
            query.restaurantId = req.user.restaurantId;
        }
        
        // Filter by restaurant if query param is provided
        if (req.query.restaurantId) {
            query.restaurantId = req.query.restaurantId;
        }
        
        // Filter by branch if query param is provided
        if (req.query.branchId) {
            query.$or = [
                { branchId: req.query.branchId },  // Items specific to this branch
                { branchId: { $exists: false } },  // Items with no branch (available everywhere)
                { branchId: null }                 // Items with null branch (available everywhere)
            ];
        }
        
        const menuItems = await MenuItem.find(query).populate('categoryId', 'name');
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single menu item by ID
router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate('categoryId', 'name');
        
        // Check if menu item exists
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        
        // Check if user has access to this menu item
        if (req.user.role !== 'Super_Admin' && req.user.restaurantId && 
            menuItem.restaurantId !== req.user.restaurantId) {
            return res.status(403).json({ message: 'Access denied to this menu item' });
        }
        
        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new menu item
router.post('/', authenticateJWT, async (req, res) => {
    try {
        const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive, branchId } = req.body;
        
        // Generate a unique itemId if not provided
        const itemId = req.body.itemId || `ITEM_${Date.now()}`;
        
        // Set restaurant ID based on user's context if not Super_Admin
        let restaurantId;
        if (req.user.role === 'Super_Admin') {
            // Super_Admin can specify any restaurant
            restaurantId = req.body.restaurantId || "64daff7c9ea2549d0bd95571"; // Default if not specified
        } else {
            // Non-Super_Admin users can only create items for their restaurant
            restaurantId = req.user.restaurantId;
            
            if (!restaurantId) {
                return res.status(400).json({ 
                    message: 'User does not have a restaurantId assigned. Cannot create menu item.' 
                });
            }
        }
        
        const menuItem = new MenuItem({
            restaurantId,
            itemId,
            name,
            description,
            price,
            categoryId,
            imageUrl,
            isVegetarian: isVegetarian || false,
            tags: tags || [],
            featured: featured || false,
            isActive: isActive !== undefined ? isActive : true,
            // Add branchId if provided (optional)
            ...(branchId && { branchId })
        });
        
        const newMenuItem = await menuItem.save();
        res.status(201).json(newMenuItem);
    } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(400).json({ message: error.message });
    }
});

// Keep the original /items endpoint for backward compatibility
router.post('/items', authenticateJWT, async (req, res) => {
    try {
        const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive, branchId } = req.body;
        
        // Generate a unique itemId if not provided
        const itemId = req.body.itemId || `ITEM_${Date.now()}`;
        
        // Set restaurant ID based on user's context if not Super_Admin
        let restaurantId;
        if (req.user.role === 'Super_Admin') {
            // Super_Admin can specify any restaurant
            restaurantId = req.body.restaurantId || "64daff7c9ea2549d0bd95571"; // Default if not specified
        } else {
            // Non-Super_Admin users can only create items for their restaurant
            restaurantId = req.user.restaurantId;
            
            if (!restaurantId) {
                return res.status(400).json({ 
                    message: 'User does not have a restaurantId assigned. Cannot create menu item.' 
                });
            }
        }
        
        const menuItem = new MenuItem({
            restaurantId,
            itemId,
            name,
            description,
            price,
            categoryId,
            imageUrl,
            isVegetarian: isVegetarian || false,
            tags: tags || [],
            featured: featured || false,
            isActive: isActive !== undefined ? isActive : true,
            // Add branchId if provided (optional)
            ...(branchId && { branchId })
        });
        
        const newMenuItem = await menuItem.save();
        res.status(201).json(newMenuItem);
    } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(400).json({ message: error.message });
    }
});

// Update a menu item
router.put('/:id', authenticateJWT, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        
        // Check if user has permission to update this item
        if (req.user.role !== 'Super_Admin' && 
            (!req.user.restaurantId || menuItem.restaurantId !== req.user.restaurantId)) {
            return res.status(403).json({ message: 'Access denied to modify this menu item' });
        }
        
        // Get the fields to update
        const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive, branchId } = req.body;
        
        // Update the menu item
        const updateData = {
            name,
            description,
            price,
            categoryId,
            imageUrl,
            isVegetarian,
            tags,
            featured,
            isActive
        };
        
        // Handle branchId separately - allow setting to null or a value
        if (branchId !== undefined) {
            updateData.branchId = branchId || null;
        }
        
        const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        res.json(updatedItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a menu item
router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        
        // Check if user has permission to delete this item
        if (req.user.role !== 'Super_Admin' && 
            (!req.user.restaurantId || menuItem.restaurantId !== req.user.restaurantId)) {
            return res.status(403).json({ message: 'Access denied to delete this menu item' });
        }
        
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

