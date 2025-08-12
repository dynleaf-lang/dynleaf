import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";

// Loading indicator component
const LoadingIndicator = ({ size = "small" }) => {
  const sizes = {
    small: { width: 16, height: 16, borderWidth: 1.5 },
    medium: { width: 24, height: 24, borderWidth: 2 },
    large: { width: 32, height: 32, borderWidth: 3 }
  };
  
  const { width, height, borderWidth } = sizes[size];
  
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '50%',
        border: `${borderWidth}px solid rgba(0,0,0,0.1)`,
        borderTopColor: theme.colors.primary,
        animation: 'spin 1s linear infinite',
      }}
    />
  );
};

const BottomNav = ({ activeTab = "menu", onTabChange, onOpenCart }) => {
  const { cartItems, cartAnimation } = useCart();
  const [loadingTab, setLoadingTab] = useState(null);
  const [error, setError] = useState(null);  const [pulsingTab, setPulsingTab] = useState(null);

  // Effect to handle cart animation
  useEffect(() => {
    if (cartAnimation.isAnimating) {
      setPulsingTab("cart");
      
      // Reset pulsing effect after animation
      const timer = setTimeout(() => {
        setPulsingTab(null);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [cartAnimation.isAnimating]);

  // Calculate the cart items count for badge
  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

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
      badge: cartItemsCount > 0,
      badgeCount: cartItemsCount
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

  const handleTabClick = async (tabId) => {
    // Create a subtle vibration for physical feedback on mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    // If tab is cart, directly open the cart modal
    if (tabId === 'cart') {
      if (onOpenCart) onOpenCart();
      return;
    }
    
    // Show loading indicator for the clicked tab
    setLoadingTab(tabId);
    setError(null);
    
    try {
      // Simulate a small delay to show loading state (remove in production)
      if (process.env.NODE_ENV !== 'production') {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (onTabChange) {
        onTabChange(tabId);
      }
    } catch (err) {
      console.error(`Error navigating to ${tabId}:`, err);
      setError({ tab: tabId, message: "Navigation failed" });
    } finally {
      setLoadingTab(null);
    }
  };

  // Animation variants
  const tabVariants = {
    active: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    },
    inactive: {
      scale: 1
    }
  };

  // Style for error indicator
  const errorStyle = {
    position: 'absolute',
    bottom: '-5px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: theme.colors.danger
  };

  return (
    <nav className="bottom-navigation oe-glass-surface oe-backdrop oe-glass-border oe-glass-shadow oe-glass-hover oe-promote" style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      boxShadow: "0 -4px 10px rgba(0,0,0,0.07)",
      zIndex: 1000,
      padding: `${theme.spacing.sm} ${theme.spacing.sm}`,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      transition: "transform 0.3s ease"
    }}>      <style jsx="true" global="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes colorShift {
          0%, 100% { color: ${theme.colors.primary}; }
          50% { color: ${theme.colors.secondary}; }
        }
      `}</style>
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        maxWidth: "500px",
        margin: "0 auto"
      }}>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'absolute',
                top: -45,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: theme.colors.danger,
                color: 'white',
                padding: '6px 12px',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.sizes.sm,
                boxShadow: theme.shadows.md,
                whiteSpace: 'nowrap'
              }}
            >
              {error.message}
            </motion.div>
          )}
        </AnimatePresence>
        
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.85 }}
            variants={tabVariants}
            animate={activeTab === item.id ? "active" : "inactive"}
            style={{
              backgroundColor: activeTab === item.id ? `${theme.colors.primary}15` : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
              borderRadius: theme.borderRadius.lg,
              width: "20%",
              position: "relative",
              color: activeTab === item.id ? theme.colors.primary : theme.colors.text.secondary,
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              transition: "all 0.2s ease"
            }}            onClick={() => handleTabClick(item.id)}
            aria-label={item.label}
            aria-pressed={activeTab === item.id}
            role="tab"
            data-tab-id={item.id}
            disabled={loadingTab === item.id}
          >
            <div style={{ position: "relative" }}>
              {loadingTab === item.id ? (
                <div style={{ 
                  height: '26px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <LoadingIndicator />
                </div>              ) : (
                <motion.span 
                  className="material-icons" 
                  animate={{ 
                    scale: pulsingTab === item.id ? [1, 1.3, 1] : 1,
                    color: pulsingTab === item.id ? [
                      theme.colors.primary, 
                      theme.colors.secondary, 
                      theme.colors.primary
                    ] : activeTab === item.id ? theme.colors.primary : theme.colors.text.secondary
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  style={{ 
                    fontSize: activeTab === item.id ? "26px" : "24px", 
                    transition: "all 0.2s ease",
                    filter: activeTab === item.id ? "drop-shadow(0 2px 3px rgba(0,0,0,0.1))" : "none",
                    animation: loadingTab ? 'pulse 1.5s ease-in-out infinite' : 'none'
                  }}
                >
                  {item.icon}
                </motion.span>
              )}
                {item.badge && (
                <motion.span
                  animate={{
                    scale: pulsingTab === item.id ? [1, 1.4, 1] : 1,
                    backgroundColor: pulsingTab === item.id ? 
                      [theme.colors.primary, theme.colors.secondary, theme.colors.primary] : 
                      theme.colors.primary
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-8px",
                    backgroundColor: theme.colors.primary,
                    color: "white",
                    borderRadius: "50%",
                    minWidth: "18px",
                    height: "18px",
                    padding: "0 4px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    border: "1.5px solid white"
                  }}
                >
                  {item.badgeCount || ""}
                </motion.span>
              )}
              
              {error?.tab === item.id && <div style={errorStyle} />}
            </div>
            <span style={{
              fontSize: "0.7rem",
              marginTop: "4px",
              fontWeight: activeTab === item.id ? theme.typography.fontWeights.bold : theme.typography.fontWeights.regular,
              letterSpacing: "0.01em",
              opacity: activeTab === item.id ? 1 : 0.9,
              transition: "all 0.2s ease"
            }}>
              {item.label}
            </span>
            {activeTab === item.id && (
              <motion.div
                layoutId="navigation-underline"
                style={{
                  position: "absolute",
                  bottom: "0px",
                  left: "15%",
                  right: "15%",
                  height: "3px",
                  backgroundColor: theme.colors.primary,
                  borderRadius: "3px"
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;