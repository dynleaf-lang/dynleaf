/*!

=========================================================
* Argon Dashboard React - v1.2.4
=========================================================

* Product Page: https://www.creative-tim.com/product/argon-dashboard-react
* Copyright 2024 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/argon-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";

// reactstrap components
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Form,
  Input,
  InputGroupAddon,
  InputGroupText,
  InputGroup,
  Row,
  Col,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  Label
} from "reactstrap";

const Login = () => {
  // Initialize email with the remembered value if it exists
  const [email, setEmail] = useState(localStorage.getItem("rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("rememberedEmail"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Forgot password state
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Enter email, 2: Enter OTP, 3: Enter new password
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetAlert, setResetAlert] = useState({
    show: false,
    color: "",
    message: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const { login, isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/admin/index";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Remove the effect that's causing a rendering loop with Admin.js
  // Let Admin.js handle showing the verification modal instead
  
  // Set initial email for forgot password if available
  useEffect(() => {
    if (email) {
      setForgotPasswordData(prev => ({ ...prev, email }));
    }
  }, [email]);

  // Reset forgot password flow when modal is closed
  useEffect(() => {
    if (!forgotPasswordModal) {
      setForgotPasswordStep(1);
      setResetAlert({ show: false, color: "", message: "" });
      setPasswordErrors({});
    }
  }, [forgotPasswordModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const result = await login({ email, password, rememberMe });
      
      if (!result.success) {
        setError("Invalid email or password");
      } else {
        setLoginSuccess(true);
        // Show success message briefly before redirecting
        setTimeout(() => {
          // Navigate to the page the user was trying to access, or dashboard as default
          const from = location.state?.from?.pathname || "/admin/index";
          navigate(from, { replace: true });
        }, 500);
      }
    } catch (err) {
      setError("An error occurred during login. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordInputChange = (e) => {
    const { name, value } = e.target;
    setForgotPasswordData({
      ...forgotPasswordData,
      [name]: value
    });
    
    // Clear errors for this field
    if (passwordErrors[name]) {
      setPasswordErrors({
        ...passwordErrors,
        [name]: null
      });
    }
  };

  // Validate forgot password data based on current step
  const validateForgotPasswordData = () => {
    const errors = {};
    
    switch (forgotPasswordStep) {
      case 1:
        // Email validation for step 1
        if (!forgotPasswordData.email) {
          errors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(forgotPasswordData.email)) {
          errors.email = "Invalid email address";
        }
        break;
        
      case 2:
        // OTP validation for step 2
        if (!forgotPasswordData.otp) {
          errors.otp = "Verification code is required";
        } else if (!/^\d{6}$/.test(forgotPasswordData.otp)) {
          errors.otp = "Verification code must be 6 digits";
        }
        break;
        
      case 3:
        // Password validation for step 3
        if (!forgotPasswordData.newPassword) {
          errors.newPassword = "New password is required";
        } else if (forgotPasswordData.newPassword.length < 8) {
          errors.newPassword = "Password must be at least 8 characters long";
        } else if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/.test(forgotPasswordData.newPassword)) {
          errors.newPassword = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character";
        }
        
        if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
        break;
        
      default:
        break;
    }
    
    setPasswordErrors(errors);
    return errors;
  };

  // Initiate forgot password process
  const handleForgotPasswordRequest = async () => {
    // Validate email
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setResetLoading(true);
    try {
      // Request OTP for password reset
      await axios.post("/api/users/forgot-password", {
        email: forgotPasswordData.email
      });
      
      // Move to OTP verification step
      setForgotPasswordStep(2);
      setResetAlert({
        show: true,
        color: "info",
        message: "Verification code sent! Please check your email."
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setResetAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to send verification code. Please try again."
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Verify OTP for password reset
  const handleVerifyResetOtp = async () => {
    // Validate OTP
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setResetLoading(true);
    try {
      // Verify OTP
      await axios.post("/api/users/verify-reset-otp", {
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp
      });
      
      // Move to new password step
      setForgotPasswordStep(3);
      setResetAlert({
        show: true,
        color: "info",
        message: "Code verified! Set your new password now."
      });
    } catch (error) {
      console.error("Error verifying reset OTP:", error);
      setResetAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Invalid verification code. Please try again."
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Reset password with new password
  const handleResetPassword = async () => {
    // Validate new password
    const errors = validateForgotPasswordData();
    if (Object.keys(errors).length > 0) {
      return;
    }
    
    setResetLoading(true);
    try {
      // Reset password
      await axios.post("/api/users/reset-password", {
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      
      // Reset form and close modal
      setForgotPasswordData({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      setResetAlert({
        show: true,
        color: "success",
        message: "Password reset successful! You can now log in with your new password."
      });
      
      // Close modal after a short delay
      setTimeout(() => {
        setForgotPasswordModal(false);
        // Clear alert
        setResetAlert({
          show: false,
          color: "",
          message: ""
        });
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setResetAlert({
        show: true,
        color: "danger",
        message: error.response?.data?.message || "Failed to reset password. Please try again."
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Function to handle going back in the forgot password flow
  const handleBackStep = () => {
    if (forgotPasswordStep > 1) {
      setForgotPasswordStep(forgotPasswordStep - 1);
    }
  };

  // Render the forgot password modal based on current step
  const renderForgotPasswordModal = () => {
    return (
      <Modal isOpen={forgotPasswordModal} toggle={() => setForgotPasswordModal(false)} size="md">
        <ModalHeader toggle={() => setForgotPasswordModal(false)} className="bg-gradient-info text-white">
          <div>
            <h4 className="mb-0 text-white font-weight-bold">
              <i className="fas fa-key mr-2"></i>
              {forgotPasswordStep === 1 && "Forgot Password"}
              {forgotPasswordStep === 2 && "Verify Code"}
              {forgotPasswordStep === 3 && "Reset Password"}
            </h4>
            <p className="text-white-50 mb-0 small">
              {forgotPasswordStep === 1 && "Enter your email to reset your password"}
              {forgotPasswordStep === 2 && "Enter the verification code sent to your email"}
              {forgotPasswordStep === 3 && "Create a new password"}
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="pt-4 pb-3">
          {resetAlert.show && (
            <Alert color={resetAlert.color} toggle={() => setResetAlert({ ...resetAlert, show: false })}>
              {resetAlert.message}
            </Alert>
          )}

          {/* Step 1: Enter Email */}
          {forgotPasswordStep === 1 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
                  <i className="fas fa-unlock-alt fa-2x"></i>
                </div>
                <h4>Forgot Your Password?</h4>
                <p className="text-muted">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotEmail">Email Address</Label>
                <Input
                  className="form-control-alternative"
                  type="email"
                  name="email"
                  id="forgotEmail"
                  placeholder="Enter your email"
                  value={forgotPasswordData.email}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.email}
                />
                {passwordErrors.email && <div className="text-danger mt-1 small">{passwordErrors.email}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={() => setForgotPasswordModal(false)}>
                  <i className="fas fa-times mr-1"></i> Cancel
                </Button>
                <Button 
                  color="info" 
                  onClick={handleForgotPasswordRequest}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Sending...</>
                  ) : (
                    <><i className="fas fa-paper-plane mr-1"></i> Send Verification Code</>
                  )}
                </Button>
              </div>
            </Form>
          )}

          {/* Step 2: Enter OTP */}
          {forgotPasswordStep === 2 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
                  <i className="fas fa-shield-alt fa-2x"></i>
                </div>
                <h4>Enter Verification Code</h4>
                <p className="text-muted">
                  We've sent a verification code to <strong>{forgotPasswordData.email}</strong>
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotOtp">Verification Code</Label>
                <Input
                  className="form-control-alternative form-control-lg text-center"
                  type="text"
                  name="otp"
                  id="forgotOtp"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ fontSize: '24px', letterSpacing: '0.5rem' }}
                  value={forgotPasswordData.otp}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.otp}
                />
                {passwordErrors.otp && <div className="text-danger mt-1 small">{passwordErrors.otp}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={handleBackStep}>
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </Button>
                <Button 
                  color="info" 
                  onClick={handleVerifyResetOtp}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Verifying...</>
                  ) : (
                    <><i className="fas fa-check-circle mr-1"></i> Verify Code</>
                  )}
                </Button>
              </div>

              <div className="text-center mt-4">
                <Button 
                  color="link" 
                  size="sm"
                  onClick={handleForgotPasswordRequest}
                  disabled={resetLoading}
                >
                  <i className="fas fa-paper-plane mr-1"></i> Resend verification code
                </Button>
              </div>
            </Form>
          )}

          {/* Step 3: New Password */}
          {forgotPasswordStep === 3 && (
            <Form>
              <div className="text-center mb-4">
                <div className="icon icon-shape icon-shape-info rounded-circle mb-3 shadow">
                  <i className="fas fa-key fa-2x"></i>
                </div>
                <h4>Create New Password</h4>
                <p className="text-muted">
                  Enter your new password below
                </p>
              </div>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotNewPassword">New Password</Label>
                <Input
                  className="form-control-alternative"
                  type="password"
                  name="newPassword"
                  id="forgotNewPassword"
                  placeholder="Enter new password"
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.newPassword}
                />
                {passwordErrors.newPassword && <div className="text-danger mt-1 small">{passwordErrors.newPassword}</div>}
                <small className="form-text text-muted">
                  Password must be at least 8 characters long, contain uppercase and lowercase letters, numbers, and special characters.
                </small>
              </FormGroup>

              <FormGroup>
                <Label className="form-control-label" htmlFor="forgotConfirmPassword">Confirm New Password</Label>
                <Input
                  className="form-control-alternative"
                  type="password"
                  name="confirmPassword"
                  id="forgotConfirmPassword"
                  placeholder="Confirm new password"
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordInputChange}
                  invalid={!!passwordErrors.confirmPassword}
                />
                {passwordErrors.confirmPassword && <div className="text-danger mt-1 small">{passwordErrors.confirmPassword}</div>}
              </FormGroup>

              <div className="text-center mt-4">
                <Button color="secondary" className="mr-2" onClick={handleBackStep}>
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </Button>
                <Button 
                  color="info" 
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <><span className="spinner-border spinner-border-sm mr-1"></span> Resetting...</>
                  ) : (
                    <><i className="fas fa-check-double mr-1"></i> Reset Password</>
                  )}
                </Button>
              </div>
            </Form>
          )}
        </ModalBody>
      </Modal>
    );
  };

  return (
    <>
      <Col lg="5" md="7">
        <Card className="bg-secondary shadow border-0">
          <CardBody className="px-lg-5 py-lg-5">
            <div className="text-center text-muted mb-4">
              <small>Welcome to Food ordering system</small>
            </div>
            {error && <Alert color="danger">{error}</Alert>}
            {loginSuccess && <Alert color="success">Login successful! Redirecting...</Alert>}
            <Form role="form" onSubmit={handleSubmit}>
              <FormGroup className="mb-3">
                <InputGroup className="input-group-alternative">
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="ni ni-email-83" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </FormGroup>
              <FormGroup>
                <InputGroup className="input-group-alternative">
                  <InputGroupAddon addonType="prepend">
                    <InputGroupText>
                      <i className="ni ni-lock-circle-open" />
                    </InputGroupText>
                  </InputGroupAddon>
                  <Input
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </InputGroup>
              </FormGroup>
              <div className="custom-control custom-control-alternative custom-checkbox">
                <input
                  className="custom-control-input"
                  id="customCheckLogin"
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="custom-control-label"
                  htmlFor="customCheckLogin"
                >
                  <span className="text-muted">Remember me</span>
                </label>
              </div>
              <div className="text-center">
                <Button 
                  className="my-4" 
                  color="primary" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
        <Row className="mt-3">
          <Col xs="6">
            <a
              className="text-light"
              href="#pablo"
              onClick={(e) => {
                e.preventDefault();
                setForgotPasswordModal(true);
                setForgotPasswordData(prev => ({
                  ...prev,
                  email: email || ""
                }));
              }}
            >
              <small>Forgot password?</small>
            </a>
          </Col>
        </Row>
        
        {/* Forgot Password Modal */}
        {renderForgotPasswordModal()}

        {/* Email Verification Modal */}
        <Modal isOpen={verificationModalOpen} toggle={() => setVerificationModalOpen(false)} size="md">
          <ModalHeader toggle={() => setVerificationModalOpen(false)} className="bg-gradient-info text-white">
            <div>
              <h4 className="mb-0 text-white font-weight-bold">
                <i className="fas fa-envelope-open-text mr-2"></i>
                Email Verification Required
              </h4>
              <p className="text-white-50 mb-0 small">
                Please verify your email address to continue using your account.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="pt-4 pb-3 text-center">
            <i className="fas fa-exclamation-circle fa-3x text-warning mb-3"></i>
            <p className="text-muted mb-4">
              A verification link has been sent to your email address. Please check your inbox and click on the link to verify your email.
            </p>
            <Button color="info" onClick={() => setVerificationModalOpen(false)}>
              <i className="fas fa-check mr-1"></i> I Understand
            </Button>
          </ModalBody>
        </Modal>
      </Col>
    </>
  );
};

export default Login;
