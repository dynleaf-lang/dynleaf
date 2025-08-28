const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { authenticateJWT } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to safely delete local files under /public/uploads from a stored URL
const deleteLocalUploadByUrl = (fileUrl) => {
    try {
        if (!fileUrl || typeof fileUrl !== 'string') return false;
        const uploadsIndex = fileUrl.indexOf('/uploads/');
        if (uploadsIndex === -1) return false;
        const relativePart = fileUrl.substring(uploadsIndex + '/uploads/'.length);
        const uploadsDir = path.resolve(__dirname, '../../public/uploads');
        const absolutePath = path.resolve(uploadsDir, relativePart);
        if (!absolutePath.startsWith(uploadsDir)) return false;
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error deleting local upload file:', err);
        return false;
    }
};

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
            // Add Size Variants and Variant Groups columns to header
            const header = 'Name,Category,Base Price,Size Variants,Variant Groups (JSON),Description,Vegetarian,Featured,Active\n';
            
            const rows = menuItems.map(item => {
                const categoryName = item.categoryId?.name || 'Uncategorized';
                const basePrice = item.price !== undefined ? item.price.toString() : '';
                
                // Format size variants as a string: "Small: 100, Medium: 200, Large: 300"
                let sizeVariantsStr = '';
                if (item.sizeVariants && item.sizeVariants.length > 0) {
                    sizeVariantsStr = item.sizeVariants
                        .map(v => `${v.name}: ${v.price}`)
                        .join(', ');
                }
                // Variant groups as JSON for flexibility
                const vgSanitized = Array.isArray(item.variantGroups) ? item.variantGroups.map(g => ({
                    name: g && g.name ? String(g.name) : '',
                    selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
                    options: Array.isArray(g?.options) ? g.options.map(o => ({
                        name: o && o.name ? String(o.name) : '',
                        price: o && o.price !== undefined && o.price !== null ? Number(o.price) : undefined,
                        priceDelta: o && o.priceDelta !== undefined && o.priceDelta !== null ? Number(o.priceDelta) : 0
                    })).filter(o => o.name) : []
                })).filter(g => g.name && g.options.length > 0) : [];
                const vgJson = JSON.stringify(vgSanitized).replace(/"/g, '""');
                
                return `"${item.name}","${categoryName}",${basePrice},"${sizeVariantsStr}","${vgJson}","${item.description || ''}",${item.isVegetarian ? 'Yes' : 'No'},${item.featured ? 'Yes' : 'No'},${item.isActive ? 'Available' : 'Unavailable'}`;
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
            
            // Define columns - updated to include size variants and variant groups
            worksheet.columns = [
                { header: 'Name', key: 'name', width: 30 },
                { header: 'Category', key: 'category', width: 20 },
                { header: 'Base Price', key: 'basePrice', width: 12, style: { numFmt: '₹#,##0.00' } },
                { header: 'Size Variants', key: 'sizeVariants', width: 40 },
                { header: 'Variant Groups (JSON)', key: 'variantGroups', width: 60 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'Vegetarian', key: 'vegetarian', width: 12 },
                { header: 'Featured', key: 'featured', width: 12 },
                { header: 'Status', key: 'status', width: 12 }
            ];
            
            // Add rows with size variants information
            menuItems.forEach(item => {
                // Format size variants as a string
                let sizeVariantsStr = '';
                if (item.sizeVariants && item.sizeVariants.length > 0) {
                    sizeVariantsStr = item.sizeVariants
                        .map(v => `${v.name}: ₹${parseFloat(v.price).toFixed(2)}`)
                        .join(', ');
                }
                // Variant groups as JSON string
                const vgSanitized = Array.isArray(item.variantGroups) ? item.variantGroups.map(g => ({
                    name: g && g.name ? String(g.name) : '',
                    selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
                    options: Array.isArray(g?.options) ? g.options.map(o => ({
                        name: o && o.name ? String(o.name) : '',
                        price: o && o.price !== undefined && o.price !== null ? Number(o.price) : undefined,
                        priceDelta: o && o.priceDelta !== undefined && o.priceDelta !== null ? Number(o.priceDelta) : 0
                    })).filter(o => o.name) : []
                })).filter(g => g.name && g.options.length > 0) : [];
                const vgJson = JSON.stringify(vgSanitized);
                
                worksheet.addRow({
                    name: item.name,
                    category: item.categoryId?.name || 'Uncategorized',
                    basePrice: item.price !== undefined ? item.price : null, // Use null for empty cells
                    sizeVariants: sizeVariantsStr,
                    variantGroups: vgJson,
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
    const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive, branchId, sizeVariants, variantGroups } = req.body;
        
        console.log("Backend received menu item data:", {
            name,
            price,
            categoryId,
            restaurantId: req.body.restaurantId,
            branchId,
            sizeVariants,
            variantGroups,
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
            }        }
          // Validate that either price or sizeVariants is provided
        const hasValidPrice = price !== undefined && price !== null && parseFloat(price) > 0;
        // Allow deriving sizeVariants from a variant group named "Size" if present
        let normalizedSizeVariants = Array.isArray(sizeVariants) ? [...sizeVariants] : [];
        let normalizedVariantGroups = Array.isArray(variantGroups) ? [...variantGroups] : [];
        if ((!normalizedSizeVariants || normalizedSizeVariants.length === 0) && Array.isArray(normalizedVariantGroups)) {
            const sizeGroup = normalizedVariantGroups.find(g => typeof g.name === 'string' && g.name.trim().toLowerCase() === 'size');
            if (sizeGroup && Array.isArray(sizeGroup.options)) {
                normalizedSizeVariants = sizeGroup.options
                    .filter(o => o && o.name && (o.price !== undefined && o.price !== null && !isNaN(parseFloat(o.price))))
                    .map(o => ({ name: String(o.name).trim(), price: parseFloat(o.price) }));
            }
        }
        const hasSizeVariants = normalizedSizeVariants && normalizedSizeVariants.length > 0;
        
        if (!hasValidPrice && !hasSizeVariants) {
            return res.status(400).json({ 
                message: 'Either a price or at least one size variant with price must be provided' 
            });
        }
        
        // Validate size variants if they exist
        if (hasSizeVariants) {
            const invalidVariants = normalizedSizeVariants.filter(v => !v.name || v.price === undefined);
            if (invalidVariants.length > 0) {
                return res.status(400).json({ 
                    message: 'All size variants must have both name and price'
                });
            }
            
            // Ensure all prices are numbers
            for (let variant of normalizedSizeVariants) {
                if (isNaN(parseFloat(variant.price))) {
                    return res.status(400).json({ 
                        message: `Invalid price for size variant "${variant.name}"`
                    });
                }
                variant.price = parseFloat(variant.price);
            }
        }
        // Sanitize/normalize variantGroups if provided
        if (Array.isArray(normalizedVariantGroups)) {
            normalizedVariantGroups = normalizedVariantGroups.map(g => ({
                name: g && g.name ? String(g.name).trim() : '',
                selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
                options: Array.isArray(g?.options) ? g.options.map(o => ({
                    name: o && o.name ? String(o.name).trim() : '',
                    price: (o && o.price !== undefined && o.price !== null && !isNaN(parseFloat(o.price))) ? parseFloat(o.price) : undefined,
                    priceDelta: (o && o.priceDelta !== undefined && o.priceDelta !== null && !isNaN(parseFloat(o.priceDelta))) ? parseFloat(o.priceDelta) : 0
                })).filter(o => o.name) : []
            })).filter(g => g.name && g.options.length > 0);
        } else {
            normalizedVariantGroups = [];
        }
          // Prepare the menu item data
        const menuItemData = {
            restaurantId,
            itemId,
            name,
            description,
            categoryId: validCategoryId,
            imageUrl,
            isVegetarian: isVegetarian || false,
            tags: tags || [],
            featured: featured || false,
            isActive: isActive !== undefined ? isActive : true,
            sizeVariants: normalizedSizeVariants || [],
            variantGroups: normalizedVariantGroups || [],
            // Add branchId if provided (optional)
            ...(branchId && { branchId })
        };

        // Only add price if it's valid (not zero when there are no size variants)
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            // If price is greater than 0 or we have size variants, it's okay
            if (parsedPrice > 0 || (normalizedSizeVariants && normalizedSizeVariants.length > 0)) {
                menuItemData.price = parsedPrice;
            }
        }

        // Create the MenuItem instance
        const menuItem = new MenuItem(menuItemData);
        
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
            (!req.user.restaurantId || menuItem.restaurantId.toString() !== req.user.restaurantId.toString())) {
            return res.status(403).json({ message: 'Access denied to update this menu item' });
        }        // Get the fields to update
    const { name, description, price, categoryId, imageUrl, isVegetarian, tags, featured, isActive, branchId, sizeVariants, variantGroups } = req.body;
        
        // Normalize sizeVariants and variantGroups and validate
        const hasValidPrice = price !== undefined && price !== null && parseFloat(price) > 0;
        let normalizedSizeVariants = Array.isArray(sizeVariants) ? [...sizeVariants] : (sizeVariants === undefined ? undefined : []);
        let normalizedVariantGroups = Array.isArray(variantGroups) ? [...variantGroups] : (variantGroups === undefined ? undefined : []);
        // If caller didn't provide sizeVariants but provided variantGroups, try to derive from Size group
        if ((normalizedSizeVariants === undefined || normalizedSizeVariants.length === 0) && Array.isArray(normalizedVariantGroups)) {
            const sizeGroup = normalizedVariantGroups.find(g => typeof g.name === 'string' && g.name.trim().toLowerCase() === 'size');
            if (sizeGroup && Array.isArray(sizeGroup.options)) {
                normalizedSizeVariants = sizeGroup.options
                    .filter(o => o && o.name && (o.price !== undefined && o.price !== null && !isNaN(parseFloat(o.price))))
                    .map(o => ({ name: String(o.name).trim(), price: parseFloat(o.price) }));
            }
        }
        const hasSizeVariants = Array.isArray(normalizedSizeVariants) ? (normalizedSizeVariants.length > 0) : (menuItem.sizeVariants && menuItem.sizeVariants.length > 0);
        
        if (!hasValidPrice && !hasSizeVariants) {
            return res.status(400).json({ 
                message: 'Either a price or at least one size variant with price must be provided' 
            });
        }
        
        // Validate size variants if they exist
        if (Array.isArray(normalizedSizeVariants) && normalizedSizeVariants.length > 0) {
            const invalidVariants = normalizedSizeVariants.filter(v => !v.name || v.price === undefined);
            if (invalidVariants.length > 0) {
                return res.status(400).json({ 
                    message: 'All size variants must have both name and price'
                });
            }
            
            // Ensure all prices are numbers
            for (let variant of normalizedSizeVariants) {
                if (isNaN(parseFloat(variant.price))) {
                    return res.status(400).json({ 
                        message: `Invalid price for size variant "${variant.name}"`
                    });
                }
                variant.price = parseFloat(variant.price);
            }
    }
        // Normalize/sanitize variantGroups if provided
        if (Array.isArray(normalizedVariantGroups)) {
            normalizedVariantGroups = normalizedVariantGroups.map(g => ({
                name: g && g.name ? String(g.name).trim() : '',
                selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
                options: Array.isArray(g?.options) ? g.options.map(o => ({
                    name: o && o.name ? String(o.name).trim() : '',
                    price: (o && o.price !== undefined && o.price !== null && !isNaN(parseFloat(o.price))) ? parseFloat(o.price) : undefined,
                    priceDelta: (o && o.priceDelta !== undefined && o.priceDelta !== null && !isNaN(parseFloat(o.priceDelta))) ? parseFloat(o.priceDelta) : 0
                })).filter(o => o.name) : []
            })).filter(g => g.name && g.options.length > 0);
        }
        // Update the menu item - get the current data first
    const oldImageUrl = menuItem.imageUrl;
        let updateData = {
            name,
            description,
            categoryId,
            imageUrl,
            isVegetarian,
            tags,
            featured,
            isActive
        };
        
        // Handle size variants carefully
        if (normalizedSizeVariants !== undefined) {
            updateData.sizeVariants = normalizedSizeVariants || [];
        }
        // Apply variantGroups if provided
        if (normalizedVariantGroups !== undefined) {
            updateData.variantGroups = normalizedVariantGroups || [];
        }
        
        // Handle price carefully
        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            // Always set the price as provided to maintain consistency
            updateData.price = parsedPrice;
        }
          // Handle branchId separately - allow setting to null or a value
        if (branchId !== undefined) {
            updateData.branchId = branchId || null;
        }
          // First try to find the current item to ensure we don't lose required data
        const currentItem = await MenuItem.findById(req.params.id);
        if (!currentItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        
        // Special handling for the validation condition:
        // If price is being removed or set to 0, we must ensure there are size variants
    const removingPrice = (price !== undefined && parseFloat(price) <= 0);
    const removingSizeVariants = (normalizedSizeVariants !== undefined && (!normalizedSizeVariants || normalizedSizeVariants.length === 0));
        
        if (removingPrice && removingSizeVariants) {
            return res.status(400).json({
                message: 'Either a price or at least one size variant is required'
            });
        }
            
        // Use runValidators: false to prevent the automatic validation which can be problematic
        // then manually handle our custom validation
        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true, runValidators: false }
        );
        // If image changed or cleared, delete old local file
        const newImageUrl = updatedItem ? updatedItem.imageUrl : undefined;
        if (String(newImageUrl || '') !== String(oldImageUrl || '')) {
            if (oldImageUrl) {
                const deleted = deleteLocalUploadByUrl(oldImageUrl);
                if (deleted) console.log('Deleted old menu item image file');
            }
        }
        
        res.json(updatedItem);
    } catch (error) {
        console.error("Error updating menu item:", error);
        res.status(400).json({ message: error.message });
    }
});

