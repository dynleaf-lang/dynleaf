import React, { memo } from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory, isTablet, isDesktop }) => (
  <nav aria-label="Food categories" style={{ marginBottom: theme.spacing.xl }}>
    <ul
      style={{
        display: "flex",
        gap: isDesktop ? "16px" : "12px",
        overflowX: isDesktop ? "visible" : "auto",
        padding: isDesktop ? theme.spacing.md : `${theme.spacing.sm} 0`,
        margin: 0,
        listStyleType: "none",
        userSelect: "none",
        flexWrap: isDesktop ? "wrap" : "nowrap",
      }}
    >
      
      {/* Render other categories */}
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;  
        
        return (
          <li key={category.id || category.name}>
            <motion.button
              onClick={() => onSelectCategory(category.id)}
              aria-pressed={isSelected}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "0",
                borderRadius: theme.borderRadius.xl,
                border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                cursor: "pointer",
                backgroundColor: isSelected ? `${theme.colors.primary}10` : theme.colors.card,
                boxShadow: isSelected ? `0 8px 16px ${theme.colors.primary}30` : theme.shadows.sm,
                minWidth: isDesktop ? "110px" : "90px",
                transition: `all ${theme.transitions.medium}`,
                outlineOffset: "2px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
              whileHover={
                !isSelected
                  ? {
                      boxShadow: theme.shadows.md,
                      backgroundColor: theme.colors.background,
                      scale: 1.03,
                      border: `1px solid ${theme.colors.primary}30`,
                    }
                  : {}
              }
            >
              <div
                style={{
                  borderRadius: `${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0`,
                  backgroundColor: isSelected ? theme.colors.primary : "transparent",
                  width: "100%",
                  height: "4px",
                  transition: `all ${theme.transitions.medium}`,
                }}
              />
              <div
                style={{
                  padding: "12px 8px 8px 8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: isDesktop ? "50px" : "44px",
                    height: isDesktop ? "50px" : "44px",
                    borderRadius: "50%",
                    backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.background,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "8px",
                    transition: `all ${theme.transitions.medium}`,
                  }}
                >
                  <motion.img
                    src={category.image}
                    alt={category.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transition: `all ${theme.transitions.medium}`,
                      filter: isSelected ? "none" : "grayscale(30%)",
                    }}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    animate={{
                      scale: isSelected ? 1.05 : 1,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontWeight: isSelected
                      ? theme.typography.fontWeights.bold
                      : theme.typography.fontWeights.semibold,
                    fontSize: isDesktop ? theme.typography.sizes.sm : theme.typography.sizes.xs,
                    color: isSelected ? theme.colors.primary : theme.colors.text.secondary,
                    letterSpacing: "0.3px",
                    paddingBottom: "4px",
                  }}
                >
                  {category.name}
                </span>
              </div>
            </motion.button>
          </li>
        );
      })}
    </ul>
  </nav>
);

// Add prop comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
  // Check if selectedCategory changed
  if (prevProps.selectedCategory !== nextProps.selectedCategory) {
    return false;
  }
  
  // Check if responsive props changed
  if (prevProps.isTablet !== nextProps.isTablet || prevProps.isDesktop !== nextProps.isDesktop) {
    return false;
  }
  
  // Check if categories length changed
  if (prevProps.categories.length !== nextProps.categories.length) {
    return false;
  }
  
  // Check if any category object changed by comparing their id and name properties
  // This is more efficient than using JSON.stringify for deep comparison
  for (let i = 0; i < prevProps.categories.length; i++) {
    if (prevProps.categories[i].id !== nextProps.categories[i].id ||
        prevProps.categories[i].name !== nextProps.categories[i].name) {
      return false;
    }
  }
  
  // All checks passed, props are equal
  return true;
};

// Export memoized component to prevent unnecessary re-renders
export default memo(CategoryFilter, arePropsEqual);