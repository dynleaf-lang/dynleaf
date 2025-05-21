const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authenticateJWT } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Utility function to ensure IDs are properly formatted for comparison
const formatIdForQuery = (id) => {
    try {
        if (!id) return null;
        // If it's already an ObjectId, return it
        if (id instanceof mongoose.Types.ObjectId) return id;
        // Otherwise convert to ObjectId if possible
        if (mongoose.Types.ObjectId.isValid(id)) {
            return mongoose.Types.ObjectId(id);
        }
        // If not valid, return the original (for logging purposes)
        return id;
    } catch (error) {
        console.error("Error formatting ID:", error);
        return id;
    }
};

// Get all categories with restaurant filtering
router.get('/', authenticateJWT, async (req, res) => {
    try {
        // Apply user role-based filtering
        let query = {};
        
        // Debug JWT token information
        console.log('User from JWT token:', {
            id: req.user.id,
            role: req.user.role,
            restaurantId: req.user.restaurantId,
            branchId: req.user.branchId
        });
        
        // Super_Admin can see all categories
        if (req.user.role !== 'Super_Admin') {
            // If user doesn't have a restaurant assigned and they're not Super_Admin
            if (!req.user.restaurantId) {
                console.log('Non-Super_Admin user with no restaurant assignment');
                return res.status(400).json({ 
                    message: 'You must have a restaurant assigned to view categories',
                    errorCode: 'NO_RESTAURANT_ASSIGNED'
                });
            }
            
            // For non-Super_Admin users, filter by their assigned restaurant
            query.restaurantId = req.user.restaurantId;
            console.log('Filtering categories by restaurant:', req.user.restaurantId);
            
            // If user has a branch assignment, further filter by that branch
            if (req.user.branchId) {
                console.log('User has branch assignment:', req.user.branchId);
                
                // Show categories that either match the user's branch or have no branch specified
                query.$or = [
                    { branchId: req.user.branchId },
                    { branchId: { $exists: false } },
                    { branchId: null }
                ];
            }
        }
        
        console.log('Final category query:', JSON.stringify(query));
        const categories = await Category.find(query);
        console.log(`Found ${categories.length} categories`);
        
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get a single category by ID
router.get('/:id', authenticateJWT, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        // Check if category exists
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // Permission check - non-Super_Admin users can only access categories from their restaurant
        if (req.user.role !== 'Super_Admin') {
            // Check if category belongs to user's restaurant - convert both to strings for comparison
            if (String(category.restaurantId) !== String(req.user.restaurantId)) {
                return res.status(403).json({ message: 'Access denied. This category belongs to a different restaurant.' });
            }
            
            // If user has a branch assignment, check branch permission - convert both to strings
            if (req.user.branchId && category.branchId && String(category.branchId) !== String(req.user.branchId)) {
                return res.status(403).json({ message: 'Access denied. This category belongs to a different branch.' });
            }
        }
        
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new category
router.post('/', authenticateJWT, async (req, res) => {
    try {
        console.log("Category creation attempt with data:", req.body);
        let { name, description, branchId, restaurantId, imageUrl, tags, isActive } = req.body;
        
        // For non-Super_Admin users, override the restaurantId with their assigned restaurant
        if (req.user.role !== 'Super_Admin') {
            // Check if user has a restaurant assigned
            if (!req.user.restaurantId) {
                console.error("Non-Super_Admin user without restaurant assignment attempting to create category");
                return res.status(400).json({ 
                    message: 'Your account does not have a restaurant assigned. Please contact an administrator.',
                    errorCode: 'NO_RESTAURANT_ASSIGNED'
                });
            }
            
            // Force the restaurantId to be the user's assigned restaurant
            restaurantId = req.user.restaurantId;
            console.log("Using user's assigned restaurantId:", restaurantId);
            
            // If user has a branchId, enforce it
            if (req.user.branchId) {
                branchId = req.user.branchId;
                console.log("Using user's assigned branchId:", branchId);
            }
        }
        
        if (!restaurantId) {
            return res.status(400).json({ 
                message: 'Restaurant ID is required',
                errorCode: 'MISSING_RESTAURANT_ID' 
            });
        }
        
        // Generate a unique categoryId
        const categoryId = `CAT_${Date.now()}`;
        
        const categoryData = {
            restaurantId: restaurantId,
            categoryId,
            name,
            description,
            imageUrl,
            tags: tags || [],
            isActive: isActive !== undefined ? isActive : true
        };
        
        // Only include branchId if it has a value
        if (branchId) {
            categoryData.branchId = branchId;
        }
        
        console.log("Creating category with data:", categoryData);
        const category = new Category(categoryData);
        
        try {
            const newCategory = await category.save();
            console.log("Category created successfully:", newCategory._id);
            res.status(201).json(newCategory);
        } catch (saveError) {
            console.error("Mongoose validation error:", saveError);
            
            if (saveError.name === 'ValidationError') {
                const validationErrors = Object.keys(saveError.errors).map(field => ({
                    field,
                    message: saveError.errors[field].message
                }));
                return res.status(400).json({ 
                    message: 'Validation failed', 
                    errors: validationErrors 
                });
            } else if (saveError.name === 'CastError') {
                console.error("MongoDB Cast Error:", saveError);
                return res.status(400).json({
                    message: `Invalid format for field '${saveError.path}', expected ${saveError.kind}`,
                    error: saveError.message
                });
            }
            throw saveError;
        }
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update a category
router.put('/:id', authenticateJWT, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // Permission check - non-Super_Admin users can only update categories from their restaurant/branch
        if (req.user.role !== 'Super_Admin') {
            // Use String() for consistent comparison to avoid ObjectId vs string issues
            if (String(category.restaurantId) !== String(req.user.restaurantId)) {
                console.log('Update denied - restaurant mismatch:', {
                    categoryRestaurantId: String(category.restaurantId),
                    userRestaurantId: String(req.user.restaurantId)
                });
                return res.status(403).json({ message: 'Access denied. This category belongs to a different restaurant.' });
            }
            
            // If user has a branch assignment, check branch permission
            if (req.user.branchId && category.branchId && 
                String(category.branchId) !== String(req.user.branchId)) {
                console.log('Update denied - branch mismatch:', {
                    categoryBranchId: String(category.branchId),
                    userBranchId: String(req.user.branchId)
                });
                return res.status(403).json({ message: 'Access denied. This category belongs to a different branch.' });
            }
        }
        
        // Get the fields to update
        let { name, description, branchId, imageUrl, tags, isActive } = req.body;
        
        // For non-Super_Admin users, don't allow changing the branch
        if (req.user.role !== 'Super_Admin' && req.user.branchId) {
            branchId = req.user.branchId;
        }
        
        console.log('Updating category with data:', { 
            id: req.params.id,
            name, 
            description, 
            branchId, 
            imageUrl, 
            tags, 
            isActive 
        });
        
        // Update the category
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, {
            name,
            description,
            branchId,
            imageUrl,
            tags,
            isActive
        }, { new: true });
        
        console.log('Category updated successfully:', updatedCategory._id);
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete a category
router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        
        // Permission check - non-Super_Admin users can only delete categories from their restaurant/branch
        if (req.user.role !== 'Super_Admin') {
            // Use String() for consistent comparison to avoid ObjectId vs string issues
            if (String(category.restaurantId) !== String(req.user.restaurantId)) {
                console.log('Delete denied - restaurant mismatch:', {
                    categoryRestaurantId: String(category.restaurantId),
                    userRestaurantId: String(req.user.restaurantId)
                });
                return res.status(403).json({ message: 'Access denied. This category belongs to a different restaurant.' });
            }
            
            // If user has a branch assignment, check branch permission
            if (req.user.branchId && category.branchId && 
                String(category.branchId) !== String(req.user.branchId)) {
                console.log('Delete denied - branch mismatch:', {
                    categoryBranchId: String(category.branchId),
                    userBranchId: String(req.user.branchId)
                });
                return res.status(403).json({ message: 'Access denied. This category belongs to a different branch.' });
            }
        }
        
        console.log('Deleting category:', category._id);
        await Category.findByIdAndDelete(req.params.id);
        console.log('Category deleted successfully');
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;