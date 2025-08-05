const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { publicAccess } = require('../middleware/authMiddleware');
const { menuResponseDebugger } = require('../middleware/menuItemDebugMiddleware');

// Make all routes in this file public
router.use(publicAccess);

// Add response middleware (debug logs removed)
router.use(menuResponseDebugger);

// Router middleware (debug logs removed)
router.use((req, res, next) => {
    // Debug log removed
    next();
});

// Simple test route
router.get('/test', async (req, res) => {
    console.log('[DEBUG] Test route accessed');
    return res.json({ message: 'Public menus test route is working' });
});

// Sample data route for testing
router.get('/sample', async (req, res) => {
    console.log('[DEBUG] Sample data route accessed');
    return res.json([
        {
            _id: '60d21b4667d0d8992e610c85',
            name: 'Sample Burger',
            description: 'A delicious sample burger',
            price: 9.99,
            imageUrl: '/uploads/sample-burger.jpg',
            categoryId: {
                _id: '60d21b4667d0d8992e610c80',
                name: 'Burgers'
            },
            isActive: true,
            isDeleted: false
        },
        {
            _id: '60d21b4667d0d8992e610c86',
            name: 'Sample Pizza',
            description: 'A tasty sample pizza',
            price: 12.99,
            imageUrl: '/uploads/sample-pizza.jpg',
            categoryId: {
                _id: '60d21b4667d0d8992e610c81',
                name: 'Pizza'
            },
            isActive: true,
            isDeleted: false
        }
    ]);
});

