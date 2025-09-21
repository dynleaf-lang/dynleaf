/**
 * Tax Calculation Utility
 * This module provides functions for calculating taxes based on different countries' tax methods
 */

const { Tax } = require('../models/Tax');
const Restaurant = require('../models/Restaurant');

/**
 * Calculate tax for an order based on restaurant's country
 * @param {string} restaurantId - ID of the restaurant
 * @param {number} subtotal - Order subtotal amount
 * @returns {Promise<{tax: number, taxDetails: Object}>} Tax amount and details
 */
const calculateTax = async (restaurantId, subtotal) => {
  try {
    // Get restaurant details to determine country
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    let country = restaurant.country;
    
    // Normalize country names to match tax table entries
    if (country && country.toLowerCase() === 'india') {
      country = 'IN';
    }
    
    // Get tax information for the country
    const taxInfo = await Tax.findOne({ country, active: true });
    
    if (!taxInfo) {
      console.warn(`No tax information found for country: ${country}, using 0%`);
      return { 
        tax: 0, 
        taxDetails: {
          country,
          taxName: 'No Tax',
          percentage: 0
        }
      };
    }
    
    // Calculate tax based on country-specific rules
    let taxAmount = 0;
    
    if (taxInfo.isCompound) {
      // Compound tax calculation (like in some provinces in Canada)
      taxAmount = calculateCompoundTax(subtotal, taxInfo.percentage);
    } else {
      // Simple percentage tax (most countries)
      taxAmount = calculateSimpleTax(subtotal, taxInfo.percentage);
    }
    
    // Round to 2 decimal places
    taxAmount = parseFloat(taxAmount.toFixed(2));
    
    // For India, provide CGST/SGST breakdown
    let taxBreakdown = {};
    if (country === 'IN' && taxAmount > 0) {
      const halfAmount = +(taxAmount / 2).toFixed(2);
      const halfPercent = +(taxInfo.percentage / 2).toFixed(2);
      taxBreakdown = {
        cgst: { amount: halfAmount, percentage: halfPercent },
        sgst: { amount: halfAmount, percentage: halfPercent }
      };
    }
    
    return {
      tax: taxAmount,
      taxDetails: {
        country,
        taxName: taxInfo.name,
        percentage: taxInfo.percentage,
        breakdown: taxBreakdown
      }
    };
  } catch (error) {
    console.error('Error calculating tax:', error);
    throw error;
  }
};

/**
 * Calculate simple percentage tax
 * @param {number} amount - Base amount
 * @param {number} percentage - Tax percentage
 * @returns {number} Tax amount
 */
const calculateSimpleTax = (amount, percentage) => {
  return amount * (percentage / 100);
};

/**
 * Calculate compound tax (tax on tax)
 * @param {number} amount - Base amount
 * @param {number} percentage - Tax percentage
 * @returns {number} Tax amount
 */
const calculateCompoundTax = (amount, percentage) => {
  // This is a simplified compound tax calculation
  // In real implementation, this might involve multiple tax rates applied sequentially
  return amount * (percentage / 100);
};

module.exports = {
  calculateTax,
  calculateSimpleTax,
  calculateCompoundTax
};