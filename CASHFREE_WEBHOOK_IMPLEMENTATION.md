# Cashfree Webhook Implementation Guide

## Overview

This implementation provides a comprehensive webhook system for handling Cashfree payment notifications in production. The webhook handles all payment lifecycle events and automatically updates order statuses.

## Webhook Endpoint

```
POST /api/public/payments/cashfree/webhook
```

## Supported Events

### 1. Payment Success (`PAYMENT_SUCCESS_WEBHOOK`)
- Updates order payment status to 'paid'
- Auto-confirms pending orders
- Sends real-time notifications
- Triggers WhatsApp notifications (if enabled)

### 2. Payment Failed (`PAYMENT_FAILED_WEBHOOK`)
- Updates order payment status to 'failed' 
- Logs error details for troubleshooting
- Sends failure notifications

### 3. Payment Dropped (`PAYMENT_USER_DROPPED_WEBHOOK`)
- Records abandonment without changing status
- Allows user to retry payment

### 4. Refund Status (`REFUND_STATUS_WEBHOOK`)
- Handles refund processing updates
- Updates order status to 'refunded' or 'refund_pending'

## Security Features

### Webhook Signature Verification
```javascript
const signature = req.headers['x-webhook-signature'];
const computedSignature = crypto
  .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('base64');
```

Set `CASHFREE_WEBHOOK_SECRET` in production for signature verification.

## Order Matching Strategy

The webhook uses multiple strategies to find orders by Cashfree order ID:

1. **Direct Match**: Stored in `order.paymentDetails.cfOrderId`
2. **Timestamp-based**: Extracts timestamp from CF order ID pattern `OE-{timestamp}-{random}`
3. **Fallback Search**: Checks order notes and metadata

## Configuration

### Environment Variables
```env
# Production webhook URL
CASHFREE_WEBHOOK_URL=https://api.yourrestaurant.com/api/public/payments/cashfree/webhook

# Webhook security secret
CASHFREE_WEBHOOK_SECRET=your_secure_webhook_secret

# Cashfree production settings
CASHFREE_ENV=prod
CASHFREE_APP_ID=your_production_app_id
CASHFREE_SECRET_KEY=your_production_secret_key
```

### Cashfree Dashboard Setup
1. Go to Cashfree merchant dashboard
2. Navigate to Developer → Webhooks
3. Add webhook URL: `https://your-domain.com/api/public/payments/cashfree/webhook`
4. Select events: Payment Success, Payment Failed, User Dropped, Refund Status
5. Set webhook secret for security

## Real-time Updates

The webhook system emits real-time updates via Socket.IO:

### Payment Success Event
```javascript
emitOrderUpdate({
  eventType: 'payment_success',
  order: order,
  message: 'Payment completed for order ${order.orderId}',
  oldPaymentStatus: 'pending',
  newPaymentStatus: 'paid',
  paymentDetails: {
    method: 'upi',
    amount: 250.00,
    cfPaymentId: 'CF123456'
  }
});
```

### Payment Failed Event
```javascript
emitOrderUpdate({
  eventType: 'payment_failed',
  order: order,
  message: 'Payment failed for order ${order.orderId}',
  errorDetails: { code: 'PAYMENT_DECLINED', message: 'Insufficient Balance' }
});
```

## Testing

### Development Webhook Test Endpoint
```
POST /api/public/payments/cashfree/webhook/test
```

**Test Payment Success:**
```javascript
{
  "event_type": "success",
  "order_id": "OE-TEST-001",
  "amount": 100
}
```

**Test Payment Failure:**
```javascript
{
  "event_type": "failed", 
  "order_id": "OE-TEST-001"
}
```

### Using ngrok for Local Testing
```bash
# Install ngrok
npm install -g ngrok

# Start your backend
npm run dev

# Expose local server
ngrok http 5001

# Use the ngrok URL in Cashfree dashboard:
# https://abc123.ngrok.io/api/public/payments/cashfree/webhook
```

## Error Handling

### Webhook Response Policy
- Always returns `200 OK` to prevent webhook retries
- Logs all processing errors for debugging
- Only returns `401 Unauthorized` for signature verification failures

### Failure Recovery
- Webhook failures are logged but don't affect user experience
- Payment status can be manually updated via admin panel
- Orders can be found by timestamp if CF order ID matching fails

## Monitoring

### Log Examples

**Successful Processing:**
```
[CASHFREE WEBHOOK] Processing payment success: { order_id: 'OE-1640995200000-123', amount: 250 }
[CASHFREE WEBHOOK] Found order: ORD-20241213-001 for cfOrderId: OE-1640995200000-123
[CASHFREE WEBHOOK] Order payment status updated: paid
```

**Order Not Found:**
```
[CASHFREE WEBHOOK] Order not found for cfOrderId: OE-1640995200000-999
```

**Processing Error:**
```
[CASHFREE WEBHOOK] Error processing webhook: Order validation failed
```

## Database Schema Updates

### Order Model Enhancements
```javascript
// Payment details for webhook tracking
paymentDetails: {
  cfOrderId: { type: String }, // Cashfree order ID
  cfPaymentId: { type: String }, // Cashfree payment ID  
  paymentTime: { type: Date },
  amount: { type: Number },
  status: { type: String },
  method: { type: String },
  message: { type: String },
  errorDetails: { type: mongoose.Schema.Types.Mixed },
  webhookProcessedAt: { type: Date }
}

// Refund tracking
refundDetails: {
  refundId: { type: String },
  status: { type: String },
  amount: { type: Number },
  processedAt: { type: Date }
}
```

## Production Checklist

- [ ] Set webhook URL in Cashfree dashboard
- [ ] Configure `CASHFREE_WEBHOOK_SECRET` 
- [ ] Test webhook with small amounts
- [ ] Monitor webhook logs for 24 hours
- [ ] Verify order status updates in admin panel
- [ ] Test refund workflow
- [ ] Set up monitoring alerts for webhook failures

## Troubleshooting

### Common Issues

**Webhook Not Receiving Events:**
- Verify URL is accessible from internet
- Check Cashfree dashboard webhook configuration
- Ensure HTTPS is used in production

**Order Not Found:**
- Check order creation includes cfOrderId
- Verify timestamp-based fallback logic
- Check order notes for CF order ID

**Signature Verification Fails:**
- Verify webhook secret matches Cashfree dashboard
- Check request body format (should be JSON string)
- Ensure secret is set in environment variables

### Debug Commands
```bash
# Check webhook endpoint
curl -X POST https://your-domain.com/api/public/payments/cashfree/webhook

# Test with sample data
curl -X POST https://your-domain.com/api/public/payments/cashfree/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"event_type":"success","order_id":"OE-TEST-001"}'
```

## Security Best Practices

1. **Always verify webhook signatures** in production
2. **Use HTTPS** for all webhook URLs
3. **Validate webhook data** before processing
4. **Rate limit** webhook endpoint if needed
5. **Monitor for suspicious activity**
6. **Keep webhook secrets secure**

---

**Status**: ✅ Production-Ready Cashfree Webhook Implementation
**Last Updated**: December 2024
**Maintenance**: Monitor webhook success rates and payment completion times