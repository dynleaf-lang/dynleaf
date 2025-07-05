import React, { useEffect } from 'react';
import { Row, Col } from 'reactstrap';
import RestaurantStatsWidget from './RestaurantStatsWidget';
import TableManagementWidget from './TableManagementWidget';

// Component that displays restaurant and table widgets
const DashboardWidgets = ({ 
  restaurants = [], 
  branches = [], 
  tables = [], 
  reservations = [],
  orders = [],
  userRole = 'Branch_Manager',
  loading = false 
}) => {
  
  // Debug logging to track data flow
  useEffect(() => {
    console.log('DashboardWidgets received:', {
      restaurantsCount: restaurants?.length || 0,
      branchesCount: branches?.length || 0,
      tablesCount: tables?.length || 0,
      reservationsCount: reservations?.length || 0,
      ordersCount: orders?.length || 0,
      userRole,
      loading
    });

    // Debug log for the actual data structure
    if (tables && tables.length > 0) {
      console.log('Sample table data structure:', tables[0]);
    } else {
      console.log('No table data available');
    }

    if (reservations && reservations.length > 0) {
      console.log('Sample reservation data structure:', reservations[0]);
    } else {
      console.log('No reservations data available');
    }
  }, [restaurants, branches, tables, reservations, orders, userRole, loading]);

  return (
    <Row className='mt-4'>
      {/* Restaurant Stats Widget - Only shown to Super_Admin or if there's at least one restaurant */}
      {(userRole === 'Super_Admin') && (
        <Col xl={userRole === 'Super_Admin' || tables.length === 0 ? "6" : "6"}>
          <RestaurantStatsWidget 
            restaurants={restaurants}
            branches={branches}
            orders={orders}
            userRole={userRole}
            loading={loading}
          />
        </Col>
      )}
       
      {/* Always render the TableManagementWidget with real data */}
      <Col xl={userRole === 'Super_Admin' || restaurants.length === 0 ? "6" : "12"}>
        <TableManagementWidget 
          tables={tables || []}
          reservations={reservations || []}
          loading={loading}
        />
      </Col> 
    </Row>
  );
};

export default React.memo(DashboardWidgets);