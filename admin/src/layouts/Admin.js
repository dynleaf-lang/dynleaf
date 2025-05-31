import React, { useContext, useEffect, useState } from "react";
import { useLocation, Route, Routes, Navigate, useNavigate } from "react-router-dom";
// reactstrap components
import { Container, Alert, Button } from "reactstrap";
// core components
import AdminNavbar from "components/Navbars/AdminNavbar.js";
import AdminFooter from "components/Footers/AdminFooter.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import routes from "routes.js";
import { AuthContext } from "../context/AuthContext";
import DirectOTPModal from "../components/Modals/DirectOTPModal";
import SessionTimeoutModal from "../components/Verification/SessionTimeoutModal";
import AccountSuspendedModal from "../components/Verification/AccountSuspendedModal";

// Create this variable outside the component to persist between renders
const hasCheckedVerification = { current: false };

const Admin = (props) => {
  const mainContent = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const { user, isAccountSuspended, confirmAccountSuspension, isEmailVerified } = useContext(AuthContext);
 
  React.useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
    if (mainContent.current) {
      mainContent.current.scrollTop = 0;
    }
  }, [location]);

  const handleAccountSuspensionConfirm = () => {
    confirmAccountSuspension(navigate);
  };

  const getRoutes = (routes) => {
    return routes.map((prop, key) => {
      if (prop.layout === "/admin") {
        return (
          <Route path={prop.path} element={prop.component} key={key} exact />
        );
      } else {
        return null;
      }
    });
  };

  const getBrandText = (path) => {
    for (let i = 0; i < routes.length; i++) {
      if (
        props?.location?.pathname?.indexOf(routes[i].layout + routes[i].path) !==
        -1
      ) {
        return routes[i].name;
      }
    }
    return "Brand";
  };

  // Check for unverified email - but only once
  useEffect(() => {
    // Skip if no user or verification has been checked already
    if (!user || hasCheckedVerification.current) return;

    // If user exists and email is not verified
    if (user && !isEmailVerified) {
      setShowVerificationAlert(true);
    }
    
    // Mark as checked for this session - won't run again
    hasCheckedVerification.current = true;
  }, [user, isEmailVerified]);

  // Handle when user chooses to verify email from alert
  const handleVerifyEmail = () => {
    console.log('Opening verification modal with direct OTP flow');
    setShowOTPModal(true);
  };

  // Handle successful verification
  const handleVerificationSuccess = () => {
    console.log('Email verification successful');
    // Update UI after successful verification
    setShowVerificationAlert(false);
    setShowOTPModal(false);
    
    // Set verified status in both localStorage and state
    if (user) {
      const updatedUser = { ...user, isEmailVerified: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('bypassVerification', 'true');
      
      // Force a UI update by dispatching a custom event
      window.dispatchEvent(new CustomEvent('userDataRefreshed', {
        detail: { user: updatedUser }
      }));
    }
    
    // Reset the verification check to allow it to run again if needed
    hasCheckedVerification.current = false;
  };

  return (
    <>
      <Sidebar
        {...props}
        routes={routes}
        logo={{
          innerLink: "/admin/index",
          imgSrc: require("../assets/img/brand/OrderEase-logo.png"),
          imgAlt: "...",
        }}
      />
      <div className="main-content" ref={mainContent}>
        <AdminNavbar
          {...props}
          brandText={getBrandText(props?.location?.pathname)}
        />
        
        {/* Email verification alert for unverified users */}
        {!isEmailVerified && showVerificationAlert && (
          <div className="fixed-top" style={{ top: "100px", zIndex: 999, left : '16.5%' }}>
            <Container fluid>
              <Alert 
                color="warning" 
                className="d-flex justify-content-between align-items-center"
                style={{ boxShadow: "rgb(0 0 0 / 35%) 5px 6px 8px", borderRadius: "5px" }}
                toggle={() => setShowVerificationAlert(false)}
              >
                <div>
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <strong>Your email is not verified.</strong> Some features may be limited until you verify your email address.
                </div>
                <Button 
                  color="warning" 
                  size="sm"
                  onClick={handleVerifyEmail}
                >
                  <i className="fas fa-envelope mr-1"></i>
                  Verify Now 
                </Button> 
              </Alert>
            </Container>
          </div>
        )}
        
        <Routes>
          {getRoutes(routes)}
          <Route path="*" element={<Navigate to="/admin/index" replace />} />
        </Routes>
        <Container fluid>
          <AdminFooter />
        </Container>
      </div>
      
      {/* Simplified Direct OTP verification modal */}
      <DirectOTPModal
        isOpen={showOTPModal}
        toggle={() => setShowOTPModal(false)}
        onVerified={handleVerificationSuccess}
      />
      
      {/* Session timeout modal */}
      <SessionTimeoutModal />

      {/* Account Suspended Modal */}
      <AccountSuspendedModal 
        isOpen={isAccountSuspended} 
        onConfirm={handleAccountSuspensionConfirm} 
      />
    </>
  );
};

export default Admin;
