import React, { useState, useContext, useEffect } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Spinner
} from "reactstrap";
import { AuthContext } from "../../context/AuthContext";
import axios from 'axios';

const DirectOTPModal = ({ isOpen, toggle, onVerified, error: externalError, setError: setExternalError }) => {
  const { user, confirmVerification } = useContext(AuthContext);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showToast, setShowToast] = useState(false);
  // Add shake animation state
  const [shake, setShake] = useState(false);

  // Use external error state if provided
  const error = typeof externalError === 'string' ? externalError : '';
  const setError = typeof setExternalError === 'function' ? setExternalError : () => {};

  // Get the email to use for verification
  const getEmailToVerify = () => {
    return user?.email || '';
  };

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Local function to send verification email without affecting global state
  const sendVerificationEmailLocal = async (email) => {
    try {
      // Get base API URL from environment or use default
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      console.log('Attempting to send verification email to:', email);
      
      // Try both endpoints to maximize chance of success
      let response;
      
      try {
        // First try the resend-otp endpoint
        response = await axios.post(`${apiUrl}/api/users/resend-otp`, { email });
        console.log('Verification email sent successfully via resend-otp');
      } catch (resendError) {
        console.log('Could not use resend-otp, falling back to verify-email endpoint:', resendError.message);
        // Fallback to verify-email endpoint
        response = await axios.post(`${apiUrl}/api/users/verify-email`, { email });
        console.log('Verification email sent successfully via verify-email');
      }
      
      return { success: true, response: response.data };
    } catch (error) {
      console.error('Error sending verification email:', error);
      
      // Provide more detailed error messages
      let errorMsg = 'Failed to send verification email';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      return { 
        success: false, 
        error: error,
        message: errorMsg
      };
    }
  };

  // Send verification email
  const handleSendVerificationEmail = async () => {
    const email = getEmailToVerify();
    if (!email) {
      setError("No email address available for verification");
      return;
    }
    
    setSendingEmail(true);
    setError("");
    
    try {
      console.log("Sending verification email to:", email);
      const result = await sendVerificationEmailLocal(email);
      
      console.log("Verification email result:", result); // Debug log
      
      // Check for success - be more flexible with response format
      if (result && (
        result.success === true || 
        result.status === 'success' || 
        result.message === 'OTP sent successfully' ||
        (result.response && result.response.message) ||
        !result.success === false // If success is not explicitly false
      )) {
        console.log("Email verification sent successfully");
        setEmailSent(true);
        setCountdown(60); // Set 60 second cooldown for resend
        setError(""); // Clear any previous errors
        
        // Force a re-render to ensure state change is applied
        setTimeout(() => {
          console.log("Email sent state updated, emailSent should be:", true);
        }, 100);
      } else {
        console.log("Email send failed, result:", result);
        const errorMessage = result?.message || result?.error?.response?.data?.message || "Failed to send verification email";
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("Error sending verification email:", err);
      setError(err.message || "Failed to send verification email. Please try again.");
      setEmailSent(false); // Ensure we stay on the send email screen
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle verification code submission
  const handleSubmitVerification = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent bubbling up
    }
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await confirmVerification(verificationCode);
      if (result && result.success) {
        setSuccess(true);
        setShowToast(true);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            userData.isEmailVerified = true;
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('bypassVerification', 'true');
          } catch (parseError) {
            console.error("Error updating localStorage:", parseError);
          }
        }
        setTimeout(() => { setShowToast(false); }, 3000);
        setTimeout(() => { if (typeof onVerified === 'function') { onVerified(); } }, 2000);
      } else {
        setSuccess(false);
        setShowToast(false);
        setLoading(false);
        setError("The code you entered is incorrect or expired. Please check your email and try again. If you did not receive a code, you can resend it.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        // Do NOT call onVerified or close modal
        return;
      }
    } catch (error) {
      setSuccess(false);
      setShowToast(false);
      setLoading(false);
      setError(error.response?.data?.message || "Verification failed. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      // Do NOT call onVerified or close modal
      return;
    }
    setLoading(false);
  };

  // Handle resending verification email
  const handleResendVerification = async () => {
    setVerificationCode("");
    await handleSendVerificationEmail();
  };

  // Handle key press for easy submission
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && verificationCode.length === 6 && !loading) {
      handleSubmitVerification(e);
    }
  };

  // Send verification email when modal opens - REMOVED automatic sending
  useEffect(() => {
    if (isOpen) {
      setVerificationCode("");
      setError("");
      setSuccess(false);
      setEmailSent(false);
      setSendingEmail(false);
      setCountdown(0);
      setShowToast(false);
    } else {
      setVerificationCode("");
      setError("");
      setSuccess(false);
      setEmailSent(false);
      setSendingEmail(false);
      setCountdown(0);
      setShowToast(false);
    }
  }, [isOpen, setError]);

  // Render appropriate content based on whether email has been sent
  const renderVerificationContent = () => {
    if (!emailSent) {
      return (
        <div className="text-center py-4">
          <div className="icon icon-shape icon-shape-info rounded-circle mb-3">
            <i className="fas fa-envelope fa-2x"></i>
          </div>
          <h4>Send Verification Code</h4>
          <p className="text-muted">
            We'll send a verification code to <strong>{getEmailToVerify()}</strong>
          </p>
          {error && (
            <Alert color="danger" isOpen={!!error} toggle={() => setError("")}> 
              {error}
            </Alert>
          )}
          <Button 
            color="info" 
            onClick={handleSendVerificationEmail}
            disabled={sendingEmail}
            className="mt-3"
            size="lg"
          >
            {sendingEmail ? (
              <><Spinner size="sm" className="mr-1" /> Sending...</>
            ) : (
              <><i className="fas fa-paper-plane mr-1"></i> Send Verification Code</>
            )}
          </Button>
        </div>
      );
    }
    
    return (
      <Form onSubmit={handleSubmitVerification} id="otp-verification-form">
        <div className={`text-center mb-4${shake ? ' shake' : ''}`}>
          <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
            <i className="fas fa-shield-alt fa-2x"></i>
          </div>
          <h4>Enter Verification Code</h4>
          <p className="text-muted">
            We've sent a verification code to <strong>{getEmailToVerify()}</strong>
          </p>
          <div className="alert alert-success py-2 px-3 d-inline-block">
            <i className="fas fa-check-circle mr-1"></i> Verification code sent!
          </div>
        </div>

        {error && (
          <Alert color="danger" isOpen={!!error} toggle={() => setError("")}> {error} </Alert>
        )}

        <FormGroup>
          <Label className="form-control-label" htmlFor="verificationCode">Verification Code</Label>
          <Input
            className="form-control-alternative form-control-lg text-center"
            type="text"
            id="verificationCode"
            placeholder="Enter 6-digit code"
            maxLength={6}
            style={{ fontSize: '24px', letterSpacing: '0.5rem' }}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))}
            autoComplete="off"
            autoFocus
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <small className="form-text text-muted">
            <i className="fas fa-info-circle mr-1"></i>
            Enter the 6-digit code sent to your email address
          </small>
        </FormGroup>

        <div className="text-center mt-4">
          <Button color="secondary" className="mr-2" onClick={() => setEmailSent(false)} type="button" disabled={loading}>
            <i className="fas fa-arrow-left mr-1"></i> Back
          </Button>
          <Button 
            type="submit"
            color="info" 
            disabled={loading || !verificationCode || verificationCode.length !== 6}
          >
            {loading ? (
              <><Spinner size="sm" className="mr-1" /> Verifying...</>
            ) : (
              <><i className="fas fa-check-circle mr-1"></i> Verify Email</>
            )}
          </Button>
        </div>

        <div className="text-center mt-4">
          <Button 
            color="link" 
            size="sm"
            onClick={handleResendVerification}
            disabled={sendingEmail || countdown > 0 || loading}
            type="button"
          >
            <i className="fas fa-paper-plane mr-1"></i> 
            {countdown > 0 ? `Resend available in ${countdown}s` : "Resend verification code"}
          </Button>
        </div>
      </Form>
    );
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        toggle={toggle} 
        size="md" 
        zIndex={1050}
        backdrop="static" 
        keyboard={false}
        className="direct-otp-modal"
      >
        <ModalHeader toggle={toggle} className="bg-gradient-info text-white">
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className="fas fa-envelope mr-2"></i>
              {success ? "Verification Complete" : "Verify Your Email"}
            </h4>
            <p className="text-white-50 mb-0 small">
              {!success && "Enter the code we sent to your email"}
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {success ? (
            <div className="text-center py-4">
              <div className="icon icon-shape icon-shape-success rounded-circle mb-3">
                <i className="fas fa-check-circle fa-2x"></i>
              </div>
              <h4>Email Verified Successfully!</h4>
              <p className="text-muted">Your email has been verified and your account is now fully activated.</p>
              <Button color="success" onClick={toggle}>
                <i className="fas fa-check mr-1"></i> Continue
              </Button>
            </div>
          ) : (
            renderVerificationContent()
          )}
        </ModalBody>
      </Modal>

      {/* Success Toast Notification */}
      {showToast && (
        <div 
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 10000,
            minWidth: '350px',
            maxWidth: '450px'
          }}
        >
          <Alert 
            color="success" 
            isOpen={showToast}
            toggle={() => setShowToast(false)}
            className="shadow-lg border-0 mb-0 notification-slide-in"
            style={{
              borderRadius: '12px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07)',
              border: '2px solid #2dce89'
            }}
          >
            <div className="d-flex align-items-start">
              <div 
                className="mr-3 mt-1 p-2 rounded-circle bg-white"
                style={{ color: '#2dce89' }}
              >
                <i className="fas fa-check-circle" />
              </div>
              <div className="flex-1">
                <h6 className="mb-1 font-weight-bold text-white">
                  🎉 Email Verified Successfully!
                </h6>
                <p className="mb-0 text-white" style={{ opacity: 0.9, fontSize: '0.875rem' }}>
                  Your email has been verified and your account is now fully activated.
                </p>
              </div>
              <Button 
                close 
                onClick={() => setShowToast(false)}
                className="ml-2 text-white"
                style={{ 
                  fontSize: '1.2rem', 
                  opacity: 0.8,
                  background: 'none',
                  border: 'none'
                }}
              />
            </div>
            
            {/* Auto-close progress bar */}
            <div 
              className="progress mt-2"
              style={{ height: '2px', background: 'rgba(255,255,255,0.2)' }}
            >
              <div 
                className="progress-bar bg-white"
                style={{
                  animation: 'shrinkWidth 3s linear',
                  width: '100%'
                }}
              ></div>
            </div>
          </Alert>
        </div>
      )}

      {/* CSS for toast animations */}
      <style>
        {`
          @keyframes shrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
          .notification-slide-in {
            animation: slideInRight 0.4s ease-out;
          }
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .shake {
            animation: shake 0.5s;
          }
          @keyframes shake {
            0% { transform: translateX(0); }
            20% { transform: translateX(-10px); }
            40% { transform: translateX(10px); }
            60% { transform: translateX(-10px); }
            80% { transform: translateX(10px); }
            100% { transform: translateX(0); }
          }
        `}
      </style>
    </>
  );
};

export default DirectOTPModal;