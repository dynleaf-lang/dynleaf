/**
 * Update Default Taxes Utility
 * 
 * This utility ensures all the standard tax entries are created or updated
 * in the database, including the new GB entry.
 */

const mongoose = require('mongoose');
const { Tax } = require('../models/Tax');

// Connect to MongoDB
const connectToDatabase = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/food-menu';
  console.log('Connecting to database...');
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Update the standard tax entries
const updateStandardTaxes = async () => {
  try {
    console.log('Updating standard tax entries...');
    
    // Standard tax entries that should exist
    const standardTaxes = [
      { country: 'US', name: 'Sales Tax', percentage: 7.25, isCompound: false, description: 'Standard US sales tax rate (varies by state)' },
      { country: 'CA', name: 'GST/HST', percentage: 13, isCompound: false, description: 'Canadian Goods and Services Tax / Harmonized Sales Tax' },
      { country: 'UK', name: 'VAT', percentage: 20, isCompound: false, description: 'UK Value Added Tax' },
      { country: 'GB', name: 'VAT', percentage: 20, isCompound: false, description: 'UK Value Added Tax (ISO code)' },
      { country: 'IN', name: 'GST', percentage: 18, isCompound: false, description: 'Indian Goods and Services Tax' },
      { country: 'AU', name: 'GST', percentage: 10, isCompound: false, description: 'Australian Goods and Services Tax' },
      { country: 'DEFAULT', name: 'Standard Tax', percentage: 10, isCompound: false, description: 'Default tax rate used when country-specific rates are not available', active: true }
    ];
    
    // Update each standard tax entry
    for (const taxData of standardTaxes) {
      const result = await Tax.findOneAndUpdate(
        { country: taxData.country },
        taxData,
        { upsert: true, new: true }
      );
      
      console.log(`Tax for ${taxData.country} ${result.isNew ? 'created' : 'updated'}`);
    }
    
    console.log('Standard tax entries updated successfully');
  } catch (error) {
    console.error('Error updating standard tax entries:', error);
  }
};

// Run the utility
const run = async () => {
  try {
    await connectToDatabase();
    await updateStandardTaxes();
    
    // Disconnect
    console.log('Disconnecting from database...');
    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run if executed directly
if (require.main === module) {
  run();
}

module.exports = { updateStandardTaxes };
