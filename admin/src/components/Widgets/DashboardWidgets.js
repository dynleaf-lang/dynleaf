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
   

  return (
    <Row className='mt-4'>
      {/* Restaurant Stats Widget - Only shown to Super_Admin or if there's at least one restaurant */}
      {(userRole === 'Super_Admin') && (
        <Col xl={userRole === 'Super_Admin' || tables.length === 0 ? "12" : "6"}>
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
      {(userRole === 'Branch_Manager') && (
      <Col xl={userRole === 'Super_Admin' || restaurants.length === 0 ? "6" : "12"}>
        <TableManagementWidget 
          tables={tables || []}
          reservations={reservations || []}
          loading={loading}
        />
      </Col>
    )}
    </Row>
  );
};

export default React.memo(DashboardWidgets);