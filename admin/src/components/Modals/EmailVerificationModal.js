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

// Track whether verification has already been processed
let verificationProcessed = false;

const EmailVerificationModal = ({ isOpen, toggle, onVerified }) => {
  const { user, confirmVerification, resendVerificationEmail } = useContext(AuthContext);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showOtpMsg, setShowOtpMsg] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Reset states when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      console.log("Email verification modal opened");
      // Only reset verification-related states
      setVerificationCode("");
      setError("");
      
      // Clear any existing verification processed flag
      verificationProcessed = false;
      
      // Auto-send verification email when modal first opens
      if (!emailSent && user?.email) {
        handleSendVerificationEmail();
      }
    } else {
      // When modal closes, keep success state but reset email sent flag
      setEmailSent(false);
      setShowOtpMsg(false);
      setCountdown(0);
    }
  }, [isOpen, user]);

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

  const handleSendVerificationEmail = async (e) => {
    // Prevent default to avoid form submission
    if (e && e.preventDefault) e.preventDefault();
    
    if (!user?.email) return;
    
    setLoading(true);
    setError("");
    
    try {
      console.log("Sending verification email to:", user.email);
      
      // Use the specialized resendVerificationEmail function
      const result = await resendVerificationEmail(user.email);
      
      if (result && result.success) {
        setEmailSent(true);
        setShowOtpMsg(true);
        // Set a 60 second cooldown for resend button
        setCountdown(60);
      } else {
        throw new Error("Failed to send verification email");
      }
    } catch (err) {
      console.error("Error sending verification email:", err);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // Reset any previous verification code
    setVerificationCode("");
    await handleSendVerificationEmail();
  };

  const handleSubmitVerification = async (e) => {
    // Prevent form submission which might cause page refresh
    if (e && e.preventDefault) e.preventDefault();
    
    // Skip if already processed to prevent double submission
    if (verificationProcessed) {
      console.log("Verification already processed, skipping");
      return;
    }
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await confirmVerification(verificationCode);
      
      if (result.success) {
        // Mark as processed to prevent duplicate processing
        verificationProcessed = true;
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
        
        // Call the onVerified callback after a delay if provided
        if (typeof onVerified === 'function') {
          setTimeout(() => {
            onVerified();
          }, 1500);
        }
        
        // Close the modal without reloading
        setTimeout(() => {
          toggle();
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

  // Add keyboard event handler for easy submission
  const handleKeyDown = (e) => {
    // Submit on Enter key if code is 6 digits
    if (e.key === 'Enter' && verificationCode.length === 6 && !loading) {
      handleSubmitVerification(e);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="md" zIndex={1050} backdrop="static" keyboard={false}>
      <ModalHeader toggle={toggle} className="bg-gradient-info text-white">
        <div>
          <h4 className="mb-0 text-white font-weight-bold">
            <i className="fas fa-envelope mr-2"></i>Verify Your Email
          </h4>
          <p className="text-white-50 mb-0 small">
            Verify your email address to unlock all features
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
        ) : !emailSent ? (
          <div className="text-center py-4">
            <div className="icon icon-shape icon-shape-info rounded-circle mb-3">
              <i className="fas fa-envelope fa-2x"></i>
            </div>
            <h4>Send Verification Code</h4>
            <p className="text-muted">
              We'll send a verification code to <strong>{user?.email}</strong>
            </p>
            {error && (
              <Alert color="danger" toggle={() => setError("")}>
                {error}
              </Alert>
            )}
            <Button 
              color="info" 
              onClick={handleSendVerificationEmail}
              disabled={loading}
            >
              {loading ? (
                <><Spinner size="sm" className="mr-1" /> Sending...</>
              ) : (
                <><i className="fas fa-paper-plane mr-1"></i> Send Verification Code</>
              )}
            </Button>
          </div>
        ) : (
          <Form onSubmit={handleSubmitVerification}>
            <div className="text-center mb-4">
              <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
                <i className="fas fa-shield-alt fa-2x"></i>
              </div>
              <h4>Enter Verification Code</h4>
              <p className="text-muted">
                We've sent a verification code to <strong>{user?.email}</strong>
              </p>
            </div>

            {error && (
              <Alert color="danger" toggle={() => setError("")}>
                {error}
              </Alert>
            )}

            {showOtpMsg && (
              <Alert color="success" toggle={() => setShowOtpMsg(false)}>
                <i className="fas fa-check-circle mr-1"></i> Verification code sent! Please check your email.
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
                disabled={loading || countdown > 0}
                type="button"
              >
                <i className="fas fa-paper-plane mr-1"></i> 
                {countdown > 0 ? `Resend available in ${countdown}s` : "Resend verification code"}
              </Button>
            </div>
          </Form>
        )}
      </ModalBody>
    </Modal>
  );
};

export default EmailVerificationModal;