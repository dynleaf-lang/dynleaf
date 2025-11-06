const mongoose = require('mongoose');

/**
 * Analytics Schema for tracking payment and user behavior events
 */
const analyticsSchema = new mongoose.Schema({
  // Event identification
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  event: {
    type: String,
    required: true,
    index: true
  },
  
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Event data (flexible structure)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request context
  userAgent: String,
  ip: String,
  origin: String,
  referer: String,
  
  // Server processing info
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Optional user/customer context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    sparse: true
  },
  
  // Optional order context
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    sparse: true
  },
  
  // Optional branch/restaurant context
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    sparse: true
  },
  
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    sparse: true
  }
}, {
  timestamps: true,
  // Index for efficient querying
  index: [
    { sessionId: 1, timestamp: -1 },
    { event: 1, timestamp: -1 },
    { receivedAt: -1 }
  ]
});

// Add TTL index to automatically remove old analytics data (optional)
// Uncomment to enable automatic cleanup after 90 days
// analyticsSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static methods for common queries
analyticsSchema.statics.getEventsBySession = function(sessionId) {
  return this.find({ sessionId }).sort({ timestamp: 1 });
};

analyticsSchema.statics.getEventsByType = function(eventType, limit = 100) {
  return this.find({ event: eventType })
    .sort({ timestamp: -1 })
    .limit(limit);
};

analyticsSchema.statics.getPaymentMetrics = function(startDate, endDate) {
  const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const end = endDate || new Date();
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lte: end },
        event: { $in: ['payment_success', 'payment_failure', 'payment_initiated'] }
      }
    },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        totalAmount: { $sum: '$data.amount' }
      }
    }
  ]);
};

// Instance methods
analyticsSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive data if needed
  if (obj.data && obj.data.sensitiveField) {
    delete obj.data.sensitiveField;
  }
  return obj;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;