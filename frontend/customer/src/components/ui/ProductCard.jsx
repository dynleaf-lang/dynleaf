import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddButton from "./AddButton";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";

const ProductCard = ({ product, isTablet, isDesktop }) => {
  const { addToCart } = useCart();
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});

  // Handle adding product to cart
  const handleAddToCart = () => {
    if (product.options && product.options.length > 0) {
      // If product has options, show options modal
      setShowOptions(true);
    } else {
      // If no options, add directly to cart
      addToCart(product, 1, []);
    }
  };

  // Handle option selection
  const handleOptionChange = (optionName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  // Add to cart with selected options
  const handleAddWithOptions = () => {
    const options = Object.entries(selectedOptions).map(([name, value]) => ({
      name,
      value,
    }));

    addToCart(product, 1, options);
    setShowOptions(false);
    setSelectedOptions({});
  };

  return (
    <>
      <motion.article
        whileHover={{ y: -8, boxShadow: theme.shadows.lg }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.xl,
          padding: isDesktop ? "24px" : "20px",
          boxShadow: theme.shadows.md,
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          cursor: "default",
          minWidth: isTablet ? "auto" : "180px",
          maxWidth: "100%",
          transition: `all ${theme.transitions.medium}`,
          border: `1px solid ${theme.colors.border}`,
          position: "relative",
          overflow: "hidden",
          height: "100%",
        }}
        tabIndex={0}
        aria-label={`${product.title} - ${product.subtitle}, price $${product.price.toFixed(
          2
        )}`}
      >
        {product.popular && (
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "-35px",
              backgroundColor: theme.colors.accent,
              color: "white",
              padding: "6px 40px",
              fontWeight: "bold",
              fontSize: "12px",
              transform: "rotate(-45deg)",
              zIndex: 1,
            }}
          >
            POPULAR
          </div>
        )}

        <div
          style={{ position: "absolute", top: "14px", right: "14px", zIndex: 2 }}
        >
          <motion.button
            aria-label="Add to favorites"
            style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: theme.colors.text.muted,
              boxShadow: theme.shadows.sm,
            }}
            whileHover={{ scale: 1.1, color: theme.colors.primary }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="material-icons" style={{ fontSize: "18px" }}>
              favorite_border
            </span>
          </motion.button>
        </div>

        <div
          style={{
            marginBottom: theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.background,
            padding: theme.spacing.md,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            aspectRatio: isDesktop ? "auto" : "1/1",
            maxHeight: isDesktop ? "160px" : "auto",
          }}
        >
          <motion.img
            whileHover={{ scale: 1.08, rotate: 5 }}
            src={product.image}
            alt={product.title}
            loading="lazy"
            style={{
              width: "100%",
              height: isDesktop ? "130px" : "100%",
              objectFit: "contain",
              userSelect: "none",
              filter: "drop-shadow(0px 8px 16px rgba(0,0,0,0.1))",
              maxHeight: "140px",
            }}
            draggable={false}
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <h2
            style={{
              fontSize: isDesktop
                ? theme.typography.sizes.xl
                : theme.typography.sizes.lg,
              fontWeight: theme.typography.fontWeights.bold,
              margin: "0 0 6px 0",
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fontFamily.primary,
            }}
          >
            {product.title}
          </h2>

          <p
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              margin: "0 0 16px 0",
              fontWeight: theme.typography.fontWeights.medium,
            }}
          >
            {product.subtitle}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: theme.spacing.md,
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="material-icons"
                style={{
                  fontSize: isDesktop ? "18px" : "16px",
                  color:
                    star <= 4
                      ? theme.colors.accent
                      : theme.colors.text.muted,
                }}
              >
                {star <= 4 ? "star" : "star_border"}
              </span>
            ))}
            <span
              style={{
                color: theme.colors.text.secondary,
                fontSize: theme.typography.sizes.xs,
                marginLeft: "4px",
              }}
            >
              (24)
            </span>
          </div>

          <div style={{ marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: theme.typography.fontWeights.bold,
                    fontSize: isDesktop
                      ? theme.typography.sizes.xl
                      : theme.typography.sizes.lg,
                    color: theme.colors.secondary,
                  }}
                >
                  ${product.price.toFixed(2)}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.muted,
                    textDecoration: "line-through",
                  }}
                >
                  ${(product.price * 1.2).toFixed(2)}
                </span>
              </div>
              <AddButton
                onClick={handleAddToCart}
                isTablet={isTablet}
                isDesktop={isDesktop}
              />
            </div>
          </div>
        </div>
      </motion.article>

      {/* Product Options Modal */}
      <AnimatePresence>
        {showOptions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 1000,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={() => setShowOptions(false)}
            />

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "white",
                zIndex: 1001,
                borderRadius: theme.borderRadius.lg,
                padding: "24px",
                width: "90%",
                maxWidth: "400px",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 16px 0" }}>
                {product.title} - Options
              </h3>

              {product.options &&
                product.options.map((optionGroup, index) => (
                  <div key={index} style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: "0 0 8px 0",
                        fontSize: "16px",
                      }}
                    >
                      {optionGroup.name}
                      {optionGroup.required && (
                        <span
                          style={{ color: theme.colors.danger }}
                        >{` *`}</span>
                      )}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {optionGroup.values.map((option, optIdx) => (
                        <label
                          key={optIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "8px",
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.borderRadius.md,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type={optionGroup.multiple ? "checkbox" : "radio"}
                            name={optionGroup.name}
                            value={option.value}
                            checked={
                              optionGroup.multiple
                                ? (selectedOptions[optionGroup.name] || []).includes(
                                    option.value
                                  )
                                : selectedOptions[optionGroup.name] === option.value
                            }
                            onChange={() => {
                              if (optionGroup.multiple) {
                                const current = selectedOptions[optionGroup.name] || [];
                                const newValues = current.includes(option.value)
                                  ? current.filter((v) => v !== option.value)
                                  : [...current, option.value];

                                handleOptionChange(optionGroup.name, newValues);
                              } else {
                                handleOptionChange(optionGroup.name, option.value);
                              }
                            }}
                            style={{ marginRight: "8px" }}
                          />
                          <span>{option.value}</span>
                          {option.price > 0 && (
                            <span
                              style={{
                                marginLeft: "auto",
                                color: theme.colors.primary,
                                fontWeight: "bold",
                              }}
                            >
                              +${option.price.toFixed(2)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
                <button
                  onClick={() => setShowOptions(false)}
                  style={{
                    padding: "10px 16px",
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddWithOptions}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: theme.colors.primary,
                    color: "white",
                    border: "none",
                    borderRadius: theme.borderRadius.md,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProductCard;