const Customer = require('../models/Customer');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// @desc    Get all customers for a restaurant or specific branch
// @route   GET /api/customers/restaurant/:restaurantId
// @access  Private
const getRestaurantCustomers = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { user } = req;
        
        console.log(`Fetching customers for restaurant: ${restaurantId} by user: ${user._id} (${user.role})`);
        
        // Validate restaurantId
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            console.log(`Invalid restaurant ID format: ${restaurantId}`);
            return res.status(400).json({ message: 'Invalid restaurant ID format' });
        }

        // Build query based on user role and permissions
        let query = { restaurantId };
        
        // If user is not Super_Admin and has a specific branchId, restrict to that branch
        if (user.role !== 'Super_Admin' && user.branchId) {
            query.branchId = user.branchId;
            console.log(`Restricting to branch: ${user.branchId} for non-Super_Admin user`);
        }

        console.log('Executing query with:', JSON.stringify(query));
        
        // Get customers for the restaurant (and possibly branch-specific)
        const customers = await Customer.find(query).sort({ createdAt: -1 });
        
        console.log(`Found ${customers.length} customers for restaurant ${restaurantId}`);
        res.status(200).json(customers);
    } catch (error) {
        console.error('Error fetching restaurant customers:', error);
        res.status(500).json({ message: 'Server error while fetching customers', error: error.message });
    }
};

// @desc    Get all customers (for Super_Admin only)
// @route   GET /api/customers/all
// @access  Private (Super_Admin only)
const getAllCustomers = async (req, res) => {
    try {
        const { user } = req;
        const { restaurantId, branchId, search } = req.query; // Added search parameter
        
        console.log(`Fetching all customers with filters - restaurantId: ${restaurantId || 'none'}, branchId: ${branchId || 'none'}, search: ${search || 'none'}`);

        // Build query based on user role and permissions
        let query = {};
        
        if (user.role === 'Super_Admin') {
            // Super_Admin can filter by any restaurant/branch
            if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
                query.restaurantId = restaurantId;
            }
            if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
                query.branchId = branchId;
            }
        } else {
            // Non-Super_Admin users are restricted to their restaurant
            query.restaurantId = user.restaurantId;
            
            // If user has a branch, restrict to that branch
            if (user.branchId) {
                query.branchId = user.branchId;
            }
        }
        
        // Add search functionality - this is allowed for all roles
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { customerId: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Executing query with:', JSON.stringify(query));

        // Get all customers with optional filters
        const customers = await Customer.find(query)
            .sort({ createdAt: -1 })
            .populate('restaurantId', 'name')
            .populate('branchId', 'name');
        
        console.log(`Found ${customers.length} customers`);
        res.status(200).json(customers);
    } catch (error) {
        console.error('Error fetching all customers:', error);
        res.status(500).json({ message: 'Server error while fetching customers', error: error.message });
    }
};

// @desc    Get customers for a specific branch
// @route   GET /api/customers/branch/:branchId
// @access  Private
const getBranchCustomers = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { user } = req;
        
        console.log(`Fetching customers for branch: ${branchId} by user: ${user._id} (${user.role})`);

        // Validate branchId
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            console.log(`Invalid branch ID format: ${branchId}`);
            return res.status(400).json({ message: 'Invalid branch ID format' });
        }

        // Verify user has access to this branch
        if (user.role !== 'Super_Admin' && user.branchId && user.branchId.toString() !== branchId) {
            console.log(`Permission denied: User ${user._id} attempted to access branch ${branchId} but is assigned to ${user.branchId}`);
            return res.status(403).json({ message: 'You do not have permission to access customers from this branch' });
        }

        // Get customers for the specific branch
        const customers = await Customer.find({ branchId }).sort({ createdAt: -1 });
        
        console.log(`Found ${customers.length} customers for branch ${branchId}`);
        res.status(200).json(customers);
    } catch (error) {
        console.error('Error fetching branch customers:', error);
        res.status(500).json({ message: 'Server error while fetching branch customers', error: error.message });
    }
};

