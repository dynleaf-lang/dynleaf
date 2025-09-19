/**
 * Thermal Printer Receipt Generation Utility
 * Supports ESC/POS commands for thermal printers
 */

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

// Text formatting commands
const COMMANDS = {
  // Initialize printer
  INIT: ESC + '@',
  
  // Text alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Text size and style
  NORMAL: ESC + '!' + '\x00',
  DOUBLE_HEIGHT: ESC + '!' + '\x10',
  DOUBLE_WIDTH: ESC + '!' + '\x20',
  DOUBLE_SIZE: ESC + '!' + '\x30',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  
  // Line feeds
  LF: '\x0A',
  CR: '\x0D',
  CRLF: '\x0D\x0A',
  
  // Cut paper
  CUT_FULL: GS + 'V' + '\x00',
  CUT_PARTIAL: GS + 'V' + '\x01',
  
  // Drawer kick
  DRAWER_KICK: ESC + 'p' + '\x00' + '\x19' + '\xFA'
};

// Ensure logo URLs render in print windows (about:blank) by resolving relative paths
function normalizeLogoUrl(u) {
  try {
    if (!u) return '';
    const s = String(u);
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (typeof window !== 'undefined' && window.location) {
      try {
        return new URL(s, window.location.href).href;
      } catch {
        if (s.startsWith('/')) return window.location.origin + s;
      }
    }
    return s;
  } catch {
    return u;
  }
}

// Resolve GSTIN from restaurantInfo or its gstRegistrations by branch state
function resolveGSTIN(order, restaurantInfo) {
  try {
    if (!restaurantInfo) return '';
    // Collect possible keys from restaurantInfo
    const keys = ['gst', 'gstin', 'gstNumber', 'GSTIN', 'GSTNo', 'gst_no', 'gst_no'];
    let explicit = '';
    for (const k of keys) {
      if (restaurantInfo[k]) { explicit = String(restaurantInfo[k]); break; }
    }
    if (explicit) return String(explicit);
    const regs = Array.isArray(restaurantInfo.gstRegistrations) ? restaurantInfo.gstRegistrations : [];
    if (!regs.length) return '';
    const branchState = order?.branch?.state || order?.branchState || restaurantInfo.state;
    let match = null;
    if (branchState) {
      match = regs.find(r => r && r.state === branchState && (r.active === undefined || r.active === true));
    }
    if (!match) match = regs.find(r => r && r.gstin && (r.active === undefined || r.active === true));
    return match?.gstin ? String(match.gstin) : '';
  } catch { return ''; }
}

// Resolve FSSAI from restaurantInfo or branch (order)
function resolveFSSAI(order, restaurantInfo) {
  try {
    const candidates = [
      restaurantInfo?.fssai,
      restaurantInfo?.fssaiLicense,
      restaurantInfo?.fssaiNo,
      order?.branch?.fssaiLicense,
      order?.branch?.fssai,
      order?.branchFssai
    ];
    const val = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    return val ? String(val) : '';
  } catch { return ''; }
}

/**
 * Generate thermal printer receipt content
 */
