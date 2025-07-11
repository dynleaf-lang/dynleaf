import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { theme } from "../../data/theme";

const ProfileButton = ({ openLoginModal, onProfileClick, user, isAuthenticated }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { logout } = useAuth();

  const handleProfileClick = () => {
    if (isAuthenticated) {
      if (onProfileClick) {
        onProfileClick();
      } else {
        // Toggle profile dropdown if no navigation handler provided
        setShowProfileMenu(!showProfileMenu);
      }
    } else {
      openLoginModal();
    }
  };

  if (isAuthenticated) {
    // Render enhanced profile avatar with dropdown for logged-in users
    return (
      <div style={{ position: "relative" }}>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ position: "relative" }}
        >
          <button
            onClick={handleProfileClick}
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              border: `2px solid rgba(255, 255, 255, 0.2)`,
              padding: "2px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              borderRadius: "50%",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.primary,
                fontWeight: theme.typography.fontWeights.semibold,
                fontSize: theme.typography.sizes.sm,
                position: "relative",
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"
              )}
            </div>
          </button>

          {/* Online indicator */}
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              width: "12px",
              height: "12px",
              backgroundColor: "#10b981",
              borderRadius: "50%",
              border: "2px solid #fff",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
        </motion.div>

        {/* Profile Dropdown Menu */}
        <AnimatePresence>
          {showProfileMenu && !onProfileClick && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: theme.spacing.sm,
                width: "220px",
                background: "#fff",
                borderRadius: theme.borderRadius.lg,
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                border: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              {/* Profile Header */}
              <div style={{
                padding: theme.spacing.md,
                borderBottom: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                background: `linear-gradient(135deg, ${theme.colors.primary}05, ${theme.colors.secondary}05)`,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: theme.typography.fontWeights.semibold,
                      fontSize: theme.typography.sizes.sm,
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h4 style={{
                      margin: 0,
                      fontSize: theme.typography.sizes.sm,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: theme.colors.text.primary,
                    }}>
                      {user?.name || "User"}
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.sizes.xs,
                      color: theme.colors.text.secondary,
                    }}>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Menu Items */}
              <div>
                {[
                  { icon: "person", label: "My Profile", action: () => {} },
                  { icon: "receipt_long", label: "Order History", action: () => {} },
                  { icon: "favorite", label: "Favorites", action: () => {} },
                  { icon: "settings", label: "Settings", action: () => {} },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    style={{
                      width: "100%",
                      padding: theme.spacing.md,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                      cursor: "pointer",
                      fontSize: theme.typography.sizes.sm,
                      color: theme.colors.text.primary,
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = `${theme.colors.primary}05`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: "20px" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout Button */}
              <div style={{
                borderTop: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                padding: theme.spacing.sm,
              }}>
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  style={{
                    width: "100%",
                    padding: theme.spacing.sm,
                    border: `1px solid ${theme.colors.error}30`,
                    background: `${theme.colors.error}10`,
                    borderRadius: theme.borderRadius.md,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.xs,
                    cursor: "pointer",
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.error,
                    fontWeight: theme.typography.fontWeights.medium,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = `${theme.colors.error}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = `${theme.colors.error}10`;
                  }}
                >
                  <span className="material-icons" style={{ fontSize: "18px" }}>
                    logout
                  </span>
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  } else {
    // Render enhanced login button for non-authenticated users
    return (
      <motion.button
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)"
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => openLoginModal()}
        style={{
          background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
          color: "#fff",
          border: "none",
          borderRadius: theme.borderRadius.pill,
          padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.xs,
          fontSize: theme.typography.sizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
        }}
      >
        <span className="material-icons" style={{ fontSize: "18px" }}>
          login
        </span>
        Login
        
        {/* Shimmer effect overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            transition: "left 0.6s ease",
            pointerEvents: "none",
          }}
        />
      </motion.button>
    );
  }
};

export default ProfileButton;
