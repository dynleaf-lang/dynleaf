const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DiningTable = require('../models/DiningTables');
const mongoose = require('mongoose');
const { publicAccess } = require('../middleware/authMiddleware');
const { emitNewOrder } = require('../utils/socketUtils');

// Simple in-memory cache to track recent order requests
const recentOrderRequests = new Map();

// Clean up old requests every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentOrderRequests.entries()) {
        if (now - timestamp > 300000) { // 5 minutes
            recentOrderRequests.delete(key);
        }
    }
}, 300000);

// Debug middleware for this router
router.use((req, res, next) => {
    console.log(`[PUBLIC ORDERS DEBUG] ${req.method} ${req.originalUrl}`);
    next();
});

// Make all routes in this file public
router.use(publicAccess);

// Get all orders with filtering capability for admin dashboard
router.get('/', async (req, res) => {
    try {
        console.log('[PUBLIC ORDERS] GET all orders request received');
        console.log('[PUBLIC ORDERS] Query params:', req.query);

        const { 
            restaurantId, 
            branchId, 
            orderStatus, 
            OrderType, 
            paymentStatus,
            startDate, 
            endDate,
            limit = 100 
        } = req.query;

        // Build filter object based on query parameters
        const filter = {};
        
        if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
            filter.restaurantId = restaurantId;
        }
        
        if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
            filter.branchId = branchId;
        }
        
        if (orderStatus) {
            filter.status = orderStatus;
        }
        
        if (OrderType) {
            filter.orderType = OrderType;
        }
        
        if (paymentStatus) {
            filter.paymentStatus = paymentStatus;
        }
        
        // Date range filtering
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add 1 day to endDate to include the full day
                const nextDay = new Date(endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                filter.createdAt.$lt = nextDay;
            }
        }
        
        console.log('[PUBLIC ORDERS] Applying filters:', filter);

        // Execute the query
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate('restaurantId', 'name')
            .populate('branchId', 'name')
            .populate('tableId', 'TableName tableId');
            
        console.log(`[PUBLIC ORDERS] Found ${orders.length} orders`);

        res.json({
            success: true,
            orders: orders,
            total: orders.length
        });
    } catch (error) {
        console.error('[PUBLIC ORDERS] Error fetching orders:', error);
        res.status(500).json({ 
            message: 'Failed to fetch orders',
            error: error.message 
        });
    }
});

