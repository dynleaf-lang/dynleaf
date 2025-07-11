import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";

const SearchBar = ({ 
  value, 
  onChange, 
  onFilterClick, 
  isTablet, 
  isDesktop,
  placeholder,
  showSuggestions = false,
  suggestions = [],
  onSuggestionClick,
  selectedSuggestionIndex = -1,
  onKeyDown,
  onClear,
  showFilters = false,
  hasActiveFilters = false
}) => (
  <div
    style={{
      display: "flex",
      gap: isDesktop ? "16px" : "12px",
      marginBottom: theme.spacing.lg,
      position: "relative"
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
        placeholder={placeholder || (isDesktop ? "Search for your favorite meals..." : "Search for delicious meals...")}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          padding: isDesktop ? "16px 16px 16px 52px" : "14px 16px 14px 48px",
          paddingRight: value && onClear ? "52px" : (isDesktop ? "16px" : "16px"),
          fontSize: isDesktop ? theme.typography.sizes.md : theme.typography.sizes.sm,
          fontWeight: theme.typography.fontWeights.medium,
          borderRadius: theme.borderRadius.pill,
          border: `1.5px solid ${value ? theme.colors.primary : theme.colors.border}`,
          backgroundColor: theme.colors.card,
          color: theme.colors.text.primary,
          outlineOffset: "2px",
          transition: `all ${theme.transitions.fast}`,
          boxShadow: value ? `0 0 0 4px ${theme.colors.primaryLight}25` : theme.shadows.sm,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = theme.colors.primary;
          e.target.style.boxShadow = `0 0 0 4px ${theme.colors.primaryLight}25`;
        }}
        onBlur={(e) => {
          if (!value) {
            e.target.style.borderColor = theme.colors.border;
            e.target.style.boxShadow = theme.shadows.sm;
          }
        }}
      />
      
      {/* Clear button */}
      {value && onClear && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: theme.colors.text.muted,
            transition: `color ${theme.transitions.fast}`
          }}
          onMouseEnter={(e) => {
            e.target.style.color = theme.colors.text.primary;
          }}
          onMouseLeave={(e) => {
            e.target.style.color = theme.colors.text.muted;
          }}
        >
          <span className="material-icons" style={{ fontSize: "20px" }}>
            close
          </span>
        </button>
      )}
      
      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: theme.colors.card,
              borderRadius: theme.borderRadius.lg,
              boxShadow: theme.shadows.lg,
              zIndex: 1000,
              marginTop: "4px",
              overflow: "hidden",
              border: `1px solid ${theme.colors.border}`
            }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                style={{
                  width: "100%",
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  textAlign: "left",
                  border: "none",
                  backgroundColor: selectedSuggestionIndex === index 
                    ? `${theme.colors.primary}10` 
                    : "transparent",
                  cursor: "pointer",
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text.primary,
                  borderBottom: index < suggestions.length - 1 ? `1px solid ${theme.colors.border}` : "none",
                  transition: "background-color 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm
                }}
                onMouseEnter={(e) => {
                  if (selectedSuggestionIndex !== index) {
                    e.target.style.backgroundColor = `${theme.colors.primary}05`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSuggestionIndex !== index) {
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span className="material-icons" style={{
                  fontSize: "16px",
                  color: theme.colors.text.secondary
                }}>
                  search
                </span>
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Filter Button */}
    {showFilters && (
      <motion.button
        aria-label="Filter options"
        title="Filter options"
        onClick={onFilterClick}
        whileTap={{ scale: 0.92 }}
        style={{
          width: isDesktop ? "52px" : "48px",
          height: isDesktop ? "52px" : "48px",
          borderRadius: theme.borderRadius.lg,
          backgroundColor: hasActiveFilters ? theme.colors.primary : theme.colors.secondary,
          border: "none",
          cursor: "pointer",
          color: theme.colors.text.light,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: hasActiveFilters ? `0 4px 12px ${theme.colors.primary}40` : theme.shadows.md,
          transition: `all ${theme.transitions.fast}`,
          position: "relative"
        }}
        whileHover={{
          backgroundColor: hasActiveFilters ? theme.colors.primaryDark : theme.colors.primary,
          boxShadow: `0 8px 20px ${theme.colors.primary}50`,
        }}
      >
        <span className="material-icons" aria-hidden="true" style={{ 
          userSelect: "none", 
          fontSize: isDesktop ? "24px" : "22px" 
        }}>
          tune
        </span>
        
        {/* Active filter indicator */}
        {hasActiveFilters && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "8px",
              height: "8px",
              backgroundColor: theme.colors.accent,
              borderRadius: "50%",
              border: `2px solid ${theme.colors.text.light}`
            }}
          />
        )}
      </motion.button>
    )}
  </div>
);

export default SearchBar;