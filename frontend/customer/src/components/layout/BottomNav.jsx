import React from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";

const BottomNav = ({ items, activeIndex, onSelect }) => (
  <nav
    aria-label="Bottom navigation"
    style={{
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.92)",
      backdropFilter: "blur(20px)",
      borderRadius: theme.borderRadius.xl,
      padding: "16px 20px",
      display: "flex",
      width: "90%",
      maxWidth: "460px",
      justifyContent: "space-between",
      boxShadow:
        "0 10px 30px rgba(46, 58, 89, 0.15), 0 5px 15px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(255, 255, 255, 0.2) inset",
      userSelect: "none",
      zIndex: 999,
      border: `1px solid rgba(255, 255, 255, 0.18)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "55%",
        background:
          "linear-gradient(to top, rgba(255, 71, 87, 0.08), transparent)",
        borderRadius: "0 0 24px 24px",
        zIndex: -1,
      }}
    />

    {/* Active tab background highlight */}
    <motion.div
      layoutId="active-tab-bg"
      initial={false}
      animate={{
        x: `calc(${activeIndex * 100}% + ${activeIndex * 8}px)`,
        width: `calc(${100 / items.length}% - 16px)`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        height: "80%",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        borderRadius: "14px",
        boxShadow: "0 4px 12px rgba(46, 58, 89, 0.08)",
        border: `1px solid ${theme.colors.border}`,
        zIndex: -1,
      }}
    />

    {items.map((item, idx) => {
      const isActive = activeIndex === idx;
      return (
        <motion.button
          key={item.id}
          onClick={() => onSelect(idx)}
          aria-current={isActive ? "page" : undefined}
          whileTap={{ scale: 0.88 }}
          initial={false}
          style={{
            all: "unset",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isActive ? theme.colors.primary : theme.colors.text.muted,
            fontWeight: isActive
              ? theme.typography.fontWeights.bold
              : theme.typography.fontWeights.medium,
            fontSize: theme.typography.sizes.xs,
            padding: "8px",
            position: "relative",
            transition: `all ${theme.transitions.medium}`,
            flex: 1,
            zIndex: 2,
            letterSpacing: "0.3px",
          }}
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{
              scale: isActive ? 1.2 : 1,
              y: isActive ? -2 : 0,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              display: "flex",
              position: "relative",
              marginBottom: "6px",
            }}
          >
            {/* Animated icon background glow effect for active item */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1.5,
                }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "130%",
                  height: "130%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${theme.colors.primary}20 0%, ${theme.colors.primary}10 60%, transparent 70%)`,
                  filter: "blur(4px)",
                  zIndex: -1,
                }}
              />
            )}

            <span
              className="material-icons"
              style={{
                fontSize: "22px",
                userSelect: "none",
                position: "relative",
                filter: isActive
                  ? `drop-shadow(0 2px 4px ${theme.colors.primary}40)`
                  : "none",
                transition: `all ${theme.transitions.medium}`,
              }}
              aria-hidden="true"
            >
              {item.icon}
            </span>

            {/* Badge for cart items */}
            {idx === 2 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-8px",
                  fontSize: "10px",
                  backgroundColor: theme.colors.primary,
                  color: "white",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontWeight: "bold",
                  boxShadow: "0 2px 8px rgba(255, 71, 87, 0.5)",
                  border: "1.5px solid white",
                }}
              >
                3
              </motion.span>
            )}
          </motion.div>

          <motion.span
            animate={{
              opacity: isActive ? 1 : 0.8,
              fontWeight: isActive
                ? theme.typography.fontWeights.bold
                : theme.typography.fontWeights.medium,
            }}
            style={{
              fontSize: isActive ? "11px" : "10px",
              transition: `all ${theme.transitions.medium}`,
              textShadow: isActive ? "0 0.5px 0 rgba(0,0,0,0.1)" : "none",
            }}
          >
            {item.label}
          </motion.span>

          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                position: "absolute",
                bottom: "-2px",
                width: "20px",
                height: "3px",
                borderRadius: "3px",
                background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryLight})`,
                boxShadow: `0 1px 3px ${theme.colors.primary}50`,
              }}
            />
          )}
        </motion.button>
      );
    })}
  </nav>
);

export default BottomNav;