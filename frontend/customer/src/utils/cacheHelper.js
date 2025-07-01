// API response caching utility for improved performance
// This utility uses localStorage for persistence and manages cache expiration

// Default cache duration (15 minutes)
const DEFAULT_CACHE_DURATION = 15 * 60 * 1000;

/**
 * Get a cached response for a specific key
 * @param {string} cacheKey - Unique identifier for the cache entry
 * @returns {Object|null} - The cached data or null if not found/expired
 */
export const getCachedData = (cacheKey) => {
  try {
    const cachedItem = localStorage.getItem(`cache_${cacheKey}`);
    if (!cachedItem) return null;

    const { data, expiry } = JSON.parse(cachedItem);
    
    // Check if cache is expired
    if (expiry < Date.now()) {
      localStorage.removeItem(`cache_${cacheKey}`);
      return null;
    }
     
    return data;
  } catch (error) { 

    return null;
  }
};

/**
 * Store data in cache with expiration
 * @param {string} cacheKey - Unique identifier for the cache entry
 * @param {Object} data - The data to cache
 * @param {number} duration - Cache duration in milliseconds (defaults to 15 minutes)
 */
export const setCachedData = (cacheKey, data, duration = DEFAULT_CACHE_DURATION) => {
  try {
    const cacheItem = {
      data,
      expiry: Date.now() + duration
    };
    
    localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(cacheItem)); 
  } catch (error) {
    console.error('Error storing in cache:', error);
  }
};

/**
 * Clear all cached data or specific cache entries
 * @param {string|null} keyPattern - Optional pattern to match cache keys (null clears all)
 */
export const clearCache = (keyPattern = null) => {
  try {
    if (keyPattern) {
      // Clear specific cache entries matching the pattern
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cache_') && key.includes(keyPattern)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
       
    } else {
      // Clear all cache entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key)); 
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics including count, size, and item list
 */
export const getCacheStats = () => {
  try {
    const cacheItems = [];
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('cache_')) {
        const value = localStorage.getItem(key);
        const size = (value.length * 2) / 1024; // Approximate size in KB
        totalSize += size;
        
        const { expiry } = JSON.parse(value);
        const expiresIn = Math.round((expiry - Date.now()) / 1000);
        
        cacheItems.push({
          key: key.replace('cache_', ''),
          size: `${size.toFixed(2)} KB`,
          expires: expiresIn > 0 ? `${expiresIn}s` : 'Expired'
        });
      }
    }
    
    return {
      count: cacheItems.length,
      totalSize: `${totalSize.toFixed(2)} KB`,
      items: cacheItems
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, totalSize: '0 KB', items: [] };
  }
};