// Create a new order
router.post('/', async (req, res) => {
    try {
        console.log('[PUBLIC ORDER CREATE] Request body:', JSON.stringify(req.body, null, 2));
        
        const {
            restaurantId,
            branchId,
            tableId,
            items,
            customerInfo,
            orderType,
            paymentMethod,
            status,
            notes,
            taxAmount,
            taxDetails,
            subtotal,
            total,
            // Legacy fields for backward compatibility
            customerName,
            customerPhone,
            specialInstructions
        } = req.body;

        // Validate required fields
        if (!branchId || !items || !items.length) {
            console.log('[PUBLIC ORDER CREATE] Validation failed:', { branchId, itemsLength: items?.length });
            return res.status(400).json({ message: 'Branch ID and order items are required' });
        }

        // Validate restaurantId (make it required)
        if (!restaurantId) {
            console.log('[PUBLIC ORDER CREATE] Missing restaurantId');
            return res.status(400).json({ message: 'Restaurant ID is required' });
        }
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            console.log('[PUBLIC ORDER CREATE] Invalid restaurantId format:', restaurantId);
            return res.status(400).json({ message: 'Invalid restaurant ID format' });
        }

        // Validate branchId format
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            console.log('[PUBLIC ORDER CREATE] Invalid branchId format:', branchId);
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }

        // Validate items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Check for all required fields
            if (!item.menuItemId) {
                console.log('[PUBLIC ORDER CREATE] Missing menuItemId at index', i);
                return res.status(400).json({ 
                    message: `Item at index ${i} is missing menuItemId` 
                });
            }
            if (!item.name || typeof item.name !== 'string') {
                console.log('[PUBLIC ORDER CREATE] Missing or invalid name at index', i, 'name:', item.name);
                return res.status(400).json({ 
                    message: `Item at index ${i} is missing or has invalid name` 
                });
            }
            if (!item.price || isNaN(Number(item.price)) || Number(item.price) < 0) {
                console.log('[PUBLIC ORDER CREATE] Missing or invalid price at index', i, 'price:', item.price);
                return res.status(400).json({ 
                    message: `Item at index ${i} has missing or invalid price: ${item.price}` 
                });
            }
            if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
                console.log('[PUBLIC ORDER CREATE] Missing or invalid quantity at index', i, 'quantity:', item.quantity);
                return res.status(400).json({ 
                    message: `Item at index ${i} has missing or invalid quantity: ${item.quantity}` 
                });
            }
            if (item.subtotal === undefined || isNaN(Number(item.subtotal)) || Number(item.subtotal) < 0) {
                console.log('[PUBLIC ORDER CREATE] Missing or invalid subtotal at index', i, 'subtotal:', item.subtotal);
                return res.status(400).json({ 
                    message: `Item at index ${i} has missing or invalid subtotal: ${item.subtotal}` 
                });
            }
            
            // Validate ObjectId format
            if (!mongoose.Types.ObjectId.isValid(item.menuItemId)) {
                console.log('[PUBLIC ORDER CREATE] Invalid menuItemId format at index', i, ':', item.menuItemId);
                return res.status(400).json({ 
                    message: `Item at index ${i} has invalid menuItemId format: ${item.menuItemId}` 
                });
            }
        }

        // Validate orderType enum value
        const validOrderTypes = ['dine-in', 'takeaway', 'delivery'];
        if (orderType && !validOrderTypes.includes(orderType)) {
            console.log('[PUBLIC ORDER CREATE] Invalid orderType:', orderType, 'Valid types:', validOrderTypes);
            return res.status(400).json({ 
                message: `Invalid orderType: ${orderType}. Valid values are: ${validOrderTypes.join(', ')}` 
            });
        }

        // Check if the tableId is valid and available
        if (tableId) {
            if (!mongoose.Types.ObjectId.isValid(tableId)) {
                return res.status(400).json({ message: 'Invalid table ID format' });
            }

            const table = await DiningTable.findById(tableId);
            if (!table) {
                return res.status(404).json({ message: 'Table not found' });
            }

            // Instead of checking table status, check for active orders on this table
            // Allow multiple orders per table but warn if there are many pending orders
            const activeOrders = await Order.find({
                tableId: tableId,
                status: { $in: ['pending', 'confirmed', 'preparing'] }
            }).countDocuments();

            // Previously: hard-block when active orders >= 5
            // Change: do NOT block creation, only log a warning so POS can proceed (handles group dining/KOT batching)
            // If needed, enforce via configurable threshold in the future
            if (activeOrders >= 5) {
                console.warn('[PUBLIC ORDER CREATE][WARNING] High active orders for table, proceeding anyway:', { tableId, activeOrders });
                // Optionally include a response header for observability
                res.setHeader('X-Table-Active-Orders', String(activeOrders));
            }

            console.log('[PUBLIC ORDER CREATE] Table check passed:', { tableId, activeOrders });
        }

        // Prepare customer information
        const customer = customerInfo || {};
        const finalCustomerName = customer.name || customerName || 'Guest';
        const finalCustomerPhone = customer.phone || customerPhone || '';
        const finalCustomerEmail = customer.email || '';

        // Create a unique request signature to prevent rapid duplicate submissions
        const requestSignature = `${branchId}-${restaurantId}-${finalCustomerPhone}-${JSON.stringify(items.map(i => ({ id: i.menuItemId, q: i.quantity, p: i.price })).sort((a, b) => a.id.localeCompare(b.id)))}`;
        const requestHash = Buffer.from(requestSignature).toString('base64');
        
        // Check if this exact request was made recently (within 10 seconds)
        const recentRequestTime = recentOrderRequests.get(requestHash);
        if (recentRequestTime && (Date.now() - recentRequestTime) < 10000) {
            console.log('[PUBLIC ORDER CREATE] Duplicate request detected within 10 seconds:', requestHash);
            return res.status(429).json({ 
                message: 'This order was just submitted. Please wait before trying again.',
                _duplicateRequest: true,
                _waitSeconds: Math.ceil((10000 - (Date.now() - recentRequestTime)) / 1000)
            });
        }
        
        // Track this request
        recentOrderRequests.set(requestHash, Date.now());

        // Check for potential duplicate orders within the last 30 seconds
        const recentOrderThreshold = new Date(Date.now() - 30000); // 30 seconds ago
        
        // Calculate subtotal for comparison (ensure consistent calculation)
        const calculatedSubtotal = items.reduce((total, item) => {
            const itemSubtotal = Number(item.price) * Number(item.quantity);
            return total + Math.round(itemSubtotal * 100) / 100; // Round to 2 decimal places
        }, 0);
        const orderSubtotal = Number(subtotal) || calculatedSubtotal;
        const roundedSubtotal = Math.round(orderSubtotal * 100) / 100;
        
        // Build duplicate filter - be more strict to avoid false positives
        const duplicateFilter = {
            branchId,
            restaurantId,
            subtotal: roundedSubtotal,
            createdAt: { $gte: recentOrderThreshold }
        };
        
        // Only add customerPhone to filter if it's provided and not empty
        if (finalCustomerPhone && finalCustomerPhone.trim() !== '') {
            duplicateFilter.customerPhone = finalCustomerPhone.trim();
        }
        
        // Add tableId to filter if provided (for dine-in orders)
        if (tableId) {
            duplicateFilter.tableId = tableId;
        } else {
            // For takeaway/delivery orders, ensure no table is assigned
            duplicateFilter.tableId = { $exists: false };
        }
        
        // Additional check: compare item count and total items to reduce false positives
        duplicateFilter['items.0'] = { $exists: true }; // Must have at least one item
        
        console.log('[PUBLIC ORDER CREATE] Checking for duplicates with filter:', duplicateFilter);
        
        const recentDuplicateOrder = await Order.findOne(duplicateFilter);
        
        if (recentDuplicateOrder) {
            console.log('[PUBLIC ORDER CREATE] Potential duplicate order detected:', {
                existingOrderId: recentDuplicateOrder._id,
                existingOrderTime: recentDuplicateOrder.createdAt,
                timeDifferenceMs: Date.now() - recentDuplicateOrder.createdAt.getTime()
            });
            
            // Additional verification: check if items are actually similar
            const existingItems = recentDuplicateOrder.items || [];
            const newItems = items || [];
            
            // Compare item counts first
            if (existingItems.length !== newItems.length) {
                console.log('[PUBLIC ORDER CREATE] Item counts differ, not a duplicate:', {
                    existingCount: existingItems.length,
                    newCount: newItems.length
                });
            } else {
                // Check if items are similar (same menuItemIds and quantities)
                const itemsMatch = newItems.every(newItem => {
                    return existingItems.some(existingItem => 
                        String(existingItem.menuItemId) === String(newItem.menuItemId) &&
                        Number(existingItem.quantity) === Number(newItem.quantity) &&
                        Math.abs(Number(existingItem.price) - Number(newItem.price)) < 0.01
                    );
                });
                
                if (itemsMatch) {
                    console.log('[PUBLIC ORDER CREATE] Confirmed duplicate order - items match exactly');
                    
                    // Return the existing order instead of creating a duplicate
                    return res.status(200).json({
                        ...recentDuplicateOrder.toObject(),
                        _duplicateDetected: true,
                        _message: 'Duplicate order detected. Returning existing order.',
                        _timeDifference: Date.now() - recentDuplicateOrder.createdAt.getTime()
                    });
                } else {
                    console.log('[PUBLIC ORDER CREATE] Items differ, not a duplicate order');
                }
            }
        }

        // Create a new order
        const order = new Order({
            restaurantId,
            branchId,
            tableId,
            items: items.map(item => ({
                menuItemId: item.menuItemId,
                name: String(item.name).trim(),
                price: Number(item.price),
                quantity: Number(item.quantity),
                notes: item.notes ? String(item.notes).trim() : '',
                subtotal: Number(item.subtotal) || Number(item.price) * Number(item.quantity)
            })),
            status: status || 'pending',
            orderType: orderType || (tableId ? 'dine-in' : 'takeaway'),
            customerName: finalCustomerName,
            customerPhone: finalCustomerPhone,
            customerEmail: finalCustomerEmail,
            paymentMethod: paymentMethod || 'cash',
            notes: notes || specialInstructions || '',
            taxAmount: Number(taxAmount) || 0,
            taxDetails: taxDetails || {},
            subtotal: Number(subtotal) || items.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0),
            totalAmount: Number(total) || (Number(subtotal) || items.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0)) + (Number(taxAmount) || 0)
        });

        console.log('[PUBLIC ORDER CREATE] Creating order:', JSON.stringify(order.toObject(), null, 2));

        // Save the order
        let savedOrder;
        try {
            savedOrder = await order.save();
            console.log('[PUBLIC ORDER CREATE] Order saved successfully:', savedOrder._id);
            
            // Remove the request from tracking since it was successful
            recentOrderRequests.delete(requestHash);
        } catch (saveError) {
            console.error('[PUBLIC ORDER CREATE] Error saving order:', saveError);
            console.error('[PUBLIC ORDER CREATE] Error name:', saveError.name);
            console.error('[PUBLIC ORDER CREATE] Error message:', saveError.message);
            if (saveError.errors) {
                console.error('[PUBLIC ORDER CREATE] Validation errors:', JSON.stringify(saveError.errors, null, 2));
                Object.keys(saveError.errors).forEach(field => {
                    console.error(`[PUBLIC ORDER CREATE] Field "${field}" error:`, saveError.errors[field].message);
                });
            }
            if (saveError.name === 'ValidationError') {
                return res.status(400).json({ 
                    message: 'Order validation failed',
                    errors: saveError.errors,
                    details: Object.keys(saveError.errors).map(field => ({
                        field,
                        message: saveError.errors[field].message
                    }))
                });
            }
            throw new Error(`Failed to save order: ${saveError.message}`);
        }

        // If it's a dine-in order, update the table status and add order reference
        if (tableId) {
            try {
                await DiningTable.findByIdAndUpdate(
                    tableId, 
                    { 
                        status: 'occupied',
                        currentOrder: savedOrder._id,  // Use currentOrder instead of currentOrderId
                        isOccupied: true,
                        lastOrderTime: new Date()
                    }
                );
                console.log('[PUBLIC ORDER CREATE] Table status updated:', tableId);
            } catch (tableUpdateError) {
                console.error('[PUBLIC ORDER CREATE] Failed to update table status:', tableUpdateError);
                // Don't fail the order if table update fails
            }
        }

        // Emit real-time notification for new order from customer
        try {
            emitNewOrder(savedOrder);
        } catch (socketError) {
            console.error('[PUBLIC ORDER CREATE] Error emitting new order notification:', socketError);
            // Don't fail the order creation if socket emission fails
        }

        res.status(201).json(savedOrder);
    } catch (error) {
        console.error('[PUBLIC ORDER CREATE] Error creating order:', error);
        res.status(500).json({ 
            message: error.message,
            details: error.stack
        });
    }
});

