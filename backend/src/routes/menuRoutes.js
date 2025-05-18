const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem'); 
 
// Get all menu items
router.get('/', async (req, res) => {
    try {
        const menuItems = await MenuItem.find().populate('categoryId', 'name');
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single menu item by ID
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id).populate('categoryId', 'name');
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new menu item - Updated to handle POST at root endpoint
router.post('/', async (req, res) => {
    try {
        const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive } = req.body;
        
        // Generate a unique itemId if not provided
        const itemId = req.body.itemId || `ITEM_${Date.now()}`;
        
        // Set a default restaurantId if not provided
        // In a real application, this would come from the authenticated user's context
        // or would be passed in the request
        const restaurantId = req.body.restaurantId || "64daff7c9ea2549d0bd95571"; // Default restaurant ID
        
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
            isActive: isActive !== undefined ? isActive : true
        });
        
        const newMenuItem = await menuItem.save();
        res.status(201).json(newMenuItem);
    } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(400).json({ message: error.message });
    }
});

// Keep the original /items endpoint for backward compatibility
router.post('/items', async (req, res) => {
    try {
        const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive } = req.body;
        
        // Generate a unique itemId if not provided
        const itemId = req.body.itemId || `ITEM_${Date.now()}`;
        
        // Set a default restaurantId if not provided
        const restaurantId = req.body.restaurantId || "64daff7c9ea2549d0bd95571"; // Default restaurant ID
        
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
            isActive: isActive !== undefined ? isActive : true
        });
        
        const newMenuItem = await menuItem.save();
        res.status(201).json(newMenuItem);
    } catch (error) {
        console.error("Error creating menu item:", error);
        res.status(400).json({ message: error.message });
    }
});

// Update a menu item
router.put('/:id', async (req, res) => {
    const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive } = req.body;
    try {
        const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, {
            name,
            description,
            price,
            categoryId,
            imageUrl,
            isVegetarian,
            tags,
            featured,
            isActive
        }, { new: true });
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        res.json(menuItem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a menu item
router.delete('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;

