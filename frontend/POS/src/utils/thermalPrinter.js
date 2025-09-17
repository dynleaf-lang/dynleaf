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
    email = 'Email Address',
    gst = 'GST Number'
  } = restaurantInfo;
  const restaurantName = brandName || baseName;

  const {
    showLogo = false,
    showQRCode = true,
    showFooterMessage = true,
    duplicateReceipt = false
  } = receiptSettings;

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
  if (gst) receipt += 'GST: ' + gst + COMMANDS.CRLF;
  
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
  
  receipt += COMMANDS.CRLF;
  receipt += '================================' + COMMANDS.CRLF;
  
  // Items
  receipt += COMMANDS.BOLD_ON;
  receipt += 'ITEMS' + COMMANDS.CRLF;
  receipt += COMMANDS.BOLD_OFF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  // Item header
  receipt += padString('Item', 16) + padString('Qty', 4) + padString('Price', 12) + COMMANDS.CRLF;
  receipt += '--------------------------------' + COMMANDS.CRLF;
  
  let subtotal = 0;
  order.items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    // Item name (truncate if too long)
    const itemName = item.name.length > 15 ? item.name.substring(0, 15) : item.name;
    receipt += padString(itemName, 16);
    receipt += padString(item.quantity.toString(), 4);
    receipt += padString(formatCurrency(itemTotal), 12) + COMMANDS.CRLF;
    
    // Customizations / Variant selections display
    try {
      const cust = item.customizations || {};
      // Support both array of strings and structured variantSelections
      if (Array.isArray(cust)) {
        cust.forEach(custom => {
          receipt += `  + ${custom}` + COMMANDS.CRLF;
        });
      } else if (cust && typeof cust === 'object') {
        const vsel = cust.variantSelections || null;
        const sizeName = cust.selectedVariant || cust.selectedSize || null;
        const parts = [];
        if (sizeName) parts.push(`Size: ${sizeName}`);
        if (vsel && typeof vsel === 'object') {
          Object.entries(vsel).forEach(([g, val]) => {
            if (!g || String(g).toLowerCase() === 'size') return;
            if (Array.isArray(val)) {
              if (val.length) parts.push(`${g}: ${val.join(', ')}`);
            } else if (val) {
              parts.push(`${g}: ${val}`);
            }
          });
        }
        parts.forEach(p => { receipt += `  + ${p}` + COMMANDS.CRLF; });
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
  receipt += padString('TOTAL:', 20) + padString(formatCurrency(order.totalAmount), 12) + COMMANDS.CRLF;
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
  
  // QR Code placeholder (would need actual QR generation)
  if (showQRCode) {
    receipt += '--- QR CODE FOR FEEDBACK ---' + COMMANDS.CRLF;
    receipt += `Order: ${order.orderNumber}` + COMMANDS.CRLF;
    receipt += COMMANDS.CRLF;
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
    email = 'Email Address',
    gst = 'GST Number'
  } = restaurantInfo;
  const restaurantName = brandName || baseName;

  const {
    duplicateReceipt = false
  } = receiptSettings;

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
        .qr-placeholder {
          text-align: center;
          border: 1px dashed #000;
          padding: 20px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logo ? `<div><img src="${logo}" alt="${restaurantName}" style="max-height:50px;object-fit:contain" onerror="this.style.display='none'" /></div>` : ''}
        <div class="restaurant-name">${restaurantName}</div>
        ${duplicateReceipt ? '<div class="duplicate">*** DUPLICATE RECEIPT ***</div>' : ''}
        <div>${address}</div>
        <div>Phone: ${phone}</div>
        ${email ? `<div>Email: ${email}</div>` : ''}
        ${gst ? `<div>GST: ${gst}</div>` : ''}
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

      <div class="separator"></div>

      <div class="section-title">ITEMS</div>
      <div class="item-row">
        <div class="item-name"><strong>Item</strong></div>
        <div class="item-qty"><strong>Qty</strong></div>
        <div class="item-price"><strong>Price</strong></div>
      </div>
      <div class="separator"></div>

      ${order.items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.name}</div>
          <div class="item-qty">${item.quantity}</div>
          <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
        </div>
        ${(() => {
          try {
            const cust = item.customizations || {};
            if (Array.isArray(cust)) {
              return cust.map(c => `<div class="customization">+ ${c}</div>`).join('');
            } else if (cust && typeof cust === 'object') {
              const vsel = cust.variantSelections || null;
              const sizeName = cust.selectedVariant || cust.selectedSize || null;
              const parts = [];
              if (sizeName) parts.push(`Size: ${sizeName}`);
              if (vsel && typeof vsel === 'object') {
                Object.entries(vsel).forEach(([g, val]) => {
                  if (!g || String(g).toLowerCase() === 'size') return;
                  if (Array.isArray(val)) {
                    if (val.length) parts.push(`${g}: ${val.join(', ')}`);
                  } else if (val) {
                    parts.push(`${g}: ${val}`);
                  }
                });
              }
              return parts.map(p => `<div class="customization">+ ${p}</div>`).join('');
            }
          } catch {}
          return '';
        })()}
      `).join('')}

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
        <div>${formatCurrency(order.totalAmount)}</div>
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
          QR CODE FOR FEEDBACK<br>
          Order: ${order.orderNumber}
        </div>
        <div>Printed: ${new Date().toLocaleString('en-IN')}</div>
        <div>Powered by OrderEase POS</div>
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
  const cashier = order?.createdByName || order?.cashierName || '';
  const orderType = (customerInfo?.orderType || order?.orderType || 'Dine-in');
  const dateStr = new Date(order?.createdAt || Date.now()).toLocaleDateString('en-IN');
  const timeStr = new Date(order?.createdAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const customerName = customerInfo?.name || order?.customerName || '';

  // Currency format (INR)
  const fmt = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(amt || 0));

  // Prefer explicit branchName from restaurantInfo; try order fallbacks
  const branchName = branchNameIn || order?.branchName || order?.branch?.name || '';

  // Normalize logo URL so it shows in about:blank print window
  const normalizeLogoUrl = (u) => {
    try {
      if (!u) return '';
      const s = String(u);
      if (s.startsWith('data:')) return s;
      if (/^https?:\/\//i.test(s)) return s;
      if (typeof window !== 'undefined' && window.location && s.startsWith('/')) {
        return window.location.origin + s;
      }
      return s;
    } catch { return u; }
  };
  const normalizedLogo = normalizeLogoUrl(logo);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${billNo ? `#${billNo}` : ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Roboto+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @media print { body { margin: 0 } .no-print { display:none } }
    body { font-family: 'Roboto Mono', Menlo, Consolas, 'Courier New', monospace; font-size: 12px; line-height: 1.35; max-width: 300px; margin: 0 auto; padding: 10px; color:#000 }
    .center { text-align:center }
    .bold { font-weight:700 }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .row { display:flex; justify-content:space-between }
    .small { font-size: 11px }
    .hdr img { max-height: 60px; object-fit: contain; display: block; margin: 0 auto 6px auto; }
    .hdr .title { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Noto Sans', 'Liberation Sans', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 0.3px }
  .hdr .branch { font-weight:700; margin-top:2px }
    .kv { display:flex; justify-content:space-between; margin: 2px 0 }
    .items .head, .items .line { display:flex; }
    .items .c1 { flex: 1 1 auto }
    .items .c2 { width: 40px; text-align:center }
    .items .c3 { width: 80px; text-align:right }
    .totals .row { margin: 3px 0 }
    .grand { font-weight:700; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px }
    .footer { margin-top: 10px; text-align:center; font-size: 10px; color: #444 }
  </style>
  </head>
  <body>
    <div class="hdr center">
      ${normalizedLogo ? `<div><img src="${normalizedLogo}" alt="${restaurantName}" crossOrigin="anonymous" style="max-height:50px;object-fit:contain;display:inline-block" onerror="this.style.display='none'" /></div>` : ''}
      <div class="title">${restaurantName}</div>
      ${branchName ? `<div class="branch">${escapeHtml(branchName)}</div>` : ''}
      ${phone ? `<div class="small">Mob: ${escapeHtml(phone)}</div>` : ''}
      ${gst ? `<div class="small">GST No: ${escapeHtml(gst)}</div>` : ''}
      ${address ? `<div class="small">${escapeHtml(address)}</div>` : ''}
    </div>

    <div class="sep"></div>

    ${customerName ? `<div class="kv"><div>Name:</div><div>${customerName}</div></div>` : ''}
    <div class="kv"><div>Date:</div><div>${dateStr}</div></div>
    <div class="kv"><div>Time:</div><div>${timeStr}</div></div>
  <div class="kv"><div>Type:</div><div class="bold">${escapeHtml(orderType)}</div></div>
    ${cashier ? `<div class="kv"><div>Cashier:</div><div>${cashier}</div></div>` : ''}
    ${billNo ? `<div class="kv"><div>Bill No.:</div><div>${billNo}</div></div>` : ''}
    ${tokenNo ? `<div class="kv"><div>Token No.:</div><div>${tokenNo}</div></div>` : ''}

    <div class="sep"></div>

    <div class="items">
      <div class="head bold">
        <div class="c1">Item</div>
        <div class="c2">Qty</div>
        <div class="c3">Amount</div>
      </div>
      <div class="sep"></div>
      ${items.map(it => {
        const name = it.name || it.itemName || 'Item';
        const qty = Number(it.quantity) || 1;
        const amount = (Number(it.price) || 0) * qty;
        return `<div class="line">
          <div class="c1">${escapeHtml(name)}</div>
          <div class="c2">${qty}</div>
          <div class="c3">${fmt(amount)}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="sep"></div>

    <div class="totals">
      <div class="row"><div>Sub Total</div><div>${fmt(subtotal)}</div></div>
      ${discount ? `<div class="row"><div>Discount</div><div>- ${fmt(discount)}</div></div>` : ''}
      ${gst && tax ? `<div class="row"><div>CGST@${cgstPercent}%</div><div>${fmt(cgstAmt)}</div></div>` : ''}
      ${gst && tax ? `<div class="row"><div>SGST@${sgstPercent}%</div><div>${fmt(sgstAmt)}</div></div>` : ''}
      ${(!gst && tax) ? `<div class="row"><div>Tax</div><div>${fmt(tax)}</div></div>` : ''}
      <div class="row"><div>Round off</div><div>${roundOff.toFixed(2)}</div></div>
      <div class="row grand"><div>Grand Total</div><div>${fmt(roundedGrandTotal)}</div></div>
    </div>

    <div class="sep"></div>
    <div class="footer small">
      <div>Consume food products within TWO hours of purchase</div>
      <div>Thanks</div>
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
    encoding = 'utf-8'
  } = printerConfig;

  try {
    if (printerType === 'network') {
      // For network printers, we would typically send data via WebSocket or HTTP
      // This is a simplified implementation
      console.log('Sending to network printer:', printerIP + ':' + printerPort);
      console.log('Receipt data:', receiptData);
      
      // In a real implementation, you would:
      // 1. Connect to the printer via WebSocket or HTTP
      // 2. Send the ESC/POS commands
      // 3. Handle printer responses and errors
      
      return { success: true, message: 'Receipt sent to network printer' };
    } else if (printerType === 'browser') {
      // For browser printing (fallback)
      return printHTMLReceipt(receiptData);
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
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Default printer configurations
 */
export const PRINTER_CONFIGS = {
  NETWORK_THERMAL: {
    printerType: 'network',
    printerIP: '192.168.1.100',
    printerPort: 9100,
    encoding: 'utf-8'
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

export default {
  generateThermalReceipt,
  generateHTMLReceipt,
  generateHTMLReceiptReference,
  printThermalReceipt,
  printHTMLReceipt,
  PRINTER_CONFIGS
};
