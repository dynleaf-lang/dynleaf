/*!
=========================================================
* HARIF SUHAIL Dashboard React - v1.2.4
=========================================================
 
* Copyright 2024 HARIF SUHAIL (https://www.harifsuhail.com) 

* Coded by HARIF SUHAIL

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// reactstrap components
import { 
  Card, 
  CardBody, 
  CardTitle, 
  Container, 
  Row, 
  Col, 
  Spinner, 
  Button,
  UncontrolledTooltip
} from "reactstrap";
import React, { useContext, useEffect, useState } from "react";
import { OrderContext } from "../../context/OrderContext";
import { CustomerContext } from "../../context/CustomerContext";
import { MenuContext } from "../../context/MenuContext";
import { TableContext } from "../../context/TableContext";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const Header = () => {
  // Get data from contexts
  const { orders, getAllOrders, loading: ordersLoading } = useContext(OrderContext);
  const { customers, getAllCustomers, loading: customersLoading } = useContext(CustomerContext);
  const { menuItems, getAllMenuItems, loading: menuLoading } = useContext(MenuContext);
  const { tables, getTables, loading: tablesLoading } = useContext(TableContext);
  const { user } = useContext(AuthContext);

  // Stats state
  const [stats, setStats] = useState({
    orders: {
      total: 0,
      percentChange: 0,
      direction: 'up',
      loading: true
    },
    customers: {
      total: 0,
      percentChange: 0,
      direction: 'down',
      loading: true
    },
    menuItems: {
      total: 0,
      percentChange: 0,
      direction: 'down',
      loading: true
    },
    tables: {
      total: 0,
      percentChange: 0,
      direction: 'up',
      loading: true
    }
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Start all fetches in parallel
        const fetchPromises = [];
        
        // Only fetch data user has permission to access based on role
        fetchPromises.push(getAllOrders());
        fetchPromises.push(getAllCustomers());
        
        if (getAllMenuItems) {
          fetchPromises.push(getAllMenuItems());
        }
        
        fetchPromises.push(getTables());
        
        // Wait for all fetches to complete
        await Promise.all(fetchPromises);
        
        // Calculate statistics after data is loaded
        calculateStats();
      } catch (error) {
        console.error("Error fetching data for dashboard:", error);
      }
    };

    fetchData();
  }, []);

  // Update loading states when context loading states change
  useEffect(() => {
    setStats(prevStats => ({
      ...prevStats,
      orders: {
        ...prevStats.orders,
        loading: ordersLoading
      },
      customers: {
        ...prevStats.customers,
        loading: customersLoading
      },
      menuItems: {
        ...prevStats.menuItems,
        loading: menuLoading
      },
      tables: {
        ...prevStats.tables,
        loading: tablesLoading
      }
    }));
  }, [ordersLoading, customersLoading, menuLoading, tablesLoading]);

  // Calculate statistics from fetched data
  const calculateStats = () => {
    const ordersCount = Array.isArray(orders) ? orders.length : 0;
    const customersCount = Array.isArray(customers) ? customers.length : 0;
    const menuItemsCount = Array.isArray(menuItems) ? menuItems.length : 0;
    const tablesCount = Array.isArray(tables) ? tables.length : 0;

    // In a real scenario, you'd calculate percentage changes based on historical data
    // Here we're using sample percentage changes
    setStats({
      orders: {
        total: ordersCount,
        percentChange: 3.48,
        direction: 'up',
        loading: false
      },
      customers: {
        total: customersCount,
        percentChange: 3.48,
        direction: 'down',
        loading: false
      },
      menuItems: {
        total: menuItemsCount,
        percentChange: 1.10,
        direction: 'down',
        loading: false
      },
      tables: {
        total: tablesCount,
        percentChange: 12,
        direction: 'up',
        loading: false
      }
    });
  };

  // Define paths for navigation
  const paths = {
    orders: "/admin/order-management",
    customers: "/admin/customer-management",
    menuItems: "/admin/menu-items",
    tables: "/admin/tables-management"
  };

  // Check if user has access to a specific path based on role
  const hasAccess = (path) => {
    

    // Staff has limited access
    if (user?.role === "Branch_Manager" || user?.role === "Super_Admin") {
      return ["/admin/order-management", "/admin/customer-management", "/admin/menu-items", "/admin/tables-management"].includes(path); 
    }

    return false;
  };

  // Render card content with loading state handling
  const renderCardContent = (type, title, icon, path) => {
    const cardData = stats[type];
    const canAccess = hasAccess(path);
    
    return (
      <CardBody>
        <Row>
          <div className="col">
            <CardTitle tag="h5" className="text-uppercase text-muted mb-0">
              {title}
            </CardTitle>
            <span className="h2 font-weight-bold mb-0">
              {cardData.loading ? (
                <Spinner size="sm" color="primary" />
              ) : (
                cardData.total.toLocaleString()
              )}
            </span>
          </div>
          <Col className="col-auto">
            <div className={`icon icon-shape bg-${getIconColor(type)} text-white rounded-circle shadow`}>
              <i className={icon} />
            </div>
          </Col>
        </Row>
        <div className="mt-3 d-flex justify-content-between align-items-center">
          <p className="mb-0 text-muted text-sm">
            <span className={`text-${cardData.direction === 'up' ? 'success' : 'danger'} mr-2`}>
              <i className={`fas fa-arrow-${cardData.direction}`} /> {cardData.percentChange}%
            </span>{" "}
            <span className="text-nowrap">Since last month</span>
          </p>
          {canAccess && (
            <Button
              color="link"
              size="sm"
              className="p-0"
              tag={Link}
              to={path}
              id={`view-${type}-tooltip`}
            >
              <i className="fas fa-external-link-alt" />
            </Button>
          )}
          {canAccess && (
            <UncontrolledTooltip
              delay={0}
              target={`view-${type}-tooltip`}
              placement="top"
            >
              View {title}
            </UncontrolledTooltip>
          )}
        </div>
      </CardBody>
    );
  };

  // Get icon color based on card type
  const getIconColor = (type) => {
    const colors = {
      orders: "danger",
      customers: "warning",
      menuItems: "yellow",
      tables: "info"
    };
    
    return colors[type] || "primary";
  };

  return (
    <>
      <div className="header bg-gradient-info pb-8 pt-5 pt-md-8">
        <Container fluid>
          <div className="header-body">
            {/* Card stats */}
            <Row>
              <Col lg="6" xl="3">
                <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
                  {renderCardContent("orders", "Orders", "fas fa-shopping-cart", paths.orders)}
                </Card>
              </Col>
              <Col lg="6" xl="3">
                <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
                  {renderCardContent("customers", "Customers", "fas fa-users", paths.customers)}
                </Card>
              </Col>
              <Col lg="6" xl="3">
                <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
                  {renderCardContent("menuItems", "Menu Items", "fas fa-utensils", paths.menuItems)}
                </Card>
              </Col>
              <Col lg="6" xl="3">
                <Card className="card-stats mb-4 mb-xl-0 shadow-sm">
                  {renderCardContent("tables", "Dining Tables", "fas fa-chair", paths.tables)}
                </Card>
              </Col>
            </Row>
          </div>
        </Container>
      </div>
    </>
  );
};

export default Header;
