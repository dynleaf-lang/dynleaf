const crypto = require('crypto');
const Order = require('../models/Order');
const { emitOrderUpdate } = require('../utils/socketUtils');
const { notifyOrderStatusWhatsApp } = require('../services/whatsappNotify');
const { invalidatePaymentCache } = require('../utils/paymentCache');

// Cashfree webhook handler
// Handles payment notifications from Cashfree PG
exports.cashfreeWebhook = async (req, res) => {
  try {
    // Log all incoming requests for debugging
    console.log('[CASHFREE WEBHOOK] Received request:', {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'],
        'x-webhook-signature': req.headers['x-webhook-signature'],
        'x-webhook-timestamp': req.headers['x-webhook-timestamp'],
        'x-webhook-version': req.headers['x-webhook-version'],
        'x-idempotency-key': req.headers['x-idempotency-key']
      },
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Handle Cashfree test requests (they send GET requests to test the endpoint)
    if (req.method === 'GET') {
      console.log('[CASHFREE WEBHOOK] Responding to test request');
      return res.status(200).json({ 
        status: 'success',
        message: 'Cashfree webhook endpoint is active and ready',
        endpoint: '/api/public/payments/cashfree/webhook',
        methods: ['GET', 'POST'],
        timestamp: new Date().toISOString()
      });
    }

    // Verify webhook signature for security (production)
    if (process.env.CASHFREE_WEBHOOK_SECRET) {
      const signature = req.headers['x-webhook-signature'];
      const timestamp = req.headers['x-webhook-timestamp'];
      const version = req.headers['x-webhook-version'];
      
      console.log('[CASHFREE WEBHOOK] Signature verification:', {
        hasSignature: !!signature,
        timestamp,
        version,
        secretConfigured: !!process.env.CASHFREE_WEBHOOK_SECRET
      });
      
      if (signature) {
        // Use raw body for signature verification (important for decimal precision)
        const rawBody = JSON.stringify(req.body);
        const computedSignature = crypto
          .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('base64');

        if (signature !== computedSignature) {
          console.error('[CASHFREE WEBHOOK] Invalid signature:', {
            received: signature,
            computed: computedSignature,
            bodyLength: rawBody.length
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
  
  // Extract data according to 2025-01-01 webhook version structure
  const order = data?.order || {};
  const payment = data?.payment || {};
  const customerDetails = data?.customer_details || {};
  const gatewayDetails = data?.payment_gateway_details || {};
  
  const {
    order_id: cfOrderId,
    order_amount,
    order_currency
  } = order;

  const {
    cf_payment_id,
    payment_status,
    payment_amount,
    payment_currency,
    payment_message,
    payment_time,
    bank_reference,
    payment_method,
    payment_group
  } = payment;

  try {
    // Find order by Cashfree order ID
    const orderRecord = await findOrderByCfOrderId(cfOrderId);
    
    if (!orderRecord) {
      console.warn('[CASHFREE WEBHOOK] Order not found for cfOrderId:', cfOrderId);
      return;
    }

    console.log('[CASHFREE WEBHOOK] Found order:', orderRecord.orderId, 'for cfOrderId:', cfOrderId);

    // Update order payment status
    const prevPaymentStatus = orderRecord.paymentStatus;
    orderRecord.paymentStatus = 'paid';
    orderRecord.paymentMethod = mapPaymentMethod(payment_method);
    orderRecord.paymentDetails = {
      cfOrderId,
      cfPaymentId: cf_payment_id,
      paymentTime: payment_time,
      amount: payment_amount || order_amount,
      currency: payment_currency || order_currency,
      status: payment_status,
      method: payment_method,
      paymentGroup: payment_group,
      message: payment_message,
      bankReference: bank_reference,
      gatewayDetails: gatewayDetails,
      customerDetails: customerDetails,
      webhookProcessedAt: new Date(),
      webhookVersion: '2025-01-01'
    };
    orderRecord.updatedAt = new Date();

    await orderRecord.save();

    console.log('[CASHFREE WEBHOOK] Order payment status updated:', {
      orderId: orderRecord.orderId,
      previousStatus: prevPaymentStatus,
      newStatus: 'paid',
      amount: payment_amount || order_amount,
      paymentId: cf_payment_id
    });

    // Invalidate payment cache since status changed
    invalidatePaymentCache(cfOrderId);

    // Emit real-time update to connected clients (ENHANCED FOR INSTANT NOTIFICATIONS)
    try {
      // Emit multiple events for different client types
      
      // 1. General payment success event
      emitOrderUpdate({
        eventType: 'payment_success',
        order: orderRecord,
        cfOrderId: cfOrderId,
        message: `Payment completed for order ${orderRecord.orderId}`,
        oldPaymentStatus: prevPaymentStatus,
        newPaymentStatus: 'paid',
        paymentDetails: {
          method: orderRecord.paymentMethod,
          amount: payment_amount || order_amount,
          cfPaymentId: cf_payment_id,
          timestamp: new Date().toISOString()
        }
      });

      // 2. Customer-specific instant payment confirmation
      if (global.io) {
        global.io.emit('payment_confirmed', {
          cfOrderId: cfOrderId,
          orderId: orderRecord.orderId,
          status: 'success',
          amount: payment_amount || order_amount,
          paymentId: cf_payment_id,
          timestamp: new Date().toISOString(),
          message: 'Payment confirmed successfully'
        });

        // 3. Also emit to customer-specific room if table info available
        if (orderRecord.tableId) {
          global.io.to(`table_${orderRecord.tableId}`).emit('payment_confirmed', {
            cfOrderId: cfOrderId,
            orderId: orderRecord.orderId,
            status: 'success',
            amount: payment_amount || order_amount,
            paymentId: cf_payment_id,
            timestamp: new Date().toISOString(),
            message: 'Your payment has been confirmed'
          });
        }
      }
      
      console.log('[CASHFREE WEBHOOK] Real-time payment confirmation emitted for:', cfOrderId);
    } catch (socketError) {
      console.error('[CASHFREE WEBHOOK] Socket emission error for payment:', socketError);
    }

    // Send WhatsApp notification if enabled
    try {
      await notifyOrderStatusWhatsApp(orderRecord, { 
        prevStatus: orderRecord.status,
        paymentUpdate: true,
        paymentStatus: 'paid'
      });
    } catch (whatsappError) {
      console.error('[CASHFREE WEBHOOK] WhatsApp notification error:', whatsappError);
    }

    // Auto-confirm order if it was pending payment
    if (orderRecord.status === 'pending') {
      const prevStatus = orderRecord.status;
      orderRecord.status = 'confirmed';
      await orderRecord.save();

      console.log('[CASHFREE WEBHOOK] Order auto-confirmed after payment:', orderRecord.orderId);

      // Emit status update
      try {
        emitOrderUpdate({
          eventType: 'status_updated',
          order: orderRecord,
          message: `Order ${orderRecord.orderId} confirmed after payment`,
          oldStatus: prevStatus,
          newStatus: 'confirmed'
        });
      } catch (socketError) {
        console.error('[CASHFREE WEBHOOK] Socket emission error for status:', socketError);
      }

      // Send status update notification
      try {
        await notifyOrderStatusWhatsApp(orderRecord, { prevStatus });
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
  
  // Extract data according to 2025-01-01 webhook version structure
  const order = data?.order || {};
  const payment = data?.payment || {};
  const errorDetails = data?.error_details || {};
  const customerDetails = data?.customer_details || {};
  
  const {
    order_id: cfOrderId,
    order_amount,
    order_currency
  } = order;

  const {
    cf_payment_id,
    payment_status,
    payment_amount,
    payment_currency,
    payment_message,
    payment_time,
    payment_method,
    payment_group
  } = payment;

  try {
    const orderRecord = await findOrderByCfOrderId(cfOrderId);
    
    if (!orderRecord) {
      console.warn('[CASHFREE WEBHOOK] Order not found for failed payment:', cfOrderId);
      return;
    }

    const prevPaymentStatus = orderRecord.paymentStatus;
    orderRecord.paymentStatus = 'failed';
    orderRecord.paymentDetails = {
      cfOrderId,
      cfPaymentId: cf_payment_id,
      paymentTime: payment_time,
      amount: payment_amount || order_amount,
      currency: payment_currency || order_currency,
      status: payment_status,
      method: payment_method,
      paymentGroup: payment_group,
      message: payment_message,
      errorDetails: errorDetails,
      customerDetails: customerDetails,
      failedAt: new Date(),
      webhookProcessedAt: new Date(),
      webhookVersion: '2025-01-01'
    };
    orderRecord.updatedAt = new Date();

    await orderRecord.save();

    console.log('[CASHFREE WEBHOOK] Order payment failed:', {
      orderId: orderRecord.orderId,
      previousStatus: prevPaymentStatus,
      newStatus: 'failed',
      amount: payment_amount || order_amount,
      paymentId: cf_payment_id,
      reason: payment_message
    });

    // Invalidate payment cache since status changed
    invalidatePaymentCache(cfOrderId);

    // Emit real-time failure notification
    try {
      // 1. General payment failure event
      emitOrderUpdate({
        eventType: 'payment_failed',
        order: orderRecord,
        cfOrderId: cfOrderId,
        message: `Payment failed for order ${orderRecord.orderId}`,
        oldPaymentStatus: prevPaymentStatus,
        newPaymentStatus: 'failed',
        errorDetails: { 
          code: payment_status,
          message: payment_message,
          paymentId: cf_payment_id
        }
      });

      // 2. Customer-specific instant payment failure notification
      if (global.io) {
        global.io.emit('payment_failed', {
          cfOrderId: cfOrderId,
          orderId: orderRecord.orderId,
          status: 'failed',
          amount: payment_amount || order_amount,
          paymentId: cf_payment_id,
          timestamp: new Date().toISOString(),
          message: payment_message || 'Payment failed',
          reason: payment_message
        });

        // 3. Also emit to customer-specific room if table info available
        if (orderRecord.tableId) {
          global.io.to(`table_${orderRecord.tableId}`).emit('payment_failed', {
            cfOrderId: cfOrderId,
            orderId: orderRecord.orderId,
            status: 'failed',
            amount: payment_amount || order_amount,
            paymentId: cf_payment_id,
            timestamp: new Date().toISOString(),
            message: 'Payment failed. Please try again or contact support.',
            reason: payment_message
          });
        }
      }
      
      console.log('[CASHFREE WEBHOOK] Real-time payment failure emitted for:', cfOrderId);
    } catch (socketError) {
      console.error('[CASHFREE WEBHOOK] Socket emission error for payment failure:', socketError);
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