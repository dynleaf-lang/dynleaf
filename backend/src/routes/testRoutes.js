const express = require('express');
const { emitStatusUpdate } = require('../utils/socketUtils');
const router = express.Router();

// Test endpoint to trigger a status update notification
router.post('/test-status-update', async (req, res) => {
  try {
    const { orderId, tableId, branchId, oldStatus, newStatus } = req.body;
    
    console.log('[TEST] Triggering test status update notification...');
    
    // Create a mock order object
    const mockOrder = {
      _id: orderId || '67741a72f8f01b8e8e8e8e8e',
      orderId: 'TEST123',
      tableId: tableId || '67741a72f8f01b8e8e8e8e8f',
      branchId: branchId || '67741a72f8f01b8e8e8e8e90',
      restaurantId: '67741a72f8f01b8e8e8e8e91'
    };
    
    // Emit the status update
    emitStatusUpdate(mockOrder, oldStatus || 'Pending', newStatus || 'Processing');
    
    console.log('[TEST] Status update notification emitted successfully');
    
    res.json({
      success: true,
      message: 'Test status update notification sent',
      data: {
        orderId: mockOrder._id,
        orderNumber: mockOrder.orderId,
        oldStatus: oldStatus || 'Pending',
        newStatus: newStatus || 'Processing',
        tableId: mockOrder.tableId,
        branchId: mockOrder.branchId
      }
    });
  } catch (error) {
    console.error('[TEST] Error sending test status update:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: error.message
    });
  }
});

module.exports = router;
