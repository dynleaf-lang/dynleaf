const express = require('express');
const router = express.Router();
const Branch = require('../models/Branches'); 

// Get all branches 
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find().populate('restaurantId', 'name');
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get branches by restaurant ID
router.get('/restaurant/:restaurantId', async (req, res) => {
    try {
        const branches = await Branch.find({ restaurantId: req.params.restaurantId }).populate('restaurantId', 'name');
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single branch by ID
router.get('/:id', async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id).populate('restaurantId', 'name');
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new branch
router.post('/', async (req, res) => {
    const { restaurantId, name, address, phone, email, openingHours } = req.body;
    const branch = new Branch({
        restaurantId,
        name,
        address,
        phone,
        email,
        openingHours
    });
    try {
        const newBranch = await branch.save();
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a branch
router.put('/:id', async (req, res) => {
    const { name, address, phone, email, openingHours } = req.body;
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, {
            name,
            address,
            phone,
            email,
            openingHours
        }, { new: true });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a branch
router.delete('/:id', async (req, res) => {
    try {
        const branch = await Branch.findByIdAndDelete(req.params.id);
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json({ message: 'Branch deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;