// Get all menu items for a specific restaurant branch
router.get('/branch/:branchId', async (req, res) => {
    try {
         const { branchId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(branchId)) { 
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }
          // First let's check if we have ANY menu items in the database
        const totalMenuItemsInDb = await MenuItem.countDocuments();
         
        // Check how many menu items exist for this branch without filters
        const totalMenuItems = await MenuItem.countDocuments({ branchId });
         
        try {
            // Check if the branch exists
            const Branch = mongoose.model('Branch');
            const branchExists = await Branch.findById(branchId).lean();
            console.log(`[DEBUG] Branch exists: ${!!branchExists}`);
            
            if (!branchExists) {
                return res.status(404).json({ message: 'Branch not found' });
            }
            
            // Get the restaurantId from the branch
            const restaurantId = branchExists.restaurantId;
            console.log(`[DEBUG] Using restaurant ID from branch: ${restaurantId}`);// If no direct branch items, check for restaurant-level items (available at all branches)
            if (totalMenuItems === 0) {
                console.log(`[DEBUG] No direct branch items, checking for restaurant-level items`);
                
                // Query for items with this restaurantId and either no branchId or null branchId
                // Add isActive flag to ensure we only get active items
                const query = {
                    restaurantId,
                    isActive: true,
                    isDeleted: { $ne: true },
                    $or: [
                        { branchId: { $exists: false } },
                        { branchId: null },
                        { branchId: "" } // Handle empty string case
                    ]
                };
                
                console.log(`[DEBUG] Checking restaurant-level items with query:`, JSON.stringify(query));
                const restaurantItems = await MenuItem.find(query)
                    .populate('categoryId', 'name')
                    .sort({ categoryId: 1, displayOrder: 1 })
                    .lean();
                    
                console.log(`[DEBUG] Found ${restaurantItems.length} restaurant-level menu items`);
                return res.json(restaurantItems);
            }
              // We have branch-specific items, return those
            const menuItems = await MenuItem.find({
                branchId,
                isActive: true,
                isDeleted: { $ne: true }
            })
                .populate('categoryId', 'name')
                .sort({ categoryId: 1, displayOrder: 1 })
                .lean();
            
            console.log(`[DEBUG] Found ${menuItems.length} menu items after filtering`);
            res.json(menuItems);
        } catch (findError) {
            console.error('[DEBUG] Error in MenuItem.find():', findError);
            throw findError;
        }    } catch (error) {
        console.error('[PUBLIC API ERROR] Error fetching menu items for branch:', error);
        
        // Provide more detailed error messages for common issues
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: 'Invalid ID format',
                details: error.message
            });
        } else if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                details: error.message
            });
        } else if (error.message.includes('topology was destroyed')) {
            return res.status(500).json({ 
                message: 'Database connection lost',
                details: 'The database connection was closed unexpectedly'
            });
        }
        
        res.status(500).json({ 
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Get menu items by category for a specific branch
router.get('/branch/:branchId/category/:categoryId', async (req, res) => {
    try {
        const { branchId, categoryId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const menuItems = await MenuItem.find({
            branchId,
            categoryId,
            isActive: true,
            isDeleted: false
        })
        .sort({ displayOrder: 1 })
        .lean();

        res.json(menuItems);
    } catch (error) {
        console.error('Error fetching category menu items:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all categories for a specific branch
router.get('/branch/:branchId/categories', async (req, res) => {
    try {
        const { branchId } = req.params;
        
        console.log(`[DEBUG] Fetching categories for branch: ${branchId}`);
        
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }

        // First, get the branch to find its restaurantId
        const Branch = mongoose.model('Branch');
        const branch = await Branch.findById(branchId).lean();
        
        if (!branch) {
            console.log(`[DEBUG] Branch not found: ${branchId}`);
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        const { restaurantId } = branch;
        console.log(`[DEBUG] Found restaurant ID: ${restaurantId} for branch: ${branchId}`);

        // We'll use a two-step approach:
        // 1. First try to get categories directly linked to this branch
        // 2. Then handle restaurant-wide categories if needed
        
        // Step 1: Get categories directly defined for this branch and restaurant-wide categories
        const branchCategoriesQuery = {
            restaurantId: restaurantId,
            isDeleted: { $ne: true },
            $or: [
                { branchId: branchId },
                { branchId: { $exists: false } },
                { branchId: null }
            ]
        };
        
        console.log(`[DEBUG] Branch categories query: ${JSON.stringify(branchCategoriesQuery, null, 2)}`);
        const branchCategories = await Category.find(branchCategoriesQuery)
            .sort({ displayOrder: 1 })
            .lean();
            
        console.log(`[DEBUG] Found ${branchCategories.length} categories directly linked to branch or restaurant-wide`);
        
        // If we have categories directly linked to branch, use those
        if (branchCategories.length > 0) {
            console.log(`[DEBUG] Using branch-specific and restaurant-wide categories`);
            
            // Format categories for frontend compatibility
            const formattedCategories = branchCategories.map(cat => ({
                ...cat,
                id: cat._id.toString() // Ensure we have both _id and id for frontend compatibility
            }));
            
            // Always include the "All" category at the beginning
            const allCategory = {
                _id: 'all',
                id: 'all', 
                name: 'All',
                description: 'All menu items',
                displayOrder: 0
            };
            
            const finalCategories = [allCategory, ...formattedCategories];
            console.log(`[DEBUG] Returning ${finalCategories.length} categories (including "All")`);
            return res.json(finalCategories);
        }
        
        // Step 2: If no direct categories found, derive them from menu items
        console.log(`[DEBUG] No direct categories found, deriving from menu items`);
        const menuItemsQuery = {
            isActive: true,
            isDeleted: { $ne: true },
            $or: [
                { branchId: branchId },
                { branchId: { $exists: false } },
                { branchId: null },
                { branchId: "" } // Handle empty string case
            ],
            restaurantId: restaurantId 
        };
        
        console.log(`[DEBUG] Menu items query: ${JSON.stringify(menuItemsQuery, null, 2)}`);
        
        // Find categoryIds from menu items
        const categoryIds = await MenuItem.find(menuItemsQuery).distinct('categoryId');
        console.log(`[DEBUG] Found ${categoryIds.length} category IDs from menu items: ${JSON.stringify(categoryIds)}`);
          
        // If no categories found from menu items, get all categories for the restaurant
        let categories = [];
        
        if (!categoryIds || categoryIds.length === 0) {
            console.log(`[DEBUG] No categories found from menu items, fetching all restaurant categories`);
            
            // Get all categories for this restaurant
            categories = await Category.find({
                restaurantId: restaurantId,
                isDeleted: { $ne: true }
            }).sort({ displayOrder: 1 }).lean();
            
            console.log(`[DEBUG] Fetched ${categories.length} restaurant categories`);
            
            // If still no categories, create a default one
            if (categories.length === 0) {
                console.log(`[DEBUG] No categories found for restaurant, creating default category`);
                
                try {
                    const defaultCategory = await Category.create({
                        name: 'General',
                        description: 'Default category for all items',
                        restaurantId: restaurantId,
                        categoryId: `general-${Date.now()}`,
                        displayOrder: 1
                    });
                    
                    categories = [defaultCategory.toObject()];
                    
                    console.log(`[DEBUG] Created default category: ${defaultCategory._id}`);
                } catch (createError) {
                    console.error(`[ERROR] Could not create default category: ${createError.message}`);
                }
            }
        } else {
            // Get the categories that have menu items
            console.log(`[DEBUG] Fetching categories with IDs: ${JSON.stringify(categoryIds)}`);
            
            categories = await Category.find({
                _id: { $in: categoryIds },
                isDeleted: { $ne: true }
            }).sort({ displayOrder: 1 }).lean();
            
            console.log(`[DEBUG] Fetched ${categories.length} categories that have menu items`);
        }
          
        console.log(`[DEBUG] Returning ${categories?.length || 0} categories for branch ${branchId}`);
        
        // If still no categories, return the "All" category at minimum
        if (!categories || categories.length === 0) {
            console.log(`[DEBUG] No categories found for branch ${branchId} or restaurant ${restaurantId}, returning default "All" category`);
            
            // Return a default "All" category to ensure frontend has something to display
            return res.json([{
                _id: 'all',
                id: 'all',
                name: 'All',
                description: 'All menu items',
                displayOrder: 0
            }]);
        }
        
        // Add "_id" as "id" for frontend compatibility 
        const formattedCategories = categories.map(cat => ({
            ...cat,
            id: cat._id.toString() // Ensure we have both _id and id for frontend compatibility
        }));
        
        // Always include the "All" category at the beginning
        const allCategory = {
            _id: 'all',
            id: 'all', 
            name: 'All',
            description: 'All menu items',
            displayOrder: 0
        };
        
        const finalCategories = [allCategory, ...formattedCategories];
        console.log(`[DEBUG] Final categories list: ${JSON.stringify(finalCategories.map(c => c.name))}`);
        
        res.json(finalCategories);
    } catch (error) {
        console.error('[ERROR] Error fetching categories for branch:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get menu item details by ID
router.get('/item/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid menu item ID format' });
        }

        const menuItem = await MenuItem.findOne({
            _id: id,
            isActive: true,
            isDeleted: false
        })
        .populate('categoryId', 'name')
        .lean();

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        res.json(menuItem);
    } catch (error) {
        console.error('Error fetching menu item details:', error);
        res.status(500).json({ message: error.message });
    }
});

// Search menu items
router.get('/search', async (req, res) => {
    try {
        const { branchId, query } = req.query;
        
        if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Valid branch ID is required' });
        }

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const menuItems = await MenuItem.find({
            branchId,
            isActive: true,
            isDeleted: false,
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('categoryId', 'name')
        .sort({ name: 1 })
        .limit(20)
        .lean();

        res.json(menuItems);
    } catch (error) {
        console.error('Error searching menu items:', error);
        res.status(500).json({ message: error.message });
    }
});

// Debug route to check all menu items without filtering
router.get('/debug/all', async (req, res) => {
    try {
        console.log('[DEBUG] Retrieving all menu items in the database');
        
        // Count total documents
        const totalCount = await MenuItem.countDocuments();
        console.log(`[DEBUG] Total menu items in database: ${totalCount}`);
        
        // Get first 20 items with minimal filtering for debugging
        const items = await MenuItem.find()
            .limit(20)
            .lean();
        
        // Return both count and items
        res.json({
            totalCount,
            sampleItems: items,
            message: totalCount === 0 ? 'No menu items found in the database' : `Found ${totalCount} menu items`
        });
    } catch (error) {
        console.error('[DEBUG] Error retrieving all menu items:', error);
        res.status(500).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Generate sample menu items for a branch (for testing when no data exists)
router.post('/debug/generate-sample/:branchId/:restaurantId', async (req, res) => {
    try {
        const { branchId, restaurantId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        
        console.log(`[DEBUG] Generating sample menu items for branch ${branchId}`);
        
        // Create a test category if needed
        let category = await Category.findOne({ restaurantId });
        if (!category) {
            category = await Category.create({
                name: 'Sample Category',
                description: 'Sample category for testing',
                restaurantId,
                branchId: null, // Available to all branches
            });
        }
        
        // Sample menu items
        const sampleItems = [
            {
                name: 'Sample Burger',
                description: 'A delicious sample burger',
                price: 9.99,
                itemId: 'sample-burger-' + Date.now(),
                imageUrl: 'https://via.placeholder.com/300?text=Burger',
                restaurantId,
                branchId,
                categoryId: category._id,
                isVegetarian: false,
                isActive: true
            },
            {
                name: 'Sample Pizza',
                description: 'A tasty sample pizza',
                price: 12.99,
                itemId: 'sample-pizza-' + Date.now(),
                imageUrl: 'https://via.placeholder.com/300?text=Pizza',
                restaurantId,
                branchId,
                categoryId: category._id,
                isVegetarian: false,
                isActive: true
            },
            {
                name: 'Sample Salad',
                description: 'Fresh sample salad',
                price: 7.99,
                itemId: 'sample-salad-' + Date.now(),
                imageUrl: 'https://via.placeholder.com/300?text=Salad',
                restaurantId,
                branchId,
                categoryId: category._id,
                isVegetarian: true,
                isActive: true
            }
        ];
        
        // Create the menu items
        const createdItems = await MenuItem.create(sampleItems);
        
        res.status(201).json({
            message: `Created ${createdItems.length} sample menu items`,
            items: createdItems
        });
    } catch (error) {
        console.error('[DEBUG] Error generating sample menu items:', error);
        res.status(500).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Debug route to check all categories in the database
router.get('/debug/categories', async (req, res) => {
    try {
        console.log('[DEBUG] Retrieving all categories in the database');
        
        // Count total documents
        const totalCount = await Category.countDocuments();
        console.log(`[DEBUG] Total categories in database: ${totalCount}`);
        
        if (totalCount === 0) {
            return res.json({
                totalCount: 0,
                message: 'No categories found in the database',
                categories: []
            });
        }
        
        // Get all categories
        const categories = await Category.find()
            .lean();
        
        // Return both count and categories
        res.json({
            totalCount,
            categories,
            message: `Found ${totalCount} categories`
        });
    } catch (error) {
        console.error('[DEBUG] Error retrieving all categories:', error);
        res.status(500).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Debug route to check categories for a specific branch and restaurant
router.get('/debug/branch/:branchId/categories', async (req, res) => {
    try {
        const { branchId } = req.params;
        console.log(`[DEBUG] Debug endpoint for categories in branch: ${branchId}`);
        
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }
        
        // Get branch and restaurant info
        const Branch = mongoose.model('Branch');
        const branch = await Branch.findById(branchId).lean();
        
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        const restaurantId = branch.restaurantId;
        
        // Find all data for debugging purposes
        const debug = {
            branch,
            menuItems: {
                totalCount: await MenuItem.countDocuments(),
                branchSpecific: await MenuItem.countDocuments({ branchId }),
                restaurantWide: await MenuItem.countDocuments({ 
                    restaurantId,
                    $or: [
                        { branchId: { $exists: false } },
                        { branchId: null },
                        { branchId: "" }
                    ]
                }),
                withCategories: await MenuItem.countDocuments({ 
                    categoryId: { $exists: true, $ne: null },
                    $or: [
                        { branchId },
                        { branchId: { $exists: false } },
                        { branchId: null }
                    ],
                    restaurantId
                })
            },
            categories: {
                total: await Category.countDocuments(),
                forRestaurant: await Category.countDocuments({ restaurantId }),
                forBranch: await Category.countDocuments({ branchId })
            },
            sample: {
                menuItems: await MenuItem.find({ restaurantId }).limit(5).lean(),
                categories: await Category.find({ restaurantId }).limit(5).lean()
            }
        };
        
        // Return all debug info
        res.json({
            message: 'Debug information for branch categories',
            branchId,
            restaurantId: restaurantId?.toString(),
            debug
        });
    } catch (error) {
        console.error('[DEBUG] Error in branch categories debug route:', error);
        res.status(500).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

// Get all menu items for a specific restaurant (for POS system)
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        console.log(`[DEBUG] Fetching menu items for restaurant: ${restaurantId}`);
        
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: 'Invalid restaurant ID format' });
        }
        
        // Get all menu items for this restaurant (across all branches)
        const menuItems = await MenuItem.find({
            restaurantId,
            isActive: true,
            isDeleted: { $ne: true }
        })
        .populate('categoryId', 'name')
        .sort({ categoryId: 1, displayOrder: 1 })
        .lean();
        
        console.log(`[DEBUG] Found ${menuItems.length} menu items for restaurant`);
        
        // Return in the format expected by POS frontend
        res.json({ menus: menuItems });
        
    } catch (error) {
        console.error('[PUBLIC API ERROR] Error fetching menu items for restaurant:', error);
        res.status(500).json({ 
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack
        });
    }
});

module.exports = router;
