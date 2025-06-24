import React, { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";

const BottomNav = ({ activeTab = "menu", onTabChange }) => {
  const navItems = [
    {
      id: "menu",
      icon: "restaurant_menu",
      label: "Menu"
    },
    {
      id: "search",
      icon: "search",
      label: "Search"
    },
    {
      id: "cart",
      icon: "shopping_cart",
      label: "Cart",
      badge: true
    },
    {
      id: "orders",
      icon: "receipt_long",
      label: "Orders"
    },
    {
      id: "profile",
      icon: "person",
      label: "Profile"
    }
  ];

  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
      zIndex: 1000,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.9 }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: theme.spacing.xs,
              width: "20%",
              position: "relative",
              color: activeTab === item.id ? theme.colors.primary : theme.colors.text.secondary
            }}
            onClick={() => handleTabClick(item.id)}
            aria-label={item.label}
          >
            <div style={{ position: "relative" }}>
              <span className="material-icons" style={{ fontSize: "24px" }}>
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
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold"
                  }}
                >
                  2
                </span>
              )}
            </div>
            <span style={{
              fontSize: theme.typography.sizes.xs,
              marginTop: "2px",
              fontWeight: activeTab === item.id ? theme.typography.fontWeights.medium : theme.typography.fontWeights.regular
            }}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <motion.div
                layoutId="navigation-underline"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "25%",
                  right: "25%",
                  height: "3px",
                  backgroundColor: theme.colors.primary,
                  borderRadius: "3px"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;