export const generateThermalReceipt = (orderData, restaurantInfo, receiptSettings = {}) => {
  const {
    order,
    paymentDetails,
    customerInfo,
    tableInfo
  } = orderData; 
  

  const {
    name: baseName = 'Restaurant Name',
    brandName,
    logo,
    address = 'Restaurant Address',
    phone = 'Phone Number',
    email = 'Email Address'
  } = restaurantInfo || {};
  const restaurantName = brandName || baseName;
  const gstResolved = resolveGSTIN(order, restaurantInfo || {});
  const fssaiResolved = resolveFSSAI(order, restaurantInfo || {});

  // Merge explicit receiptSettings with persisted printer config (fallback)
  const persistedCfg = (() => { try { return JSON.parse(localStorage.getItem('pos_printer_config') || '{}'); } catch { return {}; } })();
  const showLogo = receiptSettings.showLogo ?? false;
  const showQRCode = receiptSettings.showQRCode ?? (persistedCfg.showQRCode !== false);
  const showFooterMessage = receiptSettings.showFooterMessage ?? (persistedCfg.showFooterMessage !== false);
  const duplicateReceipt = receiptSettings.duplicateReceipt ?? false;
  // Payment QR settings (from PrinterSettings)
  const paymentUPIVPA = receiptSettings.paymentUPIVPA ?? persistedCfg.paymentUPIVPA ?? '';
  const paymentUPIName = receiptSettings.paymentUPIName ?? persistedCfg.paymentUPIName ?? '';

  let receipt = '';

  // Initialize printer
  receipt += COMMANDS.INIT;

  // Header
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += COMMANDS.DOUBLE_SIZE;
  receipt += COMMANDS.BOLD_ON;
  receipt += restaurantName + COMMANDS.CRLF;
  receipt += COMMANDS.NORMAL;
  receipt += COMMANDS.BOLD_OFF;
  
  if (duplicateReceipt) {
    receipt += COMMANDS.BOLD_ON;
    receipt += '*** DUPLICATE RECEIPT ***' + COMMANDS.CRLF;
    receipt += COMMANDS.BOLD_OFF;
  }
  
  receipt += COMMANDS.CRLF;
  receipt += address + COMMANDS.CRLF;
  receipt += 'Phone: ' + phone + COMMANDS.CRLF;
  if (email) receipt += 'Email: ' + email + COMMANDS.CRLF;
  if (gstResolved) receipt += 'GSTIN: ' + gstResolved + COMMANDS.CRLF;
  if (fssaiResolved) receipt += 'FSSAI: ' + fssaiResolved + COMMANDS.CRLF;
  
  // Separator line
  receipt += COMMANDS.CRLF;
  receipt += '================================' + COMMANDS.CRLF;
  
  // Order details
  receipt += COMMANDS.ALIGN_LEFT;
  receipt += COMMANDS.BOLD_ON;
  receipt += 'ORDER DETAILS' + COMMANDS.CRLF;
  receipt += COMMANDS.BOLD_OFF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  receipt += `Order #: ${order.orderNumber}` + COMMANDS.CRLF;
  receipt += `Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}` + COMMANDS.CRLF;
  receipt += `Time: ${new Date(order.createdAt).toLocaleTimeString('en-IN')}` + COMMANDS.CRLF;
  receipt += `Table: ${tableInfo?.name || 'N/A'}` + COMMANDS.CRLF;
  receipt += `Customer: ${customerInfo?.name || 'Walk-in Customer'}` + COMMANDS.CRLF;
  if (customerInfo?.phone) {
    receipt += `Phone: ${customerInfo.phone}` + COMMANDS.CRLF;
  }
  receipt += `Order Type: ${customerInfo?.orderType || 'Dine-in'}` + COMMANDS.CRLF;
  // Professional token and cashier rendering
  try {
    const tokenNo = resolveTokenNo(order);
    const cashierName = resolveCashierName(order);
    if (tokenNo) receipt += `Token No.: ${tokenNo}` + COMMANDS.CRLF;
    if (cashierName) receipt += `Cashier: ${cashierName}` + COMMANDS.CRLF;
  } catch {}
  
  receipt += COMMANDS.CRLF;
  receipt += '================================' + COMMANDS.CRLF;
  
  // Items
  receipt += COMMANDS.BOLD_ON;
  receipt += 'ITEMS' + COMMANDS.CRLF;
  receipt += COMMANDS.BOLD_OFF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  // Item header: add Rate column and adjust widths to fit 32 chars
  // Layout: Item(14) Qty(3) Rate(6) Amount(9) => 32 columns
  receipt += padString('Item', 14) + padString('Qty', 3) + padString('Rate', 6) + padString('Amount', 9) + COMMANDS.CRLF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  let subtotal = 0;
  order.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
  // Item name (truncate if too long)
  const cust = item.customizations || {};
  const inline = formatInlineParenthetical(cust);
  const baseName = toTitleCase(item.name) + (inline ? ` (${inline})` : '');
  const itemName = baseName.length > 14 ? baseName.substring(0, 14) : baseName;
  receipt += padString(itemName, 14);
  receipt += padString(item.quantity.toString(), 3);
  receipt += padString(formatCurrency(item.price), 6);
  receipt += padString(formatCurrency(itemTotal), 9) + COMMANDS.CRLF;
    
    // If name was truncated and there is inline text, show it on next line for clarity
    try {
      if (inline && (item.name.length + 2 + inline.length) > 14) {
        receipt += `  (${inline})` + COMMANDS.CRLF;
      }
    } catch {}
  });
  
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  // Totals
  receipt += padString('Subtotal:', 20) + padString(formatCurrency(order.subtotal || subtotal), 12) + COMMANDS.CRLF;
  
  if (order.tax && order.tax > 0) {
    receipt += padString('Tax:', 20) + padString(formatCurrency(order.tax), 12) + COMMANDS.CRLF;
  }
  
  if (order.discount && order.discount > 0) {
    receipt += padString('Discount:', 20) + padString('-' + formatCurrency(order.discount), 12) + COMMANDS.CRLF;
  }
  
  receipt += '================================' + COMMANDS.CRLF;
  receipt += COMMANDS.DOUBLE_HEIGHT;
  receipt += COMMANDS.BOLD_ON;
  receipt += padString('TOTAL:', 20) + padString(formatCurrencyWithSymbol(order.totalAmount), 12) + COMMANDS.CRLF;
  receipt += COMMANDS.NORMAL;
  receipt += COMMANDS.BOLD_OFF;
  receipt += '================================' + COMMANDS.CRLF;
  
  // Payment details
  receipt += COMMANDS.CRLF;
  receipt += COMMANDS.BOLD_ON;
  receipt += 'PAYMENT DETAILS' + COMMANDS.CRLF;
  receipt += COMMANDS.BOLD_OFF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  const safeMethod = String((paymentDetails && paymentDetails.method) || 'cash').toUpperCase();
  const safePayStatus = String((order && order.paymentStatus) || 'unpaid').toUpperCase();
  receipt += `Method: ${safeMethod}` + COMMANDS.CRLF;
  receipt += `Status: ${safePayStatus}` + COMMANDS.CRLF;
  
  if (paymentDetails.method === 'cash') {
    receipt += `Amount Received: ${formatCurrency(paymentDetails.amountReceived)}` + COMMANDS.CRLF;
    if (paymentDetails.change > 0) {
      receipt += `Change: ${formatCurrency(paymentDetails.change)}` + COMMANDS.CRLF;
    }
  } else if (paymentDetails.method === 'card' && paymentDetails.cardNumber) {
    receipt += `Card: ****${paymentDetails.cardNumber.slice(-4)}` + COMMANDS.CRLF;
    if (paymentDetails.cardHolder) {
      receipt += `Holder: ${paymentDetails.cardHolder}` + COMMANDS.CRLF;
    }
  } else if (paymentDetails.method === 'upi' && paymentDetails.upiId) {
    receipt += `UPI ID: ${paymentDetails.upiId}` + COMMANDS.CRLF;
    if (paymentDetails.transactionId) {
      receipt += `Transaction: ${paymentDetails.transactionId}` + COMMANDS.CRLF;
    }
  }
  
  // Special instructions
  if (order.specialInstructions) {
    receipt += COMMANDS.CRLF;
    receipt += COMMANDS.BOLD_ON;
    receipt += 'SPECIAL INSTRUCTIONS' + COMMANDS.CRLF;
    receipt += COMMANDS.BOLD_OFF;
    receipt += '--------------------------------' + COMMANDS.CRLF;
    receipt += order.specialInstructions + COMMANDS.CRLF;
  }
  
  // Footer
  receipt += COMMANDS.CRLF;
  receipt += COMMANDS.ALIGN_CENTER;
  
  if (showFooterMessage) {
    receipt += 'Thank you for dining with us!' + COMMANDS.CRLF;
    receipt += 'Please visit again!' + COMMANDS.CRLF;
    receipt += COMMANDS.CRLF;
  }
  
  // QR Code (payment intent note for thermal-text; ESC/POS QR not implemented)
  if (showQRCode) {
    if (paymentUPIVPA) {
      try {
        const amount = Number(order.totalAmount) || 0;
        const upiUrl = buildUPIIntent({
          vpa: paymentUPIVPA,
          name: paymentUPIName || restaurantName,
          amount,
          orderNumber: order.orderNumber,
          orderId: order._id,
        });
        receipt += '--- QR CODE FOR PAYMENT ---' + COMMANDS.CRLF;
        receipt += `Pay to: ${paymentUPIVPA}` + COMMANDS.CRLF;
        receipt += `Amount: ${formatCurrencyWithSymbol(amount)} (or more)` + COMMANDS.CRLF;
        // Show the UPI URI text so staff can assist if QR fails
        receipt += upiUrl + COMMANDS.CRLF;
        receipt += COMMANDS.CRLF;
      } catch {
        receipt += '--- QR CODE FOR PAYMENT ---' + COMMANDS.CRLF;
        receipt += COMMANDS.CRLF;
      }
    } else {
      receipt += '--- QR CODE ---' + COMMANDS.CRLF;
      receipt += COMMANDS.CRLF;
    }
  }
  
  receipt += `Printed: ${new Date().toLocaleString('en-IN')}` + COMMANDS.CRLF;
  receipt += 'Powered by OrderEase POS' + COMMANDS.CRLF;
  
  // Cut paper
  receipt += COMMANDS.CRLF;
  receipt += COMMANDS.CRLF;
  receipt += COMMANDS.CUT_PARTIAL;
  
  return receipt;
};

