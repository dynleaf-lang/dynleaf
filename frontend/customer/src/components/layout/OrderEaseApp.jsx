import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import components
import Header from "../ui/Header";
import QRCodeScanner from "../ui/QRCodeScanner";
import QRInstructions from "../ui/QRInstructions";
import MenuView from "../ui/MenuView";
import BottomNav from "../ui/BottomNav";
import DesktopLayout from "./DesktopLayout";
import EnhancedCart from "../ui/EnhancedCart";
import CartButton from "../ui/CartButton";

// Import context and theme
import { useRestaurant } from "../../context/RestaurantContext";
import { useResponsive } from "../../context/ResponsiveContext";
import { theme } from "../../data/theme";

const OrderEaseApp = () => {
  // Use responsive context instead of tracking window resize manually
  const { isMobile, isTablet, isDesktop, windowWidth } = useResponsive();
  
  // Track active tab for navigation
  const [activeTab, setActiveTab] = useState("menu");
  
  // State to control cart modal visibility
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Get data from restaurant context
  const { 
    restaurant, 
    branch, 
    loading, 
    error, 
    initialized 
  } = useRestaurant();
  
  // Handler for bottom navigation tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Handle navigation logic here (you'll implement actual navigation between views)
    console.log(`Navigation to: ${tabId}`);
  };
  
  // Handler for opening the cart modal
  const handleOpenCart = () => {
    setIsCartOpen(true);
  };
  
  // Handler for closing the cart modal
  const handleCloseCart = () => {
    setIsCartOpen(false);
  };

  // Account settings items
  const accountSettings = [
    { icon: "notifications", label: "Notifications" },
    { icon: "payment", label: "Payment Methods" },
    { icon: "location_on", label: "Delivery Addresses" },
    { icon: "language", label: "Language" }
  ];

  // Help & Support items
  const helpSupportItems = [
    { icon: "help", label: "FAQ" },
    { icon: "support_agent", label: "Contact Support" },
    { icon: "description", label: "Terms & Conditions" },
    { icon: "privacy_tip", label: "Privacy Policy" }
  ];

  // Compute what to render based on state - avoiding early returns
  const urlParams = new URLSearchParams(window.location.search);
  const hasRestaurantParams = urlParams.has('restaurantId') && urlParams.has('branchId');
  const hasParamsRef = useRef(hasRestaurantParams);

  // Use conditional rendering instead of early returns
  return (
    <>
      {/* Case 1: Not initialized and loading with params */}
      {!initialized && loading && hasParamsRef.current && (
        <div className="container-fluid d-flex flex-column align-items-center justify-content-center" style={{
          minHeight: "100vh",
          backgroundColor: theme.colors.background
        }}>
          <div className="material-icons" style={{ 
            fontSize: "48px", 
            animation: "spin 1.5s linear infinite",
            color: theme.colors.primary,
            marginBottom: "20px"
          }}>
            refresh
          </div>
          <p>Loading restaurant information...</p>
        </div>
      )}

      {/* Case 2: Not initialized and need QR scan */}
      {!initialized && !hasParamsRef.current && (
        <QRCodeScanner />
      )}

      {/* Case 3: Not initialized and error loading */}
      {!initialized && !loading && hasParamsRef.current && (
        <QRInstructions />
      )}

      {/* Case 4: Initialized but no restaurant data */}
      {initialized && (!restaurant || !branch) && (
        <QRInstructions />
      )}

      {/* Case 5: Main content - Restaurant data loaded */}
      {initialized && restaurant && branch && (
        isMobile ? (
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container-fluid"
            style={{
              fontFamily: theme.typography.fontFamily.primary,
              backgroundColor: theme.colors.card,
              minHeight: "100vh",
              paddingBottom: "70px", // Add padding to prevent content from being hidden behind the bottom nav
            }}
            aria-label="OrderEase food ordering app"
          >
            <Header
              profileSrc="https://randomuser.me/api/portraits/women/79.jpg"
              isDesktop={false}
              restaurantName={restaurant?.name}
              branchName={branch?.name}
              tableNumber={branch?.tableNumber || "12"}
            />
            
            {/* Main Content Area - This would change based on active tab */}
            <div className="row">
              <div className="col-12">
                <AnimatePresence mode="wait">
                  {activeTab === "menu" && (
                    <motion.div
                      key="menu"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MenuView />
                    </motion.div>
                  )}
                  
                  {activeTab === "search" && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="d-flex flex-column align-items-center justify-content-center p-4" style={{ minHeight: "50vh" }}>
                        <span className="material-icons" style={{ 
                          fontSize: "48px", 
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.md
                        }}>
                          search
                        </span>
                        <h2 style={{
                          fontSize: theme.typography.sizes.xl,
                          marginBottom: theme.spacing.md,
                          color: theme.colors.text.primary
                        }}>
                          Find Your Favorite Dishes
                        </h2>
                        <div style={{
                          width: "100%",
                          maxWidth: "400px",
                          position: "relative",
                          marginBottom: theme.spacing.lg
                        }}>
                          <input
                            type="text"
                            placeholder="Search menu items..."
                            style={{
                              width: "100%",
                              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                              paddingLeft: "3rem",
                              borderRadius: theme.borderRadius.lg,
                              border: `1px solid ${theme.colors.border}`,
                              fontSize: theme.typography.sizes.md,
                              boxShadow: theme.shadows.sm,
                              backgroundColor: "#FFF"
                            }}
                          />
                          <span className="material-icons" style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: theme.colors.text.secondary
                          }}>
                            search
                          </span>
                        </div>
                        <div style={{
                          width: "100%",
                          maxWidth: "400px",
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: theme.spacing.md,
                          marginBottom: theme.spacing.xl
                        }}>
                          {["Pizza", "Burgers", "Pasta", "Salads", "Drinks"].map(tag => (
                            <span key={tag} style={{
                              padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                              backgroundColor: `${theme.colors.primary}15`,
                              color: theme.colors.primary,
                              borderRadius: theme.borderRadius.pill,
                              fontSize: theme.typography.sizes.sm,
                              fontWeight: theme.typography.fontWeights.medium
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p style={{ 
                          textAlign: "center", 
                          color: theme.colors.text.secondary,
                          maxWidth: "350px",
                          fontSize: theme.typography.sizes.sm
                        }}>
                          Try searching for dishes by name, ingredients, or categories
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === "orders" && (
                    <motion.div
                      key="orders"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div style={{
                        padding: theme.spacing.md
                      }}>
                        <h3 style={{
                          fontSize: theme.typography.sizes.xl,
                          fontWeight: theme.typography.fontWeights.semibold,
                          marginBottom: theme.spacing.lg,
                          color: theme.colors.text.primary
                        }}>
                          Your Orders
                        </h3>
                        
                        {/* Status tabs */}
                        <div style={{
                          display: "flex",
                          overflowX: "auto",
                          gap: theme.spacing.sm,
                          marginBottom: theme.spacing.lg,
                          paddingBottom: theme.spacing.xs
                        }}>
                          {["All", "Active", "Completed", "Cancelled"].map((status, index) => (
                            <button
                              key={status}
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                backgroundColor: index === 0 ? theme.colors.primary : theme.colors.background,
                                color: index === 0 ? "white" : theme.colors.text.secondary,
                                border: "none",
                                borderRadius: theme.borderRadius.md,
                                fontSize: theme.typography.sizes.sm,
                                fontWeight: theme.typography.fontWeights.medium,
                                whiteSpace: "nowrap"
                              }}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                        
                        {/* Example order card */}
                        <div style={{
                          backgroundColor: "#FFF",
                          borderRadius: theme.borderRadius.lg,
                          padding: theme.spacing.md,
                          marginBottom: theme.spacing.md,
                          boxShadow: theme.shadows.sm
                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: theme.spacing.sm
                          }}>
                            <div style={{ fontWeight: theme.typography.fontWeights.semibold }}>
                              Order #1234
                            </div>
                            <div style={{
                              backgroundColor: "#d1f5d3",
                              color: theme.colors.success,
                              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              borderRadius: theme.borderRadius.pill,
                              fontSize: theme.typography.sizes.xs,
                              fontWeight: theme.typography.fontWeights.medium
                            }}>
                              Delivered
                            </div>
                          </div>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: theme.spacing.sm
                          }}>
                            <div style={{ color: theme.colors.text.secondary, fontSize: theme.typography.sizes.sm }}>
                              Today, 2:30 PM
                            </div>
                            <div style={{ fontWeight: theme.typography.fontWeights.semibold }}>
                              $24.99
                            </div>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: theme.spacing.sm,
                            color: theme.colors.text.secondary,
                            fontSize: theme.typography.sizes.sm,
                            marginBottom: theme.spacing.md
                          }}>
                            <span className="material-icons" style={{ fontSize: "16px" }}>
                              lunch_dining
                            </span>
                            <span>3 items</span>
                          </div>
                          <button style={{
                            width: "100%",
                            padding: theme.spacing.sm,
                            backgroundColor: "transparent",
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.borderRadius.md,
                            color: theme.colors.text.primary,
                            fontWeight: theme.typography.fontWeights.medium
                          }}>
                            View Details
                          </button>
                        </div>
                        
                        {/* More order cards would go here */}
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === "profile" && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div style={{
                        padding: theme.spacing.md
                      }}>
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: theme.spacing.lg,
                          backgroundColor: "#FFF",
                          borderRadius: theme.borderRadius.lg,
                          boxShadow: theme.shadows.sm,
                          marginBottom: theme.spacing.lg
                        }}>
                          <div style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            backgroundColor: theme.colors.background,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: theme.spacing.md,
                            overflow: "hidden"
                          }}>
                            <img 
                              src="https://randomuser.me/api/portraits/women/79.jpg"
                              alt="Profile"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                          <h3 style={{
                            fontSize: theme.typography.sizes.lg,
                            fontWeight: theme.typography.fontWeights.semibold,
                            margin: `${theme.spacing.xs} 0`,
                            color: theme.colors.text.primary
                          }}>
                            Jane Doe
                          </h3>
                          <p style={{
                            color: theme.colors.text.secondary,
                            fontSize: theme.typography.sizes.sm,
                            marginBottom: theme.spacing.md
                          }}>
                            jane.doe@example.com
                          </p>
                          <button style={{
                            backgroundColor: theme.colors.primary,
                            color: "#FFF",
                            border: "none",
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            borderRadius: theme.borderRadius.md,
                            fontWeight: theme.typography.fontWeights.medium
                          }}>
                            Edit Profile
                          </button>
                        </div>
                        
                        {/* Settings sections */}
                        <div style={{
                          backgroundColor: "#FFF",
                          borderRadius: theme.borderRadius.lg,
                          boxShadow: theme.shadows.sm,
                          overflow: "hidden",
                          marginBottom: theme.spacing.lg
                        }}>
                          <h4 style={{
                            padding: theme.spacing.md,
                            borderBottom: `1px solid ${theme.colors.border}`,
                            fontSize: theme.typography.sizes.md,
                            fontWeight: theme.typography.fontWeights.semibold,
                            margin: 0
                          }}>
                            Account Settings
                          </h4>
                          
                          {accountSettings.map((item, index) => (
                            <div key={item.label} style={{
                              padding: theme.spacing.md,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom: index < accountSettings.length - 1 ? `1px solid ${theme.colors.border}` : "none"
                            }}>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: theme.spacing.md
                              }}>
                                <span className="material-icons" style={{ 
                                  color: theme.colors.text.secondary
                                }}>
                                  {item.icon}
                                </span>
                                <span>{item.label}</span>
                              </div>
                              <span className="material-icons" style={{ 
                                color: theme.colors.text.secondary,
                                fontSize: "18px"
                              }}>
                                arrow_forward_ios
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Help & Support */}
                        <div style={{
                          backgroundColor: "#FFF",
                          borderRadius: theme.borderRadius.lg,
                          boxShadow: theme.shadows.sm,
                          overflow: "hidden",
                          marginBottom: theme.spacing.lg
                        }}>
                          <h4 style={{
                            padding: theme.spacing.md,
                            borderBottom: `1px solid ${theme.colors.border}`,
                            fontSize: theme.typography.sizes.md,
                            fontWeight: theme.typography.fontWeights.semibold,
                            margin: 0
                          }}>
                            Help & Support
                          </h4>
                          
                          {helpSupportItems.map((item, index) => (
                            <div key={item.label} style={{
                              padding: theme.spacing.md,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom: index < helpSupportItems.length - 1 ? `1px solid ${theme.colors.border}` : "none"
                            }}>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: theme.spacing.md
                              }}>
                                <span className="material-icons" style={{ 
                                  color: theme.colors.text.secondary
                                }}>
                                  {item.icon}
                                </span>
                                <span>{item.label}</span>
                              </div>
                              <span className="material-icons" style={{ 
                                color: theme.colors.text.secondary,
                                fontSize: "18px"
                              }}>
                                arrow_forward_ios
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Sign out button */}
                        <button style={{
                          width: "100%",
                          padding: theme.spacing.md,
                          backgroundColor: `${theme.colors.danger}10`,
                          color: theme.colors.danger,
                          border: `1px solid ${theme.colors.danger}25`,
                          borderRadius: theme.borderRadius.md,
                          fontWeight: theme.typography.fontWeights.medium,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: theme.spacing.sm
                        }}>
                          <span className="material-icons">
                            logout
                          </span>
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Cart floating button on mobile - only shown when not in cart tab */}
            {activeTab !== "cart" && (
              <CartButton onClick={handleOpenCart} />
            )}
            
            {/* Bottom navigation on mobile */}
            <BottomNav 
              activeTab={activeTab} 
              onTabChange={handleTabChange}
              onOpenCart={handleOpenCart}
            />
              {/* Enhanced Cart Modal */}
            <EnhancedCart isOpen={isCartOpen} onClose={handleCloseCart} />
          </motion.main>
        ) : (
          // For tablet and desktop devices, use our new DesktopLayout
          <DesktopLayout
            profileSrc="https://randomuser.me/api/portraits/women/79.jpg"
            restaurantName={restaurant?.name}
            branchName={branch?.name}
            tableNumber={branch?.tableNumber || "12"}
            onOpenCart={handleOpenCart}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          >
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                fontFamily: theme.typography.fontFamily.primary,
                minHeight: "calc(100vh - 160px)", // Account for header height
              }}
              aria-label="OrderEase food ordering app"
            >
              <AnimatePresence mode="wait">
                {activeTab === "menu" && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MenuView />
                  </motion.div>
                )}
                
                {activeTab === "search" && (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center", 
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.md
                      }}>
                        search
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        Search Feature
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        Search functionality will be implemented here. The enhanced experience allows you to quickly find menu items.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === "orders" && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.md
                      }}>
                        receipt_long
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        Your Orders
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        Order history will appear here with enhanced details and tracking information.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.md
                      }}>
                        person
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        Your Profile
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        User profile settings will appear here with enhanced configuration options.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {/* Additional tablet/desktop tabs */}
                {activeTab === "featured" && (
                  <motion.div
                    key="featured"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.accent,
                        marginBottom: theme.spacing.md
                      }}>
                        star
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        Featured Dishes
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        Explore our chef's special selections and seasonal dishes.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === "favorites" && (
                  <motion.div
                    key="favorites"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.danger,
                        marginBottom: theme.spacing.md
                      }}>
                        favorite
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        Your Favorites
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        Quick access to your favorite dishes from past orders.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {activeTab === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column",
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: theme.spacing.xl,
                      minHeight: "50vh",
                      background: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      boxShadow: theme.shadows.sm
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: "48px", 
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.md
                      }}>
                        settings
                      </span>
                      <h2 style={{
                        fontSize: theme.typography.sizes["2xl"],
                        marginBottom: theme.spacing.md
                      }}>
                        App Settings
                      </h2>
                      <p style={{ 
                        textAlign: "center", 
                        color: theme.colors.text.secondary,
                        maxWidth: "500px",
                        fontSize: theme.typography.sizes.md
                      }}>
                        Customize your app experience with theme preferences and notification settings.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.main>
              {/* Enhanced Cart Modal - Shared between mobile and desktop */}
            <EnhancedCart isOpen={isCartOpen} onClose={handleCloseCart} />
          </DesktopLayout>
        )
      )}
        {/* Add a global keyframe for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
};

export default OrderEaseApp;