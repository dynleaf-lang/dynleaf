import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";

const Header = ({ profileSrc, isDesktop, restaurantName, branchName, tableNumber }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);
  
  // Only show restaurant info in header on mobile and tablet views
  // (on desktop it's shown in the sidebar)
  const showRestaurantInfo = !isDesktop && restaurantName;
  
  const toggleNotifications = () => {
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
        backgroundColor: "#FFFFFF",
        boxShadow: theme.shadows.sm,
        borderBottomLeftRadius: theme.borderRadius.md,
        borderBottomRightRadius: theme.borderRadius.md,
        padding: `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.sm}`,
        marginBottom: theme.spacing.md,
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
          {!isDesktop && (
            <h1
              style={{
                fontFamily: theme.typography.fontFamily.display,
                fontSize: "28px",
                margin: 0,
                color: theme.colors.secondary,
                userSelect: "none",
                letterSpacing: "-0.5px",
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              <span className="material-icons" style={{ fontSize: "28px", color: theme.colors.primary }}>
                restaurant
              </span>
              Order<span style={{ color: theme.colors.primary }}>Ease</span>
            </h1>
          )}
          
          {showRestaurantInfo && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: "8px" }}
            >
              <p style={{ 
                margin: 0, 
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.text.primary,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span className="material-icons" style={{ fontSize: "16px" }}>
                  storefront
                </span>
                {restaurantName}
                {branchName && <span style={{ fontWeight: "normal" }}> • {branchName}</span>}
              </p>
              
              {tableNumber && (
                <p style={{ 
                  margin: "4px 0 0 0", 
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.secondary,
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px"
                }}>
                  <span className="material-icons" style={{ fontSize: "14px" }}>
                    table_restaurant
                  </span>
                  Table {tableNumber}
                </p>
              )}
            </motion.div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Notifications"
              onClick={toggleNotifications}
              style={{
                border: "none",
                background: notificationsOpen ? theme.colors.background : "transparent",
                color: notificationsOpen ? theme.colors.primary : theme.colors.text.secondary,
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <span className="material-icons">notifications</span>
              {notificationCount > 0 && (
                <span
                  style={{
                    backgroundColor: theme.colors.primary,
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "3px",
                    right: "3px",
                    fontSize: "10px",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: theme.typography.fontWeights.bold,
                    border: "2px solid white",
                  }}
                >
                  {notificationCount}
                </span>
              )}
            </motion.button>
            
            {/* Dropdown notifications panel */}
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "absolute",
                    top: "48px",
                    right: "-10px",
                    backgroundColor: "white",
                    borderRadius: theme.borderRadius.md,
                    boxShadow: theme.shadows.lg,
                    width: "280px",
                    zIndex: 1001,
                    overflow: "hidden"
                  }}
                >
                  <div style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <h4 style={{ margin: 0 }}>Notifications</h4>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: theme.typography.sizes.xs,
                        color: theme.colors.primary,
                        cursor: "pointer"
                      }}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      Mark all as read
                    </button>
                  </div>
                  
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <div style={{ 
                      padding: theme.spacing.md, 
                      borderBottom: `1px solid ${theme.colors.border}`,
                      backgroundColor: "#f9f9f9"  
                    }}>
                      <div style={{ 
                        display: "flex", 
                        gap: theme.spacing.sm,
                        alignItems: "flex-start"
                      }}>
                        <span className="material-icons" style={{ 
                          color: theme.colors.primary, 
                          backgroundColor: `${theme.colors.primary}15`,
                          padding: "6px",
                          borderRadius: "50%"
                        }}>
                          local_offer
                        </span>
                        <div>
                          <p style={{ margin: 0, fontWeight: theme.typography.fontWeights.medium }}>
                            15% Off Weekend Special
                          </p>
                          <p style={{ 
                            margin: "4px 0 0", 
                            fontSize: theme.typography.sizes.xs,
                            color: theme.colors.text.secondary
                          }}>
                            Valid until Sunday
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: theme.spacing.md,
                      borderBottom: `1px solid ${theme.colors.border}` 
                    }}>
                      <div style={{ 
                        display: "flex", 
                        gap: theme.spacing.sm,
                        alignItems: "flex-start" 
                      }}>
                        <span className="material-icons" style={{ 
                          color: theme.colors.info, 
                          backgroundColor: `${theme.colors.info}15`,
                          padding: "6px",
                          borderRadius: "50%"
                        }}>
                          receipt_long
                        </span>
                        <div>
                          <p style={{ margin: 0, fontWeight: theme.typography.fontWeights.medium }}>
                            Your order is ready!
                          </p>
                          <p style={{ 
                            margin: "4px 0 0", 
                            fontSize: theme.typography.sizes.xs,
                            color: theme.colors.text.secondary
                          }}>
                            Order #2458 is ready for pickup.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border: `2px solid ${theme.colors.primary}30`,
              boxShadow: theme.shadows.sm,
            }}
          >
            <img
              src={profileSrc || "https://ui-avatars.com/api/?name=Guest&background=FF4757&color=fff"}
              alt="User profile"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;