/**
 * Generate a Kitchen Order Ticket (KOT) in ESC/POS format (thermal)
 * Focused layout: Header (KOT), table / token, items with qty + name + variants, special instructions.
 * Avoid pricing to keep kitchen slip clean. Optional duplicate for expeditor.
 */
export const generateThermalKOT = (kotData, restaurantInfo = {}, settings = {}) => {
  const { order, items = [], tableInfo, customerInfo, batchNumber } = kotData || {};
  const {
    name: baseName = 'Restaurant',
    brandName
  } = restaurantInfo || {};
  const restaurantName = brandName || baseName;
  const duplicate = settings.duplicate ?? false;
  let out = '';
  out += COMMANDS.INIT;
  out += COMMANDS.ALIGN_CENTER + COMMANDS.BOLD_ON + COMMANDS.DOUBLE_WIDTH;
  out += 'KOT' + COMMANDS.CRLF;
  out += COMMANDS.NORMAL + COMMANDS.BOLD_OFF;
  out += COMMANDS.ALIGN_CENTER + restaurantName + COMMANDS.CRLF;
  if (duplicate) {
    out += COMMANDS.BOLD_ON + 'DUPLICATE' + COMMANDS.CRLF + COMMANDS.BOLD_OFF;
  }
  out += COMMANDS.ALIGN_LEFT;
  const orderNo = order?.orderNumber || order?._id || '';
  const token = resolveTokenNo(order);
  const tableName = tableInfo?.TableName || tableInfo?.name || order?.tableName || ''; 
  if (tableName) out += 'Table : ' + tableName + COMMANDS.CRLF;
  if (token) out += 'Token : ' + token + COMMANDS.CRLF;
  if (orderNo) out += 'Order : ' + orderNo + COMMANDS.CRLF;
  if (batchNumber) out += 'Batch : ' + batchNumber + COMMANDS.CRLF;
  if (customerInfo?.name) out += 'Cust  : ' + customerInfo.name + COMMANDS.CRLF;
  if (customerInfo?.phone) out += 'Phone : ' + customerInfo.phone + COMMANDS.CRLF;
  out += 'Time  : ' + (new Date()).toLocaleTimeString() + COMMANDS.CRLF;
  out += COMMANDS.CRLF;
  // Column header similar to reference: Sl.No | Item Name | Qty.
  const pad = (txt, len, align='left') => {
    const s = (txt===''||txt===undefined||txt===null)?'':String(txt);
    if (s.length >= len) return s.slice(0,len);
    const spaces = ' '.repeat(len - s.length);
    return align==='right'? spaces + s : s + spaces;
  };
  out += '--------------------------------' + COMMANDS.CRLF;
  out += pad('Sl',3) + pad('Item Name',24) + pad('Qty',5) + COMMANDS.CRLF;
  out += '--------------------------------' + COMMANDS.CRLF;
  let serial = 1; let totalItems = 0;
  items.forEach((it) => {
    const qty = Number(it.quantity)||0; if(!qty) return;
    const name = (it.name||'Item').toString();
    const parenthetical = formatInlineParenthetical(it.customizations||it.customization||{});
    const baseLine = pad(serial,3) + pad(name,24) + pad(qty,5,'right');
    out += baseLine + COMMANDS.CRLF; serial++; totalItems += qty;
    if (parenthetical) out += '    (' + parenthetical + ')' + COMMANDS.CRLF;
    if (it.specialInstructions) out += '    * ' + it.specialInstructions + COMMANDS.CRLF;
  });
  out += '--------------------------------' + COMMANDS.CRLF;
  out += COMMANDS.BOLD_ON + 'Total Items : ' + totalItems + COMMANDS.BOLD_OFF + COMMANDS.CRLF;
  if (customerInfo?.specialInstructions) {
    out += COMMANDS.CRLF + COMMANDS.BOLD_ON + COMMANDS.DOUBLE_HEIGHT + 'INSTRUCTIONS:' + COMMANDS.CRLF;
    // Split long instructions into 32-char lines
    const notes = customerInfo.specialInstructions.replace(/\r/g,'');
    notes.split(/\n+/).forEach(line => {
      line.match(/.{1,32}/g)?.forEach(seg => { out += seg + COMMANDS.CRLF; });
    });
    out += COMMANDS.NORMAL + COMMANDS.BOLD_OFF;
  }
  out += COMMANDS.CRLF + '--- END KOT ---' + COMMANDS.CRLF;
  out += COMMANDS.CUT_PARTIAL;
  return out;
};

/**
 * Generate HTML based KOT (browser print fallback) with professional minimal styling for kitchen.
 */
