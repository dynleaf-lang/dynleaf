/**
 * Socket.IO utility functions for real-time communication
 */

/**
 * Emit order update to relevant rooms
 * @param {Object} order - The updated order object
 * @param {string} eventType - Type of event (created, updated, deleted)
 */
const emitOrderUpdate = (order, eventType = 'updated') => {
  if (!global.io) {
    console.warn('[SOCKET] Socket.IO instance not available');
    return;
  }

  const io = global.io;
  
  try {
    // Prepare the event data
    const eventData = {
      order,
      eventType,
      timestamp: new Date().toISOString()
    };

    // Emit to admin rooms
    if (order.restaurantId) {
      io.to(`restaurant_${order.restaurantId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to restaurant_${order.restaurantId}`);
    }
    
    if (order.branchId) {
      io.to(`branch_${order.branchId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to branch_${order.branchId}`);
    }

    // Emit to POS rooms (so POS dashboards receive updates without listening to generic rooms)
    if (order.branchId) {
      io.to(`pos_branch_${order.branchId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to pos_branch_${order.branchId}`);
    }
    if (order.restaurantId) {
      io.to(`pos_restaurant_${order.restaurantId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to pos_restaurant_${order.restaurantId}`);
    }
    
    // Emit to global admin room
    io.to('admin_global').emit('orderUpdate', eventData);
    console.log(`[SOCKET] Emitted order ${eventType} to admin_global`);

  // Emit to customer rooms
    if (order.tableId) {
      io.to(`table_${order.tableId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to table_${order.tableId}`);
    }
    
    if (order.branchId) {
      io.to(`customer_branch_${order.branchId}`).emit('orderUpdate', eventData);
      console.log(`[SOCKET] Emitted order ${eventType} to customer_branch_${order.branchId}`);
    }
    
  } catch (error) {
    console.error('[SOCKET] Error emitting order update:', error);
  }
};

/**
 * Emit status update specifically for order status changes
 * @param {Object} order - The updated order object
 * @param {string} oldStatus - The previous status
 * @param {string} newStatus - The new status
 */
const emitStatusUpdate = (order, oldStatus, newStatus) => {
  if (!global.io) {
    console.warn('[SOCKET] Socket.IO instance not available');
    return;
  }

  const io = global.io;
  
  try {
    const eventData = {
      orderId: order._id,
      orderNumber: order.orderId,
      oldStatus,
      newStatus,
      order,
      timestamp: new Date().toISOString()
    };

    console.log('[SOCKET] Emitting status update with data:', {
      orderId: eventData.orderId,
      orderNumber: eventData.orderNumber,
      oldStatus: eventData.oldStatus,
      newStatus: eventData.newStatus,
      branchId: order.branchId,
      tableId: order.tableId
    });

    // Emit to admin rooms
    if (order.restaurantId) {
      io.to(`restaurant_${order.restaurantId}`).emit('statusUpdate', eventData);
    }
    
    if (order.branchId) {
      io.to(`branch_${order.branchId}`).emit('statusUpdate', eventData);
    }
    
    io.to('admin_global').emit('statusUpdate', eventData);

    // Emit to customer rooms
    if (order.tableId) {
      io.to(`table_${order.tableId}`).emit('statusUpdate', eventData);
      console.log(`[SOCKET] Emitted status update to table_${order.tableId}: ${oldStatus} → ${newStatus}`);
    }
    
    if (order.branchId) {
      io.to(`customer_branch_${order.branchId}`).emit('statusUpdate', eventData);
      console.log(`[SOCKET] Emitted status update to customer_branch_${order.branchId}: ${oldStatus} → ${newStatus}`);
    }
    
    // Also emit to customer global room as fallback
    io.to('customer_global').emit('statusUpdate', eventData);
    console.log(`[SOCKET] Emitted status update to customer_global: ${oldStatus} → ${newStatus}`);
    
  } catch (error) {
    console.error('[SOCKET] Error emitting status update:', error);
  }
};

/**
 * Emit new order notification
 * @param {Object} order - The new order object
 */
const emitNewOrder = (order) => {
  emitOrderUpdate(order, 'created');
  
  // Also emit a specific new order event for notifications
  if (!global.io) return;
  
  const io = global.io;
  
  try {
    const eventData = {
      order,
      timestamp: new Date().toISOString()
    };

    // Notify admin rooms about new order
    if (order.restaurantId) {
      io.to(`restaurant_${order.restaurantId}`).emit('newOrder', eventData);
    }
    
    if (order.branchId) {
      io.to(`branch_${order.branchId}`).emit('newOrder', eventData);
    }
    
    // Notify POS rooms directly as well
    if (order.branchId) {
      io.to(`pos_branch_${order.branchId}`).emit('newOrder', eventData);
      console.log(`[SOCKET] Emitted new order to pos_branch_${order.branchId}`);
    }
    if (order.restaurantId) {
      io.to(`pos_restaurant_${order.restaurantId}`).emit('newOrder', eventData);
      console.log(`[SOCKET] Emitted new order to pos_restaurant_${order.restaurantId}`);
    }

    io.to('admin_global').emit('newOrder', eventData);
    
    console.log(`[SOCKET] Emitted new order notification for order ${order.orderId}`);
    
  } catch (error) {
    console.error('[SOCKET] Error emitting new order notification:', error);
  }
};

/**
 * Emit table status update to relevant rooms (POS, admin, kitchen and table room if applicable)
 * @param {Object} data - { tableId, status, branchId, restaurantId, currentOrderId? }
 */
const emitTableStatusUpdate = (data = {}) => {
  if (!global.io) {
    console.warn('[SOCKET] Socket.IO instance not available');
    return;
  }
  const io = global.io;
  try {
    const payload = {
      tableId: data.tableId,
      status: data.status,
      branchId: data.branchId,
      restaurantId: data.restaurantId,
      currentOrderId: data.currentOrderId || null,
      timestamp: new Date().toISOString(),
      source: data.source || 'server'
    };

    if (data.branchId) {
      io.to(`pos_branch_${data.branchId}`).emit('tableStatusUpdate', payload);
      io.to(`kitchen_branch_${data.branchId}`).emit('tableStatusUpdate', payload);
      io.to(`branch_${data.branchId}`).emit('tableStatusUpdate', payload);
    }
    if (data.restaurantId) {
      io.to(`pos_restaurant_${data.restaurantId}`).emit('tableStatusUpdate', payload);
      io.to(`restaurant_${data.restaurantId}`).emit('tableStatusUpdate', payload);
    }
    if (data.tableId) {
      io.to(`table_${data.tableId}`).emit('tableStatusUpdate', payload);
    }
    console.log(`[SOCKET] Emitted table status update for table ${data.tableId}: ${data.status}`);
  } catch (error) {
    console.error('[SOCKET] Error emitting table status update:', error);
  }
};

/**
 * Get connected clients count
 */
const getConnectedClientsCount = () => {
  if (!global.io) return 0;
  return global.io.engine.clientsCount;
};

/**
 * Get clients in specific room
 * @param {string} room - Room name
 */
const getClientsInRoom = async (room) => {
  if (!global.io) return [];
  try {
    const sockets = await global.io.in(room).fetchSockets();
    return sockets.map(socket => socket.id);
  } catch (error) {
    console.error(`[SOCKET] Error getting clients in room ${room}:`, error);
    return [];
  }
};

module.exports = {
  emitOrderUpdate,
  emitStatusUpdate,
  emitNewOrder,
  emitTableStatusUpdate,
  getConnectedClientsCount,
  getClientsInRoom
};
