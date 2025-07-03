const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DiningTable = require('../models/DiningTables');
const mongoose = require('mongoose');
const { publicAccess } = require('../middleware/authMiddleware');
const { emitNewOrder } = require('../utils/socketUtils');

// Debug middleware for this router
router.use((req, res, next) => {
    console.log(`[PUBLIC ORDERS DEBUG] ${req.method} ${req.originalUrl}`);
    next();
});

// Make all routes in this file public
router.use(publicAccess);

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

            // For now, be more permissive - allow up to 5 active orders per table
            // This handles group dining and ensures customers aren't blocked unnecessarily
            if (activeOrders >= 5) {
                console.log('[PUBLIC ORDER CREATE] Table has many active orders:', { tableId, activeOrders });
                return res.status(400).json({ 
                    message: `Table has too many active orders (${activeOrders}). Please contact staff for assistance.` 
                });
            }

            console.log('[PUBLIC ORDER CREATE] Table check passed:', { tableId, activeOrders });
        }

        // Prepare customer information
        const customer = customerInfo || {};
        const finalCustomerName = customer.name || customerName || 'Guest';
        const finalCustomerPhone = customer.phone || customerPhone || '';
        const finalCustomerEmail = customer.email || '';

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
                        currentOrderId: savedOrder._id,
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
                currentOrderId: null,
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
                currentOrderId: null,
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

module.exports = router;
