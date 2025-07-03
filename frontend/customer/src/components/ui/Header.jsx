import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";
import { useAuth } from "../../context/AuthContext";
import ProfileButton from "../auth/ProfileButton";

const Header = ({ profileSrc, isDesktop, restaurantName, branchName, tableNumber, openLoginModal }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);
  const { isMobile, isTablet } = useResponsive();
  const { isAuthenticated, user } = useAuth();
  
  // Only show restaurant info in header on mobile views
  // (on desktop/tablet it's shown in the sidebar)
  const showRestaurantInfo = isMobile && restaurantName;
  
  const toggleNotifications = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setNotificationsOpen(!notificationsOpen);
    if (notificationsOpen) {
      setNotificationCount(0);
    }
  };
  
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: isMobile ? "#FFFFFF" : `${theme.colors.background}99`,
        boxShadow: isMobile ? theme.shadows.sm : theme.shadows.md,
        borderRadius: isMobile ? 
          0 : 
          `${theme.borderRadius.md}`,
        padding: isMobile ? 
          `${theme.spacing.sm} ${theme.spacing.sm} ${theme.spacing.xs}` : 
          `${theme.spacing.md} ${theme.spacing.lg}`,
        marginBottom: theme.spacing.md,
        width: isMobile ? "100%" : "calc(100% - 40px)",
        marginLeft: isMobile ? 0 : "20px",
        marginRight: isMobile ? 0 : "20px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 0 : theme.spacing.sm,
        maxWidth: isMobile ? "none" : "1400px",
        margin: isMobile ? 0 : `${theme.spacing.md} auto`
      }}
    >
      {/* Main Header Content */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {isMobile && (
            <h1
              style={{
                fontFamily: theme.typography.fontFamily.display,
                fontSize: "24px",
                margin: 0,
                color: theme.colors.secondary,
                userSelect: "none",
                letterSpacing: "-0.5px",
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              <span className="material-icons" style={{ fontSize: "24px", color: theme.colors.primary }}>
                restaurant
              </span>
              Order<span style={{ color: theme.colors.primary }}>Ease</span>
            </h1>
          )}
          
          {/* For Medium/Large screens, show page title or greeting */}
          {!isMobile && (
            <div>
              <h2 style={{
                fontSize: theme.typography.sizes.xl,
                fontWeight: theme.typography.fontWeights.semibold,
                margin: 0,
                color: theme.colors.text.primary,
                fontFamily: theme.typography.fontFamily.display
              }}>
                Welcome to OrderEase
              </h2>
              <p style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                margin: 0,
                marginTop: theme.spacing.xs
              }}>
                Order your favorite dishes with ease
              </p>
            </div>
          )}
        </div>

        {/* Right-side Actions */}
        <div style={{
          display: "flex", 
          alignItems: "center",
          gap: theme.spacing.md
        }}>
          {/* Show notification icon */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            style={{ 
              position: "relative",
              cursor: "pointer"
            }}
            onClick={toggleNotifications}
          >
            {/* Notification Bell */}
            <span className="material-icons" style={{
              color: theme.colors.text.secondary,
              fontSize: "24px"
            }}>
              {notificationCount > 0 ? "notifications_active" : "notifications"}
            </span>
            
            {/* Notification Count Badge */}
            {notificationCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: theme.colors.primary,
                color: "#fff",
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: theme.typography.fontWeights.bold
              }}>
                {notificationCount}
              </span>
            )}
          </motion.div>

          {/* Profile Button (Login or Profile Avatar) */}
          <ProfileButton openLoginModal={openLoginModal} />
        </div>
      </div>
      
      {/* Restaurant Info (Mobile Only) */}
       
      
      {/* For medium/large screens - secondary navigation row */}
      {!isMobile && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: theme.spacing.lg,
          borderTop: `1px solid ${theme.colors.divider}`,
          paddingTop: theme.spacing.md,
          marginTop: theme.spacing.xs
        }}>
          <button style={{
            background: "transparent",
            border: "none",
            color: theme.colors.primary,
            fontWeight: theme.typography.fontWeights.semibold,
            fontSize: theme.typography.sizes.sm,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs,
            position: "relative"
          }}>
            <span className="material-icons" style={{ fontSize: "20px" }}>restaurant_menu</span>
            Menu
            <div style={{
              position: "absolute",
              bottom: "-8px",
              left: "0",
              right: "0",
              height: "2px",
              backgroundColor: theme.colors.primary,
              borderRadius: "2px"
            }} />
          </button>
          
          <button style={{
            background: "transparent",
            border: "none",
            color: theme.colors.text.secondary,
            fontWeight: theme.typography.fontWeights.medium,
            fontSize: theme.typography.sizes.sm,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs
          }}>
            <span className="material-icons" style={{ fontSize: "20px" }}>star</span>
            Featured
          </button>
          
          <button style={{
            background: "transparent",
            border: "none",
            color: theme.colors.text.secondary,
            fontWeight: theme.typography.fontWeights.medium,
            fontSize: theme.typography.sizes.sm,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs
          }}>
            <span className="material-icons" style={{ fontSize: "20px" }}>receipt_long</span>
            Orders
          </button>
          
          <button style={{
            background: "transparent",
            border: "none",
            color: theme.colors.text.secondary,
            fontWeight: theme.typography.fontWeights.medium,
            fontSize: theme.typography.sizes.sm,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs
          }}>
            <span className="material-icons" style={{ fontSize: "20px" }}>favorite</span>
            Favorites
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;