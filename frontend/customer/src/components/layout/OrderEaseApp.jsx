import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Import components
import Header from "../ui/Header";
import QRCodeScanner from "../ui/QRCodeScanner";
import QRInstructions from "../ui/QRInstructions";
import MenuView from "../ui/MenuView";
import BottomNav from "../ui/BottomNav";

// Import context and theme
import { useRestaurant } from "../../context/RestaurantContext";
import { theme } from "../../data/theme";

const OrderEaseApp = () => {
  // Track window resize for responsive design
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  // Track active tab for navigation
  const [activeTab, setActiveTab] = useState("menu");
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get data from restaurant context
  const { 
    restaurant, 
    branch, 
    loading, 
    error, 
    initialized 
  } = useRestaurant();
  
  // Determine responsive layout properties
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;

  // Handler for bottom navigation tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Handle navigation logic here (you'll implement actual navigation between views)
    console.log(`Navigation to: ${tabId}`);
  };

  // Compute what to render based on state - avoiding early returns
  const urlParams = new URLSearchParams(window.location.search);
  const hasRestaurantParams = urlParams.has('restaurantId') && urlParams.has('branchId');
  const hasParamsRef = useRef(hasRestaurantParams);

  // Use conditional rendering instead of early returns
  return (
    <>
      {/* Case 1: Not initialized and loading with params */}
      {!initialized && loading && hasParamsRef.current && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
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
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            maxWidth: isDesktop ? "1200px" : "100%",
            margin: "0 auto",
            fontFamily: theme.typography.fontFamily.primary,
            backgroundColor: theme.colors.card,
            minHeight: "100vh",
            paddingBottom: "70px", // Add padding to prevent content from being hidden behind the bottom nav
          }}
          aria-label="OrderEase food ordering app"
        >
          <Header
            profileSrc="https://randomuser.me/api/portraits/women/79.jpg"
            isDesktop={isDesktop}
            restaurantName={restaurant?.name}
            branchName={branch?.name}
            tableNumber={branch?.tableNumber || "12"}
          />
          
          {/* Main Content Area - This would change based on active tab */}
          {activeTab === "menu" && <MenuView />}
          
          {/* Other tab content would be conditionally rendered here */}
          {activeTab === "search" && (
            <div style={{ 
              padding: theme.spacing.md,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh"
            }}>
              <span className="material-icons" style={{ fontSize: "48px", color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                search
              </span>
              <h2>Search Feature</h2>
              <p style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                Search functionality will be implemented here
              </p>
            </div>
          )}
          
          {activeTab === "cart" && (
            <div style={{ 
              padding: theme.spacing.md,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh"
            }}>
              <span className="material-icons" style={{ fontSize: "48px", color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                shopping_cart
              </span>
              <h2>Your Cart</h2>
              <p style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                Cart items will appear here
              </p>
            </div>
          )}
          
          {activeTab === "orders" && (
            <div style={{ 
              padding: theme.spacing.md,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh"
            }}>
              <span className="material-icons" style={{ fontSize: "48px", color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                receipt_long
              </span>
              <h2>Your Orders</h2>
              <p style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                Order history will appear here
              </p>
            </div>
          )}
          
          {activeTab === "profile" && (
            <div style={{ 
              padding: theme.spacing.md,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh"
            }}>
              <span className="material-icons" style={{ fontSize: "48px", color: theme.colors.text.secondary, marginBottom: theme.spacing.md }}>
                person
              </span>
              <h2>Your Profile</h2>
              <p style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                User profile settings will appear here
              </p>
            </div>
          )}
          
          {/* Sticky Bottom Navigation */}
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </motion.main>
      )}
    </>
  );
};

export default OrderEaseApp;