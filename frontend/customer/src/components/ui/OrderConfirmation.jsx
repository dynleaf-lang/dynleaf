import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTax } from '../../context/TaxContext';
import CurrencyDisplay from '../Utils/CurrencyFormatter';
import { useOrderType } from '../ui/EnhancedCart';
import { theme } from '../../data/theme';
import TaxInfo from './TaxInfo';
import jsPDF from 'jspdf';

// Enhanced OrderConfirmation component with better visuals and functionality
const OrderConfirmation = memo(() => {  
  const { 
    cartItems, 
    cartTotal, 
    orderNote, 
    clearCart, 
    resetCartAndOrder,
    currentOrder, 
    orderError 
  } = useCart();
  const { restaurant, branch, table } = useRestaurant();
  const { orderType } = useOrderType();
  const { taxName, taxRate, formattedTaxRate, calculateTax } = useTax();
  const { currencySymbol, formatCurrency } = useCurrency();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  
  // Sanitize helper: remove synthetic variant-group artifacts (vg:*) and per-character entries
  const sanitizeOptions = (opts) => {
    if (!Array.isArray(opts)) return [];
    return opts.filter(o => {
      if (!o) return false;
      const cat = String(o.category || '').toLowerCase();
      const name = String(o.name || '');
      const val = String(o.value || '');
      // Drop synthetic variant-group keys and per-character artifacts
      if (cat.startsWith('vg:')) return false;
      if (/^\d+$/.test(name) && val.length <= 2) return false; // e.g., name='0', value='E'
      if (!name || !val) return false;
      return true;
    });
  };

  const sanitizeNotes = (notes) => {
    const text = String(notes || '').trim();
    if (!text) return '';
    // Remove tokens like "vg:Add-ons: E" or empty "vg:Add-ons:" fragments
    let cleaned = text
      .replace(/(?:^|,\s*)vg:[^:]+:\s*[A-Za-z](?=,|$)/gi, '')
      .replace(/(?:^|,\s*)vg:[^:]+:\s*(?=,|$)/gi, '')
      .replace(/\s*,\s*,+/g, ', ') // collapse duplicate commas
      .replace(/^\s*,\s*|\s*,\s*$/g, '') // trim leading/trailing commas
      .trim();
    return cleaned;
  };
  
  // Only show error banner if there's an error AND no valid order was created
  const shouldShowErrorBanner = orderError && (!currentOrder || !currentOrder._id);
  const [showErrorBanner, setShowErrorBanner] = useState(shouldShowErrorBanner);
  
  // Update error banner visibility when dependencies change
  useEffect(() => {
    setShowErrorBanner(shouldShowErrorBanner);
  }, [shouldShowErrorBanner, orderError, currentOrder]);
  
  // Function to get a formatted order ID for display
  const getFormattedOrderId = () => {
    if (currentOrder && currentOrder._id) {
      return currentOrder._id.substring(0, 8).toUpperCase();
    }
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };
  
  // Function to get formatted date
  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle download PDF receipt button
  const handleDownloadReceipt = () => {
    setIsDownloading(true);
    
    setTimeout(() => {
      try {
        // Create a new PDF instance
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Set font
        pdf.setFont('helvetica');
        
        // PDF dimensions
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        
        let yPosition = margin;
        
        // Helper function to add text and manage page breaks
        const addText = (text, fontSize = 10, style = 'normal', align = 'left') => {
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', style);
          
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }
          
          if (align === 'center') {
            pdf.text(text, pageWidth / 2, yPosition, { align: 'center' });
          } else if (align === 'right') {
            pdf.text(text, pageWidth - margin, yPosition, { align: 'right' });
          } else {
            pdf.text(text, margin, yPosition);
          }
          
          yPosition += fontSize * 0.5 + 2;
          return yPosition;
        };
        
        // Helper function to add a line
        const addLine = (thickness = 0.5) => {
          pdf.setLineWidth(thickness);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        };
        
        // Header - Restaurant Info
        addText(restaurant?.name || 'Restaurant Name', 16, 'bold', 'center');
        addText(branch?.name || 'Main Branch', 12, 'normal', 'center');
        yPosition += 5;
        addLine(1);
        
        // Order Information
        addText(`Order #${getFormattedOrderId()}`, 14, 'bold');
        addText(`Date: ${getFormattedDate()}`, 10);
        yPosition += 5;
        
        // Customer Information Section
        addText('Customer Information', 12, 'bold');
        addLine(0.3);
        
        const customerName = currentOrder?.customerInfo?.name || currentOrder?.customerName || 'Guest Customer';
        addText(`Name: ${customerName}`, 10);
        
        const customerPhone = currentOrder?.customerInfo?.phone || currentOrder?.customerPhone;
        if (customerPhone) {
          addText(`Phone: ${customerPhone}`, 10);
        }
        
        const customerEmail = currentOrder?.customerInfo?.email || currentOrder?.customerEmail;
        if (customerEmail) {
          addText(`Email: ${customerEmail}`, 10);
        }
        
        const customerAddress = currentOrder?.customerInfo?.address || currentOrder?.customerAddress;
        if (orderType === 'takeaway' && customerAddress) {
          addText(`Address: ${customerAddress}`, 10);
        }
        
        yPosition += 5;
        
        // Order Details Section
        addText('Order Details', 12, 'bold');
        addLine(0.3);
        
        addText(`Order Type: ${orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}`, 10);
        if (table) {
          addText(`Table: ${table.name || 'Table'}`, 10);
        }
        addText(`Status: ${currentOrder?.status || 'Processing'}`, 10);
        yPosition += 5;
        
        // Order Items Section
        addText('Order Items', 12, 'bold');
        addLine(0.3);
        
        // Items table header
        const tableStartY = yPosition;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        
        const colWidths = {
          qty: 15,
          item: contentWidth * 0.5,
          price: contentWidth * 0.2,
          total: contentWidth * 0.2
        };
        
        let xPos = margin;
        pdf.text('Qty', xPos, yPosition);
        xPos += colWidths.qty;
        pdf.text('Item', xPos, yPosition);
        xPos += colWidths.item;
        pdf.text('Unit Price', xPos, yPosition, { align: 'right' });
        xPos += colWidths.price;
        pdf.text('Total', pageWidth - margin, yPosition, { align: 'right' });
        
        yPosition += 5;
        addLine(0.3);
        
        // Items data
        const displayItems = currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems;
        
  pdf.setFont('helvetica', 'normal');
  displayItems.forEach((item) => {
          const itemName = item.name || item.title;
          const itemQuantity = item.quantity;
          const itemPrice = item.price;
          
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          
          xPos = margin;
          pdf.text(String(itemQuantity), xPos, yPosition);
          xPos += colWidths.qty;
          
          // Handle long item names
          const maxItemWidth = colWidths.item - 5;
          const itemLines = pdf.splitTextToSize(itemName, maxItemWidth);
          pdf.text(itemLines, xPos, yPosition);
          
          xPos += colWidths.item;
          const unitPriceText = formatCurrency ? formatCurrency(itemPrice) : `${currencySymbol || '$'}${itemPrice.toFixed(2)}`;
          pdf.text(unitPriceText, xPos + colWidths.price, yPosition, { align: 'right' });
          
          const totalPriceText = formatCurrency ? formatCurrency(itemPrice * itemQuantity) : `${currencySymbol || '$'}${(itemPrice * itemQuantity).toFixed(2)}`;
          pdf.text(totalPriceText, pageWidth - margin, yPosition, { align: 'right' });
          
          yPosition += Math.max(itemLines.length * 4, 8);
          
          // Add item options/notes if available
          const itemOptions = sanitizeOptions(item.selectedOptions);
          if (itemOptions.length > 0) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            const optionsText = itemOptions.map(opt => `${opt.name}: ${opt.value}`).join(', ');
            const optionsLines = pdf.splitTextToSize(`   ${optionsText}`, maxItemWidth);
            pdf.text(optionsLines, margin + colWidths.qty, yPosition - 2);
            yPosition += optionsLines.length * 3;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
          } else if (item.notes) {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            const cleaned = sanitizeNotes(item.notes);
            const notesLines = pdf.splitTextToSize(`   ${cleaned}`, maxItemWidth);
            pdf.text(notesLines, margin + colWidths.qty, yPosition - 2);
            yPosition += notesLines.length * 3;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
          }
        });
        
        yPosition += 5;
        addLine(1);
        
        // Order Notes
        if (currentOrder?.notes || orderNote) {
          addText('Special Instructions', 12, 'bold');
          addLine(0.3);
          pdf.setFontSize(10);
          const notesText = currentOrder?.notes || orderNote;
          const notesLines = pdf.splitTextToSize(notesText, contentWidth);
          notesLines.forEach(line => {
            addText(line, 10, 'italic');
          });
          yPosition += 5;
        }
        
        // Payment Summary
        addText('Payment Summary', 12, 'bold');
        addLine(0.3);
        
        const summaryX = pageWidth - margin - 60;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const subtotalText = formatCurrency ? formatCurrency(subtotal) : `${currencySymbol || '$'}${subtotal.toFixed(2)}`;
        pdf.text('Subtotal:', summaryX - 40, yPosition);
        pdf.text(subtotalText, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 6;
        
        const taxText = formatCurrency ? formatCurrency(tax) : `${currencySymbol || '$'}${tax.toFixed(2)}`;
        pdf.text(`${taxName || 'Tax'}:`, summaryX - 40, yPosition);
        pdf.text(taxText, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 8;
        
        addLine(0.5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        const totalText = formatCurrency ? formatCurrency(total) : `${currencySymbol || '$'}${total.toFixed(2)}`;
        pdf.text('TOTAL:', summaryX - 40, yPosition);
        pdf.text(totalText, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 10;
        
        addLine(1);
        
        // Footer
        yPosition += 5;
        addText('Thank you for your order!', 11, 'bold', 'center');
        addText('Visit us again soon.', 9, 'normal', 'center');
        yPosition += 10;
        addText(`Generated on: ${new Date().toLocaleString()}`, 8, 'italic', 'center');
        
        // Save the PDF
        const fileName = `receipt-${getFormattedOrderId()}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
      } catch (error) {
        console.error('Error generating PDF receipt:', error);
        // Fallback to text download if PDF generation fails
        const receiptContent = `
═══════════════════════════════════════
${restaurant?.name || 'Restaurant Name'}
${branch?.name || 'Main Branch'}
═══════════════════════════════════════

Order #${getFormattedOrderId()}
Date: ${getFormattedDate()}

Customer Information:
${currentOrder?.customerInfo?.name || currentOrder?.customerName || 'Guest Customer'}
${currentOrder?.customerInfo?.phone || currentOrder?.customerPhone ? `Phone: ${currentOrder.customerInfo?.phone || currentOrder.customerPhone}` : ''}
${currentOrder?.customerInfo?.email || currentOrder?.customerEmail ? `Email: ${currentOrder.customerInfo?.email || currentOrder.customerEmail}` : ''}

Order Details:
Order Type: ${orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}
${table ? `Table: ${table.name || 'Table'}` : ''}
Status: ${currentOrder?.status || 'Processing'}

ORDER ITEMS:
${(currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems)
  .map(item => {
    const itemPrice = formatCurrency ? formatCurrency(item.price) : `${currencySymbol || '$'}${item.price.toFixed(2)}`;
    const itemTotal = formatCurrency ? formatCurrency(item.price * item.quantity) : `${currencySymbol || '$'}${(item.price * item.quantity).toFixed(2)}`;
    const opts = sanitizeOptions(item.selectedOptions);
    const notes = sanitizeNotes(item.notes);
    const extra = opts.length > 0 ? `\n   Options: ${opts.map(o => `${o.name}: ${o.value}`).join(', ')}` : (notes ? `\n   Notes: ${notes}` : '');
    return `${item.quantity}x ${item.name || item.title}
   Unit Price: ${itemPrice}
   Total: ${itemTotal}${extra}`;
  }).join('\n\n')}

═══════════════════════════════════════
PAYMENT SUMMARY:
───────────────────────────────────────
Subtotal: ${formatCurrency ? formatCurrency(subtotal) : `${currencySymbol || '$'}${subtotal.toFixed(2)}`}
${taxName || 'Tax'}: ${formatCurrency ? formatCurrency(tax) : `${currencySymbol || '$'}${tax.toFixed(2)}`}
───────────────────────────────────────
TOTAL: ${formatCurrency ? formatCurrency(total) : `${currencySymbol || '$'}${total.toFixed(2)}`}
═══════════════════════════════════════

${(currentOrder?.notes || orderNote) ? `Special Instructions:\n${sanitizeNotes(currentOrder?.notes || orderNote)}\n\n` : ''}Thank you for your order!
Visit us again soon.

Generated on: ${new Date().toLocaleString()}
        `;
        
        const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${getFormattedOrderId()}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      setIsDownloading(false);
    }, 500);
  };
    // Calculate totals - use currentOrder totals if available, otherwise calculate from cartItems
  const displayItems = currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems;
  const subtotal = currentOrder?.subtotal || displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = currentOrder?.taxAmount || calculateTax(subtotal); // Dynamic tax calculation based on country
  const total = currentOrder?.total || (subtotal + tax);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="print-section"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 0,
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.1)'
      }}
    >
      {/* Warning banner - only show if there's an error AND no successful order */}
      {shouldShowErrorBanner && showErrorBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: theme.colors.warning + '15',
            borderLeft: `4px solid ${theme.colors.warning}`,
            color: theme.colors.warning,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.lg,
            fontSize: theme.typography.sizes.sm,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
              <span className="material-icons" style={{ fontSize: '20px' }}>info</span>
              <span>
                {currentOrder && currentOrder._id ? (
                  <>
                    Your order was processed successfully, but there may have been minor issues during submission.
                    <br />Your order #{getFormattedOrderId()} is confirmed and being prepared.
                  </>
                ) : (
                  <>
                    There was an issue processing your order, but we've created a temporary order record.
                    <br />Please save your order details or contact support if needed.
                  </>
                )}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: theme.spacing.md,
              marginTop: theme.spacing.xs,
              paddingLeft: theme.spacing.xl
            }}>
              <motion.button
                onClick={handleDownloadReceipt}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  backgroundColor: theme.colors.primary + '15',
                  color: theme.colors.primary,
                  border: `1px solid ${theme.colors.primary}30`,
                  borderRadius: theme.borderRadius.sm,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  fontSize: theme.typography.sizes.xs,
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>picture_as_pdf</span>
                Download PDF
              </motion.button>
              <motion.button
                onClick={() => {
                  clearCart();
                  document.dispatchEvent(new CustomEvent('goToMenu'));
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  backgroundColor: theme.colors.success + '15',
                  color: theme.colors.success,
                  border: `1px solid ${theme.colors.success}30`,
                  borderRadius: theme.borderRadius.sm,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  fontSize: theme.typography.sizes.xs,
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}
              >
                <span className="material-icons" style={{ fontSize: '14px' }}>restaurant_menu</span>
                Return to Menu
              </motion.button>
            </div>
          </div>
          
          <button 
            onClick={() => setShowErrorBanner(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: theme.colors.text.secondary,
              display: 'flex',
              padding: theme.spacing.xs,
              marginLeft: theme.spacing.md
            }}
          >
            <span className="material-icons">close</span>
          </button>
        </motion.div>
      )}
      
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 15
        }}
        style={{
          background: '#28a745',
          padding: '32px 24px',
          textAlign: 'center',
          color: 'white',
          borderRadius: '16px 16px 0 0',
          marginBottom: 0
        }}
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="material-icons"
            style={{ fontSize: '32px', color: 'white' }}
          >
            check
          </motion.span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <h2 style={{ 
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            Order Placed Successfully!
          </h2>
          
          <p style={{ 
            fontSize: '16px',
            opacity: 0.9,
            margin: 0,
            fontWeight: '400'
          }}>
            Your order has been confirmed
          </p>
        </motion.div>
      </motion.div>
      
      {/* Order details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '0 0 16px 16px',
          marginBottom: '20px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.1), 0 8px 10px rgba(0,0,0,0.1)',
          className: "receipt"
        }}
      >
        {/* Order details section */}
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#333',
              letterSpacing: '-0.01em'
            }}>
              Order #{getFormattedOrderId()}
            </h3>
            
            <span style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Confirmed
            </span>
          </div>

          {/* Order Type & Time */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '4px',
                fontWeight: '500'
              }}>
                Order Type
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#333',
                textTransform: 'capitalize'
              }}>
                {orderType === 'dineIn' ? 'DineIn' : 'Takeaway'}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '4px',
                fontWeight: '500'
              }}>
                Order Time
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} AM
              </div>
            </div>
          </div>
        </div>
        
        {/* Order items summary with show/hide details */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#333'
            }}>
              Order Summary
            </h4>
            
            <button
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc3545',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '500'
              }}
            >
              {showOrderDetails ? 'Hide' : 'Show'} Details
              <span className="material-icons" style={{ fontSize: '16px' }}>
                {showOrderDetails ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>
          </div>

          {/* Items List - Only show when expanded */}
          {showOrderDetails && (
            <div style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {(currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems).map((item, index) => {
                const itemName = item.name || item.title;
                const itemQuantity = item.quantity;
                const itemPrice = item.price;
                const itemOptions = sanitizeOptions(item.selectedOptions || []);
                const itemKey = item.menuItemId || item.id || item._id || index;
                
                return (
                  <div 
                    key={`${itemKey}-${index}`}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < (currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems).length - 1 ? '1px solid #e9ecef' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#333',
                        marginBottom: '2px'
                      }}>
                        {itemName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        Qty: {itemQuantity}
                      </div>
                      {itemOptions && itemOptions.length > 0 && (
                        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                          {itemOptions.map(opt => `${opt.name}: ${opt.value}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      <CurrencyDisplay amount={itemPrice * itemQuantity} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Price Summary */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Subtotal</span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                <CurrencyDisplay amount={subtotal} />
              </span>
            </div>
            
            {tax > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ color: '#666', fontSize: '14px' }}>Tax</span>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  <CurrencyDisplay amount={tax} />
                </span>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid #dee2e6',
              fontSize: '16px',
              fontWeight: '700',
              color: '#333'
            }}>
              <span>Total Paid</span>
              <span><CurrencyDisplay amount={total} /></span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Footer buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="no-print order-confirmation-buttons"
        style={{ 
          display: 'flex', 
          gap: '12px', 
          flexDirection: 'column',
          padding: '0 24px 24px 24px'
        }}
      >
        {/* Primary Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            resetCartAndOrder();
            document.dispatchEvent(new CustomEvent('resetCart', { 
              detail: { action: 'closeModal' } 
            }));
          }}
          style={{
            padding: '16px 24px',
            borderRadius: '8px',
            backgroundColor: '#dc3545',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <span className="material-icons">clear</span>
          Back to Menu
        </motion.button>

        {/* Secondary Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadReceipt}
            disabled={isDownloading}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: isDownloading ? '#999' : '#dc3545',
              fontWeight: '500',
              fontSize: '14px',
              border: '1px solid #dc3545',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {isDownloading ? (
              <>
                <div style={{ 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.1)',
                  borderTopColor: '#dc3545',
                  animation: 'spin 1s linear infinite',
                }} />
                Downloading...
              </>
            ) : (
              <>
                <span className="material-icons" style={{ fontSize: '16px' }}>picture_as_pdf</span>
                Download PDF
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              resetCartAndOrder();
              document.dispatchEvent(new CustomEvent('resetCart', { 
                detail: { action: 'newOrder' } 
              }));
            }}
            style={{
              padding: '12px 16px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: '#666',
              fontWeight: '500',
              fontSize: '14px',
              border: '1px solid #dee2e6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>add_shopping_cart</span>
            New Order
          </motion.button>
        </div>
      </motion.div>

      {/* Footer Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          backgroundColor: '#f8f9fa',
          padding: '16px 24px',
          textAlign: 'center',
          borderTop: '1px solid #dee2e6',
          borderRadius: '0 0 16px 16px'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🎉</span>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#666',
            lineHeight: 1.4
          }}>
            Thank you for choosing us! We're preparing your order with care.
          </p>
        </div>
      </motion.div>
      
      {/* Add print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive styles for small screens */
        @media (max-width: 768px) {
          .order-confirmation-buttons {
            padding: 0 16px 16px 16px !important;
          }
        }
        
        @media (max-width: 480px) {
          .order-confirmation-buttons {
            padding: 0 12px 12px 12px !important;
          }
          
          .order-confirmation-buttons button {
            font-size: 13px !important;
            padding: 10px 12px !important;
          }
        }
      `}</style>
    </motion.div>
  );
});

export default OrderConfirmation;
