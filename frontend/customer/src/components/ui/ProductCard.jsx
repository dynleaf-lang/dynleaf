import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AddButton from "./AddButton";
import CurrencyDisplay from "../Utils/CurrencyFormatter";
import LoginPromptModal from "./LoginPromptModal";
import { theme } from "../../data/theme";
import { useCart } from "../../context/CartContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";

const ProductCard = ({ product, isTablet, isDesktop, isFavoritesView = false, isMobileCompact = false }) => {
  // Handle undefined product
  if (!product) {
    console.error("ProductCard received undefined product");
    return null;
  }
  // Ensure product has necessary properties to prevent errors
  if (!product.sizeVariants) { 
    product.sizeVariants = [];
  }
  
  if (!Array.isArray(product.sizeVariants)) { 
    product.sizeVariants = [];  
  }
  
  const { addItem } = useCart();
  const { currencySymbol, formatCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [activeTab, setActiveTab] = useState("size");
  const [lowestPriceSizeVariant, setLowestPriceSizeVariant] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const addBtnRef = useRef(null);
  
  // Default image URL for products without images
  const defaultImage = 'https://png.pngtree.com/png-clipart/20231003/original/pngtree-tasty-burger-png-ai-generative-png-image_13245897.png';

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Helper function to find the lowest price size variant
  const findLowestPriceSizeVariant = () => {
    const hasSizeVariants = product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0;
    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
    
    // No size variants available, return null
    if (!hasSizeVariants && !hasVariants) {
      return null;
    }
    
    let allVariants = [];
    
    // Collect all available size variants
    if (hasSizeVariants) {
      allVariants = [...product.sizeVariants];
    }
    
    if (hasVariants) {
      allVariants = [...allVariants, ...product.variants];
    }
    
    // Make sure all variants have valid prices
    const validVariants = allVariants.filter(variant => 
      variant && variant.price !== undefined && variant.price !== null && !isNaN(parseFloat(variant.price))
    );
    
    if (validVariants.length === 0) {
      return null;
    }
    
    // Find the variant with lowest price
    return validVariants.reduce((lowest, current) => {
      const currentPrice = parseFloat(current.price);
      const lowestPrice = lowest ? parseFloat(lowest.price) : Infinity;
      
      return currentPrice < lowestPrice ? current : lowest;
    }, null);
  };
  
  // Find and set the lowest price size variant when product changes
  useEffect(() => {
    const lowest = findLowestPriceSizeVariant();
    setLowestPriceSizeVariant(lowest);
    
    // Pre-select the lowest price variant if we have one
    if (lowest) {
      const variantName = lowest.name || lowest.size || lowest.label || lowest.title;
      setSelectedOptions({
        size: {
          'Choose Size': variantName
        }
      });
    }
  }, [product]);

  // Handle favorites button click
  const handleFavoritesClick = async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    if (!product?.id) {
      console.error('Product ID is missing');
      return;
    }

    try {
      setFavoriteLoading(true);
      await toggleFavorite(product.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Could show a toast notification here
    } finally {
      setFavoriteLoading(false);
    }
  };

  // Handle login prompt actions
  const handleLoginPromptLogin = () => {
    setShowLoginPrompt(false);
    // Navigate to login/signup - you might want to emit an event or use a router here
    // For now, we'll assume there's a global login function or navigation
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
  };

  const handleLoginPromptClose = () => {
    setShowLoginPrompt(false);
  };

  // Handle adding product to cart
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
    }    // Check individually for better debugging
    const hasOptions = product.options?.length > 0;
    const hasSizes = product.sizes?.length > 0;
    const hasExtras = product.extras?.length > 0;
    const hasAddons = product.addons?.length > 0;
    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
    const hasSizeVariants = product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0;
    
     
      if (hasOptions || hasSizes || hasExtras || hasAddons || hasVariants || hasSizeVariants) {
    // Reset to "size" tab if the product has size variants
      if (hasSizeVariants || hasVariants || hasSizes) {
        setActiveTab("size");
        
        // Pre-select the lowest price size variant when opening the options modal
        if (lowestPriceSizeVariant) {
          const variantName = lowestPriceSizeVariant.name || 
            lowestPriceSizeVariant.size || 
            lowestPriceSizeVariant.label || 
            lowestPriceSizeVariant.title;
            
          setSelectedOptions({
            ...selectedOptions,
            size: {
              'Choose Size': variantName
            }
          });
        }
      } else if (hasOptions) {
        setActiveTab("options");
      } else if (hasExtras) {
        setActiveTab("extras");
      } else if (hasAddons) {
        setActiveTab("addons");
      }
      
      setShowOptions(true);
    } else {      // If no options or variants, add directly to cart with animation
      // If we have a lowest price variant, include it in the options
      if (lowestPriceSizeVariant) {
        const variantName = lowestPriceSizeVariant.name || lowestPriceSizeVariant.size || lowestPriceSizeVariant.label || lowestPriceSizeVariant.title;
        const formattedOptions = [{
          category: 'size',
          name: 'Size',
          value: variantName,
          price: parseFloat(lowestPriceSizeVariant.price) || 0
        }];
        addItem(product, quantity, formattedOptions, sourcePosition);
      } else {
        addItem(product, quantity, [], sourcePosition);
      }
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
  };  // Add to cart with selected options
  const handleAddWithOptions = () => {
    const formattedOptions = [];
    let selectedVariant = null;
    
    // Check if a variant (size) is selected
    if (selectedOptions.size && selectedOptions.size['Choose Size']) {
      const selectedSizeName = selectedOptions.size['Choose Size'];
      
      // First check in sizeVariants
      if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
        selectedVariant = product.sizeVariants.find(variant => 
          variant.name === selectedSizeName || 
          variant.size === selectedSizeName ||
          variant.label === selectedSizeName ||
          variant.title === selectedSizeName
        );
      }
      
      // Then check in regular variants if not found
      if (!selectedVariant && product.variants && Array.isArray(product.variants)) {
        selectedVariant = product.variants.find(variant => 
          variant.name === selectedSizeName || 
          variant.size === selectedSizeName ||
          variant.label === selectedSizeName ||
          variant.title === selectedSizeName
        );
      }
      
      if (selectedVariant) { 
        formattedOptions.push({
          category: 'size',
          name: 'Size',
          value: selectedSizeName,
          price: typeof selectedVariant.price === 'number' ? 
                 selectedVariant.price : 
                 parseFloat(selectedVariant.price) || 0
        });
      }
    }
    // If no size is selected but we have size variants, use the lowest price variant
    else if ((!selectedOptions.size || !selectedOptions.size['Choose Size']) && 
             lowestPriceSizeVariant && lowestPriceSizeVariant.price) {
      
      const variantName = lowestPriceSizeVariant.name || 
                          lowestPriceSizeVariant.size || 
                          lowestPriceSizeVariant.label || 
                          lowestPriceSizeVariant.title;
      
      formattedOptions.push({
        category: 'size',
        name: 'Size',
        value: variantName,
        price: typeof lowestPriceSizeVariant.price === 'number' ? 
               lowestPriceSizeVariant.price : 
               parseFloat(lowestPriceSizeVariant.price) || 0
      });
    }

    // Format all selected options from different categories
    Object.entries(selectedOptions).forEach(([category, options]) => {
      // Skip size category if we've already handled variants
      if (category === 'size' && selectedVariant) {
        return;
      }

      // IMPORTANT: skip synthetic variant-group keys (vg:*) here.
      // They are handled in the dedicated variantGroups block below.
      if (typeof category === 'string' && category.startsWith('vg:')) {
        return;
      }

      // For regular categories, options should be an object map of name -> value(s)
      if (options && typeof options === 'object') {
        Object.entries(options).forEach(([name, value]) => {
          if (Array.isArray(value)) {
            value.forEach((val) => {
              formattedOptions.push({ category, name, value: val });
            });
          } else if (value) {
            formattedOptions.push({ category, name, value });
          }
        });
      }
    });

    // Include variantGroups selections as options for order review
    if (Array.isArray(product.variantGroups)) {
      product.variantGroups.forEach(g => {
        const gName = (g?.name || '').trim();
        if (!gName || gName.toLowerCase() === 'size') return;
        const sel = selectedOptions[`vg:${gName}`];
        if (!sel) return;
        const pushEntry = (val) => formattedOptions.push({ category: 'option', name: gName, value: val });
        if (Array.isArray(sel)) {
          sel.forEach(pushEntry);
        } else {
          pushEntry(sel);
        }
      });
    }

    // Add special instructions if any
    if (specialInstructions.trim()) {
      formattedOptions.push({
        category: "instructions",
        name: "Special Instructions",
        value: specialInstructions,
      });
    }// Get modal center position for animation
    const modal = document.querySelector('.options-modal');
    let sourcePosition = null;
    
    if (modal) {
      const rect = modal.getBoundingClientRect();
      sourcePosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    addItem(product, quantity, formattedOptions, sourcePosition);
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
  };  // Calculate total price including selected options
  const calculateTotalPrice = () => {
    // Start with base price, but check for selected size variant
    let basePrice = product.price;
    
    // If size is selected from variants, use that price instead
    if (selectedOptions.size && selectedOptions.size['Choose Size']) {
      const selectedSize = selectedOptions.size['Choose Size'];
      let selectedVariant = null;
      
      // First check in sizeVariants
      if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
        selectedVariant = product.sizeVariants.find(variant => {
          const variantName = variant.name || variant.size || variant.label || variant.title;
          return variantName === selectedSize;
        });
      }
      
      // Then check in regular variants if not found
      if (!selectedVariant && product.variants && Array.isArray(product.variants)) {
        selectedVariant = product.variants.find(variant => {
          const variantName = variant.name || variant.size || variant.label || variant.title;
          return variantName === selectedSize;
        });
      }
      
      if (selectedVariant && selectedVariant.price) {
        // Replace the base price with the variant price
        basePrice = parseFloat(selectedVariant.price);
      }
    }    // If no size is explicitly selected but we have a lowest price variant, use that for modal display
    else if (showOptions && lowestPriceSizeVariant && lowestPriceSizeVariant.price) {
      basePrice = typeof lowestPriceSizeVariant.price === 'number' ? 
                  lowestPriceSizeVariant.price : 
                  parseFloat(lowestPriceSizeVariant.price);
      
      // Make sure it's a valid number
      if (isNaN(basePrice)) {
        basePrice = product.price;
      }
    }
    
    let total = basePrice * quantity;

    // Add prices from all selected options
    Object.entries(selectedOptions).forEach(([category, options]) => {
      // Skip the size category if we're using variants as we've already handled it above
      if (category === 'size' && product.variants && Array.isArray(product.variants)) {
        return;
      }
      // Skip variant group synthetic keys here; we'll handle them below
      if (typeof category === 'string' && category.startsWith('vg:')) {
        return;
      }
      
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

    // Add variantGroups priceDelta (non-size groups)
    if (Array.isArray(product.variantGroups)) {
      product.variantGroups.forEach(g => {
        const gName = (g?.name || '').trim();
        if (!gName || gName.toLowerCase() === 'size') return;
        const optSel = selectedOptions[`vg:${gName}`];
        if (!optSel) return;
        const options = Array.isArray(g?.options) ? g.options : [];
        if ((g.selectionType || 'single') === 'single') {
          const opt = options.find(o => o?.name === optSel);
          if (opt && (opt.priceDelta || 0)) total += (parseFloat(opt.priceDelta) || 0) * quantity;
        } else {
          const arr = Array.isArray(optSel) ? optSel : [];
          arr.forEach(sel => {
            const opt = options.find(o => o?.name === sel);
            if (opt && (opt.priceDelta || 0)) total += (parseFloat(opt.priceDelta) || 0) * quantity;
          });
        }
      });
    }

    return total.toFixed(2);
  };  

  // Helper function to get option group by category
  const getOptionGroupByCategory = (category) => {
    switch (category) {
      case "size":
        // Check for sizeVariants first
        if (product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0) {
          const sizeOptions = product.sizeVariants.map(variant => ({
            value: variant.name || variant.size || variant.label || variant.title,
            price: variant.price || 0,
            description: variant.description || null
          }));
          return { values: sizeOptions };
        }
        // Then check for regular variants
        else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          const sizeOptions = product.variants.map(variant => ({
            value: variant.name || variant.size || variant.label || variant.title,
            price: variant.price || 0,
            description: variant.description || null
          }));
          return { values: sizeOptions };
        }
        // Otherwise use regular sizes
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

  // Render a variant group (non-size) similar to POS behavior
  const renderVariantGroup = (group, index) => {
    const groupName = (group?.name || '').trim();
    const selectionType = group?.selectionType || 'single';
    const options = Array.isArray(group?.options) ? group.options : [];
    if (!groupName || options.length === 0) return null;
    if (groupName.toLowerCase() === 'size') return null;

    const key = `vg:${groupName}`;
    const current = selectedOptions[key];

    return (
      <div key={index} style={{ marginBottom: '16px' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', fontSize: '16px' }}>{groupName}</p>
        <div style={{ display: 'flex', flexDirection: selectionType === 'single' ? 'row' : 'column', gap: '8px', flexWrap: 'wrap' }}>
          {options.map((opt, idx) => {
            const extra = opt.priceDelta ? parseFloat(opt.priceDelta) : 0;
            if (selectionType === 'single') {
              const active = current === opt.name;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: opt.name }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${active ? theme.colors.secondary : theme.colors.border}`,
                    background: active ? theme.colors.secondary + '10' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <span>{opt.name}</span>
                  {extra ? (
                    <span style={{ marginLeft: 6, color: theme.colors.secondary, fontWeight: 600 }}>+<CurrencyDisplay amount={extra} /></span>
                  ) : null}
                </button>
              );
            }
            // multiple
            const checked = Array.isArray(current) ? current.includes(opt.name) : false;
            return (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', padding: '10px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setSelectedOptions(prev => {
                      const curr = Array.isArray(prev[key]) ? prev[key] : [];
                      const next = isChecked ? [...curr, opt.name] : curr.filter(n => n !== opt.name);
                      return { ...prev, [key]: next };
                    });
                  }}
                  style={{ marginRight: 8 }}
                />
                <span style={{ flex: 1 }}>{opt.name}</span>
                {extra ? (
                  <span style={{ color: theme.colors.secondary, fontWeight: 600 }}>+<CurrencyDisplay amount={extra} /></span>
                ) : (
                  <span style={{ color: theme.colors.text.muted }}>No extra</span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  // Render option groups based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "size":
        // Check for sizeVariants first and ensure they're properly formatted
        if (product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0) {
          // Check variant structure for debugging
          if (typeof product.sizeVariants[0] !== 'object') {
            console.error("Invalid sizeVariants structure:", product.sizeVariants);
          }
          
          // Transform sizeVariants to the format expected by renderOptionSection
          const sizeOptions = product.sizeVariants.map(variant => {
            return {
              value: variant.name || variant.size || variant.label || variant.title,
              price: parseFloat(variant.price) || 0,
              description: variant.description || null
            };
          });
          
          return renderOptionSection(
            "size",
            "Choose Size",
            sizeOptions,
            false
          );
        }
        // Then check for variants
        else if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          // Transform variants to the format expected by renderOptionSection
          const sizeOptions = product.variants.map(variant => ({
            value: variant.name || variant.size || variant.label || variant.title,
            price: variant.price || 0,
            description: variant.description || null
          }));
          
          return renderOptionSection(
            "size",
            "Choose Size",
            sizeOptions,
            false
          );
        } else {
          // Otherwise use the existing sizes if available
          return renderOptionSection(
            "size",
            "Choose Size",
            product.sizes || [],
            false
          );
        }
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
      case "vg":
        return (
          <div className="options-container">
            {Array.isArray(product.variantGroups) && product.variantGroups
              .filter(g => (g?.name || '').trim().toLowerCase() !== 'size' && Array.isArray(g.options) && g.options.length > 0)
              .map((g, idx) => renderVariantGroup(g, idx))}
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
    
    // If we're displaying size options and no size is selected yet, but we have a lowest price variant, pre-select it
    if (category === "size" && (!selectedOptions[category] || !selectedOptions[category][title]) && lowestPriceSizeVariant) {
      const variantName = lowestPriceSizeVariant.name || lowestPriceSizeVariant.size || lowestPriceSizeVariant.label || lowestPriceSizeVariant.title;
      
      // Update selected options
      setSelectedOptions(prev => ({
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [title]: variantName
        }
      }));
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
                    ? theme.colors.secondary
                    : theme.colors.border
                }`,
                borderRadius: theme.borderRadius.md,
                cursor: "pointer",
                backgroundColor: multiple
                  ? "white"
                  : selectedOptions[category]?.[title] === option.value
                  ? 'rgba(30, 41, 59, 0.063)'
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
                  +<CurrencyDisplay amount={option.price} />
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
                +<CurrencyDisplay amount={option.price} />
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
  { id: "vg", label: "Options+", icon: "tune" },
    { id: "instructions", label: "Instructions", icon: "edit_note" },
  ];  // Show only tabs that have content
  const availableTabs = tabs.filter((tab) => {
    if (tab.id === "size") {
      // Show size tab if either sizes or variants exist
      const hasSizes = product.sizes?.length > 0;
      const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
      const hasSizeVariants = product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0;
      
      return hasSizes || hasVariants || hasSizeVariants;
    }
    if (tab.id === "extras") return product.extras?.length > 0;
    if (tab.id === "addons") return product.addons?.length > 0;
  if (tab.id === "options") return product.options?.length > 0;
  if (tab.id === "vg") return Array.isArray(product.variantGroups) && product.variantGroups.some(g => (g?.name || '').trim().toLowerCase() !== 'size' && Array.isArray(g.options) && g.options.length > 0);
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
          padding: isMobileCompact ? "12px" : isDesktop ? "24px" : "10px",
          boxShadow: theme.shadows.md,
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          cursor: "default",
          // minWidth: isMobileCompact ? "150px" : isTablet ? "auto" : "180px",
          maxWidth: "100%",
          transition: `all ${theme.transitions.medium}`,
          border: `1px solid ${theme.colors.border}`,
          position: "relative",
          overflow: "hidden",
          height: "100%",
        }}        tabIndex={0}
        aria-label={`${product.title} - ${product.subtitle}, price ${formatCurrency(
          lowestPriceSizeVariant && lowestPriceSizeVariant.price ? 
          (typeof lowestPriceSizeVariant.price === 'number' ? 
           lowestPriceSizeVariant.price : 
           parseFloat(lowestPriceSizeVariant.price)) : 
          product.price
        ).replace(/[^\d.,]/g, '')}${
          lowestPriceSizeVariant ? 
          ` for ${lowestPriceSizeVariant.name || lowestPriceSizeVariant.size || lowestPriceSizeVariant.label || lowestPriceSizeVariant.title}` : 
          ''
        }`}
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
            onClick={handleFavoritesClick}
            disabled={favoriteLoading}
            aria-label={
              isAuthenticated
                ? isFavorite(product?.id) 
                  ? "Remove from favorites" 
                  : "Add to favorites"
                : "Login to add to favorites"
            }
            style={{
              backgroundColor: "rgba(255,255,255,0.85)",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: favoriteLoading ? "not-allowed" : "pointer",
              color: isAuthenticated && isFavorite(product?.id) 
                ? theme.colors.danger 
                : theme.colors.text.muted,
              boxShadow: theme.shadows.sm,
              opacity: favoriteLoading ? 0.7 : 1,
            }}
            whileHover={{ 
              scale: favoriteLoading ? 1 : 1.1, 
              color: isAuthenticated && isFavorite(product?.id) 
                ? theme.colors.danger 
                : theme.colors.primary 
            }}
            whileTap={{ scale: favoriteLoading ? 1 : 0.9 }}
          >
            {favoriteLoading ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="material-icons"
                style={{ fontSize: "18px" }}
              >
                refresh
              </motion.span>
            ) : (
              <span className="material-icons" style={{ fontSize: "18px" }}>
                {isAuthenticated && isFavorite(product?.id) ? "favorite" : "favorite_border"}
              </span>
            )}
          </motion.button>
        </div>

        <div
          style={{
            marginBottom: isMobileCompact ? theme.spacing.sm : theme.spacing.md,
            borderRadius: theme.borderRadius.lg,
            backgroundColor: theme.colors.background,
            padding: isMobileCompact ? theme.spacing.sm : theme.spacing.md,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            aspectRatio: isDesktop ? "auto" : "1/1",
            maxHeight: isMobileCompact ? "120px" : isDesktop ? "160px" : "auto",
          }}
        >
          <motion.img
            whileHover={{ scale: 1.08, rotate: 5 }}
            src={imageError ? defaultImage : product.image}
            alt={product.title}
            loading="lazy"
            onError={handleImageError}
            style={{
              width: "100%",
              height: isMobileCompact ? "100px" : isDesktop ? "130px" : "100%",
              objectFit: imageError ? "cover" : "contain",
              userSelect: "none",
              filter: imageError ? "none" : "drop-shadow(0px 8px 16px rgba(0,0,0,0.1))",
              maxHeight: isMobileCompact ? "120px" : "140px",
            }}
            draggable={false}
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", textTransform: "capitalize" }}>
          <h2
            style={{
              fontSize: isMobileCompact 
                ? theme.typography.sizes.md
                : isDesktop
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
              fontSize: isMobileCompact 
                ? theme.typography.sizes.xs
                : theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              margin: "0 0 16px 0",
              fontWeight: theme.typography.fontWeights.medium,
              display: isMobileCompact ? "-webkit-box" : "block",
              WebkitLineClamp: isMobileCompact ? 2 : "none",
              WebkitBoxOrient: isMobileCompact ? "vertical" : "initial",
              overflow: isMobileCompact ? "hidden" : "visible",
            }}
          >
            {product.subtitle}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: isMobileCompact ? theme.spacing.sm : theme.spacing.md,
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="material-icons"
                style={{
                  fontSize: isMobileCompact 
                    ? "14px"
                    : isDesktop 
                    ? "18px" 
                    : "16px",
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
                fontSize: isMobileCompact 
                  ? "10px"
                  : theme.typography.sizes.xs,
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
            >              <div>                
                <div>
                  <span
                    style={{
                      fontWeight: theme.typography.fontWeights.bold,
                      fontSize: isMobileCompact
                        ? theme.typography.sizes.md
                        : isDesktop
                        ? theme.typography.sizes.xl
                        : theme.typography.sizes.lg,
                      color: theme.colors.secondary,
                    }}
                  >
                    <CurrencyDisplay 
                      amount={lowestPriceSizeVariant && lowestPriceSizeVariant.price 
                        ? (typeof lowestPriceSizeVariant.price === 'number' 
                          ? lowestPriceSizeVariant.price 
                          : parseFloat(lowestPriceSizeVariant.price)) 
                        : product.price} 
                    />
                  </span>
                  
                  {(() => {
                    const hasSizeVariants = product.sizeVariants && Array.isArray(product.sizeVariants) && product.sizeVariants.length > 0;
                    const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
                    
                    if (hasSizeVariants || hasVariants) {
                      return (
                        <div style={{ 
                          fontSize: isMobileCompact 
                            ? "10px" 
                            : theme.typography.sizes.xs, 
                          color: theme.colors.text.secondary,
                          marginTop: "2px"
                        }}>
                          from {lowestPriceSizeVariant ? 
                            (lowestPriceSizeVariant.name || 
                             lowestPriceSizeVariant.size || 
                             lowestPriceSizeVariant.label || 
                             lowestPriceSizeVariant.title) : "smallest size"}
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              </div><div ref={addBtnRef} className="add-button-container">
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
                      src={imageError ? defaultImage : product.image}
                      alt={product.title}
                      onError={handleImageError}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: imageError ? "cover" : "contain",
                      }}
                    />
                  </div>                  
                  <div className="text-start" style={{
                    textTransform: "capitalize"
                  }}>
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
                              ? theme.colors.primary
                              : "transparent",
                          border: "none",
                          borderRadius: theme.borderRadius.lg,
                          cursor: "pointer",
                          color:
                            activeTab === tab.id
                              ? 'white'
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
                  </div>                  <div
                    style={{
                      fontWeight: theme.typography.fontWeights.bold,
                      fontSize: theme.typography.sizes.lg,
                      color: theme.colors.secondary,
                    }}                  >
                    <CurrencyDisplay amount={calculateTotalPrice()} />
                    {selectedOptions.size && selectedOptions.size['Choose Size'] && (
                      <div style={{ 
                        fontSize: theme.typography.sizes.xs, 
                        color: theme.colors.text.secondary 
                      }}>
                        {selectedOptions.size['Choose Size']}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add to Cart Button */}                <button
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
                  }}                >
                  <span className="material-icons">shopping_cart</span>
                  Add to Cart - <CurrencyDisplay amount={calculateTotalPrice()} />
                </button>
                
                {/* Show a warning if we require a size but none is selected */}
                {!selectedOptions.size && (
                  availableTabs.some(tab => tab.id === "size") && 
                  product.sizeVariants && 
                  product.sizeVariants.length > 0
                ) && (
                  <div style={{ 
                    color: theme.colors.danger, 
                    fontSize: theme.typography.sizes.sm,
                    marginTop: "8px",
                    textAlign: "center"
                  }}>
                    Please select a size
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={handleLoginPromptClose}
        onLogin={handleLoginPromptLogin}
      />
    </>
  );
};

export default ProductCard;