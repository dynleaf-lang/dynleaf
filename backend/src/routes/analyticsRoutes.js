const express = require('express');
const router = express.Router();

/**
 * Payment Analytics Routes
 * Handle analytics data from payment flows
 */

// POST /api/analytics/payment - Track payment events
router.post('/payment', async (req, res) => {
  try {
    const { sessionId, timestamp, event, data } = req.body;
    
    // Validate required fields
    if (!sessionId || !event || !timestamp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, event, timestamp'
      });
    }
    
    // Create analytics entry
    const analyticsData = {
      sessionId,
      timestamp,
      event,
      data,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      origin: req.get('Origin'),
      referer: req.get('Referer'),
      receivedAt: Date.now()
    };
    
    // Log the analytics data (in production, you'd save to database)
    console.log('[ANALYTICS] Payment event received:', {
      sessionId: sessionId.substring(0, 20) + '...',
      event,
      timestamp: new Date(timestamp).toISOString(),
      dataKeys: Object.keys(data || {}),
      userAgent: req.get('User-Agent')?.substring(0, 50) + '...',
      ip: analyticsData.ip
    });
    
    // Optional: Save to database
    // You can uncomment and implement this when ready
    /*
    const Analytics = require('../models/Analytics');
    const savedAnalytics = await Analytics.create(analyticsData);
    console.log('[ANALYTICS] Saved to database:', savedAnalytics._id);
    */
    
    res.json({
      success: true,
      message: 'Analytics event recorded',
      eventId: `analytics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    });
    
  } catch (error) {
    console.error('[ANALYTICS] Error processing payment analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process analytics event',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/analytics/health - Health check for analytics service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// POST /api/analytics/batch - Handle batch analytics events
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Events must be an array'
      });
    }
    
    if (events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array cannot be empty'
      });
    }
    
    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 events per batch'
      });
    }
    
    const processedEvents = [];
    const commonData = {
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      origin: req.get('Origin'),
      receivedAt: Date.now()
    };
    
    // Process each event
    for (const event of events) {
      if (!event.sessionId || !event.event || !event.timestamp) {
        console.warn('[ANALYTICS] Skipping invalid event:', event);
        continue;
      }
      
      const analyticsData = {
        ...event,
        ...commonData
      };
      
      processedEvents.push(analyticsData);
      
      // Log each event
      console.log('[ANALYTICS] Batch event:', {
        sessionId: event.sessionId.substring(0, 20) + '...',
        event: event.event,
        timestamp: new Date(event.timestamp).toISOString()
      });
    }
    
    // Optional: Batch save to database
    /*
    const Analytics = require('../models/Analytics');
    const savedAnalytics = await Analytics.insertMany(processedEvents);
    console.log('[ANALYTICS] Batch saved to database:', savedAnalytics.length, 'events');
    */
    
    res.json({
      success: true,
      message: 'Batch analytics events recorded',
      processedCount: processedEvents.length,
      skippedCount: events.length - processedEvents.length
    });
    
  } catch (error) {
    console.error('[ANALYTICS] Error processing batch analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch analytics events',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;