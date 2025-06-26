import React from "react";
import ProductCard from "./ProductCard";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";

const ProductGrid = ({ products, onAdd }) => {
  const { isDesktop, isTablet, isMobile } = useResponsive();
  
  // Group products by categories for better mobile display
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(product);
    return acc;
  }, {});
  
  // Flat layout for desktop and tablet, grouped layout for mobile
  const renderLayout = () => {
    if (!isMobile || products.length < 5) {
      // Standard grid layout for desktop/tablet or small product lists
      return (
        <div
          style={{
            display: "grid",
            gap: isDesktop ? "28px" : isTablet ? "20px" : "12px",
            gridTemplateColumns: isDesktop
              ? "repeat(3, 1fr)"
              : isTablet
                ? "repeat(2, 1fr)"
                : "repeat(2, 1fr)", // Changed from 1 to 2 cards per row on mobile
            marginBottom: "96px",
            position: "relative",
          }}
        >
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAdd={onAdd} 
              isTablet={isTablet} 
              isDesktop={isDesktop} 
            />
          ))}
        </div>
      );
    } else {
      // Horizontal scrolling categories for mobile with many products
      return Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <div key={category} style={{ marginBottom: "32px" }}>
          <h3 style={{ 
            margin: "0 0 12px 4px", 
            fontSize: "1.1rem",
            color: theme.colors.text.primary,
            fontWeight: theme.typography.fontWeights.bold
          }}>
            {category}
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)", // Display 2 cards per row
            gap: "12px",
            padding: "0 0 16px 0"
          }}>
            {categoryProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                onAdd={onAdd}
                isTablet={isTablet}
                isDesktop={isDesktop}
              />
            ))}
          </div>
        </div>
      ));
    }
  };

  if (products.length === 0) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          textAlign: "center",
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.lg,
          color: theme.colors.text.secondary,
          border: `1px dashed ${theme.colors.border}`,
          marginBottom: "32px",
        }}
      >
        <span
          className="material-icons"
          style={{ 
            fontSize: "48px", 
            color: theme.colors.text.muted, 
            marginBottom: theme.spacing.sm 
          }}
        >
          search_off
        </span>
        <h3 style={{ 
          margin: "0 0 8px 0", 
          color: theme.colors.text.primary 
        }}>
          No items found
        </h3>
        <p style={{ margin: 0 }}>Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <section aria-label="Menu items">
      {renderLayout()}
    </section>
  );
};

export default ProductGrid;