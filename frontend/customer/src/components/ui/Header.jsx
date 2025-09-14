import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useResponsive } from "../../context/ResponsiveContext";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { theme } from "../../data/theme";
import { useRestaurant } from "../../context/RestaurantContext";
import ProfileButton from "../auth/ProfileButton";

// Add these keyframe animations for enhanced visual effects
const shimmerKeyframes = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// Inject keyframes into document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = shimmerKeyframes;
  document.head.appendChild(styleSheet);
}

const Header = ({ profileSrc, isDesktop, restaurantName, branchName, tableNumber, openLoginModal, onNavigateToProfile }) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { isMobile, isTablet } = useResponsive();
  const { isAuthenticated, user } = useAuth();
  const { restaurant: restaurantCtx, branch: branchCtx } = useRestaurant();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    getTimeAgo 
  } = useNotifications();
  const notificationRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
 

  // Restaurant data - prefer context, fallback to props
  const restaurant = {
    name: (restaurantCtx?.name || restaurantName || "OrderEase"),
    brandName: restaurantCtx?.brandName ?? null,
    logo: restaurantCtx?.coverImageUrl ?? null,
    address: branchCtx?.name || branchName || null
  };
 


  // Only show restaurant info in header on mobile views
  // (on desktop/tablet it's shown in the sidebar)
  const showRestaurantInfo = isMobile && restaurantName;
  
  const toggleNotifications = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    setNotificationsOpen(!notificationsOpen);
  };

  const handleProfileClick = () => {
    if (isAuthenticated && onNavigateToProfile) {
      onNavigateToProfile();
    } else if (!isAuthenticated) {
      openLoginModal();
    }
  };
  
  return (
    <header className="oe-glass-surface oe-backdrop oe-glass-border oe-glass-shadow oe-glass-hover oe-promote"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: isMobile ? "#FFFFFF" : "rgba(255, 255, 255, 0.95)",
        borderBottom: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
        boxShadow: isMobile ? 
          "0 2px 8px rgba(0, 0, 0, 0.08)" : 
          "0 4px 20px rgba(0, 0, 0, 0.08)",
        padding: isMobile ? 
          `${theme.spacing.md} ${theme.spacing.md}` : 
          `${theme.spacing.lg} ${theme.spacing.xl}`,
        marginBottom: isMobile ? 0 : theme.spacing.sm,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        borderRadius: isMobile ? 0 : `0 0 ${theme.borderRadius.lg} ${theme.borderRadius.lg}`,
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
        {/* Restaurant Logo & Branding */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.md,
        }}>
          {restaurant?.coverImageUrl && (
            <div
              style={{
                width: isMobile ? "45px" : "60px",
                height: isMobile ? "45px" : "60px",
                borderRadius: theme.borderRadius.lg,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                border: `2px solid ${theme.colors.border?.light || 'rgba(255, 255, 255, 0.2)'}`,
                background: "linear-gradient(135deg, #ffffff, #f8fafc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={restaurant.coverImageUrl}
                alt={restaurant.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}

          <div>
            <h1
              style={{
                fontFamily: theme.typography.fontFamily.display,
                fontSize: isMobile ? "1.4rem" : "1.75rem",
                margin: 0,
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                userSelect: "none",
                letterSpacing: "-0.025em",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              {restaurant?.logo ? (
                <img
                  src={restaurant.logo}
                  alt={restaurant?.brandName || restaurant?.name || 'Brand'}
                  style={{
                    height: isMobile ? '28px' : '32px',
                    width: 'auto',
                    objectFit: 'contain',
                    marginRight: theme.spacing.xs
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span className="material-icons" style={{ 
                  fontSize: isMobile ? "28px" : "32px", 
                  color: theme.colors.primary,
                  marginRight: theme.spacing.xs
                }}>
                  restaurant
                </span>
              )}
              <span>{restaurant?.brandName || restaurant?.name || "OrderEase"}</span>
            </h1>
            
            {!isMobile && restaurant?.address && (
              <p
                style={{
                  margin: 0,
                  marginTop: theme.spacing.xs,
                  fontSize: "0.875rem",
                  color: theme.colors.text.secondary,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                }}
              >
                <span className="material-icons" style={{ fontSize: "16px", color: theme.colors.primary }}>
                  location_on
                </span>
                {restaurant.address}
              </p>
            )}

            {!isMobile && !restaurant?.name && (
              <p style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.secondary,
                margin: 0,
                marginTop: theme.spacing.xs,
                fontWeight: 500,
              }}>
                Order your favorite dishes with ease
              </p>
            )}
          </div>
        </div>

        {/* Right-side Actions */}
        <div style={{
          display: "flex", 
          alignItems: "center",
          gap: theme.spacing.md
        }}>
          {/* Enhanced Notification Bell with Dropdown - Only show when authenticated */}
          {isAuthenticated && (
            <div ref={notificationRef} style={{ position: "relative" }}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                style={{ 
                  position: "relative",
                  cursor: "pointer",
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.lg,
                  background: unreadCount > 0 ? 
                    `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}15)` : 
                    "transparent",
                  border: unreadCount > 0 ? 
                    `1px solid ${theme.colors.primary}30` : 
                    `1px solid transparent`,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onClick={toggleNotifications}
              >
                <span className="material-icons" style={{
                  color: unreadCount > 0 ? theme.colors.primary : theme.colors.text.secondary,
                  fontSize: "24px",
                  transition: "color 0.3s ease"
                }}>
                  {unreadCount > 0 ? "notifications_active" : "notifications"}
                </span>
                
                {/* Enhanced notification badge */}
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                      color: "#fff",
                      borderRadius: "50%",
                      minWidth: "18px",
                      height: "18px",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: theme.typography.fontWeights.bold,
                      border: "2px solid #fff",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.span>
                )}
              </motion.div>

            {/* Professional Notification Dropdown */}
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: "-70px",
                    marginTop: theme.spacing.sm,
                    width: isMobile ? "320px" : "380px",
                    maxWidth: "90vw",
                    background: "#fff",
                    borderRadius: theme.borderRadius.lg,
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                    border: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                    zIndex: 1000,
                    overflow: "hidden",
                  }}
                >
                  {/* Notification Header */}
                  <div style={{
                    padding: theme.spacing.md,
                    borderBottom: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                    background: `linear-gradient(135deg, ${theme.colors.primary}05, ${theme.colors.secondary}05)`,
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: theme.typography.sizes.lg,
                        fontWeight: theme.typography.fontWeights.semibold,
                        color: theme.colors.text.primary,
                      }}>
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: theme.colors.primary,
                            fontSize: theme.typography.sizes.sm,
                            fontWeight: theme.typography.fontWeights.medium,
                            cursor: "pointer",
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.borderRadius.md,
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = `${theme.colors.primary}10`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    textAlign: "left",
                  }}>
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map((notification) => {
                        // Get notification styling based on type
                        const getNotificationStyling = (type) => {
                          const styles = {
                            'order_confirmation': {
                              bgColor: `${theme.colors.success}15`,
                              iconColor: theme.colors.success,
                              borderColor: `${theme.colors.success}30`
                            },
                            'order_update': {
                              bgColor: `${theme.colors.primary}15`,
                              iconColor: theme.colors.primary,
                              borderColor: `${theme.colors.primary}30`
                            },
                            'promotion': {
                              bgColor: `${theme.colors.warning}15`,
                              iconColor: theme.colors.warning,
                              borderColor: `${theme.colors.warning}30`
                            },
                            'delivery': {
                              bgColor: `${theme.colors.info}15`,
                              iconColor: theme.colors.info,
                              borderColor: `${theme.colors.info}30`
                            },
                            'welcome': {
                              bgColor: `${theme.colors.secondary}15`,
                              iconColor: theme.colors.secondary,
                              borderColor: `${theme.colors.secondary}30`
                            },
                            'table_service': {
                              bgColor: `${theme.colors.primary}15`,
                              iconColor: theme.colors.primary,
                              borderColor: `${theme.colors.primary}30`
                            }
                          };
                          
                          return styles[type] || {
                            bgColor: `${theme.colors.primary}15`,
                            iconColor: theme.colors.primary,
                            borderColor: `${theme.colors.primary}30`
                          };
                        };

                        const styling = getNotificationStyling(notification.type);
                        
                        return (
                          <motion.div
                            key={notification.id}
                            whileHover={{ backgroundColor: styling.bgColor }}
                            style={{
                              padding: theme.spacing.md,
                              borderBottom: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                              cursor: "pointer",
                              transition: "background-color 0.2s ease",
                              position: "relative",
                              borderLeft: !notification.read ? `3px solid ${styling.iconColor}` : 'none',
                            }}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div style={{
                              display: "flex",
                              gap: theme.spacing.sm,
                              alignItems: "flex-start",
                            }}>
                              {/* Notification Icon */}
                              <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: styling.bgColor,
                                border: `1px solid ${styling.borderColor}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <span className="material-icons" style={{
                                  fontSize: "20px",
                                  color: styling.iconColor,
                                }}>
                                  {notification.icon}
                                </span>
                              </div>

                              {/* Notification Content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: theme.spacing.xs,
                                }}>
                                  <h4 style={{
                                    margin: 0,
                                    fontSize: theme.typography.sizes.sm,
                                    fontWeight: notification.read ? 
                                      theme.typography.fontWeights.medium : 
                                      theme.typography.fontWeights.semibold,
                                    color: theme.colors.text.primary,
                                    lineHeight: 1.3,
                                  }}>
                                    {notification.message}
                                  </h4>
                                  <span style={{
                                    fontSize: theme.typography.sizes.xs,
                                    color: theme.colors.text.secondary,
                                    flexShrink: 0,
                                    marginLeft: theme.spacing.sm,
                                  }}>
                                    {getTimeAgo(notification.timestamp)}
                                  </span>
                                </div>
                                <p style={{
                                  margin: 0,
                                  fontSize: theme.typography.sizes.sm,
                                  color: theme.colors.text.secondary,
                                  lineHeight: 1.4,
                                }}>
                                  {notification.title}
                                </p>
                                
                                {/* Additional metadata for order notifications */}
                                {notification.metadata && notification.orderNumber && (
                                  <div style={{
                                    marginTop: theme.spacing.xs,
                                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                    background: `${theme.colors.background?.light || '#f8f9fa'}`,
                                    borderRadius: theme.borderRadius.sm,
                                    fontSize: theme.typography.sizes.xs,
                                    color: theme.colors.text.secondary,
                                  }}>
                                    Order #{notification.orderNumber}
                                    {notification.metadata.estimatedTime && (
                                      <span style={{ marginLeft: theme.spacing.sm }}>
                                        • ETA: {notification.metadata.estimatedTime}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Unread Indicator */}
                              {!notification.read && (
                                <div style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: styling.iconColor,
                                  position: "absolute",
                                  top: theme.spacing.md,
                                  right: theme.spacing.md,
                                  boxShadow: `0 0 0 2px #fff`,
                                }} />
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div style={{
                        padding: `${theme.spacing.xl} ${theme.spacing.md}`,
                        textAlign: "center",
                        color: theme.colors.text.secondary,
                      }}>
                        <span className="material-icons" style={{
                          fontSize: "48px",
                          marginBottom: theme.spacing.md,
                          opacity: 0.5,
                        }}>
                          notifications_none
                        </span>
                        <p style={{
                          margin: 0,
                          fontSize: theme.typography.sizes.sm,
                        }}>
                          No notifications yet
                        </p>
                        <p style={{
                          margin: 0,
                          marginTop: theme.spacing.xs,
                          fontSize: theme.typography.sizes.xs,
                          opacity: 0.7,
                        }}>
                          You'll receive updates about your orders here
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notification Footer */}
                  {notifications.length > 0 && (
                    <div style={{
                      padding: theme.spacing.md,
                      borderTop: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                      background: `linear-gradient(135deg, ${theme.colors.primary}05, ${theme.colors.secondary}05)`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: theme.spacing.sm,
                    }}>
                      <button
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: unreadCount > 0 ? theme.colors.primary : theme.colors.text.secondary,
                          fontSize: theme.typography.sizes.sm,
                          fontWeight: theme.typography.fontWeights.medium,
                          cursor: unreadCount > 0 ? "pointer" : "default",
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.borderRadius.md,
                          transition: "all 0.2s ease",
                          opacity: unreadCount > 0 ? 1 : 0.5,
                        }}
                        onMouseEnter={(e) => {
                          if (unreadCount > 0) {
                            e.target.style.backgroundColor = `${theme.colors.primary}10`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: "16px", marginRight: theme.spacing.xs }}>
                          done_all
                        </span>
                        Mark all read
                      </button>
                      
                      <div style={{
                        fontSize: theme.typography.sizes.xs,
                        color: theme.colors.text.secondary,
                        display: "flex",
                        alignItems: "center",
                        gap: theme.spacing.xs,
                      }}>
                        {notifications.length > 10 && (
                          <span>Showing 10 of {notifications.length}</span>
                        )}
                        {unreadCount > 0 && (
                          <span style={{
                            background: theme.colors.primary,
                            color: "#fff",
                            padding: `2px ${theme.spacing.xs}`,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: "10px",
                            fontWeight: theme.typography.fontWeights.bold,
                          }}>
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          )}

          {/* Enhanced Profile Button with Navigation */}
          <ProfileButton 
            openLoginModal={openLoginModal} 
            onProfileClick={handleProfileClick}
            user={user}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
     
      
      {/* Enhanced Navigation for larger screens */}
      {!isMobile && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: theme.spacing.lg,
          borderTop: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
          paddingTop: theme.spacing.md,
          marginTop: theme.spacing.sm,
          position: "relative",
        }}>
          {/* Active Menu Button */}
          <motion.button 
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.secondary}10)`,
              border: `1px solid ${theme.colors.primary}30`,
              color: theme.colors.primary,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.sizes.sm,
              cursor: "pointer",
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.borderRadius.lg,
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.xs,
              position: "relative",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            <span className="material-icons" style={{ fontSize: "20px" }}>restaurant_menu</span>
            Menu
          </motion.button>
          
          {/* Other Navigation Items */}
          {[
            { icon: "star", label: "Featured", onClick: () => {} },
            { icon: "receipt_long", label: "Orders", onClick: () => {} },
            { icon: "favorite", label: "Favorites", onClick: () => {} }, 

          ].map((item, index) => (
            <motion.button 
              key={item.label}
              whileHover={{ y: -2, color: theme.colors.primary }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "transparent",
                border: "1px solid transparent",
                color: theme.colors.text.secondary,
                fontWeight: theme.typography.fontWeights.medium,
                fontSize: theme.typography.sizes.sm,
                cursor: "pointer",
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.lg,
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.xs,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onClick={item.onClick}
            >
              <span className="material-icons" style={{ fontSize: "20px" }}>{item.icon}</span>
              {item.label}
            </motion.button>
          ))}
          
          {/* Search Bar for larger screens */}
          <div style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.md,
          }}>
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}>
              <input
                type="text"
                placeholder="Search dishes..."
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  paddingLeft: "2.5rem",
                  border: `1px solid ${theme.colors.border?.light || theme.colors.divider}`,
                  borderRadius: theme.borderRadius.lg,
                  background: "rgba(255, 255, 255, 0.8)",
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.primary,
                  outline: "none",
                  transition: "all 0.3s ease",
                  width: "250px",
                  backdropFilter: "blur(10px)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border?.light || theme.colors.divider;
                  e.target.style.boxShadow = "none";
                }}
              />
              <span 
                className="material-icons" 
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  color: theme.colors.text.secondary,
                  fontSize: "20px",
                  pointerEvents: "none",
                }}
              >
                search
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;