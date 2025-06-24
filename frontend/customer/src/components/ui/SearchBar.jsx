import React from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";

const SearchBar = ({ value, onChange, onFilterClick, isTablet, isDesktop }) => (
  <div
    style={{
      display: "flex",
      gap: isDesktop ? "16px" : "12px",
      marginBottom: theme.spacing.lg,
    }}
  >
    <div
      role="search"
      style={{
        flex: 1,
        position: "relative",
      }}
    >
      <span
        className="material-icons"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          color: theme.colors.text.muted,
          fontSize: isDesktop ? "22px" : "20px",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        search
      </span>
      <input
        type="search"
        aria-label="Search food items"
        placeholder={isDesktop ? "Search for your favorite meals..." : "Search for delicious meals..."}
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: isDesktop ? "16px 16px 16px 52px" : "14px 16px 14px 48px",
          fontSize: isDesktop ? theme.typography.sizes.md : theme.typography.sizes.sm,
          fontWeight: theme.typography.fontWeights.medium,
          borderRadius: theme.borderRadius.pill,
          border: `1.5px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.card,
          color: theme.colors.text.primary,
          outlineOffset: "2px",
          transition: `all ${theme.transitions.fast}`,
          boxShadow: theme.shadows.sm,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = theme.colors.primary;
          e.target.style.boxShadow = `0 0 0 4px ${theme.colors.primaryLight}25`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = theme.colors.border;
          e.target.style.boxShadow = theme.shadows.sm;
        }}
      />
    </div>

    <motion.button
      aria-label="Filter options"
      title="Filter options"
      onClick={onFilterClick}
      whileTap={{ scale: 0.92 }}
      style={{
        width: isDesktop ? "52px" : "48px",
        height: isDesktop ? "52px" : "48px",
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.secondary,
        border: "none",
        cursor: "pointer",
        color: theme.colors.text.light,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: theme.shadows.md,
        transition: `all ${theme.transitions.fast}`,
      }}
      whileHover={{
        backgroundColor: theme.colors.primary,
        boxShadow: `0 8px 20px ${theme.colors.primary}50`,
      }}
    >
      <span className="material-icons" aria-hidden="true" style={{ userSelect: "none", fontSize: isDesktop ? "24px" : "22px" }}>
        tune
      </span>
    </motion.button>
  </div>
);

export default SearchBar;