// @desc    Get a customer by ID
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid customer ID format' });
        }

        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Access control: Only allow access if user has permission for this restaurant/branch
        if (user.role !== 'Super_Admin') {
            if (user.restaurantId.toString() !== customer.restaurantId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to access this customer' });
            }
            
            if (user.branchId && user.branchId.toString() !== customer.branchId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to access this customer from a different branch' });
            }
        }
        
        res.status(200).json(customer);
    } catch (error) {
        console.error(`Error fetching customer with ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error while fetching customer details', error: error.message });
    }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const { user } = req;
        
        // Use the authenticated user's restaurant and branch instead of from request body
        // for security reasons
        const restaurantId = user.restaurantId;
        const branchId = user.branchId;

        // Validate required fields (only name and phone are required now)
        if (!restaurantId || !branchId || !name || !phone) {
            return res.status(400).json({ 
                message: 'Please provide name and phone. Restaurant and branch IDs are derived from your account.' 
            });
        }

        // Check if email exists and is not empty before validating uniqueness
        if (email && email.trim() !== '') {
            const existingCustomer = await Customer.findOne({ 
                email: email.toLowerCase(),
                restaurantId 
            });

            if (existingCustomer) {
                return res.status(400).json({ message: 'A customer with this email already exists for this restaurant' });
            }
        }

        // Create a unique customer ID
        const customerId = `CUST-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Create the customer with the branch ID
        const customer = await Customer.create({
            restaurantId,
            branchId,
            customerId,
            name,
            email: email ? email.toLowerCase() : undefined, // Only set if provided
            phone,
            address: address || undefined // Only set if provided
        });

        res.status(201).json(customer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ 
            message: 'Server error while creating customer', 
            error: error.message 
        });
    }
};

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address } = req.body;
        const { user } = req;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid customer ID format' });
        }

        // Find the customer
        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Access control: Only allow updates if user has permission for this restaurant/branch
        if (user.role !== 'Super_Admin') {
            if (user.restaurantId.toString() !== customer.restaurantId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to update this customer' });
            }
            
            if (user.branchId && user.branchId.toString() !== customer.branchId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to update a customer from a different branch' });
            }
        }

        // Check if email is being changed and if it already exists
        if (email && email.trim() !== '' && email.toLowerCase() !== (customer.email || '').toLowerCase()) {
            const existingCustomer = await Customer.findOne({ 
                email: email.toLowerCase(),
                restaurantId: customer.restaurantId,
                _id: { $ne: id } // Exclude current customer
            });

            if (existingCustomer) {
                return res.status(400).json({ message: 'This email is already used by another customer' });
            }
        }

        // Update the customer (but don't allow changing restaurantId or branchId)
        const updatedCustomer = await Customer.findByIdAndUpdate(
            id, 
            {
                name: name || customer.name,
                email: email ? email.toLowerCase() : customer.email,
                phone: phone || customer.phone,
                address: address !== undefined ? address : customer.address // Allow explicitly setting to empty string
            },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedCustomer);
    } catch (error) {
        console.error(`Error updating customer with ID ${req.params.id}:`, error);
        res.status(500).json({ 
            message: 'Server error while updating customer', 
            error: error.message 
        });
    }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid customer ID format' });
        }

        // Find the customer first to check permissions
        const customer = await Customer.findById(id);

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Access control: Only allow deletion if user has permission for this restaurant/branch
        if (user.role !== 'Super_Admin') {
            if (user.restaurantId.toString() !== customer.restaurantId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to delete this customer' });
            }
            
            if (user.branchId && user.branchId.toString() !== customer.branchId.toString()) {
                return res.status(403).json({ message: 'You do not have permission to delete a customer from a different branch' });
            }
        }

        // Delete the customer
        await Customer.findByIdAndDelete(id);

        res.status(200).json({ message: 'Customer deleted successfully' });
    } catch (error) {
        console.error(`Error deleting customer with ID ${req.params.id}:`, error);
        res.status(500).json({ 
            message: 'Server error while deleting customer', 
            error: error.message 
        });
    }
};

module.exports = {
    getRestaurantCustomers,
    getBranchCustomers,
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};