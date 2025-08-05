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
    name: restaurantName = 'Restaurant Name',
    address = 'Restaurant Address',
    phone = 'Phone Number',
    email = 'Email Address',
    gst = 'GST Number'
  } = restaurantInfo;

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
    
    // Customizations
    if (item.customizations && item.customizations.length > 0) {
      item.customizations.forEach(custom => {
        receipt += `  + ${custom}` + COMMANDS.CRLF;
      });
    }
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
  
  receipt += `Method: ${paymentDetails.method.toUpperCase()}` + COMMANDS.CRLF;
  receipt += `Status: ${order.paymentStatus.toUpperCase()}` + COMMANDS.CRLF;
  
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
    name: restaurantName = 'Restaurant Name',
    address = 'Restaurant Address',
    phone = 'Phone Number',
    email = 'Email Address',
    gst = 'GST Number'
  } = restaurantInfo;

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
        ${item.customizations ? item.customizations.map(custom => 
          `<div class="customization">+ ${custom}</div>`
        ).join('') : ''}
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
      <div>Method: ${paymentDetails.method.toUpperCase()}</div>
      <div>Status: ${order.paymentStatus.toUpperCase()}</div>
      ${paymentDetails.method === 'cash' ? `
        <div>Amount Received: ${formatCurrency(paymentDetails.amountReceived)}</div>
        ${paymentDetails.change > 0 ? `<div>Change: ${formatCurrency(paymentDetails.change)}</div>` : ''}
      ` : ''}
      ${paymentDetails.method === 'card' && paymentDetails.cardNumber ? `
        <div>Card: ****${paymentDetails.cardNumber.slice(-4)}</div>
        ${paymentDetails.cardHolder ? `<div>Holder: ${paymentDetails.cardHolder}</div>` : ''}
      ` : ''}
      ${paymentDetails.method === 'upi' && paymentDetails.upiId ? `
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
  printThermalReceipt,
  printHTMLReceipt,
  PRINTER_CONFIGS
};
