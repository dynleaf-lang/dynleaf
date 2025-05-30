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
} from "reactstrap";
import { AuthContext } from "../../context/AuthContext";

/**
 * A reusable email verification modal component.
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} toggle - Function to toggle the modal visibility
 * @param {string} email - Email address to send verification code to
 * @param {function} onVerified - Callback function called when verification is successful
 * @param {string} title - Optional custom modal title
 * @param {string} subtitle - Optional custom modal subtitle
 * @param {string} successMessage - Optional custom success message
 * @param {string} successTitle - Optional custom success title
 * @param {Object} customStyle - Optional custom styles for the modal
 */
const EmailVerificationModal = ({ 
  isOpen, 
  toggle, 
  email, 
  onVerified,
  title = "Verify Your Email",
  subtitle = "Verify your email address to unlock all features",
  successTitle = "Email Verified Successfully!",
  successMessage = "Your email has been verified and your account is now fully activated.",
  customStyle = {}
}) => {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { confirmVerification, verifyEmail, resendVerificationEmail } = useContext(AuthContext);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      // Only reset the state when opening
      setVerificationCode("");
      setError("");
      setSuccess(false);
      
      // Send verification email when modal opens, but only if not already sent
      if (email && !emailSent) {
        handleSendVerificationEmail();
      }
    } else {
      // Reset the emailSent state when modal is closed
      setEmailSent(false);
    }
  }, [isOpen, email, emailSent]);

  const handleSendVerificationEmail = async () => {
    setLoading(true);
    setError("");
    
    try {
      await verifyEmail(email);
      setEmailSent(true);
    } catch (err) {
      console.error("Error sending verification email:", err);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await resendVerificationEmail(email);
      if (!result.success) {
        throw new Error("Failed to resend verification code");
      }
      setEmailSent(true);
    } catch (err) {
      console.error("Error resending verification email:", err);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await confirmVerification(verificationCode);
      
      if (result.success) {
        setSuccess(true);
        
        // Update localStorage directly to ensure changes are reflected immediately
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            userData.isEmailVerified = true;
            localStorage.setItem('user', JSON.stringify(userData));
            // Set bypass flag to prevent verification checks
            localStorage.setItem('bypassVerification', 'true');
          } catch (err) {
            console.error('Error updating local storage:', err);
          }
        }
        
        // Update UI to show user is verified
        if (typeof onVerified === 'function') {
          setTimeout(() => {
            onVerified();
          }, 1500);
        }
        
        // Close modal after delay without reloading page
        setTimeout(() => {
          toggle();
        }, 2000);
      } else {
        throw new Error(result.error?.response?.data?.message || "Verification failed");
      }
    } catch (err) {
      console.error("Error verifying email:", err);
      setError(err.response?.data?.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="md" style={{zIndex: 1050, ...customStyle}} className="verification-modal">
      <ModalHeader toggle={toggle} className="bg-gradient-info text-white">
        <div>
          <h4 className="mb-0 text-white font-weight-bold">
            <i className="fas fa-envelope mr-2"></i>{title}
          </h4>
          <p className="text-white-50 mb-0 small">
            {subtitle}
          </p>
        </div>
      </ModalHeader>
      <ModalBody className="pt-4 pb-3">
        {success ? (
          <div className="text-center py-4">
            <div className="icon icon-shape icon-shape-success rounded-circle mb-3">
              <i className="fas fa-check-circle fa-2x"></i>
            </div>
            <h4>{successTitle}</h4>
            <p className="text-muted">
              {successMessage}
            </p>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <div className="text-center mb-4">
              <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
                <i className="fas fa-shield-alt fa-2x"></i>
              </div>
              <h4>Enter Verification Code</h4>
              <p className="text-muted">
                We've sent a verification code to <strong>{email}</strong>
              </p>
            </div>

            {error && (
              <Alert color="danger" toggle={() => setError("")}>
                {error}
              </Alert>
            )}

            <FormGroup>
              <Label className="form-control-label" htmlFor="verificationCode">
                Verification Code
              </Label>
              <Input
                className="form-control-alternative form-control-lg text-center"
                type="text"
                id="verificationCode"
                placeholder="Enter 6-digit code"
                maxLength={6}
                style={{ fontSize: "24px", letterSpacing: "0.5rem" }}
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                autoComplete="off"
              />
              <small className="form-text text-muted">
                <i className="fas fa-info-circle mr-1"></i>
                Enter the 6-digit code sent to your email address
              </small>
            </FormGroup>

            <div className="text-center mt-4">
              <Button
                type="submit"
                color="info"
                disabled={loading || !verificationCode || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-1"></span>{" "}
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle mr-1"></i> Verify Email
                  </>
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <Button
                color="link"
                size="sm"
                onClick={handleResendVerificationEmail}
                disabled={loading}
              >
                <i className="fas fa-paper-plane mr-1"></i> Resend verification
                code
              </Button>
            </div>
          </Form>
        )}
      </ModalBody>
    </Modal>
  );
};

export default EmailVerificationModal;