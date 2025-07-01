/**
 * Ensure Default Tax Script
 * 
 * This script ensures that a DEFAULT tax record exists in the database.
 * It can be run manually or as part of the application startup.
 */

const mongoose = require('mongoose');
const { Tax } = require('../models/Tax');

const ensureDefaultTax = async () => {
  try {
    console.log('Checking for DEFAULT tax entry...');
    
    // Check if DEFAULT tax exists
    const defaultTax = await Tax.findOne({ country: 'DEFAULT' });
    
    if (defaultTax) {
      console.log('DEFAULT tax entry already exists:', defaultTax);
      return defaultTax;
    }
    
    // Create DEFAULT tax if it doesn't exist
    console.log('Creating DEFAULT tax entry...');
    const newDefaultTax = await Tax.create({
      country: 'DEFAULT',
      name: 'Standard Tax',
      percentage: 10,
      isCompound: false,
      description: 'Default tax rate used when country-specific rates are not available',
      active: true
    });
    
    console.log('DEFAULT tax created successfully:', newDefaultTax);
    return newDefaultTax;
  } catch (error) {
    console.error('Error ensuring DEFAULT tax exists:', error);
    throw error;
  }
};

// If this script is run directly
if (require.main === module) {
  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-menu';
  
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Run the function
    await ensureDefaultTax();
    
    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
} else {
  // Export for use in other files
  module.exports = ensureDefaultTax;
}
