/**
 * Currency utilities for POS system
 * Dynamically determines currency symbol and formatting based on branch/restaurant country
 */

// Currency mapping based on country codes
const CURRENCY_MAP = {
  // North America
  'US': { currency: 'USD', locale: 'en-US', symbol: '$' },
  'USA': { currency: 'USD', locale: 'en-US', symbol: '$' },
  'UNITED STATES': { currency: 'USD', locale: 'en-US', symbol: '$' },
  'UNITED STATES OF AMERICA': { currency: 'USD', locale: 'en-US', symbol: '$' },
  'CA': { currency: 'CAD', locale: 'en-CA', symbol: 'C$' },
  'CANADA': { currency: 'CAD', locale: 'en-CA', symbol: 'C$' },
  'MX': { currency: 'MXN', locale: 'es-MX', symbol: '$' },
  'MEXICO': { currency: 'MXN', locale: 'es-MX', symbol: '$' },

  // Europe
  'GB': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  'UK': { currency: 'GBP', locale: 'en-GB', symbol: '£' }, // Alternative UK code
  'UNITED KINGDOM': { currency: 'GBP', locale: 'en-GB', symbol: '£' }, // Full country name
  'ENGLAND': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  'SCOTLAND': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  'WALES': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  'NORTHERN IRELAND': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
  'DE': { currency: 'EUR', locale: 'de-DE', symbol: '€' },
  'FR': { currency: 'EUR', locale: 'fr-FR', symbol: '€' },
  'IT': { currency: 'EUR', locale: 'it-IT', symbol: '€' },
  'ES': { currency: 'EUR', locale: 'es-ES', symbol: '€' },
  'NL': { currency: 'EUR', locale: 'nl-NL', symbol: '€' },
  'BE': { currency: 'EUR', locale: 'nl-BE', symbol: '€' },
  'AT': { currency: 'EUR', locale: 'de-AT', symbol: '€' },
  'CH': { currency: 'CHF', locale: 'de-CH', symbol: 'CHF' },
  'SE': { currency: 'SEK', locale: 'sv-SE', symbol: 'kr' },
  'NO': { currency: 'NOK', locale: 'nb-NO', symbol: 'kr' },
  'DK': { currency: 'DKK', locale: 'da-DK', symbol: 'kr' },

  // Asia Pacific
  'IN': { currency: 'INR', locale: 'en-IN', symbol: '₹' },
  'INDIA': { currency: 'INR', locale: 'en-IN', symbol: '₹' },
  'CN': { currency: 'CNY', locale: 'zh-CN', symbol: '¥' },
  'JP': { currency: 'JPY', locale: 'ja-JP', symbol: '¥' },
  'KR': { currency: 'KRW', locale: 'ko-KR', symbol: '₩' },
  'AU': { currency: 'AUD', locale: 'en-AU', symbol: 'A$' },
  'NZ': { currency: 'NZD', locale: 'en-NZ', symbol: 'NZ$' },
  'SG': { currency: 'SGD', locale: 'en-SG', symbol: 'S$' },
  'HK': { currency: 'HKD', locale: 'en-HK', symbol: 'HK$' },
  'MY': { currency: 'MYR', locale: 'ms-MY', symbol: 'RM' },
  'TH': { currency: 'THB', locale: 'th-TH', symbol: '฿' },
  'ID': { currency: 'IDR', locale: 'id-ID', symbol: 'Rp' },
  'PH': { currency: 'PHP', locale: 'en-PH', symbol: '₱' },
  'VN': { currency: 'VND', locale: 'vi-VN', symbol: '₫' },

  // Middle East & Africa
  'AE': { currency: 'AED', locale: 'ar-AE', symbol: 'د.إ' },
  'SA': { currency: 'SAR', locale: 'ar-SA', symbol: '﷼' },
  'ZA': { currency: 'ZAR', locale: 'en-ZA', symbol: 'R' },
  'EG': { currency: 'EGP', locale: 'ar-EG', symbol: '£' },

  // South America
  'BR': { currency: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  'AR': { currency: 'ARS', locale: 'es-AR', symbol: '$' },
  'CL': { currency: 'CLP', locale: 'es-CL', symbol: '$' },
  'CO': { currency: 'COP', locale: 'es-CO', symbol: '$' },

  // Default fallback
  'DEFAULT': { currency: 'USD', locale: 'en-US', symbol: '$' }
};

/**
 * Get currency configuration based on country code
 * @param {string} countryCode - ISO country code (e.g., 'US', 'IN', 'GB')
 * @returns {Object} Currency configuration object
 */
export const getCurrencyConfig = (countryCode) => {
  if (!countryCode) {
    console.warn('No country code provided, using default currency (USD)');
    return CURRENCY_MAP.DEFAULT;
  }

  const upperCountryCode = countryCode.toUpperCase();
  const config = CURRENCY_MAP[upperCountryCode];
  
  if (!config) {
    console.warn(`Currency not found for country code: ${upperCountryCode}, using default (USD)`);
    return CURRENCY_MAP.DEFAULT;
  }

  return config;
};

/**
 * Format currency amount based on country code
 * @param {number} amount - Amount to format
 * @param {string} countryCode - ISO country code
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, countryCode, options = {}) => {
  try {
    const config = getCurrencyConfig(countryCode);
    const {
      minimumFractionDigits = 0,
      maximumFractionDigits = 2,
      useSymbol = false
    } = options;

    // If useSymbol is true, return simple symbol + amount format
    if (useSymbol) {
      return `${config.symbol}${Number(amount).toFixed(minimumFractionDigits)}`;
    }

    // Use Intl.NumberFormat for proper localization
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount || 0);

  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback to simple format
    const fallbackConfig = CURRENCY_MAP.DEFAULT;
    return `${fallbackConfig.symbol}${Number(amount || 0).toFixed(0)}`;
  }
};

/**
 * Get currency symbol for a country
 * @param {string} countryCode - ISO country code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (countryCode) => {
  const config = getCurrencyConfig(countryCode);
  return config.symbol;
};

/**
 * Get currency code for a country
 * @param {string} countryCode - ISO country code
 * @returns {string} Currency code (e.g., 'USD', 'EUR', 'INR')
 */
export const getCurrencyCode = (countryCode) => {
  const config = getCurrencyConfig(countryCode);
  return config.currency;
};

/**
 * Get locale for a country
 * @param {string} countryCode - ISO country code
 * @returns {string} Locale string (e.g., 'en-US', 'en-GB', 'en-IN')
 */
export const getLocale = (countryCode) => {
  const config = getCurrencyConfig(countryCode);
  return config.locale;
};

/**
 * Check if a country uses a specific currency
 * @param {string} countryCode - ISO country code
 * @param {string} currencyCode - Currency code to check
 * @returns {boolean} True if country uses the currency
 */
export const usesCurrency = (countryCode, currencyCode) => {
  const config = getCurrencyConfig(countryCode);
  return config.currency === currencyCode.toUpperCase();
};

/**
 * Get all supported countries and their currencies
 * @returns {Object} Object with country codes as keys and currency configs as values
 */
export const getAllCurrencies = () => {
  return { ...CURRENCY_MAP };
};

export default {
  formatCurrency,
  getCurrencyConfig,
  getCurrencySymbol,
  getCurrencyCode,
  getLocale,
  usesCurrency,
  getAllCurrencies
};
