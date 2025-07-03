import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";

const LoginModal = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const { restaurant, branch } = useRestaurant();
  const { syncCartWithUser } = useCart();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("identifier"); // identifier, otp

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!identifier) {
      setError("Please enter your email or phone number");
      return;
    }
    
    // Check if restaurant and branch data is available
    if (!restaurant || !branch) {
      setError("Restaurant information not available. Please try again.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // API call to request OTP
      const response = await fetch("/api/customers/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier,
          restaurantId: restaurant._id,
          branchId: branch._id,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error sending OTP");
      }
      
      setStep("otp");
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    }
    
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      setError("Please enter the OTP sent to you");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Login with the OTP
      const result = await login({ identifier, otp });
      
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#fff",
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.lg,
              padding: theme.spacing.lg,
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
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label
                    htmlFor="identifier"
                    style={{
                      display: "block",
                      marginBottom: theme.spacing.xs,
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    Email or Phone Number
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or phone number"
                    style={{
                      width: "100%",
                      padding: theme.spacing.sm,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: theme.typography.sizes.md,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.md,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Sending OTP..." : "Get OTP"}
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
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label
                    htmlFor="otp"
                    style={{
                      display: "block",
                      marginBottom: theme.spacing.xs,
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    One-Time Password (OTP)
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP sent to your email/phone"
                    style={{
                      width: "100%",
                      padding: theme.spacing.sm,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: theme.typography.sizes.md,
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.md,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>

                <div
                  style={{
                    marginTop: theme.spacing.md,
                    textAlign: "center",
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Didn't receive the code?{" "}
                  <button
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
                    Try again
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;
