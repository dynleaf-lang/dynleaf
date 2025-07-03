const express = require('express');
const mongoose = require('mongoose');
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
  generateInvoice,
  getDailyReports,
  getWeeklyReports,
  getMonthlyReports,
  getTopSellingItems,
  getRevenueByCategory,
  getRevenueTrends
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

// Routes for order reports
// These routes now have test data available and should return proper results
router
  .route('/reports/daily')
  .get(protect, getDailyReports);

// Helper endpoint to check if report data is available
router
  .route('/reports/check')
  .get(protect, async (req, res) => {
    try {
      const Order = mongoose.model('Order');
      const count = await Order.countDocuments();
      
      // Check if we have order data for reports
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const dailyData = await Order.aggregate([
        {
          $match: {
            orderDate: {
              $gte: thirtyDaysAgo,
              $lte: today
            }
          }
        },
        { 
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      const hasReportData = count > 0 && dailyData.length > 0;
      
      res.status(200).json({
        success: true,
        hasData: hasReportData,
        totalOrders: count,
        ordersInReportRange: dailyData.length > 0 ? dailyData[0].orderCount : 0,
        message: hasReportData 
          ? 'Order data is available for reports' 
          : 'No order data available for reports'
      });
    } catch (error) {
      console.error('Error checking report data:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking report data',
        error: error.message
      });
    }
  });

router
  .route('/reports/weekly')
  .get(protect, getWeeklyReports);

router
  .route('/reports/monthly')
  .get(protect, getMonthlyReports);

router
  .route('/reports/items/top')
  .get(protect, getTopSellingItems);

router
  .route('/reports/revenue/category')
  .get(protect, getRevenueByCategory);

router
  .route('/reports/trends')
  .get(protect, getRevenueTrends);

module.exports = router;