export const generateHTMLKOT = (kotData, restaurantInfo = {}, settings = {}) => {
  const { order, items = [], tableInfo, customerInfo, batchNumber } = kotData || {};
  const { name: baseName = 'Restaurant', brandName } = restaurantInfo || {};
  const restaurantName = brandName || baseName;
  const duplicate = settings.duplicate ?? false;
  const orderNo = order?.orderNumber || order?._id || '';
  const token = resolveTokenNo(order);
  const tableName = tableInfo?.TableName || tableInfo?.name || order?.tableName || '';
  const time = new Date().toLocaleString();
  let serial = 1; let totalItems = 0;
  const rows = items.filter(it=>Number(it.quantity)>0).map(it => {
    const qty = Number(it.quantity)||0; totalItems += qty;
    const parenthetical = formatInlineParenthetical(it.customizations||it.customization||{});
    const extra = parenthetical ? `<div class="variant">(${parenthetical})</div>` : '';
    const note = it.specialInstructions ? `<div class="note">* ${it.specialInstructions}</div>` : '';
    return `<tr><td class="sl">${serial++}</td><td class="nm">${(it.name||'')}${extra}${note}</td><td class="qt">${qty}</td></tr>`;
  }).join('');
  const orderNotes = customerInfo?.specialInstructions ? `<div class="big-notes"><div class="lbl">INSTRUCTIONS:</div><div>${customerInfo.specialInstructions.replace(/\n/g,'<br/>')}</div></div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>KOT ${orderNo}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:8px;width:270px;font-size:12px;}
    h1{font-size:20px;margin:0 0 4px;text-align:center;letter-spacing:1px;}
    .duplicate{font-size:12px;text-align:center;color:#c00;font-weight:700;margin-bottom:4px;}
    .meta{font-size:12px;margin-bottom:6px;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:4px 0;}
    .meta div{margin:2px 0;}
    table{width:100%;border-collapse:collapse;margin-top:4px;}
    th,td{padding:2px 0;font-size:12px;text-align:left;vertical-align:top;}
    th.qt,td.qt{text-align:center;width:32px;}
    th.sl,td.sl{text-align:center;width:28px;}
    .nm{font-weight:600;}
    .variant{font-size:11px;font-weight:400;color:#333;margin-left:4px;}
    .note{font-size:11px;color:#c00;margin-left:4px;}
    .tot{border-top:1px dashed #000;margin-top:4px;padding-top:4px;font-weight:700;}
    .big-notes{margin-top:8px;border-top:1px dashed #000;padding-top:6px;font-size:14px;font-weight:700;}
    .big-notes .lbl{margin-bottom:4px;}
    .footer{text-align:center;margin-top:10px;font-size:11px;}
    @media print{.no-print{display:none}}
  </style></head><body>
  <h1>KOT</h1>
  <div style="text-align:center;font-weight:700;margin-bottom:6px">${restaurantName}</div>
  ${duplicate?'<div class="duplicate">DUPLICATE</div>':''}
  <div class="meta">
    ${tableName?`<div>Table: <strong>${tableName}</strong></div>`:''}
    ${token?`<div>Token: <strong>${token}</strong></div>`:''}
    ${orderNo?`<div>Order: <strong>${orderNo}</strong></div>`:''}
    ${batchNumber?`<div>Batch: <strong>${batchNumber}</strong></div>`:''}
    <div>Time: ${time}</div>
    ${customerInfo?.name?`<div>Customer: ${customerInfo.name}</div>`:''}
  </div>
  <table class="items"><thead><tr><th class="sl">Sl.No</th><th>Item Name</th><th class="qt">Qty</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">Total Items : ${totalItems}</div>
  ${orderNotes}
  <div class="footer">--- END KOT ---</div>
  <script>window.print();setTimeout(()=>window.close(),100);</script>
  </body></html>`;
};

/**
 * Generate HTML receipt for preview/browser printing
 */
