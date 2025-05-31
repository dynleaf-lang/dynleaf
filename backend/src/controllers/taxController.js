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

// Get tax by country code
exports.getTaxByCountry = async (req, res) => {
  const country = req.params.country.toUpperCase();
  console.log(`GET /taxes/${country} request received`);
  try {
    const tax = await Tax.findOne({ country });
    
    if (!tax) {
      console.log(`No tax found for country: ${country}`);
      return res.status(404).json({
        success: false,
        message: `No tax found for country: ${country}`
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