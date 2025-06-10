// Currency formatting utility functions

/**
 * Map of country codes to currency information
 * Contains: currency code, symbol and locale format
 */
export const countryCurrencyMap = {
  // North America
  'US': { code: 'USD', symbol: '$', locale: 'en-US' },
  'USA': { code: 'USD', symbol: '$', locale: 'en-US' },
  'United States': { code: 'USD', symbol: '$', locale: 'en-US' },
  'CA': { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
  'Canada': { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
  'MX': { code: 'MXN', symbol: 'MX$', locale: 'es-MX' },
  'Mexico': { code: 'MXN', symbol: 'MX$', locale: 'es-MX' },
  
  // Europe
  'GB': { code: 'GBP', symbol: '£', locale: 'en-GB' },
  'UK': { code: 'GBP', symbol: '£', locale: 'en-GB' },
  'United Kingdom': { code: 'GBP', symbol: '£', locale: 'en-GB' },
  'FR': { code: 'EUR', symbol: '€', locale: 'fr-FR' },
  'France': { code: 'EUR', symbol: '€', locale: 'fr-FR' },
  'DE': { code: 'EUR', symbol: '€', locale: 'de-DE' },
  'Germany': { code: 'EUR', symbol: '€', locale: 'de-DE' },
  'ES': { code: 'EUR', symbol: '€', locale: 'es-ES' },
  'Spain': { code: 'EUR', symbol: '€', locale: 'es-ES' },
  'IT': { code: 'EUR', symbol: '€', locale: 'it-IT' },
  'Italy': { code: 'EUR', symbol: '€', locale: 'it-IT' },
  
  // Asia
  'JP': { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  'Japan': { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  'CN': { code: 'CNY', symbol: '¥', locale: 'zh-CN' },
  'China': { code: 'CNY', symbol: '¥', locale: 'zh-CN' },
  'IN': { code: 'INR', symbol: '₹', locale: 'en-IN' },
  'India': { code: 'INR', symbol: '₹', locale: 'en-IN' },
  'AE': { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  'United Arab Emirates': { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
  'SA': { code: 'SAR', symbol: '﷼', locale: 'ar-SA' },
  'Saudi Arabia': { code: 'SAR', symbol: '﷼', locale: 'ar-SA' },
  
  // Oceania
  'AU': { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  'Australia': { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  'NZ': { code: 'NZD', symbol: 'NZ$', locale: 'en-NZ' },
  'New Zealand': { code: 'NZD', symbol: 'NZ$', locale: 'en-NZ' },
  
  // Default (fallback)
  'DEFAULT': { code: 'INR', symbol: '₹', locale: 'en-IN'  }
};

/**
 * Format a number as currency based on country code
 *
 * @param {number} amount - The amount to format
 * @param {string} countryCode - ISO country code (e.g., 'US', 'GB') or full country name
 * @return {string} Formatted currency string
 */
export const formatCurrencyByCountry = (amount, countryCode = 'DEFAULT') => {
  // Get currency info from the map or use default
  const currencyInfo = countryCurrencyMap[countryCode] || countryCurrencyMap.DEFAULT;
  
  try {
    // Format using Intl.NumberFormat with the appropriate locale and currency
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    return `${currencyInfo.symbol}${parseFloat(amount).toFixed(2)}`;
  }
};

/**
 * Get currency symbol by country code
 *
 * @param {string} countryCode - ISO country code or full country name
 * @return {string} Currency symbol
 */
export const getCurrencySymbol = (countryCode = 'DEFAULT') => {
  const currencyInfo = countryCurrencyMap[countryCode] || countryCurrencyMap.DEFAULT;
  return currencyInfo.symbol;
};

/**
 * Get currency code by country code
 *
 * @param {string} countryCode - ISO country code or full country name
 * @return {string} Currency code (e.g., 'USD', 'EUR')
 */
export const getCurrencyCode = (countryCode = 'DEFAULT') => {
  const currencyInfo = countryCurrencyMap[countryCode] || countryCurrencyMap.DEFAULT;
  return currencyInfo.code;
};

/**
 * Helper to compare MongoDB IDs safely (handles both string and object IDs)
 * 
 * @param {string|Object} id1 - First ID to compare
 * @param {string|Object} id2 - Second ID to compare
 * @return {boolean} Whether the IDs match
 */
const compareIds = (id1, id2) => {
  if (!id1 || !id2) return false;
  
  const id1Str = typeof id1 === 'object' ? id1.toString() : id1;
  const id2Str = typeof id2 === 'object' ? id2.toString() : id2;
  
  return id1Str === id2Str;
};

/**
 * Gets the user's branch associated currency symbol from context
 *
 * @param {Object} user - User object from AuthContext
 * @param {Array} branches - Branches array from BranchContext
 * @param {Array} restaurants - Restaurants array from RestaurantContext
 * @param {string} defaultCountryCode - Default country code to use if user has no branch/restaurant assigned
 * @return {string} Currency symbol for the user's branch/restaurant country
 */
export const getUserBranchCurrencySymbol = (user, branches = [], restaurants = [], defaultCountryCode = 'DEFAULT') => {
  // If no user or not logged in, return default
  if (!user) {
    console.log('getUserBranchCurrencySymbol: No user provided');
    return getCurrencySymbol(defaultCountryCode);
  }
  
  try {
    // First try to get country from user's branch
    if (user.branchId && branches.length > 0) {
      console.log('getUserBranchCurrencySymbol: Looking for branch match', user.branchId);
      
      // Try to find branch by ID with safe ID comparison
      const userBranch = branches.find(branch => compareIds(branch._id, user.branchId));
      
      if (userBranch) {
        console.log('getUserBranchCurrencySymbol: Found matching branch', {
          branchId: userBranch._id,
          branchName: userBranch.name,
          country: userBranch.country
        });
        
        if (userBranch.country) {
          // Check if the country is in our map directly
          if (countryCurrencyMap[userBranch.country]) {
            console.log('getUserBranchCurrencySymbol: Using currency from branch country', {
              country: userBranch.country,
              symbol: getCurrencySymbol(userBranch.country)
            });
            return getCurrencySymbol(userBranch.country);
          } else {
            console.log(`getUserBranchCurrencySymbol: Country "${userBranch.country}" not found in currency map, using default`);
          }
        }
      } else {
        console.log('getUserBranchCurrencySymbol: No branch match found among', branches.length, 'branches');
      }
    }
    
    // If no branch or branch has no country, try from user's restaurant
    if (user.restaurantId && restaurants.length > 0) {
      console.log('getUserBranchCurrencySymbol: Looking for restaurant match', user.restaurantId);
      
      // Try to find restaurant by ID with safe ID comparison
      const userRestaurant = restaurants.find(restaurant => compareIds(restaurant._id, user.restaurantId));
      
      if (userRestaurant) {
        console.log('getUserBranchCurrencySymbol: Found matching restaurant', {
          restaurantId: userRestaurant._id,
          restaurantName: userRestaurant.name,
          country: userRestaurant.country
        });
        
        if (userRestaurant.country) {
          // Check if the country is in our map directly
          if (countryCurrencyMap[userRestaurant.country]) {
            console.log('getUserBranchCurrencySymbol: Using currency from restaurant country', {
              country: userRestaurant.country,
              symbol: getCurrencySymbol(userRestaurant.country)
            });
            return getCurrencySymbol(userRestaurant.country);
          } else {
            console.log(`getUserBranchCurrencySymbol: Country "${userRestaurant.country}" not found in currency map, using default`);
          }
        }
      } else {
        console.log('getUserBranchCurrencySymbol: No restaurant match found among', restaurants.length, 'restaurants');
      }
    }
    
    // If Super_Admin with no specific assignment, or if no country found, return default
    console.log('getUserBranchCurrencySymbol: Using default currency symbol', getCurrencySymbol(defaultCountryCode));
    return getCurrencySymbol(defaultCountryCode);
  } catch (error) {
    console.error('Error getting user branch currency symbol:', error);
    return getCurrencySymbol(defaultCountryCode);
  }
};

/**
 * Gets the user's branch associated currency code from context
 *
 * @param {Object} user - User object from AuthContext
 * @param {Array} branches - Branches array from BranchContext
 * @param {Array} restaurants - Restaurants array from RestaurantContext
 * @param {string} defaultCountryCode - Default country code to use if user has no branch/restaurant assigned
 * @return {string} Currency code for the user's branch/restaurant country
 */
export const getUserBranchCurrencyCode = (user, branches = [], restaurants = [], defaultCountryCode = 'DEFAULT') => {
  // If no user or not logged in, return default
  if (!user) {
    console.log('getUserBranchCurrencyCode: No user provided');
    return getCurrencyCode(defaultCountryCode);
  }
  
  try {
    // First try to get country from user's branch
    if (user.branchId && branches.length > 0) {
      // Try to find branch by ID with safe ID comparison
      const userBranch = branches.find(branch => compareIds(branch._id, user.branchId));
      
      if (userBranch && userBranch.country && countryCurrencyMap[userBranch.country]) {
        return getCurrencyCode(userBranch.country);
      }
    }
    
    // If no branch or branch has no country, try from user's restaurant
    if (user.restaurantId && restaurants.length > 0) {
      // Try to find restaurant by ID with safe ID comparison
      const userRestaurant = restaurants.find(restaurant => compareIds(restaurant._id, user.restaurantId));
      
      if (userRestaurant && userRestaurant.country && countryCurrencyMap[userRestaurant.country]) {
        return getCurrencyCode(userRestaurant.country);
      }
    }
    
    // If Super_Admin with no specific assignment, or if no country found, return default
    return getCurrencyCode(defaultCountryCode);
  } catch (error) {
    console.error('Error getting user branch currency code:', error);
    return getCurrencyCode(defaultCountryCode);
  }
};