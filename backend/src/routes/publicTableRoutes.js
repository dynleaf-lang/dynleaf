const express = require('express');
const router = express.Router();
const Table = require('../models/DiningTables.js');
const { publicAccess } = require('../middleware/authMiddleware');

// Make all routes in this file public
router.use(publicAccess);

// Get all tables (with optional filtering)
router.get('/', async (req, res) => {
    try {
        // Extract query parameters
        const { branchId, floorId, zone, status, isVIP } = req.query;
        
        // Build query object based on parameters
        let query = {};
        if (branchId) query.branchId = branchId;
        if (floorId) query.floorId = floorId;
        if (zone) query.zone = zone;
        if (status) query.status = status;
        if (isVIP !== undefined) query.isVIP = isVIP === 'true';
        
        // Find tables that match the query
        const tables = await Table.find(query).sort({ tableNumber: 1 });
        res.json(tables);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get a single table by ID
router.get('/:id', async (req, res) => {
    try {
        const table = await Table.findById(req.params.id);
        
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        
        res.json(table);
    } catch (error) {
        console.error('Error fetching table by ID:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get tables for a specific branch
router.get('/branch/:branchId', async (req, res) => {
    try {
        const { branchId } = req.params;
        
        if (!branchId) {
            return res.status(400).json({ message: 'Branch ID is required' });
        }
        
        const tables = await Table.find({ branchId }).sort({ tableNumber: 1 });
        res.json({ tables }); // Fixed: Wrap in object for frontend compatibility
    } catch (error) {
        console.error('Error fetching tables for branch:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update table status (PATCH endpoint for POS system)
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, currentOrderId } = req.body;
        
        if (!id) {
            return res.status(400).json({ message: 'Table ID is required' });
        }
        
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        
    // Normalize and validate status values
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'];
    const normalizedStatus = (status || '').toLowerCase() === 'blocked' ? 'maintenance' : status;
    if (!validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }
        
        // Build update object
    const updateData = { status: normalizedStatus };
        if (currentOrderId !== undefined) {
            updateData.currentOrderId = currentOrderId;
        }
        
        // Update the table
        const updatedTable = await Table.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedTable) {
            return res.status(404).json({ message: 'Table not found' });
        }
        
    console.log(`[PUBLIC TABLES] Table ${id} status updated to: ${normalizedStatus}`);
        res.json({ 
            message: 'Table status updated successfully',
            table: updatedTable 
        });
        
    } catch (error) {
        console.error('Error updating table status:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;