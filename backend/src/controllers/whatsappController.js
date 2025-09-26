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
const SHORTLINK_TTL_MINUTES = parseInt(process.env.SHORTLINK_TTL_MINUTES || '60', 10);
const SHORTLINK_ONE_TIME = /^(1|true|yes)$/i.test(process.env.SHORTLINK_ONE_TIME || 'false');

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

function isExpired(entry) {
  if (!entry?.createdAt) return true;
  const ageMs = Date.now() - entry.createdAt;
  return ageMs > SHORTLINK_TTL_MINUTES * 60 * 1000;
}

// Redirect handler for short codes -> customer portal long link
exports.redirectShortLink = async (req, res) => {
  try {
    const { code } = req.params;
    const entry = shortLinkStore.get(code);
    if (!entry) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Not Found - OrderEase</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px 30px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
              width: 100%;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
              color: #ff6b6b;
            }
            h1 {
              color: #333;
              margin-bottom: 15px;
              font-size: 24px;
              font-weight: 600;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 15px;
              font-size: 16px;
            }
            .instructions {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #28a745;
            }
            .instructions h3 {
              color: #28a745;
              margin-bottom: 12px;
              font-size: 18px;
            }
            .steps {
              text-align: left;
              color: #555;
            }
            .steps li {
              margin: 8px 0;
              padding-left: 10px;
            }
            .brand {
              color: #667eea;
              font-weight: bold;
            }
            .footer {
              margin-top: 25px;
              font-size: 14px;
              color: #999;
            }
            @media (max-width: 480px) {
              .container { padding: 30px 20px; }
              h1 { font-size: 20px; }
              .icon { font-size: 48px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🔗❌</div>
            <h1>Link Not Found</h1>
            <p>The link you're trying to access doesn't exist or may have been mistyped.</p>
            
            <div class="instructions">
              <h3>🎯 Get Your Ordering Link</h3>
              <div class="steps">
                <strong>Option 1: Scan QR Code Again</strong>
                <ul>
                  <li>📱 Find the QR code on your table</li>
                  <li>🔍 Scan it with your phone camera</li>
                  <li>📲 Follow the WhatsApp prompt</li>
                </ul>
                <br>
                <strong>Option 2: WhatsApp Message</strong>
                <ul>
                  <li>💬 Send "Order Now" to the restaurant's WhatsApp</li>
                  <li>📋 Include your table code (e.g., "T: T4722")</li>
                  <li>⚡ Get an instant ordering link</li>
                </ul>
              </div>
            </div>
            
            <p>Need help? Look for a staff member or check the QR code on your table for WhatsApp details.</p>
            
            <div class="footer">
              Powered by <span class="brand">OrderEase</span> 🍽️
            </div>
          </div>
        </body>
        </html>
      `);
    }
    if (isExpired(entry)) {
      shortLinkStore.delete(code);
      return res.status(410).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link Expired - OrderEase</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              background: white;
              padding: 40px 30px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
              width: 100%;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
              color: #ffc107;
            }
            h1 {
              color: #333;
              margin-bottom: 15px;
              font-size: 24px;
              font-weight: 600;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin-bottom: 15px;
              font-size: 16px;
            }
            .instructions {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
              border-left: 4px solid #28a745;
            }
            .instructions h3 {
              color: #28a745;
              margin-bottom: 12px;
              font-size: 18px;
            }
            .steps {
              text-align: left;
              color: #555;
            }
            .steps li {
              margin: 8px 0;
              padding-left: 10px;
            }
            .highlight {
              background: #fff3cd;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              border-left: 4px solid #ffc107;
            }
            .brand {
              color: #667eea;
              font-weight: bold;
            }
            .footer {
              margin-top: 25px;
              font-size: 14px;
              color: #999;
            }
            @media (max-width: 480px) {
              .container { padding: 30px 20px; }
              h1 { font-size: 20px; }
              .icon { font-size: 48px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⏰</div>
            <h1>Link Expired</h1>
            <p>This ordering link has expired for security reasons. Don't worry - getting a new one is quick and easy!</p>
            
            <div class="highlight">
              <strong>⚡ Links expire after ${SHORTLINK_TTL_MINUTES} minutes</strong><br>
              This keeps your orders secure and ensures you get the latest menu.
            </div>
            
            <div class="instructions">
              <h3>🚀 Get a Fresh Link</h3>
              <div class="steps">
                <strong>Quick Options:</strong>
                <ul>
                  <li>📱 <strong>Scan the QR code</strong> on your table again</li>
                  <li>💬 <strong>Send "Order Now"</strong> to the restaurant's WhatsApp</li>
                  <li>📋 <strong>Include your table code</strong> (e.g., "T: T4722")</li>
                  <li>⚡ <strong>Get your new link instantly!</strong></li>
                </ul>
              </div>
            </div>
            
            <p><strong>💡 Pro Tip:</strong> Save time by bookmarking the new link once you get it, but remember it will expire in ${SHORTLINK_TTL_MINUTES} minutes.</p>
            
            <div class="footer">
              Powered by <span class="brand">OrderEase</span> 🍽️
            </div>
          </div>
        </body>
        </html>
      `);
    }
    const { token, restaurantId, branchId, tableId } = entry;
    const longUrl = buildPortalLink(token, { restaurantId, branchId, tableId });
    if (SHORTLINK_ONE_TIME) {
      shortLinkStore.delete(code);
    }
    return res.redirect(302, longUrl);
  } catch (e) {
    console.error('[WhatsApp] Redirect error:', e);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Error - OrderEase</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            padding: 40px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
            color: #dc3545;
          }
          h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 24px;
            font-weight: 600;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .instructions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #28a745;
          }
          .instructions h3 {
            color: #28a745;
            margin-bottom: 12px;
            font-size: 18px;
          }
          .steps {
            text-align: left;
            color: #555;
          }
          .steps li {
            margin: 8px 0;
            padding-left: 10px;
          }
          .brand {
            color: #667eea;
            font-weight: bold;
          }
          .footer {
            margin-top: 25px;
            font-size: 14px;
            color: #999;
          }
          @media (max-width: 480px) {
            .container { padding: 30px 20px; }
            h1 { font-size: 20px; }
            .icon { font-size: 48px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Service Temporarily Unavailable</h1>
          <p>We're experiencing a temporary issue with this link. Please try getting a new ordering link.</p>
          
          <div class="instructions">
            <h3>🔄 Get a New Link</h3>
            <div class="steps">
              <ul>
                <li>📱 <strong>Scan the QR code</strong> on your table again</li>
                <li>💬 <strong>Send "Order Now"</strong> via WhatsApp</li>
                <li>📋 <strong>Include your table code</strong> (found on table QR)</li>
                <li>🆘 <strong>Ask a staff member</strong> for assistance</li>
              </ul>
            </div>
          </div>
          
          <p>We apologize for the inconvenience and appreciate your patience.</p>
          
          <div class="footer">
            Powered by <span class="brand">OrderEase</span> 🍽️
          </div>
        </div>
      </body>
      </html>
    `);
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
  helpLines.push('• Send the QR text "Order Now" to get your ordering link.');
  helpLines.push('• Include your table code: T: <code> (e.g., T: T4722).');
  helpLines.push('• If the link expires, just send Order Now again.');
      const supportPhone = process.env.SUPPORT_PHONE || '';
      if (supportPhone) helpLines.push(`• Call: ${supportPhone}`);
      const helpMsg = helpLines.join('\n');
      try { await sendWhatsAppText(from, helpMsg); } catch (_) {}
      return res.sendStatus(200);
    }

    // Expected text patterns: "Order Now" or legacy "JOIN" headers
    // Accept variations like T:XYZ and common aliases
    const findVal = (labels) => {
      const re = new RegExp(`(?:${labels})\\s*[:=]\\s*([A-Za-z0-9_-]+)`, 'i');
      const m = text.match(re);
      return m ? m[1] : null;
    };
    // If user sent Order Now without a code, prompt for T: <code>
    if (/^order\s*now$/i.test(text)) {
      const promptLines = [];
      const brand = process.env.BRAND_NAME || 'DynLeaf';
      promptLines.push(`*${brand}*`);
      promptLines.push('Please reply with your table code:');
      promptLines.push('T: <code>  (e.g., T: T4722)');
      const promptMsg = promptLines.join('\n');
      try { await sendWhatsAppText(from, promptMsg); } catch (_) {}
      return res.sendStatus(200);
    }
    let tableId = findVal('T|TABLE|TABLEID');
    let branchId = findVal('B|BRANCH|BRANCHID');
    let restaurantId = findVal('R|REST|RESTAURANT|RESTAURANTID');
    console.log('[WhatsApp webhook][POST] parsed ids:', { tableId, branchId, restaurantId });

    // If only a human table code is provided (common for customer-friendly QR), look up table
    if (tableId && !mongoose.Types.ObjectId.isValid(tableId)) {
      try {
        // Try scoped by branch if provided; otherwise any branch
        const tFilter = { tableId };
        if (branchId && mongoose.Types.ObjectId.isValid(branchId)) tFilter.branchId = branchId;
        const tDoc = await DiningTable.findOne(tFilter).select('_id branchId restaurantId tableId');
        if (tDoc) {
          if (!branchId) branchId = String(tDoc.branchId);
          if (!restaurantId) restaurantId = String(tDoc.restaurantId);
          // Replace tableId with the actual _id to be consistent downstream
          tableId = String(tDoc._id);
          console.log('[WhatsApp webhook] resolved table code to IDs:', { tableId, branchId, restaurantId });
        }
      } catch (_) {}
    }

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
    ? `${restaurantName} – ${branchName}` // en dash for professional look
    : (restaurantName || branchName || brand);

  // Professional, customer-friendly magic link message
  const mins = SHORTLINK_TTL_MINUTES;
  const lines = [];
  lines.push(`👋 Welcome to *${title}*!`);
  lines.push('');
  lines.push('� Ready to enjoy your favorite meals?');
  lines.push(`👉 Order your meal in just a click: ${shortLink}`);
  lines.push('');
  lines.push('ℹ️ Need help? Just reply *HELP* anytime.');
  lines.push(`⏳ This link is valid for the next ${mins} minutes.`);
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
