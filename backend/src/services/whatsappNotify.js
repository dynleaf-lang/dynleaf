const axios = require('axios');
const mongoose = require('mongoose');
const Branch = require('../models/Branches');

// Env helpers
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID; // e.g., 1234567890
const BRAND_NAME = process.env.BRAND_NAME || 'DynLeaf';
const CUSTOMER_PORTAL_BASE_URL = process.env.CUSTOMER_PORTAL_BASE_URL || 'http://localhost:5173';

function truthyEnv(val, def = false) {
  if (val === undefined) return def;
  return /^(1|true|yes|on)$/i.test(String(val).trim());
}
async function isBranchWhatsAppEnabled(branchId) {
  try {
    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) return false;
    const b = await Branch.findById(branchId).select('settings.whatsappUpdatesEnabled').lean();
    return Boolean(b?.settings?.whatsappUpdatesEnabled);
  } catch (_) {
    return false;
  }
}


function getWhatsAppAccessToken() {
  return process.env.WA_ACCESS_TOKEN || process.env.WA_ACCESS_PERMANENT_TOKEN || '';
}

async function sendWhatsAppText(to, body) {
  const token = getWhatsAppAccessToken();
  if (!token || !WA_PHONE_NUMBER_ID) {
    console.warn('[WhatsAppNotify] Missing WA credentials; skipping send. to=%s body=%s', to, body);
    return { skipped: true };
  }
  const url = `https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const { data } = await axios.post(url, payload, { headers });
  return data;
}

function formatStatus(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'confirmed': return 'Confirmed';
    case 'preparing': return 'Being prepared';
    case 'ready': return 'Ready';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status || 'Updated';
  }
}

function getOrderPhone(order) {
  // Prefer explicit customerPhone; fallback to populated customerId.phone if present
  const phone = order?.customerPhone || order?.customerId?.phone || '';
  return typeof phone === 'string' ? phone.trim() : '';
}

function buildStatusMessage(order, prevStatus) {
  const restName = order?.restaurantId?.name || order?.restaurantName || '';
  const branchName = order?.branchId?.name || order?.branchName || '';
  const title = [restName, branchName].filter(Boolean).join(' - ') || BRAND_NAME;
  const code = order?.orderId || String(order?._id || '').slice(-6);
  const newStatus = formatStatus(order?.status);
  const oldStatus = formatStatus(prevStatus);
  const lines = [];
  lines.push(`*${title}*`);
  // Professional, customer-friendly copy per status
  if (order?.status === 'confirmed') {
    lines.push(`👍 Great news! Your order ${code} has been confirmed.`);
    lines.push(`We’ll start preparing your meal right away. 🍴`);
  } else if (order?.status === 'preparing') {
    lines.push(`👨‍🍳 Your order ${code} is now being prepared by our chefs.`);
    lines.push(`It’ll be ready to serve soon. ⏳`);
  } else if (order?.status === 'ready') {
    lines.push(`🔥 Your order ${code} is ready!`);
    lines.push(`You can now pick it up at the counter or wait to be served at your table. 🍽️`);
  } else if (order?.status === 'delivered') {
    lines.push(`🥳 Your order ${code} has been delivered.`);
    lines.push(`Enjoy your delicious meal, and thank you for dining with ${title}! 💚`);
    lines.push(`We’d love to hear your feedback after your meal. 🙏`);
  } else if (order?.status === 'cancelled') {
    lines.push(`This order has been cancelled.`);
  } else {
    // Fallback status update format (keeps old->new context if we don't have a tailored message)
    lines.push(`Order ${code}: ${oldStatus} → ${newStatus}`);
  }
  // Provide a generic portal link (no token) so the customer knows where to check
  if (CUSTOMER_PORTAL_BASE_URL) {
    lines.push(`Track your order here: ${CUSTOMER_PORTAL_BASE_URL}`);
  }
  return lines.join('\n');
}

// Public API: notify via WhatsApp about an order status change. Non-throwing.
async function notifyOrderStatusWhatsApp(order, { prevStatus } = {}) {
  try {
    // Feature flag
    if (!truthyEnv(process.env.WHATSAPP_UPDATES_ENABLED, false)) {
      return { skipped: true, reason: 'disabled' };
    }
    // Per-order opt-out
    if (order && order.notifyWhatsApp === false) {
      return { skipped: true, reason: 'order_opt_out' };
    }
    // Branch setting
    const branchEnabled = await isBranchWhatsAppEnabled(order?.branchId);
    if (!branchEnabled) {
      return { skipped: true, reason: 'branch_disabled' };
    }
    const to = getOrderPhone(order);
    if (!to) {
      return { skipped: true, reason: 'no_phone' };
    }
    const body = buildStatusMessage(order, prevStatus);
    const result = await sendWhatsAppText(to, body);
    return { ok: true, result };
  } catch (err) {
    console.warn('[WhatsAppNotify] Failed to send status message:', err?.response?.data || err?.message);
    return { ok: false, error: err?.message };
  }
}

module.exports = {
  notifyOrderStatusWhatsApp,
  // Send an initial confirmation when an order is placed
  async notifyOrderPlacedWhatsApp(order) {
    try {
      if (!truthyEnv(process.env.WHATSAPP_UPDATES_ENABLED, false)) {
        return { skipped: true, reason: 'disabled' };
      }
      if (order && order.notifyWhatsApp === false) {
        return { skipped: true, reason: 'order_opt_out' };
      }
      const branchEnabled = await isBranchWhatsAppEnabled(order?.branchId);
      if (!branchEnabled) {
        return { skipped: true, reason: 'branch_disabled' };
      }
      const to = getOrderPhone(order);
      if (!to) {
        return { skipped: true, reason: 'no_phone' };
      }
      const restName = order?.restaurantId?.name || order?.restaurantName || '';
      const branchName = order?.branchId?.name || order?.branchName || '';
      const title = [restName, branchName].filter(Boolean).join(' - ') || BRAND_NAME;
      const code = order?.orderId || String(order?._id || '').slice(-6);
      const lines = [];
      lines.push(`*${title}*`);
      lines.push(`✅ Your order ${code} has been placed successfully!`);
      lines.push(`Our team will review it shortly and get it confirmed. 🎉`);
      if (CUSTOMER_PORTAL_BASE_URL) {
        lines.push(`Track your order here: ${CUSTOMER_PORTAL_BASE_URL}`);
      }
      const body = lines.join('\n');
      const result = await sendWhatsAppText(to, body);
      return { ok: true, result };
    } catch (err) {
      console.warn('[WhatsAppNotify] Failed to send placed message:', err?.response?.data || err?.message);
      return { ok: false, error: err?.message };
    }
  }
};
