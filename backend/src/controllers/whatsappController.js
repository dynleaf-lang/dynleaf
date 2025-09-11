const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const DiningTable = require('../models/DiningTables');
const Restaurant = require('../models/Restaurant');
const Branch = require('../models/Branches');
const { createMagicToken } = require('../utils/tokenUtils');

const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID; // e.g., 1234567890
const WA_VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN; // webhook verification token
const CUSTOMER_PORTAL_BASE_URL = process.env.CUSTOMER_PORTAL_BASE_URL || 'http://localhost:5173';

// In-memory short link store: code -> { token, restaurantId, branchId, tableId, createdAt }
// Note: For production, use Redis with expiry. This keeps existing logic while offering a nicer link.
const shortLinkStore = new Map();

function buildPortalLink(token, { restaurantId, branchId, tableId }) {
  const qp = [`token=${encodeURIComponent(token)}`];
  if (restaurantId) qp.push(`restaurantId=${encodeURIComponent(restaurantId)}`);
  if (branchId) qp.push(`branchId=${encodeURIComponent(branchId)}`);
  if (tableId) qp.push(`tableId=${encodeURIComponent(tableId)}`);
  return `${CUSTOMER_PORTAL_BASE_URL}/?${qp.join('&')}`;
}

function makeShortCode() {
  // 8-10 chars base62-ish code using random bytes; collision chance negligible for dev
  return crypto.randomBytes(6).toString('base64url');
}

function getShortBase(req) {
  // Prefer explicit base; otherwise derive from request host
  const envBase = process.env.LINK_SHORT_BASE || process.env.BACKEND_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.get('host');
  if (host) return `${proto}://${host}`;
  // Last resort: localhost backend
  return 'http://localhost:5001';
}

// Resolve the best available WhatsApp token on demand
function getWhatsAppAccessToken() {
  return process.env.WA_ACCESS_TOKEN || process.env.WA_ACCESS_PERMANENT_TOKEN;
}


async function sendWhatsAppText(to, body) {
  const token = getWhatsAppAccessToken();
  if (!token || !WA_PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] Missing WA credentials (token or phone number ID). Skipping outbound send. Would send to', to, 'text:', body);
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
  const res = await axios.post(url, payload, { headers });
  return res.data;
}

// Redirect handler for short codes -> customer portal long link
exports.redirectShortLink = async (req, res) => {
  try {
    const { code } = req.params;
    const entry = shortLinkStore.get(code);
    if (!entry) {
      return res.status(404).send('Link expired or not found');
    }
    const { token, restaurantId, branchId, tableId } = entry;
    const longUrl = buildPortalLink(token, { restaurantId, branchId, tableId });
    // Optional: 1-time use. Comment out to allow multi-use within expiry window.
    // shortLinkStore.delete(code);
    return res.redirect(302, longUrl);
  } catch (e) {
    return res.status(500).send('Redirect error');
  }
};

// Inspect the configured phone number ID using current token (debug utility)
exports.inspectNumber = async (req, res) => {
  try {
    const token = getWhatsAppAccessToken();
    if (!token || !WA_PHONE_NUMBER_ID) {
      return res.status(400).json({
        ok: false,
        message: 'Missing WA token or WA_PHONE_NUMBER_ID',
        haveToken: Boolean(token),
        phoneNumberId: WA_PHONE_NUMBER_ID || null
      });
    }
    const url = `https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name,quality_rating`;
    const headers = { Authorization: `Bearer ${token}` };
    const { data } = await axios.get(url, { headers });
    return res.json({ ok: true, data });
  } catch (err) {
    const e = err?.response?.data || { message: err.message };
    return res.status(500).json({ ok: false, error: e });
  }
};

// Test send a simple text to a provided WhatsApp number (debug utility)
exports.testSend = async (req, res) => {
  try {
    const to = req.body?.to || req.query?.to;
    if (!to) {
      return res.status(400).json({ ok: false, message: 'Provide ?to= or body { to } in E.164 format' });
    }
    const result = await sendWhatsAppText(to, 'Test message from OrderEase');
    return res.json({ ok: true, result });
  } catch (err) {
    const e = err?.response?.data || { message: err.message };
    return res.status(500).json({ ok: false, error: e });
  }
};

// Generate a magic link for a given table/branch. In production, called from webhook reply.
exports.generateMagicLink = async (req, res) => {
  try {
    const { branchId, tableId, restaurantId, phone, name } = req.body;
    if (!branchId || !restaurantId || !tableId) {
      return res.status(400).json({ message: 'restaurantId, branchId, and tableId are required' });
    }

    // Optional: validate table exists
    try {
      await DiningTable.findOne({ _id: tableId, branchId, restaurantId });
    } catch (_) {}

  const token = createMagicToken({ phone, name, restaurantId, branchId, tableId }, '60m');
  const link = buildPortalLink(token, { restaurantId, branchId, tableId });
  // Create short code and store mapping for quick redirect
  const code = makeShortCode();
  shortLinkStore.set(code, { token, restaurantId, branchId, tableId, createdAt: Date.now() });
  const shortBase = getShortBase(req);
  const shortLink = `${shortBase}/r/${code}`;
  return res.status(200).json({ link, shortLink, token, expiresIn: 3600 });
  } catch (err) {
    console.error('Error generating magic link:', err);
    return res.status(500).json({ message: 'Failed to generate magic link' });
  }
};

