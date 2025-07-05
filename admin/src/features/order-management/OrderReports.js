import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Row, Col, Card, CardHeader, CardBody,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Button, Badge, Form, FormGroup, Label, Input,
  Spinner, Alert, Table, InputGroup, InputGroupAddon, InputGroupText,
  Modal, ModalHeader, ModalBody, ModalFooter, Collapse
} from 'reactstrap';
import classnames from 'classnames';
import { format, parseISO, subDays, subMonths } from 'date-fns';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
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
  }, [dateRange, selectedRestaurant, selectedBranch]);

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
    const today = new Date();
    setTimeRange('week');
    setSelectedRestaurant('');
    setSelectedBranch('');
    setDateRange({
      startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    });
    
    // The useEffect will handle fetching when dependencies change
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

  // Get completion rate
  const getCompletionRate = () => {
    const statusCount = getOrdersByStatus();
    const completed = statusCount.completed || statusCount.complete || 0;
    const cancelled = statusCount.cancelled || statusCount.canceled || 0;
    const total = Object.values(statusCount).reduce((sum, count) => sum + count, 0);
    
    return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
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
        console.error('Error processing date for monthly chart:', item.date, error);
      }
    });
    
    const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    if (data.length === 0) {
      console.log('getMonthlySalesChart: No valid data points after grouping');
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: data.map(item => item.month),
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

  // Chart data for order status distribution
  const getOrderStatusChart = () => {
    const statusCount = getOrdersByStatus();
    
    console.log('getOrderStatusChart: Status count data:', statusCount);
    
    if (!statusCount || Object.keys(statusCount).length === 0) {
      console.log('getOrderStatusChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    try {
      const labels = Object.keys(statusCount);
      const counts = Object.values(statusCount);
      
      if (labels.length === 0) {
        console.log('getOrderStatusChart: No valid status labels found');
        return {
          labels: [],
          datasets: []
        };
      }
      
      console.log('getOrderStatusChart: Processing status data:', { labels, counts });
      
      const colorMap = {
        'pending': chartColors.warning,
        'processing': chartColors.info,
        'completed': chartColors.success,
        'cancelled': chartColors.danger,
        'complete': chartColors.success,
        'canceled': chartColors.danger
      };
      
      const borderColorMap = {
        'pending': chartColors.warningBorder,
        'processing': chartColors.infoBorder,
        'completed': chartColors.successBorder,
        'cancelled': chartColors.dangerBorder,
        'complete': chartColors.successBorder,
        'canceled': chartColors.dangerBorder
      };

      return {
        labels: labels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
        datasets: [
          {
            data: counts,
            backgroundColor: labels.map(label => colorMap[label.toLowerCase()] || chartColors.primary),
            borderColor: labels.map(label => borderColorMap[label.toLowerCase()] || chartColors.primaryBorder),
            borderWidth: 1
          }
        ]
      };
    } catch (error) {
      console.error('Error generating order status chart:', error);
      return {
        labels: [],
        datasets: []
      };
    }
  };

  // Chart configurations (Chart.js 2.x format)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      display: true,
      position: 'top',
    },
    tooltips: {
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
                                <Label for="restaurant">Restaurant</Label>
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
                                <Label for="branch">Branch</Label>
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
                              <span className="font-weight-bold">Completion Rate</span>
                            </p>
                            <h2 className="font-weight-bold mb-0">
                              {loading ? <Spinner size="sm" /> : getCompletionRate()}
                            </h2>
                            <p className="text-muted text-sm mb-0">
                              {timeRange === 'custom' ? 
                                `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` :
                                `This ${timeRange}`}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="icon icon-shape bg-gradient-warning text-white rounded-circle shadow">
                              <FaPercentage size="1.5rem" />
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
                          // Chart view for sales
                          <Row>
                            <Col lg="8" className="mb-4">
                              <Card className="shadow">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Daily Sales</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Bar data={getDailySalesChart()} options={dailySalesOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                            <Col lg="4" className="mb-4">
                              <Card className="shadow h-100">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Order Types</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Doughnut data={getOrderTypesChart()} options={chartOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                            <Col lg="12">
                              <Card className="shadow">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Monthly Revenue Trend</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Line data={getMonthlySalesChart()} options={chartOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                          </Row>
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
                          // Chart view for performance
                          <Row>
                            <Col lg="6" className="mx-auto mb-4">
                              <Card className="shadow">
                                <CardHeader className="bg-transparent">
                                  <h4 className="mb-0">Order Status Distribution</h4>
                                </CardHeader>
                                <CardBody>
                                  <div style={{ height: '350px' }}>
                                    <Doughnut data={getOrderStatusChart()} options={chartOptions} />
                                  </div>
                                </CardBody>
                              </Card>
                            </Col>
                          </Row>
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