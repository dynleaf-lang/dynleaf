const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { authenticateJWT } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `import-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
        }
    }
});

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

// Export menu items to Excel/CSV - IMPORTANT: This must be before the /:id route
router.get('/export', authenticateJWT, async (req, res) => {
    try {
        // Build filter criteria like the regular GET endpoint
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
        
        // Filter by category if provided
        if (req.query.categoryId) {
            query.categoryId = req.query.categoryId;
        }
        
        // Filter by active status if provided
        if (req.query.isActive === 'true') {
            query.isActive = true;
        }
        
        console.log('Export query:', query);
        
        // Get format from query, default to excel
        const format = req.query.format?.toLowerCase() || 'excel';
        
        // Fetch menu items with populated category information
        const menuItems = await MenuItem.find(query)
            .populate('categoryId', 'name')
            .lean();
        
        if (menuItems.length === 0) {
            return res.status(404).json({ message: 'No menu items found matching the criteria' });
        }
        
        console.log(`Found ${menuItems.length} items for export in ${format} format`);
        
        // Process based on requested format
        if (format === 'csv') {
            // Create CSV content
            const header = 'Name,Category,Price,Description,Vegetarian,Featured,Active\n';
            const rows = menuItems.map(item => {
                const categoryName = item.categoryId?.name || 'Uncategorized';
                return `"${item.name}","${categoryName}",${item.price},"${item.description || ''}",${item.isVegetarian ? 'Yes' : 'No'},${item.featured ? 'Yes' : 'No'},${item.isActive ? 'Available' : 'Unavailable'}`;
            });
            
            const csvContent = header + rows.join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=menu-items-${new Date().toISOString().slice(0,10)}.csv`);
            return res.send(csvContent);
        } else {
            // Default: Excel format
            // Create a new workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Menu Items');
            
            // Define columns
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Category', key: 'category', width: 20 },
                { header: 'Price', key: 'price', width: 10, style: { numFmt: '₹#,##0.00' } },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Vegetarian', key: 'vegetarian', width: 12 },
                { header: 'Featured', key: 'featured', width: 12 },
                { header: 'Status', key: 'status', width: 12 }
            ];
            
            // Add rows
            menuItems.forEach(item => {
                worksheet.addRow({
                    name: item.name,
                    category: item.categoryId?.name || 'Uncategorized',
                    price: item.price,
                    description: item.description || '',
                    vegetarian: item.isVegetarian ? 'Yes' : 'No',
                    featured: item.featured ? 'Yes' : 'No',
                    status: item.isActive ? 'Available' : 'Unavailable'
                });
            });
            
            // Apply some styling
            worksheet.getRow(1).font = { bold: true };
            
            // Write to buffer
            const buffer = await workbook.xlsx.writeBuffer();
            
            // Send response
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=menu-items-${new Date().toISOString().slice(0,10)}.xlsx`);
            return res.send(buffer);
        }
    } catch (error) {
        console.error('Error exporting menu items:', error);
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
        
        console.log("Backend received menu item data:", {
            name,
            price,
            categoryId,
            restaurantId: req.body.restaurantId,
            branchId,
            // other fields omitted for brevity
        });
        
        // Validate that categoryId is not null or undefined
        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }

        // Ensure categoryId is treated as a valid ObjectId
        let validCategoryId;
        try {
            validCategoryId = new mongoose.Types.ObjectId(categoryId);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }
        
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
            categoryId: validCategoryId,
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

// Import menu items from Excel/CSV
router.post('/import', authenticateJWT, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Get import options
        const restaurantId = req.body.restaurantId || (req.user.role !== 'Super_Admin' ? req.user.restaurantId : null);
        const branchId = req.body.branchId || null;
        const overwrite = req.body.overwrite === 'true';
        
        // Validate restaurant ID for non-Super_Admin users
        if (req.user.role !== 'Super_Admin' && (!req.user.restaurantId || req.user.restaurantId !== restaurantId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only import items for your own restaurant'
            });
        }
        
        // Determine file type and read data
        const fileType = path.extname(file.originalname).toLowerCase();
        let rawItems = [];
        
        try {
            if (fileType === '.csv') {
                // Parse CSV file
                const csvData = fs.readFileSync(file.path, 'utf8');
                const rows = csvData.split('\n');
                
                // Validate CSV has headers
                if (rows.length < 2) {
                    throw new Error('CSV file is empty or missing headers');
                }
                
                // Extract headers and validate format
                const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
                const requiredHeaders = ['name', 'category', 'price'];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                
                if (missingHeaders.length > 0) {
                    throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
                }
                
                // Process rows
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i].trim();
                    if (!row) continue; // Skip empty rows
                    
                    const columns = row.split(',').map(col => col.trim());
                    if (columns.length < 3) continue; // Skip incomplete rows
                    
                    const nameIndex = headers.indexOf('name');
                    const categoryIndex = headers.indexOf('category');
                    const priceIndex = headers.indexOf('price');
                    const descIndex = headers.indexOf('description');
                    const vegIndex = headers.indexOf('vegetarian');
                    const featuredIndex = headers.indexOf('featured');
                    const activeIndex = headers.indexOf('status') !== -1 ?
                                       headers.indexOf('status') : headers.indexOf('active');
                    
                    if (nameIndex === -1 || categoryIndex === -1 || priceIndex === -1) {
                        continue; // Skip rows without required fields
                    }
                    
                    rawItems.push({
                        name: columns[nameIndex],
                        categoryName: columns[categoryIndex],
                        price: parseFloat(columns[priceIndex]) || 0,
                        description: descIndex !== -1 && columns.length > descIndex ? columns[descIndex] : '',
                        isVegetarian: vegIndex !== -1 && columns.length > vegIndex ? 
                                     columns[vegIndex].toLowerCase() === 'yes' : false,
                        featured: featuredIndex !== -1 && columns.length > featuredIndex ? 
                                columns[featuredIndex].toLowerCase() === 'yes' : false,
                        isActive: activeIndex !== -1 && columns.length > activeIndex ? 
                                columns[activeIndex].toLowerCase() === 'available' ||
                                columns[activeIndex].toLowerCase() === 'yes' ||
                                columns[activeIndex].toLowerCase() === 'true' : true
                    });
                }
            } else {
                // Process Excel file
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(file.path);
                const worksheet = workbook.worksheets[0];
                
                if (worksheet.rowCount < 2) {
                    throw new Error('Excel file is empty or missing headers');
                }
                
                // Get headers from first row
                const headers = [];
                worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
                    headers[colNumber - 1] = cell.value.toLowerCase().trim();
                });
                
                // Validate required headers
                const requiredHeaders = ['name', 'category', 'price'];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                
                if (missingHeaders.length > 0) {
                    throw new Error(`Excel is missing required headers: ${missingHeaders.join(', ')}`);
                }
                
                // Map header indices
                const nameIndex = headers.indexOf('name');
                const categoryIndex = headers.indexOf('category');
                const priceIndex = headers.indexOf('price');
                const descIndex = headers.indexOf('description');
                const vegIndex = headers.indexOf('vegetarian');
                const featuredIndex = headers.indexOf('featured');
                const activeIndex = headers.indexOf('status') !== -1 ? 
                                   headers.indexOf('status') : headers.indexOf('active');
                
                // Process data rows
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header row
                    
                    const values = row.values;
                    if (!values[nameIndex + 1] || !values[categoryIndex + 1] || !values[priceIndex + 1]) {
                        return; // Skip rows without required fields
                    }
                    
                    rawItems.push({
                        name: values[nameIndex + 1],
                        categoryName: values[categoryIndex + 1],
                        price: parseFloat(values[priceIndex + 1]) || 0,
                        description: descIndex !== -1 && values.length > descIndex + 1 ? values[descIndex + 1] : '',
                        isVegetarian: vegIndex !== -1 && values.length > vegIndex + 1 ? 
                                     String(values[vegIndex + 1]).toLowerCase() === 'yes' : false,
                        featured: featuredIndex !== -1 && values.length > featuredIndex + 1 ? 
                                String(values[featuredIndex + 1]).toLowerCase() === 'yes' : false,
                        isActive: activeIndex !== -1 && values.length > activeIndex + 1 ? 
                                String(values[activeIndex + 1]).toLowerCase() === 'available' || 
                                String(values[activeIndex + 1]).toLowerCase() === 'yes' || 
                                String(values[activeIndex + 1]).toLowerCase() === 'true' : true
                    });
                });
            }
        } catch (error) {
            console.error('Error parsing import file:', error);
            return res.status(400).json({ 
                success: false, 
                message: `Error parsing file: ${error.message}`
            });
        }
        
        if (rawItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No valid menu items found in the uploaded file'
            });
        }
        
        // Get all existing categories for the restaurant
        const Category = mongoose.model('Category');
        let categories;
        
        try {
            if (restaurantId) {
                categories = await Category.find({ restaurantId });
            } else {
                categories = await Category.find({});
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error fetching restaurant categories'
            });
        }
        
        // Check for existing menu items
        let existingItems = [];
        if (restaurantId) {
            const query = { restaurantId };
            if (branchId) {
                query.$or = [
                    { branchId },
                    { branchId: { $exists: false } },
                    { branchId: null }
                ];
            }
            existingItems = await MenuItem.find(query);
        }
        
        // Process the imported items
        const itemsToCreate = [];
        const itemsToUpdate = [];
        const skippedItems = [];
        const errors = [];
        
        for (const rawItem of rawItems) {
            try {
                // Find matching category
                let categoryId = null;
                const matchingCategory = categories.find(c => 
                    c.name.toLowerCase() === rawItem.categoryName.toLowerCase()
                );
                
                if (matchingCategory) {
                    categoryId = matchingCategory._id;
                } else {
                    // Create a new category if none exists
                    try {
                        if (!restaurantId) {
                            skippedItems.push({
                                item: rawItem,
                                reason: `Cannot create category "${rawItem.categoryName}" without restaurant ID`
                            });
                            continue;
                        }
                        
                        const newCategory = new Category({
                            name: rawItem.categoryName,
                            restaurantId,
                            ...(branchId && { branchId }),
                            isActive: true
                        });
                        
                        const savedCategory = await newCategory.save();
                        categoryId = savedCategory._id;
                        categories.push(savedCategory);
                    } catch (catError) {
                        errors.push({
                            item: rawItem,
                            error: `Failed to create category: ${catError.message}`
                        });
                        continue;
                    }
                }
                
                // Generate a new item with category ID
                const itemId = `ITEM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                const newItem = {
                    itemId,
                    name: rawItem.name,
                    description: rawItem.description,
                    price: rawItem.price,
                    categoryId,
                    restaurantId,
                    isVegetarian: rawItem.isVegetarian,
                    featured: rawItem.featured,
                    isActive: rawItem.isActive,
                    tags: []
                };
                
                if (branchId) {
                    newItem.branchId = branchId;
                }
                
                // Check if item already exists
                const existingItem = existingItems.find(item => 
                    item.name.toLowerCase() === rawItem.name.toLowerCase() &&
                    (item.branchId ? item.branchId.toString() === (branchId || '').toString() : true)
                );
                
                if (existingItem) {
                    if (overwrite) {
                        // Preserve existing item ID and update
                        itemsToUpdate.push({
                            id: existingItem._id,
                            ...newItem
                        });
                    } else {
                        skippedItems.push({
                            item: rawItem,
                            reason: 'Item with this name already exists'
                        });
                    }
                } else {
                    // Create new item
                    itemsToCreate.push(newItem);
                }
            } catch (itemError) {
                errors.push({
                    item: rawItem,
                    error: itemError.message
                });
            }
        }
        
        // Perform database operations
        let createdItems = [];
        let updatedItems = [];
        
        try {
            if (itemsToCreate.length > 0) {
                createdItems = await MenuItem.insertMany(itemsToCreate);
            }
            
            if (itemsToUpdate.length > 0) {
                const updatePromises = itemsToUpdate.map(item => {
                    const id = item.id;
                    delete item.id;
                    return MenuItem.findByIdAndUpdate(id, item, { new: true });
                });
                updatedItems = await Promise.all(updatePromises);
            }
        } catch (dbError) {
            console.error('Database error during import:', dbError);
            return res.status(500).json({
                success: false,
                message: `Error saving menu items: ${dbError.message}`,
                importedCount: createdItems.length + updatedItems.length,
                skippedCount: skippedItems.length,
                errorCount: errors.length + 1
            });
        }
        
        // Return results
        res.json({
            success: true,
            message: `Successfully imported ${createdItems.length + updatedItems.length} menu items`,
            importedCount: createdItems.length + updatedItems.length,
            createdCount: createdItems.length,
            updatedCount: updatedItems.length,
            skippedCount: skippedItems.length,
            errorCount: errors.length,
            details: {
                created: createdItems.map(item => ({ name: item.name, id: item._id })),
                updated: updatedItems.map(item => ({ name: item.name, id: item._id })),
                skipped: skippedItems.map(item => ({ 
                    name: item.item.name,
                    reason: item.reason 
                })),
                errors: errors.map(item => ({ 
                    name: item.item.name,
                    error: item.error 
                }))
            }
        });
    } catch (error) {
        console.error('Error processing import:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An error occurred during import',
            errorDetail: error.toString()
        });
    } finally {
        // Clean up: Delete the uploaded file
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }
    }
});

module.exports = router;

