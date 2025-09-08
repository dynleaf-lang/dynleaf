import React, { useState, useEffect } from 'react';
import { 
  Navbar, 
  NavbarBrand, 
  Nav, 
  NavItem, 
  Badge,
  Button,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';
import { 
  FaCashRegister, 
  FaWifi, 
  FaExclamationTriangle, 
  FaClock, 
  FaTable,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaPlus,
  FaExpand,
} from 'react-icons/fa';
import { format } from 'date-fns';
import { usePOS } from '../../context/POSContext';
import { useShift } from '../../context/ShiftContext';
import ShiftControls from './ShiftControls';

const Header = ({ user, connected, selectedTable, activeTab, onLogout, onToggleSidebar, onNavigateToTables }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { restaurant } = usePOS();
  const { currentSession } = useShift();

  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return format(date, 'hh:mm:ss');
  };

  const formatDate = (date) => {
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <Navbar 
      color="white" 
      light 
      expand="md" 
      className="px-4 shadow-sm border-bottom"
      style={{ height: '80px' }}
    >
      {/* Sidebar Toggle Button */}
      <Button
        color="light"
        size="sm"
        className="me-3 d-flex align-items-center justify-content-center px-2 rounded-0"
        onClick={onToggleSidebar} 
      >
        <FaBars size={16} />
      </Button>
    
      <NavbarBrand href="#" className="d-flex align-items-center">
        {restaurant?.logo ? (
          <img
            src={restaurant.logo}
            alt={restaurant.brandName || restaurant.name || 'Brand'}
            style={{ width: 36, height: 36, objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="me-3"
          />
        ) : (
          <FaCashRegister size={32} className="text-primary me-3" />
        )}
        <div>
          <h4 className="mb-0 text-primary">{restaurant?.brandName || restaurant?.name || 'POS System'}</h4>
          <small className="text-muted">{restaurant?.name ? 'Restaurant Management' : 'Restaurant Management'}</small>
        </div>
      </NavbarBrand>
  
  {/* New Order Button - Hidden on table selection page */}
      {activeTab !== 'tables' && (
        <Button
          color="success"
          size="sm"
          className="me-3 d-flex align-items-center"
          onClick={() => {
            // Clear current cart and navigate to table selection 
            // Clear localStorage data
            localStorage.removeItem('pos_cart');
            localStorage.removeItem('pos_customer');
            
            // Navigate to tables tab without page refresh
            if (onNavigateToTables) {
              onNavigateToTables();
            }
          }}
          style={{
            borderRadius: '20px',
            padding: '0.5rem 1rem',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <FaPlus className="me-2" size={14} />
          New Order
        </Button>
      )}

      {/* Orders Button - hidden on order page */}
      {activeTab !== 'orders' && (
      <Button
        color="primary"
        size="sm"
        className="me-3 d-flex align-items-center"
        onClick={() => window.dispatchEvent(new Event('pos:navigateToOrders'))}
        style={{
          borderRadius: '20px',
          padding: '0.5rem 1rem',
          fontWeight: '600',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title="Go to Orders"
      >
        <FaCashRegister className="me-2" size={14} />
        Orders
      </Button>
      )}

      <Nav className="ms-auto d-flex align-items-center" navbar>
        {/* Register/Session Status + Controls */}
        <div className="d-flex align-items-center me-3">
          <div className="d-flex align-items-center bg-light px-3 py-2 rounded me-2">
            <FaCashRegister className={currentSession ? 'text-success me-2' : 'text-secondary me-2'} />
            <div>
              <small className="text-muted d-block">Register</small>
              <strong className={currentSession ? 'text-success' : 'text-secondary'}>
                {currentSession ? 'Open' : 'Closed'}
              </strong>
            </div>
          </div>
          <ShiftControls />
        </div>
        {/* Fullscreen Toggle Button */}
        <Button
          color="light"
          title='Toggle Fullscreen'
          size="sm"
          className="me-3 d-flex align-items-center justify-content-center px-2 rounded-0"
          onClick={() => {
            // Handle fullscreen toggle
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
        >
          <FaExpand size={16} />
        </Button>

        {/* Selected Table Indicator */}
        {selectedTable && (
          <NavItem className="me-3">
            <div className="d-flex align-items-center bg-light px-3 py-2 rounded">
              <FaTable className="text-primary me-2" />
              <div>
                <small className="text-muted d-block">Selected Table</small>
                <strong>{selectedTable.TableName}</strong>
              </div>
            </div>
          </NavItem>
        )}

        {/* Connection Status */}
        <NavItem className="me-3">
          <div className="d-flex align-items-center">
            {connected ? (
              <>
                <FaWifi className="text-success me-2" />
                <Badge color="success" pill>Online</Badge>
              </>
            ) : (
              <>
                <FaExclamationTriangle className="text-danger me-2" />
                <Badge color="danger" pill>Offline</Badge>
              </>
            )}
          </div>
        </NavItem>

        {/* Current Time */}
        <NavItem className="me-3">
          <div className="d-flex align-items-center text-center">
            <FaClock className="text-info me-2" />
            <div>
              <div className="fw-bold text-dark">{
                  //12 hrs formatTime(currentTime)
                  formatTime(currentTime)
                }</div>
              <small className="text-muted">{formatDate(currentTime)}</small>
            </div>
          </div>
        </NavItem>

        {/* User Menu */}
        <NavItem>
          <UncontrolledDropdown>
            <DropdownToggle 
              nav 
              caret 
              className="d-flex align-items-center bg-light px-3 py-2 rounded"
            >
              <FaUser className="me-2" />
              <div className="text-start">
                <div className="fw-bold">{user?.name}</div>
                <small className="text-muted">{user?.role}</small>
              </div>
            </DropdownToggle>
            <DropdownMenu end>
              <DropdownItem header>
                <strong>{user?.name}</strong>
                <br />
                <small className="text-muted">{user?.email}</small>
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem>
                <FaUser className="me-2" />
                Profile Settings
              </DropdownItem>
              <DropdownItem>
                <FaCog className="me-2" />
                Preferences
              </DropdownItem>
              <DropdownItem divider />
              <DropdownItem onClick={onLogout} className="text-danger">
                <FaSignOutAlt className="me-2" />
                Logout
              </DropdownItem>
            </DropdownMenu>
          </UncontrolledDropdown>
        </NavItem>
      </Nav>
    </Navbar>
  );
};

export default Header;