export const generateHTMLReceipt = (orderData, restaurantInfo, receiptSettings = {}) => {
  const {
    order,
    paymentDetails,
    customerInfo,
    tableInfo
  } = orderData;

  const {
    name: baseName = 'Restaurant Name',
    brandName,
    logo,
    address = 'Restaurant Address',
    phone = 'Phone Number',
    email = 'Email Address'
  } = restaurantInfo || {};
  const restaurantName = brandName || baseName;
  const gstResolved = resolveGSTIN(order, restaurantInfo || {});
  const fssaiResolved = resolveFSSAI(order, restaurantInfo || {});

  // Merge with persisted printer config (fallbacks)
  const persistedCfg = (() => { try { return JSON.parse(localStorage.getItem('pos_printer_config') || '{}'); } catch { return {}; } })();
  const duplicateReceipt = receiptSettings.duplicateReceipt ?? false;
  const paymentUPIVPA = receiptSettings.paymentUPIVPA ?? persistedCfg.paymentUPIVPA ?? '';
  const paymentUPIName = receiptSettings.paymentUPIName ?? persistedCfg.paymentUPIName ?? '';

  const upiIntent = (() => {
    try {
      if (!paymentUPIVPA) return '';
      const amt = Number(order?.totalAmount) || 0;
      return buildUPIIntent({ vpa: paymentUPIVPA, name: paymentUPIName || (brandName || baseName), amount: amt, orderNumber: order?.orderNumber, orderId: order?._id });
    } catch { return ''; }
  })();

  const normalizedLogo = normalizeLogoUrl(logo);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - Order #${order.orderNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          max-width: 300px;
          margin: 0 auto;
          padding: 10px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .restaurant-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .duplicate {
          font-weight: bold;
          color: red;
          margin: 10px 0;
        }
        .separator {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        .section-title {
          font-weight: bold;
          margin: 15px 0 5px 0;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .item-name {
          flex: 1;
          padding-right: 10px;
        }
        .item-qty {
          width: 30px;
          text-align: center;
        }
        .item-rate {
          width: 60px;
          text-align: right;
        }
        .item-price {
          width: 80px;
          text-align: right;
        }
        .customization {
          font-size: 10px;
          color: #666;
          margin-left: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .grand-total {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #000;
          padding-top: 5px;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
        }
  .qr-placeholder { text-align: center; border: 1px dashed #000; padding: 20px; margin: 15px 0; }
  .qr-img { display: block; margin: 6px auto; }
      </style>
    </head>
    <body>
      <div class="header">
        ${normalizedLogo ? `<div><img src="${normalizedLogo}" alt="${restaurantName}" style="max-height:50px;object-fit:contain" onerror="this.style.display='none'" /></div>` : ''}
        <div class="restaurant-name">${restaurantName}</div>
        ${duplicateReceipt ? '<div class="duplicate">*** DUPLICATE RECEIPT ***</div>' : ''}
        <div>${address}</div>
        <div>Phone: ${phone}</div>
  ${email ? `<div>Email: ${escapeHtml(email)}</div>` : ''}
  ${gstResolved ? `<div>GSTIN: ${escapeHtml(gstResolved)}</div>` : ''}
  ${fssaiResolved ? `<div>FSSAI: ${escapeHtml(fssaiResolved)}</div>` : ''}
      </div>

      <div class="separator"></div>

      <div class="section-title">ORDER DETAILS</div>
      <div>Order #: ${order.orderNumber}</div>
      <div>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
      <div>Time: ${new Date(order.createdAt).toLocaleTimeString('en-IN')}</div>
      <div>Table: ${tableInfo?.name || 'N/A'}</div>
      <div>Customer: ${customerInfo?.name || 'Walk-in Customer'}</div>
      ${customerInfo?.phone ? `<div>Phone: ${customerInfo.phone}</div>` : ''}
      <div>Order Type: ${customerInfo?.orderType || 'Dine-in'}</div>
  ${(() => { try { const t = resolveTokenNo(order); return t ? `<div>Token No.: ${escapeHtml(t)}</div>` : ''; } catch { return ''; } })()}
  ${(() => { try { const c = resolveCashierName(order); return c ? `<div>Cashier: ${escapeHtml(c)}</div>` : ''; } catch { return ''; } })()}

      <div class="separator"></div>

      <div class="section-title">ITEMS</div>
      <div class="item-row">
        <div class="item-name"><strong>Item</strong></div>
        <div class="item-qty"><strong>Qty</strong></div>
  <div class="item-rate"><strong>Price</strong></div>
        <div class="item-price"><strong>Amount</strong></div>
      </div>
      <div class="separator"></div>

    ${order.items.map(item => {
        try {
          const inline = formatInlineParenthetical(item.customizations || {});
      const name = toTitleCase(item.name) + (inline ? ` (${inline})` : '');
          return `
        <div class="item-row">
          <div class="item-name">${escapeHtml(name)}</div>
          <div class="item-qty">${item.quantity}</div>
      <div class="item-rate">${formatCurrency(item.price)}</div>
          <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
        </div>`;
        } catch { 
          return `
        <div class="item-row">
      <div class="item-name">${toTitleCase(item.name)}</div>
          <div class="item-qty">${item.quantity}</div>
      <div class="item-rate">${formatCurrency(item.price)}</div>
          <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
        </div>`; 
        }
      }).join('')}

      <div class="separator"></div>

      <div class="total-row">
        <div>Subtotal:</div>
        <div>${formatCurrency(order.subtotal || order.totalAmount)}</div>
      </div>
      ${order.tax ? `
        <div class="total-row">
          <div>Tax:</div>
          <div>${formatCurrency(order.tax)}</div>
        </div>
      ` : ''}
      ${order.discount ? `
        <div class="total-row">
          <div>Discount:</div>
          <div>-${formatCurrency(order.discount)}</div>
        </div>
      ` : ''}

      <div class="total-row grand-total">
        <div>TOTAL:</div>
        <div>${formatCurrencyWithSymbol(order.totalAmount)}</div>
      </div>

      <div class="separator"></div>

  <div class="section-title">PAYMENT DETAILS</div>
  <div>Method: ${String((paymentDetails && paymentDetails.method) || 'cash').toUpperCase()}</div>
  <div>Status: ${String((order && order.paymentStatus) || 'unpaid').toUpperCase()}</div>
  ${((paymentDetails && paymentDetails.method) || 'cash') === 'cash' ? `
        <div>Amount Received: ${formatCurrency(paymentDetails.amountReceived)}</div>
        ${paymentDetails.change > 0 ? `<div>Change: ${formatCurrency(paymentDetails.change)}</div>` : ''}
      ` : ''}
  ${((paymentDetails && paymentDetails.method) === 'card') && paymentDetails.cardNumber ? `
        <div>Card: ****${paymentDetails.cardNumber.slice(-4)}</div>
        ${paymentDetails.cardHolder ? `<div>Holder: ${paymentDetails.cardHolder}</div>` : ''}
      ` : ''}
  ${((paymentDetails && paymentDetails.method) === 'upi') && paymentDetails.upiId ? `
        <div>UPI ID: ${paymentDetails.upiId}</div>
        ${paymentDetails.transactionId ? `<div>Transaction: ${paymentDetails.transactionId}</div>` : ''}
      ` : ''}

      ${order.specialInstructions ? `
        <div class="separator"></div>
        <div class="section-title">SPECIAL INSTRUCTIONS</div>
        <div>${order.specialInstructions}</div>
      ` : ''}

      <div class="footer">
        <div>Thank you for dining with us!</div>
        <div>Please visit again!</div>
        <br>
        <div class="qr-placeholder">
          ${upiIntent ? 'Scan to Pay through any UPI' : ''}<br>
          ${upiIntent ? `Pay to: ${escapeHtml(paymentUPIVPA)}<br>Amount: ${escapeHtml(formatCurrencyWithSymbol(order.totalAmount))} (or more)` : `Order: ${escapeHtml(order.orderNumber)}`}
          ${upiIntent ? `<img class="qr-img" alt="UPI QR" width="160" height="160" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiIntent)}" />` : ''}
        </div>
        <div>Printed: ${new Date().toLocaleString('en-IN')}</div>
        <div>Powered by DynLeaf</div>
      </div>
      
    </body>
    </html>
  `;
};

/**
 * Generate HTML receipt matching the attached reference style (T&T style)
 * Compact 80mm thermal layout with CGST/SGST split and round-off.
 */
export const generateHTMLReceiptReference = (orderData, restaurantInfo, receiptSettings = {}) => {
  const { order, paymentDetails, customerInfo, tableInfo } = orderData || {};
  const {
    name: baseName = '',
    brandName,
    logo,
  address = '',
    phone = '',
  email = '',
  gst = '32AAWFT1084H1ZW',

  branchName: branchNameIn
  } = restaurantInfo || {};

  const restaurantName = brandName || baseName;
  const gstResolvedRef = resolveGSTIN(order, restaurantInfo || {}) || gst;
  const fssaiResolvedRef = resolveFSSAI(order, restaurantInfo || {});

  // Derive amounts
  const items = Array.isArray(order?.items) ? order.items : [];
  const computedSubtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const subtotal = Number(order?.subtotal) || computedSubtotal;
  // Prefer explicit tax; else derive from total
  let tax = Number(order?.tax) || 0;
  if (!tax) {
    const totalAmount = Number(order?.totalAmount) || subtotal;
    const discount = Number(order?.discount) || 0;
    const inferred = totalAmount - (subtotal - discount);
    if (isFinite(inferred) && inferred > 0) tax = inferred;
  }
  const discount = Number(order?.discount) || 0;
  const totalBeforeRound = (subtotal - discount) + tax;
  const roundedGrandTotal = Math.round(totalBeforeRound);
  const roundOff = Number((roundedGrandTotal - totalBeforeRound).toFixed(2));

  // Try to infer tax percent if available
  const taxPercent = subtotal > 0 ? ((tax / subtotal) * 100) : 0;
  const cgstPercent = taxPercent > 0 ? +(taxPercent / 2).toFixed(2) : 0;
  const sgstPercent = cgstPercent;
  const cgstAmt = +(tax / 2).toFixed(2);
  const sgstAmt = +(tax / 2).toFixed(2);

  const rawBill = (order?.orderNumber || order?._id || '').toString();
  const billNo = (() => {
    if (!rawBill) return '';
    // If orderNumber is numeric or short, keep it; else shorten IDs
    const isNumeric = /^\d{1,10}$/.test(rawBill);
    if (isNumeric) return rawBill;
    // If looks like an ObjectId, take last 6 chars
    if (/^[a-f0-9]{12,}$/.test(rawBill)) return rawBill.slice(-6).toUpperCase();
    // Otherwise, keep up to 8 chars
    return rawBill.slice(-8);
  })();
  const tokenNo = order?.tokenNumber || order?.token || '';
  const cashier = (() => { try { return resolveCashierName(order); } catch { return order?.createdByName || order?.cashierName || ''; } })();
  const tokenResolved = (() => { try { return resolveTokenNo(order); } catch { return tokenNo; } })();
  const orderType = (customerInfo?.orderType || order?.orderType || 'Dine-in');
  const dateStr = new Date(order?.createdAt || Date.now()).toLocaleDateString('en-IN');
  const timeStr = new Date(order?.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const customerName = customerInfo?.name || order?.customerName || '';

  // Currency formatters (symbol only for Grand Total)
  const fmtNoSym = (amt) => formatCurrency(amt);
  const fmtSym = (amt) => formatCurrencyWithSymbol(amt);

  // Prefer explicit branchName from restaurantInfo; try order fallbacks
  const branchName = branchNameIn || order?.branchName || order?.branch?.name || '';

  // Normalize logo URL so it shows in about:blank print window
  const normalizeLogoUrl = (u) => {
    try {
      if (!u) return '';
      const s = String(u);
      // Already absolute or embeddable
      if (s.startsWith('data:') || s.startsWith('blob:')) return s;
      if (/^https?:\/\//i.test(s)) return s;
      // Resolve any relative path (with or without leading slash) against current location
      if (typeof window !== 'undefined' && window.location) {
        try {
          return new URL(s, window.location.href).href;
        } catch {
          if (s.startsWith('/')) return window.location.origin + s;
        }
      }
      return s;
    } catch { return u; }
  };
  const normalizedLogo = normalizeLogoUrl(logo);
  const persistedCfgRef = (() => { try { return JSON.parse(localStorage.getItem('pos_printer_config') || '{}'); } catch { return {}; } })();
  const paymentUPIVPA = (receiptSettings?.paymentUPIVPA ?? persistedCfgRef.paymentUPIVPA) || '';
  const paymentUPIName = (receiptSettings?.paymentUPIName ?? persistedCfgRef.paymentUPIName) || '';
  const upiIntentRef = (() => { try { if (!paymentUPIVPA) return ''; return buildUPIIntent({ vpa: paymentUPIVPA, name: paymentUPIName || (brandName || baseName), amount: Number(roundedGrandTotal)||0, orderNumber: billNo, orderId: order?._id }); } catch { return ''; }})();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${billNo ? `#${billNo}` : ''}</title>
  <base href="${typeof window !== 'undefined' && window.location ? window.location.origin : '/'}" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Roboto+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @media print { body { margin: 0 } .no-print { display:none } }
    body { font-family: 'Roboto Mono', Menlo, Consolas, 'Courier New', monospace; font-size: 12px; line-height: 1.35; max-width: 300px; margin: 0 auto; padding: 10px; color:#000 }
    .center { text-align:center }
    .bold { font-weight:700 }
    .text-cap { text-transform:capitalize }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .row { display:flex; justify-content:space-between }
    .small { font-size: 11px }
    .hdr img { max-height: 60px; object-fit: contain; display: block; margin: 0 auto 6px auto; }
    .fs-9 { font-size: 9px }
    .fs-8 { font-size: 8px }
    .hdr .title { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Noto Sans', 'Liberation Sans', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.3px }
  .hdr .branch { font-weight:700; margin-top:2px }
    .kv { display:flex; justify-content:space-between; margin: 2px 0 }
    .items .head, .items .line { display:flex; }
    .items .c1 { flex: 1; }
  .items .c2 { width: 25px; text-align:center }
  .items .c3 { width: 65px; text-align:right }
  .items .c4 { width: 80px; text-align:right }
    .totals .row { margin: 3px 0 }
    .grand { font-weight:700; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px }
    .footer { margin-top: 10px; text-align:center; font-size: 10px; color: #444 }
  </style>
  </head>
  <body>
    <div class="hdr center">
  ${normalizedLogo ? `<div><img src="${normalizedLogo}" alt="${restaurantName}" style="max-height:50px;object-fit:contain;display:inline-block" onerror="this.style.display='none'" /></div>` : ''}
      <div class="title">${restaurantName}</div>
      ${branchName ? `<div class="branch">${escapeHtml(branchName)}</div>` : ''}
  ${phone ? `<div class="small">Mob: ${escapeHtml(phone)}</div>` : ''}
  ${gstResolvedRef ? `<div class="small">GSTIN: ${escapeHtml(gstResolvedRef)}</div>` : ''}
  ${fssaiResolvedRef ? `<div class="small">FSSAI: ${escapeHtml(fssaiResolvedRef)}</div>` : ''}
      
    </div>

    <div class="sep"></div> 

  ${customerName ? `<div class="kv"><div><span>Name:</span><span>${escapeHtml(customerName)}</span></div><div class="bold text-cap">${escapeHtml(orderType)}</div></div>` : ''}
  <div class="kv"><div>Date: ${dateStr},${timeStr}</div>${cashier ? `<div>Cashier: ${escapeHtml(cashier)}</div>` : ''}</div>
  <div class="kv">${billNo ? `<div>Bill No.: ${escapeHtml(billNo)}</div>` : ''}${tokenResolved ? `<div class="bold">Token No.: ${escapeHtml(tokenResolved)}</div>` : ''}</div>
   

    <div class="sep"></div>

    <div class="items">
      <div class="head bold">
        <div class="c1">Item</div>
  <div class="c2">Qty</div>
  <div class="c3">Rate</div>
  <div class="c4">Amount</div>
      </div>
      <div class="sep"></div>
      ${items.map(it => {
        const base = toTitleCase(it.name || it.itemName || 'Item');
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.price) || 0;
        const amount = rate * qty;
        const inline = formatInlineParenthetical(it.customizations || {});
        const name = base + (inline ? ` (${inline})` : '');
  return `<div class=\"line\">\n          <div class=\"c1\">${escapeHtml(name)}</div>\n          <div class=\"c2\">${qty}</div>\n          <div class=\"c3\">${fmtNoSym(rate)}</div>\n          <div class=\"c4\">${fmtNoSym(amount)}</div>\n        </div>`;
      }).join('')}
    </div>

    <div class="sep"></div>

    <div class="totals">
    <div class="row"><div>Sub Total</div><div>${fmtNoSym(subtotal)}</div></div>
    ${discount ? `<div class="row"><div>Discount</div><div>- ${fmtNoSym(discount)}</div></div>` : ''}
  ${gstResolvedRef && tax ? `<div class="row"><div>CGST@${cgstPercent}%</div><div>${fmtNoSym(cgstAmt)}</div></div>` : ''}
  ${gstResolvedRef && tax ? `<div class="row"><div>SGST@${sgstPercent}%</div><div>${fmtNoSym(sgstAmt)}</div></div>` : ''}
  ${(!gstResolvedRef && tax) ? `<div class="row"><div>Tax</div><div>${fmtNoSym(tax)}</div></div>` : ''}
      <div class="row"><div>Round off</div><div>${roundOff.toFixed(2)}</div></div>
    <div class="row grand"><div>Grand Total</div><div>${fmtSym(roundedGrandTotal)}</div></div>
    </div>

    <div class="sep"></div> 
    <div class="qr-placeholder center small">
     <div class="fs-8">${upiIntentRef ? 'Scan to Pay through any UPI' : 'Thank you for your order!'}</div><br>
      ${upiIntentRef ? `<img alt="UPI QR" width="80" height="80" style="display:block;margin:3px auto" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiIntentRef)}" />` : ''} 
      <br> 
      <div class="fs-8">Powered by DynLeaf</div>
    </div>
    <div class="footer small">
      <div class="fs-8">Consume food products within TWO hours of purchase</div>
      <div class="fs-8">Thanks for your order!</div>
    </div>
  </body>
  </html>`;
};

// Simple HTML escape helper to keep template safe
const escapeHtml = (str) => {
  try {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } catch {
    return str;
  }
};

/**
 * Print receipt to thermal printer
 */
export const printThermalReceipt = async (receiptData, printerConfig = {}) => {
  const {
    printerType = 'network', // 'network', 'usb', 'bluetooth'
    printerIP = '192.168.1.100',
    printerPort = 9100,
    encoding = 'utf-8',
    networkMode = 'preview', // preview | direct
    destinations = {}
  } = printerConfig;
  const { destination = 'cashier' } = (receiptData && receiptData._meta) || {};
  // Normalize receipt data to raw ESC/POS string if wrapped with metadata
  let rawData = receiptData;
  if (rawData && typeof rawData !== 'string') {
    if (rawData.data && typeof rawData.data === 'string') {
      rawData = rawData.data;
    } else if (rawData instanceof String) {
      rawData = rawData.valueOf();
    } else if (typeof rawData.valueOf === 'function') {
      const v = rawData.valueOf();
      if (typeof v === 'string') rawData = v;
    }
  }
  const destCfg = destinations[destination] || destinations.cashier || null;
  const finalIP = destCfg?.ip || printerIP;
  const finalPort = destCfg?.port || printerPort;

  try {
    if (printerType === 'network') {
      if (typeof rawData === 'string') {
        console.debug(`[ThermalPrinter] ESC/POS bytes=${rawData.length} mode=${networkMode} dest=${destination} -> ${finalIP}:${finalPort}`);
        if (networkMode === 'preview') {
          try {
            const plain = rawData
              .replace(/[\x1B\x1D][@-~]./g, '')
              .replace(/[\x00-\x09\x0B-\x1A\x1C-\x1F]/g, '')
              .replace(/\x0D\x0A/g, '\n')
              .replace(/\r\n/g, '\n')
              .replace(/\r/g, '\n');
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Print Preview</title><style>body{margin:0;padding:8px;font-family:Courier,monospace;font-size:12px;white-space:pre-wrap;}@media print{body{zoom:1}}.meta{font-size:10px;color:#666;margin-bottom:4px;border-bottom:1px dashed #999;padding-bottom:4px}</style></head><body><div class="meta">Preview ${destination} ${finalIP}:${finalPort}</div><pre>${plain.replace(/</g,'&lt;')}</pre><script>window.print();setTimeout(()=>window.close(),150);</script></body></html>`;
            const w = window.open('', '_blank', 'width=400,height=600');
            if (w) { w.document.write(html); w.document.close(); }
          } catch (e) { console.warn('Preview open failed', e); }
          return { success: true, message: `Preview opened for ${destination}` };
        } else {
          // Direct send (simulated) – integrate real socket/API here
          console.info(`[ThermalPrinter] Simulated direct send to ${finalIP}:${finalPort} (${destination})`);
          return { success: true, message: `Direct send simulated to ${finalIP}:${finalPort}` };
        }
      }
      return { success: false, error: 'No data' };
    } else if (printerType === 'browser') {
      // For browser printing (fallback)
  return printHTMLReceipt(rawData);
    } else {
      throw new Error(`Printer type ${printerType} not supported`);
    }
  } catch (error) {
    console.error('Printer error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Print HTML receipt using browser print dialog
 */
export const printHTMLReceipt = (htmlContent) => {
  try {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    const waitForAssets = () => {
      const d = printWindow.document;
      const images = Array.from(d.images || []);
      const imgPromises = images.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(res => {
          img.addEventListener('load', () => res(), { once: true });
          img.addEventListener('error', () => res(), { once: true });
        });
      });
      const fontPromises = (d.fonts && d.fonts.ready) ? [d.fonts.ready.catch(() => {})] : [];
      return Promise.all([...imgPromises, ...fontPromises]).then(() => undefined);
    };
    waitForAssets().finally(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        // Delay close a bit so print dialog can open reliably in some browsers
        setTimeout(() => { try { printWindow.close(); } catch {} }, 250);
      }
    });
    return { success: true, message: 'Receipt sent to browser printer' };
  } catch (error) {
    console.error('Browser print error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Utility functions
 */
const padString = (str, length, padChar = ' ') => {
  return str.toString().padEnd(length, padChar).substring(0, length);
};

const formatCurrency = (amount) => {
  try {
    // Symbol-less formatting for all amounts except Grand Total
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(amount || 0));
  } catch {
    return String(amount);
  }
};

// Use only for Grand Total
const formatCurrencyWithSymbol = (amount) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(Number(amount || 0));
  } catch {
    return `₹ ${formatCurrency(amount)}`;
  }
};

