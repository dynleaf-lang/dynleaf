import React, { createContext, useContext, useEffect, useState } from "react";
import { breakpoints } from "../utils/responsive";

// Create the responsive context
export const ResponsiveContext = createContext({
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  isMobile: false,
  isTablet: false,
  isDesktop: false
});

// Custom hook to use the responsive context
export const useResponsive = () => useContext(ResponsiveContext);

// Provider component
export const ResponsiveProvider = ({ children }) => {
  // Initialize state with window dimensions
  const [windowDimensions, setWindowDimensions] = useState({
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  });

  // Update dimensions on window resize
  useEffect(() => {
    function handleResize() {
      setWindowDimensions({
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });
    }

    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute breakpoints
  const { windowWidth } = windowDimensions;
  const isMobile = windowWidth < breakpoints.md;
  const isTablet = windowWidth >= breakpoints.md && windowWidth < breakpoints.lg;
  const isDesktop = windowWidth >= breakpoints.lg;

  // Create the context value
  const contextValue = {
    ...windowDimensions,
    isMobile,
    isTablet,
    isDesktop,
    // Additional breakpoint flags
    isXs: windowWidth < breakpoints.sm,
    isSm: windowWidth >= breakpoints.sm && windowWidth < breakpoints.md,
    isMd: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isLg: windowWidth >= breakpoints.lg && windowWidth < breakpoints.xl,
    isXl: windowWidth >= breakpoints.xl
  };

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export default ResponsiveProvider;