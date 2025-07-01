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
  'DEFAULT': { code: 'USD', symbol: '$', locale: 'en-US'  }
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
