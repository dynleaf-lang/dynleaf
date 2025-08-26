const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant'); 
const Branch = require('../models/Branches'); 
const fs = require('fs');
const path = require('path');

function deleteLogoFileIfLocal(logoUrl) {
    try {
        if (!logoUrl) return;
        const match = String(logoUrl).match(/\/uploads\/([^/?#]+)/);
        if (!match || !match[1]) return;
        const filename = match[1];
        // Prevent directory traversal
        if (filename.includes('..')) return;
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (_) {}
}

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
    const { name, brandName, logo, address, city, postalCode, country, phone, email, openingHours } = req.body;
    const restaurant = new Restaurant({
        name,
        brandName,
        logo,
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

// Update a restaurant (with old logo cleanup if changed/cleared)
router.put('/:id', async (req, res) => {
    const { name, brandName, logo, address, city, postalCode, country, phone, email, openingHours } = req.body;
    try {
        const existing = await Restaurant.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Restaurant not found' });

        const incomingLogo = typeof logo === 'string' ? logo : existing.logo;
        const isClearingLogo = incomingLogo === '' || incomingLogo === null;
        const isChangingLogo = incomingLogo && existing.logo && String(incomingLogo) !== String(existing.logo);

        // Perform update
        existing.name = name ?? existing.name;
        existing.brandName = brandName ?? existing.brandName;
        existing.logo = (logo === undefined) ? existing.logo : logo; // allow clearing with empty string
        existing.address = address ?? existing.address;
        existing.city = city ?? existing.city;
        existing.postalCode = postalCode ?? existing.postalCode;
        existing.country = country ?? existing.country;
        existing.phone = phone ?? existing.phone;
        existing.email = email ?? existing.email;
        existing.openingHours = openingHours ?? existing.openingHours;

        const updated = await existing.save();

        // After save, delete old file if logo was cleared or changed
        if ((isClearingLogo || isChangingLogo) && existing.logo !== undefined) {
            const oldLogo = isClearingLogo ? existing.logo : (String(existing.logo) !== String(incomingLogo) ? existing.logo : null);
            if (oldLogo) deleteLogoFileIfLocal(oldLogo);
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a restaurant (also remove local logo file if present)
router.delete('/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        // Delete associated logo file if local
        if (restaurant.logo) deleteLogoFileIfLocal(restaurant.logo);
        await Restaurant.findByIdAndDelete(req.params.id);
        res.json({ message: 'Restaurant deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;