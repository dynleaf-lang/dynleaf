import React, { useState, useEffect, useContext, useMemo } from "react";
// node.js library that concatenates classes (strings)
import classnames from "classnames";
// javascipt plugin for creating charts
import Chart from "chart.js";
// react plugin used to create charts
import { Line, Bar } from "react-chartjs-2";
// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  NavItem,
  NavLink,
  Nav,
  Progress,
  Table,
  Container,
  Row,
  Col,
  Spinner
} from "reactstrap";

// core components
import {
  chartOptions,
  parseOptions,
  chartExample1,
  chartExample2,
} from "variables/charts.js";

import Header from "components/Headers/Header.js";
import WidgetsContainer from "components/Widgets/WidgetsContainer.js";
import StableDataProvider from "components/Widgets/StableDataProvider.js";
import { AuthContext } from "../context/AuthContext";
import { OrderContext } from "../context/OrderContext";
import { BranchContext } from "../context/BranchContext"; 

const Index = (props) => {
  const [activeNav, setActiveNav] = useState(1);
  const [chartExample1Data, setChartExample1Data] = useState("data1");
  const [loading, setLoading] = useState(true);

  // Get user context for branch information
  const { user } = useContext(AuthContext);
  
  // Get order context to fetch order data
  const { orders, getAllOrders, loading: ordersLoading } = useContext(OrderContext);
  
  // Get branch context for branch details
  const { branches, fetchBranchById } = useContext(BranchContext);
  
  // State for branch-specific data
  const [branchOrders, setBranchOrders] = useState([]);
  const [branchName, setBranchName] = useState('');
  
  // State for chart data
  const [salesChartData, setSalesChartData] = useState(null);
  const [ordersChartData, setOrdersChartData] = useState(null);
  
  // Fetch orders when component mounts
  useEffect(() => {
    const fetchOrderData = async () => {
      // Don't set loading to true if we're already fetched branchOrders
      if (branchOrders.length > 0) return;
      
      setLoading(true);
      
      const filters = {};
      
      // Apply filters based on user's role and assignments
      if (user?.role !== 'Super_Admin') {
        if (user?.branchId) {
          filters.branchId = user.branchId;
          // Fetch branch info to display the name
          try {
            const branchData = await fetchBranchById(user.branchId);
            if (branchData && branchData.name) {
              setBranchName(branchData.name);
            }
          } catch (error) {
            console.error("Error fetching branch details:", error);
          }
        } else if (user?.restaurantId) {
          filters.restaurantId = user.restaurantId;
        }
      }
      
      try {
        // Add a timestamp parameter to avoid caching issues
        filters.timestamp = new Date().getTime();
        const result = await getAllOrders(filters);
        if (result?.success && Array.isArray(result.orders)) {
          setBranchOrders(result.orders);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchOrderData();
    }
    
    // Add cleanup to prevent memory leaks
    return () => {
      // Any cleanup code if needed
    };
  }, [user?.branchId, user?.restaurantId, user?.role]); // Only re-fetch when these specific user properties change
  
  // Process orders data to generate chart data
  useEffect(() => {
    if (!branchOrders || branchOrders.length === 0) {
      // If no orders data, use default chart data
      setSalesChartData(chartExample1[chartExample1Data]);
      setOrdersChartData(chartExample2.data);
      return;
    }

    // Process data for sales chart (Line chart)
    const processDataForSalesChart = () => {
      // Group orders by date for month/week view
      const now = new Date();
      const monthData = {};
      const weekData = {};
      
      // Get current month and create date ranges
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Create date keys for the current month
      for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${currentMonth + 1}/${i}`; // Format: MM/DD
        monthData[dateKey] = 0;
      }
      
      // Create date keys for the current week (last 7 days)
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = `${date.getMonth() + 1}/${date.getDate()}`; // Format: MM/DD
        weekData[dateKey] = 0;
      }
      
      // Aggregate sales by day
      branchOrders.forEach(order => {
        if (!order.orderDate) return;
        
        const orderDate = new Date(order.orderDate);
        const dateKey = `${orderDate.getMonth() + 1}/${orderDate.getDate()}`;
        
        // Only include orders from current month
        if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
          if (dateKey in monthData) {
            monthData[dateKey] += parseFloat(order.totalAmount) || 0;
          }
        }
        
        // Check if the order is within the last 7 days
        const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 6 && daysDiff >= 0) {
          if (dateKey in weekData) {
            weekData[dateKey] += parseFloat(order.totalAmount) || 0;
          }
        }
      });
      
      // Create chart datasets
      const monthChartData = {
        labels: Object.keys(monthData),
        datasets: [
          {
            label: "Sales",
            data: Object.values(monthData),
            ...chartExample1.data1.datasets[0]
          }
        ]
      };
      
      const weekChartData = {
        labels: Object.keys(weekData),
        datasets: [
          {
            label: "Sales",
            data: Object.values(weekData),
            ...chartExample1.data1.datasets[0]
          }
        ]
      };
      
      return { 
        data1: monthChartData,
        data2: weekChartData,
        options: chartExample1.options
      };
    };
    
    // Process data for orders chart (Bar chart)
    const processDataForOrdersChart = () => {
      // Count orders by type
      const orderTypeCount = {
        'Dine-In': 0,
        'Takeout': 0,
        'Delivery': 0
      };
      
      branchOrders.forEach(order => {
        if (order.OrderType && orderTypeCount.hasOwnProperty(order.OrderType)) {
          orderTypeCount[order.OrderType]++;
        }
      });
      
      // Create chart data
      return {
        labels: Object.keys(orderTypeCount),
        datasets: [
          {
            label: "Orders",
            data: Object.values(orderTypeCount),
            backgroundColor: ["#FB6340", "#11CDEF", "#2DCE89"]
          }
        ],
        options: chartExample2.options
      };
    };
    
    // Update chart data with real data
    setSalesChartData(processDataForSalesChart());
    setOrdersChartData(processDataForOrdersChart());
  }, [branchOrders, chartExample1Data]); 

  // Memoize the chart data processing to prevent unnecessary recalculations
  const salesChartMemoized = useMemo(() => {
    // Initialize with empty datasets
    const emptyDataset = {
      data1: {
        labels: [],
        datasets: [{
          label: "Sales",
          data: [],
          // Use a safe approach to copy styling properties
          backgroundColor: "rgba(94, 114, 228, 0.2)",
          borderColor: "#5e72e4",
          pointBackgroundColor: "#5e72e4",
          tension: 0.4,
          borderWidth: 4
        }]
      },
      data2: {
        labels: [],
        datasets: [{
          label: "Sales",
          data: [],
          // Use a safe approach to copy styling properties
          backgroundColor: "rgba(94, 114, 228, 0.2)",
          borderColor: "#5e72e4",
          pointBackgroundColor: "#5e72e4",
          tension: 0.4,
          borderWidth: 4
        }]
      },
      options: chartExample1.options
    };
    
    // If no orders data, return empty structure instead of dummy data
    if (!branchOrders || branchOrders.length === 0) {
      return emptyDataset;
    }

    // Group orders by date for month/week view
    const now = new Date();
    const monthData = {};
    const weekData = {};
    
    // Get current month and create date ranges
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Create date keys for the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${currentMonth + 1}/${i}`; // Format: MM/DD
      monthData[dateKey] = 0;
    }
    
    // Create date keys for the current week (last 7 days)
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `${date.getMonth() + 1}/${date.getDate()}`; // Format: MM/DD
      weekData[dateKey] = 0;
    }
    
    // Aggregate sales by day
    branchOrders.forEach(order => {
      if (!order.orderDate) return;
      
      const orderDate = new Date(order.orderDate);
      const dateKey = `${orderDate.getMonth() + 1}/${orderDate.getDate()}`;
      
      // Only include orders from current month
      if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        if (dateKey in monthData) {
          monthData[dateKey] += parseFloat(order.totalAmount) || 0;
        }
      }
      
      // Check if the order is within the last 7 days
      const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 6 && daysDiff >= 0) {
        if (dateKey in weekData) {
          weekData[dateKey] += parseFloat(order.totalAmount) || 0;
        }
      }
    });
    
    // Get sample styling from the chartExample1
    const sampleData1 = chartExample1.data1();
    const sampleDataset = sampleData1.datasets[0] || {};
    
    // Create chart datasets
    const monthChartData = {
      labels: Object.keys(monthData),
      datasets: [
        {
          label: "Sales",
          data: Object.values(monthData),
          // Copy styling properties individually to avoid undefined reference issues
          backgroundColor: sampleDataset.backgroundColor || "rgba(94, 114, 228, 0.2)",
          borderColor: sampleDataset.borderColor || "#5e72e4",
          pointBackgroundColor: sampleDataset.pointBackgroundColor || "#5e72e4",
          tension: sampleDataset.tension || 0.4,
          borderWidth: sampleDataset.borderWidth || 4
        }
      ]
    };
    
    // Get sample styling for data2
    const sampleData2 = chartExample1.data2();
    const sampleDataset2 = sampleData2.datasets[0] || {};
    
    const weekChartData = {
      labels: Object.keys(weekData),
      datasets: [
        {
          label: "Sales",
          data: Object.values(weekData),
          // Copy styling properties individually to avoid undefined reference issues
          backgroundColor: sampleDataset2.backgroundColor || "rgba(94, 114, 228, 0.2)",
          borderColor: sampleDataset2.borderColor || "#5e72e4",
          pointBackgroundColor: sampleDataset2.pointBackgroundColor || "#5e72e4",
          tension: sampleDataset2.tension || 0.4,
          borderWidth: sampleDataset2.borderWidth || 4
        }
      ]
    };
    
    return { 
      data1: monthChartData,
      data2: weekChartData,
      options: chartExample1.options
    };
  }, [branchOrders]);
  
  // Memoize the orders chart data
  const ordersChartMemoized = useMemo(() => {
    // Initialize with empty datasets
    const emptyDataset = {
      labels: ["Dine-In", "Takeout", "Delivery"],
      datasets: [
        {
          label: "Orders",
          data: [0, 0, 0],
          maxBarThickness: 10,
          backgroundColor: ["#FB6340", "#11CDEF", "#2DCE89"]
        }
      ]
    };
    
    // If no orders data, return empty structure instead of dummy data
    if (!branchOrders || branchOrders.length === 0) {
      return emptyDataset;
    }
    
    // Count orders by type
    const orderTypeCount = {
      'Dine-In': 0,
      'Takeout': 0,
      'Delivery': 0
    };
    
    branchOrders.forEach(order => {
      if (order.OrderType && orderTypeCount.hasOwnProperty(order.OrderType)) {
        orderTypeCount[order.OrderType]++;
      }
    });
    
    // Get styling properties from chartExample2 if available
    let barThickness = 10;
    try {
      if (chartExample2.data && chartExample2.data.datasets && 
          chartExample2.data.datasets[0] && chartExample2.data.datasets[0].maxBarThickness) {
        barThickness = chartExample2.data.datasets[0].maxBarThickness;
      }
    } catch (e) {
      console.log("Error getting bar thickness:", e);
    }
    
    // Create chart data
    return {
      labels: Object.keys(orderTypeCount),
      datasets: [
        {
          label: "Orders",
          data: Object.values(orderTypeCount),
          maxBarThickness: barThickness,
          backgroundColor: ["#FB6340", "#11CDEF", "#2DCE89"]
        }
      ]
    };
  }, [branchOrders]);

  if (window.Chart) {
    parseOptions(Chart, chartOptions());
  }

  const toggleNavs = (e, index) => {
    e.preventDefault();
    setActiveNav(index);
    setChartExample1Data("data" + index);
  };
  
  return (
    <>
      <Header />
      {/* Page content */}
      <Container className="mt--7" fluid>
        {/* Sales and Order Charts */}
        <Row>
          <Col className="mb-5 mb-xl-0" xl="8">
            <Card className="bg-gradient-default shadow">
              <CardHeader className="bg-transparent">
                <Row className="align-items-center">
                  <div className="col">
                    <h6 className="text-uppercase text-light ls-1 mb-1">
                      Overview
                    </h6>
                    <h2 className="text-white mb-0">
                      Sales value{user?.branchId && branchName ? ` - ${branchName}` : ''}
                    </h2>
                  </div>
                  <div className="col">
                    <Nav className="justify-content-end" pills>
                      <NavItem>
                        <NavLink
                          className={classnames("py-2 px-3", {
                            active: activeNav === 1,
                          })}
                          href="#pablo"
                          onClick={(e) => toggleNavs(e, 1)}
                        >
                          <span className="d-none d-md-block">Month</span>
                          <span className="d-md-none">M</span>
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink
                          className={classnames("py-2 px-3", {
                            active: activeNav === 2,
                          })}
                          data-toggle="tab"
                          href="#pablo"
                          onClick={(e) => toggleNavs(e, 2)}
                        >
                          <span className="d-none d-md-block">Week</span>
                          <span className="d-md-none">W</span>
                        </NavLink>
                      </NavItem>
                    </Nav>
                  </div>
                </Row>
              </CardHeader>
              <CardBody>
                {/* Chart */}
                <div className="chart">
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner color="light" />
                      <p className="text-white mt-3">Loading sales data...</p>
                    </div>
                  ) : (
                    <Line
                      data={salesChartMemoized[chartExample1Data]}
                      options={salesChartMemoized.options}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col xl="4">
            <Card className="shadow">
              <CardHeader className="bg-transparent">
                <Row className="align-items-center">
                  <div className="col">
                    <h6 className="text-uppercase text-muted ls-1 mb-1">
                      Performance
                    </h6>
                    <h2 className="mb-0">Total orders{user?.branchId && branchName ? ` - ${branchName}` : ''}</h2>
                  </div>
                </Row>
              </CardHeader>
              <CardBody>
                {/* Chart */}
                <div className="chart">
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                      <p className="mt-3">Loading order data...</p>
                    </div>
                  ) : (
                    <Bar
                      data={ordersChartMemoized}
                      options={chartExample2.options}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
        
        {/* Only render widgets when data is ready and loading is complete */}
        {!loading && (
          <StableDataProvider key="stable-data-provider">
            <WidgetsContainer />
          </StableDataProvider>
        )}
      </Container>
    </>
  );
};

export default Index;
