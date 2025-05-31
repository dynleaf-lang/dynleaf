const express = require('express');
const router = express.Router();
const { 
    getRestaurantCustomers, 
    getBranchCustomers,
    getAllCustomers,
    getCustomerById, 
    createCustomer, 
    updateCustomer, 
    deleteCustomer 
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes are protected, requiring authentication
router.use(protect);

// Get all customers with filter options (Super_Admin only)
router.get('/all', authorize('Super_Admin'), getAllCustomers);

// Get all customers for a restaurant
router.get('/restaurant/:restaurantId', authorize('Super_Admin', 'Branch_Manager', 'POS_Operator'), getRestaurantCustomers);

// Get all customers for a specific branch
router.get('/branch/:branchId', authorize('Super_Admin', 'Branch_Manager', 'POS_Operator'), getBranchCustomers);

// Get customer by ID
router.get('/:id', authorize('Super_Admin', 'Branch_Manager', 'POS_Operator'), getCustomerById);

// Create a new customer
router.post('/', authorize('Super_Admin', 'Branch_Manager', 'POS_Operator'), createCustomer);

// Update a customer
router.put('/:id', authorize('Super_Admin', 'Branch_Manager', 'POS_Operator'), updateCustomer);

// Delete a customer
router.delete('/:id', authorize('Super_Admin', 'Branch_Manager'), deleteCustomer);

module.exports = router;