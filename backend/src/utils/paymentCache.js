const NodeCache = require('node-cache');

// Payment status cache with 30-second TTL to reduce Cashfree API calls
const paymentCache = new NodeCache({ 
  stdTTL: 30, // 30 seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Better performance
});

// Cache keys
const getCacheKey = (cfOrderId, type = 'order') => `payment_${type}_${cfOrderId}`;

// Cache payment order status
const cacheOrderStatus = (cfOrderId, orderData) => {
  const key = getCacheKey(cfOrderId, 'order');
  paymentCache.set(key, orderData);
  console.log(`[PAYMENT CACHE] Cached order status for ${cfOrderId}`);
};

// Get cached payment order status
const getCachedOrderStatus = (cfOrderId) => {
  const key = getCacheKey(cfOrderId, 'order');
  const cached = paymentCache.get(key);
  
  if (cached) {
    console.log(`[PAYMENT CACHE] Hit for order ${cfOrderId}`);
    return cached;
  }
  
  console.log(`[PAYMENT CACHE] Miss for order ${cfOrderId}`);
  return null;
};

// Cache payment details list
const cachePaymentDetails = (cfOrderId, paymentData) => {
  const key = getCacheKey(cfOrderId, 'payments');
  paymentCache.set(key, paymentData);
  console.log(`[PAYMENT CACHE] Cached payment details for ${cfOrderId}`);
};

// Get cached payment details
const getCachedPaymentDetails = (cfOrderId) => {
  const key = getCacheKey(cfOrderId, 'payments');
  const cached = paymentCache.get(key);
  
  if (cached) {
    console.log(`[PAYMENT CACHE] Hit for payments ${cfOrderId}`);
    return cached;
  }
  
  console.log(`[PAYMENT CACHE] Miss for payments ${cfOrderId}`);
  return null;
};

// Invalidate cache when payment status changes (called from webhooks)
const invalidatePaymentCache = (cfOrderId) => {
  const orderKey = getCacheKey(cfOrderId, 'order');
  const paymentsKey = getCacheKey(cfOrderId, 'payments');
  
  paymentCache.del(orderKey);
  paymentCache.del(paymentsKey);
  
  console.log(`[PAYMENT CACHE] Invalidated cache for ${cfOrderId}`);
};

// Cache statistics for debugging
const getCacheStats = () => {
  const stats = paymentCache.getStats();
  return {
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0
  };
};

// Clear all cache (for testing)
const clearCache = () => {
  paymentCache.flushAll();
  console.log('[PAYMENT CACHE] Cleared all cache');
};

module.exports = {
  cacheOrderStatus,
  getCachedOrderStatus,
  cachePaymentDetails,
  getCachedPaymentDetails,
  invalidatePaymentCache,
  getCacheStats,
  clearCache
};