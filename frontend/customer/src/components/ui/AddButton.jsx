import React from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";

const AddButton = ({ onClick, isTablet, isDesktop }) => (
  <motion.button
    type="button"
    onClick={(e) => onClick(e)} // Pass the event to parent component
    whileTap={{ scale: 0.9 }}
    whileHover={{
      scale: 1.05,
      boxShadow: `0 8px 20px ${theme.colors.primary}50`,
    }}
    style={{
      backgroundColor: theme.colors.primary,
      border: "none",
      borderRadius: theme.borderRadius.md,
      padding: isDesktop ? "10px 18px" : "8px 10px",
      color: theme.colors.text.light,
      fontWeight: theme.typography.fontWeights.semibold,
      fontSize: isDesktop ? theme.typography.sizes.md : theme.typography.sizes.sm,
      cursor: "pointer",
      display: "flex",
      gap: "8px",
      alignItems: "center",
      boxShadow: `0 6px 12px ${theme.colors.primary}40`,
      userSelect: "none",
      transition: `all ${theme.transitions.fast}`,
    }}
    aria-label="Add to cart"
  >
    <span
      className="material-icons"
      aria-hidden="true"
      style={{ fontSize: isDesktop ? "20px" : "18px", lineHeight: 1 }}
    >
      add_shopping_cart
    </span>
    Add
  </motion.button>
);

export default AddButton;