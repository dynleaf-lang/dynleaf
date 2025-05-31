/**
 * Order Controller
 * Handles order creation, retrieval, updating, and deletion with tax management integration
 */

const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { calculateTax } = require('../utils/taxUtils');
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
      totalAmount
    });
    
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
    
    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order status is required'
      });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true, runValidators: true }
    ).populate('restaurantId', 'name address country')
     .populate('customerId', 'name email phone');
    
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
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name address country phone email')
      .populate('branchId', 'name address phone')
      .populate('customerId', 'name email phone address')
      .populate('items.itemId', 'name description')
      .populate('items.categoryId', 'name');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
    
    // Pipe the PDF directly to the response
    doc.pipe(res);
    
    // Add content to the PDF document
    // Header with logo and title
    doc.fontSize(20).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Restaurant and Order Information
    doc.fontSize(14).text('Restaurant Information:');
    doc.fontSize(10).text(`Name: ${order.restaurantId.name}`);
    doc.text(`Address: ${order.restaurantId.address}`);
    doc.text(`Phone: ${order.restaurantId.phone || 'N/A'}`);
    doc.text(`Email: ${order.restaurantId.email || 'N/A'}`);
    doc.moveDown();
    
    // Customer Information
    doc.fontSize(14).text('Customer Information:');
    doc.fontSize(10).text(`Name: ${order.customerId.name}`);
    doc.text(`Phone: ${order.customerId.phone || 'N/A'}`);
    if (order.customerId.email) doc.text(`Email: ${order.customerId.email}`);
    if (order.customerId.address) doc.text(`Address: ${order.customerId.address}`);
    doc.moveDown();
    
    // Order Details
    doc.fontSize(14).text('Order Details:');
    doc.fontSize(10).text(`Order ID: ${order.orderId}`);
    doc.text(`Date: ${new Date(order.orderDate).toLocaleString()}`);
    doc.text(`Status: ${order.orderStatus}`);
    doc.text(`Type: ${order.OrderType}`);
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
    order.items.forEach(item => {
      const itemName = item.itemId.name || `Item ID: ${item.itemId}`;
      const qty = item.quantity;
      const price = `$${item.price.toFixed(2)}`;
      const total = `$${(item.price * qty).toFixed(2)}`;
      
      yPos = doc.y;
      doc.text(itemName, itemCol, yPos)
         .text(qty.toString(), qtyCol, yPos)
         .text(price, priceCol, yPos)
         .text(total, totalCol, yPos);
      
      doc.moveDown();
    });
    
    // Draw divider line
    yPos = doc.y;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    doc.moveDown();
    
    // Totals section
    const subtotalText = `Subtotal: $${order.subtotal.toFixed(2)}`;
    const taxText = `Tax (${order.taxDetails.percentage}%): $${order.tax.toFixed(2)}`;
    const totalText = `Total: $${order.totalAmount.toFixed(2)}`;
    
    doc.text(subtotalText, 400, doc.y);
    doc.text(taxText, 400, doc.y + 15);
    doc.font('Helvetica-Bold').text(totalText, 400, doc.y + 15);
    
    // Footer
    doc.moveDown(4);
    doc.font('Helvetica').fontSize(10).text('Thank you for your business!', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error(`Error generating invoice for order ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating invoice',
      error: error.message
    });
  }
};