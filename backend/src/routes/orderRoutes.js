const express = require('express');
const router = express.Router();
const { 
  getAllOrders, 
  getAllOrdersWithFilters,
  getOrder, 
  createOrder, 
  updateOrder, 
  updateOrderStatus,
  deleteOrder,
  getOrdersByRestaurant,
  getOrdersByBranch,
  getOrdersByCustomer,
  getOrderStatistics,
  generateInvoice
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Routes for Super_Admin to get all orders with filtering
router
  .route('/all')
  .get(protect, authorize('Super_Admin'), getAllOrdersWithFilters);

// Routes for order statistics
router
  .route('/statistics')
  .get(protect, getOrderStatistics);

// Base routes
router
  .route('/')
  .get(protect, getAllOrders)
  .post(protect, createOrder);

router
  .route('/:id')
  .get(protect, getOrder)
  .put(protect, updateOrder)
  .delete(protect, authorize('admin', 'Super_Admin'), deleteOrder);

// Order status update route
router
  .route('/:id/status')
  .patch(protect, updateOrderStatus);

// Invoice generation route
router
  .route('/:id/invoice')
  .get(protect, generateInvoice);

// Additional routes
router
  .route('/restaurant/:restaurantId')
  .get(protect, getOrdersByRestaurant);

router
  .route('/branch/:branchId')
  .get(protect, getOrdersByBranch);

router
  .route('/customer/:customerId')
  .get(protect, getOrdersByCustomer);

module.exports = router;