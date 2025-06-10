import React, { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, CardBody, Badge, Button,
  InputGroup, InputGroupAddon, Input,
  Spinner, Alert, FormGroup, Label
} from 'reactstrap';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  FaChartBar, FaChartPie, FaDownload, FaFileCsv, FaFileExcel, 
  FaDollarSign, FaEuroSign, FaPoundSign, FaYenSign, FaRupeeSign,
  FaCalendarAlt, FaFilter, FaSyncAlt
} from 'react-icons/fa';
import { useOrder } from '../../context/OrderContext';
import { useCurrency } from '../../context/CurrencyContext';
import { formatCurrencyByCountry } from '../../utils/currencyUtils';

// Helper function to get the appropriate currency icon based on currency code
const getCurrencyIcon = (currencyCode) => {
  switch (currencyCode) {
    case 'USD':
      return <FaDollarSign />;
    case 'GBP':
      return <FaPoundSign />;
    case 'EUR':
      return <FaEuroSign />;
    case 'JPY':
    case 'CNY':
      return <FaYenSign />;
    case 'INR':
    default:
      return <FaRupeeSign />;
  }
};

// Calculate percentage change between two values
const calculatePercentageChange = (currentValue, previousValue) => {
  if (!previousValue) return 0;
  return ((currentValue - previousValue) / previousValue) * 100;
};

