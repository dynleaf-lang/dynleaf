const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant'); 
const Branch = require('../models/Branches'); 

// Get all restaurants 
router.get('/', async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single restaurant by ID
router.get('/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get branches for a specific restaurant
router.get('/:restaurantId/branches', async (req, res) => {
    try {
        const branches = await Branch.find({ restaurantId: req.params.restaurantId });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new restaurant
router.post('/', async (req, res) => {
    const { name, address, city, postalCode, country, phone, email, openingHours } = req.body;
    const restaurant = new Restaurant({
        name,
        address,
        city,
        postalCode,
        country,
        phone,
        email,
        openingHours
    });
    try {
        const newRestaurant = await restaurant.save();
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a restaurant
router.put('/:id', async (req, res) => {
    const { name, address, city, postalCode, country, phone, email, openingHours } = req.body;
    try {
        const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, {
            name,
            address,
            city,
            postalCode,
            country,
            phone,
            email,
            openingHours
        }, { new: true });
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a restaurant
router.delete('/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json({ message: 'Restaurant deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;