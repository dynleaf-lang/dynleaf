import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Button,
  Spinner,
  Table
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { FaBuilding, FaStore, FaMapMarkerAlt, FaUtensils } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import useRenderTracker from '../../utils/useRenderTracker';
import { useOrder } from '../../context/OrderContext';
import { AuthContext } from '../../context/AuthContext';

// Change to receive data as props and fetch fresh orders directly
const RestaurantStatsWidget = React.memo(({ restaurants, branches, orders: propOrders, userRole, loading }) => {
  useRenderTracker('RestaurantStatsWidget');
  
  // Get fresh order data using the same pattern as OrderReports
  const { user } = useContext(AuthContext);
  const { 
    orders: rawOrders,
    getAllOrders,
    loading: ordersLoading 
  } = useOrder();
  
  // Ensure orders is always an array to prevent errors
  const freshOrders = Array.isArray(rawOrders) ? rawOrders : [];
  
  // State for tracking fresh data fetch
  const [freshDataFetched, setFreshDataFetched] = useState(false);
  
  // Fetch fresh orders data on component mount
  useEffect(() => {
    const fetchFreshOrders = async () => {
      if (user && !freshDataFetched) {
        try {
          const filters = {};
          
          // Apply filters based on user role (same logic as OrderReports)
          if (user.role !== 'Super_Admin') {
            if (user.restaurantId) filters.restaurantId = user.restaurantId;
            if (user.branchId) filters.branchId = user.branchId;
          }
          
          console.log('RestaurantStatsWidget: Fetching fresh orders with filters:', filters);
          
          const result = await getAllOrders(filters, true); // Force refresh
          
          if (result.success) {
            console.log('RestaurantStatsWidget: Fresh orders fetched successfully:', result.orders?.length || freshOrders.length, 'orders');
            setFreshDataFetched(true);
          } else {
            console.error('RestaurantStatsWidget: Error fetching fresh orders:', result.message);
          }
        } catch (error) {
          console.error('RestaurantStatsWidget: Error fetching fresh orders:', error);
        }
      }
    };
    
    fetchFreshOrders();
  }, [user, freshDataFetched, getAllOrders]);
  
  // Use fresh orders for calculations, fallback to prop orders if fresh data not available yet
  const ordersToUse = freshDataFetched ? freshOrders : (propOrders || []);
  
  // Debug logging to track data flow
  useEffect(() => {
    console.log('RestaurantStatsWidget received:', {
      restaurantsCount: restaurants?.length || 0,
      branchesCount: branches?.length || 0,
      propOrdersCount: propOrders?.length || 0,
      freshOrdersCount: freshOrders?.length || 0,
      ordersToUseCount: ordersToUse?.length || 0,
      freshDataFetched,
      userRole,
      loading: loading || ordersLoading
    });
  }, [restaurants, branches, propOrders, freshOrders, ordersToUse, freshDataFetched, userRole, loading, ordersLoading]);
  
  // Use useMemo to calculate derived data with fresh orders
  const processedData = useMemo(() => {
    if (!restaurants || restaurants.length === 0) {
      return { restaurantStats: [], topRestaurants: [], averageBranchesPerRestaurant: 0 };
    }
    
    // Process restaurant data to identify "top" restaurants using fresh orders
    const restaurantBranchCount = restaurants.map(restaurant => {
      const relatedBranches = branches?.filter(branch => 
        branch.restaurantId === restaurant._id || 
        (typeof branch.restaurantId === 'object' && branch.restaurantId?._id === restaurant._id)
      ) || [];
      
      const relatedOrders = ordersToUse?.filter(order => 
        order.restaurantId === restaurant._id ||
        (typeof order.restaurantId === 'object' && order.restaurantId?._id === restaurant._id)
      ) || [];
      
      return {
        ...restaurant,
        branchCount: relatedBranches.length,
        orderCount: relatedOrders.length,
        revenue: relatedOrders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0)
      };
    });
    
    // Sort by order count for real business metrics
    const sorted = [...restaurantBranchCount].sort((a, b) => b.orderCount - a.orderCount);
    const top5 = sorted.slice(0, 5); // Top 5 restaurants
    
    // Calculate average branches per restaurant
    const totalBranches = branches?.length || 0;
    const totalRestaurants = restaurants.length;
    const averageBranchesPerRestaurant = totalRestaurants > 0 
      ? (totalBranches / totalRestaurants).toFixed(1) 
      : 0;
    
    return {
      restaurantStats: restaurantBranchCount,
      topRestaurants: top5,
      averageBranchesPerRestaurant
    };
  }, [restaurants, branches, ordersToUse]);
  
  // Generate chart data based on actual order data using fresh orders
  const chartData = useMemo(() => {
    // If no data, return empty structure
    if (!branches || branches.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Orders',
            data: [],
            backgroundColor: 'rgba(66, 133, 244, 0.6)',
          },
          {
            label: 'Revenue ($)',
            data: [],
            backgroundColor: 'rgba(52, 168, 83, 0.6)',
          }
        ]
      };
    }
    
    // Get top 5 branches by order count using fresh orders
    const branchData = branches.map(branch => {
      const branchOrders = ordersToUse?.filter(order => 
        order.branchId === branch._id ||
        (typeof order.branchId === 'object' && order.branchId?._id === branch._id)
      ) || [];
      
      const revenue = branchOrders.reduce((sum, order) => 
        sum + (parseFloat(order.totalAmount) || 0), 0);
      
      return {
        ...branch,
        orderCount: branchOrders.length,
        revenue
      };
    });
    
    // Sort branches by order count and take top 5
    const topBranches = [...branchData]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);
    
    return {
      labels: topBranches.map(branch => branch.name || 'Unnamed Branch'),
      datasets: [
        {
          label: 'Orders',
          data: topBranches.map(branch => branch.orderCount),
          backgroundColor: 'rgba(66, 133, 244, 0.6)',
        },
        {
          label: 'Revenue ($)',
          data: topBranches.map(branch => Math.round(branch.revenue)),
          backgroundColor: 'rgba(52, 168, 83, 0.6)',
        }
      ]
    };
  }, [branches, ordersToUse]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: 'rgba(0,0,0,0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  // Calculate summary stats using fresh orders
  const totalRestaurants = restaurants?.length || 0;
  const totalBranches = branches?.length || 0;
  const totalOrders = ordersToUse?.length || 0;
  
  // Show loading state if either prop loading or orders loading
  const isLoading = loading || ordersLoading || !freshDataFetched;

  return (
    <Card className="shadow">
      <CardHeader className="border-0 d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Restaurant Overview</h6>
        <Link to="/admin/restaurants">
          <Button color="primary" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardBody>
        <Row className="mb-4">
          <Col md="4">
            <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
              <CardBody>
                <Row>
                  <div className="col">
                    <span className="h2 font-weight-bold mb-0">
                      {isLoading ? <Spinner size="sm" /> : totalRestaurants}
                    </span>
                    <h5 className="text-uppercase text-muted mb-0">
                      Total Restaurants
                    </h5>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-warning text-white rounded-circle shadow">
                      <FaBuilding />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
              <CardBody>
                <Row>
                  <div className="col">
                    <span className="h2 font-weight-bold mb-0">
                      {isLoading ? <Spinner size="sm" /> : totalBranches}
                    </span>
                    <h5 className="text-uppercase text-muted mb-0">
                      Total Branches
                    </h5>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-info text-white rounded-circle shadow">
                      <FaStore />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
              <CardBody>
                <Row>
                  <div className="col">
                    <span className="h2 font-weight-bold mb-0">
                      {isLoading ? <Spinner size="sm" /> : totalOrders}
                    </span>
                    <h5 className="text-uppercase text-muted mb-0">
                      Total Orders {freshDataFetched && <small className="text-success">(Live)</small>}
                    </h5>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-success text-white rounded-circle shadow">
                      <FaUtensils />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
        
        <h6 className="text-uppercase text-muted mb-3">Top Restaurants</h6>
        {loading ? (
          <div className="text-center py-3">
            <Spinner color="primary" />
          </div>
        ) : (
          <Table size="sm" responsive hover>
            <thead className="thead-light">
              <tr>
                <th>Restaurant</th>
                <th>Location</th>
                <th className="text-center">Branches</th>
                <th className="text-center">Orders</th>
              </tr>
            </thead>
            <tbody>
              {processedData.topRestaurants.map(restaurant => (
                <tr key={restaurant._id}>
                  <td>
                    <span className="font-weight-bold">
                      {restaurant.name}
                    </span>
                  </td>
                  <td>
                    <span className="d-flex align-items-center">
                      <FaMapMarkerAlt className="text-danger mr-2" />
                      {restaurant.city || restaurant.country || restaurant.address || 'N/A'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="font-weight-bold">{restaurant.branchCount}</span>
                  </td>
                  <td className="text-center">
                    <span className="font-weight-bold">{restaurant.orderCount}</span>
                  </td>
                </tr>
              ))}
              {processedData.topRestaurants.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-3">
                    <p className="text-muted mb-0">No restaurants available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
        
        <div style={{ height: '250px' }} className="mt-4">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </CardBody>
    </Card>
  );
});

export default RestaurantStatsWidget;