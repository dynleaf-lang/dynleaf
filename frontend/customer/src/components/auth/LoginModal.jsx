import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";

const LoginModal = ({ isOpen, onClose }) => {
  const { 
    login, 
    verifyOTP, 
    requestNewOTP, 
    otpExpired, 
    timeRemaining,
    authError 
  } = useAuth();
  const { restaurant, branch } = useRestaurant();
  const { syncCartWithUser } = useCart();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("identifier"); // identifier, otp
  const [requestingNewOTP, setRequestingNewOTP] = useState(false);
  
  // Validation states (only updated on blur, not during typing)
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    otp: ""
  });

  // Reset form state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset all form state when modal opens
      setIdentifier("");
      setOtp("");
      setLoading(false);
      setLoadingMessage("");
      setError("");
      setStep("identifier");
      setFieldErrors({
        identifier: "",
        otp: ""
      });
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose, loading]);

  // Enhanced stable input component with validation styling and accessibility
  const StableInput = useCallback(({ label, value, onChange, onBlur, placeholder, disabled, id, error, type = "text", ariaDescribedBy }) => {
    const hasError = error && error.length > 0;
    const hasValue = value && value.length > 0;
    const isValid = hasValue && !hasError;
    
    return (
      <div style={{ marginBottom: "20px" }}>
        <label 
          htmlFor={id}
          style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontSize: "14px", 
            color: hasError ? "#EF4444" : "#64748B",
            fontWeight: "500",
            transition: "color 0.2s ease",
            textAlign: "left"
          }}
        >
          {label}
        </label>
        <div style={{ position: "relative" }}>
          <input
            id={id}
            type={type}
            value={value || ""}
            onChange={onChange}
            onBlur={(e) => {
              // Handle focus styling
              e.target.style.borderColor = hasError ? "#EF4444" : isValid ? "#10B981" : "#E2E8F0";
              e.target.style.boxShadow = "none";
              // Call custom onBlur handler
              if (onBlur) onBlur(e);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            aria-invalid={hasError}
            aria-describedby={ariaDescribedBy}
            role="textbox"
            style={{
              width: "100%",
              padding: "12px 16px",
              paddingRight: isValid ? "45px" : "16px",
              border: `2px solid ${hasError ? "#EF4444" : isValid ? "#10B981" : "#E2E8F0"}`,
              borderRadius: "8px",
              fontSize: "16px",
              boxSizing: "border-box",
              backgroundColor: disabled ? "#F8FAFC" : "#FFFFFF",
              color: "#1E293B",
              outline: "none",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              if (!hasError) {
                e.target.style.borderColor = "#E03151";
                e.target.style.boxShadow = "0 0 0 3px rgba(224, 49, 81, 0.1)";
              }
            }}
          />
          
          {/* Success indicator */}
          {isValid && (
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#10B981",
                fontSize: "16px",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              ✓
            </div>
          )}
        </div>
        
        {/* Error message */}
        {hasError && (
          <div
            style={{
              marginTop: "6px",
              fontSize: "12px",
              color: "#EF4444",
              fontWeight: "500",
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }, []);

  // Validation functions (only called on blur, not during typing)
  const validateIdentifier = useCallback((identifierValue) => {
    if (!identifierValue.trim()) return "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifierValue);
    const isPhone = /^[\+]?[1-9][\d]{3,14}$/.test(identifierValue.replace(/[\s\-\(\)]/g, ''));
    if (!isEmail && !isPhone) return "Please enter a valid email address or phone number";
    return "";
  }, []);

  const validateOtp = useCallback((otpValue) => {
    if (!otpValue.trim()) return "";
    if (!/^\d{4,6}$/.test(otpValue)) return "OTP must be 4-6 digits";
    return "";
  }, []);

  // Memoized onChange handlers with validation on blur
  const handleIdentifierChange = useCallback((e) => {
    const value = e.target.value;
    setIdentifier(value);
    // Clear error when user starts typing
    if (fieldErrors.identifier) {
      setFieldErrors(prev => ({ ...prev, identifier: "" }));
    }
  }, [fieldErrors.identifier]);

  const handleIdentifierBlur = useCallback((e) => {
    const error = validateIdentifier(e.target.value);
    setFieldErrors(prev => ({ ...prev, identifier: error }));
  }, [validateIdentifier]);

  const handleOtpChange = useCallback((e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    // Clear error when user starts typing
    if (fieldErrors.otp) {
      setFieldErrors(prev => ({ ...prev, otp: "" }));
    }
  }, [fieldErrors.otp]);

  const handleOtpBlur = useCallback((e) => {
    const error = validateOtp(e.target.value);
    setFieldErrors(prev => ({ ...prev, otp: error }));
  }, [validateOtp]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      setError("Please enter your email or phone number");
      return;
    }
    
    // Basic email/phone validation
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^[\+]?[1-9][\d]{3,14}$/.test(identifier.replace(/[\s\-\(\)]/g, ''));
    
    if (!isEmail && !isPhone) {
      setError("Please enter a valid email address or phone number");
      return;
    }
    
    // Check if restaurant and branch data is available
    if (!restaurant || !branch) {
      setError("Restaurant information not available. Please try again.");
      return;
    }
    
    setLoading(true);
    setLoadingMessage("Checking account...");
    setError("");
    
    try {
      // Use the login function which now handles OTP flow
      const result = await login({ 
        identifier,
        restaurantId: restaurant._id,
        branchId: branch._id,
      });
      
      if (!result.success) {
        if (result.error?.shouldRegister) {
          setLoadingMessage("Customer not found...");
          setTimeout(() => {
            setError(`${result.error.message} Click "Sign Up" below to create an account.`);
            setLoading(false);
          }, 800);
          return;
        } else {
          throw new Error(result.error?.message || "Error sending OTP");
        }
      }
      
      // Check if OTP is required
      if (result.requiresOTP) {
        setLoadingMessage("Sending OTP...");
        setTimeout(() => {
          setStep("otp");
          setLoading(false);
        }, 500);
      } else {
        // Direct login successful
        onClose();
        syncCartWithUser().catch(err => {
          console.warn('Cart sync failed after login:', err);
        });
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      setError("Please enter the OTP sent to you");
      return;
    }
    
    if (!/^\d{4,6}$/.test(otp)) {
      setError("OTP must be 4-6 digits");
      return;
    }
    
    // Check if OTP has expired
    if (otpExpired) {
      setError("OTP has expired. Please request a new one.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Use the verifyOTP function from auth context with identifier
      const result = await verifyOTP(otp, identifier);
      
      if (!result.success) {
        throw new Error(result.error?.message || "Invalid OTP");
      }
      
      // Close modal on success
      onClose();
      
      // Sync cart items with user account after successful login (non-blocking)
      syncCartWithUser().catch(err => {
        console.warn('Cart sync failed after login:', err);
      });
      
    } catch (err) {
      setError(err.message || "Failed to verify OTP. Please try again.");
    }
    
    setLoading(false);
  };

  // Handle request new OTP
  const handleRequestNewOTP = async () => {
    setRequestingNewOTP(true);
    setError("");
    
    try {
      const result = await requestNewOTP(identifier);
      
      if (result.success) {
        setError(""); // Clear any previous errors
        // Could show a success message here
      } else {
        setError(result.error?.message || "Failed to send new OTP");
      }
    } catch (err) {
      setError("Failed to send new OTP. Please try again.");
    }
    
    setRequestingNewOTP(false);
  };

  // Format time remaining for display
  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {isOpen && (
        <div
          className="oe-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={onClose}
        >
          <div
            className="oe-glass-surface oe-glass-border oe-glass-shadow oe-promote"
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              padding: "24px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: theme.typography.sizes.xl,
                textAlign: "center",
                marginBottom: theme.spacing.md,
                color: theme.colors.text.primary,
                fontFamily: theme.typography.fontFamily.display,
              }}
            >
              {step === "identifier" ? "Login to Continue" : "Verify OTP"}
            </h2>

            {error && (
              <div
                style={{
                  padding: theme.spacing.sm,
                  backgroundColor: "#FEE2E2",
                  color: "#DC2626",
                  borderRadius: theme.borderRadius.md,
                  marginBottom: theme.spacing.md,
                  fontSize: theme.typography.sizes.sm,
                }}
              >
                {error}
              </div>
            )}

            {step === "identifier" ? (
              <form onSubmit={handleSendOTP}>
                <StableInput
                  id="login-identifier"
                  label="Email or Phone Number"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  onBlur={handleIdentifierBlur}
                  placeholder="Enter your email or phone number"
                  disabled={loading}
                  error={fieldErrors.identifier}
                  ariaDescribedBy={fieldErrors.identifier ? `identifier-error` : undefined}
                />

                <button
                  type="submit"
                  disabled={loading || !identifier || fieldErrors.identifier}
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: loading || !identifier || fieldErrors.identifier 
                      ? "#94A3B8" 
                      : "#E03151",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: loading || !identifier || fieldErrors.identifier 
                      ? "not-allowed" 
                      : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                    opacity: loading || !identifier || fieldErrors.identifier ? 0.7 : 1,
                  }}
                >
                  {loading && (
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid transparent",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  )}
                  {loading ? loadingMessage || "Checking account..." : "Get OTP"}
                </button>

                <div
                  style={{
                    marginTop: theme.spacing.md,
                    textAlign: "center",
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Don't have an account?{" "}
                  <button
                    onClick={() => onClose("signup")}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.colors.primary,
                      cursor: "pointer",
                      padding: 0,
                      font: "inherit",
                      textDecoration: "underline",
                    }}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <div style={{ 
                  textAlign: "center", 
                  marginBottom: theme.spacing.lg,
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.backgroundAlt,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                }}>
                  <p style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                    margin: 0,
                    lineHeight: theme.typography.lineHeights.relaxed,
                  }}>
                    We've sent a verification code to <br />
                    <strong style={{ color: theme.colors.text.primary }}>
                      {identifier}
                    </strong>
                  </p>
                </div>

                <StableInput
                  id="login-otp"
                  label="Verification Code"
                  type="text"
                  value={otp}
                  onChange={handleOtpChange}
                  onBlur={handleOtpBlur}
                  placeholder="Enter 4-6 digit code"
                  disabled={loading || otpExpired}
                  error={fieldErrors.otp}
                  ariaDescribedBy={fieldErrors.otp ? `otp-error` : undefined}
                />

                {/* OTP Timer and Status */}
                <div style={{
                  marginBottom: theme.spacing.md,
                  textAlign: "center",
                  fontSize: theme.typography.sizes.sm,
                }}>
                  {timeRemaining > 0 && !otpExpired ? (
                    <div style={{
                      color: timeRemaining <= 30 ? theme.colors.warning : theme.colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}>
                      <span className="material-icons" style={{ fontSize: "16px" }}>
                        schedule
                      </span>
                      Code expires in {formatTimeRemaining(timeRemaining)}
                    </div>
                  ) : otpExpired ? (
                    <div style={{
                      color: theme.colors.danger,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      marginBottom: theme.spacing.sm,
                    }}>
                      <span className="material-icons" style={{ fontSize: "16px" }}>
                        error_outline
                      </span>
                      Verification code has expired
                    </div>
                  ) : null}
                </div>

                {/* Error message display */}
                {(error || authError) && (
                  <div style={{
                    marginBottom: theme.spacing.md,
                    padding: theme.spacing.sm,
                    backgroundColor: "#FEE2E2",
                    color: "#B91C1C",
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.sm,
                    textAlign: "center",
                    border: "1px solid #FECACA",
                  }}>
                    {error || authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !otp || fieldErrors.otp || otpExpired}
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: loading || !otp || fieldErrors.otp || otpExpired
                      ? "#94A3B8" 
                      : "#E03151",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: loading || !otp || fieldErrors.otp || otpExpired
                      ? "not-allowed" 
                      : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                    opacity: loading || !otp || fieldErrors.otp || otpExpired ? 0.7 : 1,
                  }}
                >
                  {loading && (
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid transparent",
                        borderTop: "2px solid #fff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  )}
                  {loading ? "Verifying..." : otpExpired ? "Code Expired" : "Login"}
                </button>

                {/* Request New OTP Button */}
                {otpExpired && (
                  <button
                    type="button"
                    onClick={handleRequestNewOTP}
                    disabled={requestingNewOTP}
                    style={{
                      width: "100%",
                      padding: "14px",
                      marginTop: theme.spacing.sm,
                      backgroundColor: requestingNewOTP ? "#94A3B8" : theme.colors.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: requestingNewOTP ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {requestingNewOTP && (
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid transparent",
                          borderTop: "2px solid #fff",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                    <span className="material-icons" style={{ fontSize: "16px" }}>
                      refresh
                    </span>
                    {requestingNewOTP ? "Sending..." : "Send New Code"}
                  </button>
                )}

                <div
                  style={{
                    marginTop: theme.spacing.md,
                    textAlign: "center",
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {!otpExpired && timeRemaining > 0 ? (
                    <>
                      Didn't receive the code?{" "}
                      <button
                        type="button"
                        onClick={handleRequestNewOTP}
                        disabled={requestingNewOTP}
                        style={{
                          background: "none",
                          border: "none",
                          color: theme.colors.primary,
                          cursor: requestingNewOTP ? "not-allowed" : "pointer",
                          padding: 0,
                          font: "inherit",
                          textDecoration: "underline",
                          opacity: requestingNewOTP ? 0.7 : 1,
                        }}
                      >
                        {requestingNewOTP ? "Sending..." : "Resend"}
                      </button>
                    </>
                  ) : (
                    <>
                      Want to try a different number?{" "}
                      <button
                        type="button"
                        onClick={() => setStep("identifier")}
                        style={{
                          background: "none",
                          border: "none",
                          color: theme.colors.primary,
                          cursor: "pointer",
                          padding: 0,
                          font: "inherit",
                          textDecoration: "underline",
                        }}
                      >
                        Go back
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;
