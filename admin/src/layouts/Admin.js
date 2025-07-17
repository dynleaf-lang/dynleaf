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
import GlobalToast from "../components/GlobalToast";

// Create this variable outside the component to persist between renders
const hasCheckedVerification = { current: false };

const Admin = (props) => {
  const mainContent = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpError, setOtpError] = useState(""); // Add OTP error state
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
    console.log('🔍 Admin useEffect triggered - checking verification status');
    console.log('📊 User:', user?.email, 'isEmailVerified:', isEmailVerified);
    console.log('📊 hasCheckedVerification:', hasCheckedVerification.current);
    
    // Skip if no user or verification has been checked already
    if (!user || hasCheckedVerification.current) {
      console.log('⏭️ Skipping verification check - no user or already checked');
      return;
    }

    // Check if verification should be bypassed
    const bypassVerification = localStorage.getItem('bypassVerification') === 'true';
    console.log('🔄 bypassVerification flag:', bypassVerification);
    
    // If user exists, email is not verified, and bypass is not set
    if (user && !isEmailVerified && !bypassVerification) {
      console.log('⚠️ User email not verified, showing OTP modal automatically');
      console.log('🕰️ Setting timeout to show modal in 1 second');
      
      // Small delay to let the user see they've successfully logged in
      setTimeout(() => {
        console.log('🚀 TIMEOUT TRIGGERED - Opening OTP modal and alert');
        setShowOTPModal(true);
        setShowVerificationAlert(true);
      }, 1000); // 1 second delay
    } else {
      console.log('✅ User is verified or verification bypassed - no modal needed');
    }
    
    // Mark as checked for this session - won't run again
    hasCheckedVerification.current = true;
    console.log('📝 Marked verification as checked for this session');
  }, [user, isEmailVerified]);

  // Handle when user closes the modal (but keeps alert visible)
  const handleCloseOTPModal = () => {
    setShowOTPModal(false);
    setOtpError(""); // Clear any OTP errors when closing
    // Keep the alert visible so they can verify later
  };

  // Handle when user chooses to verify email from alert
  const handleVerifyEmail = () => {
    console.log('📧 handleVerifyEmail CALLED - User clicked "Verify Now" button');
    console.log('🕰️ Verify Now click timestamp:', new Date().toISOString());
    console.log('📝 Opening verification modal with direct OTP flow');
    setOtpError(""); // Clear any previous errors
    setShowOTPModal(true);
  };

  // Toggle OTP modal with logging
  const toggleOTPModal = (reason = 'unknown') => {
    console.log(`🔄 OTP Modal toggle called with reason: ${reason}`);
    console.log(`🕰️ Toggle timestamp: ${new Date().toISOString()}`);
    console.log(`📊 Current modal state: ${showOTPModal} -> ${!showOTPModal}`);
    
    // Only allow manual closing, not accidental backdrop/keyboard closing
    if (reason !== 'backdrop' && reason !== 'keyboard') {
      console.log('✅ Closing OTP modal manually');
      setShowOTPModal(!showOTPModal);
      if (!showOTPModal === false) {
        setOtpError(""); // Clear errors when closing
      }
    } else {
      console.log('❌ Prevented modal close due to:', reason);
    }
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
      
      {/* Direct OTP verification modal with enhanced error handling */}
      <DirectOTPModal
        isOpen={showOTPModal}
        toggle={toggleOTPModal}
        onVerified={() => {
          console.log('OTP verification successful - closing modal');
          setShowOTPModal(false);
          setOtpError("");
          handleVerificationSuccess();
        }}
        error={otpError}
        setError={setOtpError}
        backdrop="static"
        keyboard={false}
      />
      
      {/* Session timeout modal */}
      <SessionTimeoutModal />

      {/* Account Suspended Modal */}
      <AccountSuspendedModal 
        isOpen={isAccountSuspended} 
        onConfirm={handleAccountSuspensionConfirm} 
      />
      
      {/* Global Toast for OTP Success */}
      <GlobalToast />
    </>
  );
};

export default Admin;
