import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { theme } from "../../data/theme";

const ProfileButton = ({ openLoginModal }) => {
  const { isAuthenticated, user, logout } = useAuth();

  if (isAuthenticated) {
    // Render profile avatar with dropdown for logged-in users
    return (
      <div style={{ position: "relative" }}>
        <button
          style={{
            background: "none",
            border: "none",
            padding: 0,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: theme.colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: theme.typography.fontWeights.medium,
              fontSize: theme.typography.sizes.sm,
              border: `2px solid #fff`,
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        </button>

        {/* Dropdown menu would appear here - implement with state as needed */}
      </div>
    );
  } else {
    // Render login button for non-authenticated users
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => openLoginModal()}
        style={{
          backgroundColor: theme.colors.primary,
          color: "#fff",
          border: "none",
          borderRadius: theme.borderRadius.pill,
          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.xs,
          fontSize: theme.typography.sizes.sm,
          fontWeight: theme.typography.fontWeights.medium,
          cursor: "pointer",
        }}
      >
        <span className="material-icons" style={{ fontSize: "16px" }}>
          login
        </span>
        Login
      </motion.button>
    );
  }
};

export default ProfileButton;
