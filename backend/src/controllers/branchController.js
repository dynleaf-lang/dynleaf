const Branch = require('../models/Branches');
const Restaurant = require('../models/Restaurant');

// Get all branches
exports.getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find();
        res.status(200).json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get branches by restaurant ID
exports.getBranchesByRestaurant = async (req, res) => {
    try {
        const branches = await Branch.find({ restaurantId: req.params.restaurantId });
        res.status(200).json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a single branch by ID
exports.getBranchById = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        res.status(200).json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new branch
exports.createBranch = async (req, res) => {
    try {
        const { restaurantId, name, address, city, postalCode, country, phone, email, openingHours } = req.body;
        
        // Verify that the restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        
        const branch = new Branch({
            restaurantId,
            name,
            address,
            city,
            postalCode,
            country,
            phone,
            email,
            openingHours
        });
        
        const newBranch = await branch.save();
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a branch
exports.updateBranch = async (req, res) => {
    try {
        const { name, address, city, postalCode, country, phone, email, openingHours } = req.body;
        
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        branch.name = name || branch.name;
        branch.address = address || branch.address;
        branch.city = city || branch.city;
        branch.postalCode = postalCode || branch.postalCode;
        branch.country = country || branch.country;
        branch.phone = phone || branch.phone;
        branch.email = email || branch.email;
        branch.openingHours = openingHours || branch.openingHours;
        
        const updatedBranch = await branch.save();
        res.status(200).json(updatedBranch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a branch
exports.deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        
        await Branch.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};