// Delete a menu item
router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
        
        // Convert IDs to strings for proper comparison
        const userRestaurantIdStr = req.user.restaurantId ? req.user.restaurantId.toString() : '';
        const menuItemRestaurantIdStr = menuItem.restaurantId ? menuItem.restaurantId.toString() : '';
        
        // Check if user has permission to delete this item
        // Allow both Super_Admin and Branch_Manager roles to delete menu items
        if (req.user.role !== 'Super_Admin' && req.user.role !== 'Branch_Manager' && 
            (!userRestaurantIdStr || menuItemRestaurantIdStr !== userRestaurantIdStr)) {
            return res.status(403).json({ message: 'Access denied to delete this menu item' });
        }
        
        // If user is Branch_Manager, ensure they can only delete items from their own restaurant
        if (req.user.role === 'Branch_Manager' && 
            (!userRestaurantIdStr || menuItemRestaurantIdStr !== userRestaurantIdStr)) {
            return res.status(403).json({ message: 'Access denied: Branch managers can only delete menu items from their own restaurant' });
        }
        
        // Delete associated local image file if present
        if (menuItem.imageUrl) {
            const deleted = deleteLocalUploadByUrl(menuItem.imageUrl);
            if (deleted) console.log('Deleted menu item image file');
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
        const rawRestaurantId = req.body.restaurantId;
        const restaurantId = rawRestaurantId || (req.user.role !== 'Super_Admin' ? req.user.restaurantId : null);
        const branchId = req.body.branchId || null;
        const overwrite = req.body.overwrite === 'true';
        
        // Validate restaurant ID for non-Super_Admin users (normalize to strings to avoid ObjectId vs string mismatch)
        if (req.user.role !== 'Super_Admin') {
            const userRestaurantIdStr = req.user.restaurantId ? String(req.user.restaurantId) : '';
            const requestedRestaurantIdStr = rawRestaurantId ? String(rawRestaurantId) : '';
            if (!userRestaurantIdStr) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You can only import items for your own restaurant'
                });
            }
            if (requestedRestaurantIdStr && requestedRestaurantIdStr !== userRestaurantIdStr) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'You can only import items for your own restaurant'
                });
            }
        }
        
        // Determine file type and read data
        const fileType = path.extname(file.originalname).toLowerCase();
        let rawItems = [];
        
        try {
            if (fileType === '.csv') {
                // Parse CSV file
                const csvData = fs.readFileSync(file.path, 'utf8');
                const rows = csvData.split(/\r?\n/);
                
                // Find header row index (first non-empty line)
                let headerRowIndex = rows.findIndex(r => r && r.trim().length > 0);
                if (headerRowIndex === -1 || headerRowIndex >= rows.length - 1) {
                    throw new Error('CSV file is empty or missing headers');
                }
                
                // Extract headers and validate format
                const stripBom = (s) => s && s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
                const clean = (s) => stripBom(String(s || ''))
                    .replace(/^\uFEFF/, '')
                    .replace(/^"|"$/g, '')
                    .replace(/\u00A0/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toLowerCase();
                // CSV line parser that respects quotes and configurable delimiter
                const parseCsvLine = (line, delim = ',') => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                current += '"';
                                i++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (ch === delim && !inQuotes) {
                            result.push(current);
                            current = '';
                        } else {
                            current += ch;
                        }
                    }
                    result.push(current);
                    return result;
                };

                // Detect delimiter: prefer comma, fallback to semicolon if comma yields single column
                const rawHeaderLine = rows[headerRowIndex];
                let delimiter = ',';
                let headers = parseCsvLine(rawHeaderLine, delimiter).map(h => clean(h));
                if (headers.length < 2 && rawHeaderLine.includes(';')) {
                    delimiter = ';';
                    headers = parseCsvLine(rawHeaderLine, delimiter).map(h => clean(h));
                }
                // Accept either 'price' or 'base price' for price
                const hasName = headers.includes('name');
                const hasCategory = headers.includes('category');
                const hasPrice = headers.includes('price') || headers.includes('base price');
                const hasSizeVariantsCol = headers.includes('size variants');
                const hasVariantGroupsCol = headers.includes('variant groups (json)');
                const missingHeaders = [];
                if (!hasName) missingHeaders.push('name');
                if (!hasCategory) missingHeaders.push('category');
                if (!hasPrice) missingHeaders.push('price');
                
                if (missingHeaders.length > 0) {
                    throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
                }
                
                // Helper to parse price robustly from CSV text
                const parsePrice = (val) => {
                    const s = String(val || '')
                        .replace(/[^0-9.,-]/g, '') // remove currency symbols and letters
                        .replace(/,(?=\d{3}(\D|$))/g, '') // remove thousand separators
                        .replace(/,/g, '.'); // use dot as decimal
                    const n = parseFloat(s);
                    return isNaN(n) ? 0 : n;
                };
                const parseVariants = (val) => {
                    if (val === undefined || val === null) return [];
                    const txt = String(val).replace(/\u00A0/g, ' ').trim();
                    if (!txt) return [];
                    const parts = txt.split(/;|,(?=\s*[A-Za-z])/).map(p => p.trim()).filter(Boolean);
                    const variants = [];
                    for (const part of parts) {
                        const [n, p] = part.split(/:/);
                        const name = (n || '').trim();
                        const priceNum = parsePrice(p);
                        if (name && !isNaN(priceNum)) variants.push({ name, price: priceNum });
                    }
                    return variants;
                };

                // Process rows
                for (let i = headerRowIndex + 1; i < rows.length; i++) {
                    const row = rows[i].trim();
                    if (!row) continue; // Skip empty rows
                    // Parse columns with detected delimiter
                    const columns = parseCsvLine(row, delimiter).map(col => clean(col));
                    if (columns.length < 3) continue; // Skip incomplete rows
                    
                    const nameIndex = headers.indexOf('name');
                    const categoryIndex = headers.indexOf('category');
                    // Map indices with fallbacks
                    let priceIndex = headers.indexOf('price');
                    if (priceIndex === -1) priceIndex = headers.indexOf('base price');
                    const descIndex = headers.indexOf('description');
                    const vegIndex = headers.indexOf('vegetarian');
                    const featuredIndex = headers.indexOf('featured');
                    const activeIndex = headers.indexOf('status') !== -1 ?
                                       headers.indexOf('status') : headers.indexOf('active');
                    const sizeVarIndex = hasSizeVariantsCol ? headers.indexOf('size variants') : -1;
                    const vgIndex = hasVariantGroupsCol ? headers.indexOf('variant groups (json)') : -1;
                    
                    if (nameIndex === -1 || categoryIndex === -1 || priceIndex === -1) {
                        continue; // Skip rows without required fields
                    }
                    
                    // Helper to parse variant groups JSON safely
                    const parseVg = (val) => {
                        if (val === undefined || val === null) return [];
                        const txt = String(val).trim();
                        if (!txt) return [];
                        try {
                            return JSON.parse(txt);
                        } catch (e) {
                            // Try to unescape quotes if needed
                            try { return JSON.parse(txt.replace(/""/g, '"')); } catch (e2) { return []; }
                        }
                    };

                    rawItems.push({
                        _row: i + 1,
                        name: columns[nameIndex],
                        categoryName: columns[categoryIndex],
                        price: parsePrice(columns[priceIndex]),
                        sizeVariants: sizeVarIndex !== -1 && columns.length > sizeVarIndex ? parseVariants(columns[sizeVarIndex]) : [],
                        variantGroups: vgIndex !== -1 && columns.length > vgIndex ? parseVg(columns[vgIndex]) : [],
                        description: descIndex !== -1 && columns.length > descIndex ? columns[descIndex] : '',
            isVegetarian: vegIndex !== -1 && columns.length > vegIndex ? 
                     clean(columns[vegIndex]) === 'yes' : false,
            featured: featuredIndex !== -1 && columns.length > featuredIndex ? 
                clean(columns[featuredIndex]) === 'yes' : false,
            isActive: activeIndex !== -1 && columns.length > activeIndex ? 
                ['available','yes','true'].includes(clean(columns[activeIndex])) : true
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
                    const val = String(cell.value || '');
                    headers[colNumber - 1] = val
                        .replace(/\u00A0/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();
                });
                
                // Validate required headers
                // Accept either 'price' or 'base price' for price
                const hasNameX = headers.includes('name');
                const hasCategoryX = headers.includes('category');
                const hasPriceX = headers.includes('price') || headers.includes('base price');
                const missingHeaders = [];
                if (!hasNameX) missingHeaders.push('name');
                if (!hasCategoryX) missingHeaders.push('category');
                if (!hasPriceX) missingHeaders.push('price');
                
                if (missingHeaders.length > 0) {
                    throw new Error(`Excel is missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`);
                }
                
                // Map header indices
                const nameIndex = headers.indexOf('name');
                const categoryIndex = headers.indexOf('category');
                let priceIndex = headers.indexOf('price');
                if (priceIndex === -1) priceIndex = headers.indexOf('base price');
                const descIndex = headers.indexOf('description');
                const vegIndex = headers.indexOf('vegetarian');
                const featuredIndex = headers.indexOf('featured');
                const activeIndex = headers.indexOf('status') !== -1 ? 
                                   headers.indexOf('status') : headers.indexOf('active');
                const sizeVarIndexX = headers.indexOf('size variants');
                const vgIndexX = headers.indexOf('variant groups (json)');
                
                // Helper to parse price robustly from Excel values
                const parsePriceX = (val) => {
                    if (typeof val === 'number') return val;
                    const s = String(val || '')
                        .replace(/[^0-9.,-]/g, '')
                        .replace(/,(?=\d{3}(\D|$))/g, '')
                        .replace(/,/g, '.');
                    const n = parseFloat(s);
                    return isNaN(n) ? 0 : n;
                };
                const parseVariantsX = (val) => {
                    if (val === undefined || val === null) return [];
                    const txt = String(val).replace(/\u00A0/g, ' ').trim();
                    if (!txt) return [];
                    const parts = txt.split(/;|,(?=\s*[A-Za-z])/).map(p => p.trim()).filter(Boolean);
                    const variants = [];
                    for (const part of parts) {
                        const [n, p] = part.split(/:/);
                        const name = (n || '').trim();
                        const priceNum = parsePriceX(p);
                        if (name && !isNaN(priceNum)) variants.push({ name, price: priceNum });
                    }
                    return variants;
                };
                const parseVgX = (val) => {
                    if (val === undefined || val === null) return [];
                    try {
                        return typeof val === 'string' ? JSON.parse(val) : val;
                    } catch (e) { return []; }
                };

                // Process data rows
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header row
                    
                    const values = row.values;
                    if (!values[nameIndex + 1] || !values[categoryIndex + 1] || !values[priceIndex + 1]) {
                        return; // Skip rows without required fields
                    }
                    
                    rawItems.push({
                        _row: rowNumber,
                        name: values[nameIndex + 1],
                        categoryName: values[categoryIndex + 1],
                        price: parsePriceX(values[priceIndex + 1]),
                        sizeVariants: sizeVarIndexX !== -1 ? parseVariantsX(values[sizeVarIndexX + 1]) : [],
                        variantGroups: vgIndexX !== -1 ? parseVgX(values[vgIndexX + 1]) : [],
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
                // Basic validations
                const nameStr = String(rawItem.name || '').trim();
                const catStr = String(rawItem.categoryName || '').trim();
                if (!nameStr) {
                    errors.push({ item: rawItem, error: 'Missing Name' });
                    continue;
                }
                if (!catStr) {
                    errors.push({ item: rawItem, error: 'Missing Category' });
                    continue;
                }
                const svArr = Array.isArray(rawItem.sizeVariants) ? rawItem.sizeVariants : [];
                let vgArr = Array.isArray(rawItem.variantGroups) ? rawItem.variantGroups : [];
                // Normalize variant groups: basic shape and numeric coercion
                vgArr = vgArr.map(g => ({
                    name: g && g.name ? String(g.name).trim() : '',
                    selectionType: g && g.selectionType === 'multiple' ? 'multiple' : 'single',
                    options: Array.isArray(g?.options) ? g.options.map(o => ({
                        name: o && o.name ? String(o.name).trim() : '',
                        price: (o && o.price !== undefined && o.price !== null && !isNaN(parseFloat(o.price))) ? parseFloat(o.price) : undefined,
                        priceDelta: (o && o.priceDelta !== undefined && o.priceDelta !== null && !isNaN(parseFloat(o.priceDelta))) ? parseFloat(o.priceDelta) : 0
                    })).filter(o => o.name) : []
                })).filter(g => g.name && g.options.length > 0);
                if (!(rawItem.price > 0) && svArr.length === 0) {
                    // Attempt to derive size variants from a 'Size' variant group
                    const sizeGroup = vgArr.find(g => g.name.toLowerCase() === 'size');
                    let derived = [];
                    if (sizeGroup) {
                        derived = sizeGroup.options
                            .filter(o => o.price !== undefined && !isNaN(parseFloat(o.price)))
                            .map(o => ({ name: o.name, price: parseFloat(o.price) }));
                    }
                    if (derived.length === 0) {
                        errors.push({ item: rawItem, error: 'Missing price and size variants' });
                        continue;
                    }
                    rawItem.sizeVariants = derived;
                }
                // Find matching category
                let categoryId = null;
                const targetCat = catStr.toLowerCase();
                const matchingCategory = categories.find(c => {
                    const cname = String(c.name || '').trim().toLowerCase();
                    return cname === targetCat;
                });
                
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
                        
                        if (!catStr) {
                            errors.push({ item: rawItem, error: 'Missing Category' });
                            continue;
                        }
                        const newCategory = new Category({
                            categoryId: `CAT_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                            name: catStr,
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
                    tags: [],
                    sizeVariants: Array.isArray(rawItem.sizeVariants) && rawItem.sizeVariants.length > 0 ? rawItem.sizeVariants : svArr,
                    variantGroups: vgArr
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
                    row: item.item._row || null,
                    name: item.item.name,
                    reason: item.reason 
                })),
                errors: errors.map(item => ({ 
                    row: item.item._row || null,
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

