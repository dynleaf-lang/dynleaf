import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Button,
  ButtonGroup,
  Table,
  Badge,
  Alert,
  Spinner,
  Form,
  FormGroup,
  Label,
  Input
} from 'reactstrap';
import {
  FaCalendarDay,
  FaMoneyBillWave,
  FaShoppingCart,
  FaUsers,
  FaCreditCard,
  FaMobile,
  FaDownload,
  FaPrint,
  FaChartBar,
  FaUtensils,
  FaClock,
  FaPercentage
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { useCurrency } from '../../context/CurrencyContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

const DailySummaryReport = () => {
  const { user } = useAuth();
  const { orders, refreshOrders } = useOrder();
  const { formatCurrency: formatCurrencyDynamic, getCurrencySymbol, isReady: currencyReady } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('today'); // 'today', 'yesterday', 'custom'

  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

  useEffect(() => {
    if (user?.branchId) {
      // Refresh orders first, then generate report
      refreshOrders().then(() => {
        generateReport();
      });
    }
  }, [user, selectedDate, reportType]);

  const generateReport = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (reportType === 'today') {
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
      } else if (reportType === 'yesterday') {
        const yesterday = subDays(new Date(), 1);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
      } else {
        startDate = startOfDay(new Date(selectedDate));
        endDate = endOfDay(new Date(selectedDate));
      }
 

      // Fetch orders for the selected date range
      const response = await axios.get(
        `${API_BASE_URL}/public/orders?branchId=${user.branchId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=1000&sort=-createdAt`
      );

      const dayOrders = response.data.orders || []; 
      
      // Also check orders from context for comparison
      const contextOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      }); 
      // Use the larger dataset (API or context)
      const ordersToUse = dayOrders.length >= contextOrders.length ? dayOrders : contextOrders;
      
      
      const summary = calculateSummary(ordersToUse);
      
      setReportData({
        ...summary,
        date: format(startDate, 'yyyy-MM-dd'),
        dateRange: {
          start: startDate,
          end: endDate
        },
        ordersUsed: ordersToUse.length
      });

    } catch (error) { 
      toast.error('Failed to generate daily summary report');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (dayOrders) => {
    const summary = {
      totalOrders: dayOrders.length,
      totalRevenue: 0,
      totalItems: 0,
      averageOrderValue: 0,
      paymentMethods: {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        upi: { count: 0, amount: 0 }
      },
      orderStatuses: {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      },
      paymentStatuses: {
        unpaid: 0,
        paid: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
        partial: 0
      },
      topItems: {},
      hourlyBreakdown: Array(24).fill(0).map((_, hour) => ({
        hour,
        orders: 0,
        revenue: 0
      })),
      customerTypes: {
        'dine-in': 0,
        'takeaway': 0,
        'delivery': 0
      },
      tables: {},
      operators: {}
    };

    dayOrders.forEach(order => {
      // Basic metrics
      summary.totalRevenue += order.totalAmount || 0;
      summary.totalItems += order.items?.length || 0;

      // Payment methods
      const paymentMethod = order.paymentMethod || 'cash';
      if (summary.paymentMethods[paymentMethod]) {
        summary.paymentMethods[paymentMethod].count++;
        summary.paymentMethods[paymentMethod].amount += order.totalAmount || 0;
      }

      // Order statuses
      const status = order.status || 'pending';
      if (summary.orderStatuses[status] !== undefined) {
        summary.orderStatuses[status]++;
      }

      // Payment statuses
      const paymentStatus = order.paymentStatus || 'unpaid';
      if (summary.paymentStatuses[paymentStatus] !== undefined) {
        summary.paymentStatuses[paymentStatus]++;
      }

      // Top items
      order.items?.forEach(item => {
        const itemName = item.name;
        if (!summary.topItems[itemName]) {
          summary.topItems[itemName] = {
            name: itemName,
            quantity: 0,
            revenue: 0
          };
        }
        summary.topItems[itemName].quantity += item.quantity || 1;
        summary.topItems[itemName].revenue += (item.price * item.quantity) || 0;
      });

      // Hourly breakdown
      const orderHour = new Date(order.createdAt).getHours();
      if (orderHour >= 0 && orderHour < 24) {
        summary.hourlyBreakdown[orderHour].orders++;
        summary.hourlyBreakdown[orderHour].revenue += order.totalAmount || 0;
      }

      // Customer types
      const orderType = order.customerInfo?.orderType || 'dine-in';
      if (summary.customerTypes[orderType] !== undefined) {
        summary.customerTypes[orderType]++;
      }

      // Tables
      if (order.tableName) {
        if (!summary.tables[order.tableName]) {
          summary.tables[order.tableName] = { orders: 0, revenue: 0 };
        }
        summary.tables[order.tableName].orders++;
        summary.tables[order.tableName].revenue += order.totalAmount || 0;
      }

      // Operators
      if (order.createdByName) {
        if (!summary.operators[order.createdByName]) {
          summary.operators[order.createdByName] = { orders: 0, revenue: 0 };
        }
        summary.operators[order.createdByName].orders++;
        summary.operators[order.createdByName].revenue += order.totalAmount || 0;
      }
    });

    // Calculate average order value
    summary.averageOrderValue = summary.totalOrders > 0 
      ? summary.totalRevenue / summary.totalOrders 
      : 0;

    // Convert top items to sorted array
    summary.topItemsArray = Object.values(summary.topItems)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Convert tables to sorted array
    summary.topTablesArray = Object.entries(summary.tables)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Convert operators to sorted array
    summary.operatorsArray = Object.entries(summary.operators)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    return summary;
  };

  const formatCurrency = (amount) => {
    // Use dynamic currency formatting based on branch country
    if (currencyReady && formatCurrencyDynamic) {
      return formatCurrencyDynamic(amount, { minimumFractionDigits: 0 });
    }
    // Fallback to USD if currency context not ready
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      preparing: 'primary',
      ready: 'success',
      delivered: 'success',
      cancelled: 'danger',
      paid: 'success',
      unpaid: 'danger',
      partial: 'warning'
    };
    return colors[status] || 'secondary';
  };

  const handleDateTypeChange = (type) => {
    setReportType(type);
    if (type === 'today') {
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (type === 'yesterday') {
      setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    }
  };

  const handlePrintReport = () => {
    window.print();
    toast.success('Report sent to printer');
  };

  const handleDownloadReport = () => {
    if (!reportData) return;

    const reportContent = generateReportHTML();
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-summary-${reportData.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Report downloaded');
  };

  const generateReportHTML = () => {
    if (!reportData) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Summary Report - ${reportData.date}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary-cards { display: flex; justify-content: space-around; margin: 20px 0; }
          .card { border: 1px solid #ddd; padding: 15px; margin: 10px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Summary Report</h1>
          <h2>${format(new Date(reportData.date), 'MMMM dd, yyyy')}</h2>
          <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
        </div>
        
        <div class="summary-cards">
          <div class="card">
            <h3>Total Orders</h3>
            <h2>${reportData.totalOrders}</h2>
          </div>
          <div class="card">
            <h3>Total Revenue</h3>
            <h2>${formatCurrency(reportData.totalRevenue)}</h2>
          </div>
          <div class="card">
            <h3>Average Order Value</h3>
            <h2>${formatCurrency(reportData.averageOrderValue)}</h2>
          </div>
        </div>

        <h3>Top Items</h3>
        <table>
          <tr><th>Item</th><th>Quantity Sold</th><th>Revenue</th></tr>
          ${reportData.topItemsArray.map(item => 
            `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${formatCurrency(item.revenue)}</td></tr>`
          ).join('')}
        </table>

        <h3>Payment Methods</h3>
        <table>
          <tr><th>Method</th><th>Orders</th><th>Amount</th></tr>
          ${Object.entries(reportData.paymentMethods).map(([method, data]) => 
            `<tr><td>${method.toUpperCase()}</td><td>${data.count}</td><td>${formatCurrency(data.amount)}</td></tr>`
          ).join('')}
        </table>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        <div className="mt-3">
          <h5>Generating Report...</h5>
          <p className="text-muted">Please wait while we compile the data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-summary-report">
      {/* Report Header */}
      <Card className="mb-4">
        <CardHeader>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <FaCalendarDay className="me-2" />
              Daily Summary Report
            </div>
            <div>
              <Button color="info" size="sm" onClick={handlePrintReport} className="me-2">
                <FaPrint className="me-1" />
                Print
              </Button>
              <Button color="success" size="sm" onClick={handleDownloadReport}>
                <FaDownload className="me-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {/* Date Selection */}
          <Row className="mb-3">
            <Col md={6}>
              <ButtonGroup>
                <Button
                  color={reportType === 'today' ? 'primary' : 'outline-primary'}
                  onClick={() => handleDateTypeChange('today')}
                >
                  Today
                </Button>
                <Button
                  color={reportType === 'yesterday' ? 'primary' : 'outline-primary'}
                  onClick={() => handleDateTypeChange('yesterday')}
                >
                  Yesterday
                </Button>
                <Button
                  color={reportType === 'custom' ? 'primary' : 'outline-primary'}
                  onClick={() => handleDateTypeChange('custom')}
                >
                  Custom Date
                </Button>
              </ButtonGroup>
            </Col>
            {reportType === 'custom' && (
              <Col md={6}>
                <Form inline>
                  <FormGroup>
                    <Label for="dateSelect" className="me-2">Select Date:</Label>
                    <Input
                      type="date"
                      id="dateSelect"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </FormGroup>
                </Form>
              </Col>
            )}
          </Row>

          {reportData && (
            <Alert color="info" fade={false}>
              <strong>Report Date:</strong> {format(new Date(reportData.date), 'MMMM dd, yyyy')} | 
              <strong className="ms-2">Generated:</strong> {format(new Date(), 'HH:mm:ss')}
            </Alert>
          )}
        </CardBody>
      </Card>

      {reportData && (
        <>
          {/* Summary Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center summary-card">
                <CardBody>
                  <FaShoppingCart size={30} className="text-primary mb-2" />
                  <h3 className="mb-0">{reportData.totalOrders}</h3>
                  <small className="text-muted">Total Orders</small>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center summary-card">
                <CardBody>
                  <FaMoneyBillWave size={30} className="text-success mb-2" />
                  <h3 className="mb-0">{formatCurrency(reportData.totalRevenue)}</h3>
                  <small className="text-muted">Total Revenue</small>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center summary-card">
                <CardBody>
                  <FaUtensils size={30} className="text-info mb-2" />
                  <h3 className="mb-0">{reportData.totalItems}</h3>
                  <small className="text-muted">Items Sold</small>
                </CardBody>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center summary-card">
                <CardBody>
                  <FaChartBar size={30} className="text-warning mb-2" />
                  <h3 className="mb-0">{formatCurrency(reportData.averageOrderValue)}</h3>
                  <small className="text-muted">Avg Order Value</small>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Payment Methods & Order Status */}
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <CardHeader>
                  <FaCreditCard className="me-2" />
                  Payment Methods
                </CardHeader>
                <CardBody>
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Orders</th>
                        <th>Amount</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.paymentMethods).map(([method, data]) => (
                        <tr key={method}>
                          <td>
                            {method === 'cash' && <FaMoneyBillWave className="me-1" />}
                            {method === 'card' && <FaCreditCard className="me-1" />}
                            {method === 'upi' && <FaMobile className="me-1" />}
                            {method.toUpperCase()}
                          </td>
                          <td>{data.count}</td>
                          <td>{formatCurrency(data.amount)}</td>
                          <td>
                            {reportData.totalRevenue > 0 
                              ? ((data.amount / reportData.totalRevenue) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <CardHeader>
                  <FaClock className="me-2" />
                  Order Status
                </CardHeader>
                <CardBody>
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.orderStatuses).map(([status, count]) => (
                        count > 0 && (
                          <tr key={status}>
                            <td>
                              <Badge color={getStatusBadgeColor(status)}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
                            </td>
                            <td>{count}</td>
                            <td>
                              {reportData.totalOrders > 0 
                                ? ((count / reportData.totalOrders) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Top Items */}
          <Row className="mb-4">
            <Col md={12}>
              <Card>
                <CardHeader>
                  <FaUtensils className="me-2" />
                  Top Selling Items
                </CardHeader>
                <CardBody>
                  {reportData.topItemsArray.length > 0 ? (
                    <Table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Name</th>
                          <th>Quantity Sold</th>
                          <th>Revenue</th>
                          <th>% of Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topItemsArray.map((item, index) => (
                          <tr key={item.name}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.revenue)}</td>
                            <td>
                              {reportData.totalRevenue > 0 
                                ? ((item.revenue / reportData.totalRevenue) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert color="info" fade={false}>
                      No items sold for the selected date.
                    </Alert>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Customer Types & Top Tables */}
          <Row className="mb-4">
            <Col md={6}>
              <Card>
                <CardHeader>
                  <FaUsers className="me-2" />
                  Customer Types
                </CardHeader>
                <CardBody>
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Orders</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.customerTypes).map(([type, count]) => (
                        <tr key={type}>
                          <td>{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                          <td>{count}</td>
                          <td>
                            {reportData.totalOrders > 0 
                              ? ((count / reportData.totalOrders) * 100).toFixed(1)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <CardHeader>
                  <FaUtensils className="me-2" />
                  Top Tables by Revenue
                </CardHeader>
                <CardBody>
                  {reportData.topTablesArray.length > 0 ? (
                    <Table size="sm">
                      <thead>
                        <tr>
                          <th>Table</th>
                          <th>Orders</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topTablesArray.map((table) => (
                          <tr key={table.name}>
                            <td>{table.name}</td>
                            <td>{table.orders}</td>
                            <td>{formatCurrency(table.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <Alert color="info" fade={false}>
                      No table data available.
                    </Alert>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* POS Operators Performance */}
          {reportData.operatorsArray.length > 0 && (
            <Row className="mb-4">
              <Col md={12}>
                <Card>
                  <CardHeader>
                    <FaUsers className="me-2" />
                    POS Operator Performance
                  </CardHeader>
                  <CardBody>
                    <Table>
                      <thead>
                        <tr>
                          <th>Operator</th>
                          <th>Orders Processed</th>
                          <th>Revenue Generated</th>
                          <th>Avg Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.operatorsArray.map((operator) => (
                          <tr key={operator.name}>
                            <td>{operator.name}</td>
                            <td>{operator.orders}</td>
                            <td>{formatCurrency(operator.revenue)}</td>
                            <td>
                              {formatCurrency(
                                operator.orders > 0 ? operator.revenue / operator.orders : 0
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}

      {!reportData && !loading && (
        <Alert color="warning" fade={false}>
          <h5>No Data Available</h5>
          <p>No orders found for the selected date. Please try a different date or check if there are any orders in the system.</p>
        </Alert>
      )}
    </div>
  );
};

export default DailySummaryReport;
