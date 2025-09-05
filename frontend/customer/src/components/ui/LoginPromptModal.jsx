import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";

const LoginPromptModal = ({ isOpen, onClose, onLogin }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
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
              zIndex: 2000,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: "30%", 
              transform: "translate(-50%, -50%)",
              backgroundColor: "white",
              borderRadius: theme.borderRadius.xl,
              padding: window.innerWidth <= 480 ? "24px" : "32px", // Smaller padding on very small screens
              maxWidth: "400px",
              width: "calc(100vw - 32px)", // Better responsive width
              maxHeight: "90vh", // Prevent overflow on small screens
              overflowY: "auto", // Allow scrolling if content is too tall
              boxShadow: theme.shadows.xl,
              zIndex: 2001,
              // Ensure proper centering even on very small screens
              minWidth: "280px", // Minimum width for readability
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: window.innerWidth <= 480 ? "20px" : "24px", // Smaller margin on very small screens
              }}
            >
              <div
                style={{
                  width: window.innerWidth <= 480 ? "56px" : "64px", // Smaller icon container on very small screens
                  height: window.innerWidth <= 480 ? "56px" : "64px",
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: window.innerWidth <= 480 ? "0 auto 12px" : "0 auto 16px",
                }}
              >
                <span
                  className="material-icons"
                  style={{
                    fontSize: window.innerWidth <= 480 ? "28px" : "32px", // Smaller icon on very small screens
                    color: 'white',
                  }}
                >
                  favorite
                </span>
              </div>

              <h2
                style={{
                  fontSize: window.innerWidth <= 480 ? theme.typography.sizes.lg : theme.typography.sizes.xl, // Smaller title on very small screens
                  fontWeight: theme.typography.fontWeights.bold,
                  color: theme.colors.text.primary,
                  margin: "0 0 8px 0",
                }}
              >
                Login to Save Favorites
              </h2>

              <p
                style={{
                  fontSize: window.innerWidth <= 480 ? theme.typography.sizes.sm : theme.typography.sizes.md, // Smaller text on very small screens
                  color: theme.colors.text.secondary,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Create an account or log in to save your favorite dishes and easily reorder them later.
              </p>
            </div>

            {/* Benefits */}
            <div
              style={{
                marginBottom: window.innerWidth <= 480 ? "20px" : "24px", // Smaller margin on very small screens
              }}
            >
              {[
                "Save your favorite dishes",
                "Quick reorder from favorites",
                "Personalized recommendations",
                "Order history tracking",
              ].map((benefit, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: window.innerWidth <= 480 ? "8px" : "12px", // Smaller gap on very small screens
                    marginBottom: window.innerWidth <= 480 ? "6px" : "8px",
                  }}
                >
                  <span
                    className="material-icons"
                    style={{
                      fontSize: window.innerWidth <= 480 ? "16px" : "18px", // Smaller icons on very small screens
                      color: theme.colors.success,
                      flexShrink: 0, // Prevent icon from shrinking
                    }}
                  >
                    check_circle
                  </span>
                  <span
                    style={{
                      fontSize: window.innerWidth <= 480 ? theme.typography.sizes.xs : theme.typography.sizes.sm, // Smaller text on very small screens
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: window.innerWidth <= 480 ? "8px" : "12px", // Smaller gap on very small screens
                flexDirection: "column",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogin}
                style={{
                  width: "100%",
                  padding: window.innerWidth <= 480 ? "10px 20px" : "12px 24px", // Smaller padding on very small screens
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: theme.borderRadius.md,
                  fontSize: window.innerWidth <= 480 ? theme.typography.sizes.sm : theme.typography.sizes.md, // Smaller font on very small screens
                  fontWeight: theme.typography.fontWeights.bold,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  minHeight: "44px", // Ensure minimum touch target size
                }}
              >
                <span className="material-icons" style={{ fontSize: window.innerWidth <= 480 ? "18px" : "20px" }}>
                  login
                </span>
                Login / Sign Up
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: window.innerWidth <= 480 ? "10px 20px" : "12px 24px", // Smaller padding on very small screens
                  backgroundColor: "transparent",
                  color: theme.colors.text.secondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: window.innerWidth <= 480 ? theme.typography.sizes.sm : theme.typography.sizes.md, // Smaller font on very small screens
                  fontWeight: theme.typography.fontWeights.medium,
                  cursor: "pointer",
                  minHeight: "44px", // Ensure minimum touch target size
                }}
              >
                Continue Browsing
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LoginPromptModal;
