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
        alignItems: 'stretch',
        padding: 0
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: theme.spacing.xl
        }}
      >
        <div style={{
          backgroundColor: theme.colors.success + '20',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.md,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            <span className="material-icons" style={{ fontSize: '50px', color: theme.colors.success }}>
              check_circle
            </span>
          </motion.div>
          
          {/* Circle animation for the checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `1px solid ${theme.colors.success}50`
            }}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <h2 style={{ 
            fontSize: theme.typography.sizes['2xl'], 
            fontWeight: theme.typography.fontWeights.bold, 
            margin: `${theme.spacing.sm} 0`,
            color: theme.colors.text.primary,
            letterSpacing: '-0.01em'
          }}>
            Order Placed Successfully!
          </h2>
          
          <p style={{ 
            fontSize: theme.typography.sizes.lg, 
            color: theme.colors.text.secondary,
            margin: `${theme.spacing.sm} 0 ${theme.spacing.lg} 0`
          }}>
            ✅ Your order #{getFormattedOrderId()} has been placed successfully! Our team will review it shortly and get it confirmed. 🎉
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
          padding: theme.spacing.xl,
          borderRadius: theme.borderRadius.lg,
          marginBottom: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          border: `1px solid ${theme.colors.border}`,
          className: "receipt"
        }}
      >
        {/* Restaurant details in header */}
        <div style={{
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h3 style={{ 
              margin: 0,
              fontSize: theme.typography.sizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary
            }}>
              {restaurant?.name || 'Restaurant Name'}
            </h3>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}>
              {branch?.name || 'Main Branch'}
            </p>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <p style={{ 
              margin: 0,
              color: theme.colors.text.primary,
              fontWeight: theme.typography.fontWeights.semibold
            }}>
              Order #{getFormattedOrderId()}
            </p>
            <p style={{ 
              margin: `${theme.spacing.xs} 0 0 0`,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm
            }}>
              {getFormattedDate()}
            </p>
          </div>
        </div>
        
        {/* Order type and status badges */}
        <div style={{
          display: 'flex',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.primary + '15',
            color: theme.colors.primary,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.pill,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>
              {orderType === 'dineIn' ? 'restaurant' : 'takeout_dining'}
            </span>
            {orderType === 'dineIn' ? 'Dine In' : 'Takeaway'}
          </div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: '#d1f5d3',
            color: theme.colors.success,
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            borderRadius: theme.borderRadius.pill,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.medium
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>
              pending
            </span>
            {currentOrder?.status || 'Processing'}
          </div>
          
          {table && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.background,
              color: theme.colors.text.primary,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.pill,
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              border: `1px solid ${theme.colors.border}`
            }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>
                table_bar
              </span>
              Table: {table?.name || 'Table'}
            </div>
          )}
        </div>
        
        {/* Customer details */}
        <div style={{
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg
        }}>
          <h4 style={{ 
            margin: 0, 
            marginBottom: theme.spacing.sm,
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.primary
          }}>
            Customer Details:
          </h4>
          
          {(currentOrder?.customerInfo || currentOrder?.customerName || currentOrder?.customerPhone || currentOrder?.customerEmail) ? (
            <div style={{ fontSize: theme.typography.sizes.sm }}>
              <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>person</span>
                <strong>Name:</strong> {currentOrder.customerInfo?.name || currentOrder.customerName || 'Guest Customer'}
              </p>
              
              {(currentOrder.customerInfo?.phone || currentOrder.customerPhone) && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>phone</span>
                  <strong>Phone:</strong> {currentOrder.customerInfo?.phone || currentOrder.customerPhone}
                </p>
              )}
              
              {(currentOrder.customerInfo?.email || currentOrder.customerEmail) && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>email</span>
                  <strong>Email:</strong> {currentOrder.customerInfo?.email || currentOrder.customerEmail}
                </p>
              )}
              
              {orderType === 'takeaway' && (currentOrder.customerInfo?.address || currentOrder.customerAddress) && (
                <p style={{ margin: `${theme.spacing.xs} 0`, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                  <span className="material-icons" style={{ fontSize: '16px', color: theme.colors.text.secondary }}>location_on</span>
                  <strong>Address:</strong> {currentOrder.customerInfo?.address || currentOrder.customerAddress}
                </p>
              )}
            </div>
          ) : (
            <div style={{ 
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              fontStyle: 'italic'
            }}>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                <span className="material-icons" style={{ fontSize: '16px' }}>person</span>
                Guest Customer - No customer details provided
              </p>
            </div>
          )}
        </div>
        
        {/* Order items table */}
        <h4 style={{ 
          margin: 0, 
          marginBottom: theme.spacing.md,
          fontSize: theme.typography.sizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.text.primary
        }}>
          Order Items:
        </h4>
        
        <div style={{
          marginBottom: theme.spacing.lg,
          borderRadius: theme.borderRadius.md,
          overflow: 'hidden'
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '20px 1fr auto auto',
            gap: theme.spacing.md,
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.background,
            borderBottom: `1px solid ${theme.colors.border}`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: theme.colors.text.secondary
          }}>
            <div>Qty</div>
            <div>Item</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
          </div>
          
          {/* Table rows - use currentOrder.items if available, otherwise fallback to cartItems */}
          {(currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems).length > 0 ? (
            (currentOrder?.items && currentOrder.items.length > 0 ? currentOrder.items : cartItems).map((item, index) => {
              // Handle different data structures between order items and cart items
              const itemName = item.name || item.title;
              const itemQuantity = item.quantity;
              const itemPrice = item.price;
              const itemOptions = sanitizeOptions(item.selectedOptions || []);
              const itemKey = item.menuItemId || item.id || item._id || index;
              
              return (
                <div 
                  key={`${itemKey}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr auto auto',
                    gap: theme.spacing.md,
                    padding: theme.spacing.sm,
                    borderBottom: `1px solid ${theme.colors.border}10`,
                    fontSize: theme.typography.sizes.md,
                  }}
                >
                  <div style={{ color: theme.colors.text.primary, fontWeight: theme.typography.fontWeights.semibold }}>{itemQuantity}</div>
                  <div>
                    <div style={{ color: theme.colors.text.primary, textTransform: 'capitalize', textAlign: 'left' }}>{itemName}</div>

                    {/* Item options/notes */}
                    {itemOptions && itemOptions.length > 0 ? (
                      <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, marginTop: '2px' }}>
                        {itemOptions.map((option, optIndex) => (
                          <span key={`${option.category}-${optIndex}`}>
                            {option.name}: {option.value}
                            {optIndex < itemOptions.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
          ) : item.notes && (
                      <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.secondary, marginTop: '2px' }}>
            {sanitizeNotes(item.notes)}
                      </div>
                    )}
                  </div>
                  <div style={{ color: theme.colors.text.secondary, textAlign: 'right' }}>
                    <CurrencyDisplay amount={itemPrice} />
                  </div>
                  <div style={{ fontWeight: theme.typography.fontWeights.semibold, textAlign: 'right' }}>
                    <CurrencyDisplay amount={itemPrice * itemQuantity} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              padding: theme.spacing.lg,
              textAlign: 'center',
              color: theme.colors.text.secondary,
              fontSize: theme.typography.sizes.sm,
              fontStyle: 'italic'
            }}>
              No items found in this order
            </div>
          )}
        </div>
        
        {/* Order Notes */}
        {(currentOrder?.notes || orderNote) && (
          <div style={{
            marginBottom: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.sizes.sm
          }}>
            <h4 style={{ 
              margin: 0, 
              marginBottom: theme.spacing.sm,
              fontSize: theme.typography.sizes.md,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.text.primary,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span className="material-icons" style={{ fontSize: '18px', color: theme.colors.warning }}>note</span>
              Order Notes:
            </h4>
            <p style={{ 
              margin: 0,
              fontStyle: 'italic',
              color: theme.colors.text.secondary
            }}>
              "{currentOrder?.notes || orderNote}"
            </p>
          </div>
        )}
        
        {/* Order Total Summary */}
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: theme.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: theme.spacing.xs
        }}>          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>
            <span>Subtotal:</span>
            <span><CurrencyDisplay amount={subtotal} /></span>
          </div>
            <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary
          }}>            
            <TaxInfo subtotal={subtotal} />
          </div>
          
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            width: '200px',
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.text.primary,
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.sm,
            borderTop: `1px solid ${theme.colors.border}20`
          }}>
            <span>Total:</span>
            <span><CurrencyDisplay amount={total} /></span>
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
          gap: theme.spacing.sm, 
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: `0 ${theme.spacing.sm}` // Add horizontal padding for small screens
        }}
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Use resetCartAndOrder to properly reset everything
            resetCartAndOrder();
            // Dispatch event to close the cart modal and return to menu
            document.dispatchEvent(new CustomEvent('resetCart', { 
              detail: { action: 'closeModal' } 
            }));
          }}
          style={{
            flex: '1 1 auto',
            minWidth: '140px', // Minimum width for readability
            maxWidth: '200px', // Maximum width to prevent buttons from being too wide
            backgroundColor: theme.colors.primary,
            color: theme.colors.text.light,
            border: 'none',
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.sm} ${theme.spacing.xs}`, // Reduced padding for small screens
            fontSize: theme.typography.sizes.sm, // Smaller font size for better fit
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast,
            boxShadow: theme.shadows.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs, // Reduced gap
            whiteSpace: 'nowrap' // Prevent text wrapping
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>restaurant_menu</span>
          <span>
            Back to Menu
          </span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDownloadReceipt}
          disabled={isDownloading}
          style={{
            flex: '1 1 auto',
            minWidth: '140px',
            maxWidth: '200px',
            backgroundColor: isDownloading ? theme.colors.background : 'white',
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            whiteSpace: 'nowrap'
          }}
        >
          {isDownloading ? (
            <>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.1)',
                borderTopColor: theme.colors.text.primary,
                animation: 'spin 1s linear infinite',
              }} />
              <span>
                Downloading...
              </span>
            </>
          ) : (
            <>
              <span className="material-icons" style={{ fontSize: '18px' }}>picture_as_pdf</span>
              <span style={{ 
                '@media (max-width: 480px)': { display: 'none' }
              }}>
                Download PDF
              </span>
            </>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            // Use resetCartAndOrder to completely reset for a new order
            resetCartAndOrder();
            // Dispatch event to set checkout step back to cart but keep modal open
            document.dispatchEvent(new CustomEvent('resetCart', { 
              detail: { action: 'newOrder' } 
            }));
          }}
          style={{
            flex: '1 1 auto',
            minWidth: '140px',
            maxWidth: '200px',
            backgroundColor: theme.colors.background,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            cursor: 'pointer',
            transition: theme.transitions.fast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            whiteSpace: 'nowrap'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>add_shopping_cart</span>
          <span>
            Start New Order
          </span>
        </motion.button>
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
          .no-print {
            gap: 8px !important;
            padding: 0 8px !important;
          }
        }
        
        @media (max-width: 480px) {
          .no-print {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .no-print button {
            width: 100% !important;
            max-width: none !important;
            min-width: auto !important;
            justify-content: center !important;
          }
          
           
          
          .no-print button .material-icons {
            margin-right: 0 !important;
          }
        }
        
        @media (max-width: 360px) {
          .order-confirmation-buttons {
            padding: 0 4px !important;
          }
        }
      `}</style>
    </motion.div>
  );
});

export default OrderConfirmation;
