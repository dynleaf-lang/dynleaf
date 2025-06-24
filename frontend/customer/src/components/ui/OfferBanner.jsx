import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "../../data/theme";

// Sample offers for the banner slider
const offers = [
  {
    id: 1,
    title: "Weekend Special: 15% OFF",
    description: "Use code WEEKEND15 on your order",
    backgroundColor: theme.colors.primary,
    textColor: "#FFFFFF",
  },
  {
    id: 2,
    title: "Free Dessert",
    description: "On orders above $25",
    backgroundColor: theme.colors.secondary,
    textColor: "#FFFFFF",
  },
  {
    id: 3,
    title: "New: Summer Menu",
    description: "Try our refreshing seasonal dishes",
    backgroundColor: theme.colors.accent,
    textColor: theme.colors.secondary,
  },
  {
    id: 4,
    title: "Happy Hour: 2 for 1",
    description: "On all drinks 5-7pm",
    backgroundColor: theme.colors.info,
    textColor: "#FFFFFF",
  }
];

const OfferBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  // Auto-rotate banners
  useEffect(() => {
    if (!isAutoplay) return;
    
    const intervalId = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % offers.length);
    }, 5000); // Change banner every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [isAutoplay]);

  // Pause autoplay on hover
  const handleMouseEnter = () => setIsAutoplay(false);
  const handleMouseLeave = () => setIsAutoplay(true);

  // Manual navigation
  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoplay(false); // Pause when manually navigating
    setTimeout(() => setIsAutoplay(true), 5000); // Resume after 5 seconds
  };

  const nextSlide = () => goToSlide((currentIndex + 1) % offers.length);
  const prevSlide = () => goToSlide((currentIndex - 1 + offers.length) % offers.length);

  return (
    <div 
      style={{
        position: "relative", 
        width: "100%", 
        overflow: "hidden",
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        boxShadow: theme.shadows.sm
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundColor: offers[currentIndex].backgroundColor,
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            color: offers[currentIndex].textColor,
            textAlign: "center",
            position: "relative",
            zIndex: 1
          }}
        >
          <h3 style={{ 
            margin: 0,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.sizes.md
          }}>
            {offers[currentIndex].title}
          </h3>
          <p style={{
            margin: "4px 0 0 0",
            fontSize: theme.typography.sizes.sm,
            opacity: 0.9
          }}>
            {offers[currentIndex].description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        position: "absolute",
        top: "50%", 
        transform: "translateY(-50%)",
        width: "100%",
        padding: `0 ${theme.spacing.sm}`,
        pointerEvents: "none",
        zIndex: 2
      }}>
        <button
          onClick={prevSlide}
          style={{
            background: "rgba(0,0,0,0.2)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            pointerEvents: "auto"
          }}
        >
          <span className="material-icons" style={{ fontSize: "18px" }}>
            chevron_left
          </span>
        </button>
        <button
          onClick={nextSlide}
          style={{
            background: "rgba(0,0,0,0.2)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            pointerEvents: "auto"
          }}
        >
          <span className="material-icons" style={{ fontSize: "18px" }}>
            chevron_right
          </span>
        </button>
      </div>

      {/* Indicator dots */}
      <div style={{
        position: "absolute",
        bottom: theme.spacing.xs,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: theme.spacing.xs,
        zIndex: 2
      }}>
        {offers.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: index === currentIndex ? "white" : "rgba(255,255,255,0.5)",
              border: "none",
              padding: 0,
              cursor: "pointer"
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OfferBanner;