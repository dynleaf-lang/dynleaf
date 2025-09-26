const crypto = require('crypto');
const Order = require('../models/Order');
const { emitOrderUpdate } = require('../utils/socketUtils');
const { notifyOrderStatusWhatsApp } = require('../services/whatsappNotify');

// Cashfree webhook handler
// Handles payment notifications from Cashfree PG
exports.cashfreeWebhook = async (req, res) => {
  try {
    // Log all incoming requests for debugging
    console.log('[CASHFREE WEBHOOK] Received request:', {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString()
    });

    // Handle Cashfree test requests (they send GET requests to test the endpoint)
    if (req.method === 'GET') {
      console.log('[CASHFREE WEBHOOK] Responding to test request');
      return res.status(200).json({ 
        status: 'success',
        message: 'Webhook endpoint is active and ready to receive notifications',
        timestamp: new Date().toISOString()
      });
    }

    // Verify webhook signature for security (production)
    if (process.env.CASHFREE_WEBHOOK_SECRET) {
      const signature = req.headers['x-webhook-signature'];
      
      if (signature) {
        const rawBody = JSON.stringify(req.body);
        const computedSignature = crypto
          .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('base64');

        if (signature !== computedSignature) {
          console.error('[CASHFREE WEBHOOK] Invalid signature:', {
            received: signature,
            computed: computedSignature
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        console.log('[CASHFREE WEBHOOK] Signature verified successfully');
      } else {
        console.warn('[CASHFREE WEBHOOK] No signature provided, but webhook secret is configured');
      }
    }

    const { type, data } = req.body || {};
    
    if (!type) {
      console.log('[CASHFREE WEBHOOK] No event type provided, acknowledging anyway');
      return res.status(200).json({ message: 'Webhook received successfully' });
    }

    console.log('[CASHFREE WEBHOOK] Processing event type:', type);

    // Handle different webhook event types
    switch (type) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(data);
        break;
      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailed(data);
        break;
      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        await handlePaymentDropped(data);
        break;
      case 'REFUND_STATUS_WEBHOOK':
        await handleRefundStatus(data);
        break;
      default:
        console.log('[CASHFREE WEBHOOK] Unhandled webhook type:', type);
    }

    // Always return 200 OK to acknowledge receipt
    return res.status(200).json({ 
      message: 'Webhook processed successfully',
      type: type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error processing webhook:', error);
    
    // Return 200 to prevent webhook retries for processing errors
    // Only return error status for authentication/validation failures
    return res.status(200).json({ 
      message: 'Webhook received but processing failed',
      error: 'Internal processing error',
      timestamp: new Date().toISOString()
    });
  }
};

// Handle successful payment
async function handlePaymentSuccess(data) {
  console.log('[CASHFREE WEBHOOK] Processing payment success:', data);
  
  const {
    order_id: cfOrderId,
    order_amount,
    payment_status,
    payment_method,
    payment_time,
    cf_payment_id,
    payment_message
  } = data;

  try {
    // Find order by Cashfree order ID
    // The cfOrderId should match our internal order reference or be stored in order metadata
    const order = await findOrderByCfOrderId(cfOrderId);
    
    if (!order) {
      console.warn('[CASHFREE WEBHOOK] Order not found for cfOrderId:', cfOrderId);
      return;
    }

    console.log('[CASHFREE WEBHOOK] Found order:', order.orderId, 'for cfOrderId:', cfOrderId);

    // Update order payment status
    const prevPaymentStatus = order.paymentStatus;
    order.paymentStatus = 'paid';
    order.paymentMethod = mapPaymentMethod(payment_method);
    order.paymentDetails = {
      cfOrderId,
      cfPaymentId: cf_payment_id,
      paymentTime: payment_time,
      amount: order_amount,
      status: payment_status,
      method: payment_method,
      message: payment_message,
      webhookProcessedAt: new Date()
    };
    order.updatedAt = new Date();

    await order.save();

    console.log('[CASHFREE WEBHOOK] Order payment status updated:', {
      orderId: order.orderId,
      previousStatus: prevPaymentStatus,
      newStatus: 'paid',
      amount: order_amount
    });

    // Emit real-time update to connected clients
    try {
      emitOrderUpdate({
        eventType: 'payment_success',
        order: order,
        message: `Payment completed for order ${order.orderId}`,
        oldPaymentStatus: prevPaymentStatus,
        newPaymentStatus: 'paid',
        paymentDetails: {
          method: order.paymentMethod,
          amount: order_amount,
          cfPaymentId: cf_payment_id
        }
      });
    } catch (socketError) {
      console.error('[CASHFREE WEBHOOK] Socket emission error:', socketError);
    }

    // Send WhatsApp notification if enabled
    try {
      await notifyOrderStatusWhatsApp(order, { 
        prevStatus: order.status,
        paymentUpdate: true,
        paymentStatus: 'paid'
      });
    } catch (whatsappError) {
      console.error('[CASHFREE WEBHOOK] WhatsApp notification error:', whatsappError);
    }

    // Auto-confirm order if it was pending payment
    if (order.status === 'pending') {
      const prevStatus = order.status;
      order.status = 'confirmed';
      await order.save();

      console.log('[CASHFREE WEBHOOK] Order auto-confirmed after payment:', order.orderId);

      // Emit status update
      try {
        emitOrderUpdate({
          eventType: 'status_updated',
          order: order,
          message: `Order ${order.orderId} confirmed after payment`,
          oldStatus: prevStatus,
          newStatus: 'confirmed'
        });
      } catch (socketError) {
        console.error('[CASHFREE WEBHOOK] Socket emission error for status:', socketError);
      }

      // Send status update notification
      try {
        await notifyOrderStatusWhatsApp(order, { prevStatus });
      } catch (whatsappError) {
        console.error('[CASHFREE WEBHOOK] WhatsApp status notification error:', whatsappError);
      }
    }

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error handling payment success:', error);
    throw error;
  }
}

// Handle failed payment
async function handlePaymentFailed(data) {
  console.log('[CASHFREE WEBHOOK] Processing payment failure:', data);
  
  const {
    order_id: cfOrderId,
    payment_status,
    payment_method,
    payment_message,
    error_details
  } = data;

  try {
    const order = await findOrderByCfOrderId(cfOrderId);
    
    if (!order) {
      console.warn('[CASHFREE WEBHOOK] Order not found for failed payment:', cfOrderId);
      return;
    }

    const prevPaymentStatus = order.paymentStatus;
    order.paymentStatus = 'failed';
    order.paymentDetails = {
      cfOrderId,
      status: payment_status,
      method: payment_method,
      message: payment_message,
      errorDetails: error_details,
      failedAt: new Date()
    };
    order.updatedAt = new Date();

    await order.save();

    console.log('[CASHFREE WEBHOOK] Order payment failed:', {
      orderId: order.orderId,
      previousStatus: prevPaymentStatus,
      reason: payment_message
    });

    // Emit real-time update
    try {
      emitOrderUpdate({
        eventType: 'payment_failed',
        order: order,
        message: `Payment failed for order ${order.orderId}`,
        oldPaymentStatus: prevPaymentStatus,
        newPaymentStatus: 'failed',
        errorDetails: error_details
      });
    } catch (socketError) {
      console.error('[CASHFREE WEBHOOK] Socket emission error:', socketError);
    }

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error handling payment failure:', error);
    throw error;
  }
}

// Handle payment dropped (user cancelled)
async function handlePaymentDropped(data) {
  console.log('[CASHFREE WEBHOOK] Processing payment dropped:', data);
  
  const { order_id: cfOrderId, payment_method } = data;

  try {
    const order = await findOrderByCfOrderId(cfOrderId);
    
    if (!order) {
      console.warn('[CASHFREE WEBHOOK] Order not found for dropped payment:', cfOrderId);
      return;
    }

    // Don't change payment status to failed immediately
    // User might retry payment, so keep it as pending
    order.paymentDetails = {
      ...order.paymentDetails,
      cfOrderId,
      lastAttempt: {
        method: payment_method,
        status: 'dropped',
        droppedAt: new Date()
      }
    };
    order.updatedAt = new Date();

    await order.save();

    console.log('[CASHFREE WEBHOOK] Payment dropped recorded:', {
      orderId: order.orderId,
      method: payment_method
    });

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error handling payment drop:', error);
    throw error;
  }
}

// Handle refund status updates
async function handleRefundStatus(data) {
  console.log('[CASHFREE WEBHOOK] Processing refund status:', data);
  
  const {
    order_id: cfOrderId,
    refund_id,
    refund_status,
    refund_amount,
    refund_note
  } = data;

  try {
    const order = await findOrderByCfOrderId(cfOrderId);
    
    if (!order) {
      console.warn('[CASHFREE WEBHOOK] Order not found for refund:', cfOrderId);
      return;
    }

    // Update payment status based on refund status
    if (refund_status === 'SUCCESS') {
      order.paymentStatus = 'refunded';
    } else if (refund_status === 'PENDING') {
      order.paymentStatus = 'refund_pending';
    }

    order.refundDetails = {
      refundId: refund_id,
      status: refund_status,
      amount: refund_amount,
      note: refund_note,
      processedAt: new Date()
    };
    order.updatedAt = new Date();

    await order.save();

    console.log('[CASHFREE WEBHOOK] Refund processed:', {
      orderId: order.orderId,
      refundId: refund_id,
      status: refund_status,
      amount: refund_amount
    });

    // Emit real-time update
    try {
      emitOrderUpdate({
        eventType: 'refund_processed',
        order: order,
        message: `Refund ${refund_status.toLowerCase()} for order ${order.orderId}`,
        refundDetails: {
          refundId: refund_id,
          status: refund_status,
          amount: refund_amount
        }
      });
    } catch (socketError) {
      console.error('[CASHFREE WEBHOOK] Socket emission error:', socketError);
    }

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error handling refund status:', error);
    throw error;
  }
}

// Helper function to find order by Cashfree order ID
async function findOrderByCfOrderId(cfOrderId) {
  try {
    // Try different approaches to find the order
    
    // 1. Direct match if cfOrderId is stored in order
    let order = await Order.findOne({ 'paymentDetails.cfOrderId': cfOrderId })
      .populate('branchId', 'name settings')
      .populate('restaurantId', 'name');

    if (order) return order;

    // 2. Check if cfOrderId follows our pattern: OE-timestamp-random
    // Extract the timestamp part and search for orders created around that time
    const cfOrderMatch = cfOrderId.match(/^OE-(\d+)-\d+$/);
    if (cfOrderMatch) {
      const timestamp = parseInt(cfOrderMatch[1]);
      const orderTime = new Date(timestamp);
      const timeBefore = new Date(timestamp - 60000); // 1 minute before
      const timeAfter = new Date(timestamp + 60000);  // 1 minute after

      order = await Order.findOne({
        createdAt: { $gte: timeBefore, $lte: timeAfter },
        paymentMethod: { $in: ['online', 'upi'] } // Only digital payments
      })
      .populate('branchId', 'name settings')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });

      if (order) {
        // Update the order with cfOrderId for future reference
        order.paymentDetails = { 
          ...order.paymentDetails, 
          cfOrderId 
        };
        await order.save();
        return order;
      }
    }

    // 3. Check if cfOrderId is stored in order metadata or notes
    order = await Order.findOne({
      $or: [
        { notes: { $regex: cfOrderId, $options: 'i' } },
        { 'metadata.cfOrderId': cfOrderId }
      ]
    })
    .populate('branchId', 'name settings')
    .populate('restaurantId', 'name');

    return order;

  } catch (error) {
    console.error('[CASHFREE WEBHOOK] Error finding order by cfOrderId:', error);
    return null;
  }
}

// Map Cashfree payment method to our internal format
function mapPaymentMethod(cfPaymentMethod) {
  const methodMap = {
    'UPI': 'upi',
    'NETBANKING': 'netbanking',
    'CARD': 'card',
    'WALLET': 'wallet',
    'EMI': 'emi',
    'PAYLATER': 'paylater'
  };
  
  return methodMap[cfPaymentMethod] || 'online';
}