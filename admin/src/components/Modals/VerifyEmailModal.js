import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label,
  Alert,
  Spinner,
  Row,
  Col
} from 'reactstrap';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const VerifyEmailModal = ({ isOpen, toggle, email, onVerificationSuccess }) => {
  const { confirmVerification } = useContext(AuthContext);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  // References for individual OTP input fields
  const otpInputsRef = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer for OTP expiration
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Reset timer when modal opens
    setTimeLeft(600);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Timer for resend button
  useEffect(() => {
    if (resendCountdown <= 0) {
      setResendDisabled(false);
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Handle OTP input change for individual digits
  const handleOtpDigitChange = (index, value) => {
    // Only allow numbers
    if (!/^[0-9]?$/.test(value)) return;
    
    // Update the digit at this index
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);
    
    // Combine all digits to form the complete OTP
    setOtp(newOtpDigits.join(''));
    
    // Auto-focus next input if current input is filled
    if (value && index < 5) {
      otpInputsRef[index + 1].current.focus();
    }
  };

  // Handle backspace/delete in OTP input
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (!otpDigits[index] && index > 0) {
        // If current field is empty and backspace is pressed, focus previous field
        otpInputsRef[index - 1].current.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef[index - 1].current.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef[index + 1].current.focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    
    if (pasteData) {
      const newOtpDigits = [...otpDigits];
      for (let i = 0; i < pasteData.length; i++) {
        if (i < 6) {
          newOtpDigits[i] = pasteData[i];
        }
      }
      setOtpDigits(newOtpDigits);
      setOtp(pasteData);
      
      // Focus the next empty field or the last field
      const nextEmptyIndex = newOtpDigits.findIndex(digit => !digit);
      if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
        otpInputsRef[nextEmptyIndex].current.focus();
      } else {
        otpInputsRef[5].current.focus();
      }
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the AuthContext's confirmVerification function instead of direct API call
      // This ensures user state is properly updated throughout the application
      const result = await confirmVerification(otp);
      
      if (result.success) {
        console.log('Email verification successful through context API');
        setSuccess(true);
        
        // Apply changes to localStorage to ensure they take effect immediately
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            userData.isEmailVerified = true;
            localStorage.setItem('user', JSON.stringify(userData));
            console.log('Local storage updated with verified status');
            // Set bypass flag to prevent future verification attempts
            localStorage.setItem('bypassVerification', 'true');
          } catch (err) {
            console.error('Error updating local storage:', err);
          }
        }
        
        // Short delay before closing modal
        setTimeout(() => {
          if (onVerificationSuccess) {
            onVerificationSuccess();
          } else {
            // Don't reload the page, just close the modal
            toggle();
          }
        }, 1500);
      } else {
        setError('Verification failed. Please check your code and try again.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err?.response?.data?.message || 'Invalid or expired verification code. Please try again or request a new code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendDisabled(true);
    setResendCountdown(60); // Wait 60 seconds before allowing another resend
    setError(null);
    setResendSuccess(false);
    
    try {
      // Call API to resend OTP
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      await axios.post(`${apiUrl}/api/users/resend-otp`, { email });
      
      // Reset the main timer
      setTimeLeft(600);
      
      // Show success message
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
      
      // Reset OTP fields
      setOtp('');
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef[0].current.focus();
    } catch (err) {
      console.error('Error resending OTP:', err);
      setError(err?.response?.data?.message || 'Failed to send new verification code. Please try again later.');
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} backdrop="static" centered className="modal-sm">
      <ModalHeader toggle={!success ? toggle : null} className="bg-gradient-primary text-white">
        <i className="fas fa-envelope-open mr-2"></i>Verify Your Email
      </ModalHeader>
      <ModalBody className="px-4 py-4">
        {error && (
          <Alert color="danger" toggle={() => setError(null)} className="d-flex align-items-center">
            <i className="fas fa-exclamation-circle mr-2"></i> {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" className="d-flex align-items-center">
            <i className="fas fa-check-circle mr-2"></i> Email verified successfully! Redirecting you to the dashboard...
          </Alert>
        )}
        {resendSuccess && (
          <Alert color="info" className="d-flex align-items-center" toggle={() => setResendSuccess(false)}>
            <i className="fas fa-info-circle mr-2"></i> New verification code sent to your email.
          </Alert>
        )}

        <div className="text-center mb-4">
          <div className="icon icon-shape icon-shape-primary rounded-circle mb-3">
            <i className="fas fa-shield-alt fa-2x"></i>
          </div>
          <h4 className="mb-1">Email Verification</h4>
          <p className="text-muted">
            We've sent a verification code to <strong>{email}</strong>
          </p>
          
          <div className="d-inline-block px-3 py-2 rounded bg-light mb-3">
            <div className="d-flex align-items-center">
              <i className="fas fa-clock mr-2 text-muted"></i>
              <span className={`badge ${timeLeft > 180 ? 'badge-success' : timeLeft > 60 ? 'badge-warning' : 'badge-danger'} p-2`}>
                Expires in: {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {!success && (
          <>
            <Form onSubmit={handleVerify} className="mb-4">
              <FormGroup>
                <Label for="otp" className="font-weight-bold">Enter 6-Digit Verification Code</Label>
                <div className="d-flex justify-content-center my-3" onPaste={handlePaste}>
                  {otpDigits.map((digit, index) => (
                    <Input
                      key={index}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      innerRef={otpInputsRef[index]}
                      className="form-control-lg text-center font-weight-bold mx-1"
                      style={{
                        width: '50px',
                        height: '60px',
                        fontSize: '24px',
                        backgroundColor: digit ? '#f8f9fa' : 'white',
                        border: digit ? '2px solid #5e72e4' : '1px solid #cad1d7'
                      }}
                      disabled={loading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <div className="text-center text-muted mt-2">
                  <small>Enter the code you received via email</small>
                </div>
              </FormGroup>
            </Form>

            <div className="text-center">
              <p className="mb-1 text-muted"><small>Didn't receive the code?</small></p>
              <Button
                color="link"
                size="sm"
                onClick={handleResendOtp}
                disabled={resendDisabled || loading || timeLeft === 0}
                className="font-weight-bold"
              >
                {resendDisabled ? (
                  <><i className="fas fa-clock mr-1"></i> Resend code in {resendCountdown}s</>
                ) : (
                  <><i className="fas fa-paper-plane mr-1"></i> Resend verification code</>
                )}
              </Button>
            </div>
          </>
        )}
      </ModalBody>
      {!success && (
        <ModalFooter>
          <Button
            color="secondary"
            outline
            onClick={toggle}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleVerify}
            disabled={loading || otp.length !== 6 || timeLeft === 0}
          >
            {loading ? (
              <><Spinner size="sm" className="mr-1" /> Verifying...</>
            ) : (
              <><i className="fas fa-check-circle mr-1"></i> Verify Email</>
            )}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
};

export default VerifyEmailModal;