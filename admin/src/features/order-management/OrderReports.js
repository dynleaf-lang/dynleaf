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
import { formatCurrencyByCountry } from '../../utils/currencyUtils';

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
    countryCode,
    getOrderReports, 
    getAllReports, 
    generateOrderReport, 
    exportOrderData,
    getRestaurants,
    getBranchesForRestaurant,
    setCountryCode
  } = useOrder();
  
  // Get currency information from CurrencyContext
  const { currencyCode } = useCurrency();

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

  // Initialize and load data
  useEffect(() => {
    if (user) {
      fetchReports();
      
      if (user.role === 'Super_Admin') {
        getRestaurants();
      }
    }
  }, [user]);

  // Handle restaurant selection with country code update
  const handleRestaurantChange = async (e) => {
    const restaurantId = e.target.value;
    setSelectedRestaurant(restaurantId);
    setSelectedBranch(''); // Reset branch when restaurant changes
    
    if (restaurantId) {
      // If a restaurant is selected, update country code based on restaurant selection
      const selectedRestaurantData = restaurants.find(r => r._id === restaurantId);
      if (selectedRestaurantData?.country) {
        setCountryCode(selectedRestaurantData.country);
      }
      await getBranchesForRestaurant(restaurantId);
    }
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
    const filters = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      restaurantId: selectedRestaurant,
      branchId: selectedBranch
    };
    
    // Fetch relevant report types based on active tab
    switch (activeTab) {
      case 'sales':
        await Promise.all([
          getOrderReports('daily', filters),
          getOrderReports('monthly', filters),
          getOrderReports('revenueTrends', filters)
        ]);
        break;
      case 'items':
        await Promise.all([
          getOrderReports('topSellingItems', filters),
          getOrderReports('revenueByCategory', filters)
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
  };

  // Handle tab change
  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      // Fetch reports when tab changes
      setTimeout(fetchReports, 0);
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
    
    // Fetch reports with reset filters
    setTimeout(fetchReports, 0);
  };

  // Handle export
  const handleExport = async () => {
    const filters = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      restaurantId: selectedRestaurant,
      branchId: selectedBranch,
      reportTitle: reportTitle || `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`
    };
    
    if (exportFormat === 'pdf') {
      await generateOrderReport(activeTab, filters);
    } else {
      await exportOrderData(exportFormat, filters);
    }
    
    setExportModal(false);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return formatCurrencyByCountry(amount, countryCode);
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
    if (orderReports.daily && orderReports.daily.data) {
      return formatCurrency(
        orderReports.daily.data.reduce(
          (sum, item) => sum + parseFloat(item.revenue), 0
        )
      );
    }
    return formatCurrency(0);
  };

  // Get order count
  const getOrderCount = () => {
    if (orderReports.daily && orderReports.daily.data) {
      return orderReports.daily.data.reduce(
        (sum, item) => sum + parseInt(item.orderCount), 0
      );
    }
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
    if (!orderReports.daily || !orderReports.daily.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: orderReports.daily.data.map(item => format(new Date(item.date), 'MMM dd')),
      datasets: [
        {
          label: 'Revenue',
          data: orderReports.daily.data.map(item => parseFloat(item.revenue)),
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primaryBorder,
          borderWidth: 1
        },
        {
          label: 'Orders',
          data: orderReports.daily.data.map(item => parseInt(item.orderCount)),
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
    if (!orderReports.monthly || !orderReports.monthly.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: orderReports.monthly.data.map(item => item.month),
      datasets: [
        {
          label: 'Revenue',
          data: orderReports.monthly.data.map(item => parseFloat(item.revenue)),
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
    if (!orderReports.revenueTrends || !orderReports.revenueTrends.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sum up by order type across all months
    const data = orderReports.revenueTrends.data;
    const dineInTotal = data.reduce((sum, item) => sum + parseFloat(item.dineIn || 0), 0);
    const takeoutTotal = data.reduce((sum, item) => sum + parseFloat(item.takeout || 0), 0);
    const deliveryTotal = data.reduce((sum, item) => sum + parseFloat(item.delivery || 0), 0);

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
    if (!orderReports.topSellingItems || !orderReports.topSellingItems.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: orderReports.topSellingItems.data.map(item => item.name),
      datasets: [
        {
          label: 'Quantity Sold',
          data: orderReports.topSellingItems.data.map(item => parseInt(item.quantity)),
          backgroundColor: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.danger,
            chartColors.info,
            chartColors.purple
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for category revenue
  const getCategoryRevenueChart = () => {
    if (!orderReports.revenueByCategory || !orderReports.revenueByCategory.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    return {
      labels: orderReports.revenueByCategory.data.map(item => item.name),
      datasets: [
        {
          label: 'Revenue',
          data: orderReports.revenueByCategory.data.map(item => parseFloat(item.revenue)),
          backgroundColor: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.danger,
            chartColors.info
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // Chart data for order status distribution
  const getOrderStatusChart = () => {
    if (!orderReports.orderStatusDistribution || !orderReports.orderStatusDistribution.data) {
      return {
        labels: [],
        datasets: []
      };
    }

    const statusData = orderReports.orderStatusDistribution.data;
    const labels = Object.keys(statusData);
    const counts = labels.map(label => parseInt(statusData[label].count));
    
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
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Revenue')) {
                label += formatCurrency(context.parsed.y);
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    }
  };

  // Daily sales chart options with dual y-axes
  const dailySalesOptions = {
    ...chartOptions,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue'
        },
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      },
      'y-axis-2': {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Order Count'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
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
                    <h3 className="mb-0">Order Reports</h3>
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
                                >
                                  <option value="">All Restaurants</option>
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
                                  onChange={(e) => setSelectedBranch(e.target.value)}
                                  disabled={!selectedRestaurant}
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
                                {orderReports.daily && orderReports.daily.data && orderReports.daily.data.map((day, index) => (
                                  <tr key={index}>
                                    <td>{formatDate(day.date)}</td>
                                    <td>{day.orderCount}</td>
                                    <td>{formatCurrency(day.revenue)}</td>
                                    <td>{formatCurrency(day.orderCount > 0 ? day.revenue / day.orderCount : 0)}</td>
                                  </tr>
                                ))}
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
                                {orderReports.monthly && orderReports.monthly.data && orderReports.monthly.data.map((month, index) => (
                                  <tr key={index}>
                                    <td>{month.month}</td>
                                    <td>{month.orderCount}</td>
                                    <td>{formatCurrency(month.revenue)}</td>
                                  </tr>
                                ))}
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
                                {orderReports.revenueTrends && orderReports.revenueTrends.data && orderReports.revenueTrends.data.map((month, index) => (
                                  <tr key={index}>
                                    <td>{month.month}</td>
                                    <td>{formatCurrency(month.dineIn)}</td>
                                    <td>{formatCurrency(month.takeout)}</td>
                                    <td>{formatCurrency(month.delivery)}</td>
                                    <td>{formatCurrency(parseFloat(month.dineIn) + parseFloat(month.takeout) + parseFloat(month.delivery))}</td>
                                  </tr>
                                ))}
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
                                {orderReports.topSellingItems && orderReports.topSellingItems.data && orderReports.topSellingItems.data.map((item, index) => (
                                  <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{formatCurrency(item.revenue)}</td>
                                    <td>{formatCurrency(item.quantity > 0 ? item.revenue / item.quantity : 0)}</td>
                                  </tr>
                                ))}
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
                                {orderReports.revenueByCategory && orderReports.revenueByCategory.data && orderReports.revenueByCategory.data.map((category, index) => {
                                  const total = orderReports.revenueByCategory.data.reduce(
                                    (sum, cat) => sum + parseFloat(cat.revenue), 0
                                  );
                                  const percentage = (parseFloat(category.revenue) / total * 100).toFixed(2);
                                  return (
                                    <tr key={index}>
                                      <td>{category.name}</td>
                                      <td>{formatCurrency(category.revenue)}</td>
                                      <td>{percentage}%</td>
                                    </tr>
                                  );
                                })}
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
                                  Object.entries(orderReports.orderStatusDistribution.data).map(([status, data], index) => (
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
                                      <td>{data.count}</td>
                                      <td>{data.percentage}%</td>
                                    </tr>
                                  ))
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