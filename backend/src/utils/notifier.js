// Simple notifier utility with optional email/SMS hooks
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { nodemailer = null; }
let twilioClient = null;
try { twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN); } catch (e) { twilioClient = null; }

const enableEmail = process.env.NOTIFY_ENABLE_EMAIL === 'true';
const enableSMS = process.env.NOTIFY_ENABLE_SMS === 'true';

let transporter = null;
if (enableEmail && nodemailer) {
  try {
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
    } else if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
  } catch (e) {
    console.warn('[NOTIFIER] Email transport init failed:', e.message);
  }
}

function severityFromStatus(status) {
  if (status === 'out' || status === 'critical') return 'critical';
  if (status === 'low') return 'low';
  return 'info';
}

async function sendEmail(subject, text) {
  if (!enableEmail || !transporter || !process.env.NOTIFY_EMAIL_TO) return;
  try {
    await transporter.sendMail({
      from: process.env.NOTIFY_EMAIL_FROM || 'no-reply@orderease.local',
      to: process.env.NOTIFY_EMAIL_TO,
      subject,
      text,
    });
  } catch (e) {
    console.warn('[NOTIFIER] Email send failed:', e.message);
  }
}

async function sendSMS(body) {
  if (!enableSMS || !twilioClient || !process.env.NOTIFY_SMS_TO || !process.env.TWILIO_FROM) return;
  try {
    await twilioClient.messages.create({
      to: process.env.NOTIFY_SMS_TO,
      from: process.env.TWILIO_FROM,
      body,
    });
  } catch (e) {
    console.warn('[NOTIFIER] SMS send failed:', e.message);
  }
}

function emitSocket(io, payload) {
  if (!io) return;
  try {
    if (payload.branchId) {
      io.to(`pos_branch_${payload.branchId}`).emit('inventory:notification', payload);
    }
    // Also emit a global admin channel if needed later
  } catch (e) {
    console.warn('[NOTIFIER] Socket emit failed:', e.message);
  }
}

async function notifyInventory(io, { type, item, itemId, itemName, unit, branchId, restaurantId, status, qty, threshold, reason, notes }) {
  const createdAt = new Date();
  const title = type === 'wastage' ? 'Wastage recorded' : type === 'status' ? `Stock status: ${status}` : 'Inventory alert';
  const message = type === 'wastage'
    ? `${itemName || 'Item'} wastage: ${Math.abs(qty)} ${unit || ''} (${reason || 'wastage'})`
    : `${itemName || 'Item'} is ${status}`;
  const severity = type === 'wastage' ? (Math.abs(qty) >= Number(process.env.WASTAGE_ALERT_MIN_QTY || 5) ? 'critical' : 'info') : severityFromStatus(status);

  const payload = {
    type,
    title,
    message,
    severity,
    itemId: itemId || (item && item._id),
    itemName: itemName || (item && item.name),
    unit: unit || (item && item.unit),
    branchId: branchId || (item && item.branchId),
    restaurantId: restaurantId || (item && item.restaurantId),
    status,
    qty,
    threshold: threshold || (item && item.lowThreshold),
    reason,
    notes,
    createdAt,
  };

  emitSocket(io, payload);

  // Optional hooks
  const emailSubject = `[Inventory] ${payload.title}`;
  const emailText = `${payload.message} | Item: ${payload.itemName} | Status: ${payload.status || '-'} | Qty: ${payload.qty || '-'} | ${createdAt.toISOString()}`;
  await sendEmail(emailSubject, emailText);

  if (payload.severity === 'critical') {
    await sendSMS(`${payload.title}: ${payload.itemName} (${payload.status || payload.reason || ''})`);
  }
}

module.exports = { notifyInventory };
