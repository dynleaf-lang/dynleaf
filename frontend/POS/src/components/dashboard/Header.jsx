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
  FaPlus
} from 'react-icons/fa';
import { format } from 'date-fns';

const Header = ({ user, connected, selectedTable, onLogout, onToggleSidebar }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return format(date, 'HH:mm:ss');
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
        className="me-3 d-flex align-items-center justify-content-center"
        onClick={onToggleSidebar} 
      >
        <FaBars size={16} />
      </Button>
    
      <NavbarBrand href="#" className="d-flex align-items-center">
        <FaCashRegister size={32} className="text-primary me-3" />
        <div>
          <h4 className="mb-0 text-primary">POS System</h4>
          <small className="text-muted">Restaurant Management</small>
        </div>
      </NavbarBrand>
  
      {/* New Order Button */}
      <Button
        color="success"
        size="sm"
        className="me-3 d-flex align-items-center"
        onClick={() => {
          // Clear current cart and navigate to table selection
          if (window.confirm('Start a new order? This will clear the current cart.')) {
            localStorage.removeItem('pos_cart');
            localStorage.removeItem('pos_customer');
            window.location.href = '/dashboard';
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

      <Nav className="ms-auto d-flex align-items-center" navbar>
        {/* Selected Table Indicator */}
        {selectedTable && (
          <NavItem className="me-3">
            <div className="d-flex align-items-center bg-light px-3 py-2 rounded">
              <FaTable className="text-primary me-2" />
              <div>
                <small className="text-muted d-block">Selected Table</small>
                <strong>{selectedTable.name}</strong>
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
              <div className="fw-bold text-dark">{formatTime(currentTime)}</div>
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
