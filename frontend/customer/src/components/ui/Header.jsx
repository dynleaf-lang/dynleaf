import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";

const Header = ({ profileSrc, isDesktop, restaurantName, branchName, tableNumber }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);
  const { isMobile, isTablet } = useResponsive();
  
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

        {/* Right section with actions and profile */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isMobile ? "12px" : "16px"
        }}>
          {/* Search button - only on medium/large screens */}
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: "#FFFFFF",
                color: theme.colors.text.secondary,
                cursor: "pointer",
                boxShadow: theme.shadows.sm,
                transition: "all 0.2s ease"
              }}
            >
              <span className="material-icons">search</span>
              <span style={{
                fontSize: theme.typography.sizes.sm,
                fontWeight: theme.typography.fontWeights.medium
              }}>
                Search menu...
              </span>
            </motion.button>
          )}

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Notifications"
              onClick={toggleNotifications}
              style={{
                border: "none",
                background: notificationsOpen ? 
                  (isMobile ? theme.colors.background : `${theme.colors.primary}15`) : 
                  (isMobile ? "transparent" : "#FFFFFF"),
                color: notificationsOpen ? theme.colors.primary : theme.colors.text.secondary,
                width: isMobile ? "44px" : "40px",
                height: isMobile ? "44px" : "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                boxShadow: notificationsOpen || !isMobile ? theme.shadows.sm : "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation"
              }}
            >
              <span className="material-icons" style={{ fontSize: isMobile ? "24px" : "22px" }}>notifications</span>
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
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
                    right: isMobile ? "-10px" : "-10px",
                    backgroundColor: "white",
                    borderRadius: theme.borderRadius.md,
                    boxShadow: isMobile ? theme.shadows.lg : theme.shadows.xl,
                    width: isMobile ? "calc(100vw - 40px)" : "320px",
                    maxWidth: "400px",
                    zIndex: 1001,
                    overflow: "hidden",
                    border: !isMobile ? `1px solid ${theme.colors.border}` : "none"
                  }}
                >
                  <div style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: isMobile ? "#FFFFFF" : theme.colors.backgroundAlt
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: theme.colors.text.primary
                    }}>
                      Notifications
                    </h4>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: theme.typography.sizes.xs,
                        color: theme.colors.primary,
                        cursor: "pointer",
                        padding: "8px",
                        margin: "-8px",
                        borderRadius: theme.borderRadius.sm
                      }}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      Mark all as read
                    </button>
                  </div>
                  
                  <div style={{ maxHeight: isMobile ? "60vh" : "400px", overflowY: "auto" }}>
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
                    
                    {/* Additional notification item */}
                    {!isMobile && (
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
                            color: theme.colors.success, 
                            backgroundColor: `${theme.colors.success}15`,
                            padding: "6px",
                            borderRadius: "50%"
                          }}>
                            loyalty
                          </span>
                          <div>
                            <p style={{ margin: 0, fontWeight: theme.typography.fontWeights.medium }}>
                              Earned 50 loyalty points!
                            </p>
                            <p style={{ 
                              margin: "4px 0 0", 
                              fontSize: theme.typography.sizes.xs,
                              color: theme.colors.text.secondary
                            }}>
                              From your last order. You now have 250 points.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* View all link - only for medium/large screens */}
                  {!isMobile && (
                    <div style={{
                      padding: theme.spacing.md,
                      borderTop: `1px solid ${theme.colors.border}`,
                      textAlign: "center"
                    }}>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: theme.colors.primary,
                          fontWeight: theme.typography.fontWeights.medium,
                          cursor: "pointer",
                          padding: 0
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Cart icon - only on medium/large screens */}
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Cart"
              style={{
                border: "none",
                background: "#FFFFFF",
                color: theme.colors.text.secondary,
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                boxShadow: theme.shadows.sm,
              }}
            >
              <span className="material-icons" style={{ fontSize: "22px" }}>shopping_cart</span>
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
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                2
              </span>
            </motion.button>
          )}

          {/* User Profile - different styling on medium/large screens */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: isMobile ? "44px" : "40px",
              height: isMobile ? "44px" : "40px",
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border: `2px solid ${theme.colors.primary}30`,
              boxShadow: isMobile ? theme.shadows.sm : theme.shadows.md,
              display: isMobile ? "block" : "none" // Hide on tablet/desktop as it's in the side menu
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