const express = require('express');
const router = express.Router();
const Category = require('../models/Category'); 

// Get all categories 
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().populate('restaurantId', 'name');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get categories by restaurant ID
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const categories = await Category.find({ restaurantId: req.params.restaurantId }).populate('restaurantId', 'name');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('restaurantId', 'name');
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new category
router.post('/', async (req, res) => {
    const { restaurantId, categoryId, name, description, imageUrl, tags, isActive } = req.body;
    const category = new Category({
        restaurantId,
        categoryId: categoryId || `CAT_${Date.now()}`,
        name,
        description,
        imageUrl,
        tags: tags || [],
        isActive: isActive !== undefined ? isActive : true
    });
    try {
        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a category
router.put('/:id', async (req, res) => {
    const { name, description, imageUrl, tags, isActive } = req.body;
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, {
            name,
            description,
            imageUrl,
            tags,
            isActive
        }, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a category
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Export the router
module.exports = router;