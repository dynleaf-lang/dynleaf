/**
 * Tax Controller
 * Handles CRUD operations for tax management
 */

const { Tax } = require('../models/Tax');

// Get all tax entries
exports.getAllTaxes = async (req, res) => {
  console.log('GET /taxes request received');
  try {
    const taxes = await Tax.find().sort({ country: 1 });
    console.log(`Successfully retrieved ${taxes.length} tax entries`);
    res.status(200).json({
      success: true,
      count: taxes.length,
      data: taxes
    });
  } catch (error) {
    console.error('Error fetching taxes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching taxes',
      error: error.message
    });
  }
};

// Country name to ISO code mapping
const countryNameToCode = {
  'UNITED KINGDOM': 'GB',
  'UK': 'GB',
  'GREAT BRITAIN': 'GB',
  'ENGLAND': 'GB',
  'UNITED STATES': 'US',
  'USA': 'US',
  'AMERICA': 'US',
  'CANADA': 'CA',
  'AUSTRALIA': 'AU',
  'INDIA': 'IN',
  'GERMANY': 'DE',
  'FRANCE': 'FR',
  'ITALY': 'IT',
  'JAPAN': 'JP',
  'CHINA': 'CN',
  'BRAZIL': 'BR',
  'MEXICO': 'MX',
  'SPAIN': 'ES'
};

// Get tax by country code
exports.getTaxByCountry = async (req, res) => {
  let country = req.params.country.toUpperCase();
  console.log(`GET /taxes/${country} request received`);
  
  // Check if the country is a full name that needs to be converted to a code
  if (countryNameToCode[country]) {
    const originalCountry = country;
    country = countryNameToCode[country];
    console.log(`Converted country name "${originalCountry}" to code "${country}"`);
  }
  
  try {
    // First try with provided country code
    let tax = await Tax.findOne({ country });
      // Special case for GB/UK - try both codes if one fails
    if (!tax && (country === 'GB' || country === 'UK')) {
      const alternativeCode = country === 'GB' ? 'UK' : 'GB';
      console.log(`No tax found for ${country}, trying alternative code ${alternativeCode}`);
      tax = await Tax.findOne({ country: alternativeCode });
      if (tax) {
        console.log(`Found tax entry using alternative code ${alternativeCode}`);
        // Create a copy of the tax with the requested country code for future use
        try {
          const newTaxData = { 
            ...tax.toObject(), 
            _id: undefined, 
            country: country,
            description: `${tax.description} (copied from ${alternativeCode})`
          };
          console.log(`Creating a new tax entry for ${country} based on ${alternativeCode} data`);
          await Tax.create(newTaxData);
        } catch (err) {
          console.error(`Error creating ${country} tax from ${alternativeCode} data:`, err);
        }
      }
    }
    
    if (!tax) {
      console.log(`No tax found for country: ${country}, checking for fallback tax`);
      
      // Try to find a default tax entry
      const defaultTax = await Tax.findOne({ country: 'DEFAULT' });
      
      if (defaultTax) {
        console.log(`Found fallback DEFAULT tax, using that instead`);
        return res.status(200).json({
          success: true,
          data: defaultTax,
          isDefault: true
        });
      }
      
      // If no default tax, create one on the fly
      console.log(`No DEFAULT tax found either, returning standard 10% tax`);
      return res.status(200).json({
        success: true,
        data: {
          country: country,
          name: 'Tax',
          percentage: 10,
          isCompound: false,
          active: true,
          description: 'Default tax rate'
        },
        isGenerated: true
      });
    }
    
    console.log(`Successfully retrieved tax for ${country}`);
    res.status(200).json({
      success: true,
      data: tax
    });
  } catch (error) {
    console.error(`Error fetching tax for country ${req.params.country}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tax',
      error: error.message
    });
  }
};

// Create new tax entry
exports.createTax = async (req, res) => {
  try {
    // Convert country code to uppercase
    if (req.body.country) {
      req.body.country = req.body.country.toUpperCase();
    }
    
    // Check if country already exists
    const existingTax = await Tax.findOne({ country: req.body.country });
    if (existingTax) {
      return res.status(400).json({
        success: false,
        message: `Tax already exists for country: ${req.body.country}`
      });
    }
    
    const tax = await Tax.create(req.body);
    
    res.status(201).json({
      success: true,
      data: tax
    });
  } catch (error) {
    console.error('Error creating tax:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating tax',
      error: error.message
    });
  }
};

// Update tax entry
exports.updateTax = async (req, res) => {
  try {
    const country = req.params.country.toUpperCase();
    
    // Convert country code in body to uppercase if provided
    if (req.body.country) {
      req.body.country = req.body.country.toUpperCase();
    }
    
    const tax = await Tax.findOneAndUpdate(
      { country },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!tax) {
      return res.status(404).json({
        success: false,
        message: `No tax found for country: ${country}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: tax
    });
  } catch (error) {
    console.error(`Error updating tax for country ${req.params.country}:`, error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating tax',
      error: error.message
    });
  }
};

// Delete tax entry
exports.deleteTax = async (req, res) => {
  try {
    const country = req.params.country.toUpperCase();
    const tax = await Tax.findOneAndDelete({ country });
    
    if (!tax) {
      return res.status(404).json({
        success: false,
        message: `No tax found for country: ${country}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Tax for country ${country} has been deleted`,
      data: {}
    });
  } catch (error) {
    console.error(`Error deleting tax for country ${req.params.country}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting tax',
      error: error.message
    });
  }
};