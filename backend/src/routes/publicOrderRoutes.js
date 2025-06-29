const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const DiningTable = require('../models/DiningTables');
const mongoose = require('mongoose');
const { publicAccess } = require('../middleware/authMiddleware');

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
        const {
            branchId,
            tableId,
            items,
            customerName,
            customerPhone,
            specialInstructions
        } = req.body;

        // Validate required fields
        if (!branchId || !items || !items.length) {
            return res.status(400).json({ message: 'Branch ID and order items are required' });
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

            if (table.status === 'occupied') {
                return res.status(400).json({ message: 'Table is already occupied' });
            }
        }

        // Create a new order
        const order = new Order({
            branchId,
            tableId,
            items: items.map(item => ({
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                specialInstructions: item.specialInstructions || ''
            })),
            status: 'pending',
            orderType: tableId ? 'dine-in' : 'takeaway',
            customerName,
            customerPhone,
            specialInstructions: specialInstructions || '',
            totalAmount: items.reduce((total, item) => total + (item.price * item.quantity), 0)
        });

        // Save the order
        const savedOrder = await order.save();

        // If it's a dine-in order, update the table status to occupied
        if (tableId) {
            await DiningTable.findByIdAndUpdate(
                tableId, 
                { 
                    status: 'occupied',
                    currentOrderId: savedOrder._id
                }
            );
        }

        res.status(201).json(savedOrder);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: error.message });
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
            status: { $in: ['pending', 'preparing', 'ready'] }
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

module.exports = router;