// Check order status
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid order ID format' });
        }

        const order = await Order.findById(id)
            .select('-__v')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get orders by table ID
router.get('/table/:tableId', async (req, res) => {
    try {
        const { tableId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            return res.status(400).json({ message: 'Invalid table ID format' });
        }

        const orders = await Order.find({
            tableId,
            $or: [
                { status: { $in: ['pending', 'preparing', 'ready'] } },
                { orderStatus: { $in: ['Pending', 'Processing'] } }
            ]
        })
        .sort({ createdAt: -1 })
        .lean();

        res.json(orders);
    } catch (error) {
        console.error('Error fetching table orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get orders by customer phone number (last 5 orders)
router.get('/customer/:phoneNumber', async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const orders = await Order.find({
            customerPhone: phoneNumber
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

        res.json(orders);
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get orders by customer identifier (phone or email) - more flexible endpoint
router.get('/customer-orders/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        
        if (!identifier) {
            return res.status(400).json({ message: 'Customer identifier (phone or email) is required' });
        }

        // Check if identifier is email or phone
        const isEmail = identifier.includes('@');
        
        let query;
        if (isEmail) {
            query = { customerEmail: identifier };
        } else {
            query = { customerPhone: identifier };
        }

        console.log('[GET CUSTOMER ORDERS] Searching for orders with:', query);

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(20) // Increased limit to get more order history
            .lean();

        console.log(`[GET CUSTOMER ORDERS] Found ${orders.length} orders for identifier: ${identifier}`);

        res.json(orders);
    } catch (error) {
        console.error('Error fetching customer orders by identifier:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reset table status (utility route for development/testing)
router.post('/reset-table/:tableId', async (req, res) => {
    try {
        const { tableId } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
            return res.status(400).json({ message: 'Invalid table ID format' });
        }

        const table = await DiningTable.findByIdAndUpdate(
            tableId,
            { 
                status: 'available',
                currentOrder: null,
                isOccupied: false,
                lastOrderTime: null
            },
            { new: true }
        );

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        console.log('[PUBLIC ORDER] Table status reset:', tableId);
        res.json({ 
            message: 'Table status reset successfully', 
            table: {
                _id: table._id,
                number: table.number,
                status: table.status
            }
        });
    } catch (error) {
        console.error('Error resetting table status:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reset all tables to available (utility route for development/testing)
router.post('/reset-all-tables', async (req, res) => {
    try {
        const result = await DiningTable.updateMany(
            {},
            { 
                status: 'available',
                currentOrder: null,
                isOccupied: false,
                lastOrderTime: null
            }
        );

        console.log('[PUBLIC ORDER] All tables reset:', result.modifiedCount);
        res.json({ 
            message: `Successfully reset ${result.modifiedCount} tables to available status`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error resetting all tables:', error);
        res.status(500).json({ message: error.message });
    }
});

// Routes for getting all orders with advanced filtering
router.get('/all', async (req, res) => {
    const { 
        restaurantId, 
        branchId, 
        orderStatus, 
        OrderType, 
        startDate, 
        endDate 
    } = req.query;
    
    try {
        // Build filter object
        let filter = {};
        
        if (restaurantId) filter.restaurantId = restaurantId;
        if (branchId) filter.branchId = branchId;
        if (orderStatus) filter.orderStatus = orderStatus;
        if (OrderType) filter.OrderType = OrderType;
        
        // Add date range filters if provided
        if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) filter.orderDate.$gte = new Date(startDate);
            if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
        }
        
        const orders = await Order.find(filter)
            .populate('restaurantId', 'name address country')
            .populate('branchId', 'name')
            .populate('customerId', 'name email phone')
            .populate('items.itemId', 'name')
            .populate('items.categoryId', 'name')
            .sort({ orderDate: -1 });
            
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching filtered orders:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching filtered orders',
            error: error.message
        });
    }
});

// Get order status statistics
router.get('/statistics', async (req, res) => {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    try {
        // Build filter object
        let filter = {};
        
        if (restaurantId) filter.restaurantId = restaurantId;
        if (branchId) filter.branchId = branchId;
        
        // Add date range filters if provided
        if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) filter.orderDate.$gte = new Date(startDate);
            if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
        }
        
        // Get orders by status
        const ordersByStatus = await Order.aggregate([
            { $match: filter },
            { $group: { 
                _id: '$orderStatus', 
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
            }},
            { $sort: { count: -1 } }
        ]);
        
        res.status(200).json({ ordersByStatus });
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching order statistics',
            error: error.message
        });
    }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const { id } = req.params;
        
        if (!orderStatus) {
            return res.status(400).json({
                success: false,
                message: 'Order status is required'
            });
        }
            
        // Validate status values
        const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Map legacy status to new status format
        const statusMapping = {
            'Pending': 'pending',
            'Processing': 'preparing',
            'Completed': 'ready',
            'Cancelled': 'cancelled'
        };

        const newStatus = statusMapping[orderStatus];

        // Get the current order to track old status
        const currentOrder = await Order.findById(id);
        if (!currentOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const oldStatus = currentOrder.orderStatus;

        const order = await Order.findByIdAndUpdate(
            id,
            { 
                orderStatus,  // Update legacy field
                status: newStatus  // Update new field
            },
            { new: true, runValidators: true }
        ).populate('restaurantId', 'name address country')
         .populate('branchId', 'name address phone')
         .populate('customerId', 'name email phone')
         .populate('items.itemId', 'name description')
         .populate('items.menuItemId', 'name description')
         .populate('items.categoryId', 'name');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Emit real-time status update notification
        try {
            const { emitStatusUpdate } = require('../utils/socketUtils');
            console.log(`[SOCKET] Emitting status update: ${oldStatus} → ${orderStatus}`);
            console.log(`[SOCKET] Order ID: ${order._id}, Order Number: ${order.orderId}`);
            emitStatusUpdate(order, oldStatus, orderStatus);
            console.log(`[SOCKET] Status update emitted successfully`);
        } catch (socketError) {
            console.error('Error emitting status update notification:', socketError);
            // Don't fail the status update if socket emission fails
        }
        
        res.status(200).json({
            success: true,
            data: order,
            message: `Order status updated to ${orderStatus}`
        });
    } catch (error) {
        console.error(`Error updating order status:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating order status',
            error: error.message
        });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Order deleted successfully',
            data: {}
        });
    } catch (error) {
        console.error(`Error deleting order ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting order',
            error: error.message
        });
    }
});

// Generate invoice for an order
router.get('/:id/invoice', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('restaurantId', 'name address country')
            .populate('customerId', 'name email')
            .populate('items.itemId', 'name description')
            .populate('items.categoryId', 'name');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Simple placeholder for invoice generation (actual implementation would use PDFKit)
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`);
        
        // In a real implementation, you would generate a PDF here
        // For now, we'll send a simple response
        res.status(200).send('This would be a PDF invoice');
    } catch (error) {
        console.error(`Error generating invoice for order ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating invoice',
            error: error.message
        });
    }
});

// Update payment status
router.patch('/:id/payment-status', async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        
        console.log(`[PUBLIC ORDERS] Updating order ${req.params.id} payment status to: ${paymentStatus}`);
        
        if (!paymentStatus) {
            return res.status(400).json({
                success: false,
                message: 'Payment status is required'
            });
        }
        
        // Validate payment status values
        const validPaymentStatuses = ['unpaid', 'paid', 'pending', 'failed', 'refunded', 'partial'];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`
            });
        }

        // Get the current order to track old payment status
        const currentOrder = await Order.findById(req.params.id);
        if (!currentOrder) {
            console.log(`[PUBLIC ORDERS] Order not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const oldPaymentStatus = currentOrder.paymentStatus;

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { paymentStatus },
            { new: true, runValidators: true }
        ).populate('restaurantId', 'name address country')
         .populate('branchId', 'name address phone')
         .populate('customerId', 'name email phone')
         .populate('items.itemId', 'name description')
         .populate('items.menuItemId', 'name description')
         .populate('items.categoryId', 'name');
        
        if (!order) {
            console.log(`[PUBLIC ORDERS] Order not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        console.log(`[PUBLIC ORDERS] Order payment status updated successfully: ${order.orderId} → ${paymentStatus}`);
        
        // Emit real-time payment status update notification
        try {
            const { emitOrderUpdate } = require('../utils/socketUtils');
            emitOrderUpdate({
                eventType: 'updated',
                order: order,
                message: `Payment status updated to ${paymentStatus}`,
                oldPaymentStatus,
                newPaymentStatus: paymentStatus
            });
        } catch (socketError) {
            console.error('[PUBLIC ORDERS] Error emitting payment status update notification:', socketError);
            // Don't fail the payment status update if socket emission fails
        }
        
        res.status(200).json({
            success: true,
            data: order,
            message: `Payment status updated to ${paymentStatus}`
        });
    } catch (error) {
        console.error(`[PUBLIC ORDERS] Error updating payment status for ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating payment status',
            error: error.message
        });
    }
});

module.exports = router;
