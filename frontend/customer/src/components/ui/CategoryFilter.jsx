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
  const [showLeftChevron, setShowLeftChevron] = useState(false);
  const [showRightChevron, setShowRightChevron] = useState(false);
  const { isMobile } = useResponsive();

  // Native pointer drag state
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollStartRef = useRef(0);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const momentumRAFRef = useRef(null);
  const hasLockedAxisRef = useRef(false);
  const isHorizontalLockRef = useRef(false);
  // Click suppression without relying on React state
  const pointerActiveRef = useRef(false);
  const didDragRef = useRef(false);
  const momentumActiveRef = useRef(false);

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
      // Only explicitly consider active if isActive is true, or if there's no isActive field but status is not 'inactive'
      let isActive = false;
      if (cat.isActive === true) {
        isActive = true;
      } else if (cat.isActive === undefined && cat.status !== 'inactive') {
        isActive = true;
      }

      // Keep parent categories only (all falsy values mean no parent)
      const isParentCategory = !cat.parentCategory;
      return isActive && isParentCategory;
    });

    // Add "All" category if it doesn't exist
    if (!hasAllCategory) {
      result = [{ id: 'all', name: 'All', image: 'https://cdn-icons-png.flaticon.com/512/6134/6134645.png' }, ...result];
    }

    // Mark parent categories that have active children
    result = result.map(category => {
      const categoryId = category.id || category._id;
      const hasChildren = safeCategories.some(cat => {
        let isChildOf = false;
        if (cat.parentCategory) {
          if (typeof cat.parentCategory === 'object' && cat.parentCategory?._id) {
            isChildOf = cat.parentCategory._id === categoryId;
          } else {
            isChildOf = cat.parentCategory === categoryId;
          }
        }

        let isActiveChild = false;
        if (cat.isActive === true) {
          isActiveChild = true;
        } else if (cat.isActive === undefined && cat.status !== 'inactive') {
          isActiveChild = true;
        }
        return isChildOf && isActiveChild;
      });

      return { ...category, hasChildren };
    });

    return result;
  }, [safeCategories]);

  // Calculate container width to fit exactly 5 items on mobile
  const containerStyle = useMemo(() => {
    if (isMobile && processedCategories.length > 5) {
      const itemWidth = 80; // Width of each category item
      const gap = 10; // Gap between items
      const totalWidth = itemWidth * 5 + gap * 4; // 5 items and 4 gaps
      return {
        maxWidth: `${totalWidth}px`,
        margin: '0 auto',
        overflow: 'hidden',
        position: 'relative'
      };
    }
    return {};
  }, [processedCategories.length, isMobile]);

  useEffect(() => {
    // Make categories draggable if there are more than 5
    setIsDraggable(processedCategories.length > 5);
    setShowMoreIndicator(processedCategories.length > 5);

    // Hide scroll indicator after 5 seconds
    const timer = setTimeout(() => setShowScrollIndicator(false), 5000);
    // Initialize chevron visibility
    const updateChevronState = () => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft >= maxScroll - 1;
      const hasOverflow = maxScroll > 0;
      setShowLeftChevron(hasOverflow && !atStart);
      setShowRightChevron(hasOverflow && !atEnd);
    };
    updateChevronState();

    const onScroll = () => updateChevronState();
    const onResize = () => updateChevronState();
    scrollRef.current?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(timer);
      scrollRef.current?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [processedCategories.length]);

  // Scroll selected category into view when it changes
  useEffect(() => {
    if (scrollRef.current && !isDesktop) {
      const container = scrollRef.current;
      const selectedItem = container.querySelector(`[data-category-id="${selectedCategory}"]`);
      if (selectedItem) {
        const containerWidth = container.offsetWidth;
        const itemWidth = selectedItem.offsetWidth;
        const itemLeft = selectedItem.offsetLeft;
        const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, [selectedCategory, isDesktop]);

  // Native drag-to-scroll with momentum
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isDraggable || isDesktop) return;

    const stopMomentum = () => {
      if (momentumRAFRef.current) {
        cancelAnimationFrame(momentumRAFRef.current);
        momentumRAFRef.current = null;
      }
      momentumActiveRef.current = false;
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
  isPointerDownRef.current = true;
  pointerActiveRef.current = true;
  didDragRef.current = false;
      hasLockedAxisRef.current = false;
      isHorizontalLockRef.current = false;
      setIsDragging(true);
  stopMomentum();
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      lastXRef.current = e.clientX;
  lastTimeRef.current = performance.now();
  lastYRef.current = e.clientY;
      scrollStartRef.current = el.scrollLeft;
    };

    const onPointerMove = (e) => {
      if (!isPointerDownRef.current) return;
      const now = performance.now();
      const dx = e.clientX - startXRef.current;
  const dy = e.clientY - startYRef.current;

      if (!hasLockedAxisRef.current) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          hasLockedAxisRef.current = true;
          isHorizontalLockRef.current = Math.abs(dx) > Math.abs(dy);
        }
      }

      if (isHorizontalLockRef.current) {
        e.preventDefault?.();
        const target = scrollStartRef.current - dx;
        const maxScroll = el.scrollWidth - el.clientWidth;
        el.scrollLeft = Math.max(0, Math.min(maxScroll, target));
        // set drag only after a small horizontal threshold to allow tap slop
        if (Math.abs(dx) > 8) {
          didDragRef.current = true;
        }
  // update chevron state immediately for snappy feedback
  const atStart = el.scrollLeft <= 1;
  const atEnd = el.scrollLeft >= Math.max(0, maxScroll) - 1;
  const hasOverflow = maxScroll > 0;
  setShowLeftChevron(hasOverflow && !atStart);
  setShowRightChevron(hasOverflow && !atEnd);

        const dt = Math.max(1, now - lastTimeRef.current);
        const vx = (e.clientX - lastXRef.current) / dt; // px/ms
        velocityRef.current = vx;
        lastXRef.current = e.clientX;
  lastTimeRef.current = now;
  lastYRef.current = e.clientY;
      }
    };

    const startMomentum = () => {
  stopMomentum();
      const el2 = el;
      const friction = 0.95;
      const minVel = 0.02; // px/ms
      const step = () => {
        const maxScroll = el2.scrollWidth - el2.clientWidth;
        const delta = velocityRef.current * 16; // px/frame
        if (Math.abs(delta) < 0.1) {
          stopMomentum();
          setIsDragging(false);
          return;
        }
        el2.scrollLeft = Math.max(0, Math.min(maxScroll, el2.scrollLeft - delta));
  // update chevrons during momentum
  const atStart = el2.scrollLeft <= 1;
  const atEnd = el2.scrollLeft >= Math.max(0, maxScroll) - 1;
  const hasOverflow = maxScroll > 0;
  setShowLeftChevron(hasOverflow && !atStart);
  setShowRightChevron(hasOverflow && !atEnd);
        if (el2.scrollLeft === 0 || el2.scrollLeft === maxScroll) {
          stopMomentum();
          setIsDragging(false);
          return;
        }
        velocityRef.current *= friction;
        if (Math.abs(velocityRef.current) < minVel) {
          stopMomentum();
          setIsDragging(false);
          return;
        }
        momentumRAFRef.current = requestAnimationFrame(step);
      };
  momentumActiveRef.current = true;
  momentumRAFRef.current = requestAnimationFrame(step);
    };

    const onPointerUp = (e) => {
      if (!isPointerDownRef.current) return;
  isPointerDownRef.current = false;
  pointerActiveRef.current = false;
      // treat tiny movements as taps (do not set didDrag in that case)
      const totalDx = Math.abs(e.clientX - startXRef.current);
      const totalDy = Math.abs(e.clientY - startYRef.current);
      if (totalDx <= 6 && totalDy <= 6) {
        didDragRef.current = false;
      }
      if (isHorizontalLockRef.current) {
        startMomentum();
      } else {
        setIsDragging(false);
      }
    };

    const onPointerCancel = () => {
  isPointerDownRef.current = false;
  pointerActiveRef.current = false;
      setIsDragging(false);
      stopMomentum();
    };

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    el.addEventListener('pointerleave', onPointerCancel, { passive: true });
    el.addEventListener('pointercancel', onPointerCancel, { passive: true });

    return () => {
      stopMomentum();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointerleave', onPointerCancel);
      el.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [isDraggable, isDesktop]);

  // Haptic feedback for category selection
  const handleCategoryClick = (categoryId) => {
    // Ignore clicks if pointer is down, a drag occurred, or momentum is active
    if (pointerActiveRef.current || didDragRef.current || momentumActiveRef.current) return;
    if ('vibrate' in navigator) navigator.vibrate(5);
    onSelectCategory(categoryId);
  };

  return (
    <nav
      aria-label="Food categories"
      style={{ marginBottom: theme.spacing.lg, position: "relative" }}
      ref={containerRef}
    >
      <div style={containerStyle}>
        {!isDesktop && showMoreIndicator && showLeftChevron && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '40px',
              background: 'linear-gradient(to left, rgba(255,255,255,0.9), transparent)',
              zIndex: 5,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '4px'
            }}
          >
            <span className="material-icons" style={{ color: theme.colors.primary, opacity: 0.85, fontSize: '18px' }}>
              chevron_left
            </span>
          </div>
        )}

        {!isDesktop && showMoreIndicator && showRightChevron && (
          <div
            style={{
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
              justifyContent: 'flex-end',
              paddingRight: '4px'
            }}
          >
            <span className="material-icons" style={{ color: theme.colors.primary, opacity: 0.85, fontSize: '18px' }}>
              chevron_right
            </span>
          </div>
        )}

        <motion.ul
          ref={scrollRef}
          style={{
            display: "flex",
            gap: isDesktop ? "16px" : "10px",
            overflowX: isDesktop ? "visible" : "auto",
            padding: isDesktop ? theme.spacing.md : `${theme.spacing.sm} ${theme.spacing.xs}`,
            margin: 0,
            listStyleType: "none",
            userSelect: "none",
            flexWrap: isDesktop ? "wrap" : "nowrap",
            cursor: isDraggable && !isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE and Edge
            touchAction: !isDesktop ? "pan-y" : "auto"
          }}
          initial={isDesktop ? {} : { x: 0 }}
          animate={isDesktop ? {} : { x: [-5, 0] }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {processedCategories.map((category) => {
            const categoryId = category.id || category._id || category.name;
            const isSelected = selectedCategory === categoryId;
            const isChildCategory = !!category.parentCategory;
            const hasChildren = category.hasChildren;

            return (
              <li key={categoryId || category.name}>
                <motion.button
                  onClick={() => handleCategoryClick(categoryId)}
                  aria-pressed={isSelected}
                  whileTap={{ scale: 0.92 }}
                  data-category-id={categoryId}
                  data-parent-category={
                    isChildCategory
                      ? (typeof category.parentCategory === 'object' ? category.parentCategory._id : category.parentCategory)
                      : null
                  }
                  data-has-children={hasChildren ? 'true' : 'false'}
                  style={{
                    padding: "0",
                    borderRadius: theme.borderRadius.xl,
                    border: `${isMobile ? '1.5px' : '1px'} solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                    cursor: "pointer",
                    backgroundColor: isSelected ? `${theme.colors.primary}12` : theme.colors.card,
                    boxShadow: isSelected ? `0 6px 14px ${theme.colors.primary}25` : theme.shadows.sm,
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
                        backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.background,
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
                        animate={{ scale: isSelected ? 1.05 : 1 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {category.hasChildren && (
                        <div
                          style={{
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
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '10px' }}>
                            expand_more
                          </span>
                        </div>
                      )}

                      <span
                        style={{
                          fontWeight: isSelected ? theme.typography.fontWeights.bold : theme.typography.fontWeights.semibold,
                          fontSize: isDesktop ? theme.typography.sizes.sm : isMobile ? "0.65rem" : theme.typography.sizes.xs,
                          color: isSelected ? theme.colors.primary : theme.colors.text.secondary,
                          letterSpacing: "0.3px",
                          paddingBottom: isMobile ? "2px" : "4px",
                          textAlign: "center",
                          lineHeight: 1.2,
                          maxWidth: isMobile ? "62px" : "80px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                           textTransform: 'capitalize'
                        }}
                      >
                        {category.name}
                      </span>

                      {category.parentName && !isMobile && (
                        <span
                          style={{
                            fontSize: '0.5rem',
                            color: theme.colors.text.tertiary,
                            marginTop: '-4px',
                            maxWidth: isDesktop ? "90px" : "70px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
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
          <small
            style={{
              fontSize: "0.7rem",
              color: theme.colors.text.secondary,
              backgroundColor: theme.colors.background,
              padding: "2px 8px",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}
          >
            <span className="material-icons" style={{ fontSize: "10px", verticalAlign: "middle" }}>
              swipe
            </span>
            {" "}Swipe to see {processedCategories.length - 5} more
          </small>
        </motion.div>
      )}
    </nav>
  );
};

// Add prop comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
  if (prevProps.selectedCategory !== nextProps.selectedCategory) return false;
  if (prevProps.isTablet !== nextProps.isTablet || prevProps.isDesktop !== nextProps.isDesktop) return false;
  if ((prevProps.categories || []).length !== (nextProps.categories || []).length) return false;

  if (prevProps.categories && nextProps.categories) {
    for (let i = 0; i < prevProps.categories.length; i++) {
      const prevCat = prevProps.categories[i] || {};
      const nextCat = nextProps.categories[i] || {};
      const prevId = prevCat.id || prevCat._id;
      const nextId = nextCat.id || nextCat._id;
      if (prevId !== nextId || prevCat.name !== nextCat.name) return false;

      let prevIsActive;
      if (prevCat.isActive === true) prevIsActive = true;
      else if (prevCat.isActive === undefined && prevCat.status !== 'inactive') prevIsActive = true;
      else prevIsActive = false;

      let nextIsActive;
      if (nextCat.isActive === true) nextIsActive = true;
      else if (nextCat.isActive === undefined && nextCat.status !== 'inactive') nextIsActive = true;
      else nextIsActive = false;
      if (prevIsActive !== nextIsActive) return false;

      let prevParentId = null;
      let nextParentId = null;
      if (prevCat.parentCategory) prevParentId = typeof prevCat.parentCategory === 'object' ? prevCat.parentCategory._id : prevCat.parentCategory;
      if (nextCat.parentCategory) nextParentId = typeof nextCat.parentCategory === 'object' ? nextCat.parentCategory._id : nextCat.parentCategory;
      if (prevParentId !== nextParentId) return false;
    }
  }
  return true;
};

export default memo(CategoryFilter, arePropsEqual);
