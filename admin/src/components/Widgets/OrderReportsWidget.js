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
  const { orderReports, loading: contextLoading, error: contextError, getOrderReports, exportOrderData } = useOrder();
  const { currencyCode, formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState('daily');
  const [loading, setLoading] = useState(false); // Local loading state for UI operations
  const [error, setError] = useState(null); // Local error state
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
    console.log('OrderReportsWidget: Calculating stats from report data');
    
    try {
      // Safety check for report data
      if (!orderReports) {
        console.log('OrderReportsWidget: No reports data available');
        setError('No report data available');
        return;
      }

      if (!orderReports.daily || !orderReports.daily.data || !Array.isArray(orderReports.daily.data)) {
        console.log('OrderReportsWidget: No daily data available for stats calculation');
        setError('Daily report data is missing or invalid');
        return;
      }

      // Filter out invalid entries
      const validDailyData = orderReports.daily.data.filter(day => day && typeof day === 'object');
      console.log(`OrderReportsWidget: Processing ${validDailyData.length} valid daily data entries`);
      
      if (validDailyData.length === 0) {
        setError('No valid daily report data for the selected period');
        return;
      }
      
      // Clear any previous errors since we have data
      setError(null);
      
      // Calculate weekly revenue
      const weeklyRevenue = validDailyData.reduce((sum, day) => {
        const revenue = parseFloat(day.revenue || 0);
        return isNaN(revenue) ? sum : sum + revenue;
      }, 0);

      // Calculate new orders (from daily report)
      const newOrders = validDailyData.reduce((sum, day) => {
        const count = parseInt(day.orderCount || 0, 10);
        return isNaN(count) ? sum : sum + count;
      }, 0);

      // Calculate order completion rate if we have order status distribution data
      let completionRate = 0;
      
      if (orderReports.orderStatusDistribution && 
          orderReports.orderStatusDistribution.data && 
          typeof orderReports.orderStatusDistribution.data === 'object') {
          
        const statusData = orderReports.orderStatusDistribution.data;
        console.log('OrderReportsWidget: Processing order status distribution data', statusData);
        
        // Safety checks for the format of order status data
        const hasValidStatusData = statusData && typeof statusData === 'object';
                                  
        if (hasValidStatusData) {
          // Check for different possible data structures
          if (statusData.Completed && statusData.Completed.count !== undefined) {
            // Parse all counts to ensure we have numbers
            const completed = parseFloat(statusData.Completed?.count || 0);
            const cancelled = parseFloat(statusData.Cancelled?.count || 0);
            const pending = parseFloat(statusData.Pending?.count || 0);
            const processing = parseFloat(statusData.Processing?.count || 0);
            
            const total = completed + cancelled + pending + processing;
            
            if (total > 0) {
              completionRate = (completed / total) * 100;
              console.log(`OrderReportsWidget: Calculated completion rate ${completionRate.toFixed(1)}% from real data`);
            }
          } else {
            // Alternative structure with direct property access
            const statusKeys = Object.keys(statusData);
            const completedKey = statusKeys.find(key => key.toLowerCase() === 'completed');
            
            if (completedKey && statusData[completedKey]) {
              // Get total orders count
              let total = 0;
              let completed = 0;
              
              for (const status of statusKeys) {
                const count = parseFloat(
                  typeof statusData[status] === 'object' 
                  ? statusData[status].count || 0 
                  : statusData[status] || 0
                );
                
                if (!isNaN(count)) {
                  total += count;
                  if (status.toLowerCase() === 'completed') {
                    completed = count;
                  }
                }
              }
              
              if (total > 0) {
                completionRate = (completed / total) * 100;
              }
            }
          }
        }
      }

      // Calculate average order value
      let averageOrderValue = 0;
      if (newOrders > 0) {
        averageOrderValue = weeklyRevenue / newOrders;
        console.log(`OrderReportsWidget: Calculated average order value ${formatCurrency(averageOrderValue)}`);
      }

      // Calculate percentage changes
      // Compare with previous period
      const stats = {
        weeklyRevenue,
        newOrders,
        completionRate: parseFloat(completionRate).toFixed(1),
        averageOrderValue,
        percentageChanges: {
          weeklyRevenue: '0.00',
          newOrders: '0.00',
          completionRate: '0.00',
          averageOrderValue: '0.00'
        }
      };
      
      // If we have enough data, calculate real percentage changes
      // For now we'll leave them at zero until we implement period comparison
      
      console.log('OrderReportsWidget: Calculated stats', stats);
      setStats(stats);
      
    } catch (error) {
      console.error('OrderReportsWidget: Error calculating stats:', error);
      setError(`Error calculating statistics: ${error.message}`);
      
      // Set fallback stats in case of error
      setStats({
        weeklyRevenue: 0,
        newOrders: 0,
        completionRate: '0.0',
        averageOrderValue: 0,
        percentageChanges: {
          weeklyRevenue: '0.00',
          newOrders: '0.00',
          completionRate: '0.00',
          averageOrderValue: '0.00'
        }
      });
    }
  }, [orderReports, formatCurrency]);

  // Fetch reports when component loads or parameters change
  useEffect(() => {
    console.log('OrderReportsWidget: Fetching reports for', reportType, dateRange);
    
    // Use a flag to track component mount status for cleanup
    let isMounted = true;
    
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Make sure dates are valid
        if (!dateRange.startDate || !dateRange.endDate) {
          const errorMsg = 'Invalid date range for report';
          console.error('OrderReportsWidget:', errorMsg, dateRange);
          setError(errorMsg);
          return;
        }
        
        console.log(`OrderReportsWidget: Fetching ${reportType} report data`);
        const reportResult = await getOrderReports(reportType, dateRange);
        
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        // Check for API error
        if (!reportResult.success) {
          const errorMsg = reportResult.message || `Failed to fetch ${reportType} report data`;
          console.error('OrderReportsWidget:', errorMsg);
          setError(errorMsg);
          return;
        }
        
        // Always fetch order status distribution data for stats calculation
        console.log('OrderReportsWidget: Fetching order status distribution data');
        const statusResult = await getOrderReports('orderStatusDistribution', dateRange);
        
        // Handle status distribution fetch error
        if (!statusResult.success && isMounted) {
          console.warn('OrderReportsWidget: Failed to fetch order status data, but continuing with other data');
        }
      } catch (error) {
        if (isMounted) {
          const errorMsg = error.message || 'Error fetching report data';
          console.error('OrderReportsWidget: Error fetching reports:', error);
          setError(errorMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchReports();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [reportType, dateRange.startDate, dateRange.endDate, getOrderReports]);

  // Calculate stats whenever report data changes
  useEffect(() => {
    // Only calculate stats if we have the necessary data
    if (orderReports && 
        orderReports.daily && 
        orderReports.daily.data && 
        Array.isArray(orderReports.daily.data) && 
        orderReports.daily.data.length > 0) {
      calculateStats();
    } else {
      console.log('OrderReportsWidget: Skipping stats calculation - insufficient data');
    }
  }, [orderReports, calculateStats]);

  // Sync local state with context
  useEffect(() => {
    // Reflect context loading state in local state
    if (contextLoading !== loading) {
      setLoading(contextLoading);
    }
    
    // Reflect context error in local state
    if (contextError && contextError !== error) {
      setError(contextError);
    }
  }, [contextLoading, contextError, loading, error]);

  // Handle date range change
  const handleDateRangeChange = (e) => {
    try {
      const { name, value } = e.target;
      
      // Validate date value
      if (!value) {
        console.warn('OrderReportsWidget: Empty date value for', name);
        return;
      }
      
      console.log(`OrderReportsWidget: Date ${name} changed to ${value}`);
      setDateRange(prev => ({ ...prev, [name]: value }));
      
      // Clear any previous errors
      setError(null);
      
    } catch (error) {
      console.error('OrderReportsWidget: Error handling date change:', error);
    }
  };

  // Navigate to full reports page
  const navigateToReports = () => {
    navigate('/admin/reports');
  };

  // Refresh reports data
  const refreshReports = async () => {
    try {
      console.log('OrderReportsWidget: Refreshing report data', { reportType, dateRange });
      
      // Show loading state
      setLoading(true);
      
      // Fetch the current report type
      await getOrderReports(reportType, dateRange);
      
      // Always make sure we have the status distribution data for the stats calculation
      console.log('OrderReportsWidget: Refreshing order status distribution data');
      await getOrderReports('orderStatusDistribution', dateRange);
      
      // Calculate stats with fresh data
      calculateStats();
      
      console.log('OrderReportsWidget: Refresh completed successfully');
    } catch (error) {
      console.error('OrderReportsWidget: Error refreshing data:', error);
    } finally {
      // Ensure loading state is cleared even if there's an error
      setLoading(false);
    }
  };

  // Export data
  const handleExport = async (format) => {
    try {
      console.log(`OrderReportsWidget: Exporting data as ${format}`, dateRange);
      
      // Show loading state during export
      setLoading(true);
      
      // Include reportType in the export to get relevant data
      const exportOptions = {
        ...dateRange,
        reportType: reportType
      };
      
      await exportOrderData(format, exportOptions);
      console.log('OrderReportsWidget: Export completed');
    } catch (error) {
      console.error(`OrderReportsWidget: Error exporting data as ${format}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data based on report type
  const getChartData = () => {
    console.log(`OrderReportsWidget: Generating chart data for ${reportType}`, orderReports[reportType]);
    
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
      console.log('OrderReportsWidget: No data available for report type:', reportType);
      return emptyData;
    }

    try {
      switch(reportType) {
        case 'daily':
          // Ensure we have an array to work with and clone it
          if (!Array.isArray(orderReports[reportType].data)) {
            console.log('OrderReportsWidget: Daily data is not an array:', orderReports[reportType].data);
            return emptyData;
          }
          
          // Sort data by date
          const sortedDailyData = [...orderReports[reportType].data]
            .filter(item => item && item.date) // Filter out null/undefined entries
            .sort((a, b) => {
              return new Date(a.date) - new Date(b.date);
            });
            
          if (sortedDailyData.length === 0) {
            console.log('OrderReportsWidget: No valid daily data entries after filtering');
            return emptyData;
          }
            
          return {
            labels: sortedDailyData.map(item => 
              format(new Date(item.date), 'MMM dd')
            ),
            datasets: [
              {
                label: 'Daily Revenue',
                data: sortedDailyData.map(item => parseFloat(item.revenue || 0)),
                backgroundColor: 'rgba(66, 153, 225, 0.6)',
                borderColor: 'rgb(66, 153, 225)',
                borderWidth: 1
              },
              {
                label: 'Order Count',
                data: sortedDailyData.map(item => parseInt(item.orderCount || 0, 10)),
                backgroundColor: 'rgba(72, 187, 120, 0.6)',
                borderColor: 'rgb(72, 187, 120)',
                borderWidth: 1,
                yAxisID: 'y-axis-count'
              }
            ]
          };
          
        case 'monthly':
          // Ensure we have an array to work with
          if (!Array.isArray(orderReports[reportType].data)) {
            console.log('OrderReportsWidget: Monthly data is not an array:', orderReports[reportType].data);
            return emptyData;
          }
          
          // Sort data by month (if available)
          const monthOrder = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          
          const sortedMonthlyData = [...orderReports[reportType].data]
            .filter(item => item && item.month) // Filter out null/undefined entries
            .sort((a, b) => {
              return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
            });
            
          if (sortedMonthlyData.length === 0) {
            console.log('OrderReportsWidget: No valid monthly data entries after filtering');
            return emptyData;
          }
            
          return {
            labels: sortedMonthlyData.map(item => item.month),
            datasets: [
              {
                label: 'Monthly Revenue',
                data: sortedMonthlyData.map(item => parseFloat(item.revenue || 0)),
                backgroundColor: 'rgba(66, 153, 225, 0.6)',
                borderColor: 'rgb(66, 153, 225)',
                borderWidth: 1,
                fill: true
              },
              {
                label: 'Order Count',
                data: sortedMonthlyData.map(item => parseInt(item.orderCount || 0, 10)),
                backgroundColor: 'rgba(72, 187, 120, 0.6)',
                borderColor: 'rgb(72, 187, 120)',
                borderWidth: 1,
                yAxisID: 'y-axis-count'
              }
            ]
          };

        case 'topSellingItems':
          // Ensure we have an array to work with
          if (!Array.isArray(orderReports[reportType].data)) {
            console.log('OrderReportsWidget: Top selling items data is not an array:', orderReports[reportType].data);
            return emptyData;
          }
          
          // Filter valid entries and limit to top 5 items for better visualization
          const validItems = orderReports[reportType].data.filter(item => item && item.name);
          const top5Items = validItems.slice(0, 5);
          
          if (top5Items.length === 0) {
            console.log('OrderReportsWidget: No valid top selling items after filtering');
            return emptyData;
          }
          
          return {
            labels: top5Items.map(item => item.name),
            datasets: [
              {
                label: 'Sales Quantity',
                data: top5Items.map(item => parseInt(item.quantity || 0, 10)),
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
          console.log('OrderReportsWidget: Unknown report type:', reportType);
          return emptyData;
      }
    } catch (error) {
      console.error('OrderReportsWidget: Error generating chart data:', error);
      return emptyData;
    }
  };

  // Custom chart options based on report type (Chart.js 2.x format)
  const getChartOptions = () => {
    // Safely format currency with error handling
    const safeCurrencyFormat = (value) => {
      try {
        // Ensure value is a number
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';
        return formatCurrency(numValue);
      } catch (error) {
        console.error('Error formatting currency:', error);
        return '';
      }
    };
    
    const baseOptions = {
      maintainAspectRatio: false,
      responsive: true,
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      title: {
        display: true,
        text: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales Report`,
        fontSize: 16,
        fontStyle: 'normal'
      },
      tooltips: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFontSize: 12,
        bodyFontSize: 13,
        cornerRadius: 3,
        xPadding: 10,
        yPadding: 10,
        callbacks: {
          label: function(tooltipItem, data) {
            try {
              let label = data.datasets[tooltipItem.datasetIndex].label || '';
              if (label) {
                label += ': ';
              }
              
              if (tooltipItem.yLabel !== null) {
                if (label.includes('Revenue')) {
                  label += safeCurrencyFormat(tooltipItem.yLabel);
                } else {
                  label += tooltipItem.yLabel;
                }
              }
              return label;
            } catch (error) {
              console.error('Error in tooltip callback:', error);
              return 'Error displaying value';
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    };

    if (reportType === 'daily') {
      return {
        ...baseOptions,
        scales: {
          yAxes: [
            {
              id: 'y-axis-revenue',
              position: 'left',
              ticks: {
                beginAtZero: true,
                callback: function(value) {
                  return safeCurrencyFormat(value);
                },
                // Add some padding to prevent currency symbols from being cut off
                padding: 8
              },
              scaleLabel: {
                display: true,
                labelString: 'Revenue',
                fontStyle: 'bold'
              }
            },
            {
              id: 'y-axis-count',
              position: 'right',
              ticks: {
                beginAtZero: true,
                precision: 0  // Only show whole numbers for order counts
              },
              gridLines: {
                drawOnChartArea: false,
              },
              scaleLabel: {
                display: true,
                labelString: 'Order Count',
                fontStyle: 'bold'
              }
            }
          ],
          xAxes: [
            {
              ticks: {
                beginAtZero: true,
                maxRotation: 45,
                minRotation: 0
              },
              gridLines: {
                offsetGridLines: false,
                display: true
              }
            }
          ]
        }
      };
    }

    if (reportType === 'monthly') {
      return {
        ...baseOptions,
        scales: {
          yAxes: [
            {
              id: 'y-axis-revenue',
              position: 'left',
              ticks: {
                beginAtZero: true,
                callback: function(value) {
                  return safeCurrencyFormat(value);
                },
                padding: 8
              },
              scaleLabel: {
                display: true,
                labelString: 'Revenue',
                fontStyle: 'bold'
              }
            },
            {
              id: 'y-axis-count',
              position: 'right',
              ticks: {
                beginAtZero: true,
                precision: 0  // Only show whole numbers for order counts
              },
              gridLines: {
                drawOnChartArea: false,
              },
              scaleLabel: {
                display: true,
                labelString: 'Order Count',
                fontStyle: 'bold'
              }
            }
          ],
          xAxes: [
            {
              ticks: {
                beginAtZero: true
              }
            }
          ]
        }
      };
    }

    if (reportType === 'topSellingItems') {
      return {
        ...baseOptions,
        legend: {
          display: true,
          position: 'right',
          labels: {
            padding: 20,
            boxWidth: 15
          }
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              try {
                const dataset = data.datasets[tooltipItem.datasetIndex];
                const index = tooltipItem.index;
                const value = dataset.data[index] || 0;
                const label = data.labels[index] || '';
                return `${label}: ${value} units sold`;
              } catch (error) {
                console.error('Error in tooltip callback:', error);
                return 'Error displaying value';
              }
            }
          }
        }
      };
    }

    return baseOptions;
  };

  return (
    <div>
      {/* Error message display */}
      {error && (
        <Alert color="danger" className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Error:</strong> {error}
            </div>
            <Button color="link" className="p-0" onClick={() => setError(null)}>
              <span aria-hidden="true">&times;</span>
            </Button>
          </div>
        </Alert>
      )}
      
      <Row className="mb-3">
        <Col md="6">
          <InputGroup>
            <InputGroupAddon addonType="prepend">
              <Button
                color={reportType === 'daily' ? 'primary' : 'secondary'}
                onClick={() => setReportType('daily')}
                className="d-flex align-items-center"
                disabled={loading}
              >
                <FaCalendarAlt className="mr-2" /> Daily
              </Button>
              <Button
                color={reportType === 'monthly' ? 'primary' : 'secondary'}
                onClick={() => setReportType('monthly')}
                className="d-flex align-items-center"
                disabled={loading}
              >
                <FaChartBar className="mr-2" /> Monthly
              </Button>
              <Button
                color={reportType === 'topSellingItems' ? 'primary' : 'secondary'}
                onClick={() => setReportType('topSellingItems')}
                className="d-flex align-items-center"
                disabled={loading}
              >
                <FaChartPie className="mr-2" /> Top Items
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Col>
        <Col md="6" className="d-flex justify-content-end">
          <Button color="success" size="sm" className="mr-2" onClick={() => handleExport('csv')} disabled={loading || error}>
            <FaFileCsv className="mr-1" /> CSV
          </Button>
          <Button color="primary" size="sm" className="mr-2" onClick={() => handleExport('excel')} disabled={loading || error}>
            <FaFileExcel className="mr-1" /> Excel
          </Button>
          <Button color="info" size="sm" className="mr-2" onClick={refreshReports} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <FaSyncAlt className="mr-1" />} {loading ? 'Loading...' : 'Refresh'}
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

      {/* Loading state */}
      {(loading || contextLoading) && (
        <div className="text-center py-4">
          <Spinner color="primary" />
          <p className="mt-2">Loading report data...</p>
        </div>
      )}

      {/* Chart */}
      {!loading && (
        <div className="chart-container" style={{ position: 'relative', height: '400px' }}>
          {(() => {
            try {
              const chartData = getChartData();
              const chartOptions = getChartOptions();
              
              // Verify we have valid data before rendering
              const hasValidData = chartData && 
                                  chartData.datasets && 
                                  Array.isArray(chartData.datasets) &&
                                  chartData.datasets.length > 0 &&
                                  chartData.labels &&
                                  Array.isArray(chartData.labels) &&
                                  chartData.labels.length > 0;
                                  
              if (!hasValidData) {
                return (
                  <div className="text-center py-5">
                    <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <p>No data available for the selected period</p>
                    {error && (
                      <div className="mt-3">
                        <Badge color="danger" className="p-2">
                          <i className="fas fa-exclamation-circle mr-1"></i> {error}
                        </Badge>
                        <div className="mt-2">
                          <Button 
                            color="primary" 
                            size="sm" 
                            onClick={() => {setError(null); refreshReports();}}
                          >
                            <FaSyncAlt className="mr-1" /> Retry
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Render the appropriate chart based on report type
              switch(reportType) {
                case 'topSellingItems':
                  return <Pie data={chartData} options={chartOptions} />;
                case 'daily':
                  return <Bar data={chartData} options={chartOptions} />;
                case 'monthly':
                case 'revenueTrends':
                  return <Line data={chartData} options={chartOptions} />;
                default:
                  return <Bar data={chartData} options={chartOptions} />;
              }
            } catch (error) {
              console.error('OrderReportsWidget: Error rendering chart:', error);
              return (
                <div className="text-center py-5 text-danger">
                  <i className="fas fa-exclamation-triangle fa-3x mb-3"></i>
                  <p>Error rendering chart. Please try refreshing.</p>
                </div>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
};

export default OrderReportsWidget;