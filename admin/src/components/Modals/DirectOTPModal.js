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

const DirectOTPModal = ({ isOpen, toggle, onVerified }) => {
  const { user, confirmVerification, resendVerificationEmail } = useContext(AuthContext);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      const result = await resendVerificationEmail(email);
      
      if (result && result.success) {
        console.log("Email verification sent successfully");
        setEmailSent(true);
        setCountdown(60); // Set 60 second cooldown for resend
      } else {
        throw new Error(result?.error?.response?.data?.message || "Failed to send verification email");
      }
    } catch (err) {
      console.error("Error sending verification email:", err);
      setError(err.message || "Failed to send verification email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle verification code submission
  const handleSubmitVerification = async (e) => {
    if (e) e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      console.log("Submitting verification code:", verificationCode);
      const result = await confirmVerification(verificationCode);
      
      if (result && result.success) {
        console.log("OTP verification successful!");
        setSuccess(true);
        
        // Update localStorage directly
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
        
        // Call onVerified callback after delay
        setTimeout(() => {
          if (typeof onVerified === 'function') {
            onVerified();
          }
        }, 2000);
      } else {
        setError("Invalid or expired verification code. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      setError(error.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
      // Reset states when modal opens
      setVerificationCode("");
      setError("");
      setSuccess(false);
      setEmailSent(false);
      
      // Automatic email sending removed
    }
  }, [isOpen]);

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
            <Alert color="danger" toggle={() => setError("")}>
              {error}
            </Alert>
          )}
          <Button 
            color="info" 
            onClick={handleSendVerificationEmail}
            disabled={sendingEmail}
            className="mt-3"
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
        <div className="text-center mb-4">
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
          <Alert color="danger" toggle={() => setError("")}>
            {error}
          </Alert>
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
          />
          <small className="form-text text-muted">
            <i className="fas fa-info-circle mr-1"></i>
            Enter the 6-digit code sent to your email address
          </small>
        </FormGroup>

        <div className="text-center mt-4">
          <Button color="secondary" className="mr-2" onClick={toggle} type="button">
            <i className="fas fa-times mr-1"></i> Cancel
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
            disabled={sendingEmail || countdown > 0}
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
  );
};

export default DirectOTPModal;