// Title-case for item names: capitalize each word, keep inner punctuation
const toTitleCase = (s) => {
  try {
    return String(s || '')
      .toLowerCase()
      .replace(/\b([a-z])(\w*)/g, (m, a, rest) => a.toUpperCase() + rest);
  } catch { return s; }
};

// Helper: robustly parse customizations/variant selections into a single variant label and other option lines
const parseCustomizations = (cust) => {
  const result = { variantLabel: '', variantShort: '', otherSelections: [] };
  try {
    if (!cust) return result;
    // If it's a simple array of strings
    if (Array.isArray(cust)) {
      result.otherSelections = cust.map(String);
      return result;
    }
    if (typeof cust !== 'object') return result;

    // Possible size/variant keys
    const sizeKeys = ['selectedVariant', 'selectedSize', 'sizeVariant', 'size', 'variant', 'variantName'];
    let sizeVal = '';
    for (const k of sizeKeys) {
      if (cust[k]) { sizeVal = String(cust[k]); break; }
    }
    // Look inside variantSelections for size-like keys as fallback
    const vsel = cust.variantSelections && typeof cust.variantSelections === 'object' ? cust.variantSelections : null;
    if (!sizeVal && vsel) {
      for (const [g, val] of Object.entries(vsel)) {
        const low = String(g).toLowerCase();
        if (low.includes('size') || low.includes('variant')) {
          if (Array.isArray(val)) sizeVal = val.join(', ');
          else if (val) sizeVal = String(val);
          if (sizeVal) break;
        }
      }
    }
    if (sizeVal) {
      result.variantLabel = `Size: ${sizeVal}`;
      // Compact short form for common sizes
      const map = { large: 'L', medium: 'M', small: 'S', regular: 'R', jumbo: 'J', extra: 'X' };
      const key = String(sizeVal).trim().toLowerCase();
      if (map[key]) {
        result.variantShort = map[key];
      } else if (/^(x{1,3})?l(arg(e)?)?$/i.test(sizeVal)) {
        // XL/XXL/XXXL and large variants -> take letters
        result.variantShort = sizeVal.toUpperCase().replace(/[^XL]/g, '').slice(0, 3) || 'L';
      } else if (/^s(mall)?$/i.test(sizeVal)) {
        result.variantShort = 'S';
      } else if (/^m(edium)?$/i.test(sizeVal)) {
        result.variantShort = 'M';
      }
      if (result.variantShort) {
        result.variantShort = `${result.variantShort}`; // already prefixed as "+ ..." in callers
      }
    }

    // Collect other groups (exclude size-like)
    if (vsel) {
      Object.entries(vsel).forEach(([g, val]) => {
        if (!g) return;
        const low = String(g).toLowerCase();
        if (low.includes('size') || low.includes('variant')) return;
        if (Array.isArray(val)) {
          if (val.length) result.otherSelections.push(`${g}: ${val.join(', ')}`);
        } else if (val !== undefined && val !== null && String(val) !== '') {
          result.otherSelections.push(`${g}: ${val}`);
        }
      });
    }
  } catch {}
  return result;
};

