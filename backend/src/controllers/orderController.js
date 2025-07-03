/**
 * Order Controller
 * Handles order creation, retrieval, updating, and deletion with tax management integration
 */

const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { calculateTax } = require('../utils/taxUtils');
const { emitOrderUpdate, emitStatusUpdate, emitNewOrder } = require('../utils/socketUtils');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('restaurantId', 'name address country')
      .populate('customerId', 'name email')
      .sort({ orderDate: -1 });
      
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get all orders with filtering (for Super_Admin)
exports.getAllOrdersWithFilters = async (req, res) => {
  try {
    const { 
      restaurantId, 
      branchId, 
      orderStatus, 
      OrderType, 
      startDate, 
      endDate 
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    if (orderStatus) filter.orderStatus = orderStatus;
    if (OrderType) filter.OrderType = OrderType;
    
    // Add date range filters if provided
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
    }
    
    const orders = await Order.find(filter)
      .populate('restaurantId', 'name address country')
      .populate('branchId', 'name')
      .populate('customerId', 'name email phone')
      .populate('items.itemId', 'name')
      .populate('items.categoryId', 'name')
      .sort({ orderDate: -1 });
      
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching filtered orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching filtered orders',
      error: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name address country')
      .populate('customerId', 'name email')
      .populate('items.itemId', 'name description')
      .populate('items.categoryId', 'name');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error(`Error fetching order ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};

// Create order with tax calculation
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Calculate subtotal from items
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    
    // Calculate tax based on restaurant's country
    const { tax, taxDetails } = await calculateTax(orderData.restaurantId, subtotal);
    
    // Calculate total amount including tax
    const totalAmount = subtotal + tax;
    
    // Create the complete order with tax information
    const order = await Order.create({
      ...orderData,
      subtotal,
      tax,
      taxDetails,
      totalAmount,
      status: orderData.status || 'pending',  // Ensure new status field is set
      orderStatus: orderData.orderStatus || 'Pending'  // Ensure legacy status field is set
    });

    // Emit real-time notification for new order
    try {
      emitNewOrder(order);
    } catch (socketError) {
      console.error('Error emitting new order notification:', socketError);
      // Don't fail the order creation if socket emission fails
    }
    
    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    // If items are being updated, recalculate subtotal, tax and total
    if (req.body.items) {
      const subtotal = req.body.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );
      
      // If restaurantId is changed or not provided in the update, get it from the existing order
      let restaurantId = req.body.restaurantId;
      if (!restaurantId) {
        const existingOrder = await Order.findById(req.params.id);
        restaurantId = existingOrder.restaurantId;
      }
      
      // Calculate tax based on restaurant's country
      const { tax, taxDetails } = await calculateTax(restaurantId, subtotal);
      
      // Calculate total amount including tax
      const totalAmount = subtotal + tax;
      
      // Add calculated values to the update object
      req.body.subtotal = subtotal;
      req.body.tax = tax;
      req.body.taxDetails = taxDetails;
      req.body.totalAmount = totalAmount;
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address country')
     .populate('customerId', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error(`Error updating order ${req.params.id}:`, error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating order',
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;
    
    console.log(`Updating order ${req.params.id} status to: ${orderStatus}`);
    
    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order status is required'
      });
    }
      // Validate status values
    const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Map legacy status to new status format
    const statusMapping = {
      'Pending': 'pending',
      'Processing': 'preparing',
      'Completed': 'ready',
      'Cancelled': 'cancelled'
    };

    const newStatus = statusMapping[orderStatus];

    // Get the current order to track old status
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      console.log(`Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const oldStatus = currentOrder.orderStatus;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        orderStatus,  // Update legacy field
        status: newStatus  // Update new field
      },
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address country')
     .populate('branchId', 'name address phone')
     .populate('customerId', 'name email phone')
     .populate('items.itemId', 'name description')
     .populate('items.menuItemId', 'name description')
     .populate('items.categoryId', 'name');
    
    if (!order) {
      console.log(`Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log(`Order status updated successfully: ${order.orderId} -> ${orderStatus}`);
    
    // Emit real-time status update notification
    try {
      emitStatusUpdate(order, oldStatus, orderStatus);
    } catch (socketError) {
      console.error('Error emitting status update notification:', socketError);
      // Don't fail the status update if socket emission fails
    }
    
    res.status(200).json({
      success: true,
      data: order,
      message: `Order status updated to ${orderStatus}`
    });
  } catch (error) {
    console.error(`Error updating order status for ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
      error: error.message
    });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error(`Error deleting order ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting order',
      error: error.message
    });
  }
};

// Get orders by restaurant
exports.getOrdersByRestaurant = async (req, res) => {
  try {
    const { 
      orderStatus, 
      OrderType, 
      startDate, 
      endDate 
    } = req.query;
    
    // Build filter object
    let filter = { restaurantId: req.params.restaurantId };
    
    if (orderStatus) filter.orderStatus = orderStatus;
    if (OrderType) filter.OrderType = OrderType;
    
    // Add date range filters if provided
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
    }
    
    const orders = await Order.find(filter)
      .populate('restaurantId', 'name address country')
      .populate('branchId', 'name')
      .populate('customerId', 'name email phone')
      .populate('items.itemId', 'name')
      .populate('items.categoryId', 'name')
      .sort({ orderDate: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching orders for restaurant ${req.params.restaurantId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get orders by branch
exports.getOrdersByBranch = async (req, res) => {
  try {
    const { 
      orderStatus, 
      OrderType, 
      startDate, 
      endDate 
    } = req.query;
    
    // Build filter object
    let filter = { branchId: req.params.branchId };
    
    if (orderStatus) filter.orderStatus = orderStatus;
    if (OrderType) filter.OrderType = OrderType;
    
    // Add date range filters if provided
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
    }
    
    const orders = await Order.find(filter)
      .populate('restaurantId', 'name address country')
      .populate('branchId', 'name')
      .populate('customerId', 'name email phone')
      .populate('items.itemId', 'name')
      .populate('items.categoryId', 'name')
      .sort({ orderDate: -1 });
    
    res.status(200).json(orders);
  } catch (error) {
    console.error(`Error fetching orders for branch ${req.params.branchId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get orders by customer
exports.getOrdersByCustomer = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.customerId })
      .populate('restaurantId', 'name address country')
      .populate('customerId', 'name email')
      .sort({ orderDate: -1 });
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error(`Error fetching orders for customer ${req.params.customerId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// Get order statistics
exports.getOrderStatistics = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Add date range filters if provided
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate + 'T23:59:59');
    }
    
    // Get total orders and total revenue
    const totalOrders = await Order.countDocuments(filter);
    
    // Group by status and get count
    const ordersByStatus = await Order.aggregate([
      { $match: filter },
      { $group: {
        _id: '$orderStatus',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Group by type and get count
    const ordersByType = await Order.aggregate([
      { $match: filter },
      { $group: {
        _id: '$OrderType',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Get total revenue
    const revenueData = await Order.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        taxCollected: { $sum: '$tax' }
      }}
    ]);
    
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;
    const averageOrderValue = revenueData.length > 0 ? revenueData[0].averageOrderValue : 0;
    const taxCollected = revenueData.length > 0 ? revenueData[0].taxCollected : 0;
    
    const statistics = {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      taxCollected,
      ordersByStatus,
      ordersByType
    };
    
    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order statistics',
      error: error.message
    });
  }
};

// Generate invoice PDF
exports.generateInvoice = async (req, res) => {
  try {
    console.log(`Generating invoice for order: ${req.params.id}`);
    
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name address country phone email')
      .populate('branchId', 'name address phone')
      .populate('customerId', 'name email phone address')
      .populate('items.itemId', 'name description')
      .populate('items.menuItemId', 'name description')
      .populate('items.categoryId', 'name');
    
    if (!order) {
      console.log(`Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`Order found: ${order.orderId || order._id}`);
    console.log(`Restaurant: ${order.restaurantId?.name || 'N/A'}`);
    console.log(`Items count: ${order.items?.length || 0}`);

    // Validate minimum required data
    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order has no items'
      });
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId || order._id}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add content to the PDF document
    // Header with logo and title
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Restaurant and Order Information
    doc.fontSize(14).text('Restaurant Information:');
    doc.fontSize(10).text(`Name: ${order.restaurantId?.name || 'N/A'}`);
    doc.text(`Address: ${order.restaurantId?.address || 'N/A'}`);
    doc.text(`Phone: ${order.restaurantId?.phone || 'N/A'}`);
    doc.text(`Email: ${order.restaurantId?.email || 'N/A'}`);
    doc.moveDown();
    
    // Customer Information
    const customerName = order.customerId?.name || order.customerName || 'Walk-in Customer';
    const customerPhone = order.customerId?.phone || order.customerPhone || 'N/A';
    const customerEmail = order.customerId?.email || order.customerEmail || 'N/A';
    
    doc.fontSize(14).text('Customer Information:');
    doc.fontSize(10).text(`Name: ${customerName}`);
    doc.text(`Phone: ${customerPhone}`);
    if (customerEmail !== 'N/A') doc.text(`Email: ${customerEmail}`);
    if (order.customerId?.address) doc.text(`Address: ${order.customerId.address}`);
    doc.moveDown();
    
    // Order Details
    doc.fontSize(14).text('Order Details:');
    doc.fontSize(10).text(`Order ID: ${order.orderId || order._id}`);
    doc.text(`Date: ${new Date(order.orderDate || order.createdAt).toLocaleString()}`);
    doc.text(`Status: ${order.orderStatus || 'N/A'}`);
    doc.text(`Type: ${order.OrderType || order.orderType || 'N/A'}`);
    if (order.tableId) doc.text(`Table: ${order.tableId}`);
    doc.moveDown();
    
    // Items Table
    doc.fontSize(14).text('Order Items:');
    doc.moveDown(0.5);
    
    // Table header
    let yPos = doc.y;
    const itemTableTop = yPos;
    doc.fontSize(10);
    
    // Define column positions
    const itemCol = 50;
    const qtyCol = 350;
    const priceCol = 400;
    const totalCol = 500;
    
    // Draw header
    doc.font('Helvetica-Bold')
       .text('Item', itemCol, yPos)
       .text('Qty', qtyCol, yPos)
       .text('Price', priceCol, yPos)
       .text('Total', totalCol, yPos);
    
    // Draw divider line
    doc.moveDown(0.5);
    yPos = doc.y;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    doc.moveDown(0.5);
    
    // Draw items
    doc.font('Helvetica');
    let calculatedSubtotal = 0;
    
    order.items.forEach((item, index) => {
      try {
        // Handle both old and new item field structures
        const menuItem = item.itemId || item.menuItemId;
        const itemName = item.name || menuItem?.name || `Item ${index + 1}`;
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const total = price * qty;
        
        calculatedSubtotal += total;
        
        yPos = doc.y;
        doc.text(itemName, itemCol, yPos)
           .text(qty.toString(), qtyCol, yPos)
           .text(`$${price.toFixed(2)}`, priceCol, yPos)
           .text(`$${total.toFixed(2)}`, totalCol, yPos);
        
        doc.moveDown();
      } catch (itemError) {
        console.error('Error processing item:', itemError);
        // Still render a line for this item even if there's an error
        yPos = doc.y;
        doc.text(`Item ${index + 1} (Error processing)`, itemCol, yPos)
           .text('1', qtyCol, yPos)
           .text('$0.00', priceCol, yPos)
           .text('$0.00', totalCol, yPos);
        doc.moveDown();
      }
    });
    
    // Draw divider line
    yPos = doc.y;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    doc.moveDown();
    
    // Totals section
    const subtotal = order.subtotal || calculatedSubtotal || 0;
    const tax = order.tax || 0;
    const taxPercentage = order.taxDetails?.percentage || 0;
    const totalAmount = order.totalAmount || subtotal + tax;
    
    console.log(`Invoice totals - Subtotal: ${subtotal}, Tax: ${tax}, Total: ${totalAmount}`);
    
    const subtotalText = `Subtotal: $${subtotal.toFixed(2)}`;
    const taxText = `Tax (${taxPercentage}%): $${tax.toFixed(2)}`;
    const totalText = `Total: $${totalAmount.toFixed(2)}`;
    
    doc.text(subtotalText, 400, doc.y);
    doc.text(taxText, 400, doc.y + 15);
    doc.font('Helvetica-Bold').text(totalText, 400, doc.y + 15);
    
    // Footer
    doc.moveDown(4);
    doc.font('Helvetica').fontSize(10).text('Thank you for your business!', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    
    // Finalize the PDF
    console.log('Finalizing PDF document');
    doc.end();
    
  } catch (error) {
    console.error(`Error generating invoice for order ${req.params.id}:`, error);
    
    // If response headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error while generating invoice',
        error: error.message
      });
    }
  }
};

