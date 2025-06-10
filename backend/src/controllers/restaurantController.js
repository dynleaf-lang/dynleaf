const Restaurant = require('../models/Restaurant');

// Get all restaurants
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single restaurant by ID
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.status(200).json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new restaurant
exports.createRestaurant = async (req, res) => {
    try {
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
        
        const newRestaurant = await restaurant.save();
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a restaurant
exports.updateRestaurant = async (req, res) => {
    try {
        const { name, address, city, postalCode, country, phone, email, openingHours } = req.body;
        
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        
        restaurant.name = name || restaurant.name;
        restaurant.address = address || restaurant.address;
        restaurant.city = city || restaurant.city;
        restaurant.postalCode = postalCode || restaurant.postalCode;
        restaurant.country = country || restaurant.country;
        restaurant.phone = phone || restaurant.phone;
        restaurant.email = email || restaurant.email;
        restaurant.openingHours = openingHours || restaurant.openingHours;
        
        const updatedRestaurant = await restaurant.save();
        res.status(200).json(updatedRestaurant);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a restaurant
exports.deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        
        await Restaurant.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Restaurant deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};