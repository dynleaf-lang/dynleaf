import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useRestaurant } from "../../context/RestaurantContext";
import { theme } from "../../data/theme";

const SignupModal = ({ isOpen, onClose }) => {
  const { register, verifyOTP } = useAuth();
  const { restaurant, branch } = useRestaurant();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("signup"); // signup, verify-otp

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!name) {
      setError("Please enter your name");
      return;
    }
    
    if (!identifier) {
      setError("Please enter your email or phone number");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Check if restaurant and branch data is available
    if (!restaurant || !branch) {
      console.error('Restaurant context:', { restaurant, branch });
      setError("Restaurant information not available. Please try again.");
      setLoading(false);
      return;
    }
    
    console.log('Using restaurant:', restaurant._id, 'branch:', branch._id);
    
    try {
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      
      const userData = {
        name,
        [isEmail ? 'email' : 'phone']: identifier,
        restaurantId: restaurant._id,
        branchId: branch._id,
      };
      
      // Register user
      const result = await register(userData);
      
      if (!result.success) {
        throw new Error(result.error?.message || "Registration failed");
      }
      
      setStep("verify-otp");
    } catch (err) {
      setError(err.message || "Failed to register. Please try again.");
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
      // Verify OTP
      const result = await verifyOTP(otp);
      
      if (!result.success) {
        throw new Error(result.error?.message || "OTP verification failed");
      }
      
      // Close modal on success
      onClose();
    } catch (err) {
      console.error('OTP verification error:', err);
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
              {step === "signup" ? "Create Account" : "Verify OTP"}
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

            {step === "signup" ? (
              <form onSubmit={handleSignup}>
                <div style={{ marginBottom: theme.spacing.md }}>
                  <label
                    htmlFor="name"
                    style={{
                      display: "block",
                      marginBottom: theme.spacing.xs,
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                      width: "100%",
                      padding: theme.spacing.sm,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: theme.typography.sizes.md,
                    }}
                  />
                </div>

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
                  {loading ? "Registering..." : "Sign Up"}
                </button>

                <div
                  style={{
                    marginTop: theme.spacing.md,
                    textAlign: "center",
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.secondary,
                  }}
                >
                  Already have an account?{" "}
                  <button
                    onClick={() => onClose("login")}
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
                    Login
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
                  {loading ? "Verifying..." : "Complete Sign Up"}
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
                    onClick={() => setStep("signup")}
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

export default SignupModal;
