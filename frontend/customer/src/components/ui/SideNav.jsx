import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";

const SideNav = ({ activeTab = "menu", onTabChange, restaurantName, branchName, tableNumber, profileSrc, onExpand }) => {
  const { isDesktop, isTablet } = useResponsive();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // More comprehensive navigation items for desktop/tablet
  const navItems = [
    {
      id: "menu",
      icon: "restaurant_menu",
      label: "Menu",
      description: "Browse our delicious offerings"
    },
    {
      id: "featured",
      icon: "star",
      label: "Featured",
      description: "Try our special dishes"
    },
    {
      id: "search",
      icon: "search",
      label: "Search",
      description: "Find your favorite items"
    },
    {
      id: "cart",
      icon: "shopping_cart",
      label: "Cart",
      description: "Review your selections",
      badge: true,
      badgeCount: 2
    },
    {
      id: "orders",
      icon: "receipt_long",
      label: "Orders",
      description: "Track your order status"
    },
    {
      id: "favorites",
      icon: "favorite",
      label: "Favorites",
      description: "Your saved items"
    },
    {
      id: "profile",
      icon: "person",
      label: "Profile",
      description: "Manage your account"
    },
    {
      id: "settings",
      icon: "settings",
      label: "Settings",
      description: "Customize your experience"
    }
  ];
  const toggleExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (onExpand) {
      onExpand(newExpandedState);
    }
  };

  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // Skip rendering if on mobile
  if (!isTablet && !isDesktop) {
    return null;
  }

  return (
    <nav 
      className="side-navigation"
      style={{
        position: "fixed",
        top: theme.spacing.md,
        left: theme.spacing.md,
        bottom: theme.spacing.md,
        width: isExpanded ? "280px" : "80px",
        backgroundColor: "#FFFFFF",
        boxShadow: theme.shadows.card,
        borderRadius: theme.borderRadius.lg,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)"
      }}
    >
      {/* Logo & Brand */}
      <div style={{
        padding: theme.spacing.md,
        display: "flex",
        alignItems: "center",
        justifyContent: isExpanded ? "space-between" : "center",
        borderBottom: `1px solid ${theme.colors.border}`
      }}>
        {isExpanded ? (
          <h1 style={{
            fontFamily: theme.typography.fontFamily.display,
            fontSize: theme.typography.sizes.xl,
            margin: 0,
            color: theme.colors.secondary,
            userSelect: "none",
            letterSpacing: "-0.5px",
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs
          }}>
            <span className="material-icons" style={{ color: theme.colors.primary }}>restaurant</span>
            Order<span style={{ color: theme.colors.primary }}>Ease</span>
          </h1>
        ) : (
          <span className="material-icons" style={{ fontSize: "28px", color: theme.colors.primary }}>
            restaurant
          </span>
        )}
        
        <button 
          onClick={toggleExpand}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: theme.spacing.xs,
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.text.secondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s ease"
          }}
        >
          <span className="material-icons" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)" }}>
            menu_open
          </span>
        </button>
      </div>

      {/* Restaurant Info */}
      {isExpanded && (
        <div style={{
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <h2 style={{ 
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.fontWeights.semibold,
            margin: 0,
            color: theme.colors.text.primary
          }}>
            {restaurantName || "Restaurant Name"}
          </h2>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: theme.spacing.xs,
            marginTop: theme.spacing.xs,
            color: theme.colors.text.secondary,
            fontSize: theme.typography.sizes.sm
          }}>
            <span className="material-icons" style={{ fontSize: "16px" }}>location_on</span>
            <span>{branchName || "Branch Name"}</span>
          </div>
          {tableNumber && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: theme.spacing.xs,
              marginTop: theme.spacing.xs,
              color: theme.colors.primary,
              fontSize: theme.typography.sizes.sm
            }}>
              <span className="material-icons" style={{ fontSize: "16px" }}>table_bar</span>
              <span>Table #{tableNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ 
        flex: 1,
        overflowY: "auto",
        padding: `${theme.spacing.md} 0`,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs
      }}>
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ 
              backgroundColor: `${theme.colors.primary}10`,
              scale: 1.02
            }}
            whileTap={{ scale: 0.98 }}
            style={{
              backgroundColor: activeTab === item.id ? `${theme.colors.primary}15` : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: isExpanded ? 
                `${theme.spacing.md} ${theme.spacing.lg} ${theme.spacing.md} ${theme.spacing.md}` : 
                `${theme.spacing.md} 0`,
              borderRadius: isExpanded ? 
                `0 ${theme.borderRadius.pill} ${theme.borderRadius.pill} 0` : 
                theme.borderRadius.md,
              marginLeft: isExpanded ? 0 : theme.spacing.sm,
              marginRight: isExpanded ? 0 : theme.spacing.sm,
              position: "relative",
              color: activeTab === item.id ? theme.colors.primary : theme.colors.text.secondary,
              justifyContent: isExpanded ? "flex-start" : "center",
              transition: "all 0.2s ease",
              textAlign: "left"
            }}
            onClick={() => handleTabClick(item.id)}
            aria-label={item.label}
          >
            <div style={{ position: "relative" }}>
              <span className="material-icons" style={{ 
                fontSize: activeTab === item.id ? "24px" : "22px",
                filter: activeTab === item.id ? "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" : "none"
              }}>
                {item.icon}
              </span>
              {item.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    backgroundColor: theme.colors.primary,
                    color: "white",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    border: "1.5px solid white"
                  }}
                >
                  {item.badgeCount || 0}
                </span>
              )}
            </div>
            
            {isExpanded && (
              <div style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                <div style={{
                  fontWeight: activeTab === item.id ? 
                    theme.typography.fontWeights.semibold : 
                    theme.typography.fontWeights.medium,
                  fontSize: theme.typography.sizes.md,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: theme.typography.sizes.xs,
                  color: theme.colors.text.muted,
                  marginTop: "2px",
                  display: activeTab === item.id ? "block" : "none"
                }}>
                  {item.description}
                </div>
              </div>
            )}
            
            {isExpanded && activeTab === item.id && (
              <div style={{
                width: "4px",
                position: "absolute",
                top: "15%",
                bottom: "15%",
                left: 0,
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.full
              }} />
            )}
          </motion.button>
        ))}
      </div>

      {/* User Profile Section */}
      <div style={{
        borderTop: `1px solid ${theme.colors.border}`,
        padding: theme.spacing.md,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.backgroundAlt,
        borderBottomLeftRadius: theme.borderRadius.lg,
        borderBottomRightRadius: theme.borderRadius.lg
      }}>
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
            flexShrink: 0
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
        
        {isExpanded && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ 
              fontWeight: theme.typography.fontWeights.medium,
              color: theme.colors.text.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              Guest User
            </div>
            <div style={{ 
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary
            }}>
              Create account to save preferences
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default SideNav;