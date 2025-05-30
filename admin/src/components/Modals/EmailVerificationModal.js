import React, { useState, useContext, useEffect } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  Alert,
  Spinner,
  Progress
} from "reactstrap";
import { AuthContext } from "../../context/AuthContext";

const EmailVerificationModal = ({ isOpen, toggle, onEmailSent }) => {
  const { user, resendVerificationEmail, emailToVerify } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
 
  

  // Get the email to use for verification
  const getEmailToVerify = () => {
    return emailToVerify || user?.email || '';
  };

  // Simulate progress for better UX
  useEffect(() => {
    let progressInterval;
    if (loading && progress < 90) {
      progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          const increment = Math.random() * 15;
          return Math.min(prevProgress + increment, 90);
        });
      }, 500);
    }
    return () => clearInterval(progressInterval);
  }, [loading, progress]);

  // Send verification email
  const handleSendVerificationEmail = async () => {
    const email = getEmailToVerify();
    console.log("Attempting to send verification email to:", email);
    
    setLoading(true);
    setProgress(0);
    setError("");
    setSuccess(false);
    
    try {
      const result = await resendVerificationEmail(email);
      
      if (result.success) {
        setProgress(100);
        setSuccess(true);
        
        // If onEmailSent callback is provided, call it
        if (typeof onEmailSent === 'function') {
          setTimeout(() => {
            onEmailSent(email);
          }, 1000);
        }
      } else {
        setError(result.message || "Failed to send verification email");
      }
    } catch (error) {
      console.error("Error sending verification:", error);
      setError(error.message || "An error occurred while sending the verification email");
    } finally {
      setLoading(false);
    }
  };

  // Auto-send when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("Email verification modal opened, auto-sending email");
      setError("");
      setProgress(0);
      setSuccess(false);
      handleSendVerificationEmail();
    }
  }, [isOpen]);

  return (
    <Modal 
      isOpen={isOpen} 
      toggle={toggle} 
      size="md" 
      zIndex={1050}
      backdrop="static" 
      keyboard={false}
    >
      <ModalHeader toggle={!loading && toggle} className="bg-gradient-info text-white">
        <div>
          <h4 className="mb-0 text-white font-weight-bold">
            <i className="fas fa-envelope mr-2"></i> 
            {success ? "Verification Code Sent!" : "Sending Verification Code"}
          </h4>
          <p className="text-white-50 mb-0 small">
            {success 
              ? "Check your email for the verification code" 
              : "We're sending a verification code to your email"}
          </p>
        </div>
      </ModalHeader>
      <ModalBody className="pt-4 pb-3">
        <div className="text-center py-4">
          <div className="icon icon-shape icon-shape-info rounded-circle mb-3">
            <i className={`fas ${success ? "fa-check" : "fa-paper-plane"} fa-2x`}></i>
          </div>
          <h4>{success ? "Verification Code Sent!" : "Sending Verification Code"}</h4>
          <p className="text-muted">
            {success
              ? `A verification code has been sent to ${getEmailToVerify()}`
              : `We're sending a verification code to ${getEmailToVerify()}`}
          </p>
          
          <div className="my-4">
            <Progress value={progress} color={success ? "success" : "info"} style={{ height: '8px' }} />
            {loading ? (
              <p className="text-muted small mt-2">
                <i className="fas fa-spinner fa-spin mr-1"></i> Please wait...
              </p>
            ) : success ? (
              <p className="text-success small mt-2">
                <i className="fas fa-check-circle mr-1"></i> Email sent successfully!
              </p>
            ) : null}
          </div>
          
          {error && (
            <div className="mt-3">
              <Alert color="danger" toggle={() => setError("")}>
                {error}
              </Alert>
              <Button 
                color="info" 
                onClick={handleSendVerificationEmail}
                disabled={loading}
              >
                <i className="fas fa-redo mr-1"></i> Try Again
              </Button>
            </div>
          )}
          
          {success && (
            <div className="mt-3">
              <Button color="success" onClick={toggle}>
                <i className="fas fa-check mr-1"></i> Continue
              </Button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default EmailVerificationModal;