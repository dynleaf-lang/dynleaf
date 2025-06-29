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
        res.json(tables);
    } catch (error) {
        console.error('Error fetching tables for branch:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;