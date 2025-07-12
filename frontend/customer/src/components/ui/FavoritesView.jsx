import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import { useResponsive } from "../../context/ResponsiveContext";
import ProductCard from "./ProductCard";
import LoginPromptModal from "./LoginPromptModal";

const FavoritesView = () => {
  const { isAuthenticated } = useAuth();
  const { favorites, loading, operationLoading, error, refreshFavorites } = useFavorites();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Default image URL for products without images
  const defaultImage = 'https://png.pngtree.com/png-clipart/20231003/original/pngtree-tasty-burger-png-ai-generative-png-image_13245897.png';

  

  // Removed debug functionality

  // Check if user is authenticated on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
    } else {
      setShowLoginPrompt(false);
      // Refresh favorites when the view is accessed
      refreshFavorites();
    }
  }, [isAuthenticated]);

  // Handle login prompt actions
  const handleLoginPromptLogin = () => {
    setShowLoginPrompt(false);
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
  };

  const handleLoginPromptClose = () => {
    setShowLoginPrompt(false);
    // Navigate back to profile
    window.dispatchEvent(new CustomEvent('navigate-to-profile'));
  };

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          padding: theme.spacing.lg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: "40px",
            height: "40px",
            border: `3px solid ${theme.colors.border}`,
            borderTop: `3px solid ${theme.colors.primary}`,
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          padding: theme.spacing.lg,
          textAlign: "center",
          minHeight: "300px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span
          className="material-icons"
          style={{
            fontSize: "48px",
            color: theme.colors.danger,
            marginBottom: theme.spacing.md,
          }}
        >
          error_outline
        </span>
        <h3
          style={{
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }}
        >
          Error Loading Favorites
        </h3>
        <p
          style={{
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.lg,
          }}
        >
          {error}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={refreshFavorites}
          style={{
            backgroundColor: theme.colors.primary,
            color: "white",
            border: "none",
            borderRadius: theme.borderRadius.md,
            padding: "12px 24px",
            fontSize: theme.typography.sizes.md,
            fontWeight: theme.typography.fontWeights.bold,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span className="material-icons">refresh</span>
          Try Again
        </motion.button>
      </div>
    );
  }

  // Main favorites view for authenticated users
  if (isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          padding: isMobile ? theme.spacing.md : theme.spacing.lg,
          minHeight: "100vh",
          backgroundColor: theme.colors.background,
          position: "relative",
        }}
      >
        {/* Operation Loading Overlay */}
        {operationLoading && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.md,
                boxShadow: theme.shadows.lg,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: "24px",
                  height: "24px",
                  border: `3px solid ${theme.colors.border}`,
                  borderTop: `3px solid ${theme.colors.primary}`,
                  borderRadius: "50%",
                }}
              />
              <span style={{ color: theme.colors.text.primary }}>
                Updating favorites...
              </span>
            </div>
          </div>
        )}
        {/* Header */}
        <div
          style={{
            marginBottom: theme.spacing.xl,
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Back Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-profile'))}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "transparent",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: theme.colors.text.secondary,
            }}
          >
            <span className="material-icons" style={{ fontSize: "20px" }}>
              arrow_back
            </span>
          </motion.button>

          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: theme.colors.primaryLight,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <span
              className="material-icons"
              style={{
                fontSize: "32px",
                color: theme.colors.primary,
              }}
            >
              favorite
            </span>
          </motion.div>

          <h1
            style={{
              fontSize: isMobile ? theme.typography.sizes.xl : theme.typography.sizes.xxl,
              fontWeight: theme.typography.fontWeights.bold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.sm,
            }}
          >
            My Favorites
          </h1>
          
          <p
            style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.text.secondary,
            }}
          >
            Your favorite dishes saved for quick ordering
          </p>
          

        </div>

        {/* Favorites Grid */}
        {favorites && favorites.length > 0 ? (
          <>


            <motion.div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, 1fr)" // Two columns on mobile
                  : isTablet
                  ? "repeat(auto-fit, minmax(320px, 1fr))"
                  : "repeat(auto-fit, minmax(350px, 1fr))",
                gap: isMobile ? theme.spacing.sm : theme.spacing.lg, // Smaller gap on mobile
                maxWidth: "1200px",
                margin: "0 auto",
              }}
            >
              <AnimatePresence>
                {favorites.map((product, index) => {
                  // Generate a unique key using the product's unique identifier
                  const uniqueKey = product.id || product.itemId || product._id || product.productId || `favorite-${index}-${Date.now()}`;
                  
                  // Handle both enhanced product data and basic favorite objects
                  const productData = {
                    // Map backend fields to ProductCard expected fields
                    id: product.id || product.itemId || product._id || product.productId,
                    itemId: product.itemId || product.productId,
                    title: product.name || product.title || `Product ${product.productId || 'Unknown'}`, // ProductCard expects 'title'
                    subtitle: product.description || product.subtitle || 'No description available', // ProductCard expects 'subtitle'
                    image: product.imageUrl || product.image || defaultImage, // ProductCard expects 'image'
                    price: product.price || 0,
                    isVegetarian: product.isVegetarian || false,
                    tags: product.tags || [],
                    featured: product.featured || false,
                    popular: product.popular || false, // ProductCard looks for 'popular'
                    isActive: product.isActive !== false, // Default to true
                    sizeVariants: product.sizeVariants || [],
                    variants: product.variants || [],
                    sizes: product.sizes || [],
                    extras: product.extras || [],
                    addons: product.addons || [],
                    options: product.options || [],
                    category: product.category || { name: 'Uncategorized' },
                    addedAt: product.addedAt
                  };
                  
                  return (
                    <motion.div
                      key={uniqueKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <ProductCard
                        product={productData}
                        isTablet={isTablet}
                        isDesktop={isDesktop}
                        isFavoritesView={true}
                        isMobileCompact={isMobile}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              textAlign: "center",
              padding: theme.spacing.xl,
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                backgroundColor: theme.colors.background,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                border: `2px dashed ${theme.colors.border}`,
              }}
            >
              <span
                className="material-icons"
                style={{
                  fontSize: "40px",
                  color: theme.colors.text.muted,
                }}
              >
                favorite_border
              </span>
            </div>

            <h3
              style={{
                fontSize: theme.typography.sizes.lg,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.sm,
              }}
            >
              No Favorites Yet
            </h3>

            <p
              style={{
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.lg,
                lineHeight: 1.5,
              }}
            >
              Start adding items to your favorites by clicking the heart icon on any dish in the menu.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Navigate to menu - you might want to emit an event
                window.dispatchEvent(new CustomEvent('navigate-to-menu'));
              }}
              style={{
                backgroundColor: theme.colors.primary,
                color: "white",
                border: "none",
                borderRadius: theme.borderRadius.md,
                padding: "12px 24px",
                fontSize: theme.typography.sizes.md,
                fontWeight: theme.typography.fontWeights.bold,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto",
              }}
            >
              <span className="material-icons">restaurant_menu</span>
              Browse Menu
            </motion.button>
          </motion.div>
        )}

        {/* Login Prompt Modal for non-authenticated users */}
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={handleLoginPromptClose}
          onLogin={handleLoginPromptLogin}
        />
      </motion.div>
    );
  }

  // Fallback (shouldn't reach here, but just in case)
  return null;
};

export default FavoritesView;
