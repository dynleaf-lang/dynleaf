import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import components
import Header from "../ui/Header";
import PreLoader from "../ui/PreLoader";
import QRInstructions from "../ui/QRInstructions";
import MenuView from "../ui/MenuView";
import OrdersView from "../ui/OrdersView";
import BottomNav from "../ui/BottomNav";
import DesktopLayout from "./DesktopLayout";
import EnhancedCart from "../ui/EnhancedCart";
import CartButton from "../ui/CartButton";
import LoginModal from "../auth/LoginModal";
import SignupModal from "../auth/SignupModal";

// Import context and theme
import { useRestaurant } from "../../context/RestaurantContext";
import { useResponsive } from "../../context/ResponsiveContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { theme } from "../../data/theme";

const OrderEaseApp = () => {
  // Use responsive context instead of tracking window resize manually
  const { isMobile, isTablet, isDesktop, windowWidth } = useResponsive();
  
  // Track active tab for navigation
  const [activeTab, setActiveTab] = useState("menu");
  
  // State to control cart modal visibility
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Auth modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  
  // Get data from restaurant context
  const { 
    restaurant, 
    branch, 
    loading, 
    error, 
    initialized 
  } = useRestaurant();
  
  // Get auth context
  const { isAuthenticated, user, logout } = useAuth();
  
  // Get cart context
  const { authRequired, resetAuthRequired } = useCart();
  
  // Check if auth is required for checkout
  useEffect(() => {
    if (authRequired) {
      setIsLoginModalOpen(true);
    }
  }, [authRequired]);
  
  // Handler for bottom navigation tab changes
  const handleTabChange = (tabId) => {
    // If profile tab is clicked and user is not authenticated, show login modal
    if (tabId === "profile" && !isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    
    setActiveTab(tabId);
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
  
  // Handler for opening login modal
  const handleOpenLoginModal = () => {
    setIsLoginModalOpen(true);
    setIsSignupModalOpen(false);
  };
  
  // Handler for closing login modal
  const handleCloseLoginModal = (action) => {
    setIsLoginModalOpen(false);
    resetAuthRequired();
    
    if (action === "signup") {
      setIsSignupModalOpen(true);
    }
  };
  
  // Handler for opening signup modal
  const handleOpenSignupModal = () => {
    setIsSignupModalOpen(true);
    setIsLoginModalOpen(false);
  };
  
  // Handler for closing signup modal
  const handleCloseSignupModal = (action) => {
    setIsSignupModalOpen(false);
    
    if (action === "login") {
      setIsLoginModalOpen(true);
    }
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
    <>      {/* Case 1: Not initialized and loading with params */}
      {!initialized && loading && hasParamsRef.current && (
        <PreLoader />
      )}{/* Case 2: Not initialized and need to show pre-loader */}
      {!initialized && !hasParamsRef.current && (
        <PreLoader />
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
              openLoginModal={handleOpenLoginModal}
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
                      <OrdersView />
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
                      {isAuthenticated ? (
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
                              overflow: "hidden",
                              backgroundColor: theme.colors.primary,
                              color: "#fff",
                              fontSize: "32px",
                              fontWeight: theme.typography.fontWeights.bold
                            }}>
                              {user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <h3 style={{
                              fontSize: theme.typography.sizes.lg,
                              fontWeight: theme.typography.fontWeights.semibold,
                              margin: `${theme.spacing.xs} 0`,
                              color: theme.colors.text.primary
                            }}>
                              {user?.name || "User"}
                            </h3>
                            <p style={{
                              color: theme.colors.text.secondary,
                              fontSize: theme.typography.sizes.sm,
                              marginBottom: theme.spacing.md
                            }}>
                              {user?.email || user?.phone || ""}
                            </p>
                            <button 
                              onClick={() => logout()}
                              style={{
                                backgroundColor: "#f5f5f5",
                                color: theme.colors.text.primary,
                                border: "none",
                                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                borderRadius: theme.borderRadius.md,
                                fontWeight: theme.typography.fontWeights.medium
                              }}
                            >
                              Logout
                            </button>
                          </div>
                          
                          {/* Settings sections */}
                          <div style={{
                            backgroundColor: "#fff",
                            borderRadius: theme.borderRadius.lg,
                            boxShadow: theme.shadows.sm,
                            overflow: "hidden",
                            marginBottom: theme.spacing.lg
                          }}>
                            <h4 style={{
                              padding: theme.spacing.md,
                              margin: 0,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              fontWeight: theme.typography.fontWeights.medium,
                              fontSize: theme.typography.sizes.md,
                              color: theme.colors.text.primary
                            }}>
                              Account Settings
                            </h4>
                            <ul style={{
                              listStyle: "none",
                              padding: 0,
                              margin: 0
                            }}>
                              {accountSettings.map((item, index) => (
                                <li key={index} style={{
                                  borderBottom: index !== accountSettings.length - 1 ? 
                                    `1px solid ${theme.colors.border}` : 
                                    "none"
                                }}>
                                  <button style={{
                                    display: "flex",
                                    alignItems: "center",
                                    width: "100%",
                                    padding: theme.spacing.md,
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left"
                                  }}>
                                    <span className="material-icons" style={{
                                      color: theme.colors.text.secondary,
                                      marginRight: theme.spacing.md
                                    }}>
                                      {item.icon}
                                    </span>
                                    <span style={{
                                      flex: 1,
                                      fontSize: theme.typography.sizes.md,
                                      color: theme.colors.text.primary
                                    }}>
                                      {item.label}
                                    </span>
                                    <span className="material-icons" style={{
                                      color: theme.colors.text.secondary,
                                      fontSize: "18px"
                                    }}>
                                      chevron_right
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div style={{
                            backgroundColor: "#fff",
                            borderRadius: theme.borderRadius.lg,
                            boxShadow: theme.shadows.sm,
                            overflow: "hidden"
                          }}>
                            <h4 style={{
                              padding: theme.spacing.md,
                              margin: 0,
                              borderBottom: `1px solid ${theme.colors.border}`,
                              fontWeight: theme.typography.fontWeights.medium,
                              fontSize: theme.typography.sizes.md,
                              color: theme.colors.text.primary
                            }}>
                              Help & Support
                            </h4>
                            <ul style={{
                              listStyle: "none",
                              padding: 0,
                              margin: 0
                            }}>
                              {helpSupportItems.map((item, index) => (
                                <li key={index} style={{
                                  borderBottom: index !== helpSupportItems.length - 1 ? 
                                    `1px solid ${theme.colors.border}` : 
                                    "none"
                                }}>
                                  <button style={{
                                    display: "flex",
                                    alignItems: "center",
                                    width: "100%",
                                    padding: theme.spacing.md,
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textAlign: "left"
                                  }}>
                                    <span className="material-icons" style={{
                                      color: theme.colors.text.secondary,
                                      marginRight: theme.spacing.md
                                    }}>
                                      {item.icon}
                                    </span>
                                    <span style={{
                                      flex: 1,
                                      fontSize: theme.typography.sizes.md,
                                      color: theme.colors.text.primary
                                    }}>
                                      {item.label}
                                    </span>
                                    <span className="material-icons" style={{
                                      color: theme.colors.text.secondary,
                                      fontSize: "18px"
                                    }}>
                                      chevron_right
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "60vh",
                          padding: theme.spacing.lg
                        }}>
                          <div style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            backgroundColor: `${theme.colors.primary}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: theme.spacing.lg
                          }}>
                            <span className="material-icons" style={{
                              fontSize: "40px",
                              color: theme.colors.primary
                            }}>account_circle</span>
                          </div>
                          
                          <h2 style={{
                            fontSize: theme.typography.sizes.xl,
                            fontWeight: theme.typography.fontWeights.semibold,
                            marginBottom: theme.spacing.md,
                            color: theme.colors.text.primary,
                            textAlign: "center"
                          }}>Sign in to your account</h2>
                          
                          <p style={{
                            fontSize: theme.typography.sizes.md,
                            color: theme.colors.text.secondary,
                            marginBottom: theme.spacing.lg,
                            textAlign: "center",
                            maxWidth: "300px"
                          }}>
                            Login to access your profile, view order history, and checkout faster
                          </p>
                          
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: theme.spacing.md,
                            width: "100%",
                            maxWidth: "300px"
                          }}>
                            <button
                              onClick={handleOpenLoginModal}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                backgroundColor: theme.colors.primary,
                                color: "#fff",
                                border: "none",
                                borderRadius: theme.borderRadius.md,
                                fontSize: theme.typography.sizes.md,
                                fontWeight: theme.typography.fontWeights.medium,
                                cursor: "pointer"
                              }}
                            >
                              Login
                            </button>
                            
                            <button
                              onClick={handleOpenSignupModal}
                              style={{
                                width: "100%",
                                padding: theme.spacing.md,
                                backgroundColor: "#fff",
                                color: theme.colors.primary,
                                border: `1px solid ${theme.colors.primary}`,
                                borderRadius: theme.borderRadius.md,
                                fontSize: theme.typography.sizes.md,
                                fontWeight: theme.typography.fontWeights.medium,
                                cursor: "pointer"
                              }}
                            >
                              Create Account
                            </button>
                          </div>
                        </div>
                      )}
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
            <EnhancedCart 
              isOpen={isCartOpen} 
              onClose={handleCloseCart} 
              onLoginModalOpen={handleOpenLoginModal}
              onSignupModalOpen={handleOpenSignupModal}
            />
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
                    <OrdersView isDesktop={true} />
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
            <EnhancedCart 
              isOpen={isCartOpen} 
              onClose={handleCloseCart} 
              onLoginModalOpen={handleOpenLoginModal}
              onSignupModalOpen={handleOpenSignupModal}
            />
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

      {/* Authentication Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={handleCloseLoginModal} 
      />
      
      <SignupModal 
        isOpen={isSignupModalOpen} 
        onClose={handleCloseSignupModal} 
      />
    </>
  );
};

export default OrderEaseApp;