// Build inline parenthetical like "Large + Extra Egg" from customizations
const formatInlineParenthetical = (cust) => {
  try {
    const parsed = parseCustomizations(cust || {});
    const parts = [];
    if (parsed.variantLabel) {
      const size = parsed.variantLabel.replace(/^Size:\s*/i, '').trim();
      if (size) parts.push(size);
    }
    if (Array.isArray(parsed.otherSelections)) {
      parsed.otherSelections.forEach(s => {
        if (!s) return;
        const idx = String(s).indexOf(':');
        if (idx !== -1) {
          const val = String(s).slice(idx + 1).trim();
          if (val) parts.push(val);
        } else {
          parts.push(String(s));
        }
      });
    }
    return parts.filter(Boolean).join(' + ');
  } catch { return ''; }
};

// Resolve Token No. from various likely fields
const resolveTokenNo = (order) => {
  try {
    if (!order) return '';
    const candidates = [
      order.tokenNumber,
      order.token,
      order.token_no,
      order.tokenNo,
      order.kotToken,
      order.kot_number,
      order.kotNumber
    ];
    const found = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    return found !== undefined ? String(found) : '';
  } catch { return ''; }
};

// Resolve Cashier/CreatedBy from various likely fields/objects
const resolveCashierName = (order) => {
  try {
    if (!order) return '';
    const candidates = [
      order.cashierName,
      order.createdByName,
      order.createdBy?.name,
      order.createdBy?.username,
      order.createdBy,
      order.user?.name,
      order.userName,
      order.staffName
    ];
    const found = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
    return found !== undefined ? String(found) : '';
  } catch { return ''; }
};

