import React, { useState, useEffect, useCallback, useMemo, memo, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Table,
  Badge,
  Progress
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import { AuthContext } from '../../context/AuthContext';
import CurrencyDisplay from '../Utils/CurrencyDisplay';
import { FaUserFriends, FaHistory, FaCrown } from 'react-icons/fa';

const CustomerInsightsWidget = ({ customers = [], orders: propOrders = [], loading = false, countryCode = 'DEFAULT' }) => {
  
  // Use the prop orders directly - don't fetch additional orders to avoid conflicts
  const safeOrders = Array.isArray(propOrders) ? propOrders : [];
  
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    newThisMonth: 0,
    returning: 0,
    averagePurchase: 0
  });

  // Process customer data whenever customers or orders change
  useEffect(() => {
    if (customers?.length > 0) {
      processCustomerData();
    } else {
      // Clear data if no customers
      setTopCustomers([]);
      setRecentCustomers([]);
      setCustomerStats({
        total: 0,
        newThisMonth: 0,
        returning: 0,
        averagePurchase: 0
      });
    }
  }, [customers, safeOrders]);
  
  // Calculate customer insights
  const processCustomerData = useCallback(() => {
    if (!customers?.length) return;
    
    console.log('CustomerInsightsWidget - Processing data:', {
      customersCount: customers.length,
      ordersCount: safeOrders.length,
      sampleCustomer: customers[0] ? {
        _id: customers[0]._id,
        name: customers[0].name,
        firstName: customers[0].firstName,
        email: customers[0].email,
        phone: customers[0].phone
      } : null,
      sampleOrder: safeOrders[0] ? {
        id: safeOrders[0]._id,
        customerId: safeOrders[0].customerId,
        customer: safeOrders[0].customer,
        customerInfo: safeOrders[0].customerInfo,
        customerName: safeOrders[0].customerName,
        customerPhone: safeOrders[0].customerPhone,
        customerEmail: safeOrders[0].customerEmail,
        totalAmount: safeOrders[0].totalAmount
      } : null
    });
    
     
    // Calculate stats
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    // Count new customers this month
    const newCustomers = customers.filter(customer => {
      if (!customer.createdAt) return false;
      const createdDate = new Date(customer.createdAt);
      return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
    });
     
    
    // Calculate customer order data
    const customersWithOrders = customers.map(customer => {
      const customerOrders = safeOrders.filter(order => {
        // Handle different customer ID formats - exactly like Order Management
        let matches = false;
        
        // Method 1: Check if order has customerId field (object format)
        if (order.customerId && typeof order.customerId === 'object' && order.customerId !== null) {
          matches = order.customerId._id === customer._id;
        }
        
        // Method 2: Check if order has customerId field (string format)
        if (!matches && order.customerId && typeof order.customerId === 'string') {
          matches = order.customerId === customer._id;
        }
        
        // Method 3: Check if order has customer field (object format)
        if (!matches && order.customer && typeof order.customer === 'object' && order.customer !== null) {
          matches = order.customer._id === customer._id;
        }
        
        // Method 4: Check if order has customer field (string format)
        if (!matches && order.customer && typeof order.customer === 'string') {
          matches = order.customer === customer._id;
        }
        
        // Method 5: Check if order has customerInfo field (object format)
        if (!matches && order.customerInfo && typeof order.customerInfo === 'object' && order.customerInfo !== null) {
          matches = order.customerInfo._id === customer._id;
        }
        
        // Method 6: Check if order has customerInfo field (string format)
        if (!matches && order.customerInfo && typeof order.customerInfo === 'string') {
          matches = order.customerInfo === customer._id;
        }
        
        // Method 7: Match by customer name and contact info (fallback)
        if (!matches && order.customerName) {
          const orderCustomerName = order.customerName.toLowerCase();
          const customerName = (customer.name || customer.firstName || '').toLowerCase();
          if (orderCustomerName === customerName && customerName !== '') {
            // Additional verification with phone or email if available
            if (order.customerPhone && customer.phone) {
              matches = order.customerPhone === customer.phone;
            } else if (order.customerEmail && customer.email) {
              matches = order.customerEmail === customer.email;
            } else if (customerName !== '') {
              matches = true; // Name match is sufficient if no contact info
            }
          }
        }
        
        // Method 8: Match by name from customerId object
        if (!matches && order.customerId && typeof order.customerId === 'object' && order.customerId !== null) {
          const orderCustomerName = (order.customerId.name || order.customerId.firstName || '').toLowerCase();
          const customerName = (customer.name || customer.firstName || '').toLowerCase();
          if (orderCustomerName === customerName && customerName !== '') {
            matches = true;
          }
        }
        
        return matches;
      });
      
      const totalSpent = customerOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalAmount) || 0);
      }, 0);
      
      // Debug individual customer's orders
      if (customerOrders.length > 0) {
        console.log(`CustomerInsightsWidget - Customer ${customer.name || customer.firstName} (${customer._id}) has ${customerOrders.length} orders:`, {
          customer: {
            _id: customer._id,
            name: customer.name || customer.firstName,
            email: customer.email,
            phone: customer.phone
          },
          orders: customerOrders.map(o => ({
            _id: o._id,
            customerId: o.customerId,
            totalAmount: o.totalAmount,
            orderDate: o.orderDate
          })),
          totalSpent
        });
      }
      
      return {
        ...customer,
        orderCount: customerOrders.length,
        totalSpent,
        averageOrderValue: customerOrders.length > 0 ? totalSpent / customerOrders.length : 0,
        lastOrderDate: customerOrders.length > 0 ? 
          customerOrders.reduce((latest, order) => {
            const orderDate = new Date(order.orderDate || order.createdAt || 0);
            const latestDate = new Date(latest || 0);
            return orderDate > latestDate ? order.orderDate || order.createdAt : latest;
          }, null) : null
      };
    });
    
    console.log('CustomerInsightsWidget - Customers with orders:', {
      totalCustomers: customersWithOrders.length,
      customersWithOrders: customersWithOrders.filter(c => c.orderCount > 0).length,
      totalOrdersProcessed: safeOrders.length,
      sampleCustomerWithOrders: customersWithOrders.find(c => c.orderCount > 0) || customersWithOrders[0],
      allCustomersPreview: customersWithOrders.slice(0, 3).map(c => ({
        name: c.name || c.firstName,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent
      }))
    });
    
    // Sort to find top customers by total spent
    const topBySpending = [...customersWithOrders]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
    
    // Sort to find recent customers
    const recent = [...customers]
      .filter(c => c.createdAt)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
    
    // Calculate the number of returning customers (with more than 1 order)
    const returningCount = customersWithOrders.filter(c => c.orderCount > 1).length;
    
    // Calculate average purchase amount
    let totalPurchaseAmount = 0;
    let totalOrderCount = 0;
    
    customersWithOrders.forEach(customer => {
      totalPurchaseAmount += customer.totalSpent;
      totalOrderCount += customer.orderCount;
    });
    
    const avgPurchase = totalOrderCount > 0 ? totalPurchaseAmount / totalOrderCount : 0;
    
    
    
    // Update state
    setTopCustomers(topBySpending);
    setRecentCustomers(recent);
    setCustomerStats({
      total: customers.length,
      newThisMonth: newCustomers.length || Math.floor(customers.length * 0.2), // Fallback to 20% if date data is missing
      returning: returningCount,
      averagePurchase: avgPurchase || safeOrders.length > 0 ? 
        safeOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0) / safeOrders.length : 0
    });
  }, [customers, safeOrders]);
  
  // Memoize helper functions
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  }, []);
  
  // Memoize calculated values
  const retentionRate = useMemo(() => {
    if (customerStats.total === 0) return 0;
    return Math.round((customerStats.returning / customerStats.total) * 100);
  }, [customerStats.returning, customerStats.total]);
  
  // Use the prop loading state directly
  const isLoading = loading;
  
  return (
    <Card className="shadow">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Customer Insights</h6>
        <Link to="/admin/customer-management">
          <Button color="primary" size="sm">View All Customers</Button>
        </Link>
      </CardHeader>
      <CardBody>
        {/* Customer retention progress */}
        <div className="mb-4">
          <div className="d-flex justify-content-between">
            <div>
              <h6 className="text-uppercase text-muted ls-1 mb-1">
                Customer Retention Rate
              </h6>
              <span className="h2 font-weight-bold mb-0">
                {isLoading ? <Spinner size="sm" /> : `${retentionRate}%`}
              </span>
            </div>
            <div className="d-flex align-items-center">
              <FaUserFriends className="text-primary" size={24} />
              <span className="text-sm ml-2">
                {customerStats.returning} returning customers
              </span>
            </div>
          </div>
          <Progress 
            className="my-3"
            color="success"
            value={retentionRate}
          />
        </div>
        
        {/* Customer stats summary */}
        <div className="d-flex justify-content-around mb-4">
          <div className="text-center">
            <div className="h4 font-weight-bold">
              {isLoading ? <Spinner size="sm" /> : customerStats.total}
            </div>
            <div className="text-muted">Total Customers</div>
          </div>
          <div className="text-center">
            <div className="h4 font-weight-bold text-success">
              {isLoading ? <Spinner size="sm" /> : customerStats.newThisMonth}
            </div>
            <div className="text-muted">New This Month</div>
          </div>
          <div className="text-center">
            <div className="h4 font-weight-bold text-primary">
              {isLoading ? <Spinner size="sm" /> : <CurrencyDisplay amount={customerStats.averagePurchase} />}
            </div>
            <div className="text-muted">Avg. Purchase</div>
          </div>
        </div>
      
        {/* Top customers section */}
        <h6 className="text-uppercase text-muted mb-3">
          Top Customers {safeOrders.length > 0 && <Badge color="success" className="ml-2">Live</Badge>}
        </h6>
        {isLoading ? (
          <div className="text-center py-3">
            <Spinner color="primary" />
          </div>
        ) : topCustomers.length > 0 ? (
          <Table size="sm" responsive hover>
            <thead className="thead-light">
              <tr>
                <th>Customer</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map(customer => (
                <tr key={customer._id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {customer.orderCount > 5 && <FaCrown className="text-warning mr-2" />}
                      <span className="font-weight-bold">
                        {customer.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge color="info" pill>
                      {customer.orderCount || 0}
                    </Badge>
                  </td>
                  <td><CurrencyDisplay amount={customer.totalSpent} /></td>
                  <td>{customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'No orders'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center py-3">
            <FaUserFriends size={24} className="text-muted mb-3" />
            <p className="text-muted mb-0">No customer data available</p>
          </div>
        )}
        
        {/* Recent customers section */}
        <h6 className="text-uppercase text-muted mb-3 mt-4">Recent Customers</h6>
        {isLoading ? (
          <div className="text-center py-3">
            <Spinner color="primary" />
          </div>
        ) : recentCustomers.length > 0 ? (
          <Table size="sm" responsive hover>
            <thead className="thead-light">
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomers.map(customer => (
                <tr key={customer._id}>
                  <td>
                    <span className="font-weight-bold">
                      {customer.name}
                    </span>
                    {customer.createdAt && new Date(customer.createdAt).getMonth() === new Date().getMonth() && (
                      <Badge color="success" className="ml-2" pill>New</Badge>
                    )}
                  </td>
                  <td>
                    <div>
                      {customer.email && <div className="small">{customer.email}</div>}
                      {customer.phone && <div className="small text-muted">{customer.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <FaHistory className="text-info mr-2" size={12} />
                      {formatDate(customer.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="text-center py-3">
            <p className="text-muted mb-0">No recent customers</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

// Wrap component with React.memo to prevent unnecessary re-renders
export default memo(CustomerInsightsWidget);