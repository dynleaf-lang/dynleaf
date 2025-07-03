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
    orderReports, 
    loading, 
    error, 
    restaurants, 
    branches,
    getOrderReports, 
    getAllReports, 
    generateOrderReport, 
    exportOrderData,
    getRestaurants,
    getBranchesForRestaurant
  } = useOrder();
  
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
      
      // Always fetch orderStatusDistribution first to get accurate order count
      const initialFilters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        restaurantId: user.restaurantId || selectedRestaurant,
        branchId: user.branchId || selectedBranch
      };
      
      // Fetch status data for order count, then fetch tab-specific reports
      getOrderReports('orderStatusDistribution', initialFilters)
        .then(() => fetchReports())
        .catch(err => {
          console.error('Error fetching initial order status data:', err);
          // Continue with other reports even if this fails
          fetchReports();
        });
    }
  }, [user]); // Remove function dependencies to prevent infinite loop

  // Fetch reports when date range or filters change
  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [dateRange, selectedRestaurant, selectedBranch, activeTab]);

  // Log order count when reports change
  useEffect(() => {
    if (orderReports) {
      console.log('Order count debug - Reports updated:', {
        dailyCount: orderReports.daily?.data?.reduce((sum, item) => sum + parseInt(item?.orderCount || 0), 0) || 0,
        statusCount: orderReports.orderStatusDistribution?.data ? 
          Object.values(orderReports.orderStatusDistribution.data).reduce((sum, status) => sum + parseInt(status?.count || 0), 0) : 0,
        calculatedTotal: getOrderCount()
      });
    }
  }, [orderReports]);

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

  // Fetch reports based on selected filters
  const fetchReports = async () => {
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
      
      console.log('OrderReports: Fetching reports with filters:', {
        ...filters,
        activeTab
      });
      
      // Always include orderStatusDistribution in reports for accurate order count
      // unless we're on the performance tab which already gets that data
      const includeStatusData = activeTab !== 'performance';
      
      // Fetch relevant report types based on active tab
      switch (activeTab) {
        case 'sales':
          await Promise.all([
            getOrderReports('daily', filters),
            getOrderReports('monthly', filters),
            getOrderReports('revenueTrends', filters),
            ...(includeStatusData ? [getOrderReports('orderStatusDistribution', filters)] : [])
          ]);
          break;
        case 'items':
          await Promise.all([
            getOrderReports('topSellingItems', filters),
            getOrderReports('revenueByCategory', filters),
            ...(includeStatusData ? [getOrderReports('orderStatusDistribution', filters)] : [])
          ]);
          break;
        case 'performance':
          await Promise.all([
            getOrderReports('orderStatusDistribution', filters)
          ]);
          break;
        default:
          await getAllReports(filters);
      }
      
      console.log('OrderReports: Reports fetched successfully:', orderReports);
    } catch (error) {
      console.error('OrderReports: Error fetching reports:', error);
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
    fetchReports();
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

  // Get total revenue
  const getTotalRevenue = () => {
    console.log('getTotalRevenue: orderReports structure:', orderReports);
    
    if (orderReports && orderReports.daily && orderReports.daily.data && Array.isArray(orderReports.daily.data)) {
      const total = orderReports.daily.data.reduce(
        (sum, item) => sum + parseFloat(item.revenue || 0), 0
      );
      console.log('getTotalRevenue: calculated total:', total);
      return formatCurrency(total);
    }
    
    console.log('getTotalRevenue: No data available, returning 0');
    return formatCurrency(0);
  };

  // Get order count - extract from any available report data
  const getOrderCount = () => {
    console.log('getOrderCount: orderReports structure:', orderReports);
    
    // Try to get count from daily reports first (most detailed)
    if (orderReports && orderReports.daily && orderReports.daily.data && Array.isArray(orderReports.daily.data)) {
      const total = orderReports.daily.data.reduce(
        (sum, item) => sum + parseInt(item.orderCount || 0), 0
      );
      console.log('getOrderCount: calculated total from daily data:', total);
      if (total > 0) return total;
    }
    
    // If daily data doesn't have order count, try monthly data
    if (orderReports && orderReports.monthly && orderReports.monthly.data && Array.isArray(orderReports.monthly.data)) {
      const total = orderReports.monthly.data.reduce(
        (sum, item) => sum + parseInt(item.orderCount || 0), 0
      );
      console.log('getOrderCount: calculated total from monthly data:', total);
      if (total > 0) return total;
    }
    
    // Try order status distribution for a count
    if (orderReports && orderReports.orderStatusDistribution && orderReports.orderStatusDistribution.data) {
      const statusData = orderReports.orderStatusDistribution.data;
      if (typeof statusData === 'object') {
        const total = Object.values(statusData).reduce(
          (sum, status) => sum + parseInt(status.count || 0), 0
        );
        console.log('getOrderCount: calculated total from status data:', total);
        if (total > 0) return total;
      }
    }
    
    // Try to get count from top selling items - this is a last resort approximation
    if (orderReports && orderReports.topSellingItems && orderReports.topSellingItems.data 
        && Array.isArray(orderReports.topSellingItems.data)) {
      // This is not exact since items can be ordered multiple times in a single order
      const estimatedCount = Math.ceil(
        orderReports.topSellingItems.data.reduce(
          (sum, item) => sum + parseInt(item.quantity || 0), 0
        ) / 2 // Rough estimate assuming average of 2 items per order
      );
      console.log('getOrderCount: estimated total from item data:', estimatedCount);
      if (estimatedCount > 0) return estimatedCount;
    }
    
    console.log('getOrderCount: No data available in any reports, returning 0');
    return 0;
  };

  // Get average order value
  const getAverageOrderValue = () => {
    if (orderReports.daily && orderReports.daily.data) {
      const totalRevenue = orderReports.daily.data.reduce(
        (sum, item) => sum + parseFloat(item.revenue), 0
      );
      const totalOrders = orderReports.daily.data.reduce(
        (sum, item) => sum + parseInt(item.orderCount), 0
      );
      
      return formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0);
    }
    return formatCurrency(0);
  };

  // Get completion rate
  const getCompletionRate = () => {
    if (orderReports.orderStatusDistribution && orderReports.orderStatusDistribution.data) {
      const { Completed, Cancelled } = orderReports.orderStatusDistribution.data;
      const completed = Completed ? parseInt(Completed.count) : 0;
      const cancelled = Cancelled ? parseInt(Cancelled.count) : 0;
      const total = completed + cancelled;
      
      return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
    }
    return '0%';
  };

  // Chart data for daily sales
  const getDailySalesChart = () => {
    console.log('getDailySalesChart: orderReports.daily:', orderReports?.daily);
    
    if (!orderReports || !orderReports.daily || !orderReports.daily.data || !Array.isArray(orderReports.daily.data)) {
      console.log('getDailySalesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Filter out any invalid data points
    const data = orderReports.daily.data.filter(item => item && item.date);
    console.log('getDailySalesChart: Processing data:', data);
    
    if (data.length === 0) {
      console.log('getDailySalesChart: No valid data points after filtering');
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      labels: sortedData.map(item => {
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
          data: sortedData.map(item => {
            const revenue = parseFloat(item.revenue);
            return isNaN(revenue) ? 0 : revenue;
          }),
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primaryBorder,
          borderWidth: 1
        },
        {
          label: 'Orders',
          data: sortedData.map(item => {
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

  // Chart data for monthly sales
  const getMonthlySalesChart = () => {
    if (!orderReports.monthly || !orderReports.monthly.data || !Array.isArray(orderReports.monthly.data)) {
      console.log('getMonthlySalesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Filter out any invalid data points
    const data = orderReports.monthly.data.filter(item => item && item.month);
    
    if (data.length === 0) {
      console.log('getMonthlySalesChart: No valid data points after filtering');
      return {
        labels: [],
        datasets: []
      };
    }

    // Month order for sorting
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Sort data by month
    const sortedData = [...data].sort((a, b) => {
      const aIndex = monthOrder.indexOf(a.month);
      const bIndex = monthOrder.indexOf(b.month);
      return aIndex - bIndex;
    });

    return {
      labels: sortedData.map(item => item.month),
      datasets: [
        {
          label: 'Revenue',
          data: sortedData.map(item => {
            const revenue = parseFloat(item.revenue);
            return isNaN(revenue) ? 0 : revenue;
          }),
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
    if (!orderReports.revenueTrends || !orderReports.revenueTrends.data || !Array.isArray(orderReports.revenueTrends.data)) {
      console.log('getOrderTypesChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Filter valid data points
    const data = orderReports.revenueTrends.data.filter(item => item);
    
    if (data.length === 0) {
      console.log('getOrderTypesChart: No valid data points after filtering');
      return {
        labels: [],
        datasets: []
      };
    }

    // Sum up by order type across all months with safeguards against NaN
    const dineInTotal = data.reduce((sum, item) => {
      const value = parseFloat(item.dineIn);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const takeoutTotal = data.reduce((sum, item) => {
      const value = parseFloat(item.takeout);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    const deliveryTotal = data.reduce((sum, item) => {
      const value = parseFloat(item.delivery);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    console.log('getOrderTypesChart: Calculated totals:', { dineInTotal, takeoutTotal, deliveryTotal });

    return {
      labels: ['Dine-In', 'Takeout', 'Delivery'],
      datasets: [
        {
          data: [dineInTotal, takeoutTotal, deliveryTotal],
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
    if (!orderReports.topSellingItems || !orderReports.topSellingItems.data || !Array.isArray(orderReports.topSellingItems.data)) {
      console.log('getTopItemsChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Filter valid items and limit to top 10 for better visualization
    const validItems = orderReports.topSellingItems.data
      .filter(item => item && item.name)
      .sort((a, b) => {
        const quantityA = parseInt(a.quantity) || 0;
        const quantityB = parseInt(b.quantity) || 0;
        return quantityB - quantityA;  // Sort by quantity descending
      })
      .slice(0, 10);  // Limit to top 10
    
    if (validItems.length === 0) {
      console.log('getTopItemsChart: No valid items after filtering');
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
      labels: validItems.map(item => item.name),
      datasets: [
        {
          label: 'Quantity Sold',
          data: validItems.map(item => {
            const quantity = parseInt(item.quantity);
            return isNaN(quantity) ? 0 : quantity;
          }),
          backgroundColor: generateBackgroundColors(validItems.length),
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for category revenue
  const getCategoryRevenueChart = () => {
    if (!orderReports.revenueByCategory || !orderReports.revenueByCategory.data || !Array.isArray(orderReports.revenueByCategory.data)) {
      console.log('getCategoryRevenueChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    // Filter valid categories and sort by revenue
    const validCategories = orderReports.revenueByCategory.data
      .filter(item => item && item.name)
      .sort((a, b) => {
        const revenueA = parseFloat(a.revenue) || 0;
        const revenueB = parseFloat(b.revenue) || 0;
        return revenueB - revenueA;  // Sort by revenue descending
      });
    
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
          data: validCategories.map(item => {
            const revenue = parseFloat(item.revenue);
            return isNaN(revenue) ? 0 : revenue;
          }),
          backgroundColor: generateBackgroundColors(validCategories.length),
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for order status distribution
  const getOrderStatusChart = () => {
    if (!orderReports.orderStatusDistribution || !orderReports.orderStatusDistribution.data) {
      console.log('getOrderStatusChart: No valid data available');
      return {
        labels: [],
        datasets: []
      };
    }

    try {
      const statusData = orderReports.orderStatusDistribution.data;
      
      // Ensure we have an object with status data
      if (!statusData || typeof statusData !== 'object') {
        console.log('getOrderStatusChart: Status data is not an object:', statusData);
        return {
          labels: [],
          datasets: []
        };
      }
      
      const labels = Object.keys(statusData).filter(key => 
        statusData[key] && (statusData[key].count !== undefined)
      );
      
      if (labels.length === 0) {
        console.log('getOrderStatusChart: No valid status labels found');
        return {
          labels: [],
          datasets: []
        };
      }
      
      const counts = labels.map(label => {
        const count = parseInt(statusData[label].count);
        return isNaN(count) ? 0 : count;
      });
      
      console.log('getOrderStatusChart: Processing status data:', { labels, counts });
      
      const colorMap = {
        'Pending': chartColors.warning,
        'Processing': chartColors.info,
        'Completed': chartColors.success,
        'Cancelled': chartColors.danger
      };
      
      const borderColorMap = {
        'Pending': chartColors.warningBorder,
        'Processing': chartColors.infoBorder,
        'Completed': chartColors.successBorder,
        'Cancelled': chartColors.dangerBorder
      };

      return {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: labels.map(label => colorMap[label] || chartColors.primary),
            borderColor: labels.map(label => borderColorMap[label] || chartColors.primaryBorder),
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
                                {orderReports.daily && orderReports.daily.data && orderReports.daily.data.map((day, index) => {
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
                                {orderReports.monthly && orderReports.monthly.data && orderReports.monthly.data.map((month, index) => {
                                  // Ensure month.revenue is a number
                                  const revenue = parseFloat(month.revenue) || 0;
                                  const orderCount = parseInt(month.orderCount) || 0;
                                  
                                  return (
                                    <tr key={index}>
                                      <td>{month.month}</td>
                                      <td>{orderCount}</td>
                                      <td>{formatCurrency(revenue)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </Table>

                            <h4 className="mb-3">Revenue by Order Type</h4>
                            <Table responsive hover>
                              <thead className="thead-light">
                                <tr>
                                  <th>Month</th>
                                  <th>Dine-In</th>
                                  <th>Takeout</th>
                                  <th>Delivery</th>
                                  <th>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderReports.revenueTrends && orderReports.revenueTrends.data && orderReports.revenueTrends.data.map((month, index) => {
                                  // Ensure all values are numbers
                                  const dineIn = parseFloat(month.dineIn) || 0;
                                  const takeout = parseFloat(month.takeout) || 0;
                                  const delivery = parseFloat(month.delivery) || 0;
                                  const total = dineIn + takeout + delivery;
                                  
                                  return (
                                    <tr key={index}>
                                      <td>{month.month}</td>
                                      <td>{formatCurrency(dineIn)}</td>
                                      <td>{formatCurrency(takeout)}</td>
                                      <td>{formatCurrency(delivery)}</td>
                                      <td>{formatCurrency(total)}</td>
                                    </tr>
                                  );
                                })}
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
                                {orderReports.topSellingItems && orderReports.topSellingItems.data && orderReports.topSellingItems.data.map((item, index) => {
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
                                {orderReports.revenueByCategory && orderReports.revenueByCategory.data && (() => {
                                  // Calculate total revenue once
                                  const total = orderReports.revenueByCategory.data.reduce(
                                    (sum, cat) => sum + parseFloat(cat.revenue || 0), 0
                                  );
                                  
                                  return orderReports.revenueByCategory.data.map((category, index) => {
                                    // Ensure revenue is a number
                                    const revenue = parseFloat(category.revenue) || 0;
                                    const percentage = total > 0 ? ((revenue / total) * 100).toFixed(2) : '0.00';
                                    
                                    return (
                                      <tr key={index}>
                                        <td>{category.name}</td>
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
                                {orderReports.orderStatusDistribution && orderReports.orderStatusDistribution.data && 
                                  Object.entries(orderReports.orderStatusDistribution.data).map(([status, data], index) => {
                                    // Ensure we have numeric data
                                    const count = parseInt(data.count) || 0;
                                    const percentage = parseFloat(data.percentage) || 0;
                                    
                                    return (
                                      <tr key={index}>
                                        <td>
                                          <Badge color={
                                            status === 'Completed' ? 'success' :
                                            status === 'Processing' ? 'info' :
                                            status === 'Pending' ? 'warning' :
                                            'danger'
                                          } pill>
                                            {status}
                                          </Badge>
                                        </td>
                                        <td>{count}</td>
                                        <td>{percentage.toFixed(2)}%</td>
                                      </tr>
                                    );
                                  })
                                }
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