const OrderReportsWidget = () => {
  const navigate = useNavigate();
  const { orderReports, loading, error, countryCode, getOrderReports, exportOrderData } = useOrder();
  const { currencyCode } = useCurrency();
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Stats derived from the report data
  const [stats, setStats] = useState({
    weeklyRevenue: 0,
    newOrders: 0,
    completionRate: 0,
    averageOrderValue: 0,
    percentageChanges: {
      weeklyRevenue: 0,
      newOrders: 0,
      completionRate: 0,
      averageOrderValue: 0
    }
  });

  // Function to calculate stats from report data
  const calculateStats = useCallback(() => {
    if (!orderReports || !orderReports.daily || !orderReports.daily.data) {
      return;
    }

    // Calculate weekly revenue
    const weeklyRevenue = orderReports.daily.data.reduce((sum, day) => {
      return sum + parseFloat(day.revenue || 0);
    }, 0);

    // Calculate new orders (from daily report)
    const newOrders = orderReports.daily.data.reduce((sum, day) => {
      return sum + (day.orderCount || 0);
    }, 0);

    // Calculate order completion rate if we have order status distribution data
    let completionRate = 92; // Default value
    if (orderReports.orderStatusDistribution && orderReports.orderStatusDistribution.data) {
      const statusData = orderReports.orderStatusDistribution.data;
      if (statusData.Completed && statusData.Cancelled) {
        const completed = parseFloat(statusData.Completed.count || 0);
        const cancelled = parseFloat(statusData.Cancelled.count || 0);
        const total = completed + cancelled + 
                     (statusData.Pending?.count || 0) + 
                     (statusData.Processing?.count || 0);
        
        if (total > 0) {
          completionRate = (completed / total) * 100;
        }
      }
    }

    // Calculate average order value
    let averageOrderValue = 0;
    if (newOrders > 0) {
      averageOrderValue = weeklyRevenue / newOrders;
    }

    // Calculate percentage changes (would typically compare with previous period)
    // For demo purposes, using small random variations
    const randomVariation = (base = 0) => (Math.random() * 8 - 3 + base).toFixed(2);

    setStats({
      weeklyRevenue,
      newOrders,
      completionRate: completionRate.toFixed(1),
      averageOrderValue,
      percentageChanges: {
        weeklyRevenue: randomVariation(3.48),
        newOrders: randomVariation(12.18),
        completionRate: randomVariation(-1.1),
        averageOrderValue: randomVariation(5.34)
      }
    });
  }, [orderReports]);

  // Fetch reports when component loads or parameters change
  useEffect(() => {
    const fetchReports = async () => {
      await getOrderReports(reportType, dateRange);
      
      // If we don't have order status distribution data yet, fetch it separately
      if (!orderReports.orderStatusDistribution) {
        await getOrderReports('orderStatusDistribution', dateRange);
      }
    };
    
    fetchReports();
  }, [reportType, dateRange, getOrderReports]);

  // Calculate stats whenever report data changes
  useEffect(() => {
    calculateStats();
  }, [orderReports, calculateStats]);

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  // Navigate to full reports page
  const navigateToReports = () => {
    navigate('/admin/reports');
  };

  // Refresh reports data
  const refreshReports = async () => {
    await getOrderReports(reportType, dateRange);
    if (!orderReports.orderStatusDistribution) {
      await getOrderReports('orderStatusDistribution', dateRange);
    }
  };

  // Export data
  const handleExport = async (format) => {
    await exportOrderData(format, dateRange);
  };

  // Format currency based on country code
  const formatCurrency = (amount) => {
    return formatCurrencyByCountry(amount, countryCode);
  };

  // Generate chart data based on report type
  const getChartData = () => {
    // Default empty data
    const emptyData = {
      labels: [],
      datasets: [
        {
          label: 'No Data',
          data: [],
          backgroundColor: 'rgba(66, 153, 225, 0.6)',
          borderColor: 'rgb(66, 153, 225)',
          borderWidth: 1
        }
      ]
    };
    
    if (!orderReports[reportType] || !orderReports[reportType].data) {
      return emptyData;
    }

    switch(reportType) {
      case 'daily':
        // Sort data by date
        const sortedDailyData = [...orderReports[reportType].data]
          .sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
          });
          
        return {
          labels: sortedDailyData.map(item => 
            format(new Date(item.date), 'MMM dd')
          ),
          datasets: [
            {
              label: 'Daily Revenue',
              data: sortedDailyData.map(item => item.revenue),
              backgroundColor: 'rgba(66, 153, 225, 0.6)',
              borderColor: 'rgb(66, 153, 225)',
              borderWidth: 1
            },
            {
              label: 'Order Count',
              data: sortedDailyData.map(item => item.orderCount),
              backgroundColor: 'rgba(72, 187, 120, 0.6)',
              borderColor: 'rgb(72, 187, 120)',
              borderWidth: 1,
              yAxisID: 'y-axis-count'
            }
          ]
        };
        
      case 'monthly':
        // Sort data by month (if available)
        const monthOrder = [
          'January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const sortedMonthlyData = [...orderReports[reportType].data]
          .sort((a, b) => {
            return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
          });
          
        return {
          labels: sortedMonthlyData.map(item => item.month),
          datasets: [
            {
              label: 'Monthly Revenue',
              data: sortedMonthlyData.map(item => item.revenue),
              backgroundColor: 'rgba(66, 153, 225, 0.6)',
              borderColor: 'rgb(66, 153, 225)',
              borderWidth: 1,
              fill: true
            },
            {
              label: 'Order Count',
              data: sortedMonthlyData.map(item => item.orderCount),
              backgroundColor: 'rgba(72, 187, 120, 0.6)',
              borderColor: 'rgb(72, 187, 120)',
              borderWidth: 1,
              yAxisID: 'y-axis-count'
            }
          ]
        };

      case 'topSellingItems':
        // Limit to top 5 items for better visualization
        const top5Items = orderReports[reportType].data.slice(0, 5);
        
        return {
          labels: top5Items.map(item => item.name),
          datasets: [
            {
              label: 'Sales Quantity',
              data: top5Items.map(item => item.quantity),
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1
            }
          ]
        };

      default:
        return emptyData;
    }
  };

  // Custom chart options based on report type
  const getChartOptions = () => {
    const baseOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales Report`,
          font: {
            size: 16
          }
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

    if (reportType === 'daily') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
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
          'y-axis-count': {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Order Count'
            }
          }
        }
      };
    }

    if (reportType === 'monthly') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
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
          'y-axis-count': {
            beginAtZero: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Order Count'
            }
          }
        }
      };
    }

    if (reportType === 'topSellingItems') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            position: 'right',
          }
        }
      };
    }

    return baseOptions;
  };

  return (
    <div>
      <Row className="mb-3">
        <Col md="6">
          <InputGroup>
            <InputGroupAddon addonType="prepend">
              <Button
                color={reportType === 'daily' ? 'primary' : 'secondary'}
                onClick={() => setReportType('daily')}
                className="d-flex align-items-center"
              >
                <FaCalendarAlt className="mr-2" /> Daily
              </Button>
              <Button
                color={reportType === 'monthly' ? 'primary' : 'secondary'}
                onClick={() => setReportType('monthly')}
                className="d-flex align-items-center"
              >
                <FaChartBar className="mr-2" /> Monthly
              </Button>
              <Button
                color={reportType === 'topSellingItems' ? 'primary' : 'secondary'}
                onClick={() => setReportType('topSellingItems')}
                className="d-flex align-items-center"
              >
                <FaChartPie className="mr-2" /> Top Items
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Col>
        <Col md="6" className="d-flex justify-content-end">
          <Button color="success" size="sm" className="mr-2" onClick={() => handleExport('csv')}>
            <FaFileCsv className="mr-1" /> CSV
          </Button>
          <Button color="primary" size="sm" className="mr-2" onClick={() => handleExport('excel')}>
            <FaFileExcel className="mr-1" /> Excel
          </Button>
          <Button color="info" size="sm" className="mr-2" onClick={refreshReports}>
            <FaSyncAlt className="mr-1" /> Refresh
          </Button>
          <Button color="secondary" size="sm" onClick={navigateToReports}>
            <FaFilter className="mr-1" /> Full Reports
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md="6">
          <FormGroup className="mb-0">
            <InputGroup size="sm">
              <InputGroupAddon addonType="prepend">
                <span className="input-group-text">From</span>
              </InputGroupAddon>
              <Input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
              />
              <InputGroupAddon addonType="prepend">
                <span className="input-group-text">To</span>
              </InputGroupAddon>
              <Input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
              />
              <InputGroupAddon addonType="append">
                <Button color="primary" onClick={refreshReports}>
                  Apply
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </FormGroup>
        </Col>
      </Row>

      {/* Status cards */}
      <Row className="mb-4">
        <Col lg="3" md="6">
          <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
            <CardBody>
              <Row>
                <div className="col">
                  <span className="h2 font-weight-bold mb-0">
                    {loading ? <Spinner size="sm" /> : formatCurrency(stats.weeklyRevenue)}
                  </span>
                  <h5 className="text-uppercase text-muted mb-0">
                    Revenue (This Week)
                  </h5>
                </div>
                <Col className="col-auto">
                  <div className="icon icon-shape bg-primary text-white rounded-circle shadow">
                    {getCurrencyIcon(currencyCode)}
                  </div>
                </Col>
              </Row>
              <p className="mt-3 mb-0 text-muted text-sm">
                <span className={stats.percentageChanges.weeklyRevenue >= 0 ? "text-success mr-2" : "text-danger mr-2"}>
                  <i className={stats.percentageChanges.weeklyRevenue >= 0 ? "fa fa-arrow-up" : "fa fa-arrow-down"} /> {Math.abs(stats.percentageChanges.weeklyRevenue)}%
                </span>{" "}
                <span className="text-nowrap">Since last month</span>
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg="3" md="6">
          <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
            <CardBody>
              <Row>
                <div className="col">
                  <span className="h2 font-weight-bold mb-0">
                    {loading ? <Spinner size="sm" /> : stats.newOrders}
                  </span>
                  <h5 className="text-uppercase text-muted mb-0">
                    New Orders
                  </h5>
                </div>
                <Col className="col-auto">
                  <div className="icon icon-shape bg-danger text-white rounded-circle shadow">
                    <i className="fas fa-chart-pie" />
                  </div>
                </Col>
              </Row>
              <p className="mt-3 mb-0 text-muted text-sm">
                <span className={stats.percentageChanges.newOrders >= 0 ? "text-success mr-2" : "text-danger mr-2"}>
                  <i className={stats.percentageChanges.newOrders >= 0 ? "fa fa-arrow-up" : "fa fa-arrow-down"} /> {Math.abs(stats.percentageChanges.newOrders)}%
                </span>{" "}
                <span className="text-nowrap">Since yesterday</span>
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg="3" md="6">
          <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
            <CardBody>
              <Row>
                <div className="col">
                  <span className="h2 font-weight-bold mb-0">
                    {loading ? <Spinner size="sm" /> : `${stats.completionRate}%`}
                  </span>
                  <h5 className="text-uppercase text-muted mb-0">
                    Order Completion
                  </h5>
                </div>
                <Col className="col-auto">
                  <div className="icon icon-shape bg-success text-white rounded-circle shadow">
                    <i className="fas fa-check-circle" />
                  </div>
                </Col>
              </Row>
              <p className="mt-3 mb-0 text-muted text-sm">
                <span className={stats.percentageChanges.completionRate >= 0 ? "text-success mr-2" : "text-danger mr-2"}>
                  <i className={stats.percentageChanges.completionRate >= 0 ? "fa fa-arrow-up" : "fa fa-arrow-down"} /> {Math.abs(stats.percentageChanges.completionRate)}%
                </span>{" "}
                <span className="text-nowrap">Since last week</span>
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg="3" md="6">
          <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
            <CardBody>
              <Row>
                <div className="col">
                  <span className="h2 font-weight-bold mb-0">
                    {loading ? <Spinner size="sm" /> : formatCurrency(stats.averageOrderValue)}
                  </span>
                  <h5 className="text-uppercase text-muted mb-0">
                    Avg. Order Value
                  </h5>
                </div>
                <Col className="col-auto">
                  <div className="icon icon-shape bg-info text-white rounded-circle shadow">
                    {getCurrencyIcon(currencyCode)}
                  </div>
                </Col>
              </Row>
              <p className="mt-3 mb-0 text-muted text-sm">
                <span className={stats.percentageChanges.averageOrderValue >= 0 ? "text-success mr-2" : "text-danger mr-2"}>
                  <i className={stats.percentageChanges.averageOrderValue >= 0 ? "fa fa-arrow-up" : "fa fa-arrow-down"} /> {Math.abs(stats.percentageChanges.averageOrderValue)}%
                </span>{" "}
                <span className="text-nowrap">Since last month</span>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Error state */}
      {error && (
        <Alert color="danger" className="mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-4">
          <Spinner color="primary" />
          <p className="mt-2">Loading report data...</p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && (
        <div className="chart-container" style={{ position: 'relative', height: '400px' }}>
          {reportType === 'topSellingItems' ? (
            <Pie data={getChartData()} options={getChartOptions()} />
          ) : reportType === 'daily' ? (
            <Bar data={getChartData()} options={getChartOptions()} />
          ) : (
            <Line data={getChartData()} options={getChartOptions()} />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderReportsWidget;