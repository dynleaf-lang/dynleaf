import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddButton from "./AddButton";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";

const ProductCard = ({ product, isTablet, isDesktop }) => {

  

  const { addToCart } = useCart();
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [activeTab, setActiveTab] = useState("size");
  const addBtnRef = useRef(null);  // Handle adding product to cart
  const handleAddToCart = (event) => {
    // Get the button's position for animation
    let sourcePosition = null;
    
    // Determine source position for animation
    // Try multiple approaches to get the most accurate position
    if (event && event.clientX && event.clientY) {
      // 1. Use the click position if available (most accurate)
      sourcePosition = {
        x: event.clientX,
        y: event.clientY
      }; 
    } else if (addBtnRef.current) {
      // 2. Use the button's position
      const rect = addBtnRef.current.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2
      }; 
    } else if (event && event.currentTarget) {
      // 3. Use the event's currentTarget
      const rect = event.currentTarget.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width/2,
        y: rect.top + rect.height/2
      }; 
    } else {
      // 4. Fallback to a position in the middle of the screen
      sourcePosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 3
      }; 
    }

    if (
      product.options?.length > 0 ||
      product.sizes?.length > 0 ||
      product.extras?.length > 0 ||
      product.addons?.length > 0
    ) {
      // If product has customization options, show options modal
      setShowOptions(true);    } else {
      // If no options, add directly to cart with animation
      addToCart(product, quantity, [], sourcePosition);
    }
  };

  // Handle option selection
  const handleOptionChange = (category, optionName, value) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [optionName]: value,
      },
    }));
  };
  // Add to cart with selected options
  const handleAddWithOptions = () => {
    const formattedOptions = [];

    // Format all selected options from different categories
    Object.entries(selectedOptions).forEach(([category, options]) => {
      Object.entries(options).forEach(([name, value]) => {
        if (Array.isArray(value)) {
          value.forEach((val) => {
            formattedOptions.push({ category, name, value: val });
          });
        } else if (value) {
          formattedOptions.push({ category, name, value });
        }
      });
    });

    // Add special instructions if any
    if (specialInstructions.trim()) {
      formattedOptions.push({
        category: "instructions",
        name: "Special Instructions",
        value: specialInstructions,
      });
    }    // Get modal center position for animation
    const modal = document.querySelector('.options-modal');
    let sourcePosition = null;
    
    if (modal) {
      const rect = modal.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      console.log("Modal position for animation:", sourcePosition);
    }

    addToCart(product, quantity, formattedOptions, sourcePosition);
    setShowOptions(false);
    setSelectedOptions({});
    setQuantity(1);
    setSpecialInstructions("");
    setActiveTab("size");
  };

  // Increase quantity
  const handleIncreaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  // Decrease quantity
  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  // Calculate total price including selected options
  const calculateTotalPrice = () => {
    let total = product.price * quantity;

    // Add prices from all selected options
    Object.entries(selectedOptions).forEach(([category, options]) => {
      Object.entries(options).forEach(([name, value]) => {
        if (Array.isArray(value)) {
          // For multi-select options
          value.forEach((val) => {
            const optionGroup = getOptionGroupByCategory(category);
            if (optionGroup) {
              const option = optionGroup.values.find(
                (opt) => opt.value === val
              );
              if (option && option.price) {
                total += option.price * quantity;
              }
            }
          });
        } else {
          // For single-select options
          const optionGroup = getOptionGroupByCategory(category);
          if (optionGroup) {
            const option = optionGroup.values.find(
              (opt) => opt.value === value
            );
            if (option && option.price) {
              total += option.price * quantity;
            }
          }
        }
      });
    });

    return total.toFixed(2);
  };

  // Helper function to get option group by category
  const getOptionGroupByCategory = (category) => {
    switch (category) {
      case "size":
        return product.sizes ? { values: product.sizes } : null;
      case "extras":
        return product.extras ? { values: product.extras } : null;
      case "addons":
        return product.addons ? { values: product.addons } : null;
      case "options":
        return product.options ? { values: product.options } : null;
      default:
        return null;
    }
  };

  // Render option groups based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "size":
        return renderOptionSection(
          "size",
          "Choose Size",
          product.sizes || [],
          false
        );
      case "extras":
        return renderOptionSection(
          "extras",
          "Select Extras",
          product.extras || [],
          true
        );
      case "addons":
        return renderOptionSection(
          "addons",
          "Add Ons",
          product.addons || [],
          true
        );
      case "options":
        return (
          <div className="options-container">
            {product.options &&
              product.options.map((optionGroup, index) =>
                renderOptionGroup(optionGroup, index)
              )}
          </div>
        );
      case "instructions":
        return (
          <div style={{ marginBottom: "16px" }}>
            <p
              style={{
                fontWeight: "bold",
                margin: "0 0 8px 0",
                fontSize: "16px",
              }}
            >
              Special Instructions
            </p>
            <textarea
              placeholder="Add special instructions here... (optional)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                minHeight: "100px",
                resize: "vertical",
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Render option section (size, extras, addons)
  const renderOptionSection = (category, title, options, multiple) => {
    if (!options || options.length === 0) {
      return (
        <div style={{ padding: "12px 0" }}>
          <p>No {title.toLowerCase()} available for this item.</p>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: "16px" }}>
        <p
          style={{
            fontWeight: "bold",
            margin: "0 0 8px 0",
            fontSize: "16px",
          }}
        >
          {title}
          {category === "size" && (
            <span style={{ color: theme.colors.danger }}>{` *`}</span>
          )}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {options.map((option, idx) => (
            <label
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px",
                border: `1px solid ${
                  multiple
                    ? theme.colors.border
                    : selectedOptions[category]?.[title] === option.value
                    ? theme.colors.primary
                    : theme.colors.border
                }`,
                borderRadius: theme.borderRadius.md,
                cursor: "pointer",
                backgroundColor: multiple
                  ? "white"
                  : selectedOptions[category]?.[title] === option.value
                  ? `${theme.colors.primaryLight}`
                  : "white",
              }}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`${category}-${title}`}
                value={option.value}
                checked={
                  multiple
                    ? (selectedOptions[category]?.[title] || []).includes(
                        option.value
                      )
                    : selectedOptions[category]?.[title] === option.value
                }
                onChange={() => {
                  if (multiple) {
                    const current = selectedOptions[category]?.[title] || [];
                    const newValues = current.includes(option.value)
                      ? current.filter((v) => v !== option.value)
                      : [...current, option.value];

                    handleOptionChange(category, title, newValues);
                  } else {
                    handleOptionChange(category, title, option.value);
                  }
                }}
                style={{ marginRight: "8px" }}
              />

              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: theme.typography.fontWeights.medium }}>
                  {option.value}
                </span>
                {option.description && (
                  <p
                    style={{
                      margin: "2px 0 0 0",
                      fontSize: theme.typography.sizes.xs,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    {option.description}
                  </p>
                )}
              </div>

              {option.price > 0 && (
                <span
                  style={{
                    color: theme.colors.secondary,
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
    );
  };

  // Render a regular option group
  const renderOptionGroup = (optionGroup, index) => (
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
          <span style={{ color: theme.colors.danger }}>{` *`}</span>
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
              padding: "12px",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              cursor: "pointer",
              backgroundColor: "white",
            }}
          >
            <input
              type={optionGroup.multiple ? "checkbox" : "radio"}
              name={optionGroup.name}
              value={option.value}
              checked={
                optionGroup.multiple
                  ? (selectedOptions.options?.[optionGroup.name] || []).includes(
                      option.value
                    )
                  : selectedOptions.options?.[optionGroup.name] === option.value
              }
              onChange={() => {
                if (optionGroup.multiple) {
                  const current = selectedOptions.options?.[optionGroup.name] || [];
                  const newValues = current.includes(option.value)
                    ? current.filter((v) => v !== option.value)
                    : [...current, option.value];

                  handleOptionChange("options", optionGroup.name, newValues);
                } else {
                  handleOptionChange("options", optionGroup.name, option.value);
                }
              }}
              style={{ marginRight: "8px" }}
            />

            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: theme.typography.fontWeights.medium }}>
                {option.value}
              </span>
              {option.description && (
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.secondary,
                  }}
                >
                  {option.description}
                </p>
              )}
            </div>

            {option.price > 0 && (
              <span
                style={{
                  color: theme.colors.secondary,
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
  );

  // Define tabs for the modal
  const tabs = [
    { id: "size", label: "Size", icon: "straighten" },
    { id: "extras", label: "Extras", icon: "add_circle" },
    { id: "addons", label: "Add-ons", icon: "lunch_dining" },
    { id: "options", label: "Options", icon: "tune" },
    { id: "instructions", label: "Instructions", icon: "edit_note" },
  ];

  // Show only tabs that have content
  const availableTabs = tabs.filter((tab) => {
    if (tab.id === "size") return product.sizes?.length > 0;
    if (tab.id === "extras") return product.extras?.length > 0;
    if (tab.id === "addons") return product.addons?.length > 0;
    if (tab.id === "options") return product.options?.length > 0;
    if (tab.id === "instructions") return true; // Always show instructions
    return false;
  });

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
                 
              </div>              <div ref={addBtnRef} className="add-button-container">
                <AddButton
                  onClick={handleAddToCart}
                  isTablet={isTablet}
                  isDesktop={isDesktop}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.article>

      {/* Improved Product Options Modal */}
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
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "white",
                zIndex: 1001,
                borderTopLeftRadius: theme.borderRadius.xl,
                borderTopRightRadius: theme.borderRadius.xl,
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: theme.shadows.xl,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: `1px solid ${theme.colors.border}`,
                  position: "sticky",
                  top: 0,
                  backgroundColor: "white",
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: theme.borderRadius.lg,
                      overflow: "hidden",
                      backgroundColor: theme.colors.background,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: theme.typography.fontWeights.bold,
                        fontSize: theme.typography.sizes.xl,
                      }}
                    >
                      {product.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: theme.colors.text.secondary,
                        fontSize: theme.typography.sizes.sm,
                      }}
                    >
                      {product.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowOptions(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Close"
                >
                  <span className="material-icons" style={{ fontSize: "24px" }}>
                    close
                  </span>
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: "0 24px" }}>
                {/* Navigation Tabs */}
                {availableTabs.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      overflowX: "auto",
                      gap: "8px",
                      padding: "16px 0",
                      borderBottom: `1px solid ${theme.colors.border}`,
                      position: "sticky",
                      top: "105px",
                      backgroundColor: "white",
                      zIndex: 5,
                    }}
                  >
                    {availableTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "10px 16px",
                          backgroundColor:
                            activeTab === tab.id
                              ? theme.colors.primaryLight
                              : "transparent",
                          border: "none",
                          borderRadius: theme.borderRadius.lg,
                          cursor: "pointer",
                          color:
                            activeTab === tab.id
                              ? theme.colors.primary
                              : theme.colors.text.secondary,
                          fontWeight:
                            activeTab === tab.id
                              ? theme.typography.fontWeights.bold
                              : theme.typography.fontWeights.medium,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          className="material-icons"
                          style={{
                            fontSize: "20px",
                            marginBottom: "4px",
                          }}
                        >
                          {tab.icon}
                        </span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab Content */}
                <div style={{ padding: "16px 0" }}>{renderTabContent()}</div>
              </div>

              {/* Quantity and Add to Cart Section */}
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: `1px solid ${theme.colors.border}`,
                  position: "sticky",
                  bottom: 0,
                  backgroundColor: "white",
                  zIndex: 10,
                }}
              >
                {/* Quantity Selector */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: "bold" }}>Quantity</p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.md,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        onClick={handleDecreaseQuantity}
                        disabled={quantity <= 1}
                        style={{
                          width: "36px",
                          height: "36px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: theme.colors.text.primary,
                          opacity: quantity <= 1 ? 0.5 : 1,
                        }}
                      >
                        <span className="material-icons">remove</span>
                      </button>

                      <div
                        style={{
                          width: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {quantity}
                      </div>

                      <button
                        onClick={handleIncreaseQuantity}
                        style={{
                          width: "36px",
                          height: "36px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color : theme.colors.text.primary,
                        }}
                      >
                        <span className="material-icons">add</span>
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: theme.typography.fontWeights.bold,
                      fontSize: theme.typography.sizes.lg,
                      color: theme.colors.secondary,
                    }}
                  >
                    ${calculateTotalPrice()}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddWithOptions}
                  style={{
                    width: "100%",
                    padding: "14px",
                    backgroundColor: theme.colors.primary,
                    color: "white",
                    border: "none",
                    borderRadius: theme.borderRadius.md,
                    fontWeight: "bold",
                    fontSize: theme.typography.sizes.md,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span className="material-icons">shopping_cart</span>
                  Add to Cart - ${calculateTotalPrice()}
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