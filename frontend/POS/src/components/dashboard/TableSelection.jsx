import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  CardBody, 
  Button, 
  Badge, 
  Input, 
  InputGroup,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalHeader,
  ModalBody, 
  ModalFooter,
  Spinner,
  Alert,
  ButtonGroup,
  Container
} from 'reactstrap';
import { 
  FaTable, 
  FaSearch, 
  FaFilter, 
  FaUsers, 
  FaClock, 
  FaCheckCircle,
  FaExclamationTriangle, 
  FaSync,
  FaPlus,
  FaPhone,
  FaEye,
  FaPrint,
  FaUtensils,
  FaSnowflake,
  FaFan,
  FaMapMarkerAlt,
  FaCalendarPlus,
  FaHandPaper,
  FaCog,
  FaTh,
  FaList
} from 'react-icons/fa';
import { usePOS } from '../../context/POSContext';
import { useOrder } from '../../context/OrderContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import './TableSelection.css';
import { generateHTMLReceipt, printHTMLReceipt } from '../../utils/thermalPrinter';
import axios from 'axios';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { renderToStaticMarkup } from 'react-dom/server';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

const TableSelection = () => {
  const { 
    tables, 
    floors,
    loading, 
    error, 
    selectedTable, 
    selectTable, 
    clearSelectedTable,
    updateTableStatus,
  refreshData,
  // reservation APIs
  getTableReservations,
  createReservation: apiCreateReservation,
  updateReservation: apiUpdateReservation,
  cancelReservation: apiCancelReservation,
  // customer helpers
  findCustomerByPhone,
  createCustomerIfNeeded
  } = usePOS();
  
  const { getOrdersByTable } = useOrder();
  const { cartItems, customerInfo, replaceCart } = useCart();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTableForDetails, setSelectedTableForDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false); 
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    tableId: '',
    name: '',
    phone: '',
    partySize: 2,
    date: new Date().toISOString().slice(0,10),
    startTime: new Date().toTimeString().slice(0,5), // HH:mm
    durationMinutes: 60,
    notes: ''
  });
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationError, setReservationError] = useState('');
  // Server-side reservations cache: { [tableId]: Array<reservation> }
  const [reservationsByTable, setReservationsByTable] = useState({});
  const [showContactlessModal, setShowContactlessModal] = useState(false);
  // Contactless state
  const [contactlessBaseUrl, setContactlessBaseUrl] = useState('');
  const [contactlessTableId, setContactlessTableId] = useState('');
  const [generatedQRUrl, setGeneratedQRUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetTableId, setMoveTargetTableId] = useState('');
  const [quickFilter, setQuickFilter] = useState('none'); // none | running | printed | kot

  // Customer phone suggestions (similar to CartSidebar Customer Information)
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);

  const normalizePhone = (phone) => (phone || '').replace(/\D/g, '');

  const triggerCustomerSearch = (query) => {
    const q = (query || '').trim();
    if (!q || q.length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    setIsSearchingCustomers(true);
    axios
      .get(`${API_BASE_URL}/customers`, { params: { search: q } })
      .then((resp) => {
        const list = Array.isArray(resp.data) ? resp.data : [];
        setCustomerSuggestions(list.slice(0, 8));
      })
      .catch(() => setCustomerSuggestions([]))
      .finally(() => setIsSearchingCustomers(false));
  };

  const debouncedSearch = (query) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => triggerCustomerSearch(query), 300);
  };

  const handlePhoneInputChange = (val) => {
    const cleaned = normalizePhone(val);
    setReservationForm(f => ({ ...f, phone: cleaned }));
    setShowPhoneSuggestions(true);
    if (cleaned.length >= 3) {
      debouncedSearch(cleaned);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (cust) => {
    setReservationForm(f => ({
      ...f,
      name: cust.name || f.name || 'Walk-in',
      phone: normalizePhone(cust.phone || f.phone || '')
    }));
    setShowPhoneSuggestions(false);
    setCustomerSuggestions([]);
    toast.success('Customer selected');
  };

  // Unified refresh: clear filters and reload data
  const handleRefresh = useCallback(async () => {
    try {
      setSearchTerm('');
      setStatusFilter('all');
      setSelectedFloor('all');
      setQuickFilter('none');
      await refreshData();
      await loadTodayReservations();
      toast.success('Refreshed');
    } catch (_) {
      toast.error('Failed to refresh');
    }
  }, [refreshData]);

  // Contactless helpers
  const resolveCustomerBaseUrl = useCallback(() => {
    // Priority: env -> localStorage -> heuristic
    const envUrl = import.meta?.env?.VITE_CUSTOMER_BASE_URL;
    const stored = localStorage.getItem('pos_customer_base_url');
    if (envUrl && typeof envUrl === 'string') return envUrl;
    if (stored && typeof stored === 'string') return stored;
    // Heuristic: localhost dev default for customer app
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) return 'http://localhost:5173';
      // Same origin as POS if deployed behind one domain
      return window.location.origin;
    } catch (_) {
      return 'http://localhost:5173';
    }
  }, []);

  useEffect(() => {
    // Initialize contactless modal defaults
    setContactlessBaseUrl(resolveCustomerBaseUrl());
    setContactlessTableId(prev => prev || selectedTable?._id || '');
  }, [resolveCustomerBaseUrl, selectedTable?._id]);

  const buildCustomerUrl = (baseUrl, restaurantId, branchId, tableId) => {
    if (!baseUrl) return '';
    const url = new URL(baseUrl);
    // Keep path as-is (customer app reads params from search)
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurantId', restaurantId);
    if (branchId) params.set('branchId', branchId);
    if (tableId) params.set('tableId', tableId);
    url.search = params.toString();
    return url.toString();
  };

  const handleGenerateQR = () => {
    try {
      if (!user?.restaurantId || !user?.branchId) {
        toast.error('Missing restaurant or branch context. Please log in again or check your user profile.');
        return;
      }
      const tableId = contactlessTableId || selectedTable?._id;
      if (!tableId) {
        toast.error('Select a table to generate the QR link.');
        return;
      }
      setIsGeneratingQR(true);
      const finalBase = (contactlessBaseUrl || '').trim();
      if (!finalBase) {
        toast.error('Enter the Customer App Base URL first.');
        setIsGeneratingQR(false);
        return;
      }
      const url = buildCustomerUrl(finalBase, user.restaurantId, user.branchId, tableId);
      setGeneratedQRUrl(url);
      // Persist base URL for next time
      localStorage.setItem('pos_customer_base_url', finalBase);
      toast.success('QR link generated');
    } catch (e) {
      console.error('QR generation error', e);
      toast.error('Failed to generate QR');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (!generatedQRUrl) return toast.error('Generate a link first.');
      await navigator.clipboard.writeText(generatedQRUrl);
      toast.success('Link copied');
    } catch (_) {
      toast.error('Copy failed');
    }
  };

  const handleShare = async () => {
    try {
      if (!generatedQRUrl) return toast.error('Generate a link first.');
      if (navigator.share) {
        await navigator.share({ title: 'OrderEase Menu', url: generatedQRUrl });
      } else {
        await handleCopyLink();
      }
    } catch (_) {
      // User may cancel share; ignore
    }
  };

  const handlePrintTent = () => {
    try {
      if (!generatedQRUrl) return toast.error('Generate a link first.');
      const tableLabel = tables.find(t => t._id === (contactlessTableId || selectedTable?._id))?.TableName || 'Table';
      const win = window.open('', '_blank');
      if (!win) return toast.error('Popup blocked. Allow popups to print.');
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Table QR</title>
            <style>
              body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial; margin: 0; padding: 24px; }
              .wrap { width: 320px; margin: 0 auto; text-align: center; }
              .brand { font-weight: 700; font-size: 20px; margin-bottom: 8px; }
              .table { font-weight: 600; margin-bottom: 12px; }
              .qr { background:#fff; padding: 8px; display:inline-block; }
              .hint { color:#555; margin-top: 8px; font-size: 12px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="brand">OrderEase</div>
              <div class="table">${tableLabel}</div>
              <div class="qr">
                <img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(generatedQRUrl)}" />
              </div>
              <div class="hint">Scan to view menu & order</div>
            </div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error('Print tent error', e);
      toast.error('Failed to open print preview');
    }
  };

  const buildTableQRImageSrc = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  const openPrintAllQRCards = () => {
    try {
      if (!user?.restaurantId || !user?.branchId) {
        return toast.error('Missing restaurant/branch context.');
      }
      const base = (contactlessBaseUrl || resolveCustomerBaseUrl()).trim();
      if (!base) return toast.error('Set Customer App Base URL first.');
      const win = window.open('', '_blank');
      if (!win) return toast.error('Popup blocked. Allow popups to print.');
      const cardsHtml = tables.map(t => {
        const link = buildCustomerUrl(base, user.restaurantId, user.branchId, t._id);
        const label = t.TableName || t.name || 'Table';
        const img = buildTableQRImageSrc(link);
        return `<div class="card">
            <div class="label">${label}</div>
            <img src="${img}" alt="QR" />
            <div class="small">Scan to order</div>
          </div>`;
      }).join('');
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>All Table QRs</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial; margin: 0; padding: 24px; }
              .title { font-weight: 700; font-size: 20px; margin-bottom: 16px; }
              .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
              .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; }
              .label { font-weight: 600; margin-bottom: 8px; }
              img { width: 200px; height: 200px; object-fit: contain; background: #fff; }
              .small { color: #555; font-size: 12px; margin-top: 6px; }
              @media print { body { padding: 8px; } }
            </style>
          </head>
          <body>
            <div class="title">Table QR Codes</div>
            <div class="grid">${cardsHtml}</div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error('Print all QRs error', e);
      toast.error('Failed to open print sheet');
    }
  };

  const downloadAllQRCardsPDF = async () => {
    try {
      if (!user?.restaurantId || !user?.branchId) return toast.error('Missing restaurant/branch context.');
      const base = (contactlessBaseUrl || resolveCustomerBaseUrl()).trim();
      if (!base) return toast.error('Set Customer App Base URL first.');
      setIsGeneratingBulk(true);

      // Build a hidden container with inline SVG QRs and render to PDF using jsPDF.html (via html2canvas)
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = '794px'; /* A4 width ~96dpi */
      container.style.padding = '16px';

      const title = document.createElement('div');
      title.textContent = 'Table QR Codes';
      title.style.fontWeight = '700';
      title.style.fontSize = '18px';
      title.style.marginBottom = '12px';

      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gap = '12px';

      tables.forEach(t => {
        const link = buildCustomerUrl(base, user.restaurantId, user.branchId, t._id);
        const labelText = t.TableName || t.name || 'Table';
        const card = document.createElement('div');
        card.style.border = '1px solid #ddd';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.textAlign = 'center';
        card.style.breakInside = 'avoid';
        card.style.pageBreakInside = 'avoid';

        const label = document.createElement('div');
        label.textContent = labelText;
        label.style.fontWeight = '600';
        label.style.marginBottom = '6px';

        const qrWrap = document.createElement('div');
        // Inline SVG QR (no external images, no CORS issues)
        const svgMarkup = renderToStaticMarkup(
          <QRCode value={link} size={180} />
        );
        qrWrap.innerHTML = svgMarkup;
        qrWrap.style.background = '#fff';
        qrWrap.style.display = 'inline-block';

        const hint = document.createElement('div');
        hint.textContent = 'Scan to order';
        hint.style.color = '#555';
        hint.style.fontSize = '11px';
        hint.style.marginTop = '6px';

        card.appendChild(label);
        card.appendChild(qrWrap);
        card.appendChild(hint);
        grid.appendChild(card);
      });

      container.appendChild(title);
      container.appendChild(grid);
      document.body.appendChild(container);

      // Render to canvas and add as images to PDF (supports long content)
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let position = margin;
      let heightLeft = imgHeight;

      // First page
      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
      // Additional pages
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      pdf.save('table-qr-codes.pdf');
      document.body.removeChild(container);
      setIsGeneratingBulk(false);
    } catch (e) {
      console.error('PDF export error', e);
      setIsGeneratingBulk(false);
      toast.error('Failed to create PDF');
    }
  };

  // Helper function to get floor name by ObjectId
  const getFloorName = (floorId) => {
    if (!floorId || !floors.length) return 'Unassigned Floor';
    const floor = floors.find(f => f._id === floorId);
    return floor ? floor.name : 'Unassigned Floor';
  };

  // Helpers for quick filters
  const tableHasPrinted = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId) || [];
      return orders.some(o => o?.printed === true || o?.kotPrinted === true || o?.billPrinted === true);
    } catch (_) {
      return false;
    }
  };

  const tableHasActiveKOT = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId) || [];
      return orders.some(o => ['pending','confirmed','preparing','ready'].includes(o?.status));
    } catch (_) {
      return false;
    }
  };

  // Filter tables based on search, status, floor, and quick filters
  const filteredTables = tables.filter(table => {
    const tableName = table.TableName || table.name || '';
    const floorName = getFloorName(table.location?.floor);
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = tableName.toLowerCase().includes(searchLower) ||
                         floorName.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    
    // For floor filtering, use actual floor ObjectId
    const matchesFloor = selectedFloor === 'all' || table.location?.floor === selectedFloor;

    // Quick filter logic
    let matchesQuick = true;
    if (quickFilter === 'running') {
      matchesQuick = table.status === 'occupied' || tableHasActiveKOT(table._id);
    } else if (quickFilter === 'printed') {
      matchesQuick = tableHasPrinted(table._id);
    } else if (quickFilter === 'kot') {
      matchesQuick = tableHasActiveKOT(table._id);
    }
    
    return matchesSearch && matchesStatus && matchesFloor && matchesQuick;
  });

  // Group tables by actual floor (using ObjectId reference)
  const groupedTables = {};
  filteredTables.forEach(table => {
    const floorId = table.location?.floor;
    const floorName = getFloorName(floorId);
    
    if (!groupedTables[floorName]) {
      groupedTables[floorName] = [];
    }
    groupedTables[floorName].push(table);
  });

  // Table status counts for legend
  const statusCounts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    blocked: tables.filter(t => t.status === 'blocked').length
  };

  // Print helper: builds a minimal orderData and prints via browser
  const handlePrintForTable = (table, activeOrderCandidate = null) => {
    try {
      const tableOrders = getTableOrders(table._id) || [];
      // Prefer active order else pick most recent by createdAt
      let order = activeOrderCandidate;
      if (!order) {
        order = [...tableOrders].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];
      }

      if (!order) {
        toast.error('No orders found for this table to print.');
        return;
      }

      const safeItems = Array.isArray(order.items) ? order.items : [];
      const subtotal = safeItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
      const orderData = {
        order: {
          orderNumber: order.orderNumber || order._id || 'N/A',
          createdAt: order.createdAt || new Date().toISOString(),
          items: safeItems.map(it => ({
            name: it.name || it.itemName || 'Item',
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1,
            customizations: it.customizations || []
          })),
          subtotal,
          tax: Number(order.tax) || 0,
          discount: Number(order.discount) || 0,
          totalAmount: Number(order.totalAmount) || subtotal
        },
        paymentDetails: {
          method: (order.paymentMethod || order.paymentMode || 'cash').toString(),
          amountReceived: Number(order.amountReceived) || Number(order.totalAmount) || subtotal,
          change: Number(order.change) || 0,
          cardNumber: order.cardNumber || '',
          cardHolder: order.cardHolder || '',
          upiId: order.upiId || '',
          transactionId: order.transactionId || ''
        },
        customerInfo: order.customerInfo || {
          name: order.customerName || 'Walk-in Customer',
          phone: order.customerPhone || '',
          orderType: order.orderType || 'dine-in'
        },
        tableInfo: {
          name: table.TableName || table.name || table.tableNumber || 'Table',
          _id: table._id
        }
      };

      const restaurantInfo = {
        name: (order.brandName || order.restaurantName || 'Restaurant'),
        brandName: order.brandName || undefined,
        logo: order.logo || undefined,
        address: order.branchAddress || 'Address',
        phone: order.branchPhone || 'Phone',
        email: '',
        gst: order.gstNumber || ''
      };

      const html = generateHTMLReceipt(orderData, restaurantInfo, { duplicateReceipt: false });
      const result = printHTMLReceipt(html);
      if (result?.success) {
        toast.success('Printing started');
      } else {
        toast.error(result?.error || 'Failed to print');
      }
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Print failed');
    }
  };

  const handleTableSelect = (table) => {
    console.log('Table selected:', table.TableName || table.name, table);
    try {
      // Persist current selected table's cart before switching
      if (selectedTable?._id) {
        const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
        carts[selectedTable._id] = {
          items: cartItems,
          customerInfo
        };
        localStorage.setItem('pos_table_carts', JSON.stringify(carts));
      }

      // Switch selection
      console.log('Calling selectTable function...');
      selectTable(table);

      // Load the new table's persisted cart if present
      const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
      const saved = carts[table._id];
      if (saved && Array.isArray(saved.items)) {
        replaceCart(saved.items, saved.customerInfo || {});
      } else {
        // No saved cart -> start clean for this table (do not affect global if same table)
        replaceCart([], { orderType: 'dine-in' });
      }

      toast.success(`Table ${table.TableName || table.name} selected`);
    } catch (e) {
      console.error('Error switching tables:', e);
      selectTable(table);
      toast.success(`Table ${table.TableName || table.name} selected`);
    }
  };

  const handleTableDetails = (table) => {
    setSelectedTableForDetails(table);
    setShowDetailsModal(true);
  };

  const handleStatusChange = async (tableId, newStatus) => {
    try {
      await updateTableStatus(tableId, newStatus);
      toast.success('Table status updated successfully');
    } catch (error) {
      toast.error('Failed to update table status');
    }
  };

  const handleBlockSelectedTable = async () => {
    if (!selectedTable?._id) {
      return toast.error('Please select a table to block.');
    }
    if (!window.confirm(`Block table ${selectedTable.TableName || selectedTable.name}?`)) return;
    await handleStatusChange(selectedTable._id, 'blocked');
  };

  const handleHoldSelectedTable = async () => {
    if (!selectedTable?._id) {
      return toast.error('Please select a table to hold.');
    }
    // Using 'reserved' as Hold semantics
    await handleStatusChange(selectedTable._id, 'reserved');
  };

  // Reservations - Server-side
  const todayStr = new Date().toISOString().slice(0,10);
  const loadReservationsForTable = useCallback(async (tableId, dateStr = todayStr) => {
    try {
      const data = await getTableReservations(tableId, { date: dateStr });
      return data;
    } catch (e) {
      return [];
    }
  }, [getTableReservations, todayStr]);

  const loadTodayReservations = useCallback(async (dateStr = todayStr) => {
    if (!Array.isArray(tables) || tables.length === 0) {
      setReservationsByTable({});
      return;
    }
    const entries = await Promise.allSettled(
      tables.map(async t => {
        const list = await loadReservationsForTable(t._id, dateStr);
        return [t._id, list];
      })
    );
    const map = {};
    entries.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        const [id, list] = r.value;
        map[id] = list;
      } else if (r.status === 'fulfilled') {
        const [id] = r.value;
        map[id] = [];
      }
    });
    setReservationsByTable(map);
  }, [tables, loadReservationsForTable, todayStr]);

  useEffect(() => {
    loadTodayReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length]);

  const combineDateTime = (dateStr, timeStr) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const getTableName = (id) => {
    const t = tables.find(x => x._id === id);
    return t ? (t.TableName || t.name || 'Table') : 'Table';
  };

  const getReservationsForTable = (tableId) => reservationsByTable[tableId] || [];
  const getNextReservationForTable = (tableId) => {
    const now = Date.now();
    return getReservationsForTable(tableId)
      .filter(r => new Date(r.endTime).getTime() >= now)
      .sort((a,b) => new Date(a.startTime) - new Date(b.startTime))[0] || null;
  };

  const validateReservation = (form) => {
    if (!form.tableId) return 'Please choose a table';
    if (!form.name.trim()) return 'Customer name is required';
    const start = combineDateTime(form.date, form.startTime);
    const end = new Date(start.getTime() + (Number(form.durationMinutes) || 60) * 60000);
    if (isNaN(start.getTime())) return 'Invalid start time';
    if (end <= start) return 'End time must be after start time';
    // Quick client-side overlap check using loaded reservations
    const overlap = getReservationsForTable(form.tableId).some(r => {
      const rs = new Date(r.startTime).getTime();
      const re = new Date(r.endTime).getTime();
      const s = start.getTime();
      const e = end.getTime();
      return (s < re && e > rs);
    });
    if (overlap) return 'Time slot overlaps with an existing reservation';
    return '';
  };

  const createReservation = async (e) => {
    e?.preventDefault?.();
    setReservationError('');
    const err = validateReservation(reservationForm);
    if (err) { setReservationError(err); return; }
    setReservationSubmitting(true);
    try {
      const start = combineDateTime(reservationForm.date, reservationForm.startTime);
      const end = new Date(start.getTime() + (Number(reservationForm.durationMinutes) || 60) * 60000);
      // Try to find/create customer if phone exists
      let customerId = null;
      const phoneTrim = (reservationForm.phone || '').trim();
      if (phoneTrim) {
        const existing = await findCustomerByPhone(phoneTrim);
        if (existing?._id) {
          customerId = existing._id;
        } else {
          const created = await createCustomerIfNeeded({ name: reservationForm.name.trim(), phone: phoneTrim });
          if (created?._id) customerId = created._id;
        }
      }
      await apiCreateReservation(reservationForm.tableId, {
        customerName: reservationForm.name.trim(),
        customerPhone: reservationForm.phone.trim(),
        customerId,
        partySize: Number(reservationForm.partySize) || 1,
        reservationDate: reservationForm.date,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: reservationForm.notes || ''
      });
      await loadTodayReservations();
      setShowReservationModal(false);
    } catch (er) {
      console.error('Create reservation error', er);
      // toast handled in context; show inline too
      setReservationError(er?.response?.data?.message || 'Failed to create reservation');
    } finally {
      setReservationSubmitting(false);
    }
  };

  const cancelReservation = async (res) => {
    try {
      await apiCancelReservation(res.tableId, res._id);
      await loadTodayReservations();
    } catch (er) {
      console.error('Cancel reservation error', er);
      toast.error('Failed to cancel reservation');
    }
  };

  const checkInReservation = async (res) => {
    try {
      // Mark reservation completed and occupy the table
      await apiUpdateReservation(res.tableId, res._id, { status: 'completed' });
      await updateTableStatus(res.tableId, 'occupied');
      await loadTodayReservations();
      // Close reservation modal and focus the table for service
      setShowReservationModal(false);
      const table = tables.find(t => t._id === res.tableId);
      if (table) {
        handleTableSelect(table);
      }
    } catch (er) {
      console.error('Check-in error', er);
      toast.error('Failed to check in');
    }
  };

  const openMoveModal = () => {
    if (!selectedTable?._id) {
      return toast.error('Select a source table first to move items from.');
    }
    setMoveTargetTableId('');
    setShowMoveModal(true);
  };

  const performMoveCart = () => {
    try {
      if (!selectedTable?._id) return toast.error('No source table selected.');
      if (!moveTargetTableId) return toast.error('Select a destination table.');
      if (moveTargetTableId === selectedTable._id) return toast.error('Source and destination cannot be the same.');

      const carts = JSON.parse(localStorage.getItem('pos_table_carts') || '{}');
      const sourceSaved = carts[selectedTable._id] || { items: cartItems, customerInfo };
      const destSaved = carts[moveTargetTableId] || { items: [], customerInfo: {} };

      // Move by concatenating; adjust to business rule as needed
      carts[moveTargetTableId] = {
        items: [...(destSaved.items || []), ...(sourceSaved.items || [])],
        customerInfo: { ...(destSaved.customerInfo || {}), ...(sourceSaved.customerInfo || {}) }
      };
      carts[selectedTable._id] = { items: [], customerInfo: { orderType: 'dine-in' } };

      localStorage.setItem('pos_table_carts', JSON.stringify(carts));

      // If currently on source, clear current cart in UI
      replaceCart([], { orderType: 'dine-in' });

      toast.success('Items moved successfully');
      setShowMoveModal(false);
    } catch (e) {
      console.error('Move cart error', e);
      toast.error('Failed to move items');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#E8F5E8'; // Light green
      case 'occupied':
        return '#FFE8E8'; // Light red
      case 'reserved':
        return '#FFF4E6'; // Light orange
      case 'cleaning':
        return '#E6F3FF'; // Light blue
      case 'blocked':
        return '#F0F0F0'; // Light gray
      default:
        return '#FFFFFF';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'available':
        return '#4CAF50'; // Green
      case 'occupied':
        return '#F44336'; // Red
      case 'reserved':
        return '#FF9800'; // Orange
      case 'cleaning':
        return '#2196F3'; // Blue
      case 'blocked':
        return '#9E9E9E'; // Gray
      default:
        return '#E0E0E0';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <FaCheckCircle />;
      case 'occupied':
        return <FaUsers />;
      case 'reserved':
        return <FaClock />;
      case 'cleaning':
        return <FaExclamationTriangle />;
      default:
        return <FaTable />;
    }
  };

  const getTableOrders = (tableId) => {
    try {
      const orders = getOrdersByTable(tableId);
      return Array.isArray(orders) ? orders : [];
    } catch (_) {
      return [];
    }
  };

  const FloorPlanTable = ({ table, index }) => {
    const tableOrders = getTableOrders(table._id);
    const activeStatuses = ['pending','confirmed','preparing','ready','accepted','placed','in_progress'];
    const activeOrder = (tableOrders || []).find(order => {
      const s = (order?.status || '').toLowerCase();
      return activeStatuses.includes(s);
    });
    const shouldShowPrint = (table.status && table.status.toLowerCase() !== 'available') || !!activeOrder;
 
    

  const nextRes = getNextReservationForTable(table._id);
  return (
      <div 
        className={`floor-table ${selectedTable?._id === table._id ? 'selected' : ''}`}
        style={{
          backgroundColor: getStatusColor(table.status),
          borderColor: getStatusBorderColor(table.status),
          cursor: 'pointer',
          position: 'relative',
          width: '110px',
          height: '110px',
          border: '1px solid #dfdfdf',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '5px',
          transition: 'all 0.3s ease',
          fontSize: '12px',
          fontWeight: '600'
        }}
        onClick={() => handleTableSelect(table)}
        onDoubleClick={() => handleTableDetails(table)}
      >
        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
          {table.TableName}
        </div>
    {nextRes && (
          <div style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', textAlign: 'center' }}>
            <Badge color="warning" pill style={{ fontSize: '9px' }}>
      {new Date(nextRes.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' - '}
      {new Date(nextRes.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
        )}
        
        
        
        {/* Print icon for orders */}
        {shouldShowPrint && (
          <button
            type="button"
            aria-label="Print order"
            title={activeOrder ? 'Print order' : 'Select table to print from Order Management'}
            onClick={(e) => {
              e.stopPropagation();
              try {
                // Select table for context and trigger print
                handleTableSelect(table);
                handlePrintForTable(table, activeOrder);
              } catch (err) {
                console.error('Print action error', err);
                toast.error('Unable to start print action');
              }
            }}
            style={{ 
              position: 'absolute', 
              top: '2px', 
              left: '2px',
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer'
            }}
          >
            <FaPrint size={15} color="#555" />
          </button>
        )}
        
  {/* Eye icon for viewing */}
        {table.status === 'occupied' && (
          <button
            type="button"
            aria-label="View table details"
            title="View table details"
            onClick={(e) => {
              e.stopPropagation();
              try {
                handleTableDetails(table);
              } catch (err) {
                console.error('Open details error', err);
                toast.error('Unable to open table details');
              }
            }}
            style={{ 
              position: 'absolute', 
              top: '2px', 
              right: '2px',
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer'
            }}
          >
            <FaEye size={15} color="#555" />
          </button>
        )}

        {/* Quick open reservation modal */}
        <button
          type="button"
          aria-label="Reservation actions"
          title="Reservation actions"
          onClick={(e) => {
            e.stopPropagation();
            setReservationForm(prev => ({
              ...prev,
              tableId: table._id,
              date: new Date().toISOString().slice(0,10)
            }));
            setShowReservationModal(true);
          }}
          style={{ 
            position: 'absolute', 
            bottom: '2px', 
            right: '2px',
            border: 'none',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: '6px',
            padding: '4px',
            cursor: 'pointer'
          }}
        >
          <FaCalendarPlus size={15} color="#555" />
        </button>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">
          Loading tables...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger" className="text-center">
        <h5>Error Loading Tables</h5>
        <p>{error}</p>
  <Button color="primary" onClick={handleRefresh}>
          <FaSync className="me-2" />
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <div className="table-selection" >
      {/* Professional Header with Action Buttons */}
      <div className="table-selection-header">
        <div className="header-top">
          <div className="header-left">
            <h2 className="page-title">
              <FaTable className="me-2" />
              Table View
            </h2>
            
          </div>
          <div className="d-flex header-right">
            {/* Status Legend */}
      <div className="mb-0 me-4 status-legend bg-transparent shadow-none p-0">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#E8F5E8', border: '2px solid #4CAF50' }}></div>
          <span>Available ({statusCounts.available})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFE8E8', border: '2px solid #F44336' }}></div>
          <span>Occupied ({statusCounts.occupied})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFF4E6', border: '2px solid #FF9800' }}></div>
          <span>Reserved ({statusCounts.reserved})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#E6F3FF', border: '2px solid #2196F3' }}></div>
          <span>Cleaning ({statusCounts.cleaning})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F0F0F0', border: '2px solid #9E9E9E' }}></div>
          <span>Blocked ({statusCounts.blocked || 0})</span>
        </div>
      </div>

            <ButtonGroup size="sm">
              <Button 
                color="outline-primary"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : <FaSync />}
              </Button>
              <Button color="danger" onClick={() => setShowReservationModal(true)}>
                <FaCalendarPlus className="me-1" />
                Table Reservation
              </Button>
              <Button color="warning" onClick={() => setShowContactlessModal(true)}>
                <FaPhone className="me-1" />
                Contactless
              </Button>
            </ButtonGroup>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="action-bar">
          <div className="action-buttons">
            <Button size="sm" color="light" className="action-btn" onClick={openMoveModal}>
              <FaHandPaper className="me-1" />
              Move KOT/ Items
            </Button>
            <Button size="sm" color="light" className="action-btn" onClick={handleBlockSelectedTable}>
              <FaHandPaper className="me-1" />
              Block Table
            </Button>
            <Button size="sm" color="info" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'running' ? 'none' : 'running')}>
              <FaTable className="me-1" />
              Running Table
            </Button>
            <Button size="sm" color="warning" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'printed' ? 'none' : 'printed')}>
              <FaPrint className="me-1" />
              Printed Table
            </Button>
            <Button size="sm" color="success" className="action-btn" onClick={handleHoldSelectedTable}>
              <FaCheckCircle className="me-1" />
              Hold Table
            </Button>
            <Button size="sm" color="primary" className="action-btn" onClick={() => setQuickFilter(prev => prev === 'kot' ? 'none' : 'kot')}>
              <FaUtensils className="me-1" />
              Running KOT Table
            </Button>
          </div>
          
          <div className="view-controls">
            {/* Floor Filter */}
            <div className="me-3">
              <span className="me-2">Floor:</span>
              <Input
                type="select"
                size="sm"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                style={{ width: '150px', display: 'inline-block' }}
              >
                <option value="all">All Floors</option>
                {floors.map(floor => (
                  <option key={floor._id} value={floor._id}>
                    {floor.name} (Level {floor.level})
                  </option>
                ))}
              </Input>
            </div>
            
             
            <Button size="sm" color="outline-secondary">
              <FaCog />
            </Button>
          </div>
        </div>
      </div>

      
      {/* Floor Plan View */}
      
        <div className="floor-plan-container">
          {Object.entries(groupedTables).map(([floorName, floorTables]) => (
            floorTables.length > 0 && (
              <div key={floorName} className="floor-section">
                <div className="section-header">
                  <h4 className="section-title">
                    <FaMapMarkerAlt className="me-2" />
                    {floorName}
                    <span className="ms-2 text-muted">({floorTables.length} tables)</span>
                  </h4>
                </div>
                <div className="tables-grid">
                  {floorTables.map((table, index) => (
                    <FloorPlanTable key={table._id} table={table} index={index} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
     

      {/* Table Details Modal */}
      <Modal 
        isOpen={showDetailsModal} 
        toggle={() => setShowDetailsModal(false)}
        size="lg"
      >
  <ModalHeader toggle={() => setShowDetailsModal(false)}>
    Table Details - {selectedTableForDetails?.TableName || selectedTableForDetails?.name}
        </ModalHeader>
        <ModalBody>
          {selectedTableForDetails && (
            <div>
              <Row>
                <Col md={6}>
                  <h6>Table Information</h6>
      <p><strong>Name:</strong> {selectedTableForDetails.TableName || selectedTableForDetails.name}</p>
                  <p><strong>Capacity:</strong> {selectedTableForDetails.capacity} people</p>
                  <p><strong>Category:</strong> {selectedTableForDetails.category || 'Non A/C'}</p>
                  <p>
                    <strong>Status:</strong> 
                    <Badge 
                      style={{ 
      backgroundColor: getStatusColor(selectedTableForDetails.status),
      color: '#333',
      border: `2px solid ${getStatusBorderColor(selectedTableForDetails.status)}`
                      }}
                      className="ms-2"
                    >
                      {selectedTableForDetails.status.toUpperCase()}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  <h6>Recent Orders</h6>
                  {getTableOrders(selectedTableForDetails._id).slice(0, 3).map(order => (
                    <div key={order._id} className="border-bottom pb-2 mb-2">
                      <div className="d-flex justify-content-between">
                        <span>Order #{order.orderNumber}</span>
                        <Badge color={order.status === 'delivered' ? 'success' : 'warning'}>
                          {order.status}
                        </Badge>
                      </div>
                      <small className="text-muted">
                        {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                      </small>
                    </div>
                  ))}
                </Col>
              </Row>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          {selectedTableForDetails && (
            <Button 
              color="primary" 
              onClick={() => {
                handleTableSelect(selectedTableForDetails);
                setShowDetailsModal(false);
              }}
            >
              Select This Table
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Move KOT/Items Modal */}
      <Modal
        isOpen={showMoveModal}
        toggle={() => setShowMoveModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowMoveModal(false)}>
          <FaHandPaper className="me-2" />
          Move KOT/Items
        </ModalHeader>
        <ModalBody>
          <p className="mb-3">
            Select a destination table to move current table's items/cart. This moves unsent items stored locally. Printed/placed orders are not altered here.
          </p>
          <div className="mb-2"><strong>From:</strong> {selectedTable?.TableName || selectedTable?.name || 'Not selected'}</div>
          <div className="mb-2"><strong>To:</strong></div>
          <Input type="select" value={moveTargetTableId} onChange={(e) => setMoveTargetTableId(e.target.value)}>
            <option value="">-- Select Destination Table --</option>
            {tables
              .filter(t => t._id !== selectedTable?._id)
              .map(t => (
                <option key={t._id} value={t._id}>
                  {t.TableName || t.name} [{t.status}]
                </option>
              ))}
          </Input>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowMoveModal(false)}>Cancel</Button>
          <Button color="primary" onClick={performMoveCart}>Move Items</Button>
        </ModalFooter>
      </Modal>
      
      {/* Table Reservation Modal */}
      <Modal 
        isOpen={showReservationModal} 
        toggle={() => setShowReservationModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowReservationModal(false)}>
          <FaCalendarPlus className="me-2" />
          Table Reservation
        </ModalHeader>
        <ModalBody>
          {reservationError && (
            <Alert color="danger" className="py-2">{reservationError}</Alert>
          )}
          <Form onSubmit={createReservation}>
            <FormGroup>
              <Label>Table</Label>
              <Input
                type="select"
                value={reservationForm.tableId || selectedTable?._id || ''}
                onChange={(e) => setReservationForm(f => ({ ...f, tableId: e.target.value }))}
                required
              >
                <option value="">Select table</option>
                {tables.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.TableName || t.name} [{t.status}]
                  </option>
                ))}
              </Input>
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Customer name</Label>
                  <Input
                    value={reservationForm.name}
                    onChange={(e) => setReservationForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Phone</Label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      type="tel"
                      value={reservationForm.phone}
                      onChange={(e) => handlePhoneInputChange(e.target.value)}
                      onFocus={() => setShowPhoneSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 150)}
                      placeholder="Search or enter phone"
                    />
                    {showPhoneSuggestions && (customerSuggestions.length > 0 || isSearchingCustomers) && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050 }} className="bg-white border rounded shadow-sm">
                        {isSearchingCustomers && (
                          <div className="p-2 text-muted small">Searching...</div>
                        )}
                        {customerSuggestions.map((c) => (
                          <div
                            key={c._id}
                            className="p-2 suggestion-item"
                            style={{ cursor: 'pointer' }}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}
                          >
                            <div className="d-flex justify-content-between">
                              <span>{c.name || 'Unnamed'}</span>
                              <small className="text-muted">{c.customerId || ''}</small>
                            </div>
                            <small className="text-muted">{c.phone || '—'}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <FormGroup>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={reservationForm.date}
                    onChange={(e) => setReservationForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={reservationForm.startTime}
                    onChange={(e) => setReservationForm(f => ({ ...f, startTime: e.target.value }))}
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>Duration (mins)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={reservationForm.durationMinutes}
                    onChange={(e) => setReservationForm(f => ({ ...f, durationMinutes: e.target.value }))}
                    required
                  />
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <FormGroup>
                  <Label>Party size</Label>
                  <Input
                    type="number"
                    min="1"
                    value={reservationForm.partySize}
                    onChange={(e) => setReservationForm(f => ({ ...f, partySize: e.target.value }))}
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={8}>
                <FormGroup>
                  <Label>Notes</Label>
                  <Input
                    type="text"
                    value={reservationForm.notes}
                    onChange={(e) => setReservationForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any special notes"
                  />
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <Button color="primary" type="submit" disabled={reservationSubmitting}>
                {reservationSubmitting ? <Spinner size="sm" className="me-2" /> : null}
                Create Reservation
              </Button>
            </div>
          </Form>

          {/* Today reservations list for quick actions */}
          <hr />
          <h6 className="mb-2">Today’s reservations</h6>
          {Object.values(reservationsByTable).flat().filter(r => (r.startTime || '').slice(0,10) === todayStr).length === 0 ? (
            <div className="text-muted">No reservations for today.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {Object.entries(reservationsByTable)
                .flatMap(([tableId, list]) => list.map(r => ({ ...r, tableId })))
                .filter(r => (r.startTime || '').slice(0,10) === todayStr)
                .sort((a,b) => new Date(a.startTime) - new Date(b.startTime))
                .map(r => (
                  <div key={r._id} className="d-flex align-items-center justify-content-between p-2 border rounded">
                    <div>
                      <div className="fw-semibold">{getTableName(r.tableId)} • {r.customerName} ({r.partySize})</div>
                      <small className="text-muted">
                        {new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <Button size="sm" color="success" onClick={() => checkInReservation(r)}>Check-in</Button>
                      <Button size="sm" color="outline-danger" onClick={() => cancelReservation(r)}>Cancel</Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowReservationModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Contactless Modal */}
      <Modal 
        isOpen={showContactlessModal} 
        toggle={() => setShowContactlessModal(false)}
        size="md"
      >
        <ModalHeader toggle={() => setShowContactlessModal(false)}>
          <FaPhone className="me-2" />
          Contactless Options
        </ModalHeader>
        <ModalBody>
          <Alert color="info" className="py-2">
            Generate a QR for customers to scan and open your menu with the table preselected.
          </Alert>
          <Form onSubmit={(e) => { e.preventDefault(); handleGenerateQR(); }}>
            <FormGroup>
              <Label>Customer App Base URL</Label>
              <Input
                placeholder="e.g. http://localhost:5173 or https://yourdomain.com"
                value={contactlessBaseUrl}
                onChange={(e) => setContactlessBaseUrl(e.target.value)}
              />
              <small className="text-muted">Set once and it will be remembered on this device.</small>
            </FormGroup>

            <FormGroup>
              <Label>Table</Label>
              <Input type="select" value={contactlessTableId || selectedTable?._id || ''} onChange={(e) => setContactlessTableId(e.target.value)}>
                <option value="">Select table</option>
                {tables.map(t => (
                  <option key={t._id} value={t._id}>
                    {(t.TableName || t.name)} [{t.status}]
                  </option>
                ))}
              </Input>
            </FormGroup>

            <div className="d-flex gap-2 mt-2 flex-wrap">
              <Button color="primary" onClick={handleGenerateQR} disabled={isGeneratingQR}>
                {isGeneratingQR ? <Spinner size="sm" className="me-2" /> : null}
                Generate QR Link
              </Button>
              <Button color="secondary" outline onClick={handleCopyLink} disabled={!generatedQRUrl}>Copy Link</Button>
              <Button color="secondary" outline onClick={handleShare} disabled={!generatedQRUrl}>Share</Button>
              <Button color="dark" outline onClick={handlePrintTent} disabled={!generatedQRUrl}>Print Table Tent</Button>
            </div>

            {generatedQRUrl && (
              <div className="mt-3 p-2 border rounded">
                <div className="mb-2 small text-muted">Preview</div>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ background: '#fff', padding: 8 }}>
                    <QRCode value={generatedQRUrl} size={140} />
                  </div>
                  <div style={{ wordBreak: 'break-all' }}>
                    <div className="small text-muted">Link</div>
                    <div>{generatedQRUrl}</div>
                  </div>
                </div>
              </div>
            )}

            <hr className="my-3" />
            <h6 className="mb-2">Bulk export for all tables</h6>
            <div className="d-flex gap-2 flex-wrap">
              <Button color="secondary" onClick={openPrintAllQRCards}>
                Print All Table QRs
              </Button>
              <Button color="success" onClick={downloadAllQRCardsPDF} disabled={isGeneratingBulk}>
                {isGeneratingBulk ? <Spinner size="sm" className="me-2" /> : null}
                Download PDF
              </Button>
            </div>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowContactlessModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default TableSelection;
