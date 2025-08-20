/**
 * Centralized Model Registration
 * This file ensures that all models are registered in the correct order
 * to prevent reference errors like "Schema hasn't been registered for model"
 */

const mongoose = require('mongoose');

// First, clear any potentially problematic model registrations
const modelsToClear = [
  'Restaurant',
  'Branch',
  'Category',
  'MenuItem',
  'Customer',
  'User',
  'Order',
  'DiningTable',
  'InventoryItem',
  'InventoryAdjustment'
];

// Clean up any existing models to prevent registration conflicts
modelsToClear.forEach(modelName => {
  if (mongoose.models[modelName]) {
    delete mongoose.models[modelName];
  }
});

// Import all models in the correct order (dependencies first)
// Basic models with no dependencies
const Restaurant = require('./Restaurant');
const Branch = require('./Branches');
const Category = require('./Category');
const Customer = require('./Customer');
const User = require('./User');

// Models with dependencies
const MenuItem = require('./MenuItem');
const Order = require('./Order');
const DiningTable = require('./DiningTables');
const InventoryItem = require('./InventoryItem');
const InventoryAdjustment = require('./InventoryAdjustment');

// Export all models
module.exports = {
  Restaurant,
  Branch,
  Category,
  Customer,
  User,
  MenuItem,
  Order,
  DiningTable,
  InventoryItem,
  InventoryAdjustment
};