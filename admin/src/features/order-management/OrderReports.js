import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Button, Badge, Form, FormGroup, Label, Input,
  Spinner, Alert, Table, InputGroup, InputGroupAddon, InputGroupText,
  Modal, ModalHeader, ModalBody, ModalFooter, Collapse
} from 'reactstrap';
import classnames from 'classnames';
import { format, parseISO, subDays, subMonths, addMonths } from 'date-fns';
import { 
  FaFileDownload, FaFilePdf, FaFileExcel, FaFileCsv,
  FaCalendarAlt, FaChartBar, FaChartPie, FaChartLine,
  FaFilter, FaTable, FaSortAmountDown, FaSyncAlt,
  FaStore, FaBuilding, FaPercentage, FaStar,
  FaDollarSign, FaRupeeSign, FaUtensils, FaTags, FaShoppingBag,
  FaPrint, FaClipboardList, FaBoxes, FaFileInvoice,
  FaPoundSign, FaEuroSign, FaYenSign
} from 'react-icons/fa';
import Header from '../../components/Headers/Header';
import { AuthContext } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { useCurrency } from '../../context/CurrencyContext';

// Chart components
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';

// Define chart colors with better contrast and accessibility
const chartColors = {
  primary: 'rgba(66, 133, 244, 0.7)',
  primaryBorder: 'rgba(66, 133, 244, 1)',
  success: 'rgba(52, 168, 83, 0.7)',
  successBorder: 'rgba(52, 168, 83, 1)',
  danger: 'rgba(234, 67, 53, 0.7)',
  dangerBorder: 'rgba(234, 67, 53, 1)',
  warning: 'rgba(251, 188, 5, 0.7)',
  warningBorder: 'rgba(251, 188, 5, 1)',
  info: 'rgba(26, 115, 232, 0.7)',
  infoBorder: 'rgba(26, 115, 232, 1)',
  purple: 'rgba(103, 58, 183, 0.7)',
  purpleBorder: 'rgba(103, 58, 183, 1)',
};

// Helper function to get the appropriate currency icon based on currency code
const getCurrencyIcon = (currencyCode) => {
  switch (currencyCode) {
    case 'USD':
      return <FaDollarSign size="1.5rem" />;
    case 'GBP':
      return <FaPoundSign size="1.5rem" />;
    case 'EUR':
      return <FaEuroSign size="1.5rem" />;
    case 'JPY':
    case 'CNY':
      return <FaYenSign size="1.5rem" />;
    case 'INR':
    default:
      return <FaRupeeSign size="1.5rem" />;
  }
};

const OrderReports = () => {
  const { user } = useContext(AuthContext);
  const { 
    orders: rawOrders,
    loading, 
    error, 
    restaurants, 
    branches,
    getAllOrders,
    generateOrderReport, 
    exportOrderData,
    getRestaurants,
    getBranchesForRestaurant
  } = useOrder();
  
  // Ensure orders is always an array to prevent errors
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  
  // Get currency information from CurrencyContext
  const { currencyCode, formatCurrency } = useCurrency();

  // State management
  const [activeTab, setActiveTab] = useState('sales');
  const [showFilters, setShowFilters] = useState(false);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [exportModal, setExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [reportTitle, setReportTitle] = useState('');
  const [tableView, setTableView] = useState(false);
  
  // Reference to track initial data load
  const initialFetchDone = React.useRef(false);

  // Initialize and load data
  useEffect(() => {
    if (user && !initialFetchDone.current) {
      initialFetchDone.current = true;
      
      // Force refresh on first load to get fresh data
      getAllOrders({}, true);
      
      // If Super_Admin, get restaurants for filtering
      if (user.role === 'Super_Admin') {
        getRestaurants();
      } 
      // If Restaurant_Admin with a restaurantId, load its branches
      else if (user.role === 'Restaurant_Admin' && user.restaurantId) {
        setSelectedRestaurant(user.restaurantId);
        getBranchesForRestaurant(user.restaurantId);
      }
      // If Branch_Admin, automatically select their branch
      else if (user.role === 'Branch_Admin' && user.branchId) {
        if (user.restaurantId) {
          setSelectedRestaurant(user.restaurantId);
          getBranchesForRestaurant(user.restaurantId).then(() => {
            setSelectedBranch(user.branchId);
          });
        }
      }
    }
  }, [user]); // Remove function dependencies to prevent infinite loop

  // Fetch orders when date range or filters change
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [dateRange, selectedRestaurant, selectedBranch, paymentStatusFilter, orderTypeFilter]);

  // Log order count when orders change
  useEffect(() => {
    if (orders && orders.length > 0) {
      console.log('Order count debug - Orders updated:', {
        totalOrders: orders.length,
        ordersInDateRange: getFilteredOrders().length
      });
    }
  }, [orders, dateRange]);

  // Handle restaurant selection with country code update
  const handleRestaurantChange = async (e) => {
    const restaurantId = e.target.value;
    setSelectedRestaurant(restaurantId);
    setSelectedBranch(''); // Reset branch when restaurant changes
    
    if (restaurantId) {
      await getBranchesForRestaurant(restaurantId);
    }
  };
  
  // Handle branch selection change
  const handleBranchChange = async (e) => {
    const branchId = e.target.value;
    setSelectedBranch(branchId);
  };

  // Update time range and date range together
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    
    const today = new Date();
    let start;
    
    switch (range) {
      case 'day':
        start = today;
        break;
      case 'week':
        start = subDays(today, 7);
        break;
      case 'month':
        start = subDays(today, 30);
        break;
      case 'quarter':
        start = subMonths(today, 3);
        break;
      case 'year':
        start = subMonths(today, 12);
        break;
      default:
        start = subDays(today, 7);
    }
    
    setDateRange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    });
  };

  // Handle date range change
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    setTimeRange('custom');
  };

  // Fetch orders based on selected filters
  const fetchOrders = async () => {
    try {
      // Build filters object with user role context in mind
      let filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      // Add restaurant filter
      if (selectedRestaurant) {
        filters.restaurantId = selectedRestaurant;
      } else if (user?.restaurantId) {
        filters.restaurantId = user.restaurantId;
        setSelectedRestaurant(user.restaurantId);
      }
      
      // Add branch filter
      if (selectedBranch) {
        filters.branchId = selectedBranch;
      } else if (user?.branchId) {
        filters.branchId = user.branchId;
        setSelectedBranch(user.branchId);
      }
      
      console.log('OrderReports: Fetching orders with filters:', filters);
      
      // Fetch orders using the same method as OrderManagement
      const result = await getAllOrders(filters, true);
      
      if (result.success) {
        console.log('OrderReports: Orders fetched successfully:', result.orders?.length || 0, 'orders');
      } else {
        console.error('OrderReports: Error fetching orders:', result.message);
      }
    } catch (error) {
      console.error('OrderReports: Error fetching orders:', error);
    }
  };

  // Handle tab change
  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      // The useEffect will handle fetching when activeTab changes
    }
  };

  // Apply filters
  const applyFilters = () => {
    fetchOrders();
  };

  // Reset filters
  const resetFilters = () => {
    setTimeRange('week');
    setSelectedRestaurant('');
    setSelectedBranch('');
    setPaymentStatusFilter('');
    setOrderTypeFilter('');
    setDateRange({
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  // Handle export
  const handleExport = async () => {
    const filters = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      restaurantId: selectedRestaurant,
      branchId: selectedBranch,
      reportTitle: reportTitle || getReportTitle()
    };
    
    if (exportFormat === 'pdf') {
      await generateOrderReport(activeTab, filters);
    } else {
      await exportOrderData(exportFormat, filters);
    }
    
    setExportModal(false);
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get filtered orders based on date range and other filters
  const getFilteredOrders = () => {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(order => {
      // Filter by date range
      const orderDate = order.orderDate || order.createdAt || order.date;
      if (orderDate) {
        const orderDay = format(parseISO(orderDate), 'yyyy-MM-dd');
        if (orderDay < dateRange.startDate || orderDay > dateRange.endDate) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Get total revenue from filtered orders
  const getTotalRevenue = () => {
    const filteredOrders = getFilteredOrders();
    const total = filteredOrders.reduce((sum, order) => {
      const amount = parseFloat(order.totalAmount || order.total || 0);
      return sum + amount;
    }, 0);
    
    console.log('getTotalRevenue: calculated total:', total, 'from', filteredOrders.length, 'orders');
    return formatCurrency(total);
  };

  // Get order count from filtered orders
  const getOrderCount = () => {
    const filteredOrders = getFilteredOrders();
    const count = filteredOrders.length;
    
    console.log('getOrderCount: calculated count:', count);
    return count;
  };

  // Get average order value
  const getAverageOrderValue = () => {
    const filteredOrders = getFilteredOrders();
    if (filteredOrders.length === 0) return formatCurrency(0);
    
    const total = filteredOrders.reduce((sum, order) => {
      const amount = parseFloat(order.totalAmount || order.total || 0);
      return sum + amount;
    }, 0);
    
    const average = total / filteredOrders.length;
    return formatCurrency(average);
  };

  // Get orders by status for status distribution
  const getOrdersByStatus = () => {
    const filteredOrders = getFilteredOrders();
    const statusCount = {};
    
    filteredOrders.forEach(order => {
      const status = order.orderStatus || order.status || 'pending';
      const normalizedStatus = status.toLowerCase();
      
      if (!statusCount[normalizedStatus]) {
        statusCount[normalizedStatus] = 0;
      }
      statusCount[normalizedStatus]++;
    });
    
    return statusCount;
  };

  // Get daily sales data
  const getDailySalesData = () => {
    const filteredOrders = getFilteredOrders();
    const dailyData = {};
    
    filteredOrders.forEach(order => {
      const orderDate = order.orderDate || order.createdAt || order.date;
      if (orderDate) {
        const day = format(parseISO(orderDate), 'yyyy-MM-dd');
        
        if (!dailyData[day]) {
          dailyData[day] = {
            date: day,
            orderCount: 0,
            revenue: 0
          };
        }
        
        dailyData[day].orderCount++;
        dailyData[day].revenue += parseFloat(order.totalAmount || order.total || 0);
      }
    });
    
    // Convert to array and sort by date
    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Get completion rate
  const getCompletionRate = () => {
    const filteredOrders = getFilteredOrders();
    const completedOrders = filteredOrders.filter(order => 
      order.status === 'completed' || order.status === 'delivered'
    );
    const rate = filteredOrders.length > 0 ? (completedOrders.length / filteredOrders.length) * 100 : 0;
    return `${rate.toFixed(1)}%`;
  };

  // Get payment status distribution with null safety
  const getPaymentStatusDistribution = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return {};
    }

    const statusCounts = {};
    filteredOrders.forEach(order => {
      const status = order.paymentStatus || 'unpaid';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return statusCounts;
  };

  // Get order status distribution with null safety
  const getOrderStatusDistribution = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return {};
    }

    const statusCounts = {};
    filteredOrders.forEach(order => {
      const status = order.orderStatus || order.status || 'pending';
      const normalizedStatus = status.toLowerCase();
      statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
    });

    return statusCounts;
  };

  // Get order completion rate for performance analytics
  const getOrderCompletionRate = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return '0%';
    }

    // Debug: Log actual order statuses to understand the data structure
    console.log('getOrderCompletionRate: Sample order statuses:', 
      filteredOrders.slice(0, 3).map(order => ({
        orderStatus: order.orderStatus,
        status: order.status,
        orderState: order.orderState,
        state: order.state
      }))
    );

    const completedOrders = filteredOrders.filter(order => {
      // Check multiple possible status field names and values
      const status1 = (order.orderStatus || '').toLowerCase();
      const status2 = (order.status || '').toLowerCase();
      const status3 = (order.orderState || '').toLowerCase();
      const status4 = (order.state || '').toLowerCase();
      
      const completedStatuses = ['completed', 'delivered', 'complete', 'done', 'finished'];
      
      return completedStatuses.some(completedStatus => 
        status1.includes(completedStatus) || 
        status2.includes(completedStatus) || 
        status3.includes(completedStatus) || 
        status4.includes(completedStatus)
      );
    });
    
    console.log(`getOrderCompletionRate: Found ${completedOrders.length} completed orders out of ${filteredOrders.length} total`);
    
    const rate = (completedOrders.length / filteredOrders.length) * 100;
    return `${rate.toFixed(1)}%`;
  };

  // Get revenue by order status with comprehensive analytics
  const getRevenueByOrderStatus = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return [];
    }

    const statusData = {};
    let totalRevenue = 0;
    let totalOrders = filteredOrders.length;

    filteredOrders.forEach(order => {
      const status = order.orderStatus || order.status || 'pending';
      const normalizedStatus = status.toLowerCase();
      const revenue = parseFloat(order.totalAmount || order.total || 0);
      totalRevenue += revenue;

      if (!statusData[normalizedStatus]) {
        statusData[normalizedStatus] = {
          revenue: 0,
          count: 0,
          orders: []
        };
      }

      statusData[normalizedStatus].revenue += revenue;
      statusData[normalizedStatus].count += 1;
      statusData[normalizedStatus].orders.push(order);
    });

    return Object.entries(statusData).map(([status, data]) => ({
      status,
      revenue: data.revenue,
      count: data.count,
      averageValue: data.count > 0 ? data.revenue / data.count : 0,
      revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      orderPercentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // Get revenue by payment status with comprehensive analytics
  const getRevenueByPaymentStatus = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return [];
    }

    const statusData = {};
    let totalRevenue = 0;
    let totalOrders = filteredOrders.length;

    filteredOrders.forEach(order => {
      const status = order.paymentStatus || 'unpaid';
      const revenue = parseFloat(order.totalAmount || order.total || 0);
      totalRevenue += revenue;

      if (!statusData[status]) {
        statusData[status] = {
          revenue: 0,
          count: 0,
          orders: []
        };
      }

      statusData[status].revenue += revenue;
      statusData[status].count += 1;
      statusData[status].orders.push(order);
    });

    return Object.entries(statusData).map(([status, data]) => ({
      status,
      revenue: data.revenue,
      count: data.count,
      averageValue: data.count > 0 ? data.revenue / data.count : 0,
      revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      orderPercentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // Get paid orders rate for summary card
  const getPaidOrdersRate = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return '0%';
    }

    const paidOrders = filteredOrders.filter(order => 
      (order.paymentStatus || 'unpaid') === 'paid'
    );
    const rate = (paidOrders.length / filteredOrders.length) * 100;
    return `${rate.toFixed(1)}%`;
  };

  // Get order type distribution with smart normalization
  const getOrderTypeDistribution = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return {};
    }

    const typeCounts = {};
    filteredOrders.forEach(order => {
      let orderType = order.OrderType || order.orderType || 'Dine In';
      
      // Normalize order type variations
      orderType = orderType.toLowerCase();
      if (orderType.includes('dine')) orderType = 'Dine In';
      else if (orderType.includes('take')) orderType = 'Takeaway';
      else if (orderType.includes('deliver')) orderType = 'Delivery';
      else if (orderType.includes('pickup')) orderType = 'Pickup';
      else orderType = orderType.charAt(0).toUpperCase() + orderType.slice(1);

      typeCounts[orderType] = (typeCounts[orderType] || 0) + 1;
    });

    return typeCounts;
  };

  // Get revenue by order type
  const getRevenueByOrderType = () => {
    const filteredOrders = getFilteredOrders();
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      return [];
    }

    const typeData = {};
    let totalRevenue = 0;
    let totalOrders = filteredOrders.length;

    filteredOrders.forEach(order => {
      let orderType = order.OrderType || order.orderType || 'Dine In';
      
      // Normalize order type variations
      orderType = orderType.toLowerCase();
      if (orderType.includes('dine')) orderType = 'Dine In';
      else if (orderType.includes('take')) orderType = 'Takeaway';
      else if (orderType.includes('deliver')) orderType = 'Delivery';
      else if (orderType.includes('pickup')) orderType = 'Pickup';
      else orderType = orderType.charAt(0).toUpperCase() + orderType.slice(1);

      const revenue = parseFloat(order.totalAmount || order.total || 0);
      totalRevenue += revenue;

      if (!typeData[orderType]) {
        typeData[orderType] = {
          revenue: 0,
          count: 0
        };
      }

      typeData[orderType].revenue += revenue;
      typeData[orderType].count += 1;
    });

    return Object.entries(typeData).map(([type, data]) => ({
      type,
      revenue: data.revenue,
      count: data.count,
      averageValue: data.count > 0 ? data.revenue / data.count : 0,
      revenuePercentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      orderPercentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  };

  // Get top selling items
  const getTopSellingItems = () => {
    const filteredOrders = getFilteredOrders();
    const itemCount = {};
    
    filteredOrders.forEach(order => {
      const items = order.items || order.orderItems || [];
      items.forEach(item => {
        const itemName = item.name || item.itemName || item.menuItem?.name || 'Unknown Item';
        const quantity = parseInt(item.quantity || 1);
        
        if (!itemCount[itemName]) {
          itemCount[itemName] = {
            name: itemName,
            quantity: 0,
            revenue: 0
          };
        }
        
        itemCount[itemName].quantity += quantity;
        itemCount[itemName].revenue += parseFloat(item.price || item.total || 0) * quantity;
      });
    });
    
    // Convert to array and sort by quantity
    return Object.values(itemCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Top 10 items
  };



  // Chart data for daily sales
  const getDailySalesChart = () => {
    const dailyData = getDailySalesData();
    
    console.log('getDailySalesChart: Processing data:', dailyData);
    
    if (!Array.isArray(dailyData) || dailyData.length === 0) {
      console.log('getDailySalesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: dailyData.map(item => {
        try {
          return format(new Date(item.date), 'MMM dd');
        } catch (error) {
          console.error('Error formatting date:', item.date, error);
          return 'Invalid date';
        }
      }),
      datasets: [
        {
          label: 'Revenue',
          data: dailyData.map(item => {
            const revenue = parseFloat(item.revenue);
            return isNaN(revenue) ? 0 : revenue;
          }),
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primaryBorder,
          borderWidth: 1
        },
        {
          label: 'Orders',
          data: dailyData.map(item => {
            const count = parseInt(item.orderCount);
            return isNaN(count) ? 0 : count;
          }),
          backgroundColor: chartColors.success,
          borderColor: chartColors.successBorder,
          borderWidth: 1,
          yAxisID: 'y-axis-2'
        }
      ]
    };
  };

  // Chart data for monthly sales (grouped from daily data)
  const getMonthlySalesChart = () => {
    const dailyData = getDailySalesData();
    
    if (!Array.isArray(dailyData) || dailyData.length === 0) {
      console.log('getMonthlySalesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Group daily data by month
    const monthlyData = {};
    dailyData.forEach(item => {
      try {
        // Use parseISO to avoid timezone-related month shifts
        const d = parseISO(item.date);
        const monthKey = format(d, 'yyyy-MM');
        const monthLabel = format(d, 'MMM yyyy');
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            key: monthKey,
            label: monthLabel,
            revenue: 0,
            orderCount: 0
          };
        }
        
        monthlyData[monthKey].revenue += Number(item.revenue) || 0;
        monthlyData[monthKey].orderCount += Number(item.orderCount) || 0;
      } catch (error) {
        console.error('Error processing date for monthly chart:', item.date, error);
      }
    });
    
    // Ensure missing months in the selected date range are included with zero values
    try {
      // Build month range from dateRange (component state)
      const startMonth = parseISO(`${dateRange.startDate.slice(0, 7)}-01`);
      const endMonth = parseISO(`${dateRange.endDate.slice(0, 7)}-01`);
      let cursor = startMonth;
      while (cursor <= endMonth) {
        const key = format(cursor, 'yyyy-MM');
        if (!monthlyData[key]) {
          monthlyData[key] = {
            key,
            label: format(cursor, 'MMM yyyy'),
            revenue: 0,
            orderCount: 0
          };
        }
        cursor = addMonths(cursor, 1);
      }
    } catch (e) {
      console.warn('getMonthlySalesChart: Failed to fill missing months:', e);
    }
    
    const data = Object.values(monthlyData).sort((a, b) => a.key.localeCompare(b.key));
    
    if (data.length === 0) {
      console.log('getMonthlySalesChart: No valid data points after grouping');
      return {
        labels: [],
        datasets: []
      };
    }

    // Debug final dataset shape
    console.log('getMonthlySalesChart: Final data points:', data.map(d => ({ key: d.key, label: d.label, revenue: d.revenue })));

    return {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: 'Revenue',
          data: data.map(item => item.revenue),
          backgroundColor: chartColors.info,
          borderColor: chartColors.infoBorder,
          borderWidth: 2,
          fill: false
        }
      ]
    };
  };

  // Chart data for order types
  const getOrderTypesChart = () => {
    const filteredOrders = getFilteredOrders();
    
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      console.log('getOrderTypesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Count orders by type
    const orderTypeCounts = {};
    
    filteredOrders.forEach(order => {
      const orderType = order.OrderType || order.orderType || 'Dine-In';
      const normalizedType = orderType.charAt(0).toUpperCase() + orderType.slice(1).toLowerCase();
      
      if (!orderTypeCounts[normalizedType]) {
        orderTypeCounts[normalizedType] = 0;
      }
      orderTypeCounts[normalizedType]++;
    });

    const labels = Object.keys(orderTypeCounts);
    const data = Object.values(orderTypeCounts);

    console.log('getOrderTypesChart: Calculated totals:', orderTypeCounts);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            chartColors.success,
            chartColors.warning,
            chartColors.info
          ],
          borderColor: [
            chartColors.successBorder,
            chartColors.warningBorder,
            chartColors.infoBorder
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for top selling items
  const getTopItemsChart = () => {
    const topItems = getTopSellingItems();
    
    console.log('getTopItemsChart: Top items data:', topItems);
    
    if (!Array.isArray(topItems) || topItems.length === 0) {
      console.log('getTopItemsChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Generate background colors array with enough colors for all items
    const generateBackgroundColors = (count) => {
      const baseColors = [
        chartColors.primary,
        chartColors.success,
        chartColors.warning,
        chartColors.danger,
        chartColors.info,
        chartColors.purple
      ];
      
      // Repeat the base colors if needed
      const repeats = Math.ceil(count / baseColors.length);
      return Array.from({ length: repeats }, () => baseColors).flat().slice(0, count);
    };

    return {
      labels: topItems.map(item => item.name),
      datasets: [
        {
          label: 'Quantity Sold',
          data: topItems.map(item => item.quantity),
          backgroundColor: generateBackgroundColors(topItems.length),
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for category revenue
  const getCategoryRevenueChart = () => {
    const filteredOrders = getFilteredOrders();
    
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      console.log('getCategoryRevenueChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Calculate revenue by category
    const categoryRevenue = {};
    
    // Debug: Log sample order structure to understand data format
    if (filteredOrders.length > 0) {
      console.log('getCategoryRevenueChart: Sample order structure:', {
        order: filteredOrders[0],
        items: filteredOrders[0].items || filteredOrders[0].orderItems || [],
        sampleItem: (filteredOrders[0].items || filteredOrders[0].orderItems || [])[0]
      });
    }
    
    filteredOrders.forEach(order => {
      const items = order.items || order.orderItems || order.Items || [];
      items.forEach(item => {
        // Check multiple possible category field names
        const category = item.category || 
                        item.Category || 
                        item.menuItem?.category || 
                        item.menuItem?.Category ||
                        item.menuCategory ||
                        item.itemCategory ||
                        item.foodCategory ||
                        item.type ||
                        item.Type ||
                        'Uncategorized';
        
        // Check multiple possible price and quantity field names
        const price = parseFloat(
          item.price || 
          item.Price || 
          item.total || 
          item.Total || 
          item.amount || 
          item.Amount || 
          item.cost || 
          item.Cost || 
          0
        );
        
        const quantity = parseInt(
          item.quantity || 
          item.Quantity || 
          item.qty || 
          item.Qty || 
          item.count || 
          item.Count || 
          1
        );
        
        const revenue = price * quantity;
        
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = 0;
        }
        categoryRevenue[category] += revenue;
      });
    });
    
    console.log('getCategoryRevenueChart: Category revenue breakdown:', categoryRevenue);

    // Convert to array and sort by revenue
    const validCategories = Object.entries(categoryRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
    
    if (validCategories.length === 0) {
      console.log('getCategoryRevenueChart: No valid categories after filtering');
      return {
        labels: [],
        datasets: []
      };
    }

    // Generate background colors array with enough colors for all categories
    const generateBackgroundColors = (count) => {
      const baseColors = [
        chartColors.primary,
        chartColors.success,
        chartColors.warning,
        chartColors.danger,
        chartColors.info,
        chartColors.purple
      ];
      
      // Repeat the base colors if needed
      const repeats = Math.ceil(count / baseColors.length);
      return Array.from({ length: repeats }, () => baseColors).flat().slice(0, count);
    };

    return {
      labels: validCategories.map(item => item.name),
      datasets: [
        {
          label: 'Revenue',
          data: validCategories.map(item => item.revenue),
          backgroundColor: generateBackgroundColors(validCategories.length),
          borderWidth: 1
        }
      ]
    };
  };

  // Advanced payment status chart with modern styling
  const getPaymentStatusChart = () => {
    const statusDistribution = getPaymentStatusDistribution();
    const labels = Object.keys(statusDistribution);
    const data = Object.values(statusDistribution);
    
    if (labels.length === 0 || data.every(val => val === 0)) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.8)'],
          borderWidth: 2
        }]
      };
    }

    // Enhanced color palette for payment status
    const getPaymentStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'paid':
          return {
            bg: 'rgba(34, 197, 94, 0.8)',
            border: 'rgba(34, 197, 94, 1)'
          };
        case 'unpaid':
          return {
            bg: 'rgba(239, 68, 68, 0.8)',
            border: 'rgba(239, 68, 68, 1)'
          };
        case 'pending':
          return {
            bg: 'rgba(245, 158, 11, 0.8)',
            border: 'rgba(245, 158, 11, 1)'
          };
        case 'failed':
          return {
            bg: 'rgba(220, 38, 127, 0.8)',
            border: 'rgba(220, 38, 127, 1)'
          };
        case 'refunded':
          return {
            bg: 'rgba(59, 130, 246, 0.8)',
            border: 'rgba(59, 130, 246, 1)'
          };
        case 'partial':
          return {
            bg: 'rgba(168, 85, 247, 0.8)',
            border: 'rgba(168, 85, 247, 1)'
          };
        default:
          return {
            bg: 'rgba(107, 114, 128, 0.8)',
            border: 'rgba(107, 114, 128, 1)'
          };
      }
    };

    const backgroundColors = labels.map(status => getPaymentStatusColor(status).bg);
    const borderColors = labels.map(status => getPaymentStatusColor(status).border);

    return {
      labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    };
  };

  // Advanced order type chart with enhanced styling
  const getOrderTypeChart = () => {
    const typeDistribution = getOrderTypeDistribution();
    const labels = Object.keys(typeDistribution);
    const data = Object.values(typeDistribution);
    
    if (labels.length === 0 || data.every(val => val === 0)) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.8)'],
          borderWidth: 2
        }]
      };
    }

    // Enhanced color palette for order types
    const getOrderTypeColor = (type) => {
      switch (type.toLowerCase()) {
        case 'dine in':
          return {
            bg: 'rgba(16, 185, 129, 0.8)',
            border: 'rgba(16, 185, 129, 1)'
          };
        case 'takeaway':
          return {
            bg: 'rgba(245, 158, 11, 0.8)',
            border: 'rgba(245, 158, 11, 1)'
          };
        case 'delivery':
          return {
            bg: 'rgba(99, 102, 241, 0.8)',
            border: 'rgba(99, 102, 241, 1)'
          };
        case 'pickup':
          return {
            bg: 'rgba(236, 72, 153, 0.8)',
            border: 'rgba(236, 72, 153, 1)'
          };
        default:
          return {
            bg: 'rgba(107, 114, 128, 0.8)',
            border: 'rgba(107, 114, 128, 1)'
          };
      }
    };

    const backgroundColors = labels.map(type => getOrderTypeColor(type).bg);
    const borderColors = labels.map(type => getOrderTypeColor(type).border);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    };
  };

  // Advanced order status chart with modern styling
  const getOrderStatusChart = () => {
    const statusDistribution = getOrderStatusDistribution();
    const labels = Object.keys(statusDistribution);
    const data = Object.values(statusDistribution);
    
    if (labels.length === 0 || data.every(val => val === 0)) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.3)'],
          borderColor: ['rgba(200, 200, 200, 0.8)'],
          borderWidth: 2
        }]
      };
    }

    // Enhanced color palette for order status
    const getOrderStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'pending':
        case 'preparing':
          return {
            bg: 'rgba(245, 158, 11, 0.8)',
            border: 'rgba(245, 158, 11, 1)',
            emoji: '⏳'
          };
        case 'confirmed':
        case 'accepted':
          return {
            bg: 'rgba(59, 130, 246, 0.8)',
            border: 'rgba(59, 130, 246, 1)',
            emoji: '✅'
          };
        case 'processing':
        case 'cooking':
        case 'preparing':
          return {
            bg: 'rgba(168, 85, 247, 0.8)',
            border: 'rgba(168, 85, 247, 1)',
            emoji: '👨‍🍳'
          };
        case 'ready':
        case 'prepared':
          return {
            bg: 'rgba(16, 185, 129, 0.8)',
            border: 'rgba(16, 185, 129, 1)',
            emoji: '🍽️'
          };
        case 'completed':
        case 'delivered':
        case 'complete':
          return {
            bg: 'rgba(34, 197, 94, 0.8)',
            border: 'rgba(34, 197, 94, 1)',
            emoji: '✨'
          };
        case 'cancelled':
        case 'canceled':
        case 'rejected':
          return {
            bg: 'rgba(239, 68, 68, 0.8)',
            border: 'rgba(239, 68, 68, 1)',
            emoji: '❌'
          };
        case 'refunded':
          return {
            bg: 'rgba(220, 38, 127, 0.8)',
            border: 'rgba(220, 38, 127, 1)',
            emoji: '💰'
          };
        default:
          return {
            bg: 'rgba(107, 114, 128, 0.8)',
            border: 'rgba(107, 114, 128, 1)',
            emoji: '📋'
          };
      }
    };

    const backgroundColors = labels.map(status => getOrderStatusColor(status).bg);
    const borderColors = labels.map(status => getOrderStatusColor(status).border);

    return {
      labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    };
  };

  // Advanced chart configurations with modern styling (Chart.js 2.x format)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        fontSize: 12,
        fontColor: '#374151'
      }
    },
    tooltips: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFontColor: '#ffffff',
      bodyFontColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(tooltipItem, data) {
          let label = data.datasets[tooltipItem.datasetIndex].label || '';
          if (label) {
            label += ': ';
          }
          if (tooltipItem.yLabel !== null) {
            if (label.includes('Revenue')) {
              label += formatCurrency(tooltipItem.yLabel);
            } else {
              label += tooltipItem.yLabel;
            }
          }
          return label;
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: false,
      animationDuration: 200
    }
  };

  // Advanced payment status chart options with enhanced styling
  const paymentStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 60,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        fontSize: 12,
        fontColor: '#374151'
      }
    },
    tooltips: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFontColor: '#ffffff',
      bodyFontColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const total = dataset.data.reduce((sum, value) => sum + value, 0);
          const currentValue = dataset.data[tooltipItem.index];
          const percentage = total > 0 ? ((currentValue / total) * 100).toFixed(1) : '0.0';
          const label = data.labels[tooltipItem.index];
          return `${label}: ${currentValue} orders (${percentage}%)`;
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true,
      animationDuration: 200
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }
    }
  };

  // Advanced order type chart options
  const orderTypeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 60,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        fontSize: 12,
        fontColor: '#374151'
      }
    },
    tooltips: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFontColor: '#ffffff',
      bodyFontColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const total = dataset.data.reduce((sum, value) => sum + value, 0);
          const currentValue = dataset.data[tooltipItem.index];
          const percentage = total > 0 ? ((currentValue / total) * 100).toFixed(1) : '0.0';
          const label = data.labels[tooltipItem.index];
          return `${label}: ${currentValue} orders (${percentage}%)`;
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true,
      animationDuration: 200
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }
    }
  };

  // Advanced order status chart options with enhanced styling
  const orderStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 60,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        usePointStyle: true,
        padding: 20,
        fontSize: 12,
        fontColor: '#374151'
      }
    },
    tooltips: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFontColor: '#ffffff',
      bodyFontColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const total = dataset.data.reduce((sum, value) => sum + value, 0);
          const currentValue = dataset.data[tooltipItem.index];
          const percentage = total > 0 ? ((currentValue / total) * 100).toFixed(1) : '0.0';
          const label = data.labels[tooltipItem.index];
          return `${label}: ${currentValue} orders (${percentage}%)`;
        }
      }
    },
    hover: {
      mode: 'nearest',
      intersect: true,
      animationDuration: 200
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }
    }
  };

  // Daily sales chart options with dual y-axes (Chart.js 2.x format)
  const dailySalesOptions = {
    ...chartOptions,
    scales: {
      yAxes: [
        {
          type: 'linear',
          display: true,
          position: 'left',
          id: 'y-axis-revenue',
          scaleLabel: {
            display: true,
            labelString: 'Revenue'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        },
        {
          type: 'linear',
          display: true,
          position: 'right',
          id: 'y-axis-2',
          scaleLabel: {
            display: true,
            labelString: 'Order Count'
          },
          gridLines: {
            drawOnChartArea: false
          }
        }
      ],
      xAxes: [{
        display: true
      }]
    }
  };

  // Get report title based on selected filters
  const getReportTitle = () => {
    let title = '';
    
    // Add branch information
    if (selectedBranch && branches) {
      const branch = branches.find(b => b._id === selectedBranch);
      if (branch) {
        title += `${branch.name} Branch - `;
      }
    }
    // Add restaurant information
    else if (selectedRestaurant && restaurants) {
      const restaurant = restaurants.find(r => r._id === selectedRestaurant);
      if (restaurant) {
        title += `${restaurant.name} - `;
      }
    }
    
    // Add report type
    title += activeTab === 'sales' ? 'Sales Reports' : 
             activeTab === 'items' ? 'Item Reports' : 
             activeTab === 'performance' ? 'Performance Reports' : 'Order Reports';
    
    // Add date range
    title += ` (${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)})`;
    
    return title;
  };

  return (
    <>
      <Header />
      <Container className="mt--7" fluid>
        <Row>
          <Col>
            <Card className="shadow">
              <CardHeader className="border-0">
                <Row className="align-items-center">
                  <Col xs="8">
                    <h3 className="mb-0">{getReportTitle()}</h3>
                    <p className="text-muted mb-0">
                      {loading ? (
                        <Spinner size="sm" />
                      ) : (
                        `${getOrderCount()} ${getOrderCount() === 1 ? 'order' : 'orders'} found`
                      )}
                    </p>
                  </Col>
                  <Col className="text-right" xs="4">
                    <Button
                      color="primary"
                      size="sm"
                      onClick={() => setExportModal(true)}
                      className="mr-2"
                    >
                      <FaFileDownload className="mr-1" /> Export
                    </Button>
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <FaFilter className="mr-1" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </Col>
                </Row>
              </CardHeader>

              <CardBody>
                {/* Time Range Selector */}
                <Row className="mb-3">
                  <Col md="8">
                    <div className="btn-group btn-group-sm">
                      <Button 
                        color={timeRange === 'day' ? 'primary' : 'secondary'} 
                        onClick={() => handleTimeRangeChange('day')}
                      >
                        Today
                      </Button>
                      <Button 
                        color={timeRange === 'week' ? 'primary' : 'secondary'} 
                        onClick={() => handleTimeRangeChange('week')}
                      >
                        Week
                      </Button>
                      <Button 
                        color={timeRange === 'month' ? 'primary' : 'secondary'} 
                        onClick={() => handleTimeRangeChange('month')}
                      >
                        Month
                      </Button>
                      <Button 
                        color={timeRange === 'quarter' ? 'primary' : 'secondary'} 
                        onClick={() => handleTimeRangeChange('quarter')}
                      >
                        Quarter
                      </Button>
                      <Button 
                        color={timeRange === 'year' ? 'primary' : 'secondary'} 
                        onClick={() => handleTimeRangeChange('year')}
                      >
                        Year
                      </Button>
                      <Button 
                        color={timeRange === 'custom' ? 'primary' : 'secondary'} 
                        onClick={() => setTimeRange('custom')}
                      >
                        Custom
                      </Button>
                    </div>
                  </Col>
                  <Col md="4" className="text-right">
                    <Button 
                      color={tableView ? 'secondary' : 'primary'} 
                      size="sm" 
                      className="mr-2"
                      onClick={() => setTableView(false)}
                    >
                      <FaChartBar className="mr-1" /> Charts
                    </Button>
                    <Button 
                      color={tableView ? 'primary' : 'secondary'} 
                      size="sm"
                      onClick={() => setTableView(true)}
                    >
                      <FaTable className="mr-1" /> Tables
                    </Button>
                  </Col>
                </Row>

                {/* Filters Panel */}
                <Collapse isOpen={showFilters}>
                  <Card className="mb-4 bg-light">
                    <CardBody>
                      <h4 className="mb-3">Report Filters</h4>
                      <Row>
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="startDate">From Date</Label>
                            <InputGroup size="sm">
                              <Input
                                type="date"
                                name="startDate"
                                id="startDate"
                                value={dateRange.startDate}
                                onChange={handleDateChange}
                              />
                              <InputGroupAddon addonType="append">
                                <InputGroupText>
                                  <FaCalendarAlt />
                                </InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormGroup>
                        </Col>
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="endDate">To Date</Label>
                            <InputGroup size="sm">
                              <Input
                                type="date"
                                name="endDate"
                                id="endDate"
                                value={dateRange.endDate}
                                onChange={handleDateChange}
                              />
                              <InputGroupAddon addonType="append">
                                <InputGroupText>
                                  <FaCalendarAlt />
                                </InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          </FormGroup>
                        </Col>

                        {user && user.role === 'Super_Admin' && (
                          <>
                            <Col lg="3" md="6" className="mb-3">
                              <FormGroup>
                                <Label for="restaurant">
                                  <FaStore className="mr-1" /> Restaurant
                                </Label>
                                <Input
                                  type="select"
                                  name="restaurant"
                                  id="restaurant"
                                  bsSize="sm"
                                  value={selectedRestaurant}
                                  onChange={handleRestaurantChange}
                                  disabled={user.role !== 'Super_Admin'}
                                >
                                  {user.role === 'Super_Admin' && <option value="">All Restaurants</option>}
                                  {restaurants.map(restaurant => (
                                    <option key={restaurant._id} value={restaurant._id}>
                                      {restaurant.name}
                                    </option>
                                  ))}
                                </Input>
                              </FormGroup>
                            </Col>
                            <Col lg="3" md="6" className="mb-3">
                              <FormGroup>
                                <Label for="branch">
                                  <FaBuilding className="mr-1" /> Branch
                                </Label>
                                <Input
                                  type="select"
                                  name="branch"
                                  id="branch"
                                  bsSize="sm"
                                  value={selectedBranch}
                                  onChange={handleBranchChange}
                                  disabled={!selectedRestaurant || (user.role === 'Branch_Admin' && user.branchId)}
                                >
                                  <option value="">All Branches</option>
                                  {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>
                                      {branch.name}
                                    </option>
                                  ))}
                                </Input>
                              </FormGroup>
                            </Col>
                          </>
                        )}

                        {/* Payment Status Filter */}
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="paymentStatus">
                              <FaDollarSign className="mr-1" /> Payment Status
                            </Label>
                            <Input
                              type="select"
                              name="paymentStatus"
                              id="paymentStatus"
                              bsSize="sm"
                              value={paymentStatusFilter}
                              onChange={(e) => setPaymentStatusFilter(e.target.value)}
                            >
                              <option value="">All Payment Status</option>
                              <option value="unpaid">Unpaid</option>
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                              <option value="partial">Partial</option>
                            </Input>
                          </FormGroup>
                        </Col>

                        {/* Order Type Filter */}
                        <Col lg="3" md="6" className="mb-3">
                          <FormGroup>
                            <Label for="orderType">
                              <FaUtensils className="mr-1" /> Order Type
                            </Label>
                            <Input
                              type="select"
                              name="orderType"
                              id="orderType"
                              bsSize="sm"
                              value={orderTypeFilter}
                              onChange={(e) => setOrderTypeFilter(e.target.value)}
                            >
                              <option value="">All Order Types</option>
                              <option value="Dine In">Dine In</option>
                              <option value="Takeaway">Takeaway</option>
                              <option value="Delivery">Delivery</option>
                              <option value="Pickup">Pickup</option>
                            </Input>
                          </FormGroup>
                        </Col>

                        <Col className="mb-3 mt-4">
                          <Button
                            color="primary"
                            size="sm"
                            onClick={applyFilters}
                            className="mr-2"
                          >
                            <FaFilter className="mr-1" /> Apply Filters
                          </Button>
                          <Button
                            color="secondary"
                            size="sm"
                            onClick={resetFilters}
                          >
                            <FaSyncAlt className="mr-1" /> Reset
                          </Button>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
                </Collapse>

                {/* Summary Cards */}
                <Row className="mb-4">
                  <Col md="3" className="mb-3">
                    <Card className="card-stats h-100">
                      <CardBody>
                        <div className="d-flex">
                          <div className="pl-1">
                            <p className="text-muted text-sm mb-0">
                              <span className="font-weight-bold">Revenue</span>
                            </p>
                            <h2 className="font-weight-bold mb-0">
                              {loading ? <Spinner size="sm" /> : getTotalRevenue()}
                            </h2>
                            <p className="text-muted text-sm mb-0">
                              {timeRange === 'custom' ? 
                                `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` :
                                `This ${timeRange}`}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="icon icon-shape bg-gradient-success text-white rounded-circle shadow">
                              {getCurrencyIcon(currencyCode)}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md="3" className="mb-3">
                    <Card className="card-stats h-100">
                      <CardBody>
                        <div className="d-flex">
                          <div className="pl-1">
                            <p className="text-muted text-sm mb-0">
                              <span className="font-weight-bold">Orders</span>
                            </p>
                            <h2 className="font-weight-bold mb-0">
                              {loading ? <Spinner size="sm" /> : getOrderCount()}
                            </h2>
                            <p className="text-muted text-sm mb-0">
                              {timeRange === 'custom' ? 
                                `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` :
                                `This ${timeRange}`}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="icon icon-shape bg-gradient-primary text-white rounded-circle shadow">
                              <FaShoppingBag size="1.5rem" />
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md="3" className="mb-3">
                    <Card className="card-stats h-100">
                      <CardBody>
                        <div className="d-flex">
                          <div className="pl-1">
                            <p className="text-muted text-sm mb-0">
                              <span className="font-weight-bold">Avg. Order Value</span>
                            </p>
                            <h2 className="font-weight-bold mb-0">
                              {loading ? <Spinner size="sm" /> : getAverageOrderValue()}
                            </h2>
                            <p className="text-muted text-sm mb-0">
                              {timeRange === 'custom' ? 
                                `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` :
                                `This ${timeRange}`}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="icon icon-shape bg-gradient-info text-white rounded-circle shadow">
                              <FaFileInvoice size="1.5rem" />
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md="3" className="mb-3">
                    <Card className="card-stats h-100">
                      <CardBody>
                        <div className="d-flex">
                          <div className="pl-1">
                            <p className="text-muted text-sm mb-0">
                              <span className="font-weight-bold">Paid Orders</span>
                            </p>
                            <h2 className="font-weight-bold mb-0">
                              {loading ? <Spinner size="sm" /> : getPaidOrdersRate()}
                            </h2>
                            <p className="text-muted text-sm mb-0">
                              {timeRange === 'custom' ? 
                                `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` :
                                `This ${timeRange}`}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="icon icon-shape bg-gradient-success text-white rounded-circle shadow">
                              {getCurrencyIcon(currencyCode)}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>

                {/* Error Message */}
                {error && (
                  <Alert color="danger" className="mb-4">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    {error}
                  </Alert>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-3">Loading report data...</p>
                  </div>
                )}

                {/* Report Tabs */}
                {!loading && !error && (
                  <>
                    <Nav tabs className="mb-4">
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === 'sales' })}
                          onClick={() => toggleTab('sales')}
                          style={{ cursor: 'pointer' }}
                        >
                          <FaChartLine className="mr-2" />
                          Sales & Revenue
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === 'items' })}
                          onClick={() => toggleTab('items')}
                          style={{ cursor: 'pointer' }}
                        >
                          <FaUtensils className="mr-2" />
                          Menu Items
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={classnames({ active: activeTab === 'performance' })}
                          onClick={() => toggleTab('performance')}
                          style={{ cursor: 'pointer' }}
                        >
                          <FaChartPie className="mr-2" />
                          Performance
                        </NavLink>
                      </NavItem>
                    </Nav>

                    <TabContent activeTab={activeTab}>
                      {/* Sales & Revenue Tab */}
                      <TabPane tabId="sales">
                        {tableView ? (
                          // Table view for sales
                          <div>
                            <h4 className="mb-3">Daily Sales</h4>
                            <Table responsive hover className="mb-5">
                              <thead className="thead-light">
                                <tr>
                                  <th>Date</th>
                                  <th>Order Count</th>
                                  <th>Revenue</th>
                                  <th>Avg. Order Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getDailySalesData().map((day, index) => {
                                  // Ensure day.revenue is a number
                                  const revenue = parseFloat(day.revenue) || 0;
                                  const orderCount = parseInt(day.orderCount) || 0;
                                  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
                                  
                                  return (
                                    <tr key={index}>
                                      <td>{formatDate(day.date)}</td>
                                      <td>{orderCount}</td>
                                      <td>{formatCurrency(revenue)}</td>
                                      <td>{formatCurrency(avgOrderValue)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>

                            <h4 className="mb-3">Monthly Sales</h4>
                            <Table responsive hover className="mb-5">
                              <thead className="thead-light">
                                <tr>
                                  <th>Month</th>
                                  <th>Order Count</th>
                                  <th>Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const dailyData = getDailySalesData();
                                  const monthlyData = {};
                                  
                                  // Group daily data by month
                                  dailyData.forEach(item => {
                                    try {
                                      const month = format(new Date(item.date), 'yyyy-MM');
                                      const monthLabel = format(new Date(item.date), 'MMM yyyy');
                                      
                                      if (!monthlyData[month]) {
                                        monthlyData[month] = {
                                          month: monthLabel,
                                          revenue: 0,
                                          orderCount: 0
                                        };
                                      }
                                      
                                      monthlyData[month].revenue += item.revenue;
                                      monthlyData[month].orderCount += item.orderCount;
                                    } catch (error) {
                                      console.error('Error processing date for monthly table:', item.date, error);
                                    }
                                  });
                                  
                                  return Object.values(monthlyData).map((month, index) => {
                                    const revenue = parseFloat(month.revenue) || 0;
                                    const orderCount = parseInt(month.orderCount) || 0;
                                    
                                    return (
                                      <tr key={index}>
                                        <td>{month.month}</td>
                                        <td>{orderCount}</td>
                                        <td>{formatCurrency(revenue)}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </Table>

                            <h4 className="mb-3">Revenue by Order Type</h4>
                            <Table responsive hover>
                              <thead className="thead-light">
                                <tr>
                                  <th>Order Type</th>
                                  <th>Order Count</th>
                                  <th>Revenue</th>
                                  <th>Avg. Order Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const filteredOrders = getFilteredOrders();
                                  const typeData = {};
                                  
                                  // Group by order type
                                  filteredOrders.forEach(order => {
                                    const orderType = order.OrderType || order.orderType || 'Dine-In';
                                    const revenue = parseFloat(order.totalAmount || order.total || 0);
                                    
                                    if (!typeData[orderType]) {
                                      typeData[orderType] = {
                                        orderCount: 0,
                                        revenue: 0
                                      };
                                    }
                                    
                                    typeData[orderType].orderCount++;
                                    typeData[orderType].revenue += revenue;
                                  });
                                  
                                  return Object.entries(typeData).map(([orderType, data], index) => {
                                    const avgOrderValue = data.orderCount > 0 ? data.revenue / data.orderCount : 0;
                                    
                                    return (
                                      <tr key={index}>
                                        <td>{orderType}</td>
                                        <td>{data.orderCount}</td>
                                        <td>{formatCurrency(data.revenue)}</td>
                                        <td>{formatCurrency(avgOrderValue)}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </Table>
                          </div>
                        ) : (
                          // Advanced Chart view for sales with payment status and order type analytics
                          <>
                            {/* Check if we have data */}
                            {getFilteredOrders().length === 0 ? (
                              <div className="text-center py-5">
                                <div className="mb-4">
                                  <FaChartBar size="4rem" className="text-muted" />
                                </div>
                                <h4 className="text-muted mb-3">No Results Found</h4>
                                <p className="text-muted mb-4">
                                  No orders found for the selected filters and date range.
                                  <br />
                                  Try adjusting your filters or selecting a different time period.
                                </p>
                                <Button color="primary" onClick={resetFilters}>
                                  <FaSyncAlt className="mr-2" />
                                  Reset Filters
                                </Button>
                              </div>
                            ) : (
                              <>
                                {/* First Row - Daily Sales and Payment Status */}
                                <Row className="mb-4">
                                  <Col lg="8">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent d-flex justify-content-between align-items-center">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaChartLine className="mr-2 text-primary" />
                                            Daily Sales Trend
                                          </h4>
                                          <small className="text-muted">Revenue and order count over time</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {getDailySalesData().length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaChartLine size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No daily sales data available</p>
                                          </div>
                                        ) : (
                                          <div style={{ height: '350px' }}>
                                            <Bar data={getDailySalesChart()} options={dailySalesOptions} />
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                  <Col lg="4">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaDollarSign className="mr-2 text-success" />
                                            Payment Status
                                          </h4>
                                          <small className="text-muted">Distribution by payment status</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {Object.keys(getPaymentStatusDistribution()).length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaDollarSign size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No payment data available</p>
                                          </div>
                                        ) : (
                                          <div style={{ height: '350px' }}>
                                            <Doughnut data={getPaymentStatusChart()} options={paymentStatusChartOptions} />
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                </Row>

                                {/* Second Row - Order Types and Revenue Analytics */}
                                <Row className="mb-4">
                                  <Col lg="4">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaUtensils className="mr-2 text-info" />
                                            Order Types
                                          </h4>
                                          <small className="text-muted">Distribution by service type</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {Object.keys(getOrderTypeDistribution()).length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaUtensils size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No order type data available</p>
                                          </div>
                                        ) : (
                                          <div style={{ height: '350px' }}>
                                            <Doughnut data={getOrderTypeChart()} options={orderTypeChartOptions} />
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                  <Col lg="8">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaChartBar className="mr-2 text-warning" />
                                            Revenue by Payment Status
                                          </h4>
                                          <small className="text-muted">Detailed payment status analytics</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {getRevenueByPaymentStatus().length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaChartBar size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No revenue data available</p>
                                          </div>
                                        ) : (
                                          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                            <Table className="table-flush" hover>
                                              <thead className="thead-light sticky-top">
                                                <tr>
                                                  <th>Status</th>
                                                  <th>Orders</th>
                                                  <th>Revenue</th>
                                                  <th>Avg. Value</th>
                                                  <th>% of Orders</th>
                                                  <th>% of Revenue</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {getRevenueByPaymentStatus().map((item, index) => {
                                                  const getStatusColor = (status) => {
                                                    switch (status.toLowerCase()) {
                                                      case 'paid': return 'success';
                                                      case 'unpaid': return 'danger';
                                                      case 'pending': return 'warning';
                                                      case 'failed': return 'danger';
                                                      case 'refunded': return 'info';
                                                      case 'partial': return 'warning';
                                                      default: return 'secondary';
                                                    }
                                                  };

                                                  return (
                                                    <tr key={index}>
                                                      <td>
                                                        <Badge color={getStatusColor(item.status)} pill>
                                                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                        </Badge>
                                                      </td>
                                                      <td>
                                                        <strong>{item.count}</strong>
                                                      </td>
                                                      <td>
                                                        <strong>{formatCurrency(item.revenue)}</strong>
                                                      </td>
                                                      <td>
                                                        {formatCurrency(item.averageValue)}
                                                      </td>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{item.orderPercentage.toFixed(1)}%</span>
                                                          <div className="progress flex-fill" style={{ height: '4px' }}>
                                                            <div 
                                                              className={`progress-bar bg-${getStatusColor(item.status)}`}
                                                              style={{ width: `${item.orderPercentage}%` }}
                                                            ></div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{item.revenuePercentage.toFixed(1)}%</span>
                                                          <div className="progress flex-fill" style={{ height: '4px' }}>
                                                            <div 
                                                              className={`progress-bar bg-${getStatusColor(item.status)}`}
                                                              style={{ width: `${item.revenuePercentage}%` }}
                                                            ></div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </Table>
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                </Row>

                                {/* Third Row - Order Type Revenue Analytics and Monthly Trend */}
                                <Row className="mb-4">
                                  <Col lg="6">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaUtensils className="mr-2 text-primary" />
                                            Revenue by Order Type
                                          </h4>
                                          <small className="text-muted">Service type performance analytics</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {getRevenueByOrderType().length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaUtensils size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No order type revenue data available</p>
                                          </div>
                                        ) : (
                                          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                            <Table className="table-flush" hover>
                                              <thead className="thead-light sticky-top">
                                                <tr>
                                                  <th>Type</th>
                                                  <th>Orders</th>
                                                  <th>Revenue</th>
                                                  <th>Avg. Value</th>
                                                  <th>Performance</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {getRevenueByOrderType().map((item, index) => {
                                                  const getTypeEmoji = (type) => {
                                                    switch (type.toLowerCase()) {
                                                      case 'dine in': return '🍽️';
                                                      case 'takeaway': return '🥡';
                                                      case 'delivery': return '🚚';
                                                      case 'pickup': return '🏃';
                                                      default: return '📦';
                                                    }
                                                  };

                                                  const getTypeColor = (type) => {
                                                    switch (type.toLowerCase()) {
                                                      case 'dine in': return 'success';
                                                      case 'takeaway': return 'warning';
                                                      case 'delivery': return 'info';
                                                      case 'pickup': return 'primary';
                                                      default: return 'secondary';
                                                    }
                                                  };

                                                  return (
                                                    <tr key={index}>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{getTypeEmoji(item.type)}</span>
                                                          <Badge color={getTypeColor(item.type)} pill>
                                                            {item.type}
                                                          </Badge>
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <strong>{item.count}</strong>
                                                        <small className="text-muted d-block">
                                                          {item.orderPercentage.toFixed(1)}% of orders
                                                        </small>
                                                      </td>
                                                      <td>
                                                        <strong>{formatCurrency(item.revenue)}</strong>
                                                        <small className="text-muted d-block">
                                                          {item.revenuePercentage.toFixed(1)}% of revenue
                                                        </small>
                                                      </td>
                                                      <td>
                                                        {formatCurrency(item.averageValue)}
                                                      </td>
                                                      <td>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                          <div 
                                                            className={`progress-bar bg-${getTypeColor(item.type)}`}
                                                            style={{ width: `${item.revenuePercentage}%` }}
                                                          ></div>
                                                        </div>
                                                        <small className="text-muted">
                                                          {item.revenuePercentage.toFixed(1)}% performance
                                                        </small>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </Table>
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                  <Col lg="6">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaChartLine className="mr-2 text-info" />
                                            Monthly Revenue Trend
                                          </h4>
                                          <small className="text-muted">Revenue growth over time</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {(() => {
                                          const monthlyData = getMonthlySalesChart();
                                          return monthlyData.labels.length === 0 ? (
                                            <div className="text-center py-4">
                                              <FaChartLine size="2rem" className="text-muted mb-3" />
                                              <p className="text-muted">No monthly trend data available</p>
                                            </div>
                                          ) : (
                                            <div style={{ height: '350px' }}>
                                              <Line data={monthlyData} options={chartOptions} />
                                            </div>
                                          );
                                        })()}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                </Row>
                              </>
                            )}
                          </>
                        )}
                      </TabPane>

                      {/* Menu Items Tab */}
                      <TabPane tabId="items">
                        {tableView ? (
                          // Table view for items
                          <div>
                            <h4 className="mb-3">Top Selling Items</h4>
                            <Table responsive hover className="mb-5">
                              <thead className="thead-light">
                                <tr>
                                  <th>Rank</th>
                                  <th>Item Name</th>
                                  <th>Quantity Sold</th>
                                  <th>Revenue</th>
                                  <th>Avg. Price</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getTopSellingItems().map((item, index) => {
                                  // Ensure all values are numbers
                                  const quantity = parseInt(item.quantity) || 0;
                                  const revenue = parseFloat(item.revenue) || 0;
                                  const avgPrice = quantity > 0 ? revenue / quantity : 0;
                                  
                                  return (
                                    <tr key={index}>
                                      <td>{index + 1}</td>
                                      <td>{item.name}</td>
                                      <td>{quantity}</td>
                                      <td>{formatCurrency(revenue)}</td>
                                      <td>{formatCurrency(avgPrice)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>

                            <h4 className="mb-3">Revenue by Category</h4>
                            <Table responsive hover>
                              <thead className="thead-light">
                                <tr>
                                  <th>Category</th>
                                  <th>Revenue</th>
                                  <th>% of Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const filteredOrders = getFilteredOrders();
                                  const categoryRevenue = {};
                                  
                                  // Calculate revenue by category
                                  filteredOrders.forEach(order => {
                                    const items = order.items || order.orderItems || [];
                                    items.forEach(item => {
                                      const category = item.category || item.menuItem?.category || 'Uncategorized';
                                      const revenue = parseFloat(item.price || item.total || 0) * parseInt(item.quantity || 1);
                                      
                                      if (!categoryRevenue[category]) {
                                        categoryRevenue[category] = 0;
                                      }
                                      categoryRevenue[category] += revenue;
                                    });
                                  });
                                  
                                  // Calculate total revenue
                                  const totalRevenue = Object.values(categoryRevenue).reduce((sum, revenue) => sum + revenue, 0);
                                  
                                  return Object.entries(categoryRevenue)
                                    .sort(([,a], [,b]) => b - a) // Sort by revenue descending
                                    .map(([category, revenue], index) => {
                                      const percentage = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(2) : '0.00';
                                      
                                      return (
                                        <tr key={index}>
                                          <td>{category}</td>
                                          <td>{formatCurrency(revenue)}</td>
                                          <td>{percentage}%</td>
                                        </tr>
                                      );
                                    });
                                })()}
                              </tbody>
                            </Table>
                          </div>
                        ) : (
                          // Chart view for items
                          <Row>
                            <Col lg="6" className="mb-4">
                              <Card className="shadow">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Top Selling Items</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Bar data={getTopItemsChart()} options={chartOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                            <Col lg="6" className="mb-4">
                              <Card className="shadow">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Revenue by Category</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Pie data={getCategoryRevenueChart()} options={chartOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                          </Row>
                        )}
                      </TabPane>

                      {/* Performance Tab */}
                      <TabPane tabId="performance">
                        {tableView ? (
                          // Table view for performance
                          <div>
                            <h4 className="mb-3">Order Status Distribution</h4>
                            <Table responsive hover>
                              <thead className="thead-light">
                                <tr>
                                  <th>Status</th>
                                  <th>Order Count</th>
                                  <th>Percentage</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const statusCount = getOrdersByStatus();
                                  const totalOrders = Object.values(statusCount).reduce((sum, count) => sum + count, 0);
                                  
                                  return Object.entries(statusCount).map(([status, count], index) => {
                                    const percentage = totalOrders > 0 ? ((count / totalOrders) * 100) : 0;
                                    
                                    return (
                                      <tr key={index}>
                                        <td>
                                          <Badge color={
                                            status.toLowerCase() === 'completed' || status.toLowerCase() === 'complete' ? 'success' :
                                            status.toLowerCase() === 'processing' ? 'info' :
                                            status.toLowerCase() === 'pending' ? 'warning' :
                                            'danger'
                                          } pill>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                          </Badge>
                                        </td>
                                        <td>{count}</td>
                                        <td>{percentage.toFixed(2)}%</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </Table>
                          </div>
                        ) : (
                          // Advanced Chart view for performance with order status analytics
                          <>
                            {/* Check if we have data */}
                            {getFilteredOrders().length === 0 ? (
                              <div className="text-center py-5">
                                <div className="mb-4">
                                  <FaChartPie size="4rem" className="text-muted" />
                                </div>
                                <h4 className="text-muted mb-3">No Performance Data Found</h4>
                                <p className="text-muted mb-4">
                                  No orders found for the selected filters and date range.
                                  <br />
                                  Try adjusting your filters or selecting a different time period.
                                </p>
                                <Button color="primary" onClick={resetFilters}>
                                  <FaSyncAlt className="mr-2" />
                                  Reset Filters
                                </Button>
                              </div>
                            ) : (
                              <>
                                {/* First Row - Order Status Distribution and Completion Rate */}
                                <Row className="mb-4">
                                  <Col lg="6">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaChartPie className="mr-2 text-primary" />
                                            Order Status Distribution
                                          </h4>
                                          <small className="text-muted">Current order workflow status</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {Object.keys(getOrderStatusDistribution()).length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaChartPie size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No status data available</p>
                                          </div>
                                        ) : (
                                          <div style={{ height: '350px' }}>
                                            <Doughnut data={getOrderStatusChart()} options={orderStatusChartOptions} />
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                  <Col lg="6">
                                    <Card className="shadow h-100">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaPercentage className="mr-2 text-success" />
                                            Completion Analytics
                                          </h4>
                                          <small className="text-muted">Order completion performance</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        <div className="text-center py-4">
                                          <div className="mb-4">
                                            <h1 className="display-3 text-success font-weight-bold">
                                              {getOrderCompletionRate()}
                                            </h1>
                                            <h5 className="text-muted">Orders Completed</h5>
                                          </div>
                                          <div className="row text-center">
                                            <div className="col-4">
                                              <div className="border-right">
                                                <h4 className="text-primary">{getFilteredOrders().length}</h4>
                                                <small className="text-muted">Total Orders</small>
                                              </div>
                                            </div>
                                            <div className="col-4">
                                              <div className="border-right">
                                                <h4 className="text-success">
                                                  {getFilteredOrders().filter(order => {
                                                    const status = (order.status || 'pending').toLowerCase();
                                                    return status === 'completed' || status === 'delivered' || status === 'complete';
                                                  }).length}
                                                </h4>
                                                <small className="text-muted">Completed</small>
                                              </div>
                                            </div>
                                            <div className="col-4">
                                              <h4 className="text-warning">
                                                {getFilteredOrders().filter(order => {
                                                  const status = (order.status || 'pending').toLowerCase();
                                                  return status === 'pending' || status === 'processing' || status === 'preparing';
                                                }).length}
                                              </h4>
                                              <small className="text-muted">In Progress</small>
                                            </div>
                                          </div>
                                        </div>
                                      </CardBody>
                                    </Card>
                                  </Col>
                                </Row>

                                {/* Second Row - Revenue by Order Status Analytics */}
                                <Row className="mb-4">
                                  <Col lg="12">
                                    <Card className="shadow">
                                      <CardHeader className="bg-transparent">
                                        <div>
                                          <h4 className="mb-1">
                                            <FaChartBar className="mr-2 text-info" />
                                            Revenue by Order Status
                                          </h4>
                                          <small className="text-muted">Detailed order status performance analytics</small>
                                        </div>
                                      </CardHeader>
                                      <CardBody>
                                        {getRevenueByOrderStatus().length === 0 ? (
                                          <div className="text-center py-4">
                                            <FaChartBar size="2rem" className="text-muted mb-3" />
                                            <p className="text-muted">No revenue data available</p>
                                          </div>
                                        ) : (
                                          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <Table className="table-flush" hover>
                                              <thead className="thead-light sticky-top">
                                                <tr>
                                                  <th>Status</th>
                                                  <th>Orders</th>
                                                  <th>Revenue</th>
                                                  <th>Avg. Value</th>
                                                  <th>% of Orders</th>
                                                  <th>% of Revenue</th>
                                                  <th>Performance</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {getRevenueByOrderStatus().map((item, index) => {
                                                  const getStatusColor = (status) => {
                                                    switch (status.toLowerCase()) {
                                                      case 'completed':
                                                      case 'delivered':
                                                      case 'complete':
                                                        return 'success';
                                                      case 'pending':
                                                      case 'preparing':
                                                        return 'warning';
                                                      case 'confirmed':
                                                      case 'accepted':
                                                        return 'info';
                                                      case 'processing':
                                                      case 'cooking':
                                                        return 'primary';
                                                      case 'ready':
                                                      case 'prepared':
                                                        return 'success';
                                                      case 'cancelled':
                                                      case 'canceled':
                                                      case 'rejected':
                                                        return 'danger';
                                                      default:
                                                        return 'secondary';
                                                    }
                                                  };

                                                  const getStatusEmoji = (status) => {
                                                    switch (status.toLowerCase()) {
                                                      case 'pending':
                                                      case 'preparing':
                                                        return '⏳';
                                                      case 'confirmed':
                                                      case 'accepted':
                                                        return '✅';
                                                      case 'processing':
                                                      case 'cooking':
                                                        return '👨‍🍳';
                                                      case 'ready':
                                                      case 'prepared':
                                                        return '🍽️';
                                                      case 'completed':
                                                      case 'delivered':
                                                      case 'complete':
                                                        return '✨';
                                                      case 'cancelled':
                                                      case 'canceled':
                                                      case 'rejected':
                                                        return '❌';
                                                      default:
                                                        return '📋';
                                                    }
                                                  };

                                                  return (
                                                    <tr key={index}>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{getStatusEmoji(item.status)}</span>
                                                          <Badge color={getStatusColor(item.status)} pill>
                                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                          </Badge>
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <strong>{item.count}</strong>
                                                      </td>
                                                      <td>
                                                        <strong>{formatCurrency(item.revenue)}</strong>
                                                      </td>
                                                      <td>
                                                        {formatCurrency(item.averageValue)}
                                                      </td>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{item.orderPercentage.toFixed(1)}%</span>
                                                          <div className="progress flex-fill" style={{ height: '4px' }}>
                                                            <div 
                                                              className={`progress-bar bg-${getStatusColor(item.status)}`}
                                                              style={{ width: `${item.orderPercentage}%` }}
                                                            ></div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <div className="d-flex align-items-center">
                                                          <span className="mr-2">{item.revenuePercentage.toFixed(1)}%</span>
                                                          <div className="progress flex-fill" style={{ height: '4px' }}>
                                                            <div 
                                                              className={`progress-bar bg-${getStatusColor(item.status)}`}
                                                              style={{ width: `${item.revenuePercentage}%` }}
                                                            ></div>
                                                          </div>
                                                        </div>
                                                      </td>
                                                      <td>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                          <div 
                                                            className={`progress-bar bg-${getStatusColor(item.status)}`}
                                                            style={{ width: `${Math.max(item.orderPercentage, item.revenuePercentage)}%` }}
                                                          ></div>
                                                        </div>
                                                        <small className="text-muted">
                                                          {Math.max(item.orderPercentage, item.revenuePercentage).toFixed(1)}% efficiency
                                                        </small>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </Table>
                                          </div>
                                        )}
                                      </CardBody>
                                    </Card>
                                  </Col>
                                </Row>
                              </>
                            )}
                          </>
                        )}
                      </TabPane>
                    </TabContent>
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Export Modal */}
      <Modal isOpen={exportModal} toggle={() => setExportModal(!exportModal)}>
        <ModalHeader toggle={() => setExportModal(!exportModal)}>
          Export Report
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="reportTitle">Report Title</Label>
            <Input
              type="text"
              name="reportTitle"
              id="reportTitle"
              placeholder="Enter report title"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label>Export Format</Label>
            <div className="d-flex">
              <Button
                color={exportFormat === 'pdf' ? 'danger' : 'secondary'}
                onClick={() => setExportFormat('pdf')}
                className="mr-2"
              >
                <FaFilePdf className="mr-1" /> PDF
              </Button>
              <Button
                color={exportFormat === 'excel' ? 'success' : 'secondary'}
                onClick={() => setExportFormat('excel')}
                className="mr-2"
              >
                <FaFileExcel className="mr-1" /> Excel
              </Button>
              <Button
                color={exportFormat === 'csv' ? 'primary' : 'secondary'}
                onClick={() => setExportFormat('csv')}
              >
                <FaFileCsv className="mr-1" /> CSV
              </Button>
            </div>
          </FormGroup>
          <Alert color="info" className="mb-0">
            <small>
              <i className="fas fa-info-circle mr-2"></i>
              Report will include data based on your current filter settings.
            </small>
          </Alert>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setExportModal(!exportModal)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleExport}>
            <FaFileDownload className="mr-1" /> Export
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default OrderReports;