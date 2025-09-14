import React, { useContext, useEffect, useState, useRef } from 'react';
import { Row, Col, Spinner, Card, CardHeader, CardBody } from 'reactstrap';
import MenuItemsWidget from './MenuItemsWidget';
import CustomerInsightsWidget from './CustomerInsightsWidget';
import DashboardWidgets from './DashboardWidgets';
import { WidgetDataContext } from './StableDataProvider';
import { AuthContext } from '../../context/AuthContext';

// This component is completely isolated from global contexts
const WidgetsContainer = () => {
  
  // Get authentication context for user role
  const { user } = useContext(AuthContext);
  
  // Use the widget data context to get role-filtered data
  const { 
    restaurantData, 
    tableData, 
    orderData,
    userData,
    customerData,
    menuData,
    categoryData
  } = useContext(WidgetDataContext);
  
  // Add timeout state to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const timeoutRef = useRef(null);
  
  // Set a loading timeout of 15 seconds
  useEffect(() => {
    timeoutRef.current = setTimeout(() => { 
      setLoadingTimeout(true);
    }, 15000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Determine if data is still loading - with more specific logging
  const loadingStates = {
    restaurant: restaurantData.loading,
    table: tableData.loading,
    order: orderData.loading,
    customer: customerData.loading,
    menu: menuData.loading,
    category: categoryData.loading
  };
  
  // Simple loading logic - only check if we have at least some data or timeout occurred
  const hasEssentialData = (restaurantData.restaurants?.length > 0) || 
                          (tableData.tables?.length > 0) || 
                          (orderData.orders?.length > 0);
  
  // Show loading only if no essential data AND no timeout AND still actually loading
  const loading = !loadingTimeout && !hasEssentialData && 
                 (restaurantData.loading || tableData.loading || orderData.loading);
   
  // Combine data for other widgets
  const data = {
    menuItems: menuData.menuItems || [],
    categories: categoryData.categories || [],
    restaurants: restaurantData.restaurants || [],
    branches: restaurantData.branches || [],
    tables: tableData.tables || [],
    reservations: tableData.reservations || [],
    orders: orderData.orders || [],
    customers: customerData.customers || [],
    userRole: userData.role || user?.role || ''
  };

  // If loading, show a loading spinner (with timeout)
  if (loading && !loadingTimeout) {
    return (
      <div className="text-center py-5 my-5">
        <Spinner color="primary" size="lg" />
        <p className="mt-3">Loading dashboard widgets...</p>
        <small className="text-muted">This should only take a few seconds</small>
      </div>
    );
  }
   

  // If no data available for non-Super_Admin users, show a message
  if (data.userRole !== 'Super_Admin' && 
      data.restaurants.length === 0 && 
      data.branches.length === 0) {
    return (
      <Row className="mt-4">
        <Col xl="12">
          <Card className="shadow">
            <CardHeader>
              <h3 className="mb-0">Dashboard</h3>
            </CardHeader>
            <CardBody className="text-center py-5">
              <p className="text-muted mb-0">
                No restaurant or branch data available for your account.
                <br />
                Please contact your administrator to assign you to a restaurant or branch.
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }

  // Render all widgets with their local props from the stable context
  return (
    <>
      {/* Restaurant Stats & Table Management Widgets */}
      <DashboardWidgets 
        restaurants={data.restaurants}
        branches={data.branches}
        tables={data.tables}
        reservations={data.reservations}
        orders={data.orders}
        userRole={data.userRole}
        loading={loading}
      />
      
      
      {/* Branch_Manager-only Widgets */}
      {data.userRole === 'Branch_Manager' && (
        <>
          {/* Menu Items Widget */}
          <Row className="mt-4" >
            <Col className="mb-5 mb-xl-0" xl="12">
              <MenuItemsWidget 
                menuItems={data.menuItems}
                categories={data.categories}
                loading={menuData.loading}
                userRole={data.userRole}
                restaurantId={userData.restaurantId}
                branchId={userData.branchId}
              />
            </Col>
          </Row>

          {/* Customer Insights Widget */}
          <Row className="mt-4">
            <Col className="mb-5 mb-xl-0" xl="12">
              <CustomerInsightsWidget 
                customers={data.customers}
                orders={data.orders}
                loading={customerData.loading}
                userRole={data.userRole}
                restaurantId={userData.restaurantId}
                branchId={userData.branchId}
                countryCode={data.restaurants[0]?.country || "US"}
              />
            </Col>
          </Row>
        </>
      )}
    </>
  );
};

// Ensure the component is memoized to prevent unnecessary re-renders
export default React.memo(WidgetsContainer);