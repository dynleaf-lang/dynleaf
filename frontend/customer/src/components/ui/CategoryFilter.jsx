import React, { memo, useRef, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { theme } from "../../data/theme";
import { useResponsive } from "../../context/ResponsiveContext";

const CategoryFilter = ({ categories, selectedCategory, onSelectCategory, isTablet, isDesktop }) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [showMoreIndicator, setShowMoreIndicator] = useState(false);
  const { isMobile } = useResponsive();
  
  // Make sure categories is an array to prevent errors
  const safeCategories = Array.isArray(categories) ? categories : [{ id: 'all', name: 'All' }];
   
  
  // Process categories to handle parent-child relationships
  const processedCategories = useMemo(() => {
    if (!Array.isArray(safeCategories) || safeCategories.length === 0) {
      return [{ id: 'all', name: 'All' }];
    }
    
    // First, ensure the "All" category is at the beginning
    const hasAllCategory = safeCategories.some(cat => cat.id === 'all' || cat._id === 'all' || cat.name === 'All');
      // Filter out inactive categories and subcategories
    let result = safeCategories.filter(cat => {
      // Handle different possible formats of active status
      // Only explicitly consider active if isActive is true
      // or if there's no isActive field but status is not 'inactive'
      let isActive = false;
      
      if (cat.isActive === true) {
        // Explicitly active
        isActive = true;
      } else if (cat.isActive === undefined && cat.status !== 'inactive') {
        // No explicit isActive field, but not marked as inactive
        isActive = true;
      }
      
      // Check for parent category - consider all falsy values as "has no parent"
      // This covers null, undefined, empty string, 0, etc.
      const isParentCategory = !cat.parentCategory;
      
  
     
      
      // Only keep active parent categories
      return isActive && isParentCategory;
    });
     
    
    // Add "All" category if it doesn't exist
    if (!hasAllCategory) {
      result = [{ id: 'all', name: 'All', image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png' }, ...result];
    }    // Process parent-child relationships for visual indicators
    result = result.map(category => {
      const categoryId = category.id || category._id;
      const hasChildren = safeCategories.some(cat => {
        // Check if this category is a child of the current category
        // Handle both string ID and object reference formats
        let isChildOf = false;
        
        if (cat.parentCategory) {
          if (typeof cat.parentCategory === 'object' && cat.parentCategory?._id) {
            isChildOf = cat.parentCategory._id === categoryId;
          } else {
            isChildOf = cat.parentCategory === categoryId;
          }
        }
        
        // Only consider a child as active if isActive is explicitly true
        // or if there's no isActive field but status is not 'inactive'
        let isActiveChild = false;
        if (cat.isActive === true) {
          isActiveChild = true;
        } else if (cat.isActive === undefined && cat.status !== 'inactive') {
          isActiveChild = true;
        }
         
        
        return isChildOf && isActiveChild;
      });
      
      return {
        ...category,
        hasChildren
      };
    });
    
    return result;
  }, [safeCategories]);
  // Calculate container width to fit exactly 5 items on mobile
  const containerStyle = useMemo(() => {
    if (isMobile && processedCategories.length > 5) {
      // Calculate width to fit exactly 5 items
      const itemWidth = 80; // Width of each category item
      const gap = 10; // Gap between items
      const totalWidth = itemWidth * 5 + gap * 4; // 5 items and 4 gaps
      
      return {
        maxWidth: `${totalWidth}px`,
        margin: '0 auto',
        overflow: 'hidden',
        position: 'relative'
      };
    } else {
      return {};
    }
  }, [processedCategories.length, isMobile]);  useEffect(() => {
    // Make categories draggable if there are more than 5
    setIsDraggable(processedCategories.length > 5);
    setShowMoreIndicator(processedCategories.length > 5);
    
    // Hide scroll indicator after 5 seconds
    const timer = setTimeout(() => {
      setShowScrollIndicator(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [processedCategories.length]);

  // Scroll selected category into view when it changes
  useEffect(() => {
    if (scrollRef.current && !isDesktop) {
      const container = scrollRef.current;
      const selectedItem = container.querySelector(`[data-category-id="${selectedCategory}"]`);
      
      if (selectedItem) {
        // Calculate position to center the item
        const containerWidth = container.offsetWidth;
        const itemWidth = selectedItem.offsetWidth;
        const itemLeft = selectedItem.offsetLeft;
        const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [selectedCategory, isDesktop]);

  // Haptic feedback for category selection
  const handleCategoryClick = (categoryId) => {
    if (isDragging) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
    
    onSelectCategory(categoryId);
  };

  return (
    <nav 
      aria-label="Food categories" 
      style={{ 
        marginBottom: theme.spacing.lg,
        position: "relative"
      }}
      ref={containerRef}
    >
      <div style={containerStyle}>
        {!isDesktop && showMoreIndicator && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '40px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.9))',
            zIndex: 5,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}>
            <span 
              className="material-icons" 
              style={{ 
                color: theme.colors.primary,
                opacity: 0.8,
                fontSize: '18px'
              }}
            >
              chevron_right
            </span>
          </div>
        )}
        <motion.ul
          ref={scrollRef}
          drag={isDraggable && !isDesktop ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          style={{
            display: "flex",
            gap: isDesktop ? "16px" : "10px",
            overflowX: isDesktop ? "visible" : "auto",
            padding: isDesktop 
              ? theme.spacing.md 
              : `${theme.spacing.sm} ${theme.spacing.xs}`,
            margin: 0,
            listStyleType: "none",
            userSelect: "none",
            flexWrap: isDesktop ? "wrap" : "nowrap",
            cursor: isDraggable && !isDesktop ? "grab" : "default",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", /* Firefox */
            msOverflowStyle: "none", /* IE and Edge */
            // "&::-Webkit-Scrollbar": {
            //   display: "none" /* Chrome, Safari, Opera */
            // }
          }}
          className={isDragging ? "grabbing" : ""}
          initial={isDesktop ? {} : { x: 0 }}
          animate={isDesktop ? {} : { x: [-5, 0] }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >          {/* Render categories */}
          {processedCategories.map((category) => {
            // Ensure we have a valid ID for selection
            const categoryId = category.id || category._id || category.name;
            const isSelected = selectedCategory === categoryId;  
            // Check if this is a child category or has children
            const isChildCategory = !!category.parentCategory;
            const hasChildren = category.hasChildren;
            
            return (
              <li key={categoryId || category.name}>
                <motion.button
                  onClick={() => handleCategoryClick(categoryId)}
                  aria-pressed={isSelected}
                  whileTap={{ scale: 0.92 }}
                  data-category-id={categoryId}
                  data-parent-category={isChildCategory ? (typeof category.parentCategory === 'object' ? category.parentCategory._id : category.parentCategory) : null}
                  data-has-children={hasChildren ? 'true' : 'false'}
                  style={{
                    padding: "0",
                    borderRadius: theme.borderRadius.xl,
                    border: `${isMobile ? '1.5px' : '1px'} solid ${isSelected 
                      ? theme.colors.primary 
                      : theme.colors.border}`,
                    cursor: "pointer",
                    backgroundColor: isSelected 
                      ? `${theme.colors.primary}12` 
                      : theme.colors.card,
                    boxShadow: isSelected 
                      ? `0 6px 14px ${theme.colors.primary}25` 
                      : theme.shadows.sm,
                    minWidth: isDesktop ? "110px" : isMobile ? "80px" : "90px",
                    maxWidth: isDesktop ? "110px" : isMobile ? "80px" : "90px",
                    width: isMobile ? "80px" : "auto",
                    transition: `all ${theme.transitions.medium}`,
                    outlineOffset: "2px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation"
                  }}
                  whileHover={
                    !isSelected
                      ? {
                          boxShadow: theme.shadows.md,
                          backgroundColor: theme.colors.background,
                          scale: 1.03,
                          border: `${isMobile ? '1.5px' : '1px'} solid ${theme.colors.primary}30`,
                        }
                      : {}
                  }
                >
                  <div
                    style={{
                      borderRadius: `${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0`,
                      backgroundColor: isSelected ? theme.colors.primary : "transparent",
                      width: "100%",
                      height: isMobile ? "3px" : "4px",
                      transition: `all ${theme.transitions.medium}`,
                    }}
                  />
                  <div
                    style={{
                      padding: isMobile ? "8px 4px 6px 4px" : "12px 8px 8px 8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: isMobile ? "6px" : "8px",
                    }}
                  >
                    <div
                      style={{
                        width: isDesktop ? "50px" : isMobile ? "40px" : "44px",
                        height: isDesktop ? "50px" : isMobile ? "40px" : "44px",
                        borderRadius: "50%",
                        backgroundColor: isSelected 
                          ? `${theme.colors.primary}15` 
                          : theme.colors.background,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: isMobile ? "6px" : "8px",
                        transition: `all ${theme.transitions.medium}`,
                        boxShadow: isSelected ? `0 2px 8px ${theme.colors.primary}20` : "none"
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
                          filter: isSelected ? "none" : "grayscale(25%)",
                        }}
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        animate={{
                          scale: isSelected ? 1.05 : 1,
                        }}
                      />
                    </div>                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative'
                      }}
                    >
                      {/* Parent-child indicator icons */}
                      {category.hasChildren && (
                        <div style={{ 
                          position: 'absolute',
                          top: '-10px',
                          right: '-8px',
                          backgroundColor: theme.colors.background,
                          borderRadius: '50%',
                          width: '14px',
                          height: '14px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          fontSize: '10px',
                          color: theme.colors.primary,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          <span className="material-icons" style={{ fontSize: '10px' }}>
                            expand_more
                          </span>
                        </div>
                      )}
                      
                      <span
                        style={{
                          fontWeight: isSelected
                            ? theme.typography.fontWeights.bold
                            : theme.typography.fontWeights.semibold,
                          fontSize: isDesktop 
                            ? theme.typography.sizes.sm 
                            : isMobile ? "0.65rem" : theme.typography.sizes.xs,
                          color: isSelected ? theme.colors.primary : theme.colors.text.secondary,
                          letterSpacing: "0.3px",
                          paddingBottom: isMobile ? "2px" : "4px",
                          textAlign: "center",
                          lineHeight: 1.2,
                          maxWidth: isMobile ? "62px" : "80px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {category.name}
                      </span>
                      
                      {/* If it's a child category, show a subtle parent indicator */}
                      {category.parentName && !isMobile && (
                        <span style={{
                          fontSize: '0.5rem',
                          color: theme.colors.text.tertiary,
                          marginTop: '-4px',
                          maxWidth: isDesktop ? "90px" : "70px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          in {category.parentName}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              </li>
            );
          })}
        </motion.ul>
      </div>
      
      {isDraggable && !isDesktop && showScrollIndicator && (
        <motion.div 
          style={{ 
            display: "flex", 
            justifyContent: "center", 
            marginTop: "2px",
            position: "absolute",
            bottom: "-20px",
            left: 0,
            right: 0,
            opacity: 0.75,
            pointerEvents: "none"
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          exit={{ opacity: 0 }}
        >
          <small style={{
            fontSize: "0.7rem",
            color: theme.colors.text.secondary,
            backgroundColor: theme.colors.background,
            padding: "2px 8px",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>            <span className="material-icons" style={{ fontSize: "10px", verticalAlign: "middle" }}>
              swipe            </span>
            {" "}Swipe to see {processedCategories.length - 5} more
          </small>
        </motion.div>
      )}
    </nav>
  );
};

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
  if ((prevProps.categories || []).length !== (nextProps.categories || []).length) {
    return false;
  }
  
  // Safely compare categories if they exist
  if (prevProps.categories && nextProps.categories) {
    // Check if any category object changed by comparing their id, name, status and parent-child properties
    for (let i = 0; i < prevProps.categories.length; i++) {
      // Handle possible undefined category or missing properties
      const prevCat = prevProps.categories[i] || {};
      const nextCat = nextProps.categories[i] || {};
      
      // Compare using both id and _id for compatibility with backend changes
      const prevId = prevCat.id || prevCat._id;
      const nextId = nextCat.id || nextCat._id;
      
      // Check if basic properties changed
      if (prevId !== nextId || prevCat.name !== nextCat.name) {
        return false;
      }      // Check if status changed (could be 'status' or 'isActive')
      // For isActive, we want to be very explicit about the comparison
      // Only treat as active if isActive is explicitly true
      // or if it's undefined and status is not 'inactive'
      let prevIsActive, nextIsActive;
      
      if (prevCat.isActive === true) {
        prevIsActive = true;
      } else if (prevCat.isActive === undefined && prevCat.status !== 'inactive') {
        prevIsActive = true;
      } else {
        prevIsActive = false;
      }
      
      if (nextCat.isActive === true) {
        nextIsActive = true;
      } else if (nextCat.isActive === undefined && nextCat.status !== 'inactive') {
        nextIsActive = true;
      } else {
        nextIsActive = false;
      }
      
      if (prevIsActive !== nextIsActive) {
        return false;
      }
        // Check if parent-child relationship changed
      // Consider all falsy values (null, undefined, empty string, etc.) as "no parent"
      let prevParentId = null;
      let nextParentId = null;
      
      // Only extract parent ID if parentCategory exists and is not falsy
      if (prevCat.parentCategory) {
        prevParentId = typeof prevCat.parentCategory === 'object' 
          ? prevCat.parentCategory._id 
          : prevCat.parentCategory;
      }
      
      if (nextCat.parentCategory) {
        nextParentId = typeof nextCat.parentCategory === 'object' 
          ? nextCat.parentCategory._id 
          : nextCat.parentCategory;
      }
      
      // Compare parent IDs
      if (prevParentId !== nextParentId) {
        return false;
      }
    }
  }
  
  // All checks passed, props are equal
  return true;
};

// Export memoized component to prevent unnecessary re-renders
export default memo(CategoryFilter, arePropsEqual);