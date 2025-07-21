// reactstrap components
import {
  Card,
  CardHeader,
  CardFooter,
  CardBody,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Pagination,
  PaginationItem,
  PaginationLink,
  Table,
  Container,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
  Nav,
  NavItem,
  NavLink
} from "reactstrap";
// core components
import Header from "components/Headers/Header.js";
import { useContext, useState, useEffect, useRef } from "react";
import { TableContext } from '../../context/TableContext';
import { AuthContext } from '../../context/AuthContext';
import { OrderContext } from '../../context/OrderContext';
import { CurrencyContext } from '../../context/CurrencyContext';
import { TaxContext } from '../../context/TaxContext';
import { BranchContext } from '../../context/BranchContext';
import { RestaurantContext } from '../../context/RestaurantContext';
import { useNavigate } from "react-router-dom";
import FloorPlan from "./FloorPlan";
import TableReservations from "./TableReservations";
import TableOrderAssignment from "./TableOrderAssignment";
import FloorManagement from "./FloorManagement";
import { QRCodeCanvas } from "qrcode.react";

const TableManagement = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const { 
    tables, 
    loading, 
    error, 
    fetchTables, 
    createTable, 
    updateTable, 
    deleteTable,
    tableZones,
    fetchTableZones,
    floors,
    fetchFloors
  } = useContext(TableContext);
  const { user, isAdmin, isSuperAdmin, isBranchManager } = useContext(AuthContext);
  const { getAllOrders, orders: contextOrders, loading: ordersLoading } = useContext(OrderContext);
  const { currencySymbol, currencyCode, formatCurrency } = useContext(CurrencyContext);
  const { branches } = useContext(BranchContext);
  const { restaurants } = useContext(RestaurantContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [filters, setFilters] = useState({
    zone: '',
    status: '',
    minCapacity: '',
    maxCapacity: '',
    isVIP: false,
  });
  const [selectedTable, setSelectedTable] = useState(null);
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [testMode, setTestMode] = useState(false); // Hidden test mode for debugging
  const [selectedTableForOrders, setSelectedTableForOrders] = useState(null);
  const [tableOrdersModalOpen, setTableOrdersModalOpen] = useState(false);
  const [tableOrders, setTableOrders] = useState([]);
  const [loadingTableOrders, setLoadingTableOrders] = useState(false);

  // Test function to manually set table statuses (for debugging)
  const setTestStatuses = async () => {
    if (!tables || tables.length === 0) return;
    
    try {
      // Set different statuses for testing
      const updates = [
        { index: 0, update: { status: 'occupied', isOccupied: true } },
        { index: 1, update: { status: 'occupied' } },
        { index: 2, update: { status: 'reserved' } },
        { index: 3, update: { status: 'maintenance' } },
      ];
      
      for (const { index, update } of updates) {
        if (tables[index]) {
          await updateTable(tables[index]._id, update);
        }
      }
      
      // Refresh data after updates
      if (isSuperAdmin()) {
        await fetchTables();
      } else if (user && user.restaurantId && user.branchId) {
        await fetchTables({
          restaurantId: user.restaurantId,
          branchId: user.branchId
        });
      }
    } catch (err) {
      console.error('Error setting test statuses:', err);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    TableName: '',
    capacity: '',
    shape: 'square',
    location: {
      zone: 'Main',
      x: 50,
      y: 50,
      floor: null
    },
    isVIP: false,
    notes: '',
    status: 'available'
  });

  // Fetch tables, zones, and orders when component mounts
  useEffect(() => {
    // For Super_Admin, fetch all tables or use filters
    // For other users, restrict to their assigned restaurant and branch
    if (isSuperAdmin()) {
      fetchTables();
    } else if (user && user.restaurantId && user.branchId) {
      fetchTables({
        restaurantId: user.restaurantId,
        branchId: user.branchId
      });
    }
    
    fetchTableZones();
    fetchFloors();
    
    // Also fetch orders to ensure they're available for table filtering
    const fetchInitialOrders = async () => {
      try {
        const filters = {};
        if (!isSuperAdmin() && user) {
          filters.restaurantId = user.restaurantId;
          filters.branchId = user.branchId;
        }
        await getAllOrders(filters);
        console.log('Initial orders loaded:', contextOrders.length);
      } catch (error) {
        console.error('Error loading initial orders:', error);
      }
    };
    
    if (user) {
      fetchInitialOrders();
    }
  }, [user, isSuperAdmin]);

  // Apply filters when they change
  useEffect(() => {
    const applyFilters = async () => {
      // Only apply filters that have values
      const activeFilters = Object.entries(filters)
        .reduce((acc, [key, value]) => {
          if (value !== '' && value !== false && value !== null) {
            acc[key] = value;
          }
          return acc;
        }, {});
      
      await fetchTables(activeFilters);
    };
    
    applyFilters();
  }, [filters]);

  // Function to handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentEditItem(null);
    // Reset form data
    setFormData({
      TableName: '',
      capacity: '',
      shape: 'square',
      location: {
        zone: 'Main',
        x: 50,
        y: 50,
        floor: null
      },
      isVIP: false,
      notes: '',
      status: 'available'
    });
  };
  
  // Function to handle editing a table
  const handleEditTable = (table) => {
    setCurrentEditItem(table);
    setFormData({
      TableName: table.TableName || '',
      capacity: table.capacity || '',
      shape: table.shape || 'square',
      location: {
        zone: table.location?.zone || 'Main',
        x: table.location?.x || 50,
        y: table.location?.y || 50,
        floor: table.location?.floor || null
      },
      isVIP: table.isVIP || false,
      notes: table.notes || '',
      status: table.status || 'available'
    });
    setModalOpen(true);
  };

  // Function to handle viewing table reservations
  const handleViewReservations = (table) => {
    setSelectedTable(table);
    setReservationsModalOpen(true);
  };

  // Function to get dynamic tax rate based on restaurant country
  const getTaxInfo = () => {
    try {
      // Get restaurant country from user's assigned restaurant
      let restaurantCountry = 'DEFAULT';
      let taxRate = 0.10; // Default 10%
      let taxName = 'Tax';
      
      if (user && user.restaurantId && restaurants && restaurants.length > 0) {
        const userRestaurant = restaurants.find(restaurant => 
          restaurant._id === user.restaurantId || restaurant._id.toString() === user.restaurantId.toString()
        );
        
        if (userRestaurant && userRestaurant.country) {
          restaurantCountry = userRestaurant.country;
          
          // Set tax rates based on country (you can extend this based on your tax system)
          switch (restaurantCountry.toLowerCase()) {
            case 'us':
            case 'united states':
              taxRate = 0.0725; // 7.25%
              taxName = 'Sales Tax';
              break;
            case 'ca':
            case 'canada':
              taxRate = 0.13; // 13%
              taxName = 'GST/HST';
              break;
            case 'uk':
            case 'united kingdom':
              taxRate = 0.20; // 20%
              taxName = 'VAT';
              break;
            case 'in':
            case 'india':
              taxRate = 0.18; // 18%
              taxName = 'GST';
              break;
            case 'ae':
            case 'united arab emirates':
              taxRate = 0.05; // 5%
              taxName = 'VAT';
              break;
            default:
              taxRate = 0.10; // 10% default
              taxName = 'Tax';
          }
        }
      }
      
      return {
        taxRate,
        taxName,
        taxPercentage: (taxRate * 100).toFixed(1) + '%',
        country: restaurantCountry
      };
    } catch (error) {
      console.error('Error getting tax info:', error);
      return {
        taxRate: 0.10,
        taxName: 'Tax',
        taxPercentage: '10.0%',
        country: 'DEFAULT'
      };
    }
  };

  // Print individual order bill - Thermal printer optimized
  const printOrderBill = (order) => {
    if (!order) {
      console.error('No order provided for printing');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the bill');
      return;
    }

    // Get dynamic tax and currency info
    const taxInfo = getTaxInfo();
    const subtotal = order.totalAmount || 0;
    const taxAmount = subtotal * taxInfo.taxRate;
    const totalWithTax = subtotal + taxAmount;

    const billHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Bill - ${order.orderNumber || order._id?.substring(0, 8)}</title>
        <style>
          /* Thermal Printer Optimized Styles */
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 0mm; 
            }
            body { 
              width: 72mm; 
              margin: 4mm;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
            }
          }
          
          body { 
            width: 72mm; 
            margin: 4mm auto;
            font-family: 'Courier New', monospace; 
            font-size: 12px;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          
          .header { 
            text-align: center; 
            border-bottom: 1px dashed #000; 
            padding-bottom: 8px; 
            margin-bottom: 8px; 
          }
          
          .restaurant-name { 
            font-weight: bold; 
            font-size: 14px; 
            margin-bottom: 2px;
          }
          
          .bill-type { 
            font-size: 11px; 
            margin-bottom: 4px;
          }
          
          .order-info { 
            margin-bottom: 8px; 
            font-size: 10px;
          }
          
          .order-info div { 
            margin-bottom: 1px;
          }
          
          .items-section { 
            border-top: 1px dashed #000; 
            border-bottom: 1px dashed #000; 
            padding: 4px 0; 
            margin: 8px 0;
          }
          
          .item-row { 
            margin-bottom: 2px;
            font-size: 10px;
          }
          
          .item-name { 
            font-weight: bold;
          }
          
          .item-details { 
            display: flex; 
            justify-content: space-between;
            font-family: 'Courier New', monospace;
          }
          
          .totals-section { 
            margin-top: 8px;
            font-size: 11px;
          }
          
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 1px;
          }
          
          .grand-total { 
            border-top: 1px dashed #000; 
            padding-top: 4px; 
            margin-top: 4px;
            font-weight: bold; 
            font-size: 12px;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 8px; 
            font-size: 9px; 
            border-top: 1px dashed #000; 
            padding-top: 4px;
          }
          
          .divider { 
            border-top: 1px dashed #000; 
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">RESTAURANT BILL</div>
          <div class="bill-type">Order Receipt</div>
        </div>
        
        <div class="order-info">
          <div><strong>Table:</strong> ${selectedTableForOrders?.TableName || 'N/A'}</div>
          <div><strong>Order #:</strong> ${order.orderNumber || order._id?.substring(0, 8)}</div>
          <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
          <div><strong>Type:</strong> ${order.OrderType || 'dine-in'}</div>
          <div><strong>Status:</strong> ${order.orderStatus || 'pending'}</div>
        </div>
        
        <div class="items-section">
          ${order.items && order.items.length > 0 ? 
            order.items.map(item => `
              <div class="item-row">
                <div class="item-name">${item.name || item.itemName}</div>
                <div class="item-details">
                  <span>${item.quantity} x ${formatCurrency ? formatCurrency(item.price || 0) : currencySymbol + (item.price || 0).toFixed(2)}</span>
                  <span>${formatCurrency ? formatCurrency((item.price || 0) * item.quantity) : currencySymbol + ((item.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            `).join('') 
            : '<div>No items found</div>'
          }
        </div>
        
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency ? formatCurrency(subtotal) : currencySymbol + subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>${taxInfo.taxName} (${taxInfo.taxPercentage}):</span>
            <span>${formatCurrency ? formatCurrency(taxAmount) : currencySymbol + taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency ? formatCurrency(totalWithTax) : currencySymbol + totalWithTax.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>Thank you for dining with us!</div>
          <div>Payment: ${order.paymentStatus || 'Pending'}</div>
          <div class="divider"></div>
          <div>Printed: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(billHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Print consolidated customer bill - Thermal printer optimized with dynamic currency/tax
  const printAllOrdersBill = () => {
    if (!tableOrders || tableOrders.length === 0) {
      alert('No orders to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the bill');
      return;
    }

    // Get dynamic tax and currency info
    const taxInfo = getTaxInfo();

    // Consolidate all items from all orders
    const consolidatedItems = [];
    const itemMap = new Map();
    
    // Combine items with same name and price
    tableOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const itemKey = `${item.name || item.itemName}_${item.price || 0}`;
          if (itemMap.has(itemKey)) {
            // Add to existing item quantity
            itemMap.get(itemKey).quantity += item.quantity;
            itemMap.get(itemKey).total = itemMap.get(itemKey).quantity * (item.price || 0);
          } else {
            // Add new item
            itemMap.set(itemKey, {
              name: item.name || item.itemName,
              price: item.price || 0,
              quantity: item.quantity,
              total: (item.price || 0) * item.quantity
            });
          }
        });
      }
    });

    // Convert map to array
    const consolidatedItemsArray = Array.from(itemMap.values());
    const subtotal = consolidatedItemsArray.reduce((sum, item) => sum + item.total, 0);
    const totalQuantity = consolidatedItemsArray.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate tax and total with dynamic rates
    const taxAmount = subtotal * taxInfo.taxRate;
    const totalAmount = subtotal + taxAmount;
    
    // Get order date range
    const orderDates = tableOrders.map(order => new Date(order.createdAt)).sort();
    const firstOrderDate = orderDates[0];
    const lastOrderDate = orderDates[orderDates.length - 1];
    const isMultipleDays = firstOrderDate.toDateString() !== lastOrderDate.toDateString();

    const billHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consolidated Bill - ${selectedTableForOrders?.TableName}</title>
        <style>
          /* Thermal Printer Optimized Styles */
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 0mm; 
            }
            body { 
              width: 72mm; 
              margin: 4mm;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.2;
              color: #000;
            }
          }
          
          body { 
            width: 72mm; 
            margin: 4mm auto;
            font-family: 'Courier New', monospace; 
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            background: white;
          }
          
          .header { 
            text-align: center; 
            border-bottom: 1px dashed #000; 
            padding-bottom: 8px; 
            margin-bottom: 8px; 
          }
          
          .restaurant-name { 
            font-weight: bold; 
            font-size: 14px; 
            margin-bottom: 2px;
          }
          
          .bill-title { 
            font-size: 12px; 
            margin-bottom: 4px;
          }
          
          .bill-info { 
            margin-bottom: 8px; 
            font-size: 9px;
          }
          
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 1px;
          }
          
          .items-section { 
            border-top: 1px dashed #000; 
            border-bottom: 1px dashed #000; 
            padding: 4px 0; 
            margin: 8px 0;
          }
          
          .section-title { 
            font-weight: bold; 
            font-size: 10px; 
            margin-bottom: 4px;
            text-align: center;
          }
          
          .item-row { 
            margin-bottom: 2px;
            font-size: 9px;
          }
          
          .item-name { 
            font-weight: bold;
          }
          
          .item-details { 
            display: flex; 
            justify-content: space-between;
            font-family: 'Courier New', monospace;
          }
          
          .summary-section { 
            margin-top: 8px;
            font-size: 10px;
          }
          
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 1px;
          }
          
          .grand-total { 
            border-top: 1px dashed #000; 
            padding-top: 4px; 
            margin-top: 4px;
            font-weight: bold; 
            font-size: 12px;
          }
          
          .order-history { 
            margin: 8px 0;
            font-size: 8px;
            border-top: 1px dashed #000;
            padding-top: 4px;
          }
          
          .order-item { 
            margin-bottom: 1px;
            font-size: 8px;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 8px; 
            font-size: 8px; 
            border-top: 1px dashed #000; 
            padding-top: 4px;
          }
          
          .divider { 
            border-top: 1px dashed #000; 
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">RESTAURANT BILL</div>
          <div class="bill-title">Consolidated Customer Bill</div>
        </div>
        
        <div class="bill-info">
          <div class="info-row">
            <span>Table:</span>
            <span>${selectedTableForOrders?.TableName || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span>Orders:</span>
            <span>${tableOrders.length}</span>
          </div>
          <div class="info-row">
            <span>Service:</span>
            <span>${isMultipleDays ? 
              `${firstOrderDate.toLocaleDateString()} - ${lastOrderDate.toLocaleDateString()}` : 
              firstOrderDate.toLocaleDateString()}
            </span>
          </div>
          <div class="info-row">
            <span>Bill Date:</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div class="items-section">
          <div class="section-title">CONSOLIDATED ITEMS</div>
          ${consolidatedItemsArray.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span>${item.quantity} x ${formatCurrency ? formatCurrency(item.price) : currencySymbol + item.price.toFixed(2)}</span>
                <span>${formatCurrency ? formatCurrency(item.total) : currencySymbol + item.total.toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="summary-section">
          <div class="summary-row">
            <span>Items:</span>
            <span>${totalQuantity}</span>
          </div>
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatCurrency ? formatCurrency(subtotal) : currencySymbol + subtotal.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>${taxInfo.taxName} (${taxInfo.taxPercentage}):</span>
            <span>${formatCurrency ? formatCurrency(taxAmount) : currencySymbol + taxAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency ? formatCurrency(totalAmount) : currencySymbol + totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="order-history">
          <div class="section-title">Order History</div>
          ${tableOrders.map((order, index) => `
            <div class="order-item">
              Order #${order.orderNumber || order._id?.substring(0, 8)} - 
              ${new Date(order.createdAt).toLocaleDateString()} - 
              ${order.items?.length || 0} items - 
              ${formatCurrency ? formatCurrency(order.totalAmount || 0) : currencySymbol + (order.totalAmount || 0).toFixed(2)}
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
          <div>Thank you for dining with us!</div>
          <div>Consolidated bill for ${tableOrders.length} orders</div>
          <div class="divider"></div>
          <div>Generated: ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(billHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties (e.g., location.zone)
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : 
               name === 'capacity' ? Number(value) : value
      });
    }
  };
  
  // Function to handle saving a table
  const handleSaveTable = async () => {
    // Validate form data
    if (!formData.TableName || !formData.capacity) {  
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (currentEditItem) {
        // Update existing table
        const result = await updateTable(currentEditItem._id, formData);
        if (result.success) {
          handleCloseModal();
        }
      } else {
        // Create new table
        // For non-SuperAdmin users, add the restaurant and branch IDs from the user context
        const tableData = { ...formData };
        
        // If not SuperAdmin, use the user's assigned restaurant and branch
        if (!isSuperAdmin() && user) {
          tableData.restaurantId = user.restaurantId;
          tableData.branchId = user.branchId;
        }
        
        const result = await createTable(tableData);
        if (result.success) {
          handleCloseModal();
        }
      }
    } catch (err) {
      console.error("Error saving table:", err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      zone: '',
      status: '',
      minCapacity: '',
      maxCapacity: '',
      isVIP: false,
    });
  };

  // Function to fetch orders for a specific table
  const fetchTableOrders = async (table) => {
    setLoadingTableOrders(true);
    try {
      // First, get all orders without table filter since the API doesn't support tableId filtering
      const filters = {};
      
      // Add restaurant and branch filters if not super admin
      if (!isSuperAdmin() && user) {
        filters.restaurantId = user.restaurantId;
        filters.branchId = user.branchId;
      }
      
      // Fetch all orders first
      await getAllOrders(filters);
      
      // Then filter orders from context that match this table
      // Check multiple possible table reference formats
      const filteredOrders = contextOrders.filter(order => {
        // Skip cancelled or completed orders unless they're very recent
        const isRecentOrder = new Date(order.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        const isActiveOrder = !['cancelled', 'completed'].includes(order.orderStatus) || isRecentOrder;
        
        if (!isActiveOrder) return false;
        
        // Check if order has tableId that matches
        if (order.tableId === table._id) return true;
        
        // Check if order has table object with _id
        if (order.table && typeof order.table === 'object' && order.table._id === table._id) return true;
        
        // Check if order has table as string ID
        if (order.table === table._id) return true;
        
        // Check if order has tableName that matches (case insensitive)
        if (order.tableName && table.TableName && 
            order.tableName.toLowerCase() === table.TableName.toLowerCase()) return true;
        
        // Check if order has table object with TableName
        if (order.table && typeof order.table === 'object' && order.table.TableName && 
            order.table.TableName.toLowerCase() === table.TableName.toLowerCase()) return true;
        
        // Check if order references table by tableId field
        if (order.table && typeof order.table === 'object' && order.table.tableId === table.tableId) return true;
        
        // Check if order has tableNumber that matches
        if (order.tableNumber === table.tableId) return true;
        
        // Check if the table's currentOrderId matches this order (if currentOrderId exists)
        if (table.currentOrderId && order._id === table.currentOrderId) return true;
        
        return false;
      });
      
      // ENHANCED WORKAROUND: Since table-order relationships are broken in the backend,
      // be more aggressive in finding ALL orders that could belong to this table
      if (filteredOrders.length === 0) {
        console.log('No direct table-order relationship found. Trying enhanced fallback methods...');
        
        // Method 1: Try to find orders by any string similarity with table name or ID
        const similarityOrders = contextOrders.filter(order => {
          const orderStr = JSON.stringify(order).toLowerCase();
          const tableNameLower = (table.TableName || '').toLowerCase();
          const tableIdStr = (table.tableId || table._id || '').toString().toLowerCase();
          
          // Check if table name appears anywhere in the order
          if (tableNameLower && orderStr.includes(tableNameLower)) return true;
          
          // Check if table ID appears anywhere in the order
          if (tableIdStr && orderStr.includes(tableIdStr)) return true;
          
          return false;
        });
        
        if (similarityOrders.length > 0) {
          console.log('Found orders using similarity matching:', similarityOrders.length);
          filteredOrders.push(...similarityOrders);
        }
        
        // Method 2: If still no orders and table is occupied, show recent orders from today
        if (filteredOrders.length === 0 && (table.status === 'occupied' || table.isOccupied)) {
          console.log('Table is occupied but no orders found. Showing today\'s orders for manual identification...');
          
          const todayOrders = contextOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            const today = new Date();
            const isTodayOrder = orderDate.toDateString() === today.toDateString();
            
            // Prefer active orders, but include recent completed ones too
            const isRelevant = !['cancelled'].includes(order.orderStatus);
            
            return isTodayOrder && isRelevant;
          });
          
          // Sort by creation date (newest first) and take more orders
          const sortedTodayOrders = todayOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          if (sortedTodayOrders.length > 0) {
            console.log('Showing today\'s orders as fallback:', sortedTodayOrders.length);
            filteredOrders.push(...sortedTodayOrders.slice(0, 10)); // Show up to 10 orders
          }
        }
        
        // Method 3: Last resort - if table is occupied but still no orders, show recent orders from this week
        if (filteredOrders.length === 0 && (table.status === 'occupied' || table.isOccupied)) {
          console.log('Still no orders found. Showing this week\'s orders as last resort...');
          
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const weekOrders = contextOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            const isThisWeek = orderDate > weekAgo;
            const isRelevant = !['cancelled'].includes(order.orderStatus);
            
            return isThisWeek && isRelevant;
          });
          
          // Sort by creation date (newest first)
          const sortedWeekOrders = weekOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          if (sortedWeekOrders.length > 0) {
            console.log('Showing this week\'s orders as last resort:', Math.min(sortedWeekOrders.length, 15));
            filteredOrders.push(...sortedWeekOrders.slice(0, 15)); // Show up to 15 recent orders
          }
        }
      }
      
      // Enhanced debugging
      console.log('=== TABLE ORDERS DEBUG ===');
      console.log('Target table:', {
        _id: table._id,
        TableName: table.TableName,
        tableId: table.tableId,
        status: table.status,
        currentOrder: table.currentOrder,
        currentOrderId: table.currentOrderId,
        isOccupied: table.isOccupied
      });
      
      console.log('Context orders (first 3):', {
        totalCount: contextOrders.length,
        orders: contextOrders.slice(0, 3).map(order => {
          // Show ALL properties of the order to understand structure
          return {
            _id: order._id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            tableId: order.tableId,
            table: order.table,
            tableName: order.tableName,
            TableName: order.TableName,
            tableNumber: order.tableNumber,
            createdAt: order.createdAt,
            // Show all other properties
            allProperties: Object.keys(order)
          };
        })
      });
      
      console.log('Filtered orders:', {
        count: filteredOrders.length,
        orders: filteredOrders
      });
      
      // Test each filtering condition for debugging
      if (contextOrders.length > 0) {
        console.log('Testing filter conditions on first order:');
        const testOrder = contextOrders[0];
        const matches = {
          tableId: testOrder.tableId === table._id,
          tableObject: testOrder.table && typeof testOrder.table === 'object' && testOrder.table._id === table._id,
          tableString: testOrder.table === table._id,
          tableName: testOrder.tableName && table.TableName && testOrder.tableName.toLowerCase() === table.TableName.toLowerCase(),
          tableObjectName: testOrder.table && typeof testOrder.table === 'object' && testOrder.table.TableName && testOrder.table.TableName.toLowerCase() === table.TableName.toLowerCase(),
          tableIdMatch: testOrder.table && typeof testOrder.table === 'object' && testOrder.table.tableId === table.tableId,
          tableNumber: testOrder.tableNumber === table.tableId,
          currentOrderId: table.currentOrderId && testOrder._id === table.currentOrderId
        };
        console.log('Filter test results:', matches);
      }
      
      console.log('=== END DEBUG ===');
      
      setTableOrders(filteredOrders);
      setSelectedTableForOrders(table);
      setTableOrdersModalOpen(true);
    } catch (error) {
      console.error('Error fetching table orders:', error);
      setTableOrders([]);
    } finally {
      setLoadingTableOrders(false);
    }
  };

  // Function to get status color for grid view
  const getStatusColor = (table) => {
    // Check if table has active orders first (highest priority)
    if (table.currentOrder || table.currentOrderId || table.isOccupied || table.status === 'occupied') {
      return '#dc3545'; // Red for occupied
    }
    
    // Then check other statuses
    switch (table.status) {
      case 'reserved':
        return '#ffc107'; // Yellow for reserved
      case 'maintenance':
        return '#6c757d'; // Gray for maintenance
      case 'available':
      default:
        return '#28a745'; // Green for available
    }
  };

  // Function to get status text
  const getStatusText = (table) => {
    if (table.currentOrder || table.currentOrderId || table.isOccupied || table.status === 'occupied') {
      return 'Occupied';
    }
    
    switch (table.status) {
      case 'reserved':
        return 'Reserved';
      case 'maintenance':
        return 'Maintenance';
      case 'available':
      default:
        return 'Available';
    }
  };



  // Check if user has permission to access this page
  if (!isAdmin() && !isSuperAdmin() && !isBranchManager()) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <div className="col-lg-6">
            <Card className="shadow border-0">
              <CardHeader className="bg-transparent">
                <h3 className="text-center">Access Denied</h3>
              </CardHeader>
              <div className="card-body text-center">
                <p>You do not have permission to view this page.</p>
                <p>Only admin, super admin, or branch manager users can access Table Management.</p>
              </div>
            </Card>
          </div>
        </Row>
      </Container>
    );
  }

  // Get status badge with mutually exclusive logic (matches badge counts)
  const getStatusBadge = (table) => {
    // Use the same priority-based logic as badge counts
    // 1. Occupied (highest priority)
    if (table.currentOrder || table.currentOrderId || table.isOccupied || table.status === 'occupied') {
      return <Badge color="danger">Occupied</Badge>;
    }
    // 2. Reserved (if not occupied)
    else if (table.status === 'reserved') {
      return <Badge color="warning">Reserved</Badge>;
    }
    // 3. Maintenance (if not occupied or reserved)
    else if (table.status === 'maintenance') {
      return <Badge color="secondary">Maintenance</Badge>;
    }
    // 4. Available (all remaining)
    else {
      return <Badge color="success">Available</Badge>;
    }
  };

  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow">
              <CardHeader className="bg-gradient-primary text-white py-4 border-bottom-0">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 className="mb-0 text-white font-weight-bold">
                    <i className="fas fa-table mr-2"></i> Table Management
                  </h3>
                  <div className="text-right">
                    <Badge color="light" pill className="px-3 py-2">
                      <i className="fas fa-building mr-1"></i> {user?.restaurantId ? 'Restaurant ID: ' + user.restaurantId.substring(0, 8) : 'All Restaurants'}
                    </Badge>
                  </div>
                </div>

                <Nav tabs className="nav-fill flex-column flex-md-row border-0 nav-tabs-custom mt-2">
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'list' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('list')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-list mr-2"></i> List View
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'grid' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('grid')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-th-large mr-2"></i> Grid View
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'floor-plan' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('floor-plan')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-th mr-2"></i> Floor Plan
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'floor-management' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('floor-management')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-building mr-2"></i> Floor Management
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={`${activeTab === 'orders' ? 'active bg-white text-primary' : 'text-white'} rounded-top px-4 py-3 font-weight-bold`}
                      onClick={() => setActiveTab('orders')}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      <i className="fas fa-utensils mr-2"></i> Table Orders
                    </NavLink>
                  </NavItem>
                </Nav>
              </CardHeader>
            </Card>
            
            {activeTab === 'list' && (
              <Card className="shadow">
                <CardHeader className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <h3 className="mb-0 font-weight-bold">
                      <i className="fas fa-chair mr-2"></i>Dining Tables
                    </h3>
                    <p className="mb-0 small">
                      <i className="fas fa-info-circle mr-1"></i>Manage your restaurant's tables
                      {tables && tables.length > 0 && (() => {
                        // Calculate mutually exclusive counts
                        const occupiedTables = tables.filter(t => 
                          t.currentOrder || t.currentOrderId || t.isOccupied || t.status === 'occupied'
                        );
                        const reservedTables = tables.filter(t => 
                          t.status === 'reserved' && !occupiedTables.includes(t)
                        );
                        const maintenanceTables = tables.filter(t => 
                          t.status === 'maintenance' && !occupiedTables.includes(t) && !reservedTables.includes(t)
                        );
                        const availableTables = tables.filter(t => 
                          !occupiedTables.includes(t) && !reservedTables.includes(t) && !maintenanceTables.includes(t)
                        );
                        
                        // Verification: Ensure counts are consistent
                        const totalCount = availableTables.length + occupiedTables.length + reservedTables.length + maintenanceTables.length;
                        const isConsistent = totalCount === tables.length;
                        
                        return (
                          <span className="ml-2">
                            <Badge color="success" className="mr-1">
                              {availableTables.length} Available
                            </Badge>
                            <Badge color="danger" className="mr-1">
                              {occupiedTables.length} Occupied
                            </Badge>
                            <Badge color="warning" className="mr-1">
                              {reservedTables.length} Reserved
                            </Badge>
                            <Badge color="secondary" className="mr-1">
                              {maintenanceTables.length} Maintenance
                            </Badge>
                            {!isConsistent && (
                              <Badge color="danger" className="ml-1">
                                <i className="fas fa-exclamation-triangle mr-1"></i>
                                Count Mismatch ({totalCount}/{tables.length})
                              </Badge>
                            )}
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                  <div>
                    <Button color="info" size="sm" className="mr-2" onDoubleClick={() => setTestMode(!testMode)} onClick={async () => {
                      // Force a complete data refresh
                      try {
                        // Refresh tables to get latest status
                        if (isSuperAdmin()) {
                          await fetchTables();
                        } else if (user && user.restaurantId && user.branchId) {
                          await fetchTables({
                            restaurantId: user.restaurantId,
                            branchId: user.branchId
                          });
                        }
                      } catch (err) {
                        console.error('Error refreshing table status:', err);
                      }
                    }}>
                      <i className="fas fa-sync-alt mr-1"></i> Refresh Status
                    </Button>
                    {testMode && (
                      <Button color="warning" size="sm" className="mr-2" onClick={setTestStatuses}>
                        <i className="fas fa-vial mr-1"></i> Set Test Statuses
                      </Button>
                    )}
                    <Button color="primary" className="font-weight-bold" onClick={() => {
                      setCurrentEditItem(null);
                      setModalOpen(true);
                    }}>
                      <i className="fas fa-plus mr-2"></i> Add New Table
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Filters */}
                  <div className="mb-4">
                    <h5>Filters</h5>
                    <Row form>
                      <Col md={3}>
                        <FormGroup>
                          <Label for="zone">Zone</Label>
                          <Input 
                            type="select" 
                            name="zone" 
                            id="zone"
                            value={filters.zone}
                            onChange={handleFilterChange}
                          >
                            <option value="">All Zones</option>
                            {tableZones && tableZones.map(zone => (
                              <option key={zone} value={zone}>
                                {zone}
                              </option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={3}>
                        <FormGroup>
                          <Label for="status">Status</Label>
                          <Input 
                            type="select" 
                            name="status" 
                            id="status"
                            value={filters.status}
                            onChange={handleFilterChange}
                          >
                            <option value="">All Statuses</option>
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="reserved">Reserved</option>
                            <option value="maintenance">Maintenance</option>
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={2}>
                        <FormGroup>
                          <Label for="minCapacity">Min Capacity</Label>
                          <Input
                            type="number"
                            name="minCapacity"
                            id="minCapacity"
                            min="1"
                            value={filters.minCapacity}
                            onChange={handleFilterChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={2}>
                        <FormGroup>
                          <Label for="maxCapacity">Max Capacity</Label>
                          <Input
                            type="number"
                            name="maxCapacity"
                            id="maxCapacity"
                            min="1"
                            value={filters.maxCapacity}
                            onChange={handleFilterChange}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={2} className="d-flex align-items-center">
                        <FormGroup check>
                          <Label check>
                            <Input
                              type="checkbox"
                              name="isVIP"
                              checked={filters.isVIP}
                              onChange={handleFilterChange}
                            />{' '}
                            VIP Tables Only
                          </Label>
                        </FormGroup>
                      </Col>
                    </Row>
                    <div className="mt-2">
                      <Button color="info" size="sm" onClick={resetFilters}>
                        <i className="fas fa-sync-alt mr-1"></i> Reset Filters
                      </Button>
                    </div>
                  </div>
                  
                  <Table className="align-items-center table-flush" responsive>
                  <thead className="thead-light">
                    <tr>
                      <th scope="col">Table ID</th> 
                      <th scope="col">Name</th>
                      <th scope="col">Capacity</th>
                      <th scope="col">Zone</th>
                      <th scope="col">Floor</th>
                      <th scope="col">Status</th>
                      <th scope="col">Current Order</th>
                      <th scope="col">QR Code</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <p className="text-danger mb-0">Error loading tables: {error}</p>
                        </td>
                      </tr>
                    ) : tables && tables.length > 0 ? tables.map((table) => (
                      <tr key={table._id}>
                        <td>
                          <span className="mb-0 text-sm">
                            {table.tableId}
                          </span>
                        </td> 
                        <td>
                          <span className="mb-0 text-sm font-weight-bold">
                            {table.TableName}
                          </span>
                          {table.isVIP && (
                            <Badge color="info" pill className="ml-2">VIP</Badge>
                          )}
                        </td>
                        <td>{table.capacity} persons</td>
                        <td>{table.location?.zone || 'Main'}</td>
                        <td>
                          {table.location?.floor ? (
                            <Badge color="primary" className="px-2">
                              {Array.isArray(floors) && floors.find(f => f._id === table.location.floor)?.name || 'Floor ' + table.location.floor}
                            </Badge>
                          ) : (
                            <span className="text-muted">Not assigned</span>
                          )}
                        </td>
                        <td>
                          {getStatusBadge(table)}
                        </td>
                        <td>
                          {table.currentOrder || table.currentOrderId ? (
                            <div>
                              <Badge color="info" className="mb-1">
                                <i className="fas fa-utensils mr-1"></i>
                                Active Order
                              </Badge>
                              {table.currentOrder && table.currentOrder.orderNumber && (
                                <div className="small text-muted">
                                  #{table.currentOrder.orderNumber}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">No active order</span>
                          )}
                        </td>
                        <td>
                          <Button
                            color="secondary"
                            size="sm"
                            onClick={() => {
                              // Create QR code and download immediately
                              const qrCodeValue = `${window.location.origin}/menu?tableId=${table._id}&tableName=${encodeURIComponent(table.TableName)}`;
                              
                              // Create a QR code element temporarily in the DOM
                              const qrContainer = document.createElement('div');
                              qrContainer.style.position = 'absolute';
                              qrContainer.style.left = '-9999px';
                              document.body.appendChild(qrContainer);
                              
                              // Render the QR code to the temporary container
                              const qrCode = document.createElement('canvas');
                              qrContainer.appendChild(qrCode);
                              
                              // Use the library directly without React
                              import('qrcode').then(QRCode => {
                                QRCode.toCanvas(qrCode, qrCodeValue, {
                                  width: 256,
                                  margin: 4,
                                  color: {
                                    dark: '#000000',
                                    light: '#ffffff'
                                  },
                                  errorCorrectionLevel: 'H'
                                }, function(error) {
                                  if (error) {
                                    console.error("Error generating QR code:", error);
                                    alert("Failed to generate QR code");
                                    document.body.removeChild(qrContainer);
                                    return;
                                  }
                                  
                                  // Create a temporary link element for download
                                  const link = document.createElement("a");
                                  link.href = qrCode.toDataURL("image/png");
                                  link.download = `Table_QR_${table.TableName.replace(/\s+/g, '_')}.png`;
                                  
                                  // Trigger download
                                  document.body.appendChild(link);
                                  link.click();
                                  
                                  // Clean up
                                  document.body.removeChild(link);
                                  document.body.removeChild(qrContainer);
                                });
                              }).catch(err => {
                                console.error("Error loading QRCode library:", err);
                                alert("Failed to load QR code generator");
                                document.body.removeChild(qrContainer);
                              });
                            }}
                            className="mr-2"
                          >
                            <i className="fas fa-qrcode"></i> QR Code
                          </Button> 
                        </td>
                        <td>
                          <Button
                            color="primary"
                            size="sm"
                            className="mr-1"
                            onClick={() => handleEditTable(table)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            color="info"
                            size="sm"
                            className="mr-1"
                            onClick={() => handleViewReservations(table)}
                          >
                            <i className="fas fa-calendar"></i>
                          </Button>
                          <Button
                            color="secondary"
                            size="sm"
                            className="mr-1"
                            onClick={() => navigate(`/admin/tables-management/${table._id}`)}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this table?")) {
                                deleteTable(table._id);
                              }
                            }}
                            disabled={table.isOccupied || table.status === 'occupied' || table.currentOrder || table.currentOrderId}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <p className="font-italic text-muted mb-0">No tables available</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  </Table>
                </CardBody>
                {tables && tables.length > 0 && (
                <CardFooter className="py-4">
                  <nav aria-label="...">
                    <Pagination
                      className="pagination justify-content-end mb-0"
                      listClassName="justify-content-end mb-0"
                    >
                      <PaginationItem className="disabled">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                          tabIndex="-1"
                        >
                          <i className="fas fa-angle-left" />
                          <span className="sr-only">Previous</span>
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem className="active">
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#pablo"
                          onClick={(e) => e.preventDefault()}
                        >
                          <i className="fas fa-angle-right" />
                          <span className="sr-only">Next</span>
                        </PaginationLink>
                      </PaginationItem>
                    </Pagination>
                  </nav>
                </CardFooter>
                )}
              </Card>
            )}
            
            {activeTab === 'grid' && (
              <Card className="shadow">
                <CardHeader className="d-flex justify-content-between align-items-center py-3">
                  <div>
                    <h3 className="mb-0 font-weight-bold">
                      <i className="fas fa-th-large mr-2"></i>Table Grid View
                    </h3>
                    <p className="mb-0 small">
                      <i className="fas fa-info-circle mr-1"></i>Click on any table to view current orders
                      {tables && tables.length > 0 && (() => {
                        // Calculate mutually exclusive counts
                        const occupiedTables = tables.filter(t => 
                          t.currentOrder || t.currentOrderId || t.isOccupied || t.status === 'occupied'
                        );
                        const reservedTables = tables.filter(t => 
                          t.status === 'reserved' && !occupiedTables.includes(t)
                        );
                        const maintenanceTables = tables.filter(t => 
                          t.status === 'maintenance' && !occupiedTables.includes(t) && !reservedTables.includes(t)
                        );
                        const availableTables = tables.filter(t => 
                          !occupiedTables.includes(t) && !reservedTables.includes(t) && !maintenanceTables.includes(t)
                        );
                        
                        return (
                          <span className="ml-2">
                            <Badge color="success" className="mr-1">
                              {availableTables.length} Available
                            </Badge>
                            <Badge color="danger" className="mr-1">
                              {occupiedTables.length} Occupied
                            </Badge>
                            <Badge color="warning" className="mr-1">
                              {reservedTables.length} Reserved
                            </Badge>
                            <Badge color="secondary" className="mr-1">
                              {maintenanceTables.length} Maintenance
                            </Badge>
                          </span>
                        );
                      })()}
                    </p>
                  </div>
                  <div>
                    <Button color="info" size="sm" className="mr-2" onClick={async () => {
                      // Force a complete data refresh
                      try {
                        if (isSuperAdmin()) {
                          await fetchTables();
                        } else if (user && user.restaurantId && user.branchId) {
                          await fetchTables({
                            restaurantId: user.restaurantId,
                            branchId: user.branchId
                          });
                        }
                      } catch (err) {
                        console.error('Error refreshing table status:', err);
                      }
                    }}>
                      <i className="fas fa-sync-alt mr-1"></i> Refresh Status
                    </Button>
                    <Button color="primary" className="font-weight-bold" onClick={() => {
                      setCurrentEditItem(null);
                      setModalOpen(true);
                    }}>
                      <i className="fas fa-plus mr-2"></i> Add New Table
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Status Legend */}
                  <div className="mb-4">
                    <h5>Status Legend</h5>
                    <div className="d-flex flex-wrap">
                      <div className="mr-3 mb-2 d-flex align-items-center">
                        <div className="mr-2" style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#28a745',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}></div>
                        <span>Available</span>
                      </div>
                      <div className="mr-3 mb-2 d-flex align-items-center">
                        <div className="mr-2" style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#dc3545',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}></div>
                        <span>Occupied</span>
                      </div>
                      <div className="mr-3 mb-2 d-flex align-items-center">
                        <div className="mr-2" style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#ffc107',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}></div>
                        <span>Reserved</span>
                      </div>
                      <div className="mr-3 mb-2 d-flex align-items-center">
                        <div className="mr-2" style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#6c757d',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}></div>
                        <span>Maintenance</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid View */}
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-5">
                      <p className="text-danger mb-0">Error loading tables: {error}</p>
                    </div>
                  ) : tables && tables.length > 0 ? (
                    <Row>
                      {tables.map((table) => (
                        <Col key={table._id} xs={6} sm={4} md={3} lg={2} className="mb-4">
                          <div
                            className="table-grid-item"
                            style={{
                              backgroundColor: getStatusColor(table),
                              border: '2px solid #ddd',
                              borderRadius: '8px',
                              padding: '15px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              minHeight: '120px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              position: 'relative',
                              color: 'white',
                              fontWeight: 'bold',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}
                            onClick={() => fetchTableOrders(table)}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            {/* VIP Badge */}
                            {table.isVIP && (
                              <div style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                backgroundColor: '#ffd700',
                                color: '#000',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                VIP
                              </div>
                            )}
                            
                            <div className="mb-2">
                              <i className="fas fa-chair" style={{ fontSize: '24px' }}></i>
                            </div>
                            <div className="font-weight-bold" style={{ fontSize: '14px' }}>
                              {table.TableName}
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>
                              {table.capacity} seats
                            </div>
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>
                              {getStatusText(table)}
                            </div>
                            
                            {/* Active Order Indicator */}
                            {(table.currentOrder || table.currentOrderId) && (
                              <div style={{
                                position: 'absolute',
                                bottom: '5px',
                                left: '5px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                padding: '2px 6px',
                                fontSize: '10px'
                              }}>
                                <i className="fas fa-utensils mr-1"></i>
                                Active Order
                              </div>
                            )}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted mb-0">No tables found. Add some tables to get started.</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}
            
            {activeTab === 'floor-plan' && (
              <FloorPlan />
            )}
            
            {activeTab === 'floor-management' && (
              <FloorManagement />
            )}
            
            {activeTab === 'orders' && (
              <TableOrderAssignment />
            )}
          </Col>
        </Row>
      </Container>
      
      {/* Table Modal (for both Add and Edit) */}
      <Modal isOpen={modalOpen} toggle={handleCloseModal} size="lg">
        <ModalHeader toggle={handleCloseModal} className={`bg-gradient-${currentEditItem ? 'warning' : 'success'} text-white py-3`}>
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className={`fas ${currentEditItem ? 'fa-edit' : 'fa-plus'} mr-2`}></i>
              {currentEditItem ? 'Edit Dining Table' : 'Add New Dining Table'}
            </h4>
            <p className="text-white-50 mb-0 small">
              {currentEditItem ? 'Update the details of an existing table' : 'Create a new table in your restaurant'}
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <Form>
            {currentEditItem && (
              <FormGroup>
                <Label for="tableIdDisplay">Table ID</Label>
                <Input
                  type="text"
                  id="tableIdDisplay"
                  value={currentEditItem.tableId || ''}
                  disabled
                  className="bg-light"
                />
                <small className="form-text text-muted">
                  Table ID is auto-generated and cannot be modified.
                </small>
              </FormGroup>
            )}
            
            <Row form>
              <Col md={6}>
                <FormGroup>
                  <Label for="TableName">Table Name*</Label>
                  <Input
                    type="text"
                    name="TableName"
                    id="TableName"
                    placeholder="Table Name"
                    value={formData.TableName}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="capacity">Capacity*</Label>
                  <Input
                    type="number"
                    name="capacity"
                    id="capacity"
                    placeholder="Number of persons"
                    min="1"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </Col>
            </Row>
            
            <Row form>
              <Col md={6}>
                <FormGroup>
                  <Label for="shape">Shape</Label>
                  <Input
                    type="select"
                    name="shape"
                    id="shape"
                    value={formData.shape}
                    onChange={handleInputChange}
                  >
                    <option value="square">Square</option>
                    <option value="round">Round</option>
                    <option value="rectangle">Rectangle</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="location.zone">Zone</Label>
                  <Input
                    type="select"
                    name="location.zone"
                    id="location.zone"
                    value={formData.location?.zone || 'Main'}
                    onChange={handleInputChange}
                  >
                    <option value="Main">Main</option>
                    <option value="Patio">Patio</option>
                    <option value="Private">Private</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>
            
            <Row form>
              <Col md={6}>
                <FormGroup>
                  <Label for="location.floor">Floor</Label>
                  <Input
                    type="select"
                    name="location.floor"
                    id="location.floor"
                    value={formData.location?.floor || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Floor</option>
                    {Array.isArray(floors) ? floors.map(floor => (
                      <option key={floor._id} value={floor._id}>
                        {floor.name} (Level {floor.level})
                      </option>
                    )) : (
                      <option value="" disabled>Loading floors...</option>
                    )}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="status">Table Status</Label>
                  <Input
                    type="select"
                    name="status"
                    id="status"
                    value={formData.status || 'available'}
                    onChange={handleInputChange}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </Input>
                  <small className="form-text text-muted">
                    Current status of the table
                  </small>
                </FormGroup>
              </Col>
            </Row>
            
            <FormGroup check className="mb-3">
              <Label check>
                <Input
                  type="checkbox"
                  name="isVIP"
                  checked={formData.isVIP}
                  onChange={handleInputChange}
                />{' '}
                VIP Table
              </Label>
              <small className="form-text text-muted">
                Mark as VIP for special service and reservations
              </small>
            </FormGroup>
            
            <FormGroup>
              <Label for="notes">Notes</Label>
              <Input
                type="textarea"
                name="notes"
                id="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional details about this table"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={handleCloseModal}>Cancel</Button>{' '}
          <Button color="primary" onClick={handleSaveTable}>
            {currentEditItem ? 'Update' : 'Save'}
          </Button>
        </ModalFooter>
      </Modal>
      
      {/* Reservations Modal */}
      {selectedTable && (
        <Modal isOpen={reservationsModalOpen} toggle={() => setReservationsModalOpen(false)} size="xl">
          <ModalBody className="p-0">
            <TableReservations 
              tableId={selectedTable._id}
              tableName={selectedTable.TableName} 
              onClose={() => setReservationsModalOpen(false)} 
            />
          </ModalBody>
        </Modal>
      )}
      
      {/* Table Orders Modal */}
      {selectedTableForOrders && (
        <Modal isOpen={tableOrdersModalOpen} toggle={() => setTableOrdersModalOpen(false)} size="xl">
          <ModalHeader toggle={() => setTableOrdersModalOpen(false)} className="bg-gradient-info text-white py-3">
            <div>
              <h4 className="mb-0 text-white font-weight-bold">
                <i className="fas fa-receipt me-2"></i>
                Orders for {selectedTableForOrders?.TableName}
                {/* Show warning if this might be fallback data */}
                {!selectedTableForOrders?.currentOrderId && tableOrders.length > 0 && (
                  <small className="text-warning ms-2 ml-2">
                    <i className="fas fa-exclamation-triangle me-1"></i>
                    (Recent orders - table relationship missing)
                  </small>
                )}
              </h4>
              <p className="text-white-50 mb-0 small">
                <i className="fas fa-info-circle mr-1"></i>
                Current and recent orders for this table
                {selectedTableForOrders.isVIP && (
                  <Badge color="warning" className="ml-2">VIP Table</Badge>
                )}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            {loadingTableOrders ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Loading orders...</span>
                </div>
                <p className="mt-2 text-muted">Loading table orders...</p>
              </div>
            ) : tableOrders && tableOrders.length > 0 ? (
              <div>
                <div className="mb-3 d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="fas fa-list mr-2"></i>
                    {tableOrders.length} Order{tableOrders.length !== 1 ? 's' : ''} Found
                    {tableOrders.length > 0 && (
                      <span className="ml-2 text-success">
                        <i className="fas fa-dollar-sign mr-1"></i>
                        Total: ${tableOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toFixed(2)}
                      </span>
                    )}
                  </h5>
                  <div>
                    {tableOrders.length > 0 && (
                      <Button color="success" size="sm" className="mr-2" onClick={printAllOrdersBill}>
                        <i className="fas fa-print mr-1"></i> Print All Bills
                      </Button>
                    )}
                    <Button color="info" size="sm" className="mr-2" onClick={() => {
                      // Refresh table orders
                      fetchTableOrders(selectedTableForOrders);
                    }}>
                      <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </Button>
                  </div>
                </div>
                
                <Row>
                  {tableOrders.map((order, index) => ( 
                    <Col key={order._id} md={6} lg={4} className="mb-4">
                      <Card className="h-100 shadow-sm border-0" style={{
                        borderLeft: `4px solid ${
                          order.orderStatus === 'Completed' ? '#28a745' :
                          order.orderStatus === 'preparing' ? '#ffc107' :
                          order.orderStatus === 'pending' ? '#17a2b8' :
                          order.orderStatus === 'cancelled' ? '#dc3545' : '#6c757d'
                        }`
                      }}>
                        <CardHeader className="bg-lighter py-3 border-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 font-weight-bold text-dark">
                                <i className="fas fa-receipt mr-2 text-primary"></i>
                                Order #{order.orderNumber || order._id?.substring(0, 8)}
                              </h6>
                              <small className="text-muted d-block">
                                <i className="fas fa-clock mr-1"></i>
                                {new Date(order.createdAt).toLocaleString()}
                              </small>
                              <small className="text-muted d-block mt-1">
                                <i className="fas fa-utensils mr-1"></i>
                                {order.OrderType || 'dine-in'}
                              </small>
                            </div>
                            <div className="text-right">
                              <Badge color={
                                order.orderStatus === 'Completed' ? 'success' :
                                order.orderStatus === 'preparing' ? 'warning' :
                                order.orderStatus === 'pending' ? 'info' :
                                order.orderStatus === 'cancelled' ? 'danger' : 'secondary'
                              } className="text-uppercase mb-1" style={{ fontSize: '10px' }}>
                                {order.orderStatus || 'pending'}
                              </Badge>
                              <div>
                                <Badge color={
                                  order.paymentStatus === 'paid' ? 'success' :
                                  order.paymentStatus === 'pending' ? 'warning' :
                                  order.paymentStatus === 'failed' ? 'danger' : 
                                  order.paymentStatus === 'unpaid' ? 'danger' : 'secondary'
                                } style={{ fontSize: '9px' }}>
                                  {order.paymentStatus || 'unpaid'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardBody className="py-3">
                          {/* Order Summary */}
                          <div className="mb-3">
                            <div className="row text-center">
                              <div className="col-4">
                                <div className="text-muted small">Items</div>
                                <div className="font-weight-bold text-primary">
                                  <i className="fas fa-list mr-1"></i>
                                  {order.items?.length || 0}
                                </div>
                              </div>
                              <div className="col-4">
                                <div className="text-muted small">Total</div>
                                <div className="font-weight-bold text-success">
                                  <i className="fas fa-dollar-sign mr-1"></i>
                                  {(order.totalAmount || 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="col-4">
                                <div className="text-muted small">Duration</div>
                                <div className="font-weight-bold text-info">
                                  <i className="fas fa-clock mr-1"></i>
                                  {Math.floor((new Date() - new Date(order.createdAt)) / (1000 * 60))}m
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Order Items */}
                          {order.items && order.items.length > 0 && (
                            <div className="mb-3">
                              <h6 className="mb-2 text-muted small">ITEMS ({order.items.length}):</h6>
                              <div className="order-items" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {order.items.slice(0, 3).map((item, itemIndex) => (
                                  <div key={itemIndex} className="d-flex justify-content-between align-items-center mb-1 p-2 bg-translucent-white rounded">
                                    <div className="flex-grow-1">
                                      <span className="small font-weight-bold">{item.name || item.itemName}</span>
                                      <div className="text-muted" style={{ fontSize: '11px' }}>
                                        Qty: {item.quantity} × ${(item.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                    <span className="small font-weight-bold text-primary">
                                      ${((item.price || 0) * item.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-center text-muted small">
                                    +{order.items.length - 3} more items
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="d-flex justify-content-between align-items-center">
                            <Button 
                              color="primary" 
                              size="sm" 
                              className="shadow-sm"
                              onClick={() => printOrderBill(order)}
                              style={{ borderRadius: '20px' }}
                            >
                              <i className="fas fa-print mr-1"></i> Print Bill
                            </Button>
                            <Button 
                              color="info" 
                              size="sm" 
                              outline 
                              className="shadow-sm"
                              onClick={() => {
                                // Navigate to order details (if needed)
                                console.log('View order details:', order._id);
                              }}
                              style={{ borderRadius: '20px' }}
                            >
                              <i className="fas fa-eye mr-1"></i> Details
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i className="fas fa-utensils text-muted" style={{ fontSize: '48px' }}></i>
                </div>
                <h5 className="text-muted">No Orders Found</h5>
                <p className="text-muted mb-0">
                  This table currently has no active or recent orders.
                </p>
                <Button color="primary" className="mt-3" onClick={() => {
                  // Option to create new order or navigate to order creation
                  console.log('Create new order for table:', selectedTableForOrders._id);
                }}>
                  <i className="fas fa-plus mr-1"></i> Create New Order
                </Button>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <div className="d-flex justify-content-between w-100">
              <div>
                {tableOrders && tableOrders.length > 0 && (
                  <Button color="success" onClick={printAllOrdersBill}>
                    <i className="fas fa-print mr-1"></i> Print All Bills
                  </Button>
                )}
              </div>
              <Button color="secondary" onClick={() => setTableOrdersModalOpen(false)}>
                Close
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default TableManagement;