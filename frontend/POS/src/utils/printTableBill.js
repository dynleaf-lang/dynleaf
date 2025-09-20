import { generateHTMLReceiptReference, printHTMLReceipt } from './thermalPrinter';
import toast from '../utils/notify';

/**
 * Build merged items for a table (local batches first, fallback to active orders) and print reference bill.
 * Params:
 *  table: table object (required)
 *  getOrdersByTable: fn(tableId) -> orders[]
 *  restaurant, branch, user: context meta for header fields
 *  activeOrderCandidate: optional single order
 *  markTablePrinted: optional callback to mark table printed (falls back to localStorage flag)
 */
export function printTableBill({ table, getOrdersByTable, restaurant, branch, user, activeOrderCandidate = null, markTablePrinted }) {
  try {
    if (!table?._id) {
      toast.error('No table selected');
      return false;
    }
    // Helpers
    const normalize = (v) => (String(v || '')).trim().toLowerCase();
    const stableCust = (cust) => {
      try {
        if (!cust || typeof cust !== 'object') return JSON.stringify(cust || {});
        const sorted = Object.keys(cust).sort().reduce((acc, k) => { acc[k] = cust[k]; return acc; }, {});
        return JSON.stringify(sorted);
      } catch { return JSON.stringify(cust || {}); }
    };
    const extractToken = (obj) => {
      try {
        if (!obj) return '';
        const candidates = [
          obj.tokenNumber,
          obj.token,
          obj.token_no,
          obj.tokenNo,
          obj.kotToken,
          obj.kot_number,
          obj.kotNumber
        ];
        const found = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
        return found !== undefined ? String(found) : '';
      } catch { return ''; }
    };

    const batchesKey = 'pos_table_batches';
    const map = JSON.parse(localStorage.getItem(batchesKey) || '{}');
    const savedForTable = map[table._id] || (table.tableId ? map[table.tableId] : null);

    let mergedItems = [];
    let subtotal = 0;
    let sumTax = 0;
    let sumTotal = 0;
    let lastOrderMeta = null;
    let tokenCandidate = '';

    if (savedForTable && Array.isArray(savedForTable.batches) && savedForTable.batches.length) {
      const mergeMap = new Map();
      savedForTable.batches.forEach(batch => {
        const items = Array.isArray(batch?.items) ? batch.items : [];
        items.forEach(it => {
          const displayName = it?.name || it?.itemName || it?.title || 'Item';
          const price = Number(it?.price) || 0;
          const qty = Number(it?.quantity) || 1;
          const cust = it?.customizations || {};
          const key = JSON.stringify({ n: normalize(displayName), p: price, c: stableCust(cust) });
          const prev = mergeMap.get(key) || { name: displayName, price, quantity: 0, customizations: cust };
          prev.quantity += qty;
          mergeMap.set(key, prev);
        });
      });
      mergedItems = [...mergeMap.values()];
      subtotal = mergedItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
      const tableOrders = (getOrdersByTable ? (getOrdersByTable(table._id) || []) : []);
      lastOrderMeta = tableOrders.slice().sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0] || null;
      sumTax = Number(lastOrderMeta?.tax) || 0;
      sumTotal = Number(lastOrderMeta?.totalAmount) || 0;
      tokenCandidate = extractToken(lastOrderMeta) || (tableOrders.slice().reverse().map(extractToken).find(Boolean) || '');
    } else {
      const tableOrders = (getOrdersByTable ? (getOrdersByTable(table._id) || []) : []);
      const kotPlacedStatuses = ['pending','confirmed','accepted','placed','in_progress','preparing','ready','served','delivered','completed'];
      const legacyStatuses = ['pending','processing','completed'];
      const placedOrders = tableOrders.filter(o => {
        const s = (o?.status || '').toLowerCase();
        const ls = (o?.orderStatus || '').toLowerCase();
        return o?.kotPrinted === true || kotPlacedStatuses.includes(s) || kotPlacedStatuses.includes(ls) || legacyStatuses.includes(ls);
      });
      const ordersToPrint = placedOrders.length > 0 ? placedOrders : (activeOrderCandidate ? [activeOrderCandidate] : []);
      if (ordersToPrint.length === 0) {
        toast.error('No orders found for this table to print.');
        return false;
      }
      const mergeMap = new Map();
      ordersToPrint.forEach(o => {
        const items = Array.isArray(o.items) ? o.items : (Array.isArray(o.orderItems) ? o.orderItems : []);
        items.forEach(it => {
          const displayName = it?.name || it?.itemName || it?.title || 'Item';
          const price = Number(it?.price) || 0;
          const qty = Number(it?.quantity) || 1;
          const cust = it?.customizations || {};
            const key = JSON.stringify({ n: normalize(displayName), p: price, c: stableCust(cust) });
          const prev = mergeMap.get(key) || { name: displayName, price, quantity: 0, customizations: cust };
          prev.quantity += qty; mergeMap.set(key, prev);
        });
        sumTax += Number(o?.tax) || 0;
        sumTotal += Number(o?.totalAmount) || 0;
        lastOrderMeta = o;
      });
      mergedItems = [...mergeMap.values()];
      subtotal = mergedItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
      tokenCandidate = (ordersToPrint.slice().reverse().map(extractToken).find(Boolean)) || extractToken(lastOrderMeta) || '';
    }

    if (!mergedItems.length) {
      toast.error('Nothing to print');
      return false;
    }

    const orderData = {
      order: {
        orderNumber: lastOrderMeta?.orderNumber || lastOrderMeta?._id || 'N/A',
        createdAt: lastOrderMeta?.createdAt || new Date().toISOString(),
        items: mergedItems,
        subtotal,
        tax: sumTax || 0,
        discount: Number(lastOrderMeta?.discount) || 0,
        totalAmount: sumTotal || subtotal,
        tokenNumber: (tokenCandidate || lastOrderMeta?.tokenNumber || lastOrderMeta?.token || lastOrderMeta?.token_no || lastOrderMeta?.tokenNo || lastOrderMeta?.kotToken || lastOrderMeta?.kot_number || lastOrderMeta?.kotNumber),
        token: tokenCandidate || undefined,
        cashierName: (lastOrderMeta?.createdByName || lastOrderMeta?.cashierName || lastOrderMeta?.createdBy?.name || lastOrderMeta?.user?.name || user?.name || user?.username),
        createdByName: (lastOrderMeta?.createdByName || lastOrderMeta?.cashierName || lastOrderMeta?.createdBy?.name || user?.name || user?.username),
        createdBy: lastOrderMeta?.createdBy || undefined
      },
      branch: {
        name: branch?.name || branch?.branchName || undefined,
        state: branch?.state || undefined,
        fssaiLicense: branch?.fssaiLicense || undefined
      },
      paymentDetails: {
        method: (lastOrderMeta?.paymentMethod || lastOrderMeta?.paymentMode || 'cash').toString(),
        amountReceived: Number(lastOrderMeta?.amountReceived) || Number(lastOrderMeta?.totalAmount) || subtotal,
        change: Number(lastOrderMeta?.change) || 0,
        cardNumber: lastOrderMeta?.cardNumber || '',
        cardHolder: lastOrderMeta?.cardHolder || '',
        upiId: lastOrderMeta?.upiId || '',
        transactionId: lastOrderMeta?.transactionId || ''
      },
      customerInfo: lastOrderMeta?.customerInfo || {
        name: lastOrderMeta?.customerName || 'Walk-in Customer',
        phone: lastOrderMeta?.customerPhone || '',
        orderType: lastOrderMeta?.orderType || 'dine-in'
      },
      tableInfo: { name: table.TableName || table.name || table.tableNumber || 'Table', _id: table._id }
    };

    const restaurantInfo = {
      name: (restaurant?.brandName || restaurant?.name || user?.restaurantName || 'Restaurant'),
      brandName: restaurant?.brandName || restaurant?.name || user?.restaurantName || undefined,
      branchName: branch?.name || branch?.branchName || user?.branchName || undefined,
      logo: restaurant?.logo || user?.restaurantLogo || undefined,
      address: branch?.address || branch?.addressLine || 'Address',
      phone: branch?.phone || branch?.contactNumber || '',
      email: restaurant?.email || '',
      state: restaurant?.state || undefined,
      gstRegistrations: Array.isArray(restaurant?.gstRegistrations) ? restaurant.gstRegistrations : undefined,
      gst: (branch?.gst || branch?.gstNumber || restaurant?.gstNumber) || undefined,
      fssaiLicense: branch?.fssaiLicense || undefined
    };

    const html = generateHTMLReceiptReference(orderData, restaurantInfo, { duplicateReceipt: false });
    const result = printHTMLReceipt(html);
    if (result?.success) {
      toast.success('Printing started');
      if (markTablePrinted) {
        markTablePrinted(table._id);
      } else {
        try {
          const printedKey = 'pos_table_bill_printed';
            const printed = JSON.parse(localStorage.getItem(printedKey) || '{}');
          printed[table._id] = true; localStorage.setItem(printedKey, JSON.stringify(printed));
        } catch {}
      }
      return true;
    } else {
      toast.error(result?.error || 'Failed to print');
      return false;
    }
  } catch (err) {
    console.error('Print error:', err);
    toast.error('Print failed');
    return false;
  }
}
