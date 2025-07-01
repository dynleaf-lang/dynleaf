/**
 * Add GB Tax Entry
 * 
 * This script ensures that a GB (United Kingdom) tax record exists in the database.
 * It should be run once manually to fix the issue with the GB tax code.
 */

const mongoose = require('mongoose');
const { Tax } = require('../models/Tax');

// Connect to MongoDB
const connectToDatabase = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-menu';
  console.log('Connecting to database with URI:', MONGODB_URI);
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000 // Close sockets after 45s of inactivity
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Check and add the GB tax entry
const addGBTaxEntry = async () => {
  try {
    console.log('Checking for GB tax entry...');
    
    // Check if GB tax exists
    const gbTax = await Tax.findOne({ country: 'GB' });
    
    if (gbTax) {
      console.log('GB tax entry already exists:', gbTax);
      return gbTax;
    }
    
    // Check if UK tax exists (as a reference)
    const ukTax = await Tax.findOne({ country: 'UK' });
    
    // Create GB tax entry based on UK if it exists, or with standard values
    const taxData = ukTax ? {
      ...ukTax.toObject(),
      _id: undefined,
      country: 'GB',
      description: `UK Value Added Tax (ISO code - GB)`,
    } : {
      country: 'GB',
      name: 'VAT',
      percentage: 20,
      isCompound: false,
      description: 'UK Value Added Tax (ISO code)',
      active: true
    };
    
    // Create new GB tax entry
    console.log('Creating GB tax entry with data:', taxData);
    const newGBTax = await Tax.create(taxData);
    
    console.log('GB tax created successfully:', newGBTax);
    return newGBTax;
  } catch (error) {
    console.error('Error ensuring GB tax exists:', error);
    throw error;
  }
};

// Display all tax entries (useful for debugging)
const listAllTaxes = async () => {
  try {
    console.log('\nListing all tax entries:');
    const taxes = await Tax.find().sort({ country: 1 });
    
    if (taxes.length === 0) {
      console.log('No tax entries found in database');
    } else {
      taxes.forEach(tax => {
        console.log(`${tax.country}: ${tax.name} (${tax.percentage}%)`);
      });
    }
  } catch (error) {
    console.error('Error listing taxes:', error);
  }
};

// Run the utility
const run = async () => {
  try {
    console.log('Starting GB tax utility...');
    await connectToDatabase();
    console.log('Database connected, adding GB tax entry...');
    await addGBTaxEntry();
    console.log('GB tax entry process completed, listing all taxes...');
    await listAllTaxes();
    
    // Disconnect
    console.log('\nDisconnecting from database...');
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error.stack || error);
  }
};

// Run if executed directly
console.log('Starting addGBTax.js script...');
run();