/**
 * Default printer configurations
 */
export const PRINTER_CONFIGS = {
  NETWORK_THERMAL: {
    printerType: 'network',
    printerIP: '192.168.1.100',
    printerPort: 9100,
    encoding: 'utf-8',
    networkMode: 'preview', // preview | direct
  kotDestination: 'kitchen',
  kotDuplicate: false,
    destinations: {
      kitchen: { ip: '192.168.1.110', port: 9100, enabled: true },
      cashier: { ip: '192.168.1.100', port: 9100, enabled: true }
    }
  },
  USB_THERMAL: {
    printerType: 'usb',
    vendorId: 0x04b8,
    productId: 0x0202
  },
  BROWSER_FALLBACK: {
    printerType: 'browser'
  }
};

// Helpers: build UPI intent URL and a tiny QR renderer for print windows
function buildUPIIntent({ vpa, name = '', amount = 0, orderNumber = '', orderId = '' }) {
  try {
    const params = new URLSearchParams();
    params.set('pa', String(vpa));
    if (name) params.set('pn', String(name));
    const amt = Number(amount) || 0;
    if (amt > 0) params.set('am', amt.toFixed(2));
    params.set('cu', 'INR');
    if (orderNumber) params.set('tn', `Order ${orderNumber}`);
    if (orderId) params.set('tr', String(orderId));
    return `upi://pay?${params.toString()}`;
  } catch {
    const a = Number(amount) || 0;
    return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name || '')}&am=${encodeURIComponent(a.toFixed(2))}&cu=INR`;
  }
}

// Note: QR image rendering for HTML receipts uses a lightweight external image endpoint.

export default {
  generateThermalReceipt,
  generateHTMLReceipt,
  generateHTMLKOT,
  generateThermalKOT,
  generateHTMLReceiptReference,
  printThermalReceipt,
  printHTMLReceipt,
  PRINTER_CONFIGS
};