// Get daily order reports
exports.getDailyReports = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Ensure we have proper date filtering
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required for daily reports'
      });
    }
    
    // Add date range filters
    filter.orderDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate + 'T23:59:59')
    };
    
    // Aggregate orders by day
    const dailyReports = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } },
      { 
        $project: {
          _id: 0,
          date: '$_id',
          orderCount: 1,
          revenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: dailyReports
    });
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching daily reports',
      error: error.message
    });
  }
};

// Get weekly order reports
exports.getWeeklyReports = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Ensure we have proper date filtering
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Both startDate and endDate are required for weekly reports'
      });
    }
    
    // Add date range filters
    filter.orderDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate + 'T23:59:59')
    };
    
    // Aggregate orders by week
    const weeklyReports = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: { 
            year: { $year: '$orderDate' },
            week: { $week: '$orderDate' }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      { 
        $project: {
          _id: 0,
          week: { $concat: ['Week ', { $toString: '$_id.week' }] },
          orderCount: 1,
          revenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: weeklyReports
    });
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching weekly reports',
      error: error.message
    });
  }
};

// Get monthly order reports
exports.getMonthlyReports = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Add date range filters if provided
    if (startDate && endDate) {
      filter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    // Aggregate orders by month
    const monthlyReports = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: { 
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { 
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                monthsInString: [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ]
              },
              in: { $arrayElemAt: ['$$monthsInString', { $subtract: ['$_id.month', 1] }] }
            }
          },
          orderCount: 1,
          revenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: monthlyReports
    });
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly reports',
      error: error.message
    });
  }
};

