import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import components
import Header from "../ui/Header";
import PreLoader from "../ui/PreLoader";
import QRInstructions from "../ui/QRInstructions";
import MenuView from "../ui/MenuView";
import SearchView from "../ui/SearchView";
import FavoritesView from "../ui/FavoritesView";
import OrdersView from "../ui/OrdersView";
import ProfileView from "../ui/ProfileView";
import BottomNav from "../ui/BottomNav";
import DesktopLayout from "./DesktopLayout";
import EnhancedCart from "../ui/EnhancedCart";
import CartButton from "../ui/CartButton";
import LoginModal from "../auth/LoginModal";
import SignupModal from "../auth/SignupModal";
import ErrorBoundary from "../Utils/ErrorBoundary";

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
  
  // Add global event listener for opening auth modal from favorites
  useEffect(() => {
    const handleOpenAuthModal = () => {
      setIsLoginModalOpen(true);
    };

    const handleNavigateToMenu = () => {
      setActiveTab("menu");
    };

    const handleNavigateToFavorites = () => {
      setActiveTab("favorites");
    };

    const handleNavigateToProfile = () => {
      setActiveTab("profile");
    };

    window.addEventListener('open-auth-modal', handleOpenAuthModal);
    window.addEventListener('navigate-to-menu', handleNavigateToMenu);
    window.addEventListener('navigate-to-favorites', handleNavigateToFavorites);
    window.addEventListener('navigate-to-profile', handleNavigateToProfile);

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuthModal);
      window.removeEventListener('navigate-to-menu', handleNavigateToMenu);
      window.removeEventListener('navigate-to-favorites', handleNavigateToFavorites);
      window.removeEventListener('navigate-to-profile', handleNavigateToProfile);
    };
  }, []);
  
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

  // Handler for profile navigation from header
  const handleNavigateToProfile = () => {
    handleTabChange("profile");
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

  // Compute what to render based on state
  const urlParams = new URLSearchParams(window.location.search);
  const hasRestaurantParams = urlParams.has('restaurantId') && urlParams.has('branchId');
  
  // Determine what to show based on the current state
  const shouldShowPreLoader = () => {
    // Show preloader when initially loading or when we have params and are loading
    return loading && (!error || hasRestaurantParams);
  };
  
  const shouldShowQRInstructions = () => {
    // Show QR instructions when:
    // 1. No URL params (need to scan QR)
    // 2. Have params but there's an error and not loading
    // 3. Initialized but no restaurant data (failed to load)
    return !hasRestaurantParams || 
           (hasRestaurantParams && error && !loading) ||
           (initialized && (!restaurant || !branch) && !loading);
  };
  
  const shouldShowMainApp = () => {
    // Show main app when we have successfully loaded restaurant data
    return initialized && restaurant && branch && !error;
  };

  // Use conditional rendering
  return (
    <ErrorBoundary>
      {/* Loading State */}
      {shouldShowPreLoader() && <PreLoader />}

      {/* QR Instructions / Error State */}
      {shouldShowQRInstructions() && !shouldShowPreLoader() && <QRInstructions />}

      {/* Main Application */}
      {shouldShowMainApp() && (
        isMobile ? (
          <>
           <Header
              profileSrc="https://randomuser.me/api/portraits/women/79.jpg"
              isDesktop={false}
              restaurantName={restaurant?.name}
              branchName={branch?.name}
              tableNumber={branch?.tableNumber || "12"}
              openLoginModal={handleOpenLoginModal}
              onNavigateToProfile={handleNavigateToProfile}
            />
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
                      <SearchView />
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
                      <FavoritesView />
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
                      <ProfileView />
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
          </>
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
            openLoginModal={handleOpenLoginModal}
            onNavigateToProfile={handleNavigateToProfile}
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
                    <SearchView />
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
                    <FavoritesView />
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
    </ErrorBoundary>
  );
};

export default OrderEaseApp;