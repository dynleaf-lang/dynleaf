import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { theme } from "../../data/theme";

const CheckoutAuth = ({ isOpen, onClose, onLoginClick, onSignupClick }) => {
  const { isAuthenticated } = useAuth();
  const { cartItems } = useCart();

  // If user becomes authenticated while modal is open, close it
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  const handleLogin = () => {
    onClose();
    onLoginClick();
  };

  const handleSignup = () => {
    onClose();
    onSignupClick();
  };

  const handleGuestCheckout = () => {
    // Store cart data in local storage for later retrieval
    localStorage.setItem("pendingCart", JSON.stringify(cartItems));
    // Allow checkout to continue without authentication
    onClose();
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
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#fff",
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.lg,
              padding: theme.spacing.lg,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span
                className="material-icons"
                style={{
                  fontSize: "48px",
                  color: theme.colors.primary,
                  marginBottom: theme.spacing.md,
                }}
              >
                account_circle
              </span>

              <h3
                style={{
                  fontSize: theme.typography.sizes.xl,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                }}
              >
                Login to Complete Checkout
              </h3>

              <p
                style={{
                  fontSize: theme.typography.sizes.md,
                  color: theme.colors.text.secondary,
                  marginBottom: theme.spacing.lg,
                  maxWidth: "300px",
                }}
              >
                Please login or create an account to complete your order and track its progress
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  gap: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                }}
              >
                <button
                  onClick={handleLogin}
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: theme.colors.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.md,
                    cursor: "pointer",
                  }}
                >
                  Login
                </button>

                <button
                  onClick={handleSignup}
                  style={{
                    padding: theme.spacing.md,
                    backgroundColor: "transparent",
                    color: theme.colors.primary,
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.sizes.md,
                    cursor: "pointer",
                  }}
                >
                  Create Account
                </button>
              </div>

              <button
                onClick={onClose}
                style={{
                  padding: theme.spacing.md,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.secondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.sizes.md,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: theme.spacing.sm,
                }}
              >
                <span className="material-icons" style={{ fontSize: "18px" }}>arrow_back</span>
                Back to Cart
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutAuth;