// Get top selling items
exports.getTopSellingItems = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate, limit = 10 } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter['items.restaurantId'] = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Add date range filters if provided
    if (startDate && endDate) {
      filter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    // Aggregate to get top selling items
    const topSellingItems = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { 
        $group: {
          _id: '$items.itemId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: parseInt(limit) },
      { 
        $project: {
          _id: 0,
          name: 1,
          quantity: 1,
          revenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: topSellingItems
    });
  } catch (error) {
    console.error('Error fetching top selling items:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top selling items',
      error: error.message
    });
  }
};

// Get revenue by category
exports.getRevenueByCategory = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter['items.restaurantId'] = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Add date range filters if provided
    if (startDate && endDate) {
      filter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    // Aggregate to get revenue by category
    const revenueByCategory = await Order.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      { 
        $lookup: {
          from: 'menuitems',
          localField: 'items.itemId',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      { $unwind: '$menuItem' },
      { 
        $group: {
          _id: '$menuItem.categoryId',
          name: { $first: '$menuItem.category' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { 
        $project: {
          _id: 0,
          name: 1,
          revenue: 1
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: revenueByCategory
    });
  } catch (error) {
    console.error('Error fetching revenue by category:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue by category',
      error: error.message
    });
  }
};

// Get revenue trends by order type
exports.getRevenueTrends = async (req, res) => {
  try {
    const { restaurantId, branchId, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (restaurantId) filter.restaurantId = restaurantId;
    if (branchId) filter.branchId = branchId;
    
    // Add date range filters if provided
    if (startDate && endDate) {
      filter.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    // Aggregate to get revenue trends by month and order type
    const revenueTrends = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: { 
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            orderType: '$OrderType'
          },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { 
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          types: {
            $push: {
              type: '$_id.orderType',
              revenue: '$revenue'
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { 
        $project: {
          _id: 0,
          month: {
            $let: {
              vars: {
                monthsInString: [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ]
              },
              in: { $arrayElemAt: ['$$monthsInString', { $subtract: ['$_id.month', 1] }] }
            }
          },
          dineIn: {
            $reduce: {
              input: '$types',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'dine-in'] },
                  { $add: ['$$value', '$$this.revenue'] },
                  '$$value'
                ]
              }
            }
          },
          takeout: {
            $reduce: {
              input: '$types',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'takeout'] },
                  { $add: ['$$value', '$$this.revenue'] },
                  '$$value'
                ]
              }
            }
          },
          delivery: {
            $reduce: {
              input: '$types',
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ['$$this.type', 'delivery'] },
                  { $add: ['$$value', '$$this.revenue'] },
                  '$$value'
                ]
              }
            }
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: revenueTrends
    });
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revenue trends',
      error: error.message
    });
  }
};