// WhatsApp webhook (placeholder). Configure VERIFY_TOKEN and WA creds in env.
exports.webhook = async (req, res) => {
  // GET: webhook verification challenge
  if (req.method === 'GET') {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      console.log('[WhatsApp webhook][GET] mode=%s token_match=%s challenge=%s', mode, token === WA_VERIFY_TOKEN, challenge);
      if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification failed');
    } catch (e) {
      return res.status(500).send('Error');
    }
  }

  // POST: inbound messages
  try {
    const body = req.body || {};
    console.log('[WhatsApp webhook][POST] received at %s', new Date().toISOString());
    try {
      // Avoid huge logs; stringify shallowly
      console.log('[WhatsApp webhook][POST] body:', JSON.stringify({ object: body.object, entry_count: body.entry?.length, sample: body.entry?.[0] && { changes_count: body.entry?.[0]?.changes?.length } }));
    } catch (_) {}
    // Meta sends an array of entries
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const messages = change?.messages;
    const waNumber = change?.metadata?.display_phone_number || 'unknown';

    if (!messages || !messages[0]) {
      console.log('[WhatsApp webhook][POST] no messages array; ack 200');
      return res.sendStatus(200);
    }

    const msg = messages[0];
    const from = msg.from; // WhatsApp user phone in international format
    const text = (msg.text?.body || msg.button?.text || '').trim();
    console.log('[WhatsApp webhook][POST] inbound from=%s text=%s', from, text);

    const brand = process.env.BRAND_NAME || 'DynLeaf';
    // Quick HELP handling
    if (/^help$/i.test(text)) {
      const helpLines = [];
      helpLines.push(`*${brand} Support*`);
      helpLines.push('• Send the QR text "JOIN" to get your ordering link.');
      helpLines.push('• If the link expires, just send JOIN again.');
      const supportPhone = process.env.SUPPORT_PHONE || '';
      if (supportPhone) helpLines.push(`• Call: ${supportPhone}`);
      const helpMsg = helpLines.join('\n');
      try { await sendWhatsAppText(from, helpMsg); } catch (_) {}
      return res.sendStatus(200);
    }

    // Expected text patterns: "JOIN T=<tableId> B=<branchId> R=<restaurantId>"
    // Accept variations like T:XYZ and common aliases
    const findVal = (labels) => {
      const re = new RegExp(`(?:${labels})\\s*[:=]\\s*([A-Za-z0-9_-]+)`, 'i');
      const m = text.match(re);
      return m ? m[1] : null;
    };
    const tableId = findVal('T|TABLE|TABLEID');
    const branchId = findVal('B|BRANCH|BRANCHID');
    const restaurantId = findVal('R|REST|RESTAURANT|RESTAURANTID');
    console.log('[WhatsApp webhook][POST] parsed ids:', { tableId, branchId, restaurantId });

  // Build magic token regardless; you may enforce validations later
  const token = createMagicToken({ phone: from, tableId, branchId, restaurantId }, '60m');
  const longLink = buildPortalLink(token, { restaurantId, branchId, tableId });
  // Short link for customer-friendly message
  const code = makeShortCode();
  shortLinkStore.set(code, { token, restaurantId, branchId, tableId, createdAt: Date.now() });
  const shortBase = getShortBase(req);
  const shortLink = `${shortBase}/r/${code}`;

  // Resolve display names for restaurant/branch to enrich greeting
  let restaurantName = null;
  let branchName = null;
  try {
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      const r = await Restaurant.findById(restaurantId).select('name restaurantName displayName');
      restaurantName = r?.name || r?.restaurantName || r?.displayName || null;
    }
  } catch (_) {}
  try {
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      const b = await Branch.findById(branchId).select('name branchName displayName');
      branchName = b?.name || b?.branchName || b?.displayName || null;
    }
  } catch (_) {}

  const title = (restaurantName && branchName)
    ? `${restaurantName} - ${branchName}`
    : (restaurantName || branchName || brand);

  // Professional, short template (keeps logic intact). Avoid exposing internal IDs.
  const lines = [];
  lines.push(`*Welcome to ${title}* 🍽️`);
  lines.push(`Order now: ${shortLink}`);
  lines.push('Reply HELP for assistance');
  lines.push('Link valid for 60 min');
  const message = lines.join('\n');
    try {
      const sendRes = await sendWhatsAppText(from, message);
      if (sendRes?.skipped) {
        console.warn('[WhatsApp webhook] WA credentials missing; replied skipped. Set WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID to enable outbound replies.');
      } else {
        console.log('[WhatsApp webhook] reply sent to %s', from);
      }
    } catch (sendErr) {
      console.error('[WhatsApp webhook] send error:', sendErr?.response?.data || sendErr.message);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('[WhatsApp webhook] Error:', err?.response?.data || err.message);
    return res.sendStatus(200); // Always 200 to avoid webhook retries storms during dev
  }
};
