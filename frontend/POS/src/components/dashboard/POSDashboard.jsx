import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import { FaTable, FaUtensils, FaReceipt, FaChartBar, FaCog, FaSignOutAlt, FaUser, FaCashRegister } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { usePOS } from '../../context/POSContext';
import { useSocket } from '../../context/SocketContext';
import { useOrder } from '../../context/OrderContext';

// Import dashboard components
import Header from './Header';
import TableSelection from './TableSelection';
import MenuSelection from './MenuSelection';
import OrderManagement from './OrderManagement';
import Reports from './Reports';
import Settings from './Settings';
import QuickStats from './QuickStats';

import './POSDashboard.css';

const POSDashboard = () => {
  const [activeTab, setActiveTab] = useState('tables');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { selectedTable } = usePOS();
  const { getOrderStats } = useOrder();

  // Auto-switch to menu when table is selected
  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      setActiveTab('menu');
    }
  }, [selectedTable, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleToggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const orderStats = getOrderStats();

  return (
    <div className="pos-dashboard">
      <Header 
        user={user}
        connected={connected}
        selectedTable={selectedTable}
        onLogout={handleLogout}
        onToggleSidebar={handleToggleSidebar}
      />

      <Container fluid className="dashboard-content">
        <Row>
          {/* Sidebar Navigation */}
          <Col 
            md={sidebarVisible ? 0 : 2} 
            className={`sidebar-nav ${sidebarVisible ? 'sidebar-hidden' : 'sidebar-visible'}`}
          >
            <Card className="nav-card h-100" style={{ boxShadow: 'none' }}>
              <CardBody className="p-0">
                <Nav vertical pills className="flex-column p-3">
                  <NavItem>
                    <NavLink
                      className={activeTab === 'tables' ? 'active' : ''}
                      onClick={() => handleTabChange('tables')}
                    >
                      <FaTable className="me-2" />
                      Tables
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'menu' ? 'active' : ''}
                      onClick={() => handleTabChange('menu')}
                      disabled={!selectedTable}
                    >
                      <FaUtensils className="me-2" />
                      Menu
                      {!selectedTable && <small className="d-block text-muted">Select table first</small>}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'orders' ? 'active' : ''}
                      onClick={() => handleTabChange('orders')}
                    >
                      <FaReceipt className="me-2" />
                      Orders
                      {orderStats.total > 0 && (
                        <span className="badge bg-primary ms-2">{orderStats.total}</span>
                      )}
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'reports' ? 'active' : ''}
                      onClick={() => handleTabChange('reports')}
                    >
                      <FaChartBar className="me-2" />
                      Reports
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={activeTab === 'settings' ? 'active' : ''}
                      onClick={() => handleTabChange('settings')}
                    >
                      <FaCog className="me-2" />
                      Settings
                    </NavLink>
                  </NavItem>
                </Nav>

                {/* Quick Stats in Sidebar */}
                <div className="sidebar-stats mt-4">
                  <QuickStats stats={orderStats} />
                </div>

                {/* User Info & Logout */}
                <div className="sidebar-footer">
                  <div className="user-info mb-3">
                    <div className="d-flex align-items-center">
                      <FaUser className="me-2 text-muted" />
                      <div>
                        <small className="d-block fw-bold">{user?.name}</small>
                        <small className="text-muted">{user?.role}</small>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-danger btn-sm w-100"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="me-2" />
                    Logout
                  </button>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Main Content Area */}
          <Col 
            md={sidebarVisible ? 12 : 10} 
            className={`main-content ${sidebarVisible ? 'content-full-width' : 'content-with-sidebar'}`}
          >
            <TabContent activeTab={activeTab}>
              <TabPane tabId="tables">
                <TableSelection />
              </TabPane>
              
              <TabPane tabId="menu">
                <MenuSelection />
              </TabPane>
              
              <TabPane tabId="orders">
                <OrderManagement />
              </TabPane>
              
              <TabPane tabId="reports">
                <Reports />
              </TabPane>
              
              <TabPane tabId="settings">
                <Settings />
              </TabPane>
            </TabContent>